import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { GeminiService } from '../services/gemini.service';
import { ModelRouterService } from '../services/model-router.service';
import { EmbeddingService } from '../services/embedding.service';
import { ResumeParserService } from '../services/resume-parser.service';
import { CloudinaryService } from '../services/cloudinary.service';
import { SemanticSearchService } from '../services/semantic-search.service';

export function createAiRouter(prisma: PrismaClient) {
  const router = Router();

  // Live Model Router Status & Daily Quotas
  router.get('/models-status', (req, res) => {
    try {
      const status = ModelRouterService.getModelsStatus();
      res.json(status);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // AI: Analyze employer brief
  router.post('/analyze-brief', async (req, res) => {
    try {
      const { briefText } = req.body;
      if (!briefText) return res.status(400).json({ error: 'briefText required' });
      const { text, modelUsed } = await GeminiService.analyzeEmployerBrief(briefText);
      res.json({ analysis: text, modelUsed });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // AI: Generate Candidate Pitch for factory director
  router.post('/pitch-candidate', async (req, res) => {
    try {
      const { companyName, vacancy, candidate } = req.body;
      const { text, modelUsed } = await GeminiService.generateCandidatePitch(companyName, vacancy, candidate);
      res.json({ pitch: text, modelUsed });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // AI: Handle recruitment objection
  router.post('/objection', async (req, res) => {
    try {
      const { objectionText } = req.body;
      const { text, modelUsed } = await GeminiService.answerObjection(objectionText);
      res.json({ answer: text, modelUsed });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // AI: Semantic Candidate Matchmaking (gemini-embedding-2, 1500 RPM)
  router.post('/match-candidates', async (req, res) => {
    try {
      const { jobRequirements, candidates } = req.body;
      if (!jobRequirements) return res.status(400).json({ error: 'jobRequirements required' });
      const matches = await EmbeddingService.matchCandidates(jobRequirements, candidates || []);
      res.json({ matches, modelUsed: 'gemini-embedding-2' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // AI: Smart Message Draft in Deal Chat
  router.post('/draft-reply', async (req, res) => {
    try {
      const { clientName, stageName, dealTitle, lastMessage, intent } = req.body;
      const { text, modelUsed } = await GeminiService.draftMessageReply({
        clientName,
        stageName,
        dealTitle,
        lastMessage,
        intent
      });
      res.json({ draft: text, modelUsed });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // AI: Deal Health & Win Probability Scoring
  router.post('/deal-score', async (req, res) => {
    try {
      const { title, budget, stageName, daysSinceCreation, hasTasks, hasNotes } = req.body;
      if (!title) return res.status(400).json({ error: 'title required' });
      const { text, modelUsed } = await GeminiService.scoreDeal({
        title,
        budget,
        stageName,
        daysSinceCreation,
        hasTasks,
        hasNotes
      });
      let parsed: any = {};
      try {
        parsed = JSON.parse(text.replace(/```json/gi, '').replace(/```/g, '').trim());
      } catch (err) {
        parsed = { score: 75, temperature: '⚡ Перспективна', reason: text, nextAction: 'Узгодити наступний крок з клієнтом' };
      }
      res.json({ ...parsed, modelUsed });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // AI: Omnisearch — Global Synaptic Search Across CRM (Deals, Candidates, Companies, Tasks)
  router.get('/omnisearch', async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      if (!q || q.length < 2) {
        return res.json({ query: q, terms: [], deals: [], candidates: [], employers: [], tasks: [] });
      }

      // Generate semantic synapses (synonyms & industry keywords)
      const terms = await SemanticSearchService.expandQuery(q);

      // Perform parallel subqueries with high limit
      const [deals, candidates, employers, tasks] = await Promise.all([
        // 1. Deals
        prisma.deal.findMany({
          where: {
            isDeleted: false,
            OR: terms.flatMap(t => [
              { title: { contains: t, mode: 'insensitive' } },
              { contact: { name: { contains: t, mode: 'insensitive' } } },
              { company: { name: { contains: t, mode: 'insensitive' } } },
              { stage: { name: { contains: t, mode: 'insensitive' } } }
            ])
          },
          include: { contact: true, company: true, stage: true },
          take: 5
        }),

        // 2. Candidates
        prisma.contact.findMany({
          where: {
            isDeleted: false,
            type: 'candidate',
            OR: terms.flatMap(t => [
              { name: { contains: t, mode: 'insensitive' } },
              { profession: { contains: t, mode: 'insensitive' } },
              { country: { contains: t, mode: 'insensitive' } },
              { phone: { contains: t, mode: 'insensitive' } }
            ])
          },
          take: 5
        }),

        // 3. Employers / Companies
        prisma.company.findMany({
          where: {
            isDeleted: false,
            OR: terms.flatMap(t => [
              { name: { contains: t, mode: 'insensitive' } },
              { phone: { contains: t, mode: 'insensitive' } },
              { address: { contains: t, mode: 'insensitive' } }
            ])
          },
          include: { _count: { select: { contacts: true, deals: true } } },
          take: 5
        }),

        // 4. Tasks
        prisma.task.findMany({
          where: {
            isDeleted: false,
            OR: terms.flatMap(t => [
              { text: { contains: t, mode: 'insensitive' } },
              { deal: { title: { contains: t, mode: 'insensitive' } } }
            ])
          },
          include: { responsible: true, deal: true },
          take: 5
        })
      ]);

      res.json({
        query: q,
        terms,
        deals,
        candidates,
        employers,
        tasks,
        totalFound: deals.length + candidates.length + employers.length + tasks.length
      });
    } catch (e: any) {
      console.error('Omnisearch error:', e);
      res.status(500).json({ error: 'Omnisearch failed', details: e.message });
    }
  });

  // AI: Resume Auto-Parser (Extracts Candidate Data from text or PDF)
  router.post('/parse-resume', async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: 'text required' });
      const candidate = await ResumeParserService.parseResumeText(text);
      res.json({ candidate });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // AI: Batch Multi-Resume Parser & Automatic Candidate Creator
  router.post('/batch-parse-resumes', async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'items array is required' });
      }

      const results = [];

      for (const item of items) {
        try {
          let resumeUrl = null;
          let docItem = null;

          // 1. Upload resume to Cloudinary storage if fileBase64 provided
          if (item.fileBase64 && item.fileName) {
            const base64Data = item.fileBase64.replace(/^data:.*?,/, '').replace(/^data:.*?;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            resumeUrl = await CloudinaryService.uploadBuffer(buffer, item.fileName, item.mimeType || 'application/pdf');

            docItem = {
              id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              name: item.fileName,
              url: resumeUrl,
              type: item.mimeType || 'application/pdf',
              category: 'resume',
              size: buffer.length,
              uploadedAt: new Date().toISOString()
            };
          }

          // 2. Parse candidate text with Gemini AI
          const textToParse = (item.textContent && item.textContent.trim().length > 10)
            ? item.textContent
            : (item.fileName ? `Резюме кандидата: ${item.fileName.replace(/\.[^/.]+$/, '').replace(/[_.-]/g, ' ')}` : 'Кандидат');

          const parsed = await ResumeParserService.parseResumeText(textToParse);

          // 3. Create candidate contact in database
          const candidate = await prisma.contact.create({
            data: {
              name: parsed.name || 'Новий Кандидат',
              type: 'candidate',
              phone: parsed.phone || null,
              whatsapp: parsed.phone || null,
              country: parsed.country || 'Узбекистан',
              profession: parsed.profession || 'Спеціаліст',
              position: parsed.profession || 'Спеціаліст',
              status: parsed.status || 'screening',
              companyId: item.companyId || null,
              resumeUrl: resumeUrl,
              documents: docItem ? JSON.stringify([docItem]) : null
            },
            include: { company: true }
          });

          results.push({
            success: true,
            candidate,
            fileName: item.fileName,
            resumeUrl
          });
        } catch (itemErr: any) {
          console.error('Batch resume item error:', itemErr);
          results.push({
            success: false,
            fileName: item.fileName || 'Невідомий файл',
            error: itemErr.message || 'Помилка обробки файлу'
          });
        }
      }

      res.json({
        total: items.length,
        successful: results.filter(r => r.success).length,
        results
      });
    } catch (e: any) {
      console.error('Batch resume parsing error:', e);
      res.status(500).json({ error: e.message || 'Batch parsing failed' });
    }
  });

  // Attach Document / Contract to Deal with Cloudinary CDN compression
  router.post('/deal-document/:dealId', async (req, res) => {
    try {
      const { dealId } = req.params;
      const { fileName, fileBase64, mimeType, category } = req.body;

      if (!fileBase64 || !fileName) {
        return res.status(400).json({ error: 'fileBase64 and fileName required' });
      }

      // Convert base64 to buffer
      const base64Data = fileBase64.replace(/^data:.*,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Upload with ultra-compression
      const url = await CloudinaryService.uploadBuffer(buffer, fileName, mimeType || 'application/pdf');

      const doc = {
        id: `doc_${Date.now()}`,
        name: fileName,
        url,
        category: category || 'Договір',
        mimeType: mimeType || 'application/pdf',
        sizeKb: Math.round(buffer.length / 1024),
        uploadedAt: new Date().toISOString()
      };

      // Read existing documents from deal customFields
      const deal = await prisma.deal.findUnique({ where: { id: dealId } });
      if (!deal) return res.status(404).json({ error: 'Deal not found' });

      let customFieldsObj: any = {};
      try {
        customFieldsObj = typeof deal.customFields === 'string' ? JSON.parse(deal.customFields) : (deal.customFields || {});
      } catch (e) {
        customFieldsObj = {};
      }

      const existingDocs = Array.isArray(customFieldsObj.documents) ? customFieldsObj.documents : [];
      const updatedDocs = [doc, ...existingDocs];
      customFieldsObj.documents = updatedDocs;

      await prisma.deal.update({
        where: { id: dealId },
        data: { customFields: JSON.stringify(customFieldsObj) }
      });

      // System note
      await prisma.dealNote.create({
        data: {
          dealId,
          userId: deal.responsibleId || 'usr-admin',
          content: `📎 Додано документ: [${doc.category}] "${doc.name}" (${doc.sizeKb} KB)`,
          type: 'system'
        }
      }).catch(() => {});

      res.status(201).json(doc);
    } catch (e: any) {
      console.error('Error attaching deal document:', e);
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}
