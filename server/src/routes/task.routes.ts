import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';

export function createTaskRouter(prisma: PrismaClient, getIo: () => SocketIOServer | null) {
  const router = Router();

  // Get tasks for user or team
  router.get('/', async (req, res) => {
    try {
      const currentUserId = (req as any).userId || (req.headers['x-user-id'] as string);
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
      const currentUserId = (req as any).userId || (req.headers['x-user-id'] as string);
      const { dealId, responsibleId, type, text, dueDate } = req.body;

      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Текст завдання обов’язковий' });
      }

      let creatorId = currentUserId;
      if (!creatorId) {
        const firstUser = await prisma.user.findFirst();
        creatorId = firstUser ? firstUser.id : 'usr-admin';
      }

      const assignedId = responsibleId || creatorId;

      const task = await prisma.task.create({
        data: {
          dealId: dealId || null,
          responsibleId: assignedId,
          createdById: creatorId,
          type: type || 'call',
          text: text.trim(),
          dueDate: new Date(dueDate || Date.now() + 86400000)
        },
        include: {
          responsible: true,
          deal: true
        }
      });

      if (dealId && creatorId) {
        try {
          await prisma.dealNote.create({
            data: {
              dealId,
              userId: creatorId,
              type: 'system',
              content: `Поставлено нове завдання: "${text}" (термін: ${new Date(task.dueDate).toLocaleDateString('uk-UA')})`
            }
          });
        } catch (noteErr) {
          console.warn('Could not create system note for task:', noteErr);
        }
      }

      const io = getIo();
      if (io) io.emit('task_created', task);

      res.status(201).json(task);
    } catch (e) {
      console.error('Error creating task:', e);
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  // Complete / update task
  router.put('/:id', async (req, res) => {
    try {
      const currentUserId = (req as any).userId || (req.headers['x-user-id'] as string);
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
        try {
          await prisma.dealNote.create({
            data: {
              dealId: task.dealId,
              userId: currentUserId,
              type: 'system',
              content: `Завершено завдання: "${task.text}" ${resultText ? `(Результат: ${resultText})` : ''}`
            }
          });
        } catch (noteErr) {
          console.warn('Could not create system note for completed task:', noteErr);
        }
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
