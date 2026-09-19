import React, { useState } from 'react';
import { 
  X, 
  ArrowRightLeft, 
  CheckCircle2, 
  AlertTriangle, 
  CheckSquare, 
  FileText, 
  MessageSquare, 
  User, 
  Loader2,
  Building2,
  Trash2
} from 'lucide-react';
import { api } from '../../services/api';

export interface DuplicateDealItem {
  id: string;
  title: string;
  companyName?: string;
  contactName?: string;
  phone?: string;
  stageName?: string;
  stageColor?: string;
  responsibleName?: string;
  budget?: number;
  tasksCount?: number;
  notesCount?: number;
  messagesCount?: number;
  createdAt?: string;
}

interface MergeDuplicatesModalProps {
  currentDeal: any;
  duplicateDeal: DuplicateDealItem;
  onClose: () => void;
  onMerged: (updatedDeal: any) => void;
}

export const MergeDuplicatesModal: React.FC<MergeDuplicatesModalProps> = ({
  currentDeal,
  duplicateDeal,
  onClose,
  onMerged
}) => {
  const [targetId, setTargetId] = useState<string>(currentDeal.id);
  const [sourceId, setSourceId] = useState<string>(duplicateDeal.id);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCurrentTarget = targetId === currentDeal.id;

  const handleSwapRoles = () => {
    setTargetId(prev => (prev === currentDeal.id ? duplicateDeal.id : currentDeal.id));
    setSourceId(prev => (prev === duplicateDeal.id ? currentDeal.id : duplicateDeal.id));
  };

  const primaryDeal = isCurrentTarget ? currentDeal : duplicateDeal;
  const secondaryDeal = isCurrentTarget ? duplicateDeal : currentDeal;

  const handleConfirmMerge = async () => {
    setIsMerging(true);
    setError(null);
    try {
      const res = await api.post('/deals/merge', {
        targetDealId: targetId,
        sourceDealId: sourceId
      });

      if (res.data && res.data.success) {
        onMerged(res.data.deal);
        onClose();
      } else {
        setError(res.data?.error || 'Не вдалося об’єднати угоди');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Помилка при об’єднанні');
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div 
        className="relative w-full max-w-2xl bg-slate-900/95 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Об'єднання дублів за номером</span>
              </h2>
              <p className="text-xs text-slate-400">
                Номер: <strong className="text-amber-300">{duplicateDeal.phone || currentDeal.contact?.phone || 'Збіг номерів'}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Side by Side Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative">
            {/* Swap Button in between */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <button
                type="button"
                onClick={handleSwapRoles}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 border border-white/20 hover:border-amber-400 shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                title="Поміняти місцями: зробити іншу угоду основною"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Target Card (Kept) */}
            <div className="p-4 rounded-2xl bg-emerald-950/25 border-2 border-emerald-500/50 relative space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Основна угода (Залишається)</span>
                </span>
                <button
                  type="button"
                  onClick={handleSwapRoles}
                  className="md:hidden text-[10px] text-slate-400 hover:text-white underline"
                >
                  Змінити
                </button>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white line-clamp-1">{primaryDeal.title}</h3>
                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <User className="w-3 h-3 text-slate-500" />
                  <span>{primaryDeal.responsibleName || primaryDeal.responsible?.name || 'Менеджер'}</span>
                </p>
              </div>

              <div className="space-y-1 text-[11px] text-slate-300 pt-1 border-t border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Етап:</span>
                  <span className="font-semibold text-emerald-300">{primaryDeal.stageName || primaryDeal.stage?.name || 'У роботі'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Бюджет:</span>
                  <span className="font-semibold text-white">{primaryDeal.budget || 0} ₴</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Завдань:</span>
                  <span className="font-semibold text-white">{(primaryDeal.tasks || []).length || primaryDeal.tasksCount || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Заміток/дзвінків:</span>
                  <span className="font-semibold text-white">{(primaryDeal.notes || []).length || primaryDeal.notesCount || 0}</span>
                </div>
              </div>
            </div>

            {/* Source Card (Duplicate to Archive) */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 relative space-y-3 opacity-90">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                  <Trash2 className="w-3 h-3" />
                  <span>Дубль (Буде архівовано)</span>
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white line-clamp-1">{secondaryDeal.title}</h3>
                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <User className="w-3 h-3 text-slate-500" />
                  <span>{secondaryDeal.responsibleName || secondaryDeal.responsible?.name || 'Менеджер'}</span>
                </p>
              </div>

              <div className="space-y-1 text-[11px] text-slate-300 pt-1 border-t border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Етап:</span>
                  <span className="font-semibold text-slate-300">{secondaryDeal.stageName || secondaryDeal.stage?.name || 'Етап'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Бюджет:</span>
                  <span className="font-semibold text-white">{secondaryDeal.budget || 0} ₴</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Завдань:</span>
                  <span className="font-semibold text-white">{(secondaryDeal.tasks || []).length || secondaryDeal.tasksCount || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Заміток/дзвінків:</span>
                  <span className="font-semibold text-white">{(secondaryDeal.notes || []).length || secondaryDeal.notesCount || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Merge Details Info Checklist */}
          <div className="p-3.5 bg-slate-950/60 border border-white/[0.08] rounded-2xl space-y-2">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Що станеться при об'єднанні:
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckSquare className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span><strong>Завдання:</strong> Всі заплановані задачі з дубля перенесуться в основну угоду.</span>
              </li>
              <li className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span><strong>Історія та дзвінки:</strong> Всі замітки, коментарі та записи розмов перенесуться без втрат.</span>
              </li>
              <li className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span><strong>Листування:</strong> Повідомлення WhatsApp та Telegram об'єднаються в одну стрічку.</span>
              </li>
              <li className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                <span><strong>Контакти та поля:</strong> Додаткові номери, email чи дані замовлення автоматично доповнять картку.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span><strong>Чистота бази:</strong> Угода-дубль помічається як об'єднана і не буде створювати плутанину.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-white/10 flex items-center justify-end gap-2.5 bg-slate-900/90">
          <button
            type="button"
            onClick={onClose}
            disabled={isMerging}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.06] transition"
          >
            Скасувати
          </button>
          <button
            type="button"
            onClick={handleConfirmMerge}
            disabled={isMerging}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black rounded-xl text-xs transition flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-95 disabled:opacity-50"
          >
            {isMerging ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Об'єдную дані...</span>
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-4 h-4 text-slate-950" />
                <span>Підтвердити об'єднання дублів</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
