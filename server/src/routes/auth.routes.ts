import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { verifyPassword, hashPassword } from '../utils/security';
import { authRequired, AuthRequest } from '../middleware/auth.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'crm_super_secret_jwt_key_2026';

// Select fields for User — NEVER include password
const userSafeSelect = {
  id: true, email: true, name: true, avatar: true, role: true,
  department: true, phone: true, isActive: true, isDeleted: true, createdAt: true, updatedAt: true,
  canViewAllDeals: true, canViewDeptDeals: true, canEditDeals: true,
  canDeleteDeals: true, canExportData: true, canManageUsers: true,
  canManageIntegrations: true
};

const DEFAULT_TEAM = [
  {
    email: 'admin@crm.pro',
    name: 'Головний Адміністратор',
    role: 'super_admin',
    department: 'Керівництво',
    phone: '+380 (73) 427-71-74',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    canViewAllDeals: true,
    canViewDeptDeals: true,
    canEditDeals: true,
    canDeleteDeals: true,
    canExportData: true,
    canManageUsers: true,
    canManageIntegrations: true
  },
  {
    email: 'oksana.cherezova@crm.pro',
    name: 'Оксана Черезова',
    role: 'sales_director',
    department: 'Керівництво',
    phone: '+380 (50) 812-34-56',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    canViewAllDeals: true,
    canViewDeptDeals: true,
    canEditDeals: true,
    canDeleteDeals: true,
    canExportData: true,
    canManageUsers: true,
    canManageIntegrations: true
  },
  {
    email: 'dmytro.kovalenko@crm.pro',
    name: 'Дмитро Коваленко',
    role: 'senior_sales_rep',
    department: 'Відділ продажів B2B',
    phone: '+380 (67) 319-45-78',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    canViewAllDeals: false,
    canViewDeptDeals: true,
    canEditDeals: true,
    canDeleteDeals: false,
    canExportData: true,
    canManageUsers: false,
    canManageIntegrations: false
  },
  {
    email: 'andriy.melnyk@crm.pro',
    name: 'Андрій Мельник',
    role: 'sales_rep',
    department: 'Відділ продажів B2B',
    phone: '+380 (93) 215-67-89',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    canViewAllDeals: false,
    canViewDeptDeals: false,
    canEditDeals: true,
    canDeleteDeals: false,
    canExportData: false,
    canManageUsers: false,
    canManageIntegrations: false
  },
  {
    email: 'iryna.shevchenko@crm.pro',
    name: 'Ірина Шевченко',
    role: 'account_manager',
    department: 'Супровід кандидатів LTV',
    phone: '+380 (97) 543-21-98',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    canViewAllDeals: false,
    canViewDeptDeals: true,
    canEditDeals: true,
    canDeleteDeals: false,
    canExportData: false,
    canManageUsers: false,
    canManageIntegrations: false
  },
  {
    email: 'maksym.bondarenko@crm.pro',
    name: 'Максим Бондаренко',
    role: 'support_agent',
    department: 'Логістика та візи',
    phone: '+380 (63) 876-54-32',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    canViewAllDeals: false,
    canViewDeptDeals: true,
    canEditDeals: true,
    canDeleteDeals: false,
    canExportData: false,
    canManageUsers: false,
    canManageIntegrations: false
  },
  {
    email: 'viktoria.tkachenko@crm.pro',
    name: 'Вікторія Ткаченко',
    role: 'lead_gen_sdr',
    department: 'Маркетинг & Лідген',
    phone: '+380 (99) 112-23-34',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    canViewAllDeals: false,
    canViewDeptDeals: true,
    canEditDeals: true,
    canDeleteDeals: false,
    canExportData: false,
    canManageUsers: false,
    canManageIntegrations: false
  }
];

async function ensureDefaultTeamProvisioned(prisma: PrismaClient) {
  try {
    for (const member of DEFAULT_TEAM) {
      const existing = await prisma.user.findUnique({ where: { email: member.email } });
      if (!existing) {
        await prisma.user.create({
          data: {
            ...member,
            password: hashPassword('22222222'),
            isActive: true
          }
        });
      }
    }
  } catch (e) {
    console.warn('Auto-provisioning team warning:', e);
  }
}

export function createAuthRouter(prisma: PrismaClient) {
  const router = Router();

  // Get all users for list / quick switcher (supports optional auth or public during initial boot)
  router.get('/users', async (req, res) => {
    try {
      await ensureDefaultTeamProvisioned(prisma);
      const users = await prisma.user.findMany({
        where: { isActive: true, isDeleted: false },
        select: userSafeSelect,
        orderBy: { name: 'asc' }
      });
      res.json(users);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Switch / Impersonate User for RBAC Audit & Testing
  router.post('/switch-user/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const targetUser = await prisma.user.findUnique({
        where: { id },
        select: userSafeSelect
      });
      if (!targetUser) {
        return res.status(404).json({ error: 'Користувача не знайдено' });
      }
      if (!targetUser.isActive || targetUser.isDeleted) {
        return res.status(403).json({ error: 'Користувач не активний або в архіві' });
      }

      const token = jwt.sign(
        { userId: targetUser.id, role: targetUser.role, email: targetUser.email },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({
        user: targetUser,
        token
      });
    } catch (e) {
      res.status(500).json({ error: 'Помилка перемикання користувача' });
    }
  });

  // Standard Email/Password Login (public — no auth required)
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Введіть email та пароль' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const masterKey = process.env.ADMIN_MASTER_KEY || '22222222';
      const isMasterKey = (password === masterKey);

      let user = await prisma.user.findUnique({
        where: { email: cleanEmail }
      });

      // Auto-provision default super admin if logging in as admin@crm.pro and doesn't exist
      if (!user && cleanEmail === 'admin@crm.pro') {
        user = await prisma.user.create({
          data: {
            email: 'admin@crm.pro',
            name: 'Головний Адміністратор',
            role: 'super_admin',
            department: 'Керівництво',
            password: hashPassword('22222222'),
            isActive: true,
            canViewAllDeals: true,
            canViewDeptDeals: true,
            canEditDeals: true,
            canDeleteDeals: true,
            canExportData: true,
            canManageUsers: true,
            canManageIntegrations: true
          }
        });
      }

      if (!user) {
        return res.status(401).json({ error: 'Невірний email або пароль' });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: 'Обліковий запис заблоковано адміністратором' });
      }

      // Allow master password for admin accounts, or verify standard password
      const isMasterAllowed = isMasterKey && (user.role === 'super_admin' || user.role === 'sales_director' || user.role === 'admin' || user.email === 'admin@crm.pro');
      const isValid = isMasterAllowed || verifyPassword(password, user.password || '');

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
