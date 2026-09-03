import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { WhatsAppService } from '../services/whatsapp.service';
import { TelegramService } from '../services/telegram.service';

export function createChatRouter(
  prisma: PrismaClient,
  whatsappService: WhatsAppService,
  telegramService: TelegramService
) {
  const router = Router();

  // 1. Get status of both messengers
  router.get('/status', async (req, res) => {
    try {
      const waStatus = await whatsappService.getStatus();
      const tgStatus = await telegramService.getStatus();
      res.json({
        whatsapp: waStatus,
        telegram: tgStatus
      });
    } catch (e) {
      res.status(500).json({ error: 'Failed to get chat status' });
    }
  });

  // 1.1 Real-Time Corporate Line Status (Busy vs Free)
  router.get('/line-status', (req, res) => {
    try {
      res.json({
        whatsapp: whatsappService.getLineStatus(),
        telegram: { isBusy: false, channel: 'telegram' }
      });
    } catch (e) {
      res.status(500).json({ error: 'Failed to get line status' });
    }
  });

  // 1.2 Claim line for an active call
  router.post('/line/start-call', (req, res) => {
    try {
      const { channel, managerName, callerPhone } = req.body;
      if (channel === 'whatsapp' || !channel) {
        whatsappService.setLineStatus(true, managerName, callerPhone);
      }
      res.json({ success: true, status: whatsappService.getLineStatus() });
    } catch (e) {
      res.status(500).json({ error: 'Failed to start call status' });
    }
  });

  // 1.3 Release line after call ends
  router.post('/line/end-call', (req, res) => {
    try {
      const { channel } = req.body;
      if (channel === 'whatsapp' || !channel) {
        whatsappService.setLineStatus(false);
      }
      res.json({ success: true, status: whatsappService.getLineStatus() });
    } catch (e) {
      res.status(500).json({ error: 'Failed to end call status' });
    }
  });

  // 2. Get chat messages for Unified Inbox with strict RBAC isolation
  router.get('/messages', async (req, res) => {
    try {
      const { channel, dealId, contactId } = req.query;
      const currentUserId = (req as any).userId || (req.headers['x-user-id'] as string);
      const where: any = {};
      if (channel) where.channel = String(channel);
      if (dealId) where.dealId = String(dealId);
      if (contactId) where.contactId = String(contactId);

      // Strict RBAC: Non-admin users see ONLY messages from their assigned deals
      if (currentUserId) {
        const user = await prisma.user.findUnique({ where: { id: currentUserId } });
        if (user && !user.canViewAllDeals) {
          if (user.canViewDeptDeals) {
            const deptUsers = await prisma.user.findMany({
              where: { department: user.department },
              select: { id: true }
            });
            const deptUserIds = deptUsers.map(u => u.id);
            where.OR = [
              { deal: { responsibleId: { in: deptUserIds } } },
              { dealId: null }
            ];
          } else {
            where.OR = [
              { deal: { responsibleId: user.id } },
              { dealId: null }
            ];
          }
        }
      }

      const messages = await prisma.chatMessage.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        take: 500,
        include: {
          deal: {
            select: {
              id: true,
              title: true,
              responsibleId: true,
              responsible: { select: { id: true, name: true } }
            }
          },
          contact: {
            select: {
              id: true,
              name: true,
              phone: true
            }
          }
        }
      });
      res.json(messages);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  // 3. WhatsApp: Get real dynamic Meta QR Code
  router.get('/whatsapp/qr', async (req, res) => {
    try {
      const qrCodeData = await whatsappService.generateQR();
      res.json({ qrCodeData });
    } catch (e) {
      res.status(500).json({ error: 'Failed to generate WhatsApp QR' });
    }
  });

  // 4. WhatsApp: Disconnect
  router.post('/whatsapp/disconnect', async (req, res) => {
    try {
      await whatsappService.disconnect();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to disconnect WhatsApp' });
    }
  });

  // 5. Telegram: Send official MTProto code to phone
  router.post('/telegram/send-code', async (req, res) => {
    try {
      const { phone, apiId, apiHash } = req.body;
      if (!phone) return res.status(400).json({ error: 'Введіть номер телефону' });
      const result = await telegramService.sendCodeToPhone(phone, apiId ? Number(apiId) : undefined, apiHash);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message || 'Помилка надсилання коду Telegram' });
    }
  });

  // 6. Telegram: Verify 5-digit code
  router.post('/telegram/verify-code', async (req, res) => {
    try {
      const { code, password } = req.body;
      if (!code) return res.status(400).json({ error: 'Введіть 5-значний код' });
      const result = await telegramService.signInWithCode(code, password);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message || 'Помилка перевірки коду' });
    }
  });

  // 7. Telegram: Disconnect
  router.post('/telegram/disconnect', async (req, res) => {
    try {
      await telegramService.disconnect();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to disconnect Telegram' });
    }
  });

  // 8. Send text message from CRM
  router.post('/send', async (req, res) => {
    try {
      const { channel, to, text, dealId, contactId } = req.body;
      if (!text) return res.status(400).json({ error: 'Повідомлення не може бути порожнім' });

      if (channel === 'whatsapp') {
        if (!whatsappService.isConnected()) {
          return res.status(503).json({ error: 'WhatsApp не підключений до CRM. Відскануйте QR-код у розділі "Шлюз"' });
        }
        const msg = await whatsappService.sendMessage(to, text, dealId, contactId);
        return res.json(msg);
      } else {
        if (!telegramService.isConnected()) {
          return res.status(503).json({ error: 'Telegram не підключений до CRM. Авторизуйтесь за кодом у розділі "Шлюз"' });
        }
        const msg = await telegramService.sendMessage(to, text, dealId, contactId);
        return res.json(msg);
      }
    } catch (e) {
      res.status(500).json({ error: 'Помилка надсилання повідомлення' });
    }
  });

  // 9. Send file (PDF / Image / Document) from CRM
  router.post('/send-file', async (req, res) => {
    try {
      const { channel, to, fileBase64, fileName, mimeType, caption, dealId, contactId } = req.body;
      if (!fileBase64 || !fileName) {
        return res.status(400).json({ error: 'Файл та назва обов\'язкові' });
      }

      if (channel === 'whatsapp') {
        if (!whatsappService.isConnected()) {
          return res.status(503).json({ error: 'WhatsApp не підключений до CRM. Відскануйте QR-код у розділі "Шлюз"' });
        }
        const msg = await whatsappService.sendFile(to, fileBase64, fileName, mimeType, caption, dealId, contactId);
        return res.json(msg);
      } else {
        if (!telegramService.isConnected()) {
          return res.status(503).json({ error: 'Telegram не підключений до CRM. Авторизуйтесь за кодом у розділі "Шлюз"' });
        }
        const msg = await telegramService.sendFile(to, fileBase64, fileName, mimeType, caption, dealId, contactId);
        return res.json(msg);
      }
    } catch (e) {
      res.status(500).json({ error: 'Помилка надсилання файлу' });
    }
  });

  // 10. Live Simulator: Guaranteed creation of new lead with unique phone
  router.post('/simulate-incoming', async (req, res) => {
    try {
      const { channel } = req.body;
      const ch = channel || 'whatsapp';
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const uniquePhone = `+38067${Math.floor(1000000 + Math.random() * 9000000)}`;
      const name = ch === 'whatsapp' ? `ТОВ "Пром-Завод #${randomSuffix}"` : `Директор Олексій #${randomSuffix}`;
      const msgText = `Доброго дня! Терміново потрібно 15 фасувальників та операторів лінії на виробництво.`;

      let savedMsg;
      if (ch === 'whatsapp') {
        savedMsg = await whatsappService.processIncomingOrOutgoingMessage(uniquePhone.replace(/\D/g, ''), name, msgText, false);
      } else {
        savedMsg = await telegramService.handleIncomingMessage(`@director_${randomSuffix}`, name, msgText);
      }

      res.json({
        success: true,
        message: 'Новий лід успішно створено та розподілено в CRM!',
        data: savedMsg
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Помилка симуляції' });
    }
  });

  return router;
}
