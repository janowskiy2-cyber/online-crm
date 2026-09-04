// Web Audio API Sound Service for CRM Notifications
// Provides crystal clear, zero-dependency procedural chimes for incoming & outgoing messages

class SoundService {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private readonly STORAGE_KEY = 'crm_sound_enabled';

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      this.soundEnabled = saved !== null ? saved === 'true' : true;
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, String(enabled));
      window.dispatchEvent(new CustomEvent('crm_sound_changed', { detail: { enabled } }));
    }
  }

  public toggle(): boolean {
    const next = !this.soundEnabled;
    this.setEnabled(next);
    return next;
  }

  /**
   * Pleasant, subtle dual-tone chime for incoming messages (WhatsApp / Telegram / CRM).
   * Note sequence: D5 (587.3 Hz) -> A5 (880.0 Hz) with soft sine envelope.
   */
  public playIncoming(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Tone 1: D5 (587 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      // Tone 2: A5 (880 Hz) harmonic chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, now + 0.09);
      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.setValueAtTime(0.18, now + 0.09);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.09);
      osc2.stop(now + 0.48);
    } catch (e) {
      console.debug('Audio play failed:', e);
    }
  }

  /**
   * Crisp, subtle 'pop/swoosh' confirmation for successfully sent messages / files.
   * Pitch swipe 440Hz -> 780Hz with quick decay.
   */
  public playOutgoing(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(740, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.14);
    } catch (e) {
      console.debug('Audio play failed:', e);
    }
  }
}

export const soundService = new SoundService();
