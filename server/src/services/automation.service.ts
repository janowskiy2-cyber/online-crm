import { PrismaClient } from '@prisma/client';
import { WhatsAppService } from './whatsapp.service';
import { TelegramService } from './telegram.service';
import { Server as SocketIOServer } from 'socket.io';

export class AutomationService {
  private prisma: PrismaClient;
  private waService: WhatsAppService;
  private tgService: TelegramService;
  private io: SocketIOServer | null = null;

  constructor(prisma: PrismaClient, waService: WhatsAppService, tgService: TelegramService) {
    this.prisma = prisma;
    this.waService = waService;
    this.tgService = tgService;
  }

  public setSocketIO(io: SocketIOServer) {
    this.io = io;
  }

  public async handleStageChange(dealId: string, newStageId: string, userId: string) {
    try {
      const deal = await this.prisma.deal.findUnique({
        where: { id: dealId },
        include: {
          contact: true,
          stage: true,
          pipeline: true,
          responsible: true
        }
      });

      if (!deal) return;

      const rules = await this.prisma.automationRule.findMany({
        where: {
          pipelineId: deal.pipelineId,
          stageId: newStageId,
          triggerType: 'on_stage_enter',
          isActive: true
        }
      });

      for (const rule of rules) {
        await this.executeAction(rule, deal, userId);
      }
    } catch (err) {
      console.error('Error executing stage change automations:', err);
    }
  }

  private async executeAction(rule: any, deal: any, initiatorUserId: string) {
    try {
      const config = JSON.parse(rule.actionData || '{}');

      if (rule.actionType === 'send_whatsapp' && deal.contact?.whatsapp) {
        let text = config.template || 'Здравствуйте! Ваша заявка переведена на новый этап обработки.';
        text = text.replace('{client_name}', deal.contact.name)
                   .replace('{deal_title}', deal.title)
                   .replace('{manager_name}', deal.responsible?.name || 'Менеджер');

        await this.waService.sendMessage(deal.contact.whatsapp, text, deal.id, deal.contact.id);

        await this.prisma.dealNote.create({
          data: {
            dealId: deal.id,
            userId: initiatorUserId,
            type: 'system',
            content: `🤖 Автоворонка: отправлено WhatsApp сообщение клиенту "${text}"`
          }
        });
      }

      if (rule.actionType === 'send_telegram' && deal.contact?.telegram) {
        let text = config.template || 'Здравствуйте! Ваша заявка в работе.';
        text = text.replace('{client_name}', deal.contact.name)
                   .replace('{deal_title}', deal.title);

        await this.tgService.sendMessage(deal.contact.telegram, text, deal.id, deal.contact.id);

        await this.prisma.dealNote.create({
          data: {
            dealId: deal.id,
            userId: initiatorUserId,
            type: 'system',
            content: `🤖 Автоворонка: отправлено Telegram сообщение клиенту "${text}"`
          }
        });
      }

      if (rule.actionType === 'create_task') {
        const dueDate = new Date();
        const addHours = config.dueHours || 24;
        dueDate.setHours(dueDate.getHours() + addHours);

        const task = await this.prisma.task.create({
          data: {
            dealId: deal.id,
            responsibleId: config.assigneeId || deal.responsibleId,
            createdById: initiatorUserId,
            type: config.taskType || 'call',
            text: config.taskText || 'Автоматическая задача: связаться с клиентом по новому этапу',
            dueDate
          }
        });

        if (this.io) {
          this.io.emit('task_created', task);
        }

        await this.prisma.dealNote.create({
          data: {
            dealId: deal.id,
            userId: initiatorUserId,
            type: 'system',
            content: `🤖 Автоворонка: создана задача "${task.text}"`
          }
        });
      }

      if (rule.actionType === 'change_responsible' && config.newResponsibleId) {
        await this.prisma.deal.update({
          where: { id: deal.id },
          data: { responsibleId: config.newResponsibleId }
        });

        await this.prisma.dealNote.create({
          data: {
            dealId: deal.id,
            userId: initiatorUserId,
            type: 'system',
            content: `🤖 Автоворонка: ответственный изменен`
          }
        });
      }
    } catch (e) {
      console.error('Error executing single automation action:', e);
    }
  }
}
