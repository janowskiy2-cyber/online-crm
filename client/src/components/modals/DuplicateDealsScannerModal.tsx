import React, { useState, useEffect } from 'react';
import { 
  X, 
  Copy, 
  ArrowRightLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Phone, 
  Calendar, 
  User, 
  RefreshCw, 
  Loader2, 
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { api } from '../../services/api';

interface DuplicateGroup {
  phoneKey: string;
  displayPhone: string;
  count: number;
  deals: any[];
}

interface DuplicateDealsScannerModalProps {
  onClose: () => void;
  onOpenDeal?: (dealId: string) => void;
}

export const DuplicateDealsScannerModal: React.FC<DuplicateDealsScannerModalProps> = ({
  onClose,
  onOpenDeal
}) => {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [mergingGroupKey, setMergingGroupKey] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fetchDuplicates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/deals/duplicates/by-phone');
      if (res.data) {
        setGroups(res.data.groups || []);
      }
    } catch (e) {
      console.error('Failed to load duplicates:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const handleMergePair = async (group: DuplicateGroup, targetDealId: string, sourceDealId: string) => {
    setMergingGroupKey(group.phoneKey);
    try {
      const res = await api.post('/deals/merge', {
        targetDealId,
        sourceDealId
      });

      if (res.data && res.data.success) {
        setSuccessNotice(`Дублі за номером ${group.displayPhone} успішно об'єднано!`);
        setTimeout(() => setSuccessNotice(null), 3500);
        fetchDuplicates();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Помилка при об’єднанні');
    } finally {
      setMergingGroupKey(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div 
        className="relative w-full max-w-4xl bg-slate-900/95 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.25)]">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Центр очищення та об'єднання дублів</span>
                {groups.length > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold border border-amber-500/40 animate-pulse">
                    {groups.length} груп з дублями
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Автоматичний пошук однакових номерів телефонів по всій базі CRM
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDuplicates}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition"
              title="Оновити пошук"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {successNotice && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 mx-auto text-blue-400 animate-spin" />
              <p className="text-xs text-slate-400">Сканування бази даних на дублювання телефонів...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">Дублів не знайдено!</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                У вашій CRM немає угод з однаковими номерами телефонів. База даних повністю чиста та організована.
              </p>
            </div>
          ) : (
            groups.map((group) => {
              const isMergingThis = mergingGroupKey === group.phoneKey;
              // Primary default is the first (latest) deal
              const primary = group.deals[0];
              const duplicates = group.deals.slice(1);

              return (
                <div 
                  key={group.phoneKey}
                  className="bg-slate-950/60 border border-white/10 rounded-2xl p-4 space-y-3 transition hover:border-amber-500/40"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      <Phone className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-mono font-bold text-white">{group.displayPhone}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25">
                        {group.count} дублюючих угод
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isMergingThis}
                      onClick={() => handleMergePair(group, primary.id, duplicates[0].id)}
                      className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold rounded-xl text-xs transition flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.25)] active:scale-95 disabled:opacity-50"
                    >
                      {isMergingThis ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Об'єднання...</span>
                        </>
                      ) : (
                        <>
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>Об'єднати в основну</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Deals cards list */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.deals.map((deal, idx) => {
                      const isMain = idx === 0;
                      return (
                        <div
                          key={deal.id}
                          className={`p-3.5 rounded-xl border text-xs space-y-2 transition ${
                            isMain 
                              ? 'bg-emerald-950/20 border-emerald-500/40' 
                              : 'bg-white/[0.02] border-white/[0.08] opacity-85'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              isMain ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {isMain ? '★ Буде основною' : `Дубль #${idx}`}
                            </span>
                            <span 
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: `${deal.stageColor}25`, color: deal.stageColor }}
                            >
                              {deal.stageName}
                            </span>
                          </div>

                          <div className="font-bold text-white truncate text-xs sm:text-sm">
                            {deal.title}
                          </div>

                          <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400 pt-1 border-t border-white/[0.04]">
                            <div>Менеджер: <span className="text-slate-200 font-medium">{deal.responsibleName}</span></div>
                            <div>Бюджет: <span className="text-white font-medium">{deal.budget || 0} ₴</span></div>
                            <div>Завдань: <span className="text-amber-300 font-semibold">{deal.tasksCount || 0}</span></div>
                            <div>Заміток: <span className="text-amber-300 font-semibold">{deal.notesCount || 0}</span></div>
                          </div>

                          {onOpenDeal && (
                            <button
                              type="button"
                              onClick={() => { onOpenDeal(deal.id); onClose(); }}
                              className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline pt-1 block"
                            >
                              Переглянути картку угоди →
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
