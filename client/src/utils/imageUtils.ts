/**
 * Compresses an image file and converts it directly into a Base64 data URI string.
 * This guarantees avatars are stored 100% inside PostgreSQL database (User.avatar)
 * without touching server disk storage or third-party cloud hosting.
 */
export function compressImageToBase64(file: File, maxDim = 256, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Будь ласка, оберіть файл зображення (JPG, PNG, WebP)'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Помилка читання файлу'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Помилка завантаження зображення'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Square cropping / resizing to maxDim x maxDim
        const minSide = Math.min(width, height);
        const startX = (width - minSide) / 2;
        const startY = (height - minSide) / 2;

        const canvas = document.createElement('canvas');
        canvas.width = maxDim;
        canvas.height = maxDim;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Помилка створення Canvas'));
        }

        // Draw centered and cropped
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, startX, startY, minSide, minSide, 0, 0, maxDim, maxDim);

        // Convert to compact JPEG data URI (typically 12 - 25 KB)
        const base64Uri = canvas.toDataURL('image/jpeg', quality);
        resolve(base64Uri);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
