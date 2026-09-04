import { Input, Output, BufferSource, BufferTarget, OggOutputFormat, Conversion, ALL_FORMATS } from 'mediabunny';
import { spawn } from 'child_process';

export class AudioConverterService {
  /**
   * Checks if buffer is already an OGG stream (magic bytes 'OggS')
   */
  public static isOgg(buffer: Buffer): boolean {
    return buffer.length >= 4 &&
      buffer[0] === 0x4f && // O
      buffer[1] === 0x67 && // g
      buffer[2] === 0x67 && // g
      buffer[3] === 0x53;   // S
  }

  /**
   * Converts any WebM or other audio buffer to an OGG Opus container suitable for Telegram & WhatsApp
   */
  public static async ensureOggOpus(inputBuffer: Buffer): Promise<Buffer> {
    if (this.isOgg(inputBuffer)) {
      return Buffer.from(inputBuffer);
    }

    // 1. Try mediabunny (pure TypeScript demuxer/muxer)
    try {
      const target = new BufferTarget();
      const format = new OggOutputFormat();
      const conversion = await Conversion.init({
        input: new Input({ source: new BufferSource(inputBuffer), formats: ALL_FORMATS }),
        output: new Output({ target, format })
      });
      await conversion.execute();
      if (target.buffer && target.buffer.byteLength > 0) {
        const oggBuf = Buffer.from(target.buffer);
        if (this.isOgg(oggBuf)) {
          return oggBuf;
        }
      }
    } catch (mbErr) {
      console.warn('⚠️ [AudioConverter] Mediabunny conversion fallback to ffmpeg:', mbErr);
    }

    // 2. Fallback to system ffmpeg if available
    try {
      const ffmpegResult = await new Promise<Buffer>((resolve, reject) => {
        const cp = spawn('ffmpeg', [
          '-i', 'pipe:0',
          '-vn',
          '-c:a', 'copy',
          '-f', 'ogg',
          'pipe:1'
        ]);

        const chunks: Buffer[] = [];
        cp.stdout.on('data', (d: Buffer) => chunks.push(d));
        cp.on('close', (code: number) => {
          if (code === 0 && chunks.length > 0) {
            resolve(Buffer.concat(chunks));
          } else {
            reject(new Error(`ffmpeg exited with code ${code}`));
          }
        });
        cp.on('error', reject);
        cp.stdin.write(inputBuffer);
        cp.stdin.end();
      });

      if (this.isOgg(ffmpegResult)) {
        return ffmpegResult;
      }
    } catch (ffErr) {
      // ffmpeg not installed or failed
    }

    // If both failed, return original buffer
    return inputBuffer;
  }
}
