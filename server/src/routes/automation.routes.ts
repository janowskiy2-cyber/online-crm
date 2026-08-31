import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createAutomationRouter(prisma: PrismaClient) {
  const router = Router();

  // Get all automation rules
  router.get('/', async (req, res) => {
    try {
      const rules = await prisma.automationRule.findMany({
        include: { pipeline: true }
      });
      res.json(rules);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch automation rules' });
    }
  });

  // Create automation rule
  router.post('/', async (req, res) => {
    try {
      const { pipelineId, stageId, triggerType, actionType, actionData } = req.body;
      const rule = await prisma.automationRule.create({
        data: {
          pipelineId,
          stageId: stageId || null,
          triggerType,
          actionType,
          actionData: typeof actionData === 'string' ? actionData : JSON.stringify(actionData)
        }
      });
      res.status(201).json(rule);
    } catch (e) {
      res.status(500).json({ error: 'Failed to create automation rule' });
    }
  });

  // Toggle active / delete rule
  router.delete('/:id', async (req, res) => {
    try {
      await prisma.automationRule.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to delete rule' });
    }
  });

  return router;
}
