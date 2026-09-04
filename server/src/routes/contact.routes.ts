import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function createContactRouter(prisma: PrismaClient) {
  const router = Router();

  // Get aggregated stats overview for employers and candidates
  router.get('/stats/overview', async (req, res) => {
    try {
      const [
        totalCompanies,
        totalCandidates,
        assignedCandidates,
        freeReserveCandidates,
        totalRepresentatives
      ] = await Promise.all([
        prisma.company.count({ where: { isDeleted: false } }),
        prisma.contact.count({ where: { isDeleted: false, type: 'candidate' } }),
        prisma.contact.count({ where: { isDeleted: false, type: 'candidate', companyId: { not: null } } }),
        prisma.contact.count({ where: { isDeleted: false, type: 'candidate', companyId: null } }),
        prisma.contact.count({ where: { isDeleted: false, type: 'b2b_contact' } })
      ]);

      res.json({
        totalCompanies,
        totalCandidates,
        assignedCandidates,
        freeReserveCandidates,
        totalRepresentatives
      });
    } catch (e) {
      res.status(500).json({ error: 'Failed to calculate stats' });
    }
  });

  // Get contacts (supports ?type=candidate or ?type=b2b_contact)
  router.get('/', async (req, res) => {
    try {
      const { search, type } = req.query;
      let where: any = { isDeleted: false };
      if (type) {
        where.type = String(type);
      }
      if (search) {
        const searchConditions = [
          { name: { contains: String(search), mode: 'insensitive' } },
          { phone: { contains: String(search), mode: 'insensitive' } },
          { email: { contains: String(search), mode: 'insensitive' } },
          { telegram: { contains: String(search), mode: 'insensitive' } },
          { country: { contains: String(search), mode: 'insensitive' } },
          { profession: { contains: String(search), mode: 'insensitive' } }
        ];
        if (where.type) {
          where.AND = [
            { isDeleted: false },
            { type: where.type },
            { OR: searchConditions }
          ];
          delete where.type;
        } else {
          where.AND = [
            { isDeleted: false },
            { OR: searchConditions }
          ];
        }
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

  // Create contact (candidate or B2B representative)
  router.post('/', async (req, res) => {
    try {
      const { 
        name, 
        phone, 
        phone2, 
        email, 
        whatsapp, 
        telegram, 
        position, 
        companyId,
        type,
        country,
        profession,
        status,
        videoUrl
      } = req.body;

      const inferredType = type || (country || profession || position?.toLowerCase().includes('оператор') ? 'candidate' : 'b2b_contact');

      const contact = await prisma.contact.create({
        data: {
          name,
          phone,
          phone2,
          email,
          whatsapp: whatsapp || phone,
          telegram,
          position: position || profession,
          companyId: companyId || null,
          type: inferredType,
          country: country || null,
          profession: profession || position || null,
          status: status || 'screening',
          videoUrl: videoUrl || null
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
        where: { isDeleted: false },
        include: {
          contacts: true,
          deals: true,
          _count: { select: { contacts: true, deals: true } }
        },
        orderBy: { name: 'asc' }
      });
      res.json(companies);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch companies' });
    }
  });

  // Create employer / company
  router.post('/companies', async (req, res) => {
    try {
      const { name, phone, email, website, address } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Company name is required' });
      }
      const company = await prisma.company.create({
        data: {
          name,
          phone,
          email,
          website,
          address
        }
      });
      res.status(201).json(company);
    } catch (e) {
      res.status(500).json({ error: 'Failed to create company' });
    }
  });

  // Update company
  router.put('/companies/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone, email, website, address } = req.body;
      const updated = await prisma.company.update({
        where: { id },
        data: {
          name: name !== undefined ? name : undefined,
          phone: phone !== undefined ? phone : undefined,
          email: email !== undefined ? email : undefined,
          website: website !== undefined ? website : undefined,
          address: address !== undefined ? address : undefined
        }
      });
      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: 'Failed to update company' });
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
      const { 
        name, 
        phone, 
        phone2, 
        email, 
        whatsapp, 
        telegram, 
        position, 
        companyId,
        type,
        country,
        profession,
        status,
        videoUrl
      } = req.body;
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
          companyId: companyId !== undefined ? companyId : undefined,
          type: type !== undefined ? type : undefined,
          country: country !== undefined ? country : undefined,
          profession: profession !== undefined ? profession : undefined,
          status: status !== undefined ? status : undefined,
          videoUrl: videoUrl !== undefined ? videoUrl : undefined
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
