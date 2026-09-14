export interface CompressVideoResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  wasCompressed: boolean;
}

/**
 * Compresses video directly in the user's browser using hardware-accelerated WebCodecs.
 * - Skips videos <= 15MB for instantaneous upload
 * - Downscales 4K/1080p to clean 720p HD @ 30fps
 * - Dynamically loads mediabunny ONLY when a video > 15MB is selected (0kb overhead on initial page load)
 * - Preserves audio and natural portrait/landscape orientation
 * - Gracefully falls back to original file if format or browser doesn't support WebCodecs
 */
export async function compressVideoClientSide(
  file: File,
  onProgress?: (percent: number) => void
): Promise<CompressVideoResult> {
  const originalSize = file.size;

  // If video is small enough (<= 15MB), skip compression to save time
  if (originalSize <= 15 * 1024 * 1024) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false
    };
  }

  // Check if browser supports WebCodecs VideoEncoder
  if (typeof window === 'undefined' || typeof (window as any).VideoEncoder === 'undefined') {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false
    };
  }

  try {
    const { 
      Input, 
      ALL_FORMATS, 
      BlobSource, 
      Output, 
      Mp4OutputFormat, 
      BufferTarget, 
      Conversion, 
      Quality 
    } = await import('mediabunny');

    const input = new Input({
      source: new BlobSource(file),
      formats: ALL_FORMATS
    });

    const output = new Output({
      format: new Mp4OutputFormat(),
      target: new BufferTarget()
    });

    // 720p HD limit (1280x720 or 720x1280 for portrait smartphone video)
    const conversion = await Conversion.init({
      input,
      output,
      video: {
        width: 1280,
        height: 720,
        fit: 'contain',
        quality: new Quality('medium'),
        frameRate: 30
      }
    });

    if (onProgress) {
      conversion.onProgress = (progress) => {
        onProgress(Math.round(progress * 100));
      };
    }

    await conversion.execute();

    const buffer = (output.target as any).buffer;
    if (buffer && buffer.byteLength > 0 && buffer.byteLength < originalSize) {
      const compressedBlob = new Blob([buffer], { type: 'video/mp4' });
      const newName = file.name.replace(/\.[^/.]+$/, '') + '_compressed.mp4';
      const compressedFile = new File([compressedBlob], newName, { type: 'video/mp4' });

      return {
        file: compressedFile,
        originalSize,
        compressedSize: compressedFile.size,
        wasCompressed: true
      };
    }

    return {
      file,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false
    };
  } catch (err) {
    console.warn('[VideoCompressor] Client-side compression failed or format not supported, using original file:', err);
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      wasCompressed: false
    };
  }
}
