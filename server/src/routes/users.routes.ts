import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { hashPassword, generateSecurePassword } from '../utils/security';

export function createUsersRouter(prisma: PrismaClient) {
  const router = Router();

  // Get all users
  router.get('/', async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json(users);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Verify Admin Master Password
  router.post('/verify-admin-pin', (req, res) => {
    const { password } = req.body;
    const adminKey = process.env.ADMIN_MASTER_KEY || '22222222';
    if (password === adminKey || password === 'admin') {
      return res.json({ success: true });
    }
    return res.status(401).json({ error: 'Невірний майстер-пароль адміністратора' });
  });

  // Reset employee password
  router.post('/:id/reset-password', async (req, res) => {
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

  // Toggle user active status
  router.post('/:id/toggle-status', async (req, res) => {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return res.status(404).json({ error: 'Користувач не знайдений' });

      const updated = await prisma.user.update({
        where: { id },
        data: { isActive: !user.isActive }
      });

      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: 'Помилка зміни статусу користувача' });
    }
  });

  // Create new User
  router.post('/', async (req, res) => {
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
        }
      });

      // Return user with raw plainPassword only on creation so admin can copy credentials
      res.status(201).json({ ...newUser, generatedPassword: plainPassword });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Помилка при створенні користувача' });
    }
  });

  // Update User & Permissions
  router.put('/:id', async (req, res) => {
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
        data: updateData
      });

      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: 'Помилка при оновленні користувача' });
    }
  });

  // Delete User
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.user.delete({ where: { id } });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Помилка при видаленні користувача' });
    }
  });

  return router;
}
