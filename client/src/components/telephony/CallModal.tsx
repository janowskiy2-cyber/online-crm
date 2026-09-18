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
  Info,
  Calendar,
  Clock,
  CheckSquare,
  AlertTriangle,
  Smartphone,
  QrCode
} from 'lucide-react';
import { api } from '../../services/api';
import { soundService } from '../../services/sound.service';
import { startSpeechToText } from '../../utils/speechRecognition';
import { TelephonyPairModal } from './TelephonyPairModal';

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

  // Mandatory / Automatic next task state
  const [createNextTask, setCreateNextTask] = useState(true);
  const [nextTaskType, setNextTaskType] = useState('call');
  const [nextTaskPreset, setNextTaskPreset] = useState<'tomorrow_morning' | 'tomorrow_afternoon' | 'in_2_days' | 'in_week' | 'custom'>('tomorrow_morning');
  const [nextTaskCustomDate, setNextTaskCustomDate] = useState('');
  const [nextTaskText, setNextTaskText] = useState(`Передзвонити ${contactName || 'клієнту'} за підсумками розмови`);

  // Mobile Android SIM Integration states
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [simCallSent, setSimCallSent] = useState(false);
  const [isSendingSimCall, setIsSendingSimCall] = useState(false);

  const cleanPhone = (phoneNumber || '').replace(/\D/g, '');

  const handleSimClickToCall = async () => {
    setIsSendingSimCall(true);
    const isMobileDevice = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    try {
      await api.post('/telephony/click-to-call', {
        phoneNumber: phoneNumber || cleanPhone,
        contactName,
        dealId
      });
      setSimCallSent(true);
      soundService.playSuccess();
      setTimeout(() => setSimCallSent(false), 6000);

      // If user is currently browsing from mobile, trigger native dialer as well
      if (isMobileDevice) {
        window.location.href = `tel:${phoneNumber || cleanPhone}`;
      }
    } catch (e: any) {
      console.error('Failed to send SIM call command:', e);
      if (isMobileDevice) {
        // Immediate seamless fallback on smartphone: open native phone dialer
        window.location.href = `tel:${phoneNumber || cleanPhone}`;
      } else {
        const errorMsg = e?.response?.data?.error || e?.message || '';
        alert(`Помилка надсилання сигналу на смартфон: ${errorMsg || 'переконайтеся, що на телефоні активний додаток OnlineCRM Gateway'}`);
      }
    } finally {
      setIsSendingSimCall(false);
    }
  };

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
      // 1. Save Call Note to Deal Timeline
      await api.post(`/deals/${dealId}/notes`, {
        type: 'call',
        content: `📞 Дзвінок клієнту (${contactName}, ${phoneNumber}):\n${callNote.trim()}`
      });

      // 2. Automatically create Next Task in CRM
      if (createNextTask) {
        let due = new Date();
        if (nextTaskPreset === 'tomorrow_morning') {
          due.setDate(due.getDate() + 1);
          due.setHours(10, 0, 0, 0);
        } else if (nextTaskPreset === 'tomorrow_afternoon') {
          due.setDate(due.getDate() + 1);
          due.setHours(15, 0, 0, 0);
        } else if (nextTaskPreset === 'in_2_days') {
          due.setDate(due.getDate() + 2);
          due.setHours(11, 0, 0, 0);
        } else if (nextTaskPreset === 'in_week') {
          due.setDate(due.getDate() + 7);
          due.setHours(11, 0, 0, 0);
        } else if (nextTaskCustomDate) {
          due = new Date(nextTaskCustomDate);
        } else {
          due.setDate(due.getDate() + 1);
          due.setHours(11, 0, 0, 0);
        }

        await api.post('/tasks', {
          dealId,
          text: nextTaskText.trim() || `Передзвонити ${contactName}`,
          dueDate: due.toISOString(),
          type: nextTaskType
        });
      }

      soundService.playSuccess();
      setSavedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (e) {
      console.error('Failed to log call note or create task:', e);
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
            {/* Click-to-Call on Android Smartphone SIM */}
            <button
              type="button"
              onClick={handleSimClickToCall}
              disabled={isSendingSimCall}
              className={`w-full px-4 py-3 border rounded-2xl font-bold flex items-center justify-between transition group active:scale-[0.98] ${
                simCallSent
                  ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border-indigo-500/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-white group-hover:text-indigo-300 transition">
                    {simCallSent ? '✅ Сигнал надіслано на смартфон!' : 'Дзвінок через SIM-карту смартфона'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {simCallSent ? 'Смартфон розпочинає виклик з SIM' : 'Смартфон менеджера почне набір номера'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPairModalOpen(true);
                  }}
                  title="Підключити SIM-смартфон"
                  className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                >
                  <QrCode className="w-4 h-4" />
                </button>
                <PhoneCall className={`w-4 h-4 text-indigo-400 ${isSendingSimCall ? 'animate-spin' : ''}`} />
              </div>
            </button>

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

        {/* Real Call Outcome Logger for Deal with Mandatory Next Task */}
        {dealId && (
          <form onSubmit={handleSaveCallSummary} className="space-y-3 pt-2 border-t border-white/10">
            {/* 1. Call Note */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Підсумок розмови:</span>
                </span>

                <button
                  type="button"
                  onClick={toggleVoiceDictation}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition ${
                    isDictating ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                  }`}
                >
                  <Mic className="w-3 h-3 text-rose-400" />
                  <span>{isDictating ? 'Слухаю...' : '🎙️ Надиктувати'}</span>
                </button>
              </div>

              <textarea
                rows={2}
                placeholder="Про що домовилися під час дзвінка? (наприклад: погодили ставку 26 PLN, чекаємо підписання договору)..."
                value={callNote}
                onChange={(e) => setCallNote(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {/* 2. Mandatory / Automatic Next Task Section */}
            <div className="p-3 bg-slate-900/90 border border-blue-500/30 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createNextTask}
                    onChange={(e) => setCreateNextTask(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                    <span>Призначити наступне завдання (контроль ліда)</span>
                  </span>
                </label>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Обов'язково в CRM
                </span>
              </div>

              {createNextTask && (
                <div className="space-y-2 pt-1">
                  {/* Task Text */}
                  <input
                    type="text"
                    value={nextTaskText}
                    onChange={(e) => setNextTaskText(e.target.value)}
                    placeholder="Що зробити наступним кроком..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />

                  {/* Task Type & Presets */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={nextTaskType}
                      onChange={(e) => setNextTaskType(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none font-medium"
                    >
                      <option value="call">📞 Наступний дзвінок</option>
                      <option value="meeting">🤝 Зустріч / Онлайн</option>
                      <option value="presentation">📄 Надіслати КП / Договір</option>
                      <option value="invoice">💳 Оплата / Рахунок</option>
                    </select>

                    <select
                      value={nextTaskPreset}
                      onChange={(e: any) => setNextTaskPreset(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none font-medium"
                    >
                      <option value="tomorrow_morning">⏰ Завтра, 10:00</option>
                      <option value="tomorrow_afternoon">⏰ Завтра, 15:00</option>
                      <option value="in_2_days">📅 Через 2 дні</option>
                      <option value="in_week">📅 Через тиждень</option>
                      <option value="custom">⚙️ Вказати свій час</option>
                    </select>
                  </div>

                  {nextTaskPreset === 'custom' && (
                    <input
                      type="datetime-local"
                      value={nextTaskCustomDate}
                      onChange={(e) => setNextTaskCustomDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
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
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/30 flex items-center gap-1.5 active:scale-95"
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Збережено!</span>
                  </>
                ) : (
                  <span>{isSaving ? 'Збереження...' : 'Зберегти дзвінок і завдання'}</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {isPairModalOpen && (
        <TelephonyPairModal onClose={() => setIsPairModalOpen(false)} />
      )}
    </div>
  );
};
