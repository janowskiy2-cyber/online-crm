import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import https from 'https';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { authRequired } from './middleware/auth.middleware';
import { authLimiter, apiLimiter, webhookLimiter } from './middleware/rate-limit.middleware';
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
import { createUploadRouter } from './routes/upload.routes';
import { createTelephonyRouter } from './routes/telephony.routes';
import { createFeedRouter } from './routes/feed.routes';
import { createExportRouter } from './routes/export.routes';
import { createImportRouter } from './routes/import.routes';
import { ArchiveRetentionService } from './services/archiveRetention';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ── Startup configuration sanity check (warn only, never blocks startup) ──
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'ADMIN_MASTER_KEY'];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.warn(`⚠️ [Config] Не задано змінні оточення: ${missingEnv.join(', ')}. Перевірте налаштування хостингу.`);
}

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// ── CORS whitelist shared by HTTP and Socket.IO ──
// Production frontend + Vercel previews + local development. Extra origin via ALLOWED_ORIGIN.
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://online-crm-alpha.vercel.app';
const allowedOrigins = new Set<string>([
  FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
]);
if (process.env.ALLOWED_ORIGIN) {
  process.env.ALLOWED_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean).forEach((o) => allowedOrigins.add(o));
}

function isOriginAllowed(origin?: string): boolean {
  // Non-browser requests (server-to-server, health checks, keep-alive pings) carry no Origin
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  try {
    const { hostname, protocol } = new URL(origin);
    return protocol === 'https:' && hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

const corsOriginHandler = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => {
  if (isOriginAllowed(origin)) {
    callback(null, true);
  } else {
    callback(new Error('CORS policy: Access denied from this origin.'));
  }
};

const io = new SocketIOServer(server, {
  cors: {
    origin: corsOriginHandler,
    methods: ['GET', 'POST'],
    credentials: true
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

app.use(cors({ origin: corsOriginHandler, credentials: true }));

// Safe memory limits: 50mb max JSON payload supports video & media uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Uploads directory for media files (voice, images, PDF)
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/api/uploads', express.static(uploadsDir));

// ── Rate Limiting ──
app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/users/verify-admin-pin', authLimiter);

// ── Public routes (no auth required) ──
app.use('/api/auth', createAuthRouter(prisma));
app.use('/api/webhooks', webhookLimiter, createWebhookRouter(prisma, leadDistributionService, io));
app.use('/api/telephony', createTelephonyRouter(prisma, () => io));

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
app.use('/api/upload', authRequired, createUploadRouter());
app.use('/api/feed', authRequired, createFeedRouter(prisma));
app.use('/api/export', authRequired, createExportRouter(prisma));
app.use('/api/import', authRequired, createImportRouter(prisma));

// Unknown API route → JSON 404 (instead of falling through to the SPA index.html)
app.use('/api', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Маршрут не знайдено' });
});

// ── Real-time Dialog Collision Detection & Viewer Presence ──
const dialogViewers = new Map<string, Map<string, string>>(); // dialogKey -> (socketId -> userName)

io.on('connection', (socket) => {
  socket.on('dialog_join', ({ dialogKey, userName }: { dialogKey: string; userName?: string }) => {
    if (!dialogKey) return;
    const room = `dialog_${dialogKey}`;
    socket.join(room);
    if (!dialogViewers.has(dialogKey)) {
      dialogViewers.set(dialogKey, new Map());
    }
    dialogViewers.get(dialogKey)!.set(socket.id, userName || 'Колега');

    const viewers = Array.from(dialogViewers.get(dialogKey)!.values());
    io.to(room).emit('dialog_viewers', { dialogKey, viewers });
  });

  socket.on('dialog_leave', ({ dialogKey }: { dialogKey: string }) => {
    if (!dialogKey) return;
    const room = `dialog_${dialogKey}`;
    socket.leave(room);
    if (dialogViewers.has(dialogKey)) {
      dialogViewers.get(dialogKey)!.delete(socket.id);
      const viewers = Array.from(dialogViewers.get(dialogKey)!.values());
      io.to(room).emit('dialog_viewers', { dialogKey, viewers });
    }
  });

  socket.on('disconnect', () => {
    dialogViewers.forEach((viewersMap, dialogKey) => {
      if (viewersMap.has(socket.id)) {
        viewersMap.delete(socket.id);
        const room = `dialog_${dialogKey}`;
        const viewers = Array.from(viewersMap.values());
        io.to(room).emit('dialog_viewers', { dialogKey, viewers });
      }
    });
  });
});

// Serve frontend client build directly if available
const clientDistPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// ── Global error handler (must be the last middleware) ──
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) return;

  const message = typeof err?.message === 'string' ? err.message : '';

  if (message.startsWith('CORS policy')) {
    return res.status(403).json({ error: message });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Файл або запит занадто великий (максимум 50MB)' });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Некоректний формат JSON у запиті' });
  }

  console.error('❌ [Server] Unhandled error:', err);
  const status = Number.isInteger(err?.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  res.status(status).json({
    error: IS_PRODUCTION ? 'Внутрішня помилка сервера' : (message || 'Internal server error')
  });
});

const PORT = process.env.PORT || 4000;

// ── Optional self-pinger for free-tier hosting ──
// Disabled by default: an external uptime monitor is used to keep the instance awake.
// Enable with ENABLE_SELF_PING=true if needed.
if (process.env.ENABLE_SELF_PING === 'true') {
  const PING_INTERVAL_MS = 10 * 60 * 1000;
  const APP_URL = process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL || 'https://online-crm.onrender.com';
  setInterval(() => {
    try {
      const healthUrl = `${APP_URL}/api/health`;
      const client = healthUrl.startsWith('https') ? https : http;
      client.get(healthUrl, (res) => { res.resume(); }).on('error', () => {});
    } catch (e) {}
  }, PING_INTERVAL_MS).unref();
}

// ── Process-level safety nets: log, never silently die ──
process.on('unhandledRejection', (reason) => {
  console.error('❌ [Process] Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('❌ [Process] Uncaught exception:', err);
});

// ── Graceful shutdown: persist messenger session, close connections, release DB ──
let isShuttingDown = false;
async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`🛑 [Server] Отримано ${signal}. Коректне завершення роботи...`);

  const forceExit = setTimeout(() => {
    console.error('⏱️ [Server] Примусове завершення після таймауту.');
    process.exit(1);
  }, 15000);
  forceExit.unref();

  try {
    await waService.backupSessionToDatabase();
  } catch (e) {
    console.warn('⚠️ [Server] Не вдалося зберегти WhatsApp-сесію під час завершення:', e);
  }

  await new Promise<void>((resolve) => {
    io.close(() => resolve());
  });
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });

  try {
    await prisma.$disconnect();
  } catch (e) {}

  console.log('✅ [Server] Роботу завершено коректно.');
  process.exit(0);
}

process.on('SIGTERM', () => { shutdown('SIGTERM'); });
process.on('SIGINT', () => { shutdown('SIGINT'); });

server.listen(PORT, async () => {
  console.log(`🚀 Production CRM Server running on port ${PORT}`);
  ArchiveRetentionService.startSchedule(prisma);
  await waService.initialize();
  await tgService.initialize();
});
