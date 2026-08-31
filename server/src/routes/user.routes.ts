import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createUserRouter(prisma: PrismaClient) {
  const router = Router();

  // Get all 20 users with their roles and stats
  router.get('/', async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        include: {
          _count: {
            select: {
              deals: true,
              tasks: { where: { isCompleted: false } }
            }
          }
        },
        orderBy: { name: 'asc' }
      });
      res.json(users);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Update user permissions
  router.put('/:id/permissions', async (req, res) => {
    try {
      const {
        canViewAllDeals,
        canViewDeptDeals,
        canEditDeals,
        canDeleteDeals,
        canExportData,
        canManageUsers,
        canManageIntegrations
      } = req.body;

      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: {
          canViewAllDeals,
          canViewDeptDeals,
          canEditDeals,
          canDeleteDeals,
          canExportData,
          canManageUsers,
          canManageIntegrations
        }
      });
      res.json(user);
    } catch (e) {
      res.status(500).json({ error: 'Failed to update user permissions' });
    }
  });

  return router;
}
