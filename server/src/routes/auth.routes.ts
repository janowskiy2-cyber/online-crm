import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { verifyPassword } from '../utils/security';

const JWT_SECRET = process.env.JWT_SECRET || 'crm_super_secret_jwt_key_2026';

export function createAuthRouter(prisma: PrismaClient) {
  const router = Router();

  // Get all users for list / quick switcher
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

  // Standard Email/Password Login
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
          details: `Авторизация пользователя ${user.name} (${user.role})`
        }
      });

      res.json({
        user,
        token
      });
    } catch (e) {
      res.status(500).json({ error: 'Ошибка авторизации' });
    }
  });

  // Switch user / Login-as
  router.post('/login-as', async (req, res) => {
    try {
      const { userId } = req.body;
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }

      const token = jwt.sign(
        { userId: user.id, role: user.role, email: user.email },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({
        user,
        token
      });
    } catch (e) {
      res.status(500).json({ error: 'Ошибка смены пользователя' });
    }
  });

  // Get current session user by token or header
  router.get('/me', async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        return res.status(401).json({ error: 'Не авторизован' });
      }
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }
      res.json(user);
    } catch (e) {
      res.status(500).json({ error: 'Ошибка проверки сессии' });
    }
  });

  return router;
}
