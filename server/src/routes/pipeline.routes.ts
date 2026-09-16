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

      // Ensure "⏸️ Відкладений попит" stage exists in pipelines (Auto-migration)
      for (const p of pipelines) {
        const hasDeferredStage = p.stages.some(s => 
          s.name.toLowerCase().includes('відкладений') || 
          s.name.toLowerCase().includes('отложенный') ||
          s.name.toLowerCase().includes('пауз')
        );
        if (!hasDeferredStage && p.stages.length > 0) {
          const lostStageIndex = p.stages.findIndex(s => s.isLost || s.name.toLowerCase().includes('відмов'));
          const maxSort = Math.max(...p.stages.map(s => s.sortOrder), 0);
          const targetSort = lostStageIndex >= 0 ? p.stages[lostStageIndex].sortOrder : maxSort + 1;
          
          if (lostStageIndex >= 0) {
            await prisma.stage.updateMany({
              where: { pipelineId: p.id, sortOrder: { gte: targetSort } },
              data: { sortOrder: { increment: 1 } }
            }).catch(() => {});
          }

          const newStage = await prisma.stage.create({
            data: {
              name: '⏸️ Відкладений попит',
              color: '#6366f1',
              sortOrder: targetSort,
              pipelineId: p.id
            },
            include: {
              _count: { select: { deals: true } }
            }
          });
          p.stages.push(newStage);
          p.stages.sort((a, b) => a.sortOrder - b.sortOrder);
        }
      }

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
