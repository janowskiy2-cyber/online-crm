import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { WhatsAppService } from './services/whatsapp.service';
import { TelegramService } from './services/telegram.service';
import { AutomationService } from './services/automation.service';
import { createAuthRouter } from './routes/auth.routes';
import { createDealRouter } from './routes/deal.routes';
import { createPipelineRouter } from './routes/pipeline.routes';
import { createContactRouter } from './routes/contact.routes';
import { createTaskRouter } from './routes/task.routes';
import { createChatRouter } from './routes/chat.routes';
import { createUserRouter } from './routes/user.routes';
import { createAnalyticsRouter } from './routes/analytics.routes';
import { createAutomationRouter } from './routes/automation.routes';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const prisma = new PrismaClient();
const waService = new WhatsAppService(prisma);
const tgService = new TelegramService(prisma);
const automationService = new AutomationService(prisma, waService, tgService);

waService.setSocketIO(io);
tgService.setSocketIO(io);
automationService.setSocketIO(io);

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', createAuthRouter(prisma));
app.use('/api/deals', createDealRouter(prisma, automationService, () => io));
app.use('/api/pipelines', createPipelineRouter(prisma));
app.use('/api/contacts', createContactRouter(prisma));
app.use('/api/tasks', createTaskRouter(prisma, () => io));
app.use('/api/chat', createChatRouter(prisma, waService, tgService));
app.use('/api/users', createUserRouter(prisma));
app.use('/api/analytics', createAnalyticsRouter(prisma));
app.use('/api/automation', createAutomationRouter(prisma));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve frontend client build directly if available
const clientDistPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    }
  });
}

// Socket.io Realtime connections
io.on('connection', (socket) => {
  console.log('Client connected to real-time CRM updates:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await prisma.$connect();
    console.log('Connected to Database successfully.');

    await waService.initialize();
    await tgService.initialize();

    server.listen(PORT, () => {
      console.log(`🚀 Online CRM API Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start CRM server:', err);
  }
}

start();
