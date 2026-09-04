import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createDealsRouter(prisma: PrismaClient, io?: any) {
  const router = Router();

  // Get deals with strict RBAC isolation
  router.get('/', async (req, res) => {
    try {
      const { pipelineId, stageId, search, projectId } = req.query;
      const currentUserId = (req as any).userId || (req.headers['x-user-id'] as string);

      const where: any = { isDeleted: false };

      if (pipelineId) where.pipelineId = String(pipelineId);
      if (stageId) where.stageId = String(stageId);
      if (projectId && projectId !== 'all') {
        where.projectId = String(projectId);
      }

      // Strict user-level access isolation
      if (currentUserId) {
        const user = await prisma.user.findUnique({ where: { id: currentUserId } });
        if (user) {
          if (!user.canViewAllDeals) {
            if (user.canViewDeptDeals) {
              // Department managers view only their department's users deals
              const deptUsers = await prisma.user.findMany({
                where: { department: user.department },
                select: { id: true }
              });
              const deptUserIds = deptUsers.map(u => u.id);
              where.responsibleId = { in: deptUserIds };
            } else {
              // Standard rep sees ONLY their personal deals
              where.responsibleId = user.id;
            }
          }
        }
      }

      if (search) {
        where.OR = [
          { title: { contains: String(search) } },
          { contact: { name: { contains: String(search) } } },
          { contact: { phone: { contains: String(search) } } },
          { company: { name: { contains: String(search) } } }
        ];
      }

      const deals = await prisma.deal.findMany({
        where,
        include: {
          contact: true,
          company: true,
          responsible: {
            select: { id: true, name: true, avatar: true, department: true, role: true }
          },
          stage: true,
          tasks: {
            where: { isCompleted: false },
            include: { responsible: true }
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      res.json(deals);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch deals' });
    }
  });

  // Anti-Duplicate Guard: Checks if phone or company already exists
  router.get('/check-duplicate', async (req, res) => {
    try {
      const { query, dealId } = req.query;
      const term = (String(query || '')).trim();
      if (!term || term.length < 3) {
        return res.json({ duplicateFound: false, duplicates: [] });
      }

      const matchedDeals = await prisma.deal.findMany({
        where: {
          AND: [
            dealId ? { id: { not: String(dealId) } } : {},
            {
              OR: [
                { title: { contains: term, mode: 'insensitive' } },
                { company: { name: { contains: term, mode: 'insensitive' } } },
                { contact: { phone: { contains: term, mode: 'insensitive' } } },
                { contact: { name: { contains: term, mode: 'insensitive' } } },
                { contact: { email: { contains: term, mode: 'insensitive' } } }
              ]
            }
          ]
        },
        include: {
          company: true,
          contact: true,
          responsible: true,
          stage: true
        },
        take: 3
      });

      if (matchedDeals.length > 0) {
        return res.json({
          duplicateFound: true,
          duplicates: matchedDeals.map(d => ({
            id: d.id,
            title: d.title,
            companyName: d.company?.name || d.title,
            contactName: d.contact?.name,
            phone: d.contact?.phone,
            stageName: d.stage?.name || 'Етап',
            responsibleName: d.responsible?.name || 'Менеджер'
          }))
        });
      }

      res.json({ duplicateFound: false, duplicates: [] });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get single deal with full relations
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const deal = await prisma.deal.findUnique({
        where: { id },
        include: {
          contact: true,
          company: true,
          responsible: true,
          stage: true,
          tasks: {
            include: { responsible: true },
            orderBy: { dueDate: 'asc' }
          },
          notes: {
            include: { user: true },
            orderBy: { createdAt: 'desc' }
          },
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (!deal) return res.status(404).json({ error: 'Deal not found' });
      res.json(deal);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch deal' });
    }
  });

  // Create Deal
  router.post('/', async (req, res) => {
    try {
      const {
        title,
        budget,
        pipelineId,
        stageId,
        responsibleId,
        contactId,
        companyId,
        tags,
        customFields,
        projectId
      } = req.body;

      const currentUserId = (req as any).userId || (req.headers['x-user-id'] as string);

      const newDeal = await prisma.deal.create({
        data: {
          title,
          budget: budget ? Number(budget) : 0,
          pipelineId,
          stageId,
          projectId: projectId || 'employers',
          responsibleId: responsibleId || currentUserId || 'usr-admin',
          contactId,
          companyId,
          tags: typeof tags === 'string' ? tags : JSON.stringify(tags || []),
          customFields: typeof customFields === 'string' ? customFields : JSON.stringify(customFields || {})
        },
        include: {
          contact: true,
          company: true,
          responsible: true,
          stage: true
        }
      });

      res.status(201).json(newDeal);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to create deal' });
    }
  });

  // Update Deal & Move Stage (Digital Pipeline Automation)
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;

      const existingDeal = await prisma.deal.findUnique({
        where: { id },
        include: { stage: true, tasks: { where: { isCompleted: false } } }
      });

      const isStageChanged = data.stageId && existingDeal && existingDeal.stageId !== data.stageId;

      const updated = await prisma.deal.update({
        where: { id },
        data: {
          title: data.title,
          budget: data.budget !== undefined ? Number(data.budget) : undefined,
          stageId: data.stageId,
          lossReason: data.lossReason !== undefined ? data.lossReason : undefined,
          pipelineId: data.pipelineId,
          responsibleId: data.responsibleId,
          contactId: data.contactId,
          companyId: data.companyId,
          tags: typeof data.tags === 'string' ? data.tags : (data.tags ? JSON.stringify(data.tags) : undefined),
          customFields: typeof data.customFields === 'string' ? data.customFields : (data.customFields ? JSON.stringify(data.customFields) : undefined)
        },
        include: {
          contact: true,
          company: true,
          responsible: true,
          stage: true,
          tasks: { where: { isCompleted: false } }
        }
      });

      // Digital Pipeline: Automatic follow-up tasks upon stage transition
      if (isStageChanged) {
        const targetStage = await prisma.stage.findUnique({ where: { id: data.stageId } });
        
        // Log explicit stage change audit event
        const oldStageName = existingDeal?.stage?.name || 'Попередній етап';
        const newStageName = targetStage?.name || 'Новий етап';
        const noteUserId = (req as any).userId || existingDeal?.responsibleId || 'usr-admin';

        await prisma.dealNote.create({
          data: {
            dealId: id,
            userId: noteUserId,
            content: `🔄 Зміна етапу воронки: "${oldStageName}" ➔ "${newStageName}"`,
            type: 'status_change',
            metadata: JSON.stringify({ oldStageName, newStageName })
          }
        }).catch(() => {});

        if (targetStage && !targetStage.isLost && !targetStage.isWon) {
          const stageNameLower = targetStage.name.toLowerCase();
          let taskText = `Контроль переходу на етап: ${targetStage.name}`;
          let hours = 24;
          let taskType = 'call';

          if (stageNameLower.includes('кп') || stageNameLower.includes('пропозиці')) {
            taskText = '📞 Контроль розгляду КП та зворотний зв\'язок щодо розрахунку (4х25%)';
            hours = 24;
            taskType = 'call';
          } else if (stageNameLower.includes('договір') || stageNameLower.includes('узгодження')) {
            taskText = '⚖️ Узгодження правок до договору та отримання підписаного екземпляра';
            hours = 48;
            taskType = 'meeting';
          } else if (stageNameLower.includes('оплат') || stageNameLower.includes('транш')) {
            taskText = '💳 Контроль надходження 25% авансу від бухгалтерії підприємства';
            hours = 24;
            taskType = 'invoice';
          } else if (stageNameLower.includes('підбір') || stageNameLower.includes('кандидат')) {
            taskText = '👥 Формування та узгодження пулу кандидатів (візи D, паспорти)';
            hours = 48;
            taskType = 'other';
          }

          const dueDate = new Date(Date.now() + hours * 3600 * 1000);
          const assignee = data.responsibleId || existingDeal?.responsibleId || 'usr-admin';
          const autoTask = await prisma.task.create({
            data: {
              dealId: id,
              responsibleId: assignee,
              createdById: assignee,
              text: taskText,
              type: taskType,
              dueDate
            }
          });

          // Log system activity note
          await prisma.dealNote.create({
            data: {
              dealId: id,
              userId: existingDeal?.responsibleId || 'usr-admin',
              content: `🤖 Digital Pipeline: Створено автоматичне завдання: "${taskText}" (термін: ${hours}г)`,
              type: 'system'
            }
          }).catch(() => {});

          if (io) {
            io.emit('task_created', autoTask);
          }
        }
      }

      if (data.budget !== undefined && existingDeal && existingDeal.budget !== Number(data.budget)) {
        const noteUserId = (req as any).userId || existingDeal?.responsibleId || 'usr-admin';
        await prisma.dealNote.create({
          data: {
            dealId: id,
            userId: noteUserId,
            content: `💰 Оновлено бюджет угоди: з €${existingDeal.budget} на €${data.budget}`,
            type: 'system'
          }
        }).catch(() => {});
      }

      if (io) {
        io.emit('deal_updated', updated);
      }

      res.json(updated);
    } catch (e) {
      console.error('Failed to update deal:', e);
      res.status(500).json({ error: 'Failed to update deal' });
    }
  });

  // Add Note / Comment to deal
  router.post('/:id/notes', async (req, res) => {
    try {
      const { id } = req.params;
      const { content, type } = req.body;
      const currentUserId = (req as any).userId || (req.headers['x-user-id'] as string);

      let validUserId = currentUserId;
      if (validUserId) {
        const uExists = await prisma.user.findUnique({ where: { id: validUserId } });
        if (!uExists) validUserId = '';
      }

      if (!validUserId) {
        const firstUser = await prisma.user.findFirst();
        validUserId = firstUser ? firstUser.id : 'usr-admin';
      }

      const note = await prisma.dealNote.create({
        data: {
          dealId: id,
          userId: validUserId,
          content,
          type: type || 'comment'
        },
        include: { user: true }
      });

      res.status(201).json(note);
    } catch (e: any) {
      console.error('Error adding note:', e);
      res.status(500).json({ error: 'Failed to add note' });
    }
  });

  // Get Archived Deals
  router.get('/archived/list', async (req, res) => {
    try {
      const deals = await prisma.deal.findMany({
        where: { isDeleted: true },
        include: {
          contact: true,
          company: true,
          responsible: {
            select: { id: true, name: true, avatar: true, department: true, role: true }
          },
          stage: true
        },
        orderBy: { deletedAt: 'desc' }
      });
      res.json(deals);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch archived deals' });
    }
  });

  // Soft-Delete Deal (Archive with 30-day recovery window)
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const deal = await prisma.deal.findUnique({ where: { id } });
      if (!deal) {
        return res.status(404).json({ error: 'Угоду не знайдено' });
      }

      const archived = await prisma.deal.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date()
        }
      });

      if (io) {
        io.emit('deal_deleted', { id });
      }

      res.json({ success: true, message: 'Угоду архівовано. Її можна відновити з кошика протягом 30 днів.', deal: archived });
    } catch (e) {
      console.error('Failed to archive deal:', e);
      res.status(500).json({ error: 'Failed to archive deal' });
    }
  });

  // Restore Deal from Archive
  router.post('/:id/restore', async (req, res) => {
    try {
      const { id } = req.params;
      const restored = await prisma.deal.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null
        },
        include: {
          contact: true,
          company: true,
          responsible: {
            select: { id: true, name: true, avatar: true, department: true, role: true }
          },
          stage: true
        }
      });

      if (io) {
        io.emit('deal_created', restored);
      }

      res.json({ success: true, message: 'Угоду успішно відновлено', deal: restored });
    } catch (e) {
      console.error('Failed to restore deal:', e);
      res.status(500).json({ error: 'Failed to restore deal' });
    }
  });

  return router;
}
