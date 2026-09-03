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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-rose-500/40 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="h-14 px-5 border-b border-slate-800 flex items-center justify-between bg-[#171c2c]">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <AlertOctagon className="w-4 h-4" />
            <span>Причина закриття угоди</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <p className="text-slate-400 mb-1">Угода:</p>
            <p className="text-white font-bold truncate text-sm">{dealTitle}</p>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Оберіть причину відмови:
            </label>
            <div className="space-y-1.5">
              {DEFAULT_LOSS_REASONS.map((r, idx) => (
                <label
                  key={idx}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                    selectedReason === r
                      ? 'bg-rose-950/40 border-rose-500/60 text-white font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="loss_reason"
                    checked={selectedReason === r}
                    onChange={() => setSelectedReason(r)}
                    className="accent-rose-500"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </div>

          {selectedReason.includes('Інша причина') && (
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Опишіть детальну причину:
              </label>
              <textarea
                rows={2}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Вкажіть, що саме пішло не так..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                required
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-600/30"
            >
              Зафіксувати відмову
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
