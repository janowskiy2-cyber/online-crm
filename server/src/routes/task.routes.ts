import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';

export function createTaskRouter(prisma: PrismaClient, getIo: () => SocketIOServer | null) {
  const router = Router();

  // Get tasks for user or team
  router.get('/', async (req, res) => {
    try {
      const currentUserId = req.headers['x-user-id'] as string;
      const { status, dealId } = req.query;

      let where: any = {};

      if (dealId) {
        where.dealId = String(dealId);
      }

      if (status === 'active') {
        where.isCompleted = false;
      } else if (status === 'completed') {
        where.isCompleted = true;
      }

      if (currentUserId) {
        const user = await prisma.user.findUnique({ where: { id: currentUserId } });
        if (user && !user.canViewAllDeals) {
          if (user.canViewDeptDeals) {
            const deptUsers = await prisma.user.findMany({
              where: { department: user.department },
              select: { id: true }
            });
            where.responsibleId = { in: deptUsers.map(u => u.id) };
          } else {
            where.responsibleId = user.id;
          }
        }
      }

      const tasks = await prisma.task.findMany({
        where,
        include: {
          responsible: { select: { id: true, name: true, avatar: true } },
          createdBy: { select: { id: true, name: true } },
          deal: {
            select: { id: true, title: true, budget: true, stage: true, contact: true }
          }
        },
        orderBy: { dueDate: 'asc' }
      });

      res.json(tasks);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // Create task
  router.post('/', async (req, res) => {
    try {
      const currentUserId = req.headers['x-user-id'] as string;
      const { dealId, responsibleId, type, text, dueDate } = req.body;

      const task = await prisma.task.create({
        data: {
          dealId: dealId || null,
          responsibleId: responsibleId || currentUserId,
          createdById: currentUserId,
          type: type || 'call',
          text,
          dueDate: new Date(dueDate || Date.now() + 86400000)
        },
        include: {
          responsible: true,
          deal: true
        }
      });

      if (dealId && currentUserId) {
        await prisma.dealNote.create({
          data: {
            dealId,
            userId: currentUserId,
            type: 'system',
            content: `Поставлена новая задача: "${text}" (срок: ${new Date(task.dueDate).toLocaleDateString('ru-RU')})`
          }
        });
      }

      const io = getIo();
      if (io) io.emit('task_created', task);

      res.status(201).json(task);
    } catch (e) {
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  // Complete / update task
  router.put('/:id', async (req, res) => {
    try {
      const currentUserId = req.headers['x-user-id'] as string;
      const { isCompleted, resultText } = req.body;

      const task = await prisma.task.update({
        where: { id: req.params.id },
        data: {
          isCompleted: isCompleted !== undefined ? Boolean(isCompleted) : undefined,
          resultText: resultText !== undefined ? resultText : undefined,
          completedAt: isCompleted ? new Date() : null
        },
        include: {
          responsible: true,
          deal: true
        }
      });

      if (isCompleted && task.dealId && currentUserId) {
        await prisma.dealNote.create({
          data: {
            dealId: task.dealId,
            userId: currentUserId,
            type: 'system',
            content: `Завершена задача: "${task.text}" ${resultText ? `(Результат: ${resultText})` : ''}`
          }
        });
      }

      const io = getIo();
      if (io) io.emit('task_updated', task);

      res.json(task);
    } catch (e) {
      res.status(500).json({ error: 'Failed to update task' });
    }
  });

  return router;
}
