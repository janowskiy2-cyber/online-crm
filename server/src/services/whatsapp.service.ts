import QRCode from 'qrcode';
import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';

export class WhatsAppService {
  private io: SocketIOServer | null = null;
  private prisma: PrismaClient;
  private qrCode: string | null = null;
  private status: 'disconnected' | 'qr_ready' | 'connecting' | 'connected' = 'disconnected';
  private accountPhone: string | null = null;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  public setSocketIO(io: SocketIOServer) {
    this.io = io;
  }

  public async getStatus() {
    return {
      channel: 'whatsapp',
      status: this.status,
      qrCodeData: this.qrCode,
      phone: this.accountPhone || '+7 (999) 456-78-90',
      accountName: 'WhatsApp Business Pro',
      updatedAt: new Date()
    };
  }

  public async initialize() {
    await this.generateDemoQR();
  }

  public async generateDemoQR() {
    try {
      const qrData = `2@${Date.now()},${Math.random().toString(36).substring(2)},CRM_WA_AUTH`;
      this.qrCode = await QRCode.toDataURL(qrData);
      this.status = 'qr_ready';
      this.broadcastStatus();
      await this.persistSession();
    } catch (e) {
      console.error('Failed to generate WhatsApp QR', e);
    }
  }

  public async simulateConnection(phone = '+7 (999) 777-22-33', name = 'Корпоративный WhatsApp (amoCRM)') {
    this.status = 'connected';
    this.qrCode = null;
    this.accountPhone = phone;
    this.broadcastStatus();
    await this.persistSession(name, phone);
  }

  public async disconnect() {
    this.status = 'disconnected';
    this.qrCode = null;
    this.accountPhone = null;
    this.broadcastStatus();
    await this.persistSession();
  }

  public async sendMessage(toPhone: string, text: string, dealId?: string, contactId?: string) {
    const cleanPhone = toPhone.replace(/\D/g, '');

    const savedMsg = await this.prisma.chatMessage.create({
      data: {
        channel: 'whatsapp',
        direction: 'outgoing',
        dealId,
        contactId,
        senderPhone: cleanPhone,
        text,
        status: 'sent'
      }
    });

    if (this.io) {
      this.io.emit('new_message', savedMsg);
    }

    return savedMsg;
  }

  public async handleIncomingMessage(phone: string, pushName: string, text: string) {
    try {
      const cleanPhone = phone.replace(/\D/g, '');

      // 1. Find or create Contact
      let contact = await this.prisma.contact.findFirst({
        where: {
          OR: [
            { whatsapp: { contains: cleanPhone } },
            { phone: { contains: cleanPhone } }
          ]
        }
      });

      if (!contact) {
        contact = await this.prisma.contact.create({
          data: {
            name: pushName || `Клиент WhatsApp (${cleanPhone})`,
            phone: `+${cleanPhone}`,
            whatsapp: `+${cleanPhone}`
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
              title: `Заявка WhatsApp: ${contact.name}`,
              budget: 0,
              pipelineId: defaultPipeline.id,
              stageId: firstStage.id,
              responsibleId: defaultUser.id,
              contactId: contact.id,
              tags: JSON.stringify(['WhatsApp', 'Входящий'])
            }
          });

          await this.prisma.dealNote.create({
            data: {
              dealId: deal.id,
              userId: defaultUser.id,
              type: 'system',
              content: `Создана новая сделка из входящего WhatsApp от ${contact.name}`
            }
          });

          if (this.io) {
            this.io.emit('deal_created', deal);
          }
        }
      }

      // 3. Save message
      const savedMsg = await this.prisma.chatMessage.create({
        data: {
          channel: 'whatsapp',
          direction: 'incoming',
          dealId: deal?.id,
          contactId: contact.id,
          senderName: pushName,
          senderPhone: cleanPhone,
          text,
          status: 'sent'
        }
      });

      if (this.io) {
        this.io.emit('new_message', savedMsg);
        this.io.emit('notification', {
          title: `Новое сообщение WhatsApp от ${pushName}`,
          body: text,
          dealId: deal?.id,
          contactId: contact.id
        });
      }

      return savedMsg;
    } catch (err) {
      console.error('Error handling incoming WhatsApp message:', err);
    }
  }

  private broadcastStatus() {
    if (this.io) {
      this.io.emit('messenger_status', {
        channel: 'whatsapp',
        status: this.status,
        qrCodeData: this.qrCode,
        phone: this.accountPhone
      });
    }
  }

  private async persistSession(accountName?: string, phone?: string) {
    try {
      await this.prisma.messengerSession.upsert({
        where: { channel: 'whatsapp' },
        create: {
          channel: 'whatsapp',
          status: this.status,
          qrCodeData: this.qrCode,
          accountName: accountName || 'WhatsApp Корпоративный',
          phone: phone || null
        },
        update: {
          status: this.status,
          qrCodeData: this.qrCode,
          accountName: accountName !== undefined ? accountName : undefined,
          phone: phone !== undefined ? phone : undefined
        }
      });
    } catch (e) {}
  }
}
