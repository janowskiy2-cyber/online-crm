import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createDealsRouter(prisma: PrismaClient) {
  const router = Router();

  // Get deals with strict RBAC isolation
  router.get('/', async (req, res) => {
    try {
      const { pipelineId, stageId, search, projectId } = req.query;
      const currentUserId = req.headers['x-user-id'] as string;

      const where: any = {};

      if (pipelineId) where.pipelineId = String(pipelineId);
      if (stageId) where.stageId = String(stageId);
      if (projectId) where.projectId = String(projectId);

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

      const currentUserId = req.headers['x-user-id'] as string;

      const newDeal = await prisma.deal.create({
        data: {
          title,
          budget: budget ? Number(budget) : 0,
          pipelineId,
          stageId,
          responsibleId: responsibleId || currentUserId || 'usr-admin',
          contactId,
          companyId,
          tags: typeof tags === 'string' ? tags : JSON.stringify(tags || []),
          customFields: typeof customFields === 'string' ? customFields : JSON.stringify(customFields || {}),
          projectId: projectId || 'employers'
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

  // Update Deal & Move Stage
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;

      const updated = await prisma.deal.update({
        where: { id },
        data: {
          title: data.title,
          budget: data.budget !== undefined ? Number(data.budget) : undefined,
          stageId: data.stageId,
          pipelineId: data.pipelineId,
          responsibleId: data.responsibleId,
          contactId: data.contactId,
          companyId: data.companyId,
          tags: typeof data.tags === 'string' ? data.tags : (data.tags ? JSON.stringify(data.tags) : undefined),
          customFields: typeof data.customFields === 'string' ? data.customFields : (data.customFields ? JSON.stringify(data.customFields) : undefined),
          projectId: data.projectId
        },
        include: {
          contact: true,
          company: true,
          responsible: true,
          stage: true
        }
      });

      res.json(updated);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to update deal' });
    }
  });

  // Add Note / Comment to deal
  router.post('/:id/notes', async (req, res) => {
    try {
      const { id } = req.params;
      const { content, type } = req.body;
      const currentUserId = req.headers['x-user-id'] as string;

      const note = await prisma.dealNote.create({
        data: {
          dealId: id,
          userId: currentUserId || 'usr-admin',
          content,
          type: type || 'comment'
        },
        include: { user: true }
      });

      res.status(201).json(note);
    } catch (e) {
      res.status(500).json({ error: 'Failed to add note' });
    }
  });

  // Delete Deal
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.dealNote.deleteMany({ where: { dealId: id } });
      await prisma.task.deleteMany({ where: { dealId: id } });
      await prisma.chatMessage.deleteMany({ where: { dealId: id } });
      await prisma.deal.delete({ where: { id } });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to delete deal' });
    }
  });

  return router;
}
