import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { GeminiService } from '../services/gemini.service';
import { ModelRouterService } from '../services/model-router.service';
import { EmbeddingService } from '../services/embedding.service';
import { CloudinaryService } from '../services/cloudinary.service';

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
