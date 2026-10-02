import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authRequired } from '../middleware/auth.middleware';
import { WhatsAppService } from '../services/whatsapp.service';
import { TelegramService } from '../services/telegram.service';
import { Server as SocketIOServer } from 'socket.io';

export function createAgentRouter(
  prisma: PrismaClient,
  waService: WhatsAppService,
  tgService: TelegramService,
  getIo: () => SocketIOServer | null
) {
  const router = Router();

  // All agent endpoints require valid API key or admin JWT
  router.use(authRequired);

  /**
   * GET /api/agent/overview
   * Returns a complete 360-degree operational context snapshot for an AI agent:
   * Pipelines, active deals by stage, urgent/overdue tasks, recent messages, missed calls.
   */
  router.get('/overview', async (req: AuthRequest, res: Response) => {
    try {
      const [pipelines, recentMessages, overdueTasks, missedCalls, activeUsers] = await Promise.all([
        prisma.pipeline.findMany({
          orderBy: { sortOrder: 'asc' },
          include: {
            stages: {
              orderBy: { sortOrder: 'asc' },
              include: {
                deals: {
                  where: { isDeleted: false },
                  select: {
                    id: true,
                    title: true,
                    budget: true,
                    updatedAt: true,
                    contact: { select: { id: true, name: true, phone: true, telegram: true } },
                    responsible: { select: { id: true, name: true } }
                  }
                }
              }
            }
          }
        }),
        prisma.chatMessage.findMany({
          take: 30,
          orderBy: { createdAt: 'desc' },
          include: {
            contact: { select: { id: true, name: true, phone: true, telegram: true } },
            deal: { select: { id: true, title: true } }
          }
        }),
        prisma.task.findMany({
          where: {
            isCompleted: false,
            dueDate: { lt: new Date() }
          },
          take: 20,
          orderBy: { dueDate: 'asc' },
          include: {
            deal: { select: { id: true, title: true } },
            responsible: { select: { id: true, name: true } }
          }
        }),
        prisma.dealNote.findMany({
          where: {
            type: 'call_record',
            content: { contains: 'Пропущений' }
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            deal: { select: { id: true, title: true, contact: true } }
          }
        }),
        prisma.user.findMany({
          where: { isDeleted: false, isActive: true },
          select: { id: true, name: true, role: true, department: true, lastActiveAt: true }
        })
      ]);

      const pipelinesSummary = pipelines.map(p => ({
        id: p.id,
        name: p.name,
        isDefault: p.isDefault,
        stages: p.stages.map(s => ({
          id: s.id,
          name: s.name,
          color: s.color,
          dealsCount: s.deals.length,
          totalBudget: s.deals.reduce((sum, d) => sum + (d.budget || 0), 0),
          recentDeals: s.deals.slice(0, 5)
        }))
      }));

      return res.json({
        crmStatus: 'online',
        generatedAt: new Date().toISOString(),
        requestor: {
          id: req.userId,
          role: req.userRole,
          isAiAgent: req.isAiAgent
        },
        pipelines: pipelinesSummary,
        recentMessages: recentMessages.map(m => ({
          id: m.id,
          channel: m.channel,
          direction: m.direction,
          senderName: m.senderName,
          text: m.text,
          createdAt: m.createdAt,
          dealId: m.dealId,
          dealTitle: m.deal?.title,
          contactName: m.contact?.name,
          contactPhone: m.contact?.phone
        })),
        overdueTasksCount: overdueTasks.length,
        overdueTasks: overdueTasks.map(t => ({
          id: t.id,
          text: t.text,
          dueDate: t.dueDate,
          responsibleName: t.responsible?.name,
          dealTitle: t.deal?.title,
          dealId: t.dealId
        })),
        missedCallsCount: missedCalls.length,
        missedCalls: missedCalls.map(c => ({
          id: c.id,
          content: c.content,
          createdAt: c.createdAt,
          dealTitle: c.deal?.title
        })),
        activeStaffCount: activeUsers.length,
        staff: activeUsers
      });
    } catch (err: any) {
      console.error('Error fetching agent overview:', err);
      return res.status(500).json({ error: 'Помилка при формуванні зліпку CRM' });
    }
  });

  /**
   * GET /api/agent/chats/all
   * Omniscient communication inspector: view all customer dialogs across WhatsApp & Telegram
   */
  router.get('/chats/all', async (req: AuthRequest, res: Response) => {
    try {
      const { channel, limit = 50, contactId, dealId, search } = req.query;
      const where: any = {};

      if (channel && (channel === 'whatsapp' || channel === 'telegram')) {
        where.channel = channel;
      }
      if (contactId) {
        where.contactId = String(contactId);
      }
      if (dealId) {
        where.dealId = String(dealId);
      }
      if (search && typeof search === 'string') {
        where.text = { contains: search, mode: 'insensitive' };
      }

      const messages = await prisma.chatMessage.findMany({
        where,
        take: Math.min(Number(limit) || 50, 200),
        orderBy: { createdAt: 'desc' },
        include: {
          contact: { select: { id: true, name: true, phone: true, telegram: true, whatsapp: true } },
          deal: { select: { id: true, title: true, stageId: true } }
        }
      });

      return res.json({
        totalReturned: messages.length,
        messages: messages.map(m => ({
          id: m.id,
          channel: m.channel,
          direction: m.direction,
          senderName: m.senderName,
          senderPhone: m.senderPhone,
          text: m.text,
          mediaUrl: m.mediaUrl,
          mediaType: m.mediaType,
          status: m.status,
          createdAt: m.createdAt,
          contact: m.contact,
          deal: m.deal
        }))
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Помилка завантаження переписок' });
    }
  });

  /**
   * POST /api/agent/command
   * Unified Tool Execution dispatcher for LLM Function Calling.
   */
  router.post('/command', async (req: AuthRequest, res: Response) => {
    try {
      const { action, params } = req.body;
      const io = getIo();
      const currentUserId = req.userId || 'usr-admin';

      if (!action) {
        return res.status(400).json({ error: 'Параметр action обов’язковий' });
      }

      switch (action) {
        case 'create_deal': {
          const { title, budget = 0, pipelineId, stageId, contactName, phone, notes } = params || {};
          let targetContact: any = null;

          if (phone) {
            const clean = String(phone).replace(/\D/g, '');
            targetContact = await prisma.contact.findFirst({
              where: {
                OR: [
                  { phone: { contains: clean } },
                  { whatsapp: { contains: clean } }
                ]
              }
            });
            if (!targetContact) {
              targetContact = await prisma.contact.create({
                data: {
                  name: contactName || `Клієнт (+${clean})`,
                  phone: `+${clean}`,
                  whatsapp: `+${clean}`
                }
              });
            }
          }

          let pId = pipelineId;
          let sId = stageId;
          if (!pId || !sId) {
            const defaultPipe = await prisma.pipeline.findFirst({
              where: { isDefault: true },
              include: { stages: { orderBy: { sortOrder: 'asc' } } }
            }) || await prisma.pipeline.findFirst({ include: { stages: { orderBy: { sortOrder: 'asc' } } } });

            pId = pId || defaultPipe?.id;
            sId = sId || defaultPipe?.stages?.[0]?.id;
          }

          const newDeal = await prisma.deal.create({
            data: {
              title: title || `Угода від AI-Агента: ${targetContact?.name || 'Клієнт'}`,
              budget: Number(budget) || 0,
              pipelineId: pId,
              stageId: sId,
              contactId: targetContact?.id,
              responsibleId: currentUserId
            },
            include: { contact: true, stage: true, responsible: true }
          });

          if (notes) {
            await prisma.dealNote.create({
              data: {
                dealId: newDeal.id,
                userId: currentUserId,
                type: 'comment',
                content: `🤖 [AI Agent Note]: ${notes}`
              }
            });
          }

          if (io) {
            io.emit('deal_created', newDeal);
          }

          return res.status(201).json({ success: true, deal: newDeal });
        }

        case 'update_deal_stage': {
          const { dealId, stageId } = params || {};
          if (!dealId || !stageId) {
            return res.status(400).json({ error: 'dealId та stageId обов’язкові' });
          }

          const updatedDeal = await prisma.deal.update({
            where: { id: dealId },
            data: { stageId, updatedAt: new Date() },
            include: { contact: true, stage: true, responsible: true }
          });

          if (io) {
            io.emit('deal_updated', updatedDeal);
          }

          return res.json({ success: true, deal: updatedDeal });
        }

        case 'create_task': {
          const { dealId, text, dueDate, type = 'call', responsibleId } = params || {};
          if (!text) {
            return res.status(400).json({ error: 'Текст завдання обов’язковий' });
          }

          const task = await prisma.task.create({
            data: {
              dealId: dealId || null,
              text,
              type,
              dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 24 * 60 * 60 * 1000),
              responsibleId: responsibleId || currentUserId,
              createdById: currentUserId
            },
            include: { deal: true, responsible: true }
          });

          if (io) {
            io.emit('task_created', task);
          }

          return res.status(201).json({ success: true, task });
        }

        case 'complete_task': {
          const { taskId } = params || {};
          if (!taskId) return res.status(400).json({ error: 'taskId обов’язковий' });

          const completed = await prisma.task.update({
            where: { id: taskId },
            data: { isCompleted: true, completedAt: new Date() },
            include: { deal: true, responsible: true }
          });

          if (io) {
            io.emit('task_updated', completed);
          }

          return res.json({ success: true, task: completed });
        }

        case 'send_message': {
          const { channel, to, text, dealId, contactId } = params || {};
          if (!channel || !to || !text) {
            return res.status(400).json({ error: 'channel, to, та text обов’язкові' });
          }

          if (channel === 'whatsapp') {
            if (!waService.isConnected()) {
              return res.status(503).json({ error: 'WhatsApp лінія не підключена до CRM' });
            }
            const sent = await waService.sendMessage(to, text, dealId, contactId);
            return res.json({ success: true, message: sent });
          } else if (channel === 'telegram') {
            if (!tgService.isConnected()) {
              return res.status(503).json({ error: 'Telegram лінія не підключена до CRM' });
            }
            const sent = await tgService.sendMessage(to, text, dealId, contactId);
            return res.json({ success: true, message: sent });
          } else {
            return res.status(400).json({ error: 'Підтримуються тільки канали whatsapp та telegram' });
          }
        }

        case 'search_deals': {
          const { query, pipelineId, limit = 20 } = params || {};
          const where: any = { isDeleted: false };
          if (pipelineId) where.pipelineId = pipelineId;
          if (query) {
            where.OR = [
              { title: { contains: query, mode: 'insensitive' } },
              { contact: { name: { contains: query, mode: 'insensitive' } } },
              { contact: { phone: { contains: query } } }
            ];
          }

          const deals = await prisma.deal.findMany({
            where,
            take: Number(limit),
            orderBy: { updatedAt: 'desc' },
            include: { contact: true, stage: true, responsible: true, tasks: { where: { isCompleted: false } } }
          });

          return res.json({ success: true, deals });
        }

        case 'search_contacts': {
          const { query, limit = 20 } = params || {};
          const clean = (query || '').replace(/\D/g, '');
          const orConditions: any[] = [];
          if (query) {
            orConditions.push({ name: { contains: query, mode: 'insensitive' } });
            orConditions.push({ email: { contains: query, mode: 'insensitive' } });
            orConditions.push({ telegram: { contains: query, mode: 'insensitive' } });
          }
          if (clean.length >= 5) {
            orConditions.push({ phone: { contains: clean } });
            orConditions.push({ whatsapp: { contains: clean } });
          }

          const contacts = await prisma.contact.findMany({
            where: orConditions.length > 0 ? { OR: orConditions } : {},
            take: Number(limit),
            orderBy: { updatedAt: 'desc' },
            include: { deals: { where: { isDeleted: false }, select: { id: true, title: true, stage: true } } }
          });

          return res.json({ success: true, contacts });
        }

        default:
          return res.status(400).json({ error: `Невідома дія: ${action}` });
      }
    } catch (err: any) {
      console.error('Agent command execution error:', err);
      return res.status(500).json({ error: err.message || 'Збій виконання команди агента' });
    }
  });

  /**
   * GET /api/agent/openapi.json
   * Returns OpenAPI 3.0 specification for one-click Custom GPT / Claude Desktop / LangChain integration
   */
  router.get('/openapi.json', (req: AuthRequest, res: Response) => {
    const serverHost = process.env.RENDER_EXTERNAL_URL || 'https://online-crm.onrender.com';
    return res.json({
      openapi: '3.0.0',
      info: {
        title: 'Recruiting & Sales CRM AI-Agent API',
        description: 'Omniscient API for AI Agents to monitor, analyze, and manage the CRM (deals, messaging, tasks, candidates).',
        version: '1.0.0'
      },
      servers: [{ url: `${serverHost}/api` }],
      paths: {
        '/agent/overview': {
          get: {
            summary: 'Get full CRM state overview',
            description: 'Returns active pipelines, stages, deal counts, recent messages, and overdue tasks.',
            responses: { '200': { description: 'Successful snapshot' } }
          }
        },
        '/agent/chats/all': {
          get: {
            summary: 'Get all chat messages (WhatsApp & Telegram)',
            parameters: [
              { name: 'channel', in: 'query', schema: { type: 'string', enum: ['whatsapp', 'telegram'] } },
              { name: 'limit', in: 'query', schema: { type: 'integer' } }
            ],
            responses: { '200': { description: 'Chat message logs' } }
          }
        },
        '/agent/command': {
          post: {
            summary: 'Execute a CRM tool command',
            description: 'Unified tool dispatcher: create_deal, update_deal_stage, create_task, complete_task, send_message, search_deals, search_contacts.',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['action'],
                    properties: {
                      action: { type: 'string' },
                      params: { type: 'object' }
                    }
                  }
                }
              }
            },
            responses: { '200': { description: 'Action executed successfully' } }
          }
        }
      },
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'API Key (crm_live_...)'
          }
        }
      },
      security: [{ ApiKeyAuth: [] }]
    });
  });

  return router;
}
