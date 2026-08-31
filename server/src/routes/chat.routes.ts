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

  // 2. Get all chat messages for Unified Inbox
  router.get('/messages', async (req, res) => {
    try {
      const { channel, dealId, contactId } = req.query;
      const where: any = {};
      if (channel) where.channel = String(channel);
      if (dealId) where.dealId = String(dealId);
      if (contactId) where.contactId = String(contactId);

      const messages = await prisma.chatMessage.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        take: 300
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
        const msg = await whatsappService.sendMessage(to, text, dealId, contactId);
        return res.json(msg);
      } else {
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
        const msg = await whatsappService.sendFile(to, fileBase64, fileName, mimeType, caption, dealId, contactId);
        return res.json(msg);
      } else {
        const msg = await telegramService.sendFile(to, fileBase64, fileName, mimeType, caption, dealId, contactId);
        return res.json(msg);
      }
    } catch (e) {
      res.status(500).json({ error: 'Помилка надсилання файлу' });
    }
  });

  // 10. Live Simulator / Pipeline Diagnostic: Simulate inbound message
  router.post('/simulate-incoming', async (req, res) => {
    try {
      const { channel, senderName, phoneOrTg, text } = req.body;
      const ch = channel || 'whatsapp';
      const name = senderName || 'Тестовий Завод (Лід)';
      const phone = phoneOrTg || '+380734277174';
      const msgText = text || 'Доброго дня! Потрібно 15 пакувальників та операторів лінії на виробництво в Одесу.';

      let savedMsg;
      if (ch === 'whatsapp') {
        savedMsg = await whatsappService.processIncomingOrOutgoingMessage(phone.replace(/\D/g, ''), name, msgText, false);
      } else {
        savedMsg = await telegramService.handleIncomingMessage(phone, name, msgText);
      }

      res.json({
        success: true,
        message: 'Імітацію вхідного ліда успішно оброблено розподільником',
        data: savedMsg
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Помилка симуляції' });
    }
  });

  return router;
}
