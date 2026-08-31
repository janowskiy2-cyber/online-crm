import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createAuthRouter(prisma: PrismaClient) {
  const router = Router();

  // Get all users for quick login / role switching
  router.get('/users', async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });
      res.json(users);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Switch user / Login as specific user
  router.post('/login-as', async (req, res) => {
    try {
      const { userId } = req.body;
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'login',
          entityType: 'user',
          entityId: user.id,
          details: `Вход в систему под ролью ${user.role} (${user.department})`
        }
      });

      res.json({
        user,
        token: `mock_jwt_token_for_${user.id}`
      });
    } catch (e) {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  return router;
}
