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
      const serverUrl = process.env.VITE_API_URL || process.env.API_URL || `${req.protocol}://${req.get('host')}`;
      const downloadUrl = `${serverUrl}/api/telephony/download-apk`;

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

      const cleanPhone = String(targetPhone).replace(/\D/g, '');
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
            { phone: { contains: cleanPhone.slice(-9) } },
            { phone2: { contains: cleanPhone.slice(-9) } },
            { whatsapp: { contains: cleanPhone.slice(-9) } }
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

        const directionLabel = direction === 'inbound' ? 'Вхідний дзвінок' : 'Вихідний дзвінок';

        contact = await prisma.contact.create({
          data: {
            name: `${directionLabel} (+${cleanPhone})`,
            phone: `+${cleanPhone}`,
            whatsapp: `+${cleanPhone}`
          },
          include: { deals: true }
        });

        activeDeal = await prisma.deal.create({
          data: {
            title: `Дзвінок з SIM: +${cleanPhone}`,
            pipelineId: pipeId,
            stageId: firstStageId,
            responsibleId,
            contactId: contact.id,
            budget: 0,
            tags: JSON.stringify(['GSM SIM', directionLabel])
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
      }

      // Format duration text: e.g. "1 хв 25 сек"
      const formatDuration = (secs: number) => {
        if (!secs || secs <= 0) return '0 сек';
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        if (m === 0) return `${s} сек`;
        return `${m} хв ${s} сек`;
      };

      const durationStr = formatDuration(duration);
      const isMissed = status === 'missed' || (direction === 'inbound' && Number(duration) === 0);

      // 2. Create DealNote with call record
      const noteTitle = isMissed 
        ? `🚨 Пропущений ${direction === 'inbound' ? 'вхідний' : 'вихідний'} дзвінок (+${cleanPhone})`
        : `📞 ${direction === 'inbound' ? 'Вхідний' : 'Вихідний'} дзвінок з SIM-карти (+${cleanPhone}) • ${durationStr}`;

      const note = await prisma.dealNote.create({
        data: {
          dealId: activeDeal.id,
          userId: responsibleId,
          type: 'call_record',
          content: noteTitle,
          metadata: JSON.stringify({
            callId: callId || `call-${Date.now()}`,
            direction,
            duration,
            status,
            simSlot,
            phoneNumber: `+${cleanPhone}`,
            startedAt: startedAt || new Date().toISOString(),
            endedAt: endedAt || new Date().toISOString()
          })
        },
        include: { user: true }
      });

      // 3. If call was missed, auto-create high-priority call-back task for the manager!
      if (isMissed) {
        const taskDue = new Date(Date.now() + 15 * 60 * 1000); // in 15 minutes
        const task = await prisma.task.create({
          data: {
            dealId: activeDeal.id,
            responsibleId,
            createdById: responsibleId,
            type: 'call',
            text: `🔥 ТЕРМІНОВО: Передзвонити клієнту (+${cleanPhone}) — пропущений дзвінок!`,
            dueDate: taskDue
          },
          include: { responsible: true }
        });

        if (io) {
          io.emit('task_created', task);
        }
      }

      if (io) {
        io.emit('deal_note_added', note);
        io.emit('call_logged', {
          callId,
          dealId: activeDeal.id,
          contactId: contact.id,
          phoneNumber: `+${cleanPhone}`,
          direction,
          duration,
          isMissed
        });
      }

      res.json({
        success: true,
        dealId: activeDeal.id,
        contactId: contact.id,
        noteId: note.id,
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
      const { callId, dealId, phoneNumber } = req.body;

      if (!file) {
        return res.status(400).json({ error: 'Аудіофайл не передано' });
      }

      const relativeUrl = `/uploads/calls/${file.filename}`;
      const io = getIo();

      // Find the corresponding DealNote or create new one
      let targetDealId = dealId;

      if (!targetDealId && phoneNumber) {
        const clean = String(phoneNumber).replace(/\D/g, '');
        const contact = await prisma.contact.findFirst({
          where: {
            OR: [
              { phone: { contains: clean.slice(-9) } },
              { phone2: { contains: clean.slice(-9) } }
            ]
          },
          include: { deals: { take: 1, orderBy: { updatedAt: 'desc' } } }
        });
        targetDealId = contact?.deals?.[0]?.id;
      }

      if (targetDealId) {
        // Try finding recent note with this callId
        const existingNote = await prisma.dealNote.findFirst({
          where: {
            dealId: targetDealId,
            type: 'call_record',
            metadata: { contains: callId || '' }
          }
        });

        if (existingNote) {
          let meta: any = {};
          try { meta = JSON.parse(existingNote.metadata || '{}'); } catch {}
          meta.recordingUrl = relativeUrl;

          const updatedNote = await prisma.dealNote.update({
            where: { id: existingNote.id },
            data: {
              metadata: JSON.stringify(meta)
            },
            include: { user: true }
          });

          if (io) {
            io.emit('deal_note_updated', updatedNote);
          }
        } else {
          // Create note with recording
          const newNote = await prisma.dealNote.create({
            data: {
              dealId: targetDealId,
              userId: 'usr-admin',
              type: 'call_record',
              content: `🎙️ Запис розмови з SIM-карти (+${phoneNumber || ''})`,
              metadata: JSON.stringify({
                callId,
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
    res.redirect('https://github.com/janowskiy2-cyber/online-crm/releases/latest/download/OnlineCRM-Gateway.apk');
  });

  return router;
}
