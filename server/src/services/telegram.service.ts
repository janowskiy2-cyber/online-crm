import { PrismaClient } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage } from 'telegram/events';
import path from 'path';
import fs from 'fs';
import { LeadDistributionService } from './lead-distribution.service';
import { CloudinaryService } from './cloudinary.service';

const DEFAULT_API_ID = 2040;
const DEFAULT_API_HASH = 'b18441a1ff607e10a989891a5462e627';

export class TelegramService {
  private io: SocketIOServer | null = null;
  private prisma: PrismaClient;
  private distributionService: LeadDistributionService;
  private client: TelegramClient | null = null;
  private status: 'disconnected' | 'awaiting_code' | 'connected' = 'disconnected';
  private sessionString: string = '';
  private pendingPhone: string | null = null;
  private phoneCodeHash: string | null = null;
  private accountInfo: { name?: string; phone?: string; username?: string } = {};

  constructor(prisma: PrismaClient, distributionService: LeadDistributionService) {
    this.prisma = prisma;
    this.distributionService = distributionService;
  }

  public setSocketIO(io: SocketIOServer) {
    this.io = io;
  }

  public async initialize() {
    try {
      const session = await this.prisma.messengerSession.findUnique({ where: { channel: 'telegram' } });
      if (session && session.qrCodeData && session.status === 'connected') {
        this.sessionString = session.qrCodeData;
        await this.connectWithSessionString(this.sessionString);
      }
    } catch (e) {
      console.warn('Telegram initial MTProto session restore:', e);
    }
  }

  public isConnected(): boolean {
    return this.status === 'connected' && !!this.client;
  }

  public async getStatus() {
    return {
      channel: 'telegram',
      status: this.status,
      phone: this.accountInfo.phone || '+380 (73) 427-71-74',
      accountName: this.accountInfo.name || this.accountInfo.username || 'Корпоративний Telegram (Користувач)',
      updatedAt: new Date()
    };
  }

  public async sendCodeToPhone(phone: string, customApiId?: number, customApiHash?: string) {
    try {
      const apiId = customApiId || DEFAULT_API_ID;
      const apiHash = customApiHash || DEFAULT_API_HASH;
      const cleanPhone = phone.replace(/\D/g, '');
      this.pendingPhone = `+${cleanPhone}`;

      this.client = new TelegramClient(new StringSession(''), apiId, apiHash, {
        connectionRetries: 5,
        useWSS: false
      });

      await this.client.connect();

      const res = await this.client.sendCode(
        {
          apiId,
          apiHash
        },
        this.pendingPhone
      );

      this.phoneCodeHash = res.phoneCodeHash;
      this.status = 'awaiting_code';
      this.broadcastStatus();

      return {
        success: true,
        phone: this.pendingPhone,
        phoneCodeHash: this.phoneCodeHash,
        message: `Офіційний 5-значний код надіслано серверами Telegram на номер ${this.pendingPhone}`
      };
    } catch (err: any) {
      console.error('Error in sendCodeToPhone:', err);
      throw new Error(err.message || 'Помилка надсилання коду Telegram. Перевірте номер.');
    }
  }

  public async signInWithCode(code: string, password2FA?: string) {
    try {
      if (!this.client || !this.pendingPhone || !this.phoneCodeHash) {
        throw new Error('Сесія закінчилася. Введіть номер телефону знову.');
      }

      await this.client.invoke(
        new (await import('telegram/tl')).Api.auth.SignIn({
          phoneNumber: this.pendingPhone,
          phoneCodeHash: this.phoneCodeHash,
          phoneCode: code.trim()
        })
      ).catch(async (err: any) => {
        if (err.message?.includes('SESSION_PASSWORD_NEEDED') && password2FA) {
          await (this.client as any).signInWithPassword({
            password: password2FA
          });
        } else {
          throw err;
        }
      });

      const me: any = await this.client.getMe();
      const sessionStr = (this.client.session as StringSession).save();

      this.status = 'connected';
      this.accountInfo = {
        name: `${me.firstName || ''} ${me.lastName || ''}`.trim() || me.username || 'Корпоративний Telegram',
        username: me.username ? `@${me.username}` : undefined,
        phone: me.phone ? `+${me.phone}` : this.pendingPhone
      };

      await this.persistSession(this.accountInfo.name, this.accountInfo.phone, sessionStr);
      this.setupMessageListener();
      this.broadcastStatus();

      return {
        success: true,
        name: this.accountInfo.name,
        phone: this.accountInfo.phone
      };
    } catch (err: any) {
      console.error('Error in signInWithCode:', err);
      throw new Error(err.message || 'Невірний код безпеки Telegram');
    }
  }

  private async connectWithSessionString(sessionStr: string) {
    try {
      this.client = new TelegramClient(new StringSession(sessionStr), DEFAULT_API_ID, DEFAULT_API_HASH, {
        connectionRetries: 5
      });
      await this.client.connect();
      const me: any = await this.client.getMe();
      if (me) {
        this.status = 'connected';
        this.accountInfo = {
          name: `${me.firstName || ''} ${me.lastName || ''}`.trim() || me.username,
          username: me.username ? `@${me.username}` : undefined,
          phone: me.phone ? `+${me.phone}` : undefined
        };
        this.setupMessageListener();
        this.broadcastStatus();
      }
    } catch (e) {
      console.warn('Session string connect failed:', e);
      this.status = 'disconnected';
    }
  }

  private setupMessageListener() {
    if (!this.client) return;

    this.client.addEventHandler(async (event: any) => {
      const message = event.message;
      if (!message || message.out) return;

      try {
        const sender: any = await message.getSender();
        const senderName = `${sender?.firstName || ''} ${sender?.lastName || ''}`.trim() || sender?.username || 'Користувач Telegram';
        const senderUsername = sender?.username ? `@${sender.username}` : (sender?.phone ? `+${sender.phone}` : `tg_${sender?.id}`);
        const text = message.text || '[Медіа / Документ]';

        await this.handleIncomingMessage(senderUsername, senderName, text, String(sender?.id));
      } catch (err) {
        console.error('Error handling incoming MTProto message:', err);
      }
    }, new NewMessage({}));
  }

  public async disconnect() {
    try {
      if (this.client) {
        await this.client.disconnect();
      }
    } catch (e) {}
    this.status = 'disconnected';
    this.client = null;
    this.sessionString = '';
    this.accountInfo = {};
    this.pendingPhone = null;
    await this.persistSession();
    this.broadcastStatus();
  }

  public async sendMessage(toTgIdOrUsername: string, text: string, dealId?: string, contactId?: string) {
    if (this.client && this.status === 'connected') {
      try {
        await this.client.sendMessage(toTgIdOrUsername, { message: text });
      } catch (err) {
        console.warn('Error sending MTProto message:', err);
      }
    }

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

  public async sendFile(toTgIdOrUsername: string, fileBase64: string, fileName: string, mimeType: string, caption?: string, dealId?: string, contactId?: string) {
    const buffer = Buffer.from(fileBase64.replace(/^data:.*?;base64,/, ''), 'base64');

    if (this.client && this.status === 'connected') {
      try {
        await this.client.sendFile(toTgIdOrUsername, {
          file: buffer,
          caption: caption || fileName
        });
      } catch (err) {
        console.warn('Error sending MTProto file:', err);
      }
    }

    // Save file to permanent Cloudinary Cloud Storage
    const savedMediaUrl = await CloudinaryService.uploadBuffer(buffer, fileName, mimeType);

    const isVoice = mimeType.startsWith('audio/') || fileName.includes('Voice_Note');
    const fileLabel = isVoice
      ? `🎤 Голосове повідомлення (${caption || 'аудіо'})`
      : `📎 Файл TG: ${fileName}${caption ? ` — ${caption}` : ''}`;

    const savedMsg = await this.prisma.chatMessage.create({
      data: {
        channel: 'telegram',
        direction: 'outgoing',
        dealId,
        contactId,
        senderTgId: toTgIdOrUsername,
        text: fileLabel,
        mediaUrl: savedMediaUrl,
        mediaType: isVoice ? 'audio' : (mimeType.startsWith('image/') ? 'image' : 'pdf'),
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
      const cleanPhone = username.replace(/\D/g, '');
      const whereConditions: any[] = [
        { telegram: username },
        { telegram: `@${username.replace('@', '')}` }
      ];

      if (fullName && fullName.trim()) {
        whereConditions.push({ name: fullName });
      }

      if (cleanPhone.length >= 7) {
        whereConditions.push({ phone: { contains: cleanPhone } });
        whereConditions.push({ phone2: { contains: cleanPhone } });
        whereConditions.push({ whatsapp: { contains: cleanPhone } });
      }

      let contact = await this.prisma.contact.findFirst({
        where: {
          OR: whereConditions
        }
      });

      const formattedTg = username.startsWith('@') ? username : `@${username}`;

      if (!contact) {
        contact = await this.prisma.contact.create({
          data: {
            name: fullName || username,
            telegram: formattedTg,
            phone: cleanPhone.length >= 7 ? `+${cleanPhone}` : undefined,
            position: 'Клієнт (Telegram)'
          }
        });
      } else if (!contact.telegram) {
        // Auto-save telegram username if matched by phone!
        contact = await this.prisma.contact.update({
          where: { id: contact.id },
          data: { telegram: formattedTg }
        });
      }

      let deal = await this.prisma.deal.findFirst({
        where: { contactId: contact.id },
        orderBy: { updatedAt: 'desc' }
      });

      // If new lead from Telegram -> Auto-Distribute via Round-Robin or Unassigned Stage
      if (!deal) {
        deal = await this.distributionService.processInboundLead({
          title: `Звернення Telegram: ${fullName || username}`,
          contactId: contact.id,
          channel: 'telegram',
          text,
          budget: 0
        }) || null;
      }

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
          title: `Нове звернення Telegram від ${fullName || username}`,
          body: text,
          dealId: deal?.id
        });

        if (deal) {
          // Digital Pipeline: Speed-to-lead 15-minute auto task
          const assignee = deal.responsibleId || 'usr-admin';
          this.prisma.task.create({
            data: {
              dealId: deal.id,
              responsibleId: assignee,
              createdById: assignee,
              text: `💬 Клієнт відповів у Telegram: "${text.slice(0, 60)}" — терміново відповісти!`,
              type: 'call',
              dueDate: new Date(Date.now() + 15 * 60 * 1000)
            }
          }).then(task => {
            if (this.io && task) this.io.emit('task_created', task);
          }).catch(() => {});
        }
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
        phone: this.accountInfo.phone,
        accountName: this.accountInfo.name
      });
    }
  }

  private async persistSession(accountName?: string, phone?: string, sessionStr?: string) {
    try {
      await this.prisma.messengerSession.upsert({
        where: { channel: 'telegram' },
        create: {
          channel: 'telegram',
          status: this.status,
          qrCodeData: sessionStr || null,
          accountName: accountName || 'Telegram Користувач',
          phone: phone || null
        },
        update: {
          status: this.status,
          qrCodeData: sessionStr !== undefined ? sessionStr : undefined,
          accountName: accountName !== undefined ? accountName : undefined,
          phone: phone !== undefined ? phone : undefined
        }
      });
    } catch (e) {}
  }
}
