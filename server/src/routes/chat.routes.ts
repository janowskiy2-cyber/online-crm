import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { WhatsAppService } from '../services/whatsapp.service';
import { TelegramService } from '../services/telegram.service';

export function createChatRouter(
  prisma: PrismaClient,
  waService: WhatsAppService,
  tgService: TelegramService
) {
  const router = Router();

  // Get all chat sessions / messengers status
  router.get('/status', async (req, res) => {
    try {
      const waStatus = await waService.getStatus();
      const tgStatus = await tgService.getStatus();
      res.json({
        whatsapp: waStatus,
        telegram: tgStatus
      });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch messenger statuses' });
    }
  });

  // Re-generate / Initialize QR for WhatsApp
  router.post('/whatsapp/qr', async (req, res) => {
    try {
      await waService.generateDemoQR();
      const status = await waService.getStatus();
      res.json(status);
    } catch (e) {
      res.status(500).json({ error: 'Failed to generate WhatsApp QR' });
    }
  });

  // Re-generate / Initialize QR for Telegram
  router.post('/telegram/qr', async (req, res) => {
    try {
      await tgService.generateQR();
      const status = await tgService.getStatus();
      res.json(status);
    } catch (e) {
      res.status(500).json({ error: 'Failed to generate Telegram QR' });
    }
  });

  // Fast Simulate connect WhatsApp
  router.post('/whatsapp/connect-sim', async (req, res) => {
    try {
      const { phone, name } = req.body;
      await waService.simulateConnection(phone, name);
      res.json({ success: true, message: 'WhatsApp успешно авторизован по QR-коду' });
    } catch (e) {
      res.status(500).json({ error: 'Failed to connect WhatsApp' });
    }
  });

  // Fast Simulate connect Telegram
  router.post('/telegram/connect-sim', async (req, res) => {
    try {
      const { username, name } = req.body;
      await tgService.simulateConnection(username, name);
      res.json({ success: true, message: 'Telegram успешно подключен по QR-коду' });
    } catch (e) {
      res.status(500).json({ error: 'Failed to connect Telegram' });
    }
  });

  // Disconnect messenger
  router.post('/disconnect/:channel', async (req, res) => {
    try {
      const { channel } = req.params;
      if (channel === 'whatsapp') {
        await waService.disconnect();
      } else if (channel === 'telegram') {
        await tgService.disconnect();
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to disconnect' });
    }
  });

  // Get chat list (grouped by contact/deal)
  router.get('/conversations', async (req, res) => {
    try {
      const messages = await prisma.chatMessage.findMany({
        include: {
          contact: true,
          deal: {
            select: { id: true, title: true, budget: true, stage: true, responsible: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Group by contactId or dealId
      const grouped: { [key: string]: any } = {};

      for (const msg of messages) {
        const key = msg.contactId || msg.dealId || msg.senderPhone || msg.senderTgId || msg.id;
        if (!grouped[key]) {
          grouped[key] = {
            id: key,
            channel: msg.channel,
            contact: msg.contact,
            deal: msg.deal,
            senderName: msg.senderName || msg.contact?.name || 'Неизвестный клиент',
            senderPhone: msg.senderPhone || msg.contact?.phone,
            senderTgId: msg.senderTgId || msg.contact?.telegram,
            lastMessage: msg,
            unreadCount: msg.direction === 'incoming' && msg.status !== 'read' ? 1 : 0
          };
        }
      }

      res.json(Object.values(grouped));
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  });

  // Get messages for a deal or contact
  router.get('/messages', async (req, res) => {
    try {
      const { dealId, contactId } = req.query;
      let where: any = {};
      if (dealId) where.dealId = String(dealId);
      if (contactId) where.contactId = String(contactId);

      const messages = await prisma.chatMessage.findMany({
        where,
        orderBy: { createdAt: 'asc' }
      });
      res.json(messages);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  // Send message from manager to client
  router.post('/send', async (req, res) => {
    try {
      const currentUserId = req.headers['x-user-id'] as string;
      const { channel, to, text, dealId, contactId } = req.body;

      let msg;
      if (channel === 'whatsapp') {
        msg = await waService.sendMessage(to, text, dealId, contactId);
      } else if (channel === 'telegram') {
        msg = await tgService.sendMessage(to, text, dealId, contactId);
      } else {
        msg = await prisma.chatMessage.create({
          data: {
            channel: 'internal',
            direction: 'outgoing',
            dealId,
            contactId,
            text
          }
        });
      }

      if (dealId && currentUserId) {
        await prisma.dealNote.create({
          data: {
            dealId,
            userId: currentUserId,
            type: 'comment',
            content: `Отправлено сообщение в ${channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'}: "${text}"`
          }
        });
      }

      res.status(201).json(msg);
    } catch (e) {
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  // Simulate incoming test message from client (For testing omnichannel pipeline)
  router.post('/simulate-incoming', async (req, res) => {
    try {
      const { channel, senderName, senderContact, text } = req.body;
      if (channel === 'whatsapp') {
        // trigger simulated whatsapp message
        const phone = senderContact || '79998887766';
        let contact = await prisma.contact.findFirst({ where: { phone: { contains: phone } } });
        if (!contact) {
          contact = await prisma.contact.create({
            data: {
              name: senderName || 'Тестовый Клиент WhatsApp',
              phone: `+${phone}`,
              whatsapp: `+${phone}`
            }
          });
        }

        const defaultPipeline = await prisma.pipeline.findFirst({
          where: { isDefault: true },
          include: { stages: { orderBy: { sortOrder: 'asc' } } }
        });
        const defaultStage = defaultPipeline?.stages[0];
        const sdr = await prisma.user.findFirst({ where: { role: 'lead_gen_sdr' } }) || await prisma.user.findFirst();

        const deal = await prisma.deal.create({
          data: {
            title: `Заявка из WhatsApp: ${contact.name}`,
            budget: 50000,
            pipelineId: defaultPipeline!.id,
            stageId: defaultStage!.id,
            responsibleId: sdr!.id,
            contactId: contact.id,
            tags: JSON.stringify(['WhatsApp', 'Входящий'])
          }
        });

        const msg = await prisma.chatMessage.create({
          data: {
            channel: 'whatsapp',
            direction: 'incoming',
            dealId: deal.id,
            contactId: contact.id,
            senderName: contact.name,
            senderPhone: phone,
            text: text || 'Здравствуйте! Интересует стоимость ваших услуг.'
          }
        });

        res.json({ success: true, deal, message: msg });
      } else {
        // Telegram incoming
        const tgUser = senderContact || '@test_tg_client';
        const msg = await tgService.handleIncomingMessage(
          tgUser,
          senderName || 'Клиент Telegram',
          text || 'Привет! Расскажите подробнее о продукте'
        );
        res.json({ success: true, message: msg });
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to simulate incoming message' });
    }
  });

  return router;
}
