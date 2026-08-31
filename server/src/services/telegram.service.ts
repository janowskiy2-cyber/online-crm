import QRCode from 'qrcode';
import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';

export class TelegramService {
  private io: SocketIOServer | null = null;
  private prisma: PrismaClient;
  private qrCode: string | null = null;
  private status: 'disconnected' | 'qr_ready' | 'connecting' | 'connected' = 'qr_ready';
  private accountInfo: { username?: string; name?: string } = {};

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  public setSocketIO(io: SocketIOServer) {
    this.io = io;
  }

  public async getStatus() {
    if (!this.qrCode && this.status !== 'connected') {
      await this.generateQR();
    }
    return {
      channel: 'telegram',
      status: this.status,
      qrCodeData: this.qrCode,
      accountName: this.accountInfo.name || this.accountInfo.username || 'Telegram Business CRM',
      updatedAt: new Date()
    };
  }

  public async initialize() {
    await this.generateQR();
  }

  public async generateQR() {
    try {
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const qrPayload = `tg://login?token=crm_${token}_${Date.now()}`;

      this.qrCode = await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: 'M',
        margin: 2,
        scale: 8,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
      this.status = 'qr_ready';
      this.broadcastStatus();
      await this.persistSession();
      return this.qrCode;
    } catch (e) {
      console.error('Failed to generate Telegram QR code:', e);
      return null;
    }
  }

  public async simulateConnection(username = '@crm_sales_bot', name = 'Telegram Корпоративный бот') {
    this.status = 'connected';
    this.qrCode = null;
    this.accountInfo = { username, name };
    this.broadcastStatus();
    await this.persistSession(name);
  }

  public async disconnect() {
    this.status = 'disconnected';
    this.qrCode = null;
    this.accountInfo = {};
    await this.generateQR();
    this.broadcastStatus();
    await this.persistSession();
  }

  public async sendMessage(toTgIdOrUsername: string, text: string, dealId?: string, contactId?: string) {
    const savedMsg = await this.prisma.chatMessage.create({
      data: {
        channel: 'telegram',
        direction: 'outgoing',
        dealId,
        contactId,
        senderTgId: toTgIdOrUsername,
        text,
        status: 'sent'
      }
    });

    if (this.io) {
      this.io.emit('new_message', savedMsg);
    }

    return savedMsg;
  }

  public async handleIncomingMessage(username: string, fullName: string, text: string, tgId?: string) {
    try {
      // 1. Find or create Contact
      let contact = await this.prisma.contact.findFirst({
        where: {
          OR: [
            { telegram: username },
            { name: fullName }
          ]
        }
      });

      if (!contact) {
        contact = await this.prisma.contact.create({
          data: {
            name: fullName || username,
            telegram: username.startsWith('@') ? username : `@${username}`
          }
        });
      }

      // 2. Find active Deal or create new Lead
      let deal = await this.prisma.deal.findFirst({
        where: {
          contactId: contact.id,
          stage: { isWon: false, isLost: false }
        },
        orderBy: { updatedAt: 'desc' }
      });

      if (!deal) {
        const defaultPipeline = await this.prisma.pipeline.findFirst({
          where: { isDefault: true },
          include: { stages: { orderBy: { sortOrder: 'asc' } } }
        }) || await this.prisma.pipeline.findFirst({
          include: { stages: { orderBy: { sortOrder: 'asc' } } }
        });

        const firstStage = defaultPipeline?.stages[0];
        const defaultUser = await this.prisma.user.findFirst({
          where: { role: 'lead_gen_sdr' }
        }) || await this.prisma.user.findFirst();

        if (defaultPipeline && firstStage && defaultUser) {
          deal = await this.prisma.deal.create({
            data: {
              title: `Сделка из Telegram: ${fullName || username}`,
              budget: 0,
              pipelineId: defaultPipeline.id,
              stageId: firstStage.id,
              responsibleId: defaultUser.id,
              contactId: contact.id,
              tags: JSON.stringify(['Telegram', 'Входящий'])
            }
          });

          await this.prisma.dealNote.create({
            data: {
              dealId: deal.id,
              userId: defaultUser.id,
              type: 'system',
              content: `Создана новая сделка из входящего обращения в Telegram от ${fullName || username}`
            }
          });

          if (this.io) {
            this.io.emit('deal_created', deal);
          }
        }
      }

      // 3. Save Message
      const savedMsg = await this.prisma.chatMessage.create({
        data: {
          channel: 'telegram',
          direction: 'incoming',
          dealId: deal?.id,
          contactId: contact.id,
          senderName: fullName || username,
          senderTgId: username,
          text,
          status: 'sent'
        }
      });

      if (this.io) {
        this.io.emit('new_message', savedMsg);
        this.io.emit('notification', {
          title: `Новое сообщение Telegram от ${fullName || username}`,
          body: text,
          dealId: deal?.id,
          contactId: contact.id
        });
      }

      return savedMsg;
    } catch (err) {
      console.error('Error handling Telegram message:', err);
    }
  }

  private broadcastStatus() {
    if (this.io) {
      this.io.emit('messenger_status', {
        channel: 'telegram',
        status: this.status,
        qrCodeData: this.qrCode,
        accountName: this.accountInfo.name || this.accountInfo.username
      });
    }
  }

  private async persistSession(accountName?: string) {
    try {
      await this.prisma.messengerSession.upsert({
        where: { channel: 'telegram' },
        create: {
          channel: 'telegram',
          status: this.status,
          qrCodeData: this.qrCode,
          accountName: accountName || 'Telegram Канал CRM'
        },
        update: {
          status: this.status,
          qrCodeData: this.qrCode,
          accountName: accountName !== undefined ? accountName : undefined
        }
      });
    } catch (e) {}
  }
}
