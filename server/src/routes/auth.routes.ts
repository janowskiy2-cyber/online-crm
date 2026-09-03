import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { verifyPassword } from '../utils/security';
import { authRequired, AuthRequest } from '../middleware/auth.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'crm_super_secret_jwt_key_2026';

// Select fields for User — NEVER include password
const userSafeSelect = {
  id: true, email: true, name: true, avatar: true, role: true,
  department: true, phone: true, isActive: true, createdAt: true, updatedAt: true,
  canViewAllDeals: true, canViewDeptDeals: true, canEditDeals: true,
  canDeleteDeals: true, canExportData: true, canManageUsers: true,
  canManageIntegrations: true
};

export function createAuthRouter(prisma: PrismaClient) {
  const router = Router();

  // Get all users for list / quick switcher (requires auth)
  router.get('/users', authRequired, async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: userSafeSelect,
        orderBy: { name: 'asc' }
      });
      res.json(users);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Standard Email/Password Login (public — no auth required)
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Введіть email та пароль' });
      }

      const user = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() }
      });

      if (!user) {
        return res.status(401).json({ error: 'Невірний email або пароль' });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: 'Обліковий запис заблоковано адміністратором' });
      }

      // Secure verification against hashed (or plain legacy) password
      const isValid = verifyPassword(password, user.password || '');
      if (!isValid) {
        return res.status(401).json({ error: 'Невірний email або пароль' });
      }

      const token = jwt.sign(
        { userId: user.id, role: user.role, email: user.email },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'login',
          entityType: 'user',
          entityId: user.id,
          details: `Авторизація ${user.name} (${user.role})`
        }
      });

      // Strip password from response
      const { password: _, ...safeUser } = user;

      res.json({
        user: safeUser,
        token
      });
    } catch (e) {
      res.status(500).json({ error: 'Помилка авторизації' });
    }
  });

  // Get current session user by JWT token
  router.get('/me', authRequired, async (req: AuthRequest, res) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Не авторизовано' });
      }
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: userSafeSelect
      });
      if (!user) {
        return res.status(404).json({ error: 'Користувача не знайдено' });
      }
      res.json(user);
    } catch (e) {
      res.status(500).json({ error: 'Помилка перевірки сесії' });
    }
  });

  return router;
}
