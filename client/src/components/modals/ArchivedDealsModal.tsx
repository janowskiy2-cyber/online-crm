import React, { useState, useEffect } from 'react';
import { X, Archive, RotateCcw, Building2, User as UserIcon, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { Deal } from '../../types';
import { api } from '../../services/api';

interface ArchivedDealsModalProps {
  onClose: () => void;
  onDealRestored: (deal: Deal) => void;
}

export const ArchivedDealsModal: React.FC<ArchivedDealsModalProps> = ({ onClose, onDealRestored }) => {
  const [archivedDeals, setArchivedDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchArchived = async () => {
    setLoading(true);
    try {
      const res = await api.get('/deals/archived/list');
      if (res.data && Array.isArray(res.data)) {
        setArchivedDeals(res.data);
      }
    } catch (e) {
      setErrorMsg('Не вдалося завантажити архів угод');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchived();
  }, []);

  const handleRestore = async (deal: Deal) => {
    setRestoringId(deal.id);
    try {
      const res = await api.post(`/deals/${deal.id}/restore`);
      const restored = res.data?.deal || deal;
      setArchivedDeals(prev => prev.filter(d => d.id !== deal.id));
      onDealRestored(restored);
      setSuccessMsg(`Угоду "${deal.title}" успішно відновлено на дошку!`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (e) {
      setErrorMsg('Помилка при відновленні угоди');
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setRestoringId(null);
    }
  };

  const getDaysLeft = (deletedAt?: string) => {
    if (!deletedAt) return 30;
    const diffMs = Date.now() - new Date(deletedAt).getTime();
    const daysPassed = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    return Math.max(0, 30 - daysPassed);
  };

  const formatCurrency = (val: number) => {
    return `${new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 }).format(val || 0)} ₴`;
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-['Inter',sans-serif]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-[#0c101a] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="h-16 px-6 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50 dark:bg-[#101625] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Кошик та архів угод</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  ЗБЕРІГАННЯ 30 ДНІВ
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Випадково видалені угоди зберігаються тут протягом місяця перед видаленням
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notices */}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* List of Archived Deals */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span>Завантаження архіву...</span>
            </div>
          ) : archivedDeals.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Archive className="w-6 h-6" />
              </div>
              <div className="font-semibold text-slate-600 dark:text-slate-300">Кошик порожній</div>
              <p className="text-slate-500 text-[11px]">
                Немає жодної архівованої угоди. Усі активні угоди відображаються на Kanban-дошці.
              </p>
            </div>
          ) : (
            archivedDeals.map((deal) => {
              const daysLeft = getDaysLeft(deal.deletedAt);
              return (
                <div
                  key={deal.id}
                  className="p-4 bg-slate-50 dark:bg-[#101625] border border-slate-200 dark:border-slate-800/90 rounded-2xl flex items-center justify-between gap-4 hover:border-amber-500/40 transition"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {deal.title}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        {formatCurrency(deal.budget)}
                      </span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" />
                        <span>{daysLeft} дн. до очищення</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                      {deal.company?.name && (
                        <span className="flex items-center gap-1 truncate">
                          <Building2 className="w-3 h-3" />
                          <span>{deal.company.name}</span>
                        </span>
                      )}
                      {deal.contact?.name && (
                        <span className="flex items-center gap-1 truncate">
                          <UserIcon className="w-3 h-3" />
                          <span>{deal.contact.name}</span>
                        </span>
                      )}
                      {deal.deletedAt && (
                        <span className="text-[10px] text-slate-400">
                          Видалено: {new Date(deal.deletedAt).toLocaleDateString('uk-UA')}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRestore(deal)}
                    disabled={restoringId === deal.id}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-emerald-600/20 flex-shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{restoringId === deal.id ? 'Відновлення...' : 'Відновити'}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="h-14 px-6 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50 dark:bg-[#101625] text-xs text-slate-500 flex-shrink-0">
          <span>Всього в архіві: {archivedDeals.length}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-medium transition"
          >
            Закрити
          </button>
        </div>

      </div>
    </div>
  );
};
