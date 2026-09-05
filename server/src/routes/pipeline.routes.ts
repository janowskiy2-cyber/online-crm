import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createPipelineRouter(prisma: PrismaClient) {
  const router = Router();

  // Get all pipelines with stages and count of deals
  router.get('/', async (req, res) => {
    try {
      const pipelines = await prisma.pipeline.findMany({
        include: {
          stages: {
            orderBy: { sortOrder: 'asc' },
            include: {
              _count: {
                select: { deals: true }
              }
            }
          }
        },
        orderBy: { sortOrder: 'asc' }
      });
      res.json(pipelines);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch pipelines' });
    }
  });

  // Create pipeline
  router.post('/', async (req, res) => {
    try {
      const { name, stages } = req.body;
      const pipeline = await prisma.pipeline.create({
        data: {
          name,
          stages: {
            create: stages || [
              { name: 'Первичный контакт', color: '#3b82f6', sortOrder: 0 },
              { name: 'Переговоры / КП', color: '#f59e0b', sortOrder: 1 },
              { name: 'Принятие решения', color: '#8b5cf6', sortOrder: 2 },
              { name: 'Успешно реализовано', color: '#10b981', isWon: true, sortOrder: 3 },
              { name: 'Закрыто и не реализовано', color: '#ef4444', isLost: true, sortOrder: 4 }
            ]
          }
        },
        include: { stages: true }
      });
      res.status(201).json(pipeline);
    } catch (e) {
      res.status(500).json({ error: 'Failed to create pipeline' });
    }
  });

  return router;
}
