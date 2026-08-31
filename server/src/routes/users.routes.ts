import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

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

  // Verify Admin Password (22222222)
  router.post('/verify-admin-pin', (req, res) => {
    const { password } = req.body;
    if (password === '22222222') {
      return res.json({ success: true });
    }
    return res.status(401).json({ error: 'Невірний пароль адміністратора' });
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

      const newUser = await prisma.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: password || '123456',
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

      res.status(201).json(newUser);
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

      const updated = await prisma.user.update({
        where: { id },
        data: {
          name: data.name,
          email: data.email?.toLowerCase(),
          password: data.password !== undefined ? data.password : undefined,
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
        }
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
