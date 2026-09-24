import { PrismaClient } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';
import QRCode from 'qrcode';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { LeadDistributionService } from './lead-distribution.service';
import { CloudinaryService } from './cloudinary.service';
import { AudioConverterService } from './audio-converter.service';

export class WhatsAppService {
  private io: SocketIOServer | null = null;
  private prisma: PrismaClient;
  private distributionService: LeadDistributionService;
  private qrCode: string | null = null;
  private status: 'disconnected' | 'qr_ready' | 'connecting' | 'connected' = 'qr_ready';
  private sock: any = null;
  private accountPhone: string | null = null;
  private authDir: string;
  private lineStatus: {
    isBusy: boolean;
    channel: string;
    activeCaller?: string;
    activeManager?: string;
    startedAt?: string;
  } = {
    isBusy: false,
    channel: 'whatsapp'
  };

  private recentSentMessages = new Map<string, number>();
  private backupDebounceTimer: NodeJS.Timeout | null = null;
  private activeCalls = new Map<string, {
    callId: string;
    from: string;
    startTime: number;
    dealId?: string;
    responsibleId?: string;
    contactName?: string;
    isAnswered?: boolean;
    isEnded?: boolean;
  }>();

  public getLineStatus() {
    return this.lineStatus;
  }

  public setLineStatus(isBusy: boolean, managerName?: string, callerPhone?: string) {
    this.lineStatus = {
      isBusy,
      channel: 'whatsapp',
      activeManager: managerName || (isBusy ? 'Менеджер' : undefined),
      activeCaller: callerPhone,
      startedAt: isBusy ? (this.lineStatus.startedAt || new Date().toISOString()) : undefined
    };
    if (this.io) {
      this.io.emit('line_status_update', {
        whatsapp: this.lineStatus
      });
    }
  }

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

  public normalizePhone(phone: string): string {
    let digits = String(phone || '').replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('0')) {
      digits = '38' + digits; // 0971234567 -> 380971234567
    } else if (digits.length === 9) {
      digits = '380' + digits; // 971234567 -> 380971234567
    }
    return digits;
  }

  public async resolveLidToPhone(lidUser: string): Promise<string | null> {
    const cleanLid = String(lidUser || '').replace(/\D/g, '');
    if (!cleanLid) return null;
    try {
      const reverseFilePath = path.join(this.authDir, `lid-mapping-${cleanLid}_reverse.json`);
      if (fs.existsSync(reverseFilePath)) {
        const val = fs.readFileSync(reverseFilePath, 'utf8');
        return val.replace(/"/g, '').trim();
      }

      const session = await this.prisma.messengerSession.findUnique({ where: { channel: 'whatsapp' } });
      if (session?.sessionPayload) {
        const payload = JSON.parse(session.sessionPayload);
        const files = payload.files || {};
        const targetKey = `lid-mapping-${cleanLid}_reverse.json`;
        if (files[targetKey]) {
          const val = Buffer.from(files[targetKey], 'base64').toString('utf8');
          return val.replace(/"/g, '').trim();
        }
      }
    } catch (e) {
      console.warn('resolveLidToPhone error:', e);
    }
    return null;
  }

  public async resolvePhoneToLid(phone: string): Promise<string | null> {
    const cleanPhone = this.normalizePhone(phone);
    if (!cleanPhone) return null;
    try {
      const forwardFilePath = path.join(this.authDir, `lid-mapping-${cleanPhone}.json`);
      if (fs.existsSync(forwardFilePath)) {
        const val = fs.readFileSync(forwardFilePath, 'utf8');
        return val.replace(/"/g, '').trim();
      }

      const session = await this.prisma.messengerSession.findUnique({ where: { channel: 'whatsapp' } });
      if (session?.sessionPayload) {
        const payload = JSON.parse(session.sessionPayload);
        const files = payload.files || {};
        const targetKey = `lid-mapping-${cleanPhone}.json`;
        if (files[targetKey]) {
          const val = Buffer.from(files[targetKey], 'base64').toString('utf8');
          return val.replace(/"/g, '').trim();
        }
      }
    } catch (e) {
      console.warn('resolvePhoneToLid error:', e);
    }
    return null;
  }

  private markMessageAsSentLocally(cleanPhone: string, text: string) {
    const key = `${cleanPhone}:${text.trim()}`;
    this.recentSentMessages.set(key, Date.now());
    const now = Date.now();
    for (const [k, time] of this.recentSentMessages.entries()) {
      if (now - time > 120000) {
        this.recentSentMessages.delete(k);
      }
    }
  }

  private isMessageRecentlySentLocally(cleanPhone: string, text: string): boolean {
    const key = `${cleanPhone}:${text.trim()}`;
    const timestamp = this.recentSentMessages.get(key);
    if (!timestamp) return false;
    return (Date.now() - timestamp) < 60000;
  }

  public async restoreSessionFromDatabase() {
    try {
      const session = await this.prisma.messengerSession.findUnique({
        where: { channel: 'whatsapp' }
      });
      if (session?.sessionPayload) {
        const data = JSON.parse(session.sessionPayload);
        if (data && data.files && typeof data.files === 'object') {
          if (!fs.existsSync(this.authDir)) {
            fs.mkdirSync(this.authDir, { recursive: true });
          }
          const fileNames = Object.keys(data.files);
          for (const fn of fileNames) {
            const base64 = data.files[fn];
            if (base64) {
              const filePath = path.join(this.authDir, fn);
              fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
            }
          }
          console.log(`✅ [WhatsApp] Успішно відновлено ${fileNames.length} файлів авторизації з бази даних PostgreSQL (Neon).`);
          if (session.phone) {
            this.accountPhone = session.phone;
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ [WhatsApp] Не вдалося відновити сесію з бази даних:', e);
    }
  }

  public queueSessionBackup() {
    if (this.backupDebounceTimer) clearTimeout(this.backupDebounceTimer);
    this.backupDebounceTimer = setTimeout(() => {
      this.backupSessionToDatabase().catch(e => {
        console.warn('⚠️ [WhatsApp] Фонове збереження сесії в БД не вдалося:', e);
      });
    }, 1500);
  }

  public async backupSessionToDatabase() {
    try {
      if (!fs.existsSync(this.authDir)) return;
      const files = fs.readdirSync(this.authDir);
      if (files.length === 0) return;

      const fileMap: Record<string, string> = {};
      for (const f of files) {
        const fullPath = path.join(this.authDir, f);
        if (fs.statSync(fullPath).isFile()) {
          fileMap[f] = fs.readFileSync(fullPath).toString('base64');
        }
      }

      await this.prisma.messengerSession.upsert({
        where: { channel: 'whatsapp' },
        create: {
          channel: 'whatsapp',
          status: this.status,
          sessionPayload: JSON.stringify({ files: fileMap }),
          phone: this.accountPhone,
          accountName: 'Корпоративний WhatsApp Business'
        },
        update: {
          status: this.status,
          sessionPayload: JSON.stringify({ files: fileMap }),
          phone: this.accountPhone || undefined,
          updatedAt: new Date()
        }
      });
      console.log(`💾 [WhatsApp] Збережено ${files.length} ключів сесії в постійну базу даних Neon PostgreSQL.`);
    } catch (e) {
      console.warn('⚠️ [WhatsApp] Помилка синхронізації сесії в PostgreSQL:', e);
    }
  }

  public async initialize() {
    await this.restoreSessionFromDatabase();
    this.startBaileysSocket().catch((e) => {
      console.warn('Baileys initial connect fallback:', e);
    });
  }

  public async startBaileysSocket() {
    try {
      if (this.sock) {
        try {
          this.sock.ev.removeAllListeners('connection.update');
          this.sock.ev.removeAllListeners('creds.update');
          this.sock.ev.removeAllListeners('messages.upsert');
          this.sock.end(undefined);
        } catch (e) {}
        this.sock = null;
      }

      // Check if session directory has creds.json; if not, attempt DB restore
      if (!fs.existsSync(path.join(this.authDir, 'creds.json'))) {
        await this.restoreSessionFromDatabase();
      }

      const baileys = await import('@whiskeysockets/baileys');
      const makeWASocket = baileys.default || baileys.makeWASocket;
      const { useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = baileys;

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

      this.sock.ev.on('creds.update', async () => {
        await saveCreds();
        this.queueSessionBackup();
      });

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
          const isLoggedOut = statusCode === DisconnectReason.loggedOut;
          this.status = 'disconnected';
          this.broadcastStatus();

          if (isLoggedOut) {
            console.log('🚪 [WhatsApp] Сесія завершена або відкликана пристроєм. Очищення ключів авторизації...');
            this.qrCode = null;
            if (fs.existsSync(this.authDir)) {
              fs.rmSync(this.authDir, { recursive: true, force: true });
            }
            await this.prisma.messengerSession.update({
              where: { channel: 'whatsapp' },
              data: {
                status: 'disconnected',
                sessionPayload: null,
                qrCodeData: null,
                phone: null
              }
            }).catch(() => {});
            setTimeout(() => this.startBaileysSocket(), 1500);
          } else {
            console.log(`🔄 [WhatsApp] З'єднання розірвано (код: ${statusCode}). Перепідключення через 3с...`);
            setTimeout(() => this.startBaileysSocket(), 3000);
          }
        } else if (connection === 'open') {
          this.status = 'connected';
          this.qrCode = null;
          const userJid = this.sock?.user?.id || '';
          this.accountPhone = userJid.split(':')[0] || userJid.split('@')[0] || '+380734277174';
          this.broadcastStatus();
          await this.persistSession('Корпоративний WhatsApp Business', `+${this.normalizePhone(this.accountPhone)}`);
          await this.backupSessionToDatabase();
        }
      });

      this.sock.ev.on('messages.upsert', async (m: any) => {
        try {
          if (!m.messages || m.messages.length === 0) return;

          for (const msg of m.messages) {
            if (msg.messageStubType) continue;

            const remoteJid = msg.key?.remoteJid || '';
            if (remoteJid === 'status@broadcast') continue;

            const isLid = remoteJid.endsWith('@lid');
            const rawDigits = remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '').replace('@g.us', '').split(':')[0];
            let cleanPhone = this.normalizePhone(rawDigits);

            if (isLid) {
              const realPhone = await this.resolveLidToPhone(rawDigits);
              if (realPhone) {
                cleanPhone = this.normalizePhone(realPhone);
              }
            }

            const isFromMe = !!msg.key?.fromMe;

            const content = msg.message;
            let text = '';
            let mediaUrl: string | undefined;
            let mediaType: string | undefined;

            if (content) {
              text = content.conversation ||
                content.extendedTextMessage?.text ||
                content.imageMessage?.caption ||
                content.videoMessage?.caption ||
                content.documentMessage?.caption ||
                content.ephemeralMessage?.message?.conversation ||
                content.ephemeralMessage?.message?.extendedTextMessage?.text ||
                '';

              // Download media if message has photo/video/audio/document
              if (content.imageMessage || content.audioMessage || content.documentMessage || content.videoMessage) {
                try {
                  const mediaBuffer = await downloadMediaMessage(
                    msg,
                    'buffer',
                    {},
                    {
                      logger: pino({ level: 'silent' }),
                      reuploadRequest: this.sock?.updateMediaMessage
                    }
                  );

                  if (mediaBuffer && Buffer.isBuffer(mediaBuffer) && mediaBuffer.length > 0) {
                    let fileName = `wa_media_${Date.now()}`;
                    let mimeType = 'application/octet-stream';

                    if (content.imageMessage) {
                      fileName = `photo_${Date.now()}.jpg`;
                      mimeType = content.imageMessage.mimetype || 'image/jpeg';
                      mediaType = 'image';
                      if (!text) text = '📷 [Зображення]';
                    } else if (content.audioMessage) {
                      fileName = `voice_${Date.now()}.ogg`;
                      mimeType = content.audioMessage.mimetype || 'audio/ogg';
                      mediaType = 'audio';
                      if (!text) text = '🎤 [Голосове повідомлення]';
                    } else if (content.documentMessage) {
                      fileName = content.documentMessage.fileName || `document_${Date.now()}.pdf`;
                      mimeType = content.documentMessage.mimetype || 'application/pdf';
                      mediaType = fileName.toLowerCase().endsWith('.pdf') || mimeType === 'application/pdf' ? 'pdf' : 'other';
                      if (!text) text = `📄 [Документ] ${fileName}`;
                    } else if (content.videoMessage) {
                      fileName = `video_${Date.now()}.mp4`;
                      mimeType = content.videoMessage.mimetype || 'video/mp4';
                      mediaType = 'video';
                      if (!text) text = content.videoMessage.caption ? `🎥 ${content.videoMessage.caption}` : '🎥 [Відеоповідомлення]';
                    }

                    let uploaded = await CloudinaryService.uploadBuffer(mediaBuffer, fileName, mimeType);
                    if (uploaded.startsWith('/api/uploads')) {
                      const serverHost = process.env.RENDER_EXTERNAL_URL || 'https://online-crm.onrender.com';
                      uploaded = `${serverHost}${uploaded}`;
                    }
                    mediaUrl = uploaded;
                  }
                } catch (dlErr) {
                  console.warn('Error downloading WhatsApp media:', dlErr);
                }
              }
            }

            if (!text && content) {
              if (content.imageMessage) text = '📷 [Зображення]';
              else if (content.documentMessage) text = '📄 [Документ / Резюме / КП]';
              else if (content.audioMessage) text = '🎤 [Голосове повідомлення]';
              else if (content.videoMessage) text = '🎥 [Відеовізитка]';
            }

            if (!text && !mediaUrl) continue;

            // Anti-Duplication: If this was sent by CRM recently, do not duplicate in ChatMessage!
            if (isFromMe) {
              if (this.isMessageRecentlySentLocally(cleanPhone, text)) {
                continue;
              }
              const myPhone = this.normalizePhone(this.accountPhone || '');
              if (myPhone && cleanPhone === myPhone) {
                continue; // Do not record messages to own self
              }
            }

            const pushName = msg.pushName || (isFromMe ? 'Менеджер' : `Клієнт (+${cleanPhone})`);
            await this.processIncomingOrOutgoingMessage(cleanPhone, pushName, text, isFromMe, mediaUrl, mediaType, msg.key?.id);
          }
        } catch (err) {
          console.error('Error handling WhatsApp message upsert:', err);
        }
      });

      // Handle real incoming audio / video calls on WhatsApp (Deduplicated with exact time & status)
      this.sock.ev.on('call', async (callEvents: any) => {
        try {
          if (!callEvents || !Array.isArray(callEvents)) return;
          for (const call of callEvents) {
            const rawPhone = (call.from || '').split('@')[0].split(':')[0].replace(/\D/g, '');
            if (!rawPhone) continue;
            const formattedPhone = `+${rawPhone}`;
            const callId = String(call.id || `${rawPhone}_${call.date ? new Date(call.date).getTime() : Date.now()}`);

            // 1. In-memory deduplication cache check
            const now = Date.now();
            for (const [id, s] of this.activeCalls.entries()) {
              if (now - s.startTime > 600000) this.activeCalls.delete(id);
            }

            let callState = this.activeCalls.get(callId);
            if (!callState) {
              callState = {
                callId,
                from: formattedPhone,
                startTime: call.date ? new Date(call.date).getTime() : now,
                isAnswered: false,
                isEnded: false
              };
              this.activeCalls.set(callId, callState);
            }

            // If call has already finalized, skip duplicate webhook triggers (terminate/reject loop)
            if (callState.isEnded) {
              continue;
            }

            // 2. Find or associate Deal & Contact
            let deal: any = null;
            let responsibleId = 'usr-admin';
            let contactName = `Клієнт (${formattedPhone})`;

            if (callState.dealId) {
              deal = await this.prisma.deal.findUnique({
                where: { id: callState.dealId },
                include: { contact: true, stage: true, responsible: true }
              });
              responsibleId = callState.responsibleId || deal?.responsibleId || 'usr-admin';
              contactName = callState.contactName || deal?.contact?.name || contactName;
            } else {
              const contact = await this.prisma.contact.findFirst({
                where: {
                  OR: [
                    { phone: { contains: rawPhone } },
                    { whatsapp: { contains: rawPhone } },
                    { phone2: { contains: rawPhone } }
                  ]
                },
                include: { deals: { include: { stage: true, responsible: true } } }
              });

              deal = contact?.deals?.[0];
              responsibleId = deal?.responsibleId || 'usr-admin';
              contactName = contact?.name || contactName;

              if (!deal) {
                const newContact = contact || await this.prisma.contact.create({
                  data: {
                    name: `Клієнт (${formattedPhone})`,
                    phone: formattedPhone,
                    whatsapp: formattedPhone,
                    position: 'Вхідний дзвінок'
                  }
                });
                contactName = newContact.name;

                const newDeal = await this.distributionService.processInboundLead({
                  title: `Вхідний дзвінок: ${newContact.name}`,
                  contactId: newContact.id,
                  channel: 'whatsapp',
                  text: 'Вхідний аудіо-виклик WhatsApp'
                });
                if (newDeal) {
                  deal = newDeal as any;
                  responsibleId = newDeal.responsibleId;
                }
              }

              if (deal) {
                callState.dealId = deal.id;
                callState.responsibleId = responsibleId;
                callState.contactName = contactName;
              }
            }

            const isOffer = call.status === 'offer' || call.status === 'ringing';
            const isAccept = call.status === 'accept';
            const isTerminated = call.status === 'terminate' || call.status === 'reject' || call.status === 'timeout';

            if (isOffer) {
              if (this.lineStatus.isBusy) {
                if (!callState.isAnswered && !callState.isEnded) {
                  this.sendMessage(rawPhone, 'Вітаємо! Корпоративна лінія наразі зайнята розмовою з іншим клієнтом. Ваш персональний менеджер уже бачить ваш дзвінок і перетелефонує вам рівно за 2 хвилини! Якщо питання термінове — напишіть повідомлення або надішліть голосове тут.').catch(() => {});
                }
              } else {
                this.setLineStatus(true, 'Вхідний виклик', formattedPhone);
              }

              if (this.io) {
                this.io.emit('incoming_call', {
                  channel: 'whatsapp',
                  callerPhone: formattedPhone,
                  callerName: contactName,
                  dealId: deal?.id,
                  dealTitle: deal?.title,
                  stageName: deal?.stage?.name || 'Етап',
                  responsibleId,
                  callId,
                  isVideo: !!call.isVideo,
                  timestamp: new Date(callState.startTime).toISOString()
                });
              }
            } else if (isAccept) {
              callState.isAnswered = true;
              this.setLineStatus(true, 'Розмова', formattedPhone);
            } else if (isTerminated) {
              callState.isEnded = true;
              this.setLineStatus(false);

              const callStartTime = callState.startTime;
              const callEndTime = Date.now();
              const durationSec = callState.isAnswered ? Math.max(1, Math.round((callEndTime - callStartTime) / 1000)) : 0;
              const isMissed = !callState.isAnswered || call.status === 'timeout' || call.status === 'reject';

              const m = Math.floor(durationSec / 60);
              const s = durationSec % 60;
              const durationStr = isMissed ? 'Пропущений' : (m === 0 ? `${s} сек` : `${m} хв ${s} сек`);

              const callDateObj = new Date(callStartTime);
              const exactTimeStr = callDateObj.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const exactDateStr = callDateObj.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });

              if (deal) {
                // Check if a note for this callId already exists in DB to prevent race condition duplicates
                const alreadyCreatedNote = await this.prisma.dealNote.findFirst({
                  where: {
                    dealId: deal.id,
                    type: 'call_record',
                    metadata: { contains: callId }
                  }
                });

                if (!alreadyCreatedNote) {
                  const noteContent = isMissed
                    ? `🚨 Пропущений вхідний дзвінок WhatsApp від ${contactName} (${formattedPhone}) о ${exactTimeStr} (${exactDateStr})`
                    : `📥 Вхідний дзвінок WhatsApp від ${contactName} (${formattedPhone}) о ${exactTimeStr} • ${durationStr}`;

                  const createdNote = await this.prisma.dealNote.create({
                    data: {
                      dealId: deal.id,
                      userId: responsibleId,
                      type: 'call_record',
                      content: noteContent,
                      metadata: JSON.stringify({
                        callId,
                        channel: 'whatsapp',
                        direction: 'inbound',
                        status: isMissed ? 'missed' : 'answered',
                        duration: durationSec,
                        durationStr,
                        startedAt: new Date(callStartTime).toISOString(),
                        endedAt: new Date(callEndTime).toISOString(),
                        formattedPhone,
                        phoneNumber: formattedPhone,
                        callerName: contactName,
                        isVideo: !!call.isVideo
                      })
                    },
                    include: { user: true }
                  });

                  // Update deal tags and title
                  let currentTags: string[] = [];
                  try {
                    currentTags = deal.tags ? (typeof deal.tags === 'string' ? JSON.parse(deal.tags) : deal.tags) : [];
                  } catch {}
                  currentTags = currentTags.filter((t: string) => !t.includes('сек') && !t.includes('хв') && t !== 'Пропущений');
                  if (!currentTags.includes('WhatsApp Дзвінок')) currentTags.unshift('WhatsApp Дзвінок');
                  if (!currentTags.includes('Вхідний')) currentTags.push('Вхідний');
                  currentTags.push(durationStr);

                  let newTitle = deal.title;
                  if (deal.title.startsWith('Вхідний дзвінок') || deal.title.startsWith('📞') || deal.title.startsWith('🚨')) {
                    newTitle = isMissed ? `🚨 Пропущений WhatsApp: ${formattedPhone}` : `📞 Вхідний WhatsApp: ${formattedPhone} (${durationStr})`;
                  }

                  const updatedDeal = await this.prisma.deal.update({
                    where: { id: deal.id },
                    data: {
                      title: newTitle,
                      updatedAt: new Date(),
                      tags: JSON.stringify(currentTags)
                    },
                    include: { contact: true, stage: true, responsible: true }
                  });

                  if (this.io) {
                    this.io.emit('deal_note_added', createdNote);
                    this.io.emit('deal_updated', updatedDeal);
                    this.io.emit('call_logged', {
                      callId,
                      channel: 'whatsapp',
                      dealId: deal.id,
                      phoneNumber: formattedPhone,
                      formattedPhone,
                      direction: 'inbound',
                      duration: durationSec,
                      durationStr,
                      isMissed,
                      startedAt: new Date(callStartTime).toISOString()
                    });
                  }

                  if (isMissed) {
                    const task = await this.prisma.task.create({
                      data: {
                        dealId: deal.id,
                        responsibleId,
                        createdById: responsibleId,
                        type: 'call',
                        text: `🔥 ТЕРМІНОВО: Пропущений дзвінок WhatsApp від ${contactName} (${formattedPhone}) о ${exactTimeStr}!`,
                        dueDate: new Date(Date.now() + 5 * 60 * 1000)
                      },
                      include: { responsible: true }
                    });
                    if (this.io) {
                      this.io.emit('task_created', task);
                    }
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error('Error handling WhatsApp call event:', err);
        }
      });

      // Handle WhatsApp real-time message status updates (Delivered / Read receipts - Blue ticks)
      this.sock.ev.on('messages.update', async (updates: any) => {
        try {
          if (!updates || !Array.isArray(updates)) return;
          for (const u of updates) {
            if (!u.key?.id) continue;
            const statusNum = u.update?.status;
            let newStatus: 'sent' | 'delivered' | 'read' | null = null;
            if (statusNum === 2) newStatus = 'sent';
            else if (statusNum === 3) newStatus = 'delivered';
            else if (statusNum === 4 || statusNum === 5) newStatus = 'read';

            if (newStatus) {
              await this.prisma.chatMessage.updateMany({
                where: { externalMsgId: u.key.id },
                data: { status: newStatus }
              });

              if (this.io) {
                this.io.emit('message_status_updated', {
                  externalMsgId: u.key.id,
                  status: newStatus,
                  channel: 'whatsapp'
                });
              }
            }
          }
        } catch (updateErr) {
          console.warn('Error handling WhatsApp messages.update:', updateErr);
        }
      });

      // Handle WhatsApp delivery & read receipts (message-receipt.update)
      this.sock.ev.on('message-receipt.update', async (receipts: any) => {
        try {
          if (!receipts || !Array.isArray(receipts)) return;
          for (const r of receipts) {
            const extId = r.key?.id;
            if (!extId) continue;
            const isRead = !!r.receipt?.readTimestamp || !!r.receipt?.playedTimestamp;
            const isDelivered = !isRead && !!r.receipt?.receiptTimestamp;
            const newStatus = isRead ? 'read' : (isDelivered ? 'delivered' : null);

            if (newStatus) {
              await this.prisma.chatMessage.updateMany({
                where: { externalMsgId: extId },
                data: { status: newStatus }
              });

              if (this.io) {
                this.io.emit('message_status_updated', {
                  externalMsgId: extId,
                  status: newStatus,
                  channel: 'whatsapp'
                });
              }
            }
          }
        } catch (receiptErr) {
          console.warn('Error handling WhatsApp message-receipt.update:', receiptErr);
        }
      });
    } catch (err) {
      console.warn('Baileys running in resilient mode:', err);
    }
  }

  public async processIncomingOrOutgoingMessage(
    cleanPhone: string,
    pushName: string,
    text: string,
    isFromMe: boolean,
    mediaUrl?: string,
    mediaType?: string,
    externalMsgId?: string
  ) {
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
            name: (!isFromMe && pushName && !pushName.startsWith('Клієнт (+') && !pushName.startsWith('+')) ? pushName : `Клієнт (+${cleanPhone})`,
            phone: formattedPhone,
            whatsapp: formattedPhone,
            position: 'Клієнт (WhatsApp)'
          }
        });
      } else if (!isFromMe && pushName && !pushName.startsWith('Клієнт (+') && !pushName.startsWith('+')) {
        // If contact had a placeholder name, upgrade it with real client WhatsApp name
        if (!contact.name || contact.name.startsWith('Клієнт (+') || contact.name.startsWith('+') || contact.name === 'Новий лід') {
          contact = await this.prisma.contact.update({
            where: { id: contact.id },
            data: { name: pushName }
          });
        }
      }

      let deal = await this.prisma.deal.findFirst({
        where: { contactId: contact.id, isDeleted: false },
        orderBy: { updatedAt: 'desc' }
      });

      // Auto-restore deal if it was soft-deleted
      if (!deal) {
        const deletedDeal = await this.prisma.deal.findFirst({
          where: { contactId: contact.id, isDeleted: true },
          orderBy: { updatedAt: 'desc' }
        });
        if (deletedDeal) {
          deal = await this.prisma.deal.update({
            where: { id: deletedDeal.id },
            data: { isDeleted: false, deletedAt: null }
          });
        }
      }

      // If new lead from WhatsApp -> Auto-Distribute via Round-Robin to CRM Leads Funnel!
      if (!deal) {
        deal = await this.distributionService.processInboundLead({
          title: `Запит WhatsApp: ${contact.name}`,
          contactId: contact.id,
          channel: 'whatsapp',
          text,
          budget: 0
        }) || null;
      }

      const senderDisplayName = isFromMe ? 'Менеджер' : (pushName || contact.name || `Клієнт (+${cleanPhone})`);

      const savedMsg = await this.prisma.chatMessage.create({
        data: {
          channel: 'whatsapp',
          direction: isFromMe ? 'outgoing' : 'incoming',
          dealId: deal?.id,
          contactId: contact.id,
          senderName: senderDisplayName,
          senderPhone: cleanPhone,
          text,
          mediaUrl: mediaUrl || null,
          mediaType: mediaType || null,
          status: 'sent',
          externalMsgId: externalMsgId || null
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

          if (deal) {
            // Digital Pipeline: Speed-to-lead 15-minute auto task
            const assignee = deal.responsibleId || 'usr-admin';
            this.prisma.task.create({
              data: {
                dealId: deal.id,
                responsibleId: assignee,
                createdById: assignee,
                text: `💬 Клієнт відповів у WhatsApp: "${text.slice(0, 60)}" — терміново відповісти!`,
                type: 'call',
                dueDate: new Date(Date.now() + 15 * 60 * 1000)
              }
            }).then(task => {
              if (this.io && task) this.io.emit('task_created', task);
            }).catch(() => {});
          }
        }
      }

      return savedMsg;
    } catch (e) {
      console.error('Error saving WhatsApp message:', e);
    }
  }

  public isConnected(): boolean {
    return this.status === 'connected' && !!this.sock;
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

  public async generateQR(forceRefresh: boolean = false): Promise<string | null> {
    if (this.status === 'connected') return null;

    if (forceRefresh) {
      console.log('🔄 [WhatsApp] Примусове перезавантаження сесії та генерація нового QR...');
      this.qrCode = null;
      if (fs.existsSync(this.authDir)) {
        fs.rmSync(this.authDir, { recursive: true, force: true });
      }
      await this.prisma.messengerSession.update({
        where: { channel: 'whatsapp' },
        data: { status: 'disconnected', sessionPayload: null, qrCodeData: null, phone: null }
      }).catch(() => {});
      await this.startBaileysSocket();
    } else if (!this.sock || (this.status === 'disconnected' && !this.qrCode)) {
      await this.startBaileysSocket();
    }

    if (this.qrCode) return this.qrCode;

    // Wait up to 6 seconds for Baileys to emit fresh QR code
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (this.qrCode) return this.qrCode;
      if ((this.status as string) === 'connected') return null;
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
    try {
      await this.prisma.messengerSession.update({
        where: { channel: 'whatsapp' },
        data: {
          status: 'disconnected',
          sessionPayload: null,
          qrCodeData: null,
          phone: null
        }
      });
      console.log('🧹 [WhatsApp] Сесію повністю видалено з PostgreSQL бази даних.');
    } catch (e) {}
    this.broadcastStatus();
    setTimeout(() => this.startBaileysSocket(), 2000);
  }

  public async sendMessage(toPhone: string, text: string, dealId?: string, contactId?: string) {
    const cleanPhone = this.normalizePhone(toPhone);
    if (!cleanPhone || cleanPhone.length < 9) {
      throw new Error('Некоректний номер телефону для відправки WhatsApp (занадто короткий)');
    }

    if (!this.sock || this.status !== 'connected') {
      throw new Error('WhatsApp не підключений до CRM або відновлює з’єднання. Перевірте статус у розділі "Шлюз"');
    }

    let targetJid: string;
    if (toPhone.includes('@lid')) {
      targetJid = toPhone;
    } else {
      const knownLid = await this.resolvePhoneToLid(cleanPhone);
      if (knownLid) {
        targetJid = `${knownLid}@lid`;
      } else if (cleanPhone.length >= 14 && (cleanPhone.startsWith('1') || cleanPhone.startsWith('2'))) {
        targetJid = `${cleanPhone}@lid`;
      } else {
        targetJid = `${cleanPhone}@s.whatsapp.net`;
        try {
          const results = await this.sock.onWhatsApp(cleanPhone);
          if (Array.isArray(results) && results.length > 0 && results[0]?.jid) {
            targetJid = results[0].jid;
          }
        } catch (onErr) {
          console.warn('onWhatsApp resolution check warning in sendMessage:', onErr);
        }
      }
    }

    this.markMessageAsSentLocally(cleanPhone, text);

    let extMsgId: string | null = null;
    try {
      const sentMsg = await this.sock.sendMessage(targetJid, { text });
      if (sentMsg?.key?.id) {
        extMsgId = sentMsg.key.id;
      }
    } catch (err: any) {
      console.error('Error sending text via WhatsApp socket:', err);
      throw new Error(`Помилка надсилання в WhatsApp: ${err.message || 'Збій передачі'}`);
    }

    const savedMsg = await this.prisma.chatMessage.create({
      data: {
        channel: 'whatsapp',
        direction: 'outgoing',
        dealId,
        contactId,
        senderPhone: cleanPhone,
        text,
        status: 'sent',
        externalMsgId: extMsgId
      }
    });

    if (this.io) {
      this.io.emit('new_message', savedMsg);
    }

    return savedMsg;
  }

  public async sendFile(toPhone: string, fileBase64: string, fileName: string, mimeType: string, caption?: string, dealId?: string, contactId?: string) {
    const cleanPhone = this.normalizePhone(toPhone);
    if (!cleanPhone || cleanPhone.length < 9) {
      throw new Error('Некоректний номер телефону для відправки файлу в WhatsApp');
    }

    if (!this.sock || this.status !== 'connected') {
      throw new Error('WhatsApp не підключений. Відскануйте QR-код для надсилання файлів.');
    }

    let finalFileName = fileName;
    if (mimeType === 'application/pdf' && !finalFileName.toLowerCase().endsWith('.pdf')) {
      finalFileName = `${finalFileName}.pdf`;
    }

    let buffer = Buffer.from(fileBase64.replace(/^data:.*?;base64,/, ''), 'base64');
    const isVoice = mimeType.startsWith('audio/') || finalFileName.includes('Voice_Note');
    const isVideo = mimeType.startsWith('video/') || finalFileName.toLowerCase().endsWith('.mp4') || finalFileName.toLowerCase().endsWith('.mov') || finalFileName.toLowerCase().endsWith('.webm');

    if (isVoice) {
      buffer = Buffer.from((await AudioConverterService.ensureOggOpus(buffer)) as any);
      finalFileName = `voice_${Date.now()}.ogg`;
    }
    
    let targetJid: string;
    if (toPhone.includes('@lid')) {
      targetJid = toPhone;
    } else {
      const knownLid = await this.resolvePhoneToLid(cleanPhone);
      if (knownLid) {
        targetJid = `${knownLid}@lid`;
      } else if (cleanPhone.length >= 14 && (cleanPhone.startsWith('1') || cleanPhone.startsWith('2'))) {
        targetJid = `${cleanPhone}@lid`;
      } else {
        targetJid = `${cleanPhone}@s.whatsapp.net`;
        try {
          const results = await this.sock.onWhatsApp(cleanPhone);
          if (Array.isArray(results) && results.length > 0 && results[0]?.jid) {
            targetJid = results[0].jid;
          }
        } catch (onErr) {
          console.warn('onWhatsApp resolution check warning in sendFile:', onErr);
        }
      }
    }

    this.markMessageAsSentLocally(cleanPhone, caption || finalFileName);

    let extMsgId: string | undefined;
    try {
      let sentMsg: any = null;
      if (mimeType.startsWith('image/')) {
        sentMsg = await this.sock.sendMessage(targetJid, {
          image: buffer,
          caption: caption || finalFileName
        });
      } else if (mimeType.startsWith('audio/') || isVoice) {
        sentMsg = await this.sock.sendMessage(targetJid, {
          audio: buffer,
          mimetype: 'audio/ogg; codecs=opus',
          ptt: true
        });
      } else if (isVideo) {
        sentMsg = await this.sock.sendMessage(targetJid, {
          video: buffer,
          caption: caption || finalFileName,
          mimetype: mimeType || 'video/mp4'
        });
      } else {
        sentMsg = await this.sock.sendMessage(targetJid, {
          document: buffer,
          mimetype: mimeType || 'application/pdf',
          fileName: finalFileName,
          caption: caption || finalFileName
        });
      }
      if (sentMsg?.key?.id) {
        extMsgId = sentMsg.key.id;
      }
    } catch (err: any) {
      console.error('Error sending file via WhatsApp:', err);
      throw new Error(`Помилка надсилання файлу в WhatsApp: ${err.message || 'Збій'}`);
    }

    // Save file to permanent Cloudinary or local Storage
    let savedMediaUrl = await CloudinaryService.uploadBuffer(buffer, finalFileName, mimeType);
    if (savedMediaUrl.startsWith('/api/uploads')) {
      const serverHost = process.env.RENDER_EXTERNAL_URL || 'https://online-crm.onrender.com';
      savedMediaUrl = `${serverHost}${savedMediaUrl}`;
    }

    const fileLabel = isVoice
      ? `🎤 Голосове повідомлення (${caption || 'аудіо'})` 
      : (isVideo ? `🎥 Відео: ${finalFileName}${caption ? ` — ${caption}` : ''}` : `📎 Файл: ${finalFileName}${caption ? ` — ${caption}` : ''}`);

    const savedMsg = await this.prisma.chatMessage.create({
      data: {
        channel: 'whatsapp',
        direction: 'outgoing',
        dealId,
        contactId,
        senderPhone: cleanPhone,
        text: fileLabel,
        mediaUrl: savedMediaUrl,
        mediaType: isVoice ? 'audio' : (mimeType.startsWith('image/') ? 'image' : (isVideo ? 'video' : 'pdf')),
        status: 'sent',
        externalMsgId: extMsgId || null
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

  public async checkNumber(phone: string): Promise<{ exists: boolean; jid?: string; phoneLink: string }> {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneLink = `https://wa.me/${cleanPhone}`;

    if (!this.sock || this.status !== 'connected') {
      return { exists: false, phoneLink };
    }

    try {
      const results = await this.sock.onWhatsApp(cleanPhone);
      if (Array.isArray(results) && results.length > 0 && results[0]?.exists) {
        return { exists: true, jid: results[0].jid, phoneLink };
      }
      return { exists: false, phoneLink };
    } catch (e) {
      console.warn('WhatsApp onWhatsApp check error:', e);
      return { exists: false, phoneLink };
    }
  }

  public async refetchMedia(chatMessageId: string): Promise<{ success: boolean; mediaUrl?: string; error?: string }> {
    if (!this.sock || this.status !== 'connected') {
      return { success: false, error: 'WhatsApp не підключений до CRM. Відскануйте QR-код або перевірте статус у розділі "Шлюз"' };
    }

    const msg = await this.prisma.chatMessage.findUnique({
      where: { id: chatMessageId },
      include: { contact: true }
    });
    if (!msg) return { success: false, error: 'Повідомлення не знайдено' };

    const phone = msg.senderPhone || msg.contact?.phone || msg.contact?.whatsapp;
    if (!phone) return { success: false, error: 'Не вказано номер телефону контакту WhatsApp' };

    // In WhatsApp, media is end-to-end encrypted on phone.
    // If the file was sent or received while phone was linked, inform manager or provide manual re-upload
    return {
      success: false,
      error: 'У WhatsApp медіафайли зберігаються на пристрої з наскрізним шифруванням. Відкрийте оригінальний чат у додатку WhatsApp або надішліть файл повторно у CRM.'
    };
  }
}
