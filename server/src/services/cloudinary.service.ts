import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'eta3mkod',
  api_key: process.env.CLOUDINARY_API_KEY || '554474578698792',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'aXiH8vWKivNR1MighFWoCVr6vg4',
  secure: true
});

export class CloudinaryService {
  /**
   * Upload buffer directly to Cloudinary CDN
   * Returns permanent HTTPS URL
   */
  public static async uploadBuffer(buffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    try {
      let resourceType: 'auto' | 'image' | 'video' | 'raw' = 'auto';
      if (mimeType.startsWith('image/')) {
        resourceType = 'image';
      } else if (mimeType.startsWith('audio/') || mimeType.startsWith('video/')) {
        resourceType = 'video'; // Cloudinary treats audio as video resource type
      } else {
        resourceType = 'raw'; // PDF, docx, etc.
      }

      const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const publicId = `crm_${Date.now()}_${cleanFileName.replace(/\.[^/.]+$/, "")}`;

      return new Promise<string>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'online_crm_media',
            public_id: publicId,
            resource_type: resourceType,
            quality: 'auto:eco', // Ultra-efficient compression to minimize disk usage without visual loss
            fetch_format: 'auto',
            format: mimeType.startsWith('audio/') ? 'mp3' : undefined
          },
          (error, result) => {
            if (error || !result) {
              console.warn('Cloudinary upload stream error:', error);
              // Fallback to local file
              const localUrl = CloudinaryService.saveLocalFallback(buffer, fileName, mimeType);
              resolve(localUrl);
            } else {
              console.log('✅ Cloudinary file uploaded successfully:', result.secure_url);
              resolve(result.secure_url);
            }
          }
        );

        uploadStream.end(buffer);
      });
    } catch (err) {
      console.warn('Cloudinary exception, falling back to local storage:', err);
      return CloudinaryService.saveLocalFallback(buffer, fileName, mimeType);
    }
  }

  private static saveLocalFallback(buffer: Buffer, fileName: string, mimeType: string): string {
    try {
      const ext = fileName.includes('.') ? fileName.split('.').pop() : (mimeType.startsWith('audio/') ? 'webm' : 'bin');
      const uniqueName = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      fs.writeFileSync(path.join(uploadsDir, uniqueName), buffer);
      return `/api/uploads/${uniqueName}`;
    } catch (e) {
      return '';
    }
  }
}
