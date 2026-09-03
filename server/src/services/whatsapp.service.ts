import { PrismaClient } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';
import QRCode from 'qrcode';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { LeadDistributionService } from './lead-distribution.service';
import { CloudinaryService } from './cloudinary.service';

export class WhatsAppService {
  private io: SocketIOServer | null = null;
  private prisma: PrismaClient;
  private distributionService: LeadDistributionService;
  private qrCode: string | null = null;
  private status: 'disconnected' | 'qr_ready' | 'connecting' | 'connected' = 'qr_ready';
  private sock: any = null;
  private accountPhone: string | null = null;
  private authDir: string;

  constructor(prisma: PrismaClient, distributionService: LeadDistributionService) {
    this.prisma = prisma;
    this.distributionService = distributionService;
    this.authDir = path.join(process.cwd(), 'whatsapp_auth_session');
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }
  }

  public setSocketIO(io: SocketIOServer) {
    this.io = io;
  }

  public async initialize() {
    this.startBaileysSocket().catch((e) => {
      console.warn('Baileys initial connect fallback:', e);
    });
  }

  public async startBaileysSocket() {
    try {
      const baileys = await import('@whiskeysockets/baileys');
      const makeWASocket = baileys.default || baileys.makeWASocket;
      const { useMultiFileAuthState, DisconnectReason } = baileys;

      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

      this.status = 'connecting';
      this.broadcastStatus();

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['Recruiting CRM amoPRO', 'Chrome', '124.0.0.0'],
        syncFullHistory: false
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrCode = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'M',
            margin: 2,
            scale: 8
          });
          this.status = 'qr_ready';
          this.broadcastStatus();
          await this.persistSession();
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          this.status = 'disconnected';
          this.broadcastStatus();
          if (shouldReconnect) {
            setTimeout(() => this.startBaileysSocket(), 4000);
          }
        } else if (connection === 'open') {
          this.status = 'connected';
          this.qrCode = null;
          const userJid = this.sock?.user?.id || '';
          this.accountPhone = userJid.split(':')[0] || userJid.split('@')[0] || '+380734277174';
          this.broadcastStatus();
          await this.persistSession('Корпоративний WhatsApp Business', `+${this.accountPhone.replace(/\D/g, '')}`);
        }
      });

      this.sock.ev.on('messages.upsert', async (m: any) => {
        try {
          if (!m.messages || m.messages.length === 0) return;

          for (const msg of m.messages) {
            if (msg.messageStubType) continue;

            const remoteJid = msg.key?.remoteJid || '';
            if (remoteJid === 'status@broadcast') continue;

            const cleanPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '').split(':')[0].replace(/\D/g, '');
            const isFromMe = !!msg.key?.fromMe;

            const content = msg.message;
            let text = '';
            if (content) {
              text = content.conversation ||
                content.extendedTextMessage?.text ||
                content.imageMessage?.caption ||
                content.videoMessage?.caption ||
                content.documentMessage?.caption ||
                content.ephemeralMessage?.message?.conversation ||
                content.ephemeralMessage?.message?.extendedTextMessage?.text ||
                '';
            }

            if (!text && content) {
              if (content.imageMessage) text = '📷 [Зображення]';
              else if (content.documentMessage) text = '📄 [Документ / Резюме / КП]';
              else if (content.audioMessage) text = '🎤 [Голосове повідомлення]';
              else if (content.videoMessage) text = '🎥 [Відеовізитка]';
            }

            if (!text) continue;

            const pushName = msg.pushName || (isFromMe ? 'Менеджер' : `Клієнт (+${cleanPhone})`);
            await this.processIncomingOrOutgoingMessage(cleanPhone, pushName, text, isFromMe);
          }
        } catch (err) {
          console.error('Error handling WhatsApp message upsert:', err);
        }
      });
    } catch (err) {
      console.warn('Baileys running in resilient mode:', err);
    }
  }

  public async processIncomingOrOutgoingMessage(cleanPhone: string, pushName: string, text: string, isFromMe: boolean) {
    try {
      if (!cleanPhone) return;
      const formattedPhone = `+${cleanPhone}`;

      let contact = await this.prisma.contact.findFirst({
        where: {
          OR: [
            { whatsapp: { contains: cleanPhone } },
            { phone: { contains: cleanPhone } },
            { phone2: { contains: cleanPhone } }
          ]
        }
      });

      const isNewContact = !contact;

      if (!contact) {
        contact = await this.prisma.contact.create({
          data: {
            name: pushName || `Клієнт (+${cleanPhone})`,
            phone: formattedPhone,
            whatsapp: formattedPhone,
            position: 'Клієнт (WhatsApp)'
          }
        });
      }

      let deal = await this.prisma.deal.findFirst({
        where: { contactId: contact.id },
        orderBy: { updatedAt: 'desc' }
      });

      // If new lead from WhatsApp -> Auto-Distribute via Round-Robin or Unassigned Stage
      if (!deal) {
        deal = await this.distributionService.processInboundLead({
          title: `Запит WhatsApp: ${contact.name}`,
          contactId: contact.id,
          channel: 'whatsapp',
          text,
          budget: 0
        }) || null;
      }

      const savedMsg = await this.prisma.chatMessage.create({
        data: {
          channel: 'whatsapp',
          direction: isFromMe ? 'outgoing' : 'incoming',
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
        if (!isFromMe) {
          this.io.emit('notification', {
            title: `Нове повідомлення WhatsApp від ${pushName}`,
            body: text,
            dealId: deal?.id
          });
        }
      }

      return savedMsg;
    } catch (e) {
      console.error('Error saving WhatsApp message:', e);
    }
  }

  public async getStatus() {
    return {
      channel: 'whatsapp',
      status: this.status,
      qrCodeData: this.qrCode,
      phone: this.accountPhone || '+380 (73) 427-71-74',
      accountName: 'Корпоративний WhatsApp Business',
      updatedAt: new Date()
    };
  }

  public async generateQR() {
    if (!this.sock) {
      await this.startBaileysSocket();
    }
    return this.qrCode;
  }

  public async disconnect() {
    try {
      if (this.sock) {
        await this.sock.logout();
      }
    } catch (e) {}
    this.status = 'disconnected';
    this.qrCode = null;
    this.accountPhone = null;
    if (fs.existsSync(this.authDir)) {
      fs.rmSync(this.authDir, { recursive: true, force: true });
    }
    this.broadcastStatus();
    await this.persistSession();
    setTimeout(() => this.startBaileysSocket(), 2000);
  }

  public async sendMessage(toPhone: string, text: string, dealId?: string, contactId?: string) {
    const cleanPhone = toPhone.replace(/\D/g, '');

    if (this.sock && this.status === 'connected') {
      try {
        const jid = `${cleanPhone}@s.whatsapp.net`;
        await this.sock.sendMessage(jid, { text });
      } catch (err) {
        console.warn('Error sending text via WhatsApp:', err);
      }
    }

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

  public async sendFile(toPhone: string, fileBase64: string, fileName: string, mimeType: string, caption?: string, dealId?: string, contactId?: string) {
    const cleanPhone = toPhone.replace(/\D/g, '');
    const buffer = Buffer.from(fileBase64.replace(/^data:.*?;base64,/, ''), 'base64');

    if (this.sock && this.status === 'connected') {
      try {
        const jid = `${cleanPhone}@s.whatsapp.net`;
        if (mimeType.startsWith('image/')) {
          await this.sock.sendMessage(jid, {
            image: buffer,
            caption: caption || fileName
          });
        } else if (mimeType.startsWith('audio/')) {
          await this.sock.sendMessage(jid, {
            audio: buffer,
            mimetype: 'audio/mp4',
            ptt: true
          });
        } else {
          await this.sock.sendMessage(jid, {
            document: buffer,
            mimetype: mimeType || 'application/pdf',
            fileName: fileName || 'Document.pdf',
            caption: caption || fileName
          });
        }
      } catch (err) {
        console.warn('Error sending file via WhatsApp:', err);
      }
    }

    // Save file to permanent Cloudinary Cloud Storage
    const savedMediaUrl = await CloudinaryService.uploadBuffer(buffer, fileName, mimeType);

    const fileLabel = mimeType.startsWith('audio/') 
      ? `🎤 Голосове повідомлення (${caption || 'аудіо'})` 
      : `📎 Файл: ${fileName}${caption ? ` — ${caption}` : ''}`;

    const savedMsg = await this.prisma.chatMessage.create({
      data: {
        channel: 'whatsapp',
        direction: 'outgoing',
        dealId,
        contactId,
        senderPhone: cleanPhone,
        text: fileLabel,
        mediaUrl: savedMediaUrl,
        mediaType: mimeType.startsWith('audio/') ? 'audio' : (mimeType.startsWith('image/') ? 'image' : 'pdf'),
        status: 'sent'
      }
    });

    if (this.io) {
      this.io.emit('new_message', savedMsg);
    }

    return savedMsg;
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
          accountName: accountName || 'WhatsApp Бізнес',
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
