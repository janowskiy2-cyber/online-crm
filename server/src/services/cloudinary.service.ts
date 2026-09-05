import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

export interface CloudinaryAccount {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export class CloudinaryService {
  private static accounts: CloudinaryAccount[] = [];
  private static activeAccountIndex = 0;

  public static getAccounts(): CloudinaryAccount[] {
    if (this.accounts.length > 0) return this.accounts;

    const list: CloudinaryAccount[] = [];

    // Account 1 (Primary)
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      list.push({
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET
      });
    }

    // Account 2 (Secondary / Backup Pool)
    if (process.env.CLOUDINARY_CLOUD_NAME_2 && process.env.CLOUDINARY_API_KEY_2 && process.env.CLOUDINARY_API_SECRET_2) {
      list.push({
        cloudName: process.env.CLOUDINARY_CLOUD_NAME_2,
        apiKey: process.env.CLOUDINARY_API_KEY_2,
        apiSecret: process.env.CLOUDINARY_API_SECRET_2
      });
    }

    // Account 3 (Tertiary Pool)
    if (process.env.CLOUDINARY_CLOUD_NAME_3 && process.env.CLOUDINARY_API_KEY_3 && process.env.CLOUDINARY_API_SECRET_3) {
      list.push({
        cloudName: process.env.CLOUDINARY_CLOUD_NAME_3,
        apiKey: process.env.CLOUDINARY_API_KEY_3,
        apiSecret: process.env.CLOUDINARY_API_SECRET_3
      });
    }

    this.accounts = list;
    return list;
  }

  private static configureAccount(account: CloudinaryAccount) {
    cloudinary.config({
      cloud_name: account.cloudName,
      api_key: account.apiKey,
      api_secret: account.apiSecret,
      secure: true
    });
  }

  /**
   * Upload buffer directly to Cloudinary CDN with multi-account failover
   */
  public static async uploadBuffer(buffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    const accounts = this.getAccounts();
    if (accounts.length === 0) {
      return this.saveLocalFallback(buffer, fileName, mimeType);
    }

    let resourceType: 'auto' | 'image' | 'video' | 'raw' = 'auto';
    if (mimeType.startsWith('image/')) {
      resourceType = 'image';
    } else if (mimeType.startsWith('audio/') || mimeType.startsWith('video/')) {
      resourceType = 'video';
    } else {
      resourceType = 'raw';
    }

    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const publicId = `crm_${Date.now()}_${cleanFileName.replace(/\.[^/.]+$/, "")}`;

    const uploadOptions: any = {
      folder: 'online_crm_media',
      public_id: publicId,
      resource_type: resourceType,
      quality: 'auto:eco', // Ultra-efficient compression to minimize disk usage without visual loss
      fetch_format: 'auto'
    };

    if (mimeType.startsWith('audio/')) {
      // Keep native format if OGG/Opus or WebM to prevent transcoding errors
      if (!mimeType.includes('ogg') && !mimeType.includes('opus')) {
        uploadOptions.format = 'mp3';
      }
    } else if (resourceType === 'video') {
      // Downscale 4K / 1080p phone videos to 720p HD: reduces file size by 75-85% with zero visible loss
      uploadOptions.width = 1280;
      uploadOptions.crop = 'limit';
      uploadOptions.video_codec = 'auto';
    }

    // Try starting from active account, failover if quota reached
    for (let attempt = 0; attempt < accounts.length; attempt++) {
      const accIdx = (this.activeAccountIndex + attempt) % accounts.length;
      const acc = accounts[accIdx];
      this.configureAccount(acc);

      try {
        const url = await new Promise<string>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
              if (error || !result) {
                reject(error || new Error('No upload result'));
              } else {
                resolve(result.secure_url);
              }
            }
          );
          uploadStream.end(buffer);
        });

        this.activeAccountIndex = accIdx;
        console.log(`✅ [Cloudinary Pool] Uploaded to account "${acc.cloudName}":`, url);
        return url;
      } catch (err: any) {
        console.warn(`⚠️ [Cloudinary Pool] Account "${acc.cloudName}" failed (${err?.message || 'Quota error'}). Trying next account...`);
        // If format was set, retry once without format
        if (uploadOptions.format) {
          delete uploadOptions.format;
          try {
            const retryUrl = await new Promise<string>((resolve, reject) => {
              const uploadStream = cloudinary.uploader.upload_stream(
                uploadOptions,
                (error, result) => {
                  if (error || !result) reject(error || new Error('Retry without format failed'));
                  else resolve(result.secure_url);
                }
              );
              uploadStream.end(buffer);
            });
            this.activeAccountIndex = accIdx;
            console.log(`✅ [Cloudinary Pool] Uploaded without format to "${acc.cloudName}":`, retryUrl);
            return retryUrl;
          } catch (rErr) {}
        }
      }
    }

    console.warn('⚠️ All Cloudinary pool accounts exhausted, using local fallback.');
    return this.saveLocalFallback(buffer, fileName, mimeType);
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

  /**
   * Delete asset from Cloudinary (matches cloudName in URL to account credentials)
   */
  public static async deleteAsset(url?: string | null): Promise<boolean> {
    if (!url || !url.includes('cloudinary.com')) return false;
    try {
      const accounts = this.getAccounts();
      const matchedAccount = accounts.find(a => url.includes(`/${a.cloudName}/`)) || accounts[0];
      if (matchedAccount) {
        this.configureAccount(matchedAccount);
      }

      const parts = url.split('/');
      const filenameWithExt = parts[parts.length - 1];
      const filename = filenameWithExt.split('.')[0];
      const publicId = `online_crm_media/${filename}`;
      const resourceType = url.includes('/video/') ? 'video' : (url.includes('/image/') ? 'image' : 'raw');

      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      console.log(`🗑️ [Cloudinary Pool] Asset deleted from "${matchedAccount?.cloudName || 'default'}": ${publicId}`);
      return true;
    } catch (err) {
      console.warn('Failed to delete asset from Cloudinary:', err);
      return false;
    }
  }
}
