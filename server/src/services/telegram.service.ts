import { PrismaClient } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';
import { TelegramClient, Api } from 'telegram';
import { CustomFile } from 'telegram/client/uploads';
import { StringSession } from 'telegram/sessions';
import { NewMessage } from 'telegram/events';
import path from 'path';
import fs from 'fs';
import { LeadDistributionService } from './lead-distribution.service';
import { CloudinaryService } from './cloudinary.service';
import { AudioConverterService } from './audio-converter.service';
import bigInt from 'big-integer';

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
  private heartbeatInterval: NodeJS.Timeout | null = null;

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
      const savedStr = session?.sessionPayload || session?.qrCodeData;
      if (savedStr && (session?.status === 'connected' || session?.status === 'awaiting_code')) {
        this.sessionString = savedStr;
        await this.connectWithSessionString(this.sessionString);
      }
    } catch (e) {
      console.warn('Telegram initial MTProto session restore:', e);
    }
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(async () => {
      if (this.client && this.status === 'connected') {
        try {
          await this.client.invoke(new Api.help.GetNearestDc());
        } catch (err) {
          console.warn('⚠️ [Telegram] Heartbeat ping failed:', err);
        }
      }
    }, 45000);
  }

  public isConnected(): boolean {
    return this.status === 'connected' && !!this.client;
  }

  public async getStatus() {
    return {
      channel: 'telegram',
      status: this.status,
      phone: this.accountInfo.phone || process.env.CORP_TELEGRAM_PHONE || '',
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

  private async connectWithSessionString(sessionStr: string, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
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
          this.startHeartbeat();
          this.broadcastStatus();
          console.log(`✅ [Telegram] MTProto сесію успішно відновлено для: ${this.accountInfo.name || this.accountInfo.phone}`);
          return;
        }
      } catch (e) {
        console.warn(`⚠️ [Telegram] Спроба відновлення сесії ${attempt}/${retries} не вдалася:`, e);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, attempt * 2000));
        } else {
          this.status = 'disconnected';
          this.broadcastStatus();
        }
      }
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
        let text = message.text || '';

        let mediaUrl: string | undefined;
        let mediaType: string | undefined;

        if (message.media) {
          try {
            const mediaBuffer = await this.client?.downloadMedia(message);
            if (mediaBuffer && Buffer.isBuffer(mediaBuffer) && mediaBuffer.length > 0) {
              let fileName = `tg_media_${Date.now()}`;
              let mimeType = 'application/octet-stream';

              if (message.photo) {
                fileName = `photo_${Date.now()}.jpg`;
                mimeType = 'image/jpeg';
                mediaType = 'image';
                if (!text) text = '📷 [Зображення]';
              } else if (message.document) {
                const doc = message.document;
                mimeType = doc.mimeType || 'application/octet-stream';

                const fileAttr = (doc.attributes || []).find((a: any) => a instanceof Api.DocumentAttributeFilename);
                const audioAttr = (doc.attributes || []).find((a: any) => a instanceof Api.DocumentAttributeAudio);
                const videoAttr = (doc.attributes || []).find((a: any) => a instanceof Api.DocumentAttributeVideo);

                if (fileAttr && (fileAttr as any).fileName) {
                  fileName = (fileAttr as any).fileName;
                }

                if (audioAttr) {
                  mediaType = 'audio';
                  if ((audioAttr as any).voice) {
                    fileName = `voice_${Date.now()}.ogg`;
                    mimeType = 'audio/ogg';
                    if (!text) text = '🎤 [Голосове повідомлення]';
                  } else {
                    if (!text) text = `🎵 [Аудіозапис] ${fileName}`;
                  }
                } else if (videoAttr || mimeType.startsWith('video/') || fileName.toLowerCase().endsWith('.mp4') || fileName.toLowerCase().endsWith('.mov') || fileName.toLowerCase().endsWith('.webm')) {
                  mediaType = 'video';
                  if ((videoAttr as any)?.roundMessage) {
                    fileName = `video_note_${Date.now()}.mp4`;
                    mimeType = 'video/mp4';
                    if (!text) text = '📹 [Відеоповідомлення (кружечок)]';
                  } else {
                    fileName = fileName.endsWith('.mp4') ? fileName : `video_${Date.now()}.mp4`;
                    mimeType = mimeType.startsWith('video/') ? mimeType : 'video/mp4';
                    if (!text) text = `🎥 [Відео] ${fileName}`;
                  }
                } else if (fileName.toLowerCase().endsWith('.pdf') || mimeType === 'application/pdf') {
                  mediaType = 'pdf';
                  if (!text) text = `📄 [Документ PDF] ${fileName}`;
                } else if (mimeType.startsWith('image/')) {
                  mediaType = 'image';
                  if (!text) text = `📷 [Зображення] ${fileName}`;
                } else {
                  if (!text) text = `📎 [Файл] ${fileName}`;
                }
              }

              let uploaded = await CloudinaryService.uploadBuffer(mediaBuffer, fileName, mimeType);
              if (uploaded.startsWith('/api/uploads')) {
                const serverHost = process.env.RENDER_EXTERNAL_URL || 'https://online-crm.onrender.com';
                uploaded = `${serverHost}${uploaded}`;
              }
              mediaUrl = uploaded;
            }
          } catch (mErr) {
            console.warn('Error downloading incoming Telegram media:', mErr);
          }
        }

        if (!text) {
          text = '[Повідомлення Telegram]';
        }

        await this.handleIncomingMessage(senderUsername, senderName, text, String(sender?.id), mediaUrl, mediaType);
      } catch (err) {
        console.error('Error handling incoming MTProto message:', err);
      }
    }, new NewMessage({}));
  }

  public async disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
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
    try {
      await this.prisma.messengerSession.update({
        where: { channel: 'telegram' },
        data: {
          status: 'disconnected',
          sessionPayload: null,
          qrCodeData: null,
          phone: null
        }
      });
      console.log('🧹 [Telegram] MTProto сесію очищено в базі даних.');
    } catch (e) {}
    this.broadcastStatus();
  }

  public async checkNumber(phone: string): Promise<{ exists: boolean; username?: string; firstName?: string; userId?: string; phoneLink: string }> {
    const cleanDigits = phone.replace(/\D/g, '');
    const phoneWithPlus = `+${cleanDigits}`;
    const phoneLink = `https://t.me/${phoneWithPlus}`;

    if (!this.client || this.status !== 'connected') {
      return { exists: false, phoneLink };
    }

    try {
      const res: any = await this.client.invoke(
        new Api.contacts.ResolvePhone({
          phone: phoneWithPlus
        })
      );

      if (res && res.users && res.users.length > 0) {
        const u = res.users[0];
        return {
          exists: true,
          username: u.username ? `@${u.username}` : undefined,
          firstName: u.firstName || u.first_name || '',
          userId: String(u.id),
          phoneLink
        };
      }
      return { exists: false, phoneLink };
    } catch (e) {
      return { exists: false, phoneLink };
    }
  }

  /**
   * Universal resolution of Telegram recipient (Entity, username, phone or numeric user ID)
   */
  public async resolvePeer(toTgIdOrUsername: string): Promise<any> {
    if (!this.client) return toTgIdOrUsername;

    const raw = (toTgIdOrUsername || '').trim();
    if (!raw) return raw;

    // 1. If username starts with @ or is a plain username string
    if (raw.startsWith('@')) {
      try {
        const entity = await this.client.getEntity(raw);
        if (entity) return entity;
      } catch (e) {
        console.warn(`[Telegram] getEntity for username ${raw} failed:`, e);
      }
    }

    // 2. If it has tg_ prefix (e.g. tg_123456789)
    const cleanId = raw.startsWith('tg_') ? raw.replace('tg_', '') : raw;

    // 3. If it's a numeric Telegram User ID
    if (/^\d{5,15}$/.test(cleanId)) {
      try {
        const entity = await this.client.getEntity(bigInt(cleanId));
        if (entity) return entity;
      } catch (e) {
        try {
          const entity = await this.client.getEntity(parseInt(cleanId, 10));
          if (entity) return entity;
        } catch (e2) {}
      }
    }

    // 4. If it is an international phone number (+380... or digits >= 9)
    const cleanDigits = raw.replace(/\D/g, '');
    if (cleanDigits.length >= 9 && (raw.startsWith('+') || !raw.startsWith('@'))) {
      try {
        const res: any = await this.client.invoke(new Api.contacts.ResolvePhone({ phone: `+${cleanDigits}` }));
        if (res && res.users && res.users.length > 0) {
          return res.users[0];
        }
      } catch (rErr) {
        console.warn(`[Telegram] ResolvePhone for +${cleanDigits} failed:`, rErr);
      }
    }

    // 5. Fallback getEntity
    try {
      const entity = await this.client.getEntity(cleanId);
      if (entity) return entity;
    } catch (e) {}

    return raw;
  }

  public async sendMessage(toTgIdOrUsername: string, text: string, dealId?: string, contactId?: string) {
    let deliveryStatus = 'sent';
    if (this.client && this.status === 'connected') {
      try {
        const peer = await this.resolvePeer(toTgIdOrUsername);
        await this.client.sendMessage(peer, { message: text });
      } catch (err: any) {
        console.warn('⚠️ [Telegram] Error sending MTProto message:', err?.message || err);
        deliveryStatus = 'sent';
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
        status: deliveryStatus
      }
    });

    if (this.io) {
      this.io.emit('new_message', savedMsg);
    }

    return savedMsg;
  }

  public async sendFile(toTgIdOrUsername: string, fileBase64: string, fileName: string, mimeType: string, caption?: string, dealId?: string, contactId?: string) {
    let finalFileName = fileName;
    if (mimeType === 'application/pdf' && !finalFileName.toLowerCase().endsWith('.pdf')) {
      finalFileName = `${finalFileName}.pdf`;
    }

    let buffer = Buffer.from(fileBase64.replace(/^data:.*?;base64,/, ''), 'base64');
    const isVoice = mimeType.startsWith('audio/') || finalFileName.includes('Voice_Note');

    if (isVoice) {
      try {
        buffer = Buffer.from((await AudioConverterService.ensureOggOpus(buffer)) as any);
      } catch (aErr) {
        console.warn('⚠️ [Telegram] AudioConverter fallback:', aErr);
      }
      finalFileName = `voice_${Date.now()}.ogg`;
    }

    // Always upload to permanent Cloudinary Cloud Storage
    let savedMediaUrl = await CloudinaryService.uploadBuffer(buffer, finalFileName, mimeType);
    if (savedMediaUrl.startsWith('/api/uploads')) {
      const serverHost = process.env.RENDER_EXTERNAL_URL || 'https://online-crm.onrender.com';
      savedMediaUrl = `${serverHost}${savedMediaUrl}`;
    }

    if (this.client && this.status === 'connected') {
      try {
        const peer = await this.resolvePeer(toTgIdOrUsername);
        const fileObj = new CustomFile(finalFileName, buffer.length, '', buffer);
        const sendOptions: any = {
          file: fileObj,
          caption: caption || (isVoice ? undefined : finalFileName)
        };

        const isVideo = mimeType.startsWith('video/') || finalFileName.toLowerCase().endsWith('.mp4') || finalFileName.toLowerCase().endsWith('.mov') || finalFileName.toLowerCase().endsWith('.webm');

        if (isVoice) {
          sendOptions.voiceNote = true;
          sendOptions.attributes = [
            new Api.DocumentAttributeAudio({
              voice: true,
              duration: 0,
              title: 'Voice Message',
              performer: 'CRM'
            })
          ];
        } else if (isVideo) {
          sendOptions.mimeType = mimeType || 'video/mp4';
          sendOptions.supportsStreaming = true;
          sendOptions.attributes = [
            new Api.DocumentAttributeVideo({
              duration: 0,
              w: 1280,
              h: 720,
              supportsStreaming: true
            })
          ];
        } else if (mimeType === 'application/pdf' || finalFileName.toLowerCase().endsWith('.pdf')) {
          sendOptions.mimeType = 'application/pdf';
          sendOptions.attributes = [
            new Api.DocumentAttributeFilename({
              fileName: finalFileName
            })
          ];
        }

        await this.client.sendFile(peer, sendOptions);
      } catch (err: any) {
        console.warn('⚠️ [Telegram] Warning sending MTProto file (media safely persisted in Cloudinary & CRM):', err?.message || err);
      }
    } else {
      console.warn('⚠️ [Telegram] Client not connected, media stored in CRM inbox');
    }

    const isVideoMsg = mimeType.startsWith('video/') || finalFileName.toLowerCase().endsWith('.mp4') || finalFileName.toLowerCase().endsWith('.mov') || finalFileName.toLowerCase().endsWith('.webm');

    const fileLabel = isVoice
      ? `🎤 Голосове повідомлення (${caption || 'аудіо'})`
      : (isVideoMsg ? `🎥 Відео TG: ${finalFileName}${caption ? ` — ${caption}` : ''}` : `📎 Файл TG: ${finalFileName}${caption ? ` — ${caption}` : ''}`);

    const savedMsg = await this.prisma.chatMessage.create({
      data: {
        channel: 'telegram',
        direction: 'outgoing',
        dealId,
        contactId,
        senderTgId: toTgIdOrUsername,
        text: fileLabel,
        mediaUrl: savedMediaUrl,
        mediaType: isVoice ? 'audio' : (mimeType.startsWith('image/') ? 'image' : (isVideoMsg ? 'video' : (mimeType === 'application/pdf' ? 'pdf' : 'document'))),
        status: 'sent'
      }
    });

    if (this.io) {
      this.io.emit('new_message', savedMsg);
    }

    return savedMsg;
  }

  public async handleIncomingMessage(
    username: string,
    fullName: string,
    text: string,
    tgId?: string,
    mediaUrl?: string,
    mediaType?: string
  ) {
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

      const formattedTg = username.startsWith('@') 
        ? username 
        : (username.startsWith('tg_') || cleanPhone.length >= 7 ? username : `@${username}`);

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
          title: `Запит Telegram: ${contact.name}`,
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
          mediaUrl: mediaUrl || null,
          mediaType: mediaType || null,
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
          sessionPayload: sessionStr || null,
          accountName: accountName || 'Telegram Користувач',
          phone: phone || null
        },
        update: {
          status: this.status,
          qrCodeData: sessionStr !== undefined ? sessionStr : undefined,
          sessionPayload: sessionStr !== undefined ? sessionStr : undefined,
          accountName: accountName !== undefined ? accountName : undefined,
          phone: phone !== undefined ? phone : undefined
        }
      });
    } catch (e) {}
  }
}
