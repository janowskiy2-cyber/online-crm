import React, { useState } from 'react';
import { X, PauseCircle, Calendar, Clock, CheckCircle2 } from 'lucide-react';

interface PauseDealModalProps {
  dealTitle: string;
  onClose: () => void;
  onConfirm: (data: { reason: string; wakeUpDate: string; autoCreateTask: boolean }) => void;
}

const DEFAULT_PAUSE_REASONS = [
  '⏳ Чекають затвердження бюджету',
  '🏖️ Керівник / ЛПР у відпустці',
  '❄️ Сезонна пауза (повернутися пізніше)',
  '📦 Відклали набір персоналу',
  "🤝 Просять зателефонувати пізніше",
  '✍️ Інша причина (вказати вручну)'
];

export const PauseDealModal: React.FC<PauseDealModalProps> = ({
  dealTitle,
  onClose,
  onConfirm
}) => {
  // Default to 14 days in future at 10:00 AM
  const getDefaultWakeUpDate = (daysAhead: number = 14) => {
    const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    d.setHours(10, 0, 0, 0);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const [selectedReason, setSelectedReason] = useState(DEFAULT_PAUSE_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [wakeUpDate, setWakeUpDate] = useState(getDefaultWakeUpDate(14));
  const [autoCreateTask, setAutoCreateTask] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickDaysPreset = (days: number) => {
    setWakeUpDate(getDefaultWakeUpDate(days));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const finalReason = selectedReason.includes('Інша причина')
      ? (customReason.trim() || 'Відкладений попит')
      : selectedReason;
    
    onConfirm({
      reason: finalReason,
      wakeUpDate,
      autoCreateTask
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-['Inter',sans-serif] animate-in fade-in">
      <div className="relative overflow-hidden bg-[#0a0f1d] border border-indigo-500/30 rounded-3xl w-full max-w-lg shadow-[0_0_30px_rgba(99,102,241,0.2)] backdrop-blur-2xl text-slate-100">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />

        {/* Modal Header */}
        <div className="h-16 px-6 border-b border-white/[0.08] flex items-center justify-between bg-indigo-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.25)]">
              <PauseCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <span>Пауза: Відкладений попит</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-extrabold px-2 py-0.5 rounded-full border border-indigo-500/30">
                  ПАУЗА
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Заплануйте дату повернення до клієнта, щоб угода не зникла</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl transition hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Target Deal Badge */}
          <div className="p-3 bg-[#0e1628] border border-white/[0.06] rounded-2xl">
            <p className="text-[11px] text-slate-400 font-medium mb-0.5">Угода, що переводиться на паузу:</p>
            <p className="text-white font-bold truncate text-sm">{dealTitle}</p>
          </div>

          {/* Wake-Up Date Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Коли повернутися до контакту (Дата пробудження):</span>
            </label>

            {/* Quick Chips */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '+7 днів (1 тижд)', days: 7 },
                { label: '+14 днів (2 тижні)', days: 14 },
                { label: '+30 днів (1 міс)', days: 30 },
                { label: '+60 днів (2 міс)', days: 60 },
                { label: '+90 днів (Сезон)', days: 90 },
              ].map(chip => (
                <button
                  key={chip.days}
                  type="button"
                  onClick={() => handleQuickDaysPreset(chip.days)}
                  className="px-2.5 py-1 bg-white/[0.04] hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-300 border border-white/[0.08] hover:border-indigo-500/40 rounded-xl transition text-[11px] font-medium"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <input
              type="datetime-local"
              value={wakeUpDate}
              onChange={(e) => setWakeUpDate(e.target.value)}
              className="w-full bg-[#080c16] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/60 shadow-inner cursor-pointer"
              required
            />
          </div>

          {/* Reason Radio Group */}
          <div className="space-y-2 pt-1">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Причина відкладеного попиту:
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {DEFAULT_PAUSE_REASONS.map((r, idx) => (
                <label
                  key={idx}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    selectedReason === r
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-white font-bold shadow-sm'
                      : 'bg-[#080c16]/70 border-white/[0.06] text-slate-300 hover:bg-white/[0.04] hover:border-white/[0.12]'
                  }`}
                >
                  <input
                    type="radio"
                    name="pause_reason"
                    checked={selectedReason === r}
                    onChange={() => setSelectedReason(r)}
                    className="accent-indigo-500 w-4 h-4"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>

            {selectedReason.includes('Інша причина') && (
              <input
                type="text"
                placeholder="Введіть конкретну причину паузи..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full bg-[#080c16] border border-indigo-500/40 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 mt-2"
                autoFocus
              />
            )}
          </div>

          {/* Auto-Create Reminder Task Checkbox */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/25 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={autoCreateTask}
              onChange={(e) => setAutoCreateTask(e.target.checked)}
              className="accent-indigo-500 w-4 h-4 rounded"
            />
            <div>
              <span className="font-bold text-indigo-200 block">
                Створити нагадування на обрану дату
              </span>
              <span className="text-[11px] text-slate-400">
                CRM автоматично виставить завдання менеджерові для дзвінка клієнту
              </span>
            </div>
          </label>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white rounded-xl font-bold transition hover:bg-white/[0.05]"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold transition shadow-[0_0_16px_rgba(99,102,241,0.35)] border border-indigo-400/30 active:scale-95 flex items-center gap-1.5"
            >
              <PauseCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Збереження...' : '⏸️ Поставити на паузу'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
