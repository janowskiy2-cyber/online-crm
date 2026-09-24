import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';

// Configure upload storage for phone call audio recordings
const callsUploadDir = path.join(process.cwd(), 'uploads', 'calls');
if (!fs.existsSync(callsUploadDir)) {
  try {
    fs.mkdirSync(callsUploadDir, { recursive: true });
  } catch (e) {
    console.warn('Could not create calls upload dir:', e);
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, callsUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.m4a';
    const cleanName = `call_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, cleanName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max per recording
});

// In-memory registry for paired mobile devices (fast lookup)
interface PairedDevice {
  deviceToken: string;
  userId: string;
  userName: string;
  deviceName: string;
  simNumber?: string;
  operator?: string;
  appVersion?: string;
  batteryLevel?: number;
  lastPingAt: string;
}

const activeDevices = new Map<string, PairedDevice>();

/**
 * Robust phone normalization:
 * - e164: Standard E.164 (e.g. +380985457422)
 * - formatted: Professional human-friendly display (e.g. +380 (98) 545-74-22)
 * - rawDigits: Digits only
 */
export function normalizePhone(raw: string): { e164: string; formatted: string; rawDigits: string } {
  if (!raw) return { e164: '', formatted: '', rawDigits: '' };

  let cleaned = String(raw).trim();
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  const digits = cleaned.replace(/\D/g, '');

  // 1. Ukrainian number detection & formatting
  // Case A: 12 digits starting with 380 (e.g. 380981234567)
  if (digits.startsWith('380') && digits.length === 12) {
    const e164 = `+${digits}`;
    const op = digits.slice(3, 5);
    const p1 = digits.slice(5, 8);
    const p2 = digits.slice(8, 10);
    const p3 = digits.slice(10, 12);
    return { e164, formatted: `+380 (${op}) ${p1}-${p2}-${p3}`, rawDigits: digits };
  }

  // Case B: 11 digits starting with 80 (e.g. 80981234567)
  if (digits.startsWith('80') && digits.length === 11) {
    const full = `3${digits}`;
    const e164 = `+${full}`;
    const op = digits.slice(2, 4);
    const p1 = digits.slice(4, 7);
    const p2 = digits.slice(7, 9);
    const p3 = digits.slice(9, 11);
    return { e164, formatted: `+380 (${op}) ${p1}-${p2}-${p3}`, rawDigits: full };
  }

  // Case C: 10 digits starting with 0 (e.g. 0981234567, 0566099738)
  if (digits.startsWith('0') && digits.length === 10) {
    const full = `38${digits}`;
    const e164 = `+${full}`;
    const op = digits.slice(1, 3);
    const p1 = digits.slice(3, 6);
    const p2 = digits.slice(6, 8);
    const p3 = digits.slice(8, 10);
    return { e164, formatted: `+380 (${op}) ${p1}-${p2}-${p3}`, rawDigits: full };
  }

  // Case D: 9 digits without country code or leading 0 (e.g. 981234567, 566099738)
  if (digits.length === 9) {
    const full = `380${digits}`;
    const e164 = `+${full}`;
    const op = digits.slice(0, 2);
    const p1 = digits.slice(2, 5);
    const p2 = digits.slice(5, 7);
    const p3 = digits.slice(7, 9);
    return { e164, formatted: `+380 (${op}) ${p1}-${p2}-${p3}`, rawDigits: full };
  }

  // 2. Standard International number
  if (cleaned.startsWith('+')) {
    const e164 = `+${digits}`;
    return { e164, formatted: e164, rawDigits: digits };
  }

  // 3. Fallback
  const fallbackE164 = digits.length >= 10 ? `+${digits}` : (digits ? `+380${digits}` : '');
  return { e164: fallbackE164, formatted: fallbackE164, rawDigits: digits };
}

export function formatDuration(secs: number): string {
  if (!secs || secs <= 0) return '0 сек';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m === 0) return `${s} сек`;
  if (s === 0) return `${m} хв`;
  return `${m} хв ${s} сек`;
}

export function createTelephonyRouter(prisma: PrismaClient, getIo: () => SocketIOServer | null) {
  const router = Router();

  /**
   * 1. GET /api/telephony/status
   * Returns telephony system status and connected Android devices
   */
  router.get('/status', async (req, res) => {
    try {
      const devices = Array.from(activeDevices.values());
      res.json({
        status: 'online',
        service: 'Android GSM SIM Gateway',
        connectedDevicesCount: devices.length,
        devices
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch status' });
    }
  });

  /**
   * 2. GET /api/telephony/qr-pair/:userId
   * Generates a QR-code data URL for instant 1-scan mobile app pairing
   */
  router.get('/qr-pair/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ error: 'Користувача не знайдено' });
      }

      const serverUrl = process.env.VITE_API_URL || process.env.API_URL || `${req.protocol}://${req.get('host')}`;
      const payload = JSON.stringify({
        crmServer: serverUrl,
        userId: user.id,
        userName: user.name,
        timestamp: Date.now()
      });

      const qrCodeDataUrl = await QRCode.toDataURL(payload, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });

      res.json({
        userId: user.id,
        userName: user.name,
        qrCode: qrCodeDataUrl,
        rawPayload: payload
      });
    } catch (err: any) {
      console.error('Error generating telephony pair QR:', err);
      res.status(500).json({ error: 'Помилка генерації QR-коду' });
    }
  });

  /**
   * 2b. GET /api/telephony/qr-download
   * Generates a QR-code data URL for instant phone camera download of OnlineCRM-Gateway.apk
   */
  router.get('/qr-download', async (req, res) => {
    try {
      // Primary direct URL on static CDN or GitHub release
      const downloadUrl = 'https://online-crm-alpha.vercel.app/OnlineCRM-Gateway.apk';
      const fallbackUrl = 'https://github.com/janowskiy2-cyber/online-crm/releases/download/gateway-latest/OnlineCRM-Gateway.apk';

      const qrCodeDataUrl = await QRCode.toDataURL(downloadUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });

      res.json({
        downloadUrl,
        fallbackUrl,
        qrCode: qrCodeDataUrl
      });
    } catch (err: any) {
      console.error('Error generating download QR:', err);
      res.status(500).json({ error: 'Помилка генерації QR для завантаження' });
    }
  });

  /**
   * 3. POST /api/telephony/device/register
   * Mobile Android Gateway registers or pings the server
   */
  router.post('/device/register', async (req, res) => {
    try {
      const {
        userId,
        deviceToken,
        deviceName,
        simNumber,
        operator,
        appVersion,
        batteryLevel
      } = req.body;

      if (!deviceToken || !userId) {
        return res.status(400).json({ error: 'deviceToken та userId є обов’язковими' });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ error: 'Користувача не знайдено в базі CRM' });
      }

      const deviceData: PairedDevice = {
        deviceToken,
        userId: user.id,
        userName: user.name,
        deviceName: deviceName || 'Android Smartphone',
        simNumber,
        operator,
        appVersion,
        batteryLevel,
        lastPingAt: new Date().toISOString()
      };

      activeDevices.set(deviceToken, deviceData);

      const io = getIo();
      if (io) {
        io.emit('telephony_device_updated', deviceData);
      }

      res.json({
        success: true,
        message: 'Пристрій успішно підключено до CRM',
        manager: { id: user.id, name: user.name }
      });
    } catch (err: any) {
      console.error('Device register error:', err);
      res.status(500).json({ error: 'Помилка реєстрації пристрою' });
    }
  });

  /**
   * 4. POST /api/telephony/calls/log
   * Core event receiver: logs inbound/outbound calls from the Android SIM card
   */
  router.post('/calls/log', async (req, res) => {
    try {
      const {
        callId,
        deviceToken,
        managerId,
        callerPhone,
        destinationPhone,
        direction = 'outbound',
        duration = 0,
        status = 'answered', // answered, missed, rejected, busy
        simSlot = 1,
        startedAt,
        endedAt
      } = req.body;

      const targetPhone = direction === 'inbound' ? callerPhone : (destinationPhone || callerPhone);
      if (!targetPhone) {
        return res.status(400).json({ error: 'targetPhone є обов’язковим' });
      }

      let numericDuration = Number(duration) || 0;
      // If duration was sent in milliseconds (e.g. > 1000 and <= 86400000)
      if (numericDuration > 1000 && numericDuration <= 86400000) {
        numericDuration = Math.round(numericDuration / 1000);
      }
      // If duration is 0, but startedAt and endedAt are provided
      if (numericDuration === 0 && startedAt && endedAt) {
        const startMs = new Date(startedAt).getTime();
        const endMs = new Date(endedAt).getTime();
        if (!isNaN(startMs) && !isNaN(endMs) && endMs > startMs) {
          numericDuration = Math.round((endMs - startMs) / 1000);
        }
      }

      const { e164: normalizedPhone, formatted: formattedPhone, rawDigits } = normalizePhone(targetPhone);
      const searchSuffix = rawDigits.slice(-9);

      const directionLabel = direction === 'inbound' ? 'Вхідний дзвінок' : 'Вихідний дзвінок';
      const isMissed = status === 'missed' || (status === 'rejected') || (direction === 'inbound' && numericDuration === 0);
      const durationStr = isMissed ? 'Пропущений' : formatDuration(numericDuration);

      const io = getIo();

      // Resolve responsible manager
      let responsibleId = managerId;
      if (!responsibleId && deviceToken && activeDevices.has(deviceToken)) {
        responsibleId = activeDevices.get(deviceToken)!.userId;
      }
      if (!responsibleId) {
        const adminUser = await prisma.user.findFirst({ where: { role: 'super_admin' } });
        responsibleId = adminUser ? adminUser.id : 'usr-admin';
      }

      // 1. Find or auto-create Contact
      let contact = await prisma.contact.findFirst({
        where: {
          OR: [
            { phone: { contains: searchSuffix } },
            { phone2: { contains: searchSuffix } },
            { whatsapp: { contains: searchSuffix } }
          ]
        },
        include: {
          deals: {
            where: { isDeleted: false },
            orderBy: { updatedAt: 'desc' },
            take: 1
          }
        }
      });

      let activeDeal = contact?.deals?.[0];

      if (!contact) {
        const defaultPipeline = await prisma.pipeline.findFirst({
          where: { isDefault: true },
          include: { stages: { orderBy: { sortOrder: 'asc' }, take: 1 } }
        });

        const firstStageId = defaultPipeline?.stages?.[0]?.id || 'stage-default';
        const pipeId = defaultPipeline?.id || 'pipe-employers-sales';

        const dealTitle = isMissed
          ? `🚨 Пропущений: ${formattedPhone}`
          : `📞 ${directionLabel}: ${formattedPhone} (${durationStr})`;

        contact = await prisma.contact.create({
          data: {
            name: `${directionLabel} (${formattedPhone})`,
            phone: normalizedPhone,
            whatsapp: normalizedPhone
          },
          include: { deals: true }
        });

        activeDeal = await prisma.deal.create({
          data: {
            title: dealTitle,
            pipelineId: pipeId,
            stageId: firstStageId,
            responsibleId,
            contactId: contact.id,
            budget: 0,
            tags: JSON.stringify(['GSM SIM', directionLabel, durationStr])
          },
          include: {
            contact: true,
            stage: true,
            responsible: true
          }
        });

        if (io) {
          io.emit('deal_created', activeDeal);
        }
      } else {
        // Contact exists. If an active deal exists, bump updatedAt and refresh tags so it appears at top of Kanban
        if (activeDeal) {
          let currentTags: string[] = [];
          try {
            currentTags = activeDeal.tags ? (typeof activeDeal.tags === 'string' ? JSON.parse(activeDeal.tags) : activeDeal.tags) : [];
          } catch {}

          currentTags = currentTags.filter(t => !t.includes('сек') && !t.includes('хв') && t !== 'Пропущений');
          if (!currentTags.includes('GSM SIM')) currentTags.unshift('GSM SIM');
          if (!currentTags.includes(directionLabel)) currentTags.push(directionLabel);
          currentTags.push(durationStr);

          // Update title if it was an auto-generated call title
          let newTitle = activeDeal.title;
          if (activeDeal.title.startsWith('Дзвінок') || activeDeal.title.startsWith('📞') || activeDeal.title.startsWith('🚨')) {
            newTitle = isMissed 
              ? `🚨 Пропущений: ${formattedPhone}` 
              : `📞 ${directionLabel}: ${formattedPhone} (${durationStr})`;
          }

          activeDeal = await prisma.deal.update({
            where: { id: activeDeal.id },
            data: {
              title: newTitle,
              updatedAt: new Date(),
              tags: JSON.stringify(currentTags)
            },
            include: {
              contact: true,
              stage: true,
              responsible: true
            }
          });

          if (io) {
            io.emit('deal_updated', activeDeal);
          }
        }
      }

      // 2. Exact timestamp formatting
      const callDate = startedAt ? new Date(startedAt) : new Date();
      const exactTimeStr = callDate.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const exactDateStr = callDate.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });

      // Note title with exact time and direction icon
      const noteTitle = isMissed 
        ? `🚨 Пропущений ${direction === 'inbound' ? 'вхідний' : 'вихідний'} дзвінок (${formattedPhone}) о ${exactTimeStr} (${exactDateStr})`
        : `📞 ${direction === 'inbound' ? 'Вхідний' : 'Вихідний'} дзвінок з SIM-карти (${formattedPhone}) о ${exactTimeStr} • ${durationStr}`;

      // Check if a call note with this callId or matching recent phone already exists (Deduplication)
      let existingNote = null;
      if (callId) {
        existingNote = await prisma.dealNote.findFirst({
          where: {
            dealId: activeDeal.id,
            type: 'call_record',
            metadata: { contains: callId }
          }
        });
      }

      if (!existingNote && searchSuffix) {
        const twoMinutesAgo = new Date(Date.now() - 120 * 1000);
        existingNote = await prisma.dealNote.findFirst({
          where: {
            dealId: activeDeal.id,
            type: 'call_record',
            createdAt: { gte: twoMinutesAgo },
            metadata: { contains: searchSuffix }
          },
          orderBy: { createdAt: 'desc' }
        });
      }

      let note;
      if (existingNote) {
        let meta: any = {};
        try { meta = JSON.parse(existingNote.metadata || '{}'); } catch {}
        meta.callId = callId || meta.callId;
        meta.direction = direction;
        meta.duration = numericDuration || meta.duration || 0;
        meta.durationStr = durationStr;
        meta.status = isMissed ? 'missed' : status;
        meta.startedAt = startedAt || meta.startedAt || new Date().toISOString();
        meta.endedAt = endedAt || new Date().toISOString();
        meta.phoneNumber = normalizedPhone;
        meta.formattedPhone = formattedPhone;

        note = await prisma.dealNote.update({
          where: { id: existingNote.id },
          data: {
            content: noteTitle,
            metadata: JSON.stringify(meta)
          },
          include: { user: true }
        });

        if (io) {
          io.emit('deal_note_updated', note);
        }
      } else {
        note = await prisma.dealNote.create({
          data: {
            dealId: activeDeal.id,
            userId: responsibleId,
            type: 'call_record',
            content: noteTitle,
            metadata: JSON.stringify({
              callId: callId || `call-${Date.now()}`,
              direction,
              duration: numericDuration,
              durationStr,
              status: isMissed ? 'missed' : status,
              simSlot,
              phoneNumber: normalizedPhone,
              formattedPhone,
              startedAt: startedAt || new Date().toISOString(),
              endedAt: endedAt || new Date().toISOString()
            })
          },
          include: { user: true }
        });

        if (io) {
          io.emit('deal_note_added', note);
        }
      }

      // 3. If call was missed, auto-create high-priority call-back task for the manager (prevent duplicate tasks)
      if (isMissed) {
        const existingPendingTask = await prisma.task.findFirst({
          where: {
            dealId: activeDeal.id,
            isCompleted: false,
            text: { contains: formattedPhone }
          }
        });

        if (!existingPendingTask) {
          const taskDue = new Date(Date.now() + 15 * 60 * 1000); // in 15 minutes
          const task = await prisma.task.create({
            data: {
              dealId: activeDeal.id,
              responsibleId,
              createdById: responsibleId,
              type: 'call',
              text: `🔥 ТЕРМІНОВО: Передзвонити клієнту (${formattedPhone}) — пропущений дзвінок!`,
              dueDate: taskDue
            },
            include: { responsible: true }
          });

          if (io) {
            io.emit('task_created', task);
          }
        }
      }

      if (io) {
        io.emit('call_logged', {
          callId,
          dealId: activeDeal.id,
          contactId: contact.id,
          phoneNumber: normalizedPhone,
          formattedPhone,
          direction,
          duration: numericDuration,
          durationStr,
          isMissed
        });
      }

      res.json({
        success: true,
        dealId: activeDeal.id,
        contactId: contact.id,
        noteId: note.id,
        phoneNumber: normalizedPhone,
        formattedPhone,
        duration: numericDuration,
        durationStr,
        isMissed
      });
    } catch (err: any) {
      console.error('Telephony log error:', err);
      res.status(500).json({ error: 'Помилка збереження дзвінка' });
    }
  });

  /**
   * 5. POST /api/telephony/calls/upload-record
   * Receives recorded audio file from Android app and attaches to DealNote
   */
  router.post('/calls/upload-record', upload.single('audio'), async (req, res) => {
    try {
      const file = req.file;
      const { callId, dealId, phoneNumber, duration } = req.body;

      if (!file) {
        return res.status(400).json({ error: 'Аудіофайл не передано' });
      }

      const relativeUrl = `/uploads/calls/${file.filename}`;
      const io = getIo();
      const numDuration = Number(duration) || 0;

      const { e164: normalizedPhone, formatted: formattedPhone, rawDigits } = normalizePhone(phoneNumber);
      const searchSuffix = rawDigits ? rawDigits.slice(-9) : '';

      // Find the corresponding DealNote or create new one
      let targetDealId = dealId;

      if (!targetDealId && searchSuffix) {
        const contact = await prisma.contact.findFirst({
          where: {
            OR: [
              { phone: { contains: searchSuffix } },
              { phone2: { contains: searchSuffix } }
            ]
          },
          include: { deals: { take: 1, orderBy: { updatedAt: 'desc' } } }
        });
        targetDealId = contact?.deals?.[0]?.id;
      }

      if (targetDealId) {
        // Try finding recent note with this callId or matching recent call_record
        let existingNote = null;
        if (callId) {
          existingNote = await prisma.dealNote.findFirst({
            where: {
              dealId: targetDealId,
              type: 'call_record',
              metadata: { contains: callId }
            }
          });
        }
        if (!existingNote) {
          const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
          existingNote = await prisma.dealNote.findFirst({
            where: {
              dealId: targetDealId,
              type: 'call_record',
              createdAt: { gte: fifteenMinAgo }
            },
            orderBy: { createdAt: 'desc' }
          });
        }

        if (existingNote) {
          let meta: any = {};
          try { meta = JSON.parse(existingNote.metadata || '{}'); } catch {}
          meta.recordingUrl = relativeUrl;

          let updatedContent = existingNote.content;
          if (numDuration > 0 && (!meta.duration || meta.duration === 0)) {
            meta.duration = numDuration;
            const newDurStr = formatDuration(numDuration);
            if (updatedContent.includes('0 сек')) {
              updatedContent = updatedContent.replace('0 сек', newDurStr);
            } else if (!updatedContent.includes('•')) {
              updatedContent += ` • ${newDurStr}`;
            }

            // Also update deal tags with duration
            try {
              const d = await prisma.deal.findUnique({ where: { id: targetDealId } });
              if (d) {
                let tags: string[] = [];
                try { tags = typeof d.tags === 'string' ? JSON.parse(d.tags) : (d.tags || []); } catch {}
                tags = tags.filter(t => !t.includes('сек') && !t.includes('хв') && t !== 'Пропущений');
                tags.push(newDurStr);
                await prisma.deal.update({
                  where: { id: targetDealId },
                  data: { tags: JSON.stringify(tags) }
                });
              }
            } catch {}
          }

          const updatedNote = await prisma.dealNote.update({
            where: { id: existingNote.id },
            data: {
              content: updatedContent,
              metadata: JSON.stringify(meta)
            },
            include: { user: true }
          });

          if (io) {
            io.emit('deal_note_updated', updatedNote);
          }
        } else {
          // Create note with recording
          const durStr = numDuration > 0 ? ` • ${formatDuration(numDuration)}` : '';
          const newNote = await prisma.dealNote.create({
            data: {
              dealId: targetDealId,
              userId: 'usr-admin',
              type: 'call_record',
              content: `🎙️ Запис розмови з SIM-карти (${formattedPhone || normalizedPhone})${durStr}`,
              metadata: JSON.stringify({
                callId,
                duration: numDuration,
                recordingUrl: relativeUrl,
                uploadedAt: new Date().toISOString()
              })
            },
            include: { user: true }
          });

          if (io) {
            io.emit('deal_note_added', newNote);
          }
        }
      }

      res.json({
        success: true,
        recordingUrl: relativeUrl,
        dealId: targetDealId
      });
    } catch (err: any) {
      console.error('Upload recording error:', err);
      res.status(500).json({ error: 'Помилка збереження аудіозапису' });
    }
  });

  /**
   * 6. POST /api/telephony/click-to-call
   * Desktop CRM sends command to manager's Android smartphone to dial number
   */
  router.post('/click-to-call', async (req, res) => {
    try {
      const { phoneNumber, contactName, dealId, managerId } = req.body;
      if (!phoneNumber) {
        return res.status(400).json({ error: 'phoneNumber є обов’язковим' });
      }

      const cleanPhone = String(phoneNumber).replace(/\D/g, '');
      const io = getIo();

      if (io) {
        // Broadcast to manager's connected smartphone
        io.emit('sim_dial_request', {
          phoneNumber: `+${cleanPhone}`,
          contactName: contactName || 'Клієнт CRM',
          dealId,
          managerId,
          timestamp: Date.now()
        });
      }

      res.json({
        success: true,
        message: `Сигнал набору номера +${cleanPhone} надіслано на смартфон менеджера`
      });
    } catch (err: any) {
      console.error('Click to call error:', err);
      res.status(500).json({ error: 'Помилка надсилання виклику' });
    }
  });

  /**
   * 7. Universal Webhook for Cloud PBX (Binotel, Zadarma, Asterisk) backwards compatibility
   */
  router.post('/webhook', async (req, res) => {
    try {
      const {
        event,
        callId,
        callerPhone,
        destinationPhone,
        duration,
        recordingUrl,
        timestamp
      } = req.body;

      if (!callerPhone) {
        return res.status(400).json({ error: 'callerPhone обов’язковий' });
      }

      const cleanCaller = String(callerPhone).replace(/\D/g, '');
      const io = getIo();

      let contact = await prisma.contact.findFirst({
        where: {
          OR: [
            { phone: { contains: cleanCaller.slice(-9) } },
            { phone2: { contains: cleanCaller.slice(-9) } },
            { whatsapp: { contains: cleanCaller.slice(-9) } }
          ]
        },
        include: {
          deals: {
            where: { isDeleted: false },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      const activeDeal = contact?.deals?.[0];

      if (event === 'call_incoming' || event === 'call_start') {
        if (io) {
          io.emit('incoming_call', {
            callId,
            phone: `+${cleanCaller}`,
            contactName: contact?.name || `+${cleanCaller}`,
            dealId: activeDeal?.id,
            dealTitle: activeDeal?.title,
            timestamp: timestamp || new Date().toISOString()
          });
        }
      }

      if (event === 'recording_ready' || recordingUrl) {
        if (activeDeal) {
          const note = await prisma.dealNote.create({
            data: {
              dealId: activeDeal.id,
              userId: activeDeal.responsibleId,
              type: 'call_record',
              content: `📞 Запис розмови з клієнтом (+${cleanCaller}) • Тривалість: ${duration || 0} сек.`,
              metadata: JSON.stringify({
                callId,
                duration,
                recordingUrl,
                recordedAt: timestamp || new Date().toISOString()
              })
            },
            include: { user: true }
          });

          if (io) {
            io.emit('deal_note_added', note);
          }
        }
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error('Telephony webhook error:', err);
      res.status(500).json({ error: 'Помилка обробки вебхука' });
    }
  });

  /**
   * 8. GET /api/telephony/caller-info
   * Ultra-fast (<100ms) lookup for Android Caller ID Overlay
   */
  router.get('/caller-info', async (req, res) => {
    try {
      const phoneParam = req.query.phone as string;
      if (!phoneParam) {
        return res.status(400).json({ error: 'phone є обов’язковим' });
      }

      const clean = phoneParam.replace(/\D/g, '');
      const contact = await prisma.contact.findFirst({
        where: {
          OR: [
            { phone: { contains: clean.slice(-9) } },
            { phone2: { contains: clean.slice(-9) } },
            { whatsapp: { contains: clean.slice(-9) } }
          ]
        },
        include: {
          company: true,
          deals: {
            where: { isDeleted: false },
            orderBy: { updatedAt: 'desc' },
            take: 1,
            include: {
              stage: true,
              notes: {
                orderBy: { createdAt: 'desc' },
                take: 1
              }
            }
          }
        }
      });

      if (!contact) {
        return res.json({ found: false, phoneNumber: `+${clean}` });
      }

      const activeDeal = contact.deals?.[0];
      const lastNote = activeDeal?.notes?.[0];

      res.json({
        found: true,
        contactId: contact.id,
        contactName: contact.name,
        companyName: contact.company?.name || null,
        dealId: activeDeal?.id || null,
        dealTitle: activeDeal?.title || null,
        dealBudget: activeDeal?.budget || 0,
        stageName: activeDeal?.stage?.name || null,
        stageColor: activeDeal?.stage?.color || '#3b82f6',
        lastNoteContent: lastNote?.content || null
      });
    } catch (err: any) {
      console.error('Caller info lookup error:', err);
      res.status(500).json({ error: 'Помилка пошуку контакту' });
    }
  });

  /**
   * 9. GET /api/telephony/download-apk
   * Direct download of the signed Android APK for managers
   */
  router.get('/download-apk', (req, res) => {
    const localApkPath = path.join(process.cwd(), 'uploads', 'OnlineCRM-Gateway.apk');
    if (fs.existsSync(localApkPath)) {
      return res.download(localApkPath, 'OnlineCRM-Gateway.apk');
    }
    // Fallback: Redirect to GitHub Releases latest APK
    res.redirect('https://github.com/janowskiy2-cyber/online-crm/releases/download/gateway-latest/OnlineCRM-Gateway.apk');
  });

  return router;
}
