import React, { useState, useRef } from 'react';
import { 
  X, 
  Phone, 
  Mic, 
  Building2, 
  CheckCircle2, 
  FileText, 
  MessageSquare, 
  ExternalLink,
  PhoneCall,
  Info
} from 'lucide-react';
import { api } from '../../services/api';
import { startSpeechToText } from '../../utils/speechRecognition';

interface CallModalProps {
  dealId?: string;
  contactName: string;
  phoneNumber: string;
  companyName?: string;
  callType?: 'whatsapp' | 'telegram' | 'gsm';
  channel?: 'whatsapp' | 'telegram' | 'gsm';
  onClose: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  dealId,
  contactName,
  phoneNumber,
  companyName,
  callType,
  channel,
  onClose
}) => {
  const [callNote, setCallNote] = useState('');
  const [isDictating, setIsDictating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const recognitionRef = useRef<any>(null);

  const cleanPhone = (phoneNumber || '').replace(/\D/g, '');

  const toggleVoiceDictation = () => {
    if (isDictating) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsDictating(false);
    } else {
      setIsDictating(true);
      const instance = startSpeechToText({
        language: 'uk-UA',
        onResult: (text) => {
          setCallNote((prev) => (prev ? `${prev} ${text}` : text));
        },
        onError: (err) => {
          console.warn('Speech recognition error:', err);
          setIsDictating(false);
        },
        onEnd: () => {
          setIsDictating(false);
        }
      });
      recognitionRef.current = instance;
    }
  };

  const handleSaveCallSummary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealId || !callNote.trim()) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await api.post(`/deals/${dealId}/notes`, {
        type: 'call',
        content: `📞 Дзвінок клієнту (${contactName}, ${phoneNumber}):\n${callNote.trim()}`
      });
      setSavedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (e) {
      console.error('Failed to log call note:', e);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-['Inter',sans-serif] animate-in fade-in">
      <div className="bitrix-glass bg-[#0d1322] border border-white/15 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-5 sm:p-6 space-y-4">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Зв'язатися з контактом</h3>
              <p className="text-[10px] text-slate-400">Прямий виклик через ваш пристрій</p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contact Info Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-lg flex items-center justify-center shadow-lg flex-shrink-0">
            {(contactName || 'К').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-sm text-white truncate">{contactName || 'Контакт'}</h4>
            {companyName && (
              <p className="text-xs text-purple-400 truncate flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                <span>{companyName}</span>
              </p>
            )}
            <p className="text-xs text-slate-300 font-mono mt-0.5">{phoneNumber || 'Номер не вказано'}</p>
          </div>
        </div>

        {/* Real Direct Call Options */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Виберіть спосіб виклику:
          </span>

          <div className="grid grid-cols-1 gap-2 text-xs">
            {/* GSM / Phone Native Dialer */}
            <a
              href={`tel:${phoneNumber || cleanPhone}`}
              className="px-4 py-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-2xl font-bold flex items-center justify-between transition group active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-white group-hover:text-emerald-300 transition">Звичайний телефонний дзвінок</div>
                  <div className="text-[10px] text-slate-400">Відкриває додаток «Телефон» на смартфоні/ПК</div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-emerald-400 opacity-60 group-hover:opacity-100" />
            </a>

            {/* WhatsApp */}
            <a
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-500/30 rounded-2xl font-bold flex items-center justify-between transition group active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-white group-hover:text-emerald-400 transition">WhatsApp виклик / чат</div>
                  <div className="text-[10px] text-slate-400">Прямий перехід у WhatsApp клієнта</div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-emerald-400 opacity-60 group-hover:opacity-100" />
            </a>

            {/* Telegram */}
            <a
              href={`tg://resolve?phone=${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3 bg-sky-950/40 hover:bg-sky-900/50 text-sky-400 border border-sky-500/30 rounded-2xl font-bold flex items-center justify-between transition group active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-white group-hover:text-sky-400 transition">Telegram виклик / чат</div>
                  <div className="text-[10px] text-slate-400">Відкрити контакт у Telegram</div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-sky-400 opacity-60 group-hover:opacity-100" />
            </a>
          </div>
        </div>

        {/* Honest Notice */}
        <div className="p-2.5 bg-slate-900/70 border border-slate-800 rounded-xl flex items-start gap-2 text-[11px] text-slate-400">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <span>Дзвінок здійснюється через встановлені додатки вашого телефону або комп'ютера без штучних таймерів.</span>
        </div>

        {/* Real Call Outcome Logger for Deal */}
        {dealId && (
          <form onSubmit={handleSaveCallSummary} className="space-y-2 pt-1 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Зафіксувати підсумок розмови в угоду:</span>
              </span>

              <button
                type="button"
                onClick={toggleVoiceDictation}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition ${
                  isDictating ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                }`}
              >
                <Mic className="w-3 h-3 text-rose-400" />
                <span>{isDictating ? 'Слухаю голос...' : '🎙️ Надиктувати'}</span>
              </button>
            </div>

            <textarea
              rows={2}
              placeholder="Про що домовилися під час дзвінка? (наприклад: погодили ставку 26 PLN, чекаємо підписання договору 4х25%)..."
              value={callNote}
              onChange={(e) => setCallNote(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
            />

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Закрити
              </button>
              <button
                type="submit"
                disabled={isSaving || !callNote.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Збережено!</span>
                  </>
                ) : (
                  <span>{isSaving ? 'Збереження...' : 'Зберегти в угоду'}</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
