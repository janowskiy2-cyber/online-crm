import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { CloudinaryService } from '../services/cloudinary.service';
import { SemanticSearchService } from '../services/semantic-search.service';

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
        prisma.contact.count({ where: { type: 'candidate', isDeleted: false } }),
        prisma.contact.count({
          where: {
            type: 'candidate',
            companyId: { not: null },
            isDeleted: false
          }
        }),
        prisma.contact.count({
          where: {
            type: 'candidate',
            companyId: null,
            isDeleted: false
          }
        }),
        prisma.contact.count({ where: { type: 'b2b_contact', isDeleted: false } })
      ]);

      res.json({
        totalCompanies: totalCompanies || 0,
        totalCandidates: totalCandidates || 0,
        assignedCandidates: assignedCandidates || 0,
        freeReserveCandidates: freeReserveCandidates || 0,
        totalRepresentatives: totalRepresentatives || 0
      });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch stats overview' });
    }
  });

  // Get contacts (supports ?type=candidate or ?type=b2b_contact) with Synaptic Semantic Search
  router.get('/', async (req, res) => {
    try {
      const { search, type } = req.query;
      let where: any = { isDeleted: false };
      if (type) {
        where.type = String(type);
      }
      if (search) {
        const terms = await SemanticSearchService.expandQuery(String(search));
        const searchConditions = terms.flatMap(term => [
          { name: { contains: term, mode: 'insensitive' } },
          { phone: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
          { telegram: { contains: term, mode: 'insensitive' } },
          { country: { contains: term, mode: 'insensitive' } },
          { profession: { contains: term, mode: 'insensitive' } },
          { position: { contains: term, mode: 'insensitive' } },
          { company: { name: { contains: term, mode: 'insensitive' } } }
        ]);
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

  // Get companies with Synaptic Semantic Search
  router.get('/companies/all', async (req, res) => {
    try {
      const { search } = req.query;
      const where: any = { isDeleted: false };

      if (search) {
        const terms = await SemanticSearchService.expandQuery(String(search));
        where.OR = terms.flatMap(term => [
          { name: { contains: term, mode: 'insensitive' } },
          { phone: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
          { address: { contains: term, mode: 'insensitive' } },
          { contacts: { some: { name: { contains: term, mode: 'insensitive' } } } }
        ]);
      }

      const companies = await prisma.company.findMany({
        where,
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

  // Batch assign company/employer to contacts
  router.post('/batch-assign', async (req, res) => {
    try {
      const { contactIds, companyId } = req.body;
      if (!Array.isArray(contactIds) || contactIds.length === 0) {
        return res.status(400).json({ error: 'contactIds array is required' });
      }
      const result = await prisma.contact.updateMany({
        where: { id: { in: contactIds } },
        data: { companyId: companyId || null }
      });
      res.json({ success: true, count: result.count });
    } catch (e) {
      res.status(500).json({ error: 'Failed to batch assign company' });
    }
  });

  // Batch update contact status
  router.post('/batch-status', async (req, res) => {
    try {
      const { contactIds, status } = req.body;
      if (!Array.isArray(contactIds) || contactIds.length === 0 || !status) {
        return res.status(400).json({ error: 'contactIds and status are required' });
      }
      const result = await prisma.contact.updateMany({
        where: { id: { in: contactIds } },
        data: { status }
      });
      res.json({ success: true, count: result.count });
    } catch (e) {
      res.status(500).json({ error: 'Failed to batch update status' });
    }
  });

  // Batch delete / archive contacts
  router.post('/batch-delete', async (req, res) => {
    try {
      const { contactIds } = req.body;
      if (!Array.isArray(contactIds) || contactIds.length === 0) {
        return res.status(400).json({ error: 'contactIds array is required' });
      }
      const result = await prisma.contact.updateMany({
        where: { id: { in: contactIds } },
        data: { isDeleted: true, deletedAt: new Date() }
      });
      res.json({ success: true, count: result.count });
    } catch (e) {
      res.status(500).json({ error: 'Failed to batch delete contacts' });
    }
  });

  // Upload Candidate File / Document / Video with Cloudinary compression & DB persistence
  router.post('/:id/files', async (req, res) => {
    try {
      const { id } = req.params;
      const { fileName, fileBase64, mimeType, category } = req.body;

      if (!fileBase64 || !fileName) {
        return res.status(400).json({ error: 'fileBase64 and fileName are required' });
      }

      const contact = await prisma.contact.findUnique({ where: { id } });
      if (!contact) {
        return res.status(404).json({ error: 'Кандидата не знайдено' });
      }

      // Convert base64 to buffer
      const base64Data = fileBase64.replace(/^data:.*?;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Upload through CloudinaryService with auto compression & 720p HD downscaling
      const url = await CloudinaryService.uploadBuffer(buffer, fileName, mimeType || 'application/octet-stream');

      let currentDocs: any[] = [];
      try {
        if (contact.documents) {
          currentDocs = JSON.parse(contact.documents);
        }
      } catch (e) {
        currentDocs = [];
      }

      const newDoc = {
        id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: fileName,
        url,
        type: mimeType || 'application/octet-stream',
        category: category || (mimeType?.startsWith('video/') ? 'video' : 'document'),
        size: buffer.length,
        uploadedAt: new Date().toISOString()
      };

      currentDocs.push(newDoc);

      const updateData: any = {
        documents: JSON.stringify(currentDocs)
      };

      if (category === 'video' || (mimeType && mimeType.startsWith('video/'))) {
        updateData.videoUrl = url;
      }
      if (category === 'resume' || fileName.toLowerCase().includes('резюме') || fileName.toLowerCase().includes('cv')) {
        updateData.resumeUrl = url;
      }

      const updated = await prisma.contact.update({
        where: { id },
        data: updateData,
        include: { company: true }
      });

      res.status(201).json({ success: true, contact: updated, file: newDoc });
    } catch (e: any) {
      console.error('Contact file upload error:', e);
      res.status(500).json({ error: e.message || 'Помилка завантаження файлу кандидата' });
    }
  });

  // Delete Candidate File / Document
  router.delete('/:id/files/:fileId', async (req, res) => {
    try {
      const { id, fileId } = req.params;
      const contact = await prisma.contact.findUnique({ where: { id } });
      if (!contact) {
        return res.status(404).json({ error: 'Кандидата не знайдено' });
      }

      let currentDocs: any[] = [];
      try {
        if (contact.documents) {
          currentDocs = JSON.parse(contact.documents);
        }
      } catch (e) {
        currentDocs = [];
      }

      const targetDoc = currentDocs.find((d: any) => d.id === fileId);
      if (targetDoc && targetDoc.url) {
        CloudinaryService.deleteAsset(targetDoc.url).catch(() => {});
      }

      const filteredDocs = currentDocs.filter((d: any) => d.id !== fileId);

      const updateData: any = {
        documents: JSON.stringify(filteredDocs)
      };

      if (targetDoc && contact.videoUrl === targetDoc.url) {
        updateData.videoUrl = null;
      }
      if (targetDoc && contact.resumeUrl === targetDoc.url) {
        updateData.resumeUrl = null;
      }

      const updated = await prisma.contact.update({
        where: { id },
        data: updateData,
        include: { company: true }
      });

      res.json({ success: true, contact: updated });
    } catch (e: any) {
      console.error('Contact file delete error:', e);
      res.status(500).json({ error: e.message || 'Помилка видалення файлу' });
    }
  });

  // Set / Update Candidate Video URL directly
  router.put('/:id/video', async (req, res) => {
    try {
      const { id } = req.params;
      const { videoUrl } = req.body;

      const updated = await prisma.contact.update({
        where: { id },
        data: { videoUrl },
        include: { company: true }
      });

      res.json({ success: true, contact: updated });
    } catch (e: any) {
      res.status(500).json({ error: 'Помилка оновлення відеовізитівки' });
    }
  });

  return router;
}
