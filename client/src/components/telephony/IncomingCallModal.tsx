import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, MessageSquare, Building2, User as UserIcon, X, ExternalLink } from 'lucide-react';
import { api } from '../../services/api';

export interface IncomingCallData {
  channel: 'whatsapp' | 'telegram' | 'gsm';
  callerPhone: string;
  callerName: string;
  dealId?: string;
  dealTitle?: string;
  stageName?: string;
  responsibleId?: string;
  callId?: string;
  isVideo?: boolean;
}

interface IncomingCallModalProps {
  call: IncomingCallData | null;
  onAccept: (call: IncomingCallData) => void;
  onReject: (call: IncomingCallData) => void;
  onQuickReply: (call: IncomingCallData, text: string) => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  call,
  onAccept,
  onReject,
  onQuickReply
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<any>(null);

  // Synthesize realistic soft phone ringtone via Web Audio API
  useEffect(() => {
    if (!call) {
      stopRingtone();
      return;
    }

    playRingtone();

    return () => {
      stopRingtone();
    };
  }, [call, isMuted]);

  const playRingtone = () => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const ring = () => {
        if (!audioContextRef.current || isMuted) return;
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.2);
      };

      ring();
      ringIntervalRef.current = setInterval(ring, 3000);
    } catch (e) {
      console.warn('Ringtone init:', e);
    }
  };

  const stopRingtone = () => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  if (!call) return null;

  const cleanPhone = (call.callerPhone || '').replace(/\D/g, '');

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in select-none font-['Inter',sans-serif]">
      <div className="bg-[#0b101b] border-2 border-emerald-500/50 rounded-3xl w-full max-w-md shadow-[0_0_50px_rgba(16,185,129,0.25)] overflow-hidden text-center p-6 space-y-5 animate-pulse-border">
        {/* Header Tag */}
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Вхідний дзвінок ({call.channel.toUpperCase()})</span>
          </span>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            {isMuted ? '🔇 Звук вимк' : '🔔 Звук увімк'}
          </button>
        </div>

        {/* Caller Avatar with pulsating rings */}
        <div className="relative w-24 h-24 mx-auto my-2">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
          <div className="absolute -inset-2 rounded-full bg-emerald-500/10 animate-pulse" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white text-3xl font-black shadow-2xl">
            <Phone className="w-10 h-10 animate-bounce" />
          </div>
        </div>

        {/* Contact & Deal Details */}
        <div className="space-y-1">
          <h3 className="text-lg font-extrabold text-white">{call.callerName}</h3>
          <p className="text-sm font-mono text-emerald-400 font-bold">{call.callerPhone}</p>
          
          {call.dealTitle && (
            <div className="mt-2 pt-2 border-t border-slate-800 text-xs">
              <span className="text-slate-400">Угода: </span>
              <span className="text-slate-200 font-bold">{call.dealTitle}</span>
              {call.stageName && (
                <span className="ml-2 px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                  {call.stageName}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              stopRingtone();
              onAccept(call);
            }}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/40 transition active:scale-95"
          >
            <Phone className="w-4 h-4" />
            <span>Прийняти дзвінок</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopRingtone();
              onReject(call);
            }}
            className="w-full py-3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Відхилити</span>
          </button>
        </div>

        {/* Quick Text Response */}
        <div className="pt-1 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => {
              stopRingtone();
              onQuickReply(
                call,
                'Вітаю! Бачу ваш виклик. Зараз на другій лінії з виробництвом, перетелефоную вам рівно через 3 хвилини!'
              );
            }}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-800 transition"
          >
            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
            <span>💬 «Зараз на лінії, передзвоню за 3 хв»</span>
          </button>
        </div>
      </div>
    </div>
  );
};
