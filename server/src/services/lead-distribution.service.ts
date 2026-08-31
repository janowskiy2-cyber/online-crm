import { PrismaClient } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';

export class LeadDistributionService {
  private prisma: PrismaClient;
  private io: SocketIOServer | null = null;
  private autoDistribute: boolean = true;
  private lastAssignedIndex: number = 0;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  public setSocketIO(io: SocketIOServer) {
    this.io = io;
  }

  public setMode(auto: boolean) {
    this.autoDistribute = auto;
  }

  public getMode() {
    return { autoDistribute: this.autoDistribute };
  }

  // Get next responsible user (Round-Robin or Unassigned/Admin)
  public async getNextResponsible(): Promise<{ id: string; name: string; isAutoAssigned: boolean }> {
    try {
      // Find all active sales reps
      const salesReps = await this.prisma.user.findMany({
        where: {
          isActive: true,
          role: { in: ['sales_rep', 'manager', 'sales_lead'] }
        },
        orderBy: { createdAt: 'asc' }
      });

      // If auto-distribution is OFF or no sales reps created yet -> Assign to Master Admin
      if (!this.autoDistribute || salesReps.length === 0) {
        const rootAdmin = await this.prisma.user.findFirst({
          where: { role: 'super_admin' }
        }) || await this.prisma.user.findFirst();

        return {
          id: rootAdmin?.id || 'usr-admin',
          name: rootAdmin?.name || 'Головний Адміністратор (На розподіл)',
          isAutoAssigned: false
        };
      }

      // Round-Robin algorithm among active sales reps
      const rep = salesReps[this.lastAssignedIndex % salesReps.length];
      this.lastAssignedIndex = (this.lastAssignedIndex + 1) % salesReps.length;

      return {
        id: rep.id,
        name: rep.name,
        isAutoAssigned: true
      };
    } catch (e) {
      return { id: 'usr-admin', name: 'Головний Адміністратор', isAutoAssigned: false };
    }
  }

  // Process incoming lead and assign
  public async processInboundLead(data: {
    title: string;
    contactId: string;
    companyId?: string;
    channel: 'whatsapp' | 'telegram' | 'ads';
    text?: string;
    budget?: number;
    tags?: string[];
  }) {
    try {
      // 1. Find default pipeline
      const defaultPipeline = await this.prisma.pipeline.findFirst({
        where: { isDefault: true },
        include: { stages: { orderBy: { sortOrder: 'asc' } } }
      }) || await this.prisma.pipeline.findFirst({
        include: { stages: { orderBy: { sortOrder: 'asc' } } }
      });

      if (!defaultPipeline || defaultPipeline.stages.length === 0) {
        throw new Error('Default pipeline missing');
      }

      const firstStage = defaultPipeline.stages[0];
      const { id: responsibleId, name: responsibleName, isAutoAssigned } = await this.getNextResponsible();

      // 2. Create Deal
      const deal = await this.prisma.deal.create({
        data: {
          title: data.title,
          budget: data.budget || 0,
          pipelineId: defaultPipeline.id,
          stageId: firstStage.id,
          responsibleId,
          contactId: data.contactId,
          companyId: data.companyId,
          projectId: 'employers',
          tags: JSON.stringify([
            data.channel === 'whatsapp' ? 'WhatsApp' : (data.channel === 'telegram' ? 'Telegram' : 'Реклама'),
            isAutoAssigned ? 'Авто-розподіл' : 'Нерозібране',
            ...(data.tags || [])
          ])
        },
        include: {
          contact: true,
          company: true,
          responsible: true,
          stage: true
        }
      });

      // 3. Create initial Task for the assigned manager
      await this.prisma.task.create({
        data: {
          dealId: deal.id,
          responsibleId,
          type: 'call',
          text: `🔥 Зв'язатися з новим клієнтом (${data.channel.toUpperCase()}) протягом 15 хвилин`,
          dueDate: new Date(Date.now() + 15 * 60 * 1000) // 15 mins SLA
        }
      });

      // 4. System audit log
      await this.prisma.dealNote.create({
        data: {
          dealId: deal.id,
          userId: responsibleId,
          type: 'system',
          content: isAutoAssigned
            ? `🤖 Ліда автоматично призначено на менеджера ${responsibleName} (Round-Robin).`
            : `📥 Новий лід надійшов у «Нерозібране». Очікує розподілу адміністратором.`
        }
      });

      // 5. Broadcast to all clients
      if (this.io) {
        this.io.emit('deal_created', deal);
        this.io.emit('notification', {
          title: isAutoAssigned ? `🔥 Новий лід призначено на ${responsibleName}` : '📥 Новий нерозібраний лід!',
          body: data.title,
          dealId: deal.id
        });
      }

      return deal;
    } catch (err) {
      console.error('Error in processInboundLead:', err);
    }
  }
}
