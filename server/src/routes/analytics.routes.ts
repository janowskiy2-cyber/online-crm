import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createAnalyticsRouter(prisma: PrismaClient) {
  const router = Router();

  // Get full sales analytics
  router.get('/dashboard', async (req, res) => {
    try {
      const deals = await prisma.deal.findMany({
        include: {
          stage: true,
          pipeline: true,
          responsible: true
        }
      });

      const totalDeals = deals.length;
      const wonDeals = deals.filter(d => d.stage.isWon);
      const lostDeals = deals.filter(d => d.stage.isLost);
      const inProgressDeals = deals.filter(d => !d.stage.isWon && !d.stage.isLost);

      const totalBudget = deals.reduce((acc, d) => acc + (d.budget || 0), 0);
      const wonBudget = wonDeals.reduce((acc, d) => acc + (d.budget || 0), 0);
      const inProgressBudget = inProgressDeals.reduce((acc, d) => acc + (d.budget || 0), 0);

      const winRate = totalDeals > 0 ? Math.round((wonDeals.length / totalDeals) * 100) : 0;
      const avgCheck = wonDeals.length > 0 ? Math.round(wonBudget / wonDeals.length) : 0;

      // Group by stages for funnel conversion
      const stages = await prisma.stage.findMany({
        orderBy: { sortOrder: 'asc' },
        include: { _count: { select: { deals: true } } }
      });

      const funnel = stages.map(s => ({
        id: s.id,
        name: s.name,
        color: s.color,
        count: s._count.deals,
        isWon: s.isWon,
        isLost: s.isLost
      }));

      // Group by managers for leaderboard
      const managerStats: { [key: string]: any } = {};
      for (const d of deals) {
        const mgr = d.responsible;
        if (!managerStats[mgr.id]) {
          managerStats[mgr.id] = {
            id: mgr.id,
            name: mgr.name,
            department: mgr.department,
            avatar: mgr.avatar,
            dealsCount: 0,
            wonCount: 0,
            totalRevenue: 0
          };
        }
        managerStats[mgr.id].dealsCount += 1;
        if (d.stage.isWon) {
          managerStats[mgr.id].wonCount += 1;
          managerStats[mgr.id].totalRevenue += d.budget || 0;
        }
      }

      // Group by loss reasons
      const lossReasonsMap: { [key: string]: number } = {};
      for (const d of lostDeals) {
        const reason = d.lossReason || 'Не указана';
        lossReasonsMap[reason] = (lossReasonsMap[reason] || 0) + 1;
      }

      const lossReasons = Object.entries(lossReasonsMap).map(([reason, count]) => ({
        reason,
        count
      }));

      res.json({
        summary: {
          totalDeals,
          wonDeals: wonDeals.length,
          lostDeals: lostDeals.length,
          inProgressDeals: inProgressDeals.length,
          totalBudget,
          wonBudget,
          inProgressBudget,
          winRate,
          avgCheck
        },
        funnel,
        leaderboard: Object.values(managerStats).sort((a, b) => b.totalRevenue - a.totalRevenue),
        lossReasons
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to generate analytics' });
    }
  });

  return router;
}
