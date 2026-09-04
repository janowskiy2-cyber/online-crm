import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { hashPassword, generateSecurePassword } from '../utils/security';
import { adminRequired, AuthRequest } from '../middleware/auth.middleware';

const userSafeSelect = {
  id: true,
  email: true,
  name: true,
  avatar: true,
  role: true,
  department: true,
  phone: true,
  isActive: true,
  isDeleted: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  canViewAllDeals: true,
  canViewDeptDeals: true,
  canEditDeals: true,
  canDeleteDeals: true,
  canExportData: true,
  canManageUsers: true,
  canManageIntegrations: true
};

export function createUsersRouter(prisma: PrismaClient) {
  const router = Router();

  // Get all active users (Safe select, no password hashes)
  router.get('/', async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        where: { isDeleted: false },
        select: userSafeSelect,
        orderBy: { createdAt: 'desc' }
      });
      res.json(users);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Get all archived users
  router.get('/archived/list', async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        where: { isDeleted: true },
        select: userSafeSelect,
        orderBy: { deletedAt: 'desc' }
      });
      res.json(users);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch archived users' });
    }
  });

  // Verify Admin Master Password
  router.post('/verify-admin-pin', (req, res) => {
    try {
      const { password } = req.body;
      const adminKey = process.env.ADMIN_MASTER_KEY || '22222222';
      if (password && password === adminKey) {
        return res.json({ success: true });
      }
      return res.status(401).json({ error: 'Невірний майстер-пароль адміністратора' });
    } catch (e) {
      return res.status(500).json({ error: 'Помилка перевірки пароля' });
    }
  });

  // Reset employee password (Admin only)
  router.post('/:id/reset-password', adminRequired, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      const plainPass = newPassword || generateSecurePassword();
      const hashed = hashPassword(plainPass);

      await prisma.user.update({
        where: { id },
        data: { password: hashed }
      });

      res.json({ success: true, newPassword: plainPass });
    } catch (e) {
      res.status(500).json({ error: 'Помилка скидання пароля' });
    }
  });

  // Toggle user active status (Admin only)
  router.post('/:id/toggle-status', adminRequired, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return res.status(404).json({ error: 'Користувач не знайдений' });

      const updated = await prisma.user.update({
        where: { id },
        data: { isActive: !user.isActive },
        select: userSafeSelect
      });

      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: 'Помилка зміни статусу користувача' });
    }
  });

  // Create new User (Admin only)
  router.post('/', adminRequired, async (req: AuthRequest, res) => {
    try {
      const {
        name,
        email,
        password,
        role,
        department,
        phone,
        avatar,
        canViewAllDeals,
        canViewDeptDeals,
        canEditDeals,
        canDeleteDeals,
        canExportData,
        canManageUsers,
        canManageIntegrations
      } = req.body;

      if (!name || !email) {
        return res.status(400).json({ error: "Ім'я та Email обов'язкові" });
      }

      const existing = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existing) {
        return res.status(400).json({ error: 'Користувач з таким email вже існує' });
      }

      const plainPassword = password || generateSecurePassword();
      const hashedPassword = hashPassword(plainPassword);

      const newUser = await prisma.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role: role || 'sales_rep',
          department: department || 'Відділ продажів B2B',
          phone: phone || '+380',
          avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          isActive: true,
          canViewAllDeals: canViewAllDeals ?? false,
          canViewDeptDeals: canViewDeptDeals ?? true,
          canEditDeals: canEditDeals ?? true,
          canDeleteDeals: canDeleteDeals ?? false,
          canExportData: canExportData ?? false,
          canManageUsers: canManageUsers ?? false,
          canManageIntegrations: canManageIntegrations ?? false
        },
        select: userSafeSelect
      });

      // Return user with raw plainPassword only on creation so admin can copy credentials
      res.status(201).json({ ...newUser, generatedPassword: plainPassword });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Помилка при створенні користувача' });
    }
  });

  // Update User & Permissions (Admin only)
  router.put('/:id', adminRequired, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const data = req.body;

      const updateData: any = {
        name: data.name,
        email: data.email?.toLowerCase(),
        role: data.role,
        department: data.department,
        phone: data.phone,
        avatar: data.avatar,
        isActive: data.isActive,
        canViewAllDeals: data.canViewAllDeals,
        canViewDeptDeals: data.canViewDeptDeals,
        canEditDeals: data.canEditDeals,
        canDeleteDeals: data.canDeleteDeals,
        canExportData: data.canExportData,
        canManageUsers: data.canManageUsers,
        canManageIntegrations: data.canManageIntegrations
      };

      if (data.password && data.password.trim()) {
        updateData.password = hashPassword(data.password.trim());
      }

      const updated = await prisma.user.update({
        where: { id },
        data: updateData,
        select: userSafeSelect
      });

      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: 'Помилка при оновленні користувача' });
    }
  });

  // Soft Delete User / Send to Archive (Admin only)
  router.delete('/:id', adminRequired, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return res.status(404).json({ error: 'Користувач не знайдений' });
      }

      const archived = await prisma.user.update({
        where: { id },
        data: {
          isActive: false,
          isDeleted: true,
          deletedAt: new Date()
        },
        select: userSafeSelect
      });

      res.json({ success: true, message: 'Співробітника переміщено в архів з можливістю відновлення', user: archived });
    } catch (e) {
      res.status(500).json({ error: 'Помилка при переміщенні користувача в архів' });
    }
  });

  // Restore User from Archive (Admin only)
  router.post('/:id/restore', adminRequired, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const restored = await prisma.user.update({
        where: { id },
        data: {
          isActive: true,
          isDeleted: false,
          deletedAt: null
        },
        select: userSafeSelect
      });

      res.json({ success: true, message: 'Співробітника успішно відновлено', user: restored });
    } catch (e) {
      res.status(500).json({ error: 'Помилка при відновленні співробітника' });
    }
  });

  return router;
}
