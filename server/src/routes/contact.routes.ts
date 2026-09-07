import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { CloudinaryService } from '../services/cloudinary.service';
import { SemanticSearchService } from '../services/semantic-search.service';
import { ResumePdfService } from '../services/resume-pdf.service';

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
      const { search, type, companyId } = req.query;
      let where: any = { isDeleted: false };
      if (type) {
        where.type = String(type);
      }
      if (companyId) {
        where.companyId = String(companyId);
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
        videoUrl,
        experienceYears,
        salaryExpectation,
        skills,
        languages,
        driverLicense,
        bio,
        birthDate,
        citizenship,
        resumeUrl,
        documents
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
          videoUrl: videoUrl || null,
          experienceYears: experienceYears !== undefined ? (experienceYears ? Number(experienceYears) : null) : null,
          salaryExpectation: salaryExpectation || null,
          skills: skills ? (typeof skills === 'object' ? JSON.stringify(skills) : String(skills)) : null,
          languages: languages || null,
          driverLicense: driverLicense || null,
          bio: bio || null,
          birthDate: birthDate || null,
          citizenship: citizenship || country || null,
          resumeUrl: resumeUrl || null,
          documents: documents ? (typeof documents === 'object' ? JSON.stringify(documents) : String(documents)) : null
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

  // Get single company with contacts and deals
  router.get('/companies/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const company = await prisma.company.findUnique({
        where: { id },
        include: {
          contacts: { where: { isDeleted: false } },
          deals: {
            where: { isDeleted: false },
            include: { stage: true, pipeline: true, tasks: { where: { isDeleted: false } } }
          },
          _count: { select: { contacts: true, deals: true } }
        }
      });
      if (!company) {
        return res.status(404).json({ error: 'Підприємство не знайдено' });
      }
      res.json(company);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch company' });
    }
  });

  // Get company notes
  router.get('/companies/:id/notes', async (req, res) => {
    try {
      const { id } = req.params;
      const deals = await prisma.deal.findMany({
        where: { companyId: id, isDeleted: false },
        select: { id: true }
      });
      const dealIds = deals.map(d => d.id);
      const notes = await prisma.dealNote.findMany({
        where: { dealId: { in: dealIds } },
        include: { user: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' }
      });
      res.json(notes);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch company notes' });
    }
  });

  // Add company note
  router.post('/companies/:id/notes', async (req, res) => {
    try {
      const { id } = req.params;
      const { text, content } = req.body;
      const noteContent = (text || content || '').trim();
      if (!noteContent) {
        return res.status(400).json({ error: 'Текст замітки обовʼязковий' });
      }

      const currentUserId = (req as any).userId || (req.headers['x-user-id'] as string);
      let validUserId = currentUserId;
      if (validUserId) {
        const uExists = await prisma.user.findUnique({ where: { id: validUserId } });
        if (!uExists) validUserId = '';
      }
      if (!validUserId) {
        const firstUser = await prisma.user.findFirst();
        validUserId = firstUser ? firstUser.id : 'usr-admin';
      }

      let deal = await prisma.deal.findFirst({
        where: { companyId: id, isDeleted: false },
        orderBy: { createdAt: 'desc' }
      });

      if (!deal) {
        const pipeline = await prisma.pipeline.findFirst({
          include: { stages: { orderBy: { sortOrder: 'asc' } } }
        });
        if (pipeline && pipeline.stages.length > 0) {
          const company = await prisma.company.findUnique({ where: { id } });
          deal = await prisma.deal.create({
            data: {
              title: company?.name ? `Співпраця: ${company.name}` : 'Замовлення персоналу',
              pipelineId: pipeline.id,
              stageId: pipeline.stages[0].id,
              companyId: id,
              responsibleId: validUserId
            }
          });
        }
      }

      if (deal) {
        const note = await prisma.dealNote.create({
          data: {
            dealId: deal.id,
            userId: validUserId,
            content: noteContent
          },
          include: { user: { select: { id: true, name: true, avatar: true } } }
        });
        return res.status(201).json(note);
      }

      res.status(200).json({ success: true, text: noteContent });
    } catch (e) {
      res.status(500).json({ error: 'Failed to create company note' });
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

  // Get single contact by ID
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const contact = await prisma.contact.findUnique({
        where: { id },
        include: {
          company: true,
          deals: {
            where: { isDeleted: false },
            include: { stage: true, pipeline: true, tasks: { where: { isDeleted: false } } }
          }
        }
      });
      if (!contact) {
        return res.status(404).json({ error: 'Контакт не знайдено' });
      }
      res.json(contact);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch contact' });
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
        videoUrl,
        experienceYears,
        salaryExpectation,
        skills,
        languages,
        driverLicense,
        bio,
        birthDate,
        citizenship,
        resumeUrl,
        documents
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
          videoUrl: videoUrl !== undefined ? videoUrl : undefined,
          experienceYears: experienceYears !== undefined ? (experienceYears ? Number(experienceYears) : null) : undefined,
          salaryExpectation: salaryExpectation !== undefined ? salaryExpectation : undefined,
          skills: skills !== undefined ? (typeof skills === 'object' ? JSON.stringify(skills) : String(skills)) : undefined,
          languages: languages !== undefined ? languages : undefined,
          driverLicense: driverLicense !== undefined ? driverLicense : undefined,
          bio: bio !== undefined ? bio : undefined,
          birthDate: birthDate !== undefined ? birthDate : undefined,
          citizenship: citizenship !== undefined ? citizenship : undefined,
          resumeUrl: resumeUrl !== undefined ? resumeUrl : undefined,
          documents: documents !== undefined ? (typeof documents === 'object' ? JSON.stringify(documents) : String(documents)) : undefined
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

  // Dynamic A4 PDF Resume generation & preview
  router.get('/:id/resume.pdf', async (req, res) => {
    try {
      const { id } = req.params;
      const contact = await prisma.contact.findUnique({
        where: { id },
        include: { company: true }
      });

      if (!contact) {
        return res.status(404).json({ error: 'Кандидата не знайдено' });
      }

      let parsedSkills: string[] = [];
      if (contact.skills) {
        try {
          if (contact.skills.startsWith('[')) {
            parsedSkills = JSON.parse(contact.skills);
          } else {
            parsedSkills = contact.skills.split(',').map(s => s.trim()).filter(Boolean);
          }
        } catch (e) {
          parsedSkills = contact.skills.split(',').map(s => s.trim()).filter(Boolean);
        }
      }

      const pdfBuffer = await ResumePdfService.generateResumeBuffer({
        name: contact.name,
        profession: contact.profession || contact.position || 'Кандидат / Фахівець',
        country: contact.country || 'Україна',
        citizenship: contact.citizenship || contact.country || 'Україна',
        birthDate: contact.birthDate || undefined,
        phone: contact.phone || undefined,
        email: contact.email || undefined,
        whatsapp: contact.whatsapp || undefined,
        telegram: contact.telegram || undefined,
        experienceYears: contact.experienceYears || undefined,
        salaryExpectation: contact.salaryExpectation || undefined,
        languages: contact.languages || undefined,
        driverLicense: contact.driverLicense || undefined,
        bio: contact.bio || undefined,
        skills: parsedSkills.length > 0 ? parsedSkills : undefined
      });

      const safeName = contact.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="CV_${safeName}.pdf"`);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(pdfBuffer);
    } catch (e: any) {
      console.error('Failed to generate candidate resume PDF:', e);
      res.status(500).json({ error: 'Помилка генерації PDF резюме' });
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
