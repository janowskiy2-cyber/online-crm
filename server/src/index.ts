import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { authRequired } from './middleware/auth.middleware';
import { LeadDistributionService } from './services/lead-distribution.service';
import { WhatsAppService } from './services/whatsapp.service';
import { TelegramService } from './services/telegram.service';
import { AutomationService } from './services/automation.service';
import { createAuthRouter } from './routes/auth.routes';
import { createDealsRouter } from './routes/deals.routes';
import { createPipelineRouter } from './routes/pipeline.routes';
import { createContactRouter } from './routes/contact.routes';
import { createTaskRouter } from './routes/task.routes';
import { createChatRouter } from './routes/chat.routes';
import { createUsersRouter } from './routes/users.routes';
import { createAnalyticsRouter } from './routes/analytics.routes';
import { createAutomationRouter } from './routes/automation.routes';
import { createWebhookRouter } from './routes/webhook.routes';
import { createAiRouter } from './routes/ai.routes';

const app = express();
const server = http.createServer(app);

const ALLOWED_ORIGINS = [
  'https://online-crm-alpha.vercel.app',
  'https://online-crm-frontend.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000'
];

const io = new SocketIOServer(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST']
  }
});

const prisma = new PrismaClient();
const leadDistributionService = new LeadDistributionService(prisma);
const waService = new WhatsAppService(prisma, leadDistributionService);
const tgService = new TelegramService(prisma, leadDistributionService);
const automationService = new AutomationService(prisma, waService, tgService);

leadDistributionService.setSocketIO(io);
waService.setSocketIO(io);
tgService.setSocketIO(io);
automationService.setSocketIO(io);

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Uploads directory for media files (voice, images, PDF)
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/api/uploads', express.static(uploadsDir));

// ── Public routes (no auth required) ──
app.use('/api/auth', createAuthRouter(prisma));
app.use('/api/webhooks', createWebhookRouter(prisma, leadDistributionService, io));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── Protected routes (require JWT Bearer token) ──
app.use('/api/deals', authRequired, createDealsRouter(prisma, io));
app.use('/api/pipelines', authRequired, createPipelineRouter(prisma));
app.use('/api/contacts', authRequired, createContactRouter(prisma));
app.use('/api/tasks', authRequired, createTaskRouter(prisma, () => io));
app.use('/api/chat', authRequired, createChatRouter(prisma, waService, tgService));
app.use('/api/users', authRequired, createUsersRouter(prisma));
app.use('/api/analytics', authRequired, createAnalyticsRouter(prisma));
app.use('/api/automation', authRequired, createAutomationRouter(prisma));
app.use('/api/ai', authRequired, createAiRouter(prisma));

// Serve frontend client build directly if available
const clientDistPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 4000;

server.listen(PORT, async () => {
  console.log(`🚀 Production CRM Server running on port ${PORT}`);
  await waService.initialize();
  await tgService.initialize();
});
