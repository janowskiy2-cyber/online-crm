import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { SemanticSearchService } from '../services/semantic-search.service';

export function createDealsRouter(prisma: PrismaClient, io?: any) {
  const router = Router();

  // ── In-memory RBAC cache (TTL 5 min) to avoid repeated user lookups ──
  const rbacCache = new Map<string, { canViewAll: boolean; canViewDept: boolean; department: string; expiry: number }>();
  const RBAC_TTL = 5 * 60 * 1000;

  async function getUserRbac(userId: string) {
    const cached = rbacCache.get(userId);
    if (cached && Date.now() < cached.expiry) return cached;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { canViewAllDeals: true, canViewDeptDeals: true, department: true }
    });
    if (!user) return null;
    const entry = {
      canViewAll: user.canViewAllDeals,
      canViewDept: user.canViewDeptDeals,
      department: user.department,
      expiry: Date.now() + RBAC_TTL
    };
    rbacCache.set(userId, entry);
    return entry;
  }

  // Get deals with strict RBAC isolation + pagination + lightweight selects
  router.get('/', async (req, res) => {
    try {
      const { pipelineId, stageId, search, projectId, page, limit: rawLimit } = req.query;
      const currentUserId = (req as any).userId as string | undefined;

      // Pagination: default 100, max 200 per page
      const pageNum = Math.max(1, Number(page) || 1);
      const limit = Math.min(Math.max(1, Number(rawLimit) || 100), 200);

      const where: any = { isDeleted: false };

      if (pipelineId) where.pipelineId = String(pipelineId);
      if (stageId) where.stageId = String(stageId);
      if (projectId && projectId !== 'all') {
        where.projectId = String(projectId);
      }

      // Strict user-level access isolation (cached)
      if (currentUserId) {
        const rbac = await getUserRbac(currentUserId);
        if (rbac && !rbac.canViewAll) {
          if (rbac.canViewDept) {
            const deptUsers = await prisma.user.findMany({
              where: { department: rbac.department },
              select: { id: true }
            });
            where.responsibleId = { in: deptUsers.map(u => u.id) };
          } else {
            where.responsibleId = currentUserId;
          }
        }
      }

      if (search) {
        const terms = await SemanticSearchService.expandQuery(String(search));
        where.OR = terms.flatMap(term => [
          { title: { contains: term, mode: 'insensitive' as const } },
          { contact: { name: { contains: term, mode: 'insensitive' as const } } },
          { contact: { phone: { contains: term, mode: 'insensitive' as const } } },
          { contact: { profession: { contains: term, mode: 'insensitive' as const } } },
          { company: { name: { contains: term, mode: 'insensitive' as const } } },
          { stage: { name: { contains: term, mode: 'insensitive' as const } } },
          { tags: { contains: term, mode: 'insensitive' as const } }
        ]);
      }

      const deals = await prisma.deal.findMany({
        where,
        include: {
          contact: {
            select: { id: true, name: true, phone: true, avatar: true, type: true, whatsapp: true, telegram: true, email: true }
          },
          company: {
            select: { id: true, name: true, phone: true }
          },
          responsible: {
            select: { id: true, name: true, avatar: true, department: true, role: true }
          },
          stage: true,
          tasks: {
            where: { isCompleted: false, isDeleted: false },
            orderBy: { dueDate: 'asc' },
            select: { id: true, text: true, type: true, dueDate: true, responsibleId: true }
          },
          notes: {
            where: { type: 'call_record' },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, type: true, content: true, metadata: true, createdAt: true }
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { id: true, text: true, createdAt: true, channel: true, direction: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: (pageNum - 1) * limit
      });

      res.json(deals);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch deals' });
    }
  });

  // Anti-Duplicate Guard: Checks if phone, title or company already exists
  router.get('/check-duplicate', async (req, res) => {
    try {
      const { query, dealId, phone } = req.query;
      const term = (String(query || '')).trim();
      const phoneInput = (String(phone || '')).trim();

      const orConditions: any[] = [];

      if (phoneInput) {
        const cleanDigits = phoneInput.replace(/\D/g, '');
        if (cleanDigits.length >= 7) {
          const searchSuffix = cleanDigits.slice(-9);
          orConditions.push(
            { contact: { phone: { contains: searchSuffix } } },
            { contact: { phone2: { contains: searchSuffix } } },
            { contact: { whatsapp: { contains: searchSuffix } } }
          );
        }
      }

      if (term && term.length >= 3) {
        orConditions.push(
          { title: { contains: term, mode: 'insensitive' } },
          { company: { name: { contains: term, mode: 'insensitive' } } },
          { contact: { phone: { contains: term, mode: 'insensitive' } } },
          { contact: { name: { contains: term, mode: 'insensitive' } } },
          { contact: { email: { contains: term, mode: 'insensitive' } } }
        );
      }

      if (orConditions.length === 0) {
        return res.json({ duplicateFound: false, duplicates: [] });
      }

      const matchedDeals = await prisma.deal.findMany({
        where: {
          isDeleted: false,
          AND: [
            dealId ? { id: { not: String(dealId) } } : {},
            { OR: orConditions }
          ]
        },
        include: {
          company: true,
          contact: true,
          responsible: true,
          stage: true,
          tasks: { where: { isDeleted: false } },
          notes: true,
          messages: true
        },
        take: 5
      });

      if (matchedDeals.length > 0) {
        return res.json({
          duplicateFound: true,
          duplicates: matchedDeals.map(d => ({
            id: d.id,
            title: d.title,
            companyName: d.company?.name || d.title,
            contactName: d.contact?.name,
            phone: d.contact?.phone || d.contact?.whatsapp || d.contact?.phone2,
            stageName: d.stage?.name || 'Етап',
            stageColor: d.stage?.color || '#3b82f6',
            responsibleName: d.responsible?.name || 'Менеджер',
            budget: d.budget,
            tasksCount: d.tasks.length,
            notesCount: d.notes.length,
            messagesCount: d.messages.length,
            createdAt: d.createdAt
          }))
        });
      }

      res.json({ duplicateFound: false, duplicates: [] });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Find all duplicates grouped by phone number across the entire CRM
  router.get('/duplicates/by-phone', async (req, res) => {
    try {
      const deals = await prisma.deal.findMany({
        where: {
          isDeleted: false,
          contact: {
            OR: [
              { phone: { not: null } },
              { phone2: { not: null } },
              { whatsapp: { not: null } }
            ]
          }
        },
        include: {
          contact: true,
          company: true,
          stage: true,
          responsible: true,
          tasks: { where: { isDeleted: false } },
          notes: true,
          messages: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const phoneGroups = new Map<string, any[]>();

      for (const d of deals) {
        const rawPhones = [d.contact?.phone, d.contact?.phone2, d.contact?.whatsapp].filter(Boolean);
        const seenInThisDeal = new Set<string>();

        for (const raw of rawPhones) {
          const digits = (raw as string).replace(/\D/g, '');
          if (digits.length >= 7) {
            const key = digits.slice(-9); // Last 9 digits
            if (!seenInThisDeal.has(key)) {
              seenInThisDeal.add(key);
              if (!phoneGroups.has(key)) {
                phoneGroups.set(key, []);
              }
              phoneGroups.get(key)!.push(d);
            }
          }
        }
      }

      // Keep only groups where more than 1 deal shares this phone
      const duplicateGroups: any[] = [];
      phoneGroups.forEach((groupDeals, key) => {
        const uniqueDealMap = new Map<string, any>();
        groupDeals.forEach(d => uniqueDealMap.set(d.id, d));
        const uniqueDeals = Array.from(uniqueDealMap.values());

        if (uniqueDeals.length > 1) {
          const representativePhone = uniqueDeals[0].contact?.phone || uniqueDeals[0].contact?.whatsapp || key;
          duplicateGroups.push({
            phoneKey: key,
            displayPhone: representativePhone,
            count: uniqueDeals.length,
            deals: uniqueDeals.map(d => ({
              id: d.id,
              title: d.title,
              companyName: d.company?.name || d.title,
              contactName: d.contact?.name || 'Клієнт',
              phone: d.contact?.phone || d.contact?.whatsapp,
              stageName: d.stage?.name || 'Етап',
              stageColor: d.stage?.color || '#3b82f6',
              responsibleName: d.responsible?.name || 'Менеджер',
              budget: d.budget,
              tasksCount: d.tasks.length,
              notesCount: d.notes.length,
              messagesCount: d.messages.length,
              createdAt: d.createdAt,
              updatedAt: d.updatedAt
            }))
          });
        }
      });

      res.json({
        totalDuplicateGroups: duplicateGroups.length,
        groups: duplicateGroups
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Merge Duplicates Endpoint: Merges sourceDeal into targetDeal
  router.post('/merge', async (req, res) => {
    try {
      const { targetDealId, sourceDealId } = req.body;
      const currentUserId = (req as any).user?.id;

      if (!targetDealId || !sourceDealId) {
        return res.status(400).json({ error: 'targetDealId and sourceDealId are required' });
      }

      if (targetDealId === sourceDealId) {
        return res.status(400).json({ error: 'Неможливо об’єднати угоду саму з собою' });
      }

      const [targetDeal, sourceDeal] = await Promise.all([
        prisma.deal.findUnique({
          where: { id: targetDealId },
          include: { contact: true, company: true, stage: true, responsible: true }
        }),
        prisma.deal.findUnique({
          where: { id: sourceDealId },
          include: { contact: true, company: true, stage: true, responsible: true }
        })
      ]);

      if (!targetDeal || targetDeal.isDeleted) {
        return res.status(404).json({ error: 'Основна угода не знайдена або вже видалена' });
      }
      if (!sourceDeal || sourceDeal.isDeleted) {
        return res.status(404).json({ error: 'Угода-дубль не знайдена або вже була об’єднана/видалена' });
      }

      // 1. Move all tasks
      const tasksMoved = await prisma.task.updateMany({
        where: { dealId: sourceDealId },
        data: { dealId: targetDealId }
      });

      // 2. Move all notes (including call recordings)
      const notesMoved = await prisma.dealNote.updateMany({
        where: { dealId: sourceDealId },
        data: { dealId: targetDealId }
      });

      // 3. Move all chat messages
      const msgsMoved = await prisma.chatMessage.updateMany({
        where: { dealId: sourceDealId },
        data: { dealId: targetDealId }
      });

      // 4. Merge contact details if contacts are different
      if (sourceDeal.contact && targetDeal.contact && sourceDeal.contactId !== targetDeal.contactId) {
        const updateContactData: any = {};
        if (!targetDeal.contact.phone2 && sourceDeal.contact.phone && sourceDeal.contact.phone !== targetDeal.contact.phone) {
          updateContactData.phone2 = sourceDeal.contact.phone;
        }
        if (!targetDeal.contact.email && sourceDeal.contact.email) {
          updateContactData.email = sourceDeal.contact.email;
        }
        if (!targetDeal.contact.telegram && sourceDeal.contact.telegram) {
          updateContactData.telegram = sourceDeal.contact.telegram;
        }
        if (!targetDeal.contact.whatsapp && sourceDeal.contact.whatsapp) {
          updateContactData.whatsapp = sourceDeal.contact.whatsapp;
        }
        if (!targetDeal.contact.position && sourceDeal.contact.position) {
          updateContactData.position = sourceDeal.contact.position;
        }
        if (Object.keys(updateContactData).length > 0) {
          await prisma.contact.update({
            where: { id: targetDeal.contactId! },
            data: updateContactData
          });
        }
      }

      // 5. Merge custom fields
      let mergedCustomFields = targetDeal.customFields;
      if (sourceDeal.customFields) {
        try {
          const targetObj = targetDeal.customFields ? JSON.parse(targetDeal.customFields) : {};
          const sourceObj = JSON.parse(sourceDeal.customFields);
          for (const [k, v] of Object.entries(sourceObj)) {
            if (!targetObj[k] || targetObj[k] === '') {
              targetObj[k] = v;
            }
          }
          mergedCustomFields = JSON.stringify(targetObj);
        } catch (e) {}
      }

      // 6. Update Target Deal
      const dealUpdateData: any = {
        customFields: mergedCustomFields
      };
      if (targetDeal.budget === 0 && sourceDeal.budget > 0) {
        dealUpdateData.budget = sourceDeal.budget;
      }
      if (!targetDeal.companyId && sourceDeal.companyId) {
        dealUpdateData.companyId = sourceDeal.companyId;
      }

      await prisma.deal.update({
        where: { id: targetDealId },
        data: dealUpdateData
      });

      // 7. Add system audit note to Target Deal
      await prisma.dealNote.create({
        data: {
          dealId: targetDealId,
          userId: currentUserId || targetDeal.responsibleId,
          type: 'system',
          content: `🔄 Об'єднано з дублем «${sourceDeal.title}» (Етап: ${sourceDeal.stage?.name || 'невідомо'}, Менеджер: ${sourceDeal.responsible?.name || 'невідомо'}). Перенесено: завдань: ${tasksMoved.count}, заміток/дзвінків: ${notesMoved.count}, повідомлень: ${msgsMoved.count}.`,
          metadata: JSON.stringify({
            action: 'merge_deals',
            sourceDealId,
            sourceTitle: sourceDeal.title,
            tasksCount: tasksMoved.count,
            notesCount: notesMoved.count,
            msgsCount: msgsMoved.count,
            mergedAt: new Date().toISOString()
          })
        }
      });

      // 8. Soft-delete / archive duplicate Deal
      await prisma.deal.update({
        where: { id: sourceDealId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          title: `[ДУБЛЬ - Об'єднано] ${sourceDeal.title}`
        }
      });

      // 9. Fetch fresh Target Deal
      const updatedDeal = await prisma.deal.findUnique({
        where: { id: targetDealId },
        include: {
          contact: true,
          company: true,
          stage: true,
          responsible: true,
          tasks: { where: { isDeleted: false } },
          notes: { orderBy: { createdAt: 'desc' }, include: { user: true } }
        }
      });

      res.json({
        success: true,
        message: `Угоди успішно об'єднано! Перенесено ${tasksMoved.count} завдань та ${notesMoved.count} заміток.`,
        deal: updatedDeal
      });
    } catch (e: any) {
      console.error('Error merging deals:', e);
      res.status(500).json({ error: e.message || 'Failed to merge deals' });
    }
  });

  // Bulk Actions: Archive (Soft-delete), Change Stage, Change Responsible
  router.post('/bulk-action', async (req, res) => {
    try {
      const { dealIds, action, targetStageId, targetResponsibleId } = req.body;
      const currentUserId = (req as any).userId as string | undefined;
      const currentUserRole = (req as any).userRole as string | undefined;

      if (!dealIds || !Array.isArray(dealIds) || dealIds.length === 0) {
        return res.status(400).json({ error: 'Не вибрано жодної угоди для масової дії' });
      }

      if (action === 'delete') {
        // Enforce RBAC: check if user can delete deals
        let canDelete = currentUserRole === 'super_admin' || currentUserRole === 'sales_director' || currentUserRole === 'admin';
        if (!canDelete && currentUserId) {
          const user = await prisma.user.findUnique({ where: { id: currentUserId } });
          if (user?.canDeleteDeals) {
            canDelete = true;
          }
        }

        // Soft-delete strictly adhering to Zero Data Loss standard in AGENTS.md
        const updateResult = await prisma.deal.updateMany({
          where: {
            id: { in: dealIds },
            isDeleted: false,
            ...(!canDelete && currentUserId ? { responsibleId: currentUserId } : {})
          },
          data: {
            isDeleted: true,
            deletedAt: new Date()
          }
        });

        if (io) {
          dealIds.forEach((id: string) => io.emit('deal_deleted', { id }));
          io.emit('deals_bulk_deleted', { dealIds, count: updateResult.count });
        }

        return res.json({
          success: true,
          count: updateResult.count,
          message: `Успішно переміщено в кошик ${updateResult.count} угод. Їх можна відновити протягом 30 днів.`
        });
      }

      if (action === 'change_stage') {
        if (!targetStageId) {
          return res.status(400).json({ error: 'Не вказано цільовий етап воронки' });
        }
        const stage = await prisma.stage.findUnique({ where: { id: targetStageId } });
        if (!stage) {
          return res.status(404).json({ error: 'Цільовий етап не знайдено' });
        }

        const updateResult = await prisma.deal.updateMany({
          where: { id: { in: dealIds }, isDeleted: false },
          data: {
            stageId: targetStageId,
            pipelineId: stage.pipelineId,
            updatedAt: new Date()
          }
        });

        // Add audit notes for the moved deals
        for (const dId of dealIds) {
          await prisma.dealNote.create({
            data: {
              dealId: dId,
              userId: currentUserId || 'usr-admin',
              content: `📁 [Масова дія]: Угоду переміщено на етап "${stage.name}"`,
              type: 'status_change'
            }
          }).catch(() => {});
        }

        if (io) {
          io.emit('deals_bulk_updated', { dealIds, stageId: targetStageId, pipelineId: stage.pipelineId });
        }

        return res.json({
          success: true,
          count: updateResult.count,
          message: `Успішно переміщено ${updateResult.count} угод на етап "${stage.name}".`
        });
      }

      if (action === 'change_responsible') {
        if (!targetResponsibleId) {
          return res.status(400).json({ error: 'Не вказано нового відповідального менеджера' });
        }
        const targetUser = await prisma.user.findUnique({ where: { id: targetResponsibleId } });
        if (!targetUser) {
          return res.status(404).json({ error: 'Користувача не знайдено' });
        }

        const updateResult = await prisma.deal.updateMany({
          where: { id: { in: dealIds }, isDeleted: false },
          data: {
            responsibleId: targetResponsibleId,
            updatedAt: new Date()
          }
        });

        for (const dId of dealIds) {
          await prisma.dealNote.create({
            data: {
              dealId: dId,
              userId: currentUserId || 'usr-admin',
              content: `👤 [Масова дія]: Відповідальним менеджером призначено "${targetUser.name}"`,
              type: 'system'
            }
          }).catch(() => {});
        }

        if (io) {
          io.emit('deals_bulk_updated', { dealIds, responsibleId: targetResponsibleId });
        }

        return res.json({
          success: true,
          count: updateResult.count,
          message: `Успішно призначено ${targetUser.name} відповідальним за ${updateResult.count} угод.`
        });
      }

      return res.status(400).json({ error: 'Невідома дія (підтримуються delete, change_stage, change_responsible)' });
    } catch (e: any) {
      console.error('Error in bulk-action:', e);
      res.status(500).json({ error: e.message || 'Помилка масової дії над угодами' });
    }
  });

  // Get single deal with full relations (messages paginated to last 50)
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const msgLimit = Math.min(Number(req.query.msgLimit) || 50, 200);

      const deal = await prisma.deal.findUnique({
        where: { id },
        include: {
          contact: true,
          company: true,
          responsible: true,
          stage: true,
          tasks: {
            include: { responsible: { select: { id: true, name: true, avatar: true } } },
            orderBy: { dueDate: 'asc' }
          },
          notes: {
            include: { user: { select: { id: true, name: true, avatar: true } } },
            orderBy: { createdAt: 'desc' }
          },
          messages: {
            take: msgLimit,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!deal) return res.status(404).json({ error: 'Deal not found' });

      // Reverse messages to chronological order for the frontend
      deal.messages.reverse();
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

      let targetCompanyId = data.companyId;
      if (data.companyData && data.companyData.name) {
        if (existingDeal?.companyId) {
          await prisma.company.update({
            where: { id: existingDeal.companyId },
            data: {
              name: data.companyData.name,
              address: data.companyData.address || undefined,
              phone: data.companyData.phone || undefined,
              email: data.companyData.email || undefined
            }
          });
          targetCompanyId = existingDeal.companyId;
        } else {
          const newComp = await prisma.company.create({
            data: {
              name: data.companyData.name,
              address: data.companyData.address || undefined,
              phone: data.companyData.phone || undefined,
              email: data.companyData.email || undefined
            }
          });
          targetCompanyId = newComp.id;
        }
      }

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
          companyId: targetCompanyId !== undefined ? targetCompanyId : data.companyId,
          tags: typeof data.tags === 'string' ? data.tags : (data.tags ? JSON.stringify(data.tags) : undefined),
          customFields: typeof data.customFields === 'string' ? data.customFields : (data.customFields ? JSON.stringify(data.customFields) : undefined)
        },
        include: {
          contact: {
            select: { id: true, name: true, phone: true, avatar: true, type: true, whatsapp: true, telegram: true, email: true }
          },
          company: {
            select: { id: true, name: true, phone: true }
          },
          responsible: {
            select: { id: true, name: true, avatar: true, department: true, role: true }
          },
          stage: true,
          tasks: {
            where: { isCompleted: false, isDeleted: false },
            orderBy: { dueDate: 'asc' },
            select: { id: true, text: true, type: true, dueDate: true, responsibleId: true }
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' as const },
            select: { id: true, text: true, createdAt: true, channel: true, direction: true }
          }
        }
      });

      // Digital Pipeline: Audit note upon stage transition (auto-task creation disabled to avoid clutter)
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
      }

      // Handle explicit Delayed Demand (Відкладений попит / Пауза) metadata and reminder task
      if (data.pauseData) {
        const { wakeUpDate, reason, autoCreateTask } = data.pauseData;
        const noteUserId = (req as any).userId || existingDeal?.responsibleId || 'usr-admin';
        const formattedDate = wakeUpDate ? new Date(wakeUpDate).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'не визначено';

        await prisma.dealNote.create({
          data: {
            dealId: id,
            userId: noteUserId,
            content: `⏸️ Угоду переведено в режим "Відкладений попит" до ${formattedDate}.\n📌 Причина паузи: ${reason || 'За домовленістю з клієнтом'}`,
            type: 'status_change',
            metadata: JSON.stringify({ pauseReason: reason, wakeUpDate })
          }
        }).catch(() => {});

        if (autoCreateTask && wakeUpDate) {
          await prisma.task.create({
            data: {
              dealId: id,
              responsibleId: existingDeal?.responsibleId || noteUserId,
              createdById: noteUserId,
              type: 'call',
              text: `📞 Відкладений попит: контрольний зв'язок (${reason || 'планове повернення'})`,
              dueDate: new Date(wakeUpDate)
            }
          }).catch(() => {});
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

  // Delete Note / Comment from deal
  router.delete('/:id/notes/:noteId', async (req, res) => {
    try {
      const { noteId } = req.params;
      await prisma.dealNote.delete({
        where: { id: noteId }
      });
      res.json({ success: true, message: 'Замітку успішно видалено' });
    } catch (e: any) {
      console.error('Error deleting note:', e);
      res.status(500).json({ error: 'Failed to delete note' });
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

  // Soft-Delete Deal (Archive with 30-day recovery window - Enforces RBAC)
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req as any).userId;
      const userRole = (req as any).userRole;

      const deal = await prisma.deal.findUnique({ where: { id } });
      if (!deal) {
        return res.status(404).json({ error: 'Угоду не знайдено' });
      }

      // Check RBAC permissions: super_admin, sales_director, user with canDeleteDeals, or deal owner
      let canDelete = userRole === 'super_admin' || userRole === 'sales_director' || userRole === 'admin';
      if (!canDelete && userId) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user?.canDeleteDeals || (user?.canEditDeals && deal.responsibleId === userId)) {
          canDelete = true;
        }
      }

      if (!canDelete) {
        return res.status(403).json({ error: 'Недостатньо прав для видалення цієї угоди (потрібен дозвіл canDeleteDeals)' });
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
