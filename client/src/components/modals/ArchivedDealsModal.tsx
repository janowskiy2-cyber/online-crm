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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-['Inter',sans-serif] select-none animate-in fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bitrix-glass border border-white/15 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden backdrop-blur-2xl">
        
        {/* Header */}
        <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between bg-white/[0.04] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Кошик та архів угод</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-extrabold px-2 py-0.5 rounded-full border border-amber-500/30">
                  ЗБЕРІГАННЯ 30 ДНІВ
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Випадково видалені угоди зберігаються тут протягом місяця перед видаленням
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notices */}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs rounded-2xl flex items-center gap-2 shadow-sm">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-2xl flex items-center gap-2 shadow-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
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
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
                <Archive className="w-6 h-6" />
              </div>
              <div className="font-bold text-white text-sm">Кошик порожній</div>
              <p className="text-slate-400 text-xs">
                Немає жодної архівованої угоди. Усі активні замовлення відображаються у воронці.
              </p>
            </div>
          ) : (
            archivedDeals.map((deal) => {
              const daysLeft = getDaysLeft(deal.deletedAt);
              return (
                <div
                  key={deal.id}
                  className="p-4 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center justify-between gap-4 hover:border-amber-500/40 hover:bg-white/5 transition-all"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-white truncate">
                        {deal.title}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        {formatCurrency(deal.budget)}
                      </span>
                      <span className="text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md flex items-center gap-1 font-medium border border-amber-500/20">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>{daysLeft} дн. до очищення</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      {deal.company?.name && (
                        <span className="flex items-center gap-1 truncate text-slate-300">
                          <Building2 className="w-3 h-3 text-blue-400" />
                          <span>{deal.company.name}</span>
                        </span>
                      )}
                      {deal.contact?.name && (
                        <span className="flex items-center gap-1 truncate text-slate-300">
                          <UserIcon className="w-3 h-3 text-purple-400" />
                          <span>{deal.contact.name}</span>
                        </span>
                      )}
                      {deal.deletedAt && (
                        <span className="text-[10px] text-slate-500">
                          Видалено: {new Date(deal.deletedAt).toLocaleDateString('uk-UA')}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRestore(deal)}
                    disabled={restoringId === deal.id}
                    className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/20 flex-shrink-0 active:scale-95"
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
        <div className="h-14 px-6 border-t border-white/10 flex items-center justify-between bg-white/[0.02] text-xs text-slate-400 flex-shrink-0">
          <span>Всього в кошику: {archivedDeals.length}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition"
          >
            Закрити
          </button>
        </div>
      </div>
    </div>
  );
};
