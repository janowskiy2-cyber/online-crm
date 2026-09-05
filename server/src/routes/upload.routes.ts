import { Router } from 'express';
import multer from 'multer';
import { CloudinaryService } from '../services/cloudinary.service';
import { AuthRequest } from '../middleware/auth.middleware';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // Max 15 MB per file
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/',
      'audio/',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    const isAllowed = allowed.some(prefix => file.mimetype.startsWith(prefix) || file.mimetype === prefix);
    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error('Недозволений тип файлу. Дозволено: PDF, Word, аудіо та зображення.'));
    }
  }
});

export function createUploadRouter() {
  const router = Router();

  router.post('/', upload.single('file'), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Файл не завантажено' });
      }

      const file = req.file;
      const fileUrl = await CloudinaryService.uploadBuffer(
        file.buffer,
        file.originalname,
        file.mimetype
      );

      res.status(201).json({
        url: fileUrl,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeKb: Math.round(file.size / 1024),
        uploadedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Upload route error:', err);
      res.status(500).json({ error: err?.message || 'Помилка завантаження файлу' });
    }
  });

  return router;
}
