import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createContactRouter(prisma: PrismaClient) {
  const router = Router();

  // Get contacts
  router.get('/', async (req, res) => {
    try {
      const { search } = req.query;
      let where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: String(search) } },
          { phone: { contains: String(search) } },
          { email: { contains: String(search) } },
          { telegram: { contains: String(search) } }
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
      const { name, phone, email, whatsapp, telegram, position, companyId } = req.body;
      const contact = await prisma.contact.create({
        data: {
          name,
          phone,
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

  return router;
}
