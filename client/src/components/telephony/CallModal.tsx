import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  User as UserIcon, 
  Building2, 
  CheckCircle2, 
  Clock, 
  Play, 
  Pause, 
  Sparkles,
  FileText,
  MessageSquare
} from 'lucide-react';
import { api } from '../../services/api';

interface CallModalProps {
  dealId?: string;
  contactName: string;
  phoneNumber: string;
  companyName?: string;
  callType?: 'whatsapp' | 'telegram' | 'gsm';
  onClose: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  dealId,
  contactName,
  phoneNumber,
  companyName,
  callType = 'whatsapp',
  onClose
}) => {
  const [callState, setCallState] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callNote, setCallNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    // Simulate connection after 2 seconds
    const ringTimeout = setTimeout(() => {
      setCallState('connected');
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }, 2200);

    return () => {
      clearTimeout(ringTimeout);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleEndCall = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCallState('ended');
  };

  const handleSaveCallSummary = async () => {
    setIsSaving(true);
    try {
      if (dealId) {
        await api.post(`/deals/${dealId}/notes`, {
          type: 'call',
          content: `📞 Дзвінок (${callType.toUpperCase()}) тривалістю ${formatTime(callDuration)}.\nПідсумок: ${callNote || 'Успішна розмова з клієнтом щодо КП та підбору.'}`
        });
      }
      onClose();
    } catch (e) {
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none font-['Inter',sans-serif] animate-in fade-in">
      <div className="bg-[#0f1422] border border-slate-700/80 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden text-center p-6 space-y-6">
        
        {/* Top Channel Badge */}
        <div className="flex items-center justify-between">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
            callType === 'whatsapp' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
            callType === 'telegram' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' :
            'bg-purple-500/20 text-purple-300 border border-purple-500/30'
          }`}>
            {callType === 'whatsapp' ? '🟢 WhatsApp Call' : callType === 'telegram' ? '🔵 Telegram Call' : '🟣 GSM / IP-Телефонія'}
          </span>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contact Info & Avatar */}
        <div className="space-y-3">
          <div className="relative w-24 h-24 mx-auto">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center font-black text-3xl shadow-xl ${
              callState === 'connected' 
                ? 'bg-emerald-600 text-white animate-pulse' 
                : 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
            }`}>
              {contactName.charAt(0)}
            </div>
            {callState === 'connected' && (
              <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#0f1422] animate-ping" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold text-white">{contactName}</h3>
            {companyName && (
              <p className="text-xs text-purple-400 font-semibold">{companyName}</p>
            )}
            <p className="text-xs text-slate-400 font-mono mt-0.5">{phoneNumber}</p>
          </div>

          {/* Status / Timer */}
          <div className="py-1">
            {callState === 'ringing' ? (
              <span className="text-xs text-amber-400 font-semibold animate-pulse">
                Виклик абонента...
              </span>
            ) : callState === 'connected' ? (
              <div className="flex items-center justify-center gap-2 text-emerald-400 font-mono text-sm font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{formatTime(callDuration)}</span>
              </div>
            ) : (
              <span className="text-xs text-rose-400 font-semibold">
                Дзвінок завершено ({formatTime(callDuration)})
              </span>
            )}
          </div>
        </div>

        {/* Active Call Controls */}
        {callState !== 'ended' ? (
          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-3.5 rounded-2xl transition shadow-md ${
                isMuted ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
              title={isMuted ? 'Увімкнути мікрофон' : 'Вимкнути мікрофон'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              onClick={handleEndCall}
              className="p-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl shadow-rose-600/40 transition active:scale-95"
              title="Завершити дзвінок"
            >
              <PhoneOff className="w-6 h-6" />
            </button>

            <button
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className={`p-3.5 rounded-2xl transition shadow-md ${
                !isSpeakerOn ? 'bg-slate-800 text-slate-500' : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
              title={isSpeakerOn ? 'Динамік увімкнено' : 'Динамік вимкнено'}
            >
              {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        ) : (
          /* Post-Call Summary Note & Audio Record Attachment */
          <div className="space-y-3 text-left pt-2 animate-in fade-in">
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold">
                <span>🎙️ Аудіозапис дзвінка збережено</span>
                <span>MP3 • {formatTime(callDuration)}</span>
              </div>
              <p className="text-[10px] text-slate-500">
                Запис автоматично додано до історії взаємодії з клієнтом.
              </p>
            </div>

            <div>
              <label className="text-slate-400 text-xs font-semibold block mb-1">
                Результат розмови (Коментар у картку)
              </label>
              <textarea
                rows={2}
                placeholder="Про що домовилися: відправити КП на 15 робітників, узгодити дату дзвінка з директором заводу..."
                value={callNote}
                onChange={(e) => setCallNote(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              onClick={handleSaveCallSummary}
              disabled={isSaving}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'Збереження...' : 'Зберегти підсумок у картку угоди'}</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
