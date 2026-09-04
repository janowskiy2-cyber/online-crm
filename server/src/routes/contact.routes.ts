import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createContactRouter(prisma: PrismaClient) {
  const router = Router();

  // Get contacts
  router.get('/', async (req, res) => {
    try {
      const { search } = req.query;
      let where: any = { isDeleted: false };
      if (search) {
        where.AND = [
          { isDeleted: false },
          {
            OR: [
              { name: { contains: String(search), mode: 'insensitive' } },
              { phone: { contains: String(search), mode: 'insensitive' } },
              { email: { contains: String(search), mode: 'insensitive' } },
              { telegram: { contains: String(search), mode: 'insensitive' } }
            ]
          }
        ];
      }

      const contacts = await prisma.contact.findMany({
        where,
        include: {
          company: true,
          deals: {
            select: { id: true, title: true, budget: true, stage: true }
          },
          _count: { select: { messages: true } }
        },
        orderBy: { updatedAt: 'desc' }
      });
      res.json(contacts);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch contacts' });
    }
  });

  // Create contact
  router.post('/', async (req, res) => {
    try {
      const { name, phone, phone2, email, whatsapp, telegram, position, companyId } = req.body;
      const contact = await prisma.contact.create({
        data: {
          name,
          phone,
          phone2,
          email,
          whatsapp: whatsapp || phone,
          telegram,
          position,
          companyId: companyId || null
        },
        include: { company: true }
      });
      res.status(201).json(contact);
    } catch (e) {
      res.status(500).json({ error: 'Failed to create contact' });
    }
  });

  // Get companies
  router.get('/companies/all', async (req, res) => {
    try {
      const companies = await prisma.company.findMany({
        include: {
          contacts: true,
          deals: true
        },
        orderBy: { name: 'asc' }
      });
      res.json(companies);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch companies' });
    }
  });

  // Get archived contacts
  router.get('/archived/list', async (req, res) => {
    try {
      const contacts = await prisma.contact.findMany({
        where: { isDeleted: true },
        include: { company: true },
        orderBy: { deletedAt: 'desc' }
      });
      res.json(contacts);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch archived contacts' });
    }
  });

  // Update contact
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone, phone2, email, whatsapp, telegram, position, companyId } = req.body;
      const updated = await prisma.contact.update({
        where: { id },
        data: {
          name: name !== undefined ? name : undefined,
          phone: phone !== undefined ? phone : undefined,
          phone2: phone2 !== undefined ? phone2 : undefined,
          email: email !== undefined ? email : undefined,
          whatsapp: whatsapp !== undefined ? whatsapp : undefined,
          telegram: telegram !== undefined ? telegram : undefined,
          position: position !== undefined ? position : undefined,
          companyId: companyId !== undefined ? companyId : undefined
        },
        include: { company: true }
      });
      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: 'Failed to update contact' });
    }
  });

  // Soft delete contact
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const archived = await prisma.contact.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date()
        }
      });
      res.json({ success: true, message: 'Контакт переміщено в архів', contact: archived });
    } catch (e) {
      res.status(500).json({ error: 'Failed to archive contact' });
    }
  });

  // Restore contact from archive
  router.post('/:id/restore', async (req, res) => {
    try {
      const { id } = req.params;
      const restored = await prisma.contact.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null
        }
      });
      res.json({ success: true, message: 'Контакт успішно відновлено', contact: restored });
    } catch (e) {
      res.status(500).json({ error: 'Failed to restore contact' });
    }
  });

  return router;
}
