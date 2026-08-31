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

  // Get next responsible user (Guaranteed to return existing User ID)
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

      // Find or create Super Admin as root fallback
      let rootAdmin = await this.prisma.user.findFirst({
        where: { role: 'super_admin' }
      }) || await this.prisma.user.findFirst();

      if (!rootAdmin) {
        rootAdmin = await this.prisma.user.create({
          data: {
            id: 'usr-admin',
            name: 'Головний Адміністратор',
            email: 'admin@crm.pro',
            password: '22222222',
            role: 'super_admin',
            department: 'Керівництво',
            phone: '+380734277174',
            isActive: true,
            canViewAllDeals: true,
            canViewDeptDeals: true,
            canEditDeals: true,
            canDeleteDeals: true,
            canExportData: true,
            canManageUsers: true,
            canManageIntegrations: true
          }
        });
      }

      // If auto-distribution is OFF or no sales reps created yet -> Assign to Admin
      if (!this.autoDistribute || salesReps.length === 0) {
        return {
          id: rootAdmin.id,
          name: rootAdmin.name,
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
      const u = await this.prisma.user.findFirst();
      return { id: u?.id || 'usr-admin', name: u?.name || 'Головний Адміністратор', isAutoAssigned: false };
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
      // 1. Find default pipeline & first stage
      let defaultPipeline = await this.prisma.pipeline.findFirst({
        where: { isDefault: true },
        include: { stages: { orderBy: { sortOrder: 'asc' } } }
      }) || await this.prisma.pipeline.findFirst({
        include: { stages: { orderBy: { sortOrder: 'asc' } } }
      });

      if (!defaultPipeline || !defaultPipeline.stages || defaultPipeline.stages.length === 0) {
        // Create default pipeline with the new "Відправка КП" stage
        defaultPipeline = await this.prisma.pipeline.create({
          data: {
            id: 'pipe-employers-sales',
            name: '🏢 Роботодавці: B2B Продажі та Угоди',
            isDefault: true,
            stages: {
              create: [
                { name: 'Нова заявка підприємства', color: '#64748b', sortOrder: 0 },
                { name: 'Дзвінок-кваліфікація (15 хв)', color: '#3b82f6', sortOrder: 1 },
                { name: 'Відправка КП (PDF 4х25%)', color: '#8b5cf6', sortOrder: 2 },
                { name: 'Прорахунок кошторису & Уточнення', color: '#06b6d4', sortOrder: 3 },
                { name: 'Узгодження договору (25%)', color: '#f59e0b', sortOrder: 4 },
                { name: 'Договір підписано / В роботі', color: '#10b981', isWon: true, sortOrder: 5 },
                { name: 'Відмова', color: '#ef4444', isLost: true, sortOrder: 6 }
              ]
            }
          },
          include: { stages: { orderBy: { sortOrder: 'asc' } } }
        });
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

      // 3. Create initial 15-min SLA Task for the assigned manager
      try {
        await this.prisma.task.create({
          data: {
            dealId: deal.id,
            responsibleId,
            createdById: responsibleId,
            type: 'call',
            text: `🔥 Зв'язатися з новим клієнтом (${data.channel.toUpperCase()}) протягом 15 хвилин`,
            dueDate: new Date(Date.now() + 15 * 60 * 1000)
          }
        });
      } catch (e) {
        console.warn('SLA Task creation warning:', e);
      }

      // 4. System audit log
      try {
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
      } catch (e) {}

      // 5. Broadcast to all connected clients
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
      return null;
    }
  }
}
