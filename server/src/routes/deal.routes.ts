import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AutomationService } from '../services/automation.service';
import { Server as SocketIOServer } from 'socket.io';

export function createDealRouter(prisma: PrismaClient, automation: AutomationService, getIo: () => SocketIOServer | null) {
  const router = Router();

  // Get deals with RBAC filtering
  router.get('/', async (req, res) => {
    try {
      const currentUserId = req.headers['x-user-id'] as string;
      const { pipelineId, search, tag } = req.query;

      let whereClause: any = {};

      if (pipelineId) {
        whereClause.pipelineId = String(pipelineId);
      }

      if (search) {
        whereClause.OR = [
          { title: { contains: String(search) } },
          { contact: { name: { contains: String(search) } } },
          { contact: { phone: { contains: String(search) } } },
          { company: { name: { contains: String(search) } } }
        ];
      }

      if (tag) {
        whereClause.tags = { contains: String(tag) };
      }

      // Role based filter
      if (currentUserId) {
        const user = await prisma.user.findUnique({ where: { id: currentUserId } });
        if (user && !user.canViewAllDeals) {
          if (user.canViewDeptDeals) {
            // Find all users in department
            const deptUsers = await prisma.user.findMany({
              where: { department: user.department },
              select: { id: true }
            });
            whereClause.responsibleId = { in: deptUsers.map(u => u.id) };
          } else {
            // View only own deals
            whereClause.responsibleId = user.id;
          }
        }
      }

      const deals = await prisma.deal.findMany({
        where: whereClause,
        include: {
          contact: true,
          company: true,
          responsible: {
            select: { id: true, name: true, role: true, department: true, avatar: true }
          },
          stage: true,
          tasks: {
            where: { isCompleted: false },
            orderBy: { dueDate: 'asc' }
          },
          notes: {
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1
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

  // Get deal details
  router.get('/:id', async (req, res) => {
    try {
      const deal = await prisma.deal.findUnique({
        where: { id: req.params.id },
        include: {
          contact: true,
          company: true,
          stage: true,
          pipeline: {
            include: { stages: { orderBy: { sortOrder: 'asc' } } }
          },
          responsible: true,
          tasks: {
            include: { responsible: true, createdBy: true },
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
      res.status(500).json({ error: 'Failed to fetch deal details' });
    }
  });

  // Create new deal
  router.post('/', async (req, res) => {
    try {
      const currentUserId = req.headers['x-user-id'] as string;
      const { title, budget, pipelineId, stageId, responsibleId, contactId, companyId, tags, customFields } = req.body;

      const deal = await prisma.deal.create({
        data: {
          title,
          budget: Number(budget) || 0,
          pipelineId,
          stageId,
          responsibleId: responsibleId || currentUserId,
          contactId: contactId || null,
          companyId: companyId || null,
          tags: tags ? JSON.stringify(tags) : null,
          customFields: customFields ? JSON.stringify(customFields) : null
        },
        include: {
          contact: true,
          company: true,
          responsible: true,
          stage: true,
          tasks: true
        }
      });

      if (currentUserId) {
        await prisma.dealNote.create({
          data: {
            dealId: deal.id,
            userId: currentUserId,
            type: 'system',
            content: `Сделка создана пользователем`
          }
        });
      }

      const io = getIo();
      if (io) io.emit('deal_created', deal);

      res.status(201).json(deal);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to create deal' });
    }
  });

  // Update deal (e.g. stage, budget, fields)
  router.put('/:id', async (req, res) => {
    try {
      const currentUserId = (req.headers['x-user-id'] as string) || '';
      const { stageId, title, budget, responsibleId, lossReason, tags, customFields } = req.body;

      const existingDeal = await prisma.deal.findUnique({
        where: { id: req.params.id },
        include: { stage: true }
      });

      if (!existingDeal) return res.status(404).json({ error: 'Deal not found' });

      const isStageChanged = stageId && stageId !== existingDeal.stageId;

      const updatedDeal = await prisma.deal.update({
        where: { id: req.params.id },
        data: {
          title: title !== undefined ? title : undefined,
          budget: budget !== undefined ? Number(budget) : undefined,
          stageId: stageId !== undefined ? stageId : undefined,
          responsibleId: responsibleId !== undefined ? responsibleId : undefined,
          lossReason: lossReason !== undefined ? lossReason : undefined,
          tags: tags !== undefined ? (typeof tags === 'string' ? tags : JSON.stringify(tags)) : undefined,
          customFields: customFields !== undefined ? (typeof customFields === 'string' ? customFields : JSON.stringify(customFields)) : undefined
        },
        include: {
          contact: true,
          company: true,
          responsible: true,
          stage: true,
          tasks: { where: { isCompleted: false } }
        }
      });

      if (isStageChanged && currentUserId) {
        const newStage = await prisma.stage.findUnique({ where: { id: stageId } });
        await prisma.dealNote.create({
          data: {
            dealId: updatedDeal.id,
            userId: currentUserId,
            type: 'status_change',
            content: `Этап изменен с "${existingDeal.stage.name}" на "${newStage?.name}"`
          }
        });

        // Trigger Digital Pipeline automations
        await automation.handleStageChange(updatedDeal.id, stageId, currentUserId);
      }

      const io = getIo();
      if (io) io.emit('deal_updated', updatedDeal);

      res.json(updatedDeal);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to update deal' });
    }
  });

  // Add note / comment
  router.post('/:id/notes', async (req, res) => {
    try {
      const currentUserId = req.headers['x-user-id'] as string;
      const { content, type } = req.body;

      const note = await prisma.dealNote.create({
        data: {
          dealId: req.params.id,
          userId: currentUserId,
          type: type || 'comment',
          content
        },
        include: { user: true }
      });

      const io = getIo();
      if (io) io.emit('deal_note_added', note);

      res.status(201).json(note);
    } catch (e) {
      res.status(500).json({ error: 'Failed to add note' });
    }
  });

  // Delete deal (with RBAC check)
  router.delete('/:id', async (req, res) => {
    try {
      const currentUserId = req.headers['x-user-id'] as string;
      if (currentUserId) {
        const user = await prisma.user.findUnique({ where: { id: currentUserId } });
        if (user && !user.canDeleteDeals) {
          return res.status(403).json({ error: 'У вас нет прав на удаление сделок' });
        }
      }

      await prisma.deal.delete({ where: { id: req.params.id } });
      const io = getIo();
      if (io) io.emit('deal_deleted', { id: req.params.id });

      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to delete deal' });
    }
  });

  return router;
}
