import React, { useState } from 'react';
import { X, AlertOctagon } from 'lucide-react';

interface LossReasonModalProps {
  dealTitle: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

const DEFAULT_LOSS_REASONS = [
  '💸 Дорого / немає бюджету',
  '⚔️ Обрали конкурента',
  '⏱️ Не влаштовують строки виходу (1–2 міс)',
  "📴 Не виходить на зв'язок / ігнорує",
  '❌ Нецільова заявка / потреба відпала',
  '⚖️ Не погодили договір / умови 4х25%',
  '✍️ Інша причина (вказати вручну)'
];

export const LossReasonModal: React.FC<LossReasonModalProps> = ({
  dealTitle,
  onClose,
  onConfirm
}) => {
  const [selectedReason, setSelectedReason] = useState(DEFAULT_LOSS_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const finalReason = selectedReason.includes('Інша причина') 
      ? (customReason.trim() || 'Інша причина') 
      : selectedReason;
    onConfirm(finalReason);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-['Inter',sans-serif] select-none animate-in fade-in">
      <div className="bitrix-glass border border-white/15 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden backdrop-blur-2xl">
        <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between bg-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Причина закриття угоди</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 font-extrabold px-2 py-0.5 rounded-full border border-rose-500/30">
                  ВТРАТА
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Фіксація аналітики та причин відмови клієнта</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl transition hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
            <p className="text-[11px] text-slate-400 font-medium mb-0.5">Угода:</p>
            <p className="text-white font-bold truncate text-sm">{dealTitle}</p>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Оберіть причину відмови:
            </label>
            <div className="space-y-2">
              {DEFAULT_LOSS_REASONS.map((r, idx) => (
                <label
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                    selectedReason === r
                      ? 'bg-rose-500/20 border-rose-500/60 text-white font-bold shadow-md shadow-rose-900/20'
                      : 'bg-slate-900/50 border-white/10 text-slate-300 hover:bg-white/5 hover:border-white/20'
                  }`}
                >
                  <input
                    type="radio"
                    name="loss_reason"
                    checked={selectedReason === r}
                    onChange={() => setSelectedReason(r)}
                    className="accent-rose-500 w-4 h-4"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </div>

          {selectedReason.includes('Інша причина') && (
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Опишіть детальну причину:
              </label>
              <textarea
                rows={2}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Вкажіть, що саме пішло не так..."
                className="w-full bg-slate-900/80 border border-white/15 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
                required
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 rounded-xl text-xs font-semibold transition border border-white/10"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-600/30 active:scale-95"
            >
              Зафіксувати відмову
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
