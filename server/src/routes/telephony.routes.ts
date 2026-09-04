import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';

export function createTelephonyRouter(prisma: PrismaClient, getIo: () => SocketIOServer | null) {
  const router = Router();

  /**
   * Universal Webhook for Cloud PBX (Binotel, Zadarma, Asterisk, RingCentral)
   * Receives call events: call_incoming, call_answered, call_ended, recording_ready
   */
  router.post('/webhook', async (req, res) => {
    try {
      const {
        event,
        callId,
        callerPhone,
        destinationPhone,
        duration,
        recordingUrl,
        managerEmail,
        timestamp
      } = req.body;

      if (!callerPhone) {
        return res.status(400).json({ error: 'callerPhone обов’язковий' });
      }

      const cleanCaller = String(callerPhone).replace(/\D/g, '');
      const io = getIo();

      // 1. Find existing contact
      let contact = await prisma.contact.findFirst({
        where: {
          OR: [
            { phone: { contains: cleanCaller.slice(-9) } },
            { phone2: { contains: cleanCaller.slice(-9) } },
            { whatsapp: { contains: cleanCaller.slice(-9) } }
          ]
        },
        include: {
          deals: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      // 2. If contact does not exist, auto-create contact & deal
      if (!contact) {
        const defaultPipeline = await prisma.pipeline.findFirst({
          where: { isDefault: true },
          include: { stages: { orderBy: { sortOrder: 'asc' }, take: 1 } }
        });

        const firstStageId = defaultPipeline?.stages?.[0]?.id || 'stage-default';
        const pipeId = defaultPipeline?.id || 'pipe-default';

        const adminUser = await prisma.user.findFirst({ where: { role: 'super_admin' } });
        const responsibleId = adminUser ? adminUser.id : 'usr-admin';

        contact = await prisma.contact.create({
          data: {
            name: `Вхідний дзвінок (+${cleanCaller})`,
            phone: `+${cleanCaller}`,
            whatsapp: `+${cleanCaller}`
          },
          include: { deals: true }
        });

        const newDeal = await prisma.deal.create({
          data: {
            title: `Дзвінок від +${cleanCaller}`,
            pipelineId: pipeId,
            stageId: firstStageId,
            responsibleId,
            contactId: contact.id,
            budget: 0,
            tags: JSON.stringify(['Вхідний дзвінок', 'АТС'])
          },
          include: {
            contact: true,
            stage: true,
            responsible: true
          }
        });

        if (io) {
          io.emit('deal_created', newDeal);
        }

        contact.deals = [newDeal];
      }

      const activeDeal = contact.deals?.[0];

      // 3. Handle Call Events
      if (event === 'call_incoming' || event === 'call_start') {
        if (io) {
          io.emit('incoming_call', {
            callId,
            phone: `+${cleanCaller}`,
            contactName: contact.name,
            dealId: activeDeal?.id,
            dealTitle: activeDeal?.title,
            timestamp: timestamp || new Date().toISOString()
          });
        }
      }

      if (event === 'recording_ready' || recordingUrl) {
        if (activeDeal) {
          const note = await prisma.dealNote.create({
            data: {
              dealId: activeDeal.id,
              userId: activeDeal.responsibleId,
              type: 'call_record',
              content: `📞 Запис розмови з клієнтом (+${cleanCaller}) • Тривалість: ${duration || 0} сек.`,
              metadata: JSON.stringify({
                callId,
                duration,
                recordingUrl,
                recordedAt: timestamp || new Date().toISOString()
              })
            },
            include: { user: true }
          });

          if (io) {
            io.emit('deal_note_added', note);
          }
        }
      }

      res.json({
        success: true,
        contactId: contact.id,
        dealId: activeDeal?.id,
        status: 'processed'
      });
    } catch (err: any) {
      console.error('Telephony webhook error:', err);
      res.status(500).json({ error: 'Помилка обробки події телефонії' });
    }
  });

  return router;
}
