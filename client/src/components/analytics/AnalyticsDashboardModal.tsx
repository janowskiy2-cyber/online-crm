import React, { useMemo } from 'react';
import { X, TrendingUp, Users, CreditCard, DollarSign, Award, ArrowRight } from 'lucide-react';
import { Deal, Pipeline } from '../../types';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  deals: Deal[];
  pipeline: Pipeline | null;
}

export const AnalyticsDashboardModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  deals,
  pipeline
}) => {
  if (!isOpen) return null;

  const stages = pipeline?.stages || [];

  // Metrics computation
  const totalDeals = deals.length;
  const totalPipelineBudget = deals.reduce((acc, d) => acc + (Number(d.budget) || 0), 0);
  const avgDealBudget = totalDeals > 0 ? Math.round(totalPipelineBudget / totalDeals) : 0;

  // Candidate pool aggregation across all deals
  const totalCandidatesAssigned = useMemo(() => {
    return deals.reduce((count, d) => {
      const cands = (d.customFields as any)?.candidates;
      return count + (Array.isArray(cands) ? cands.length : 0);
    }, 0);
  }, [deals]);

  const visasReadyCount = useMemo(() => {
    return deals.reduce((count, d) => {
      const cands = (d.customFields as any)?.candidates;
      if (!Array.isArray(cands)) return count;
      return count + cands.filter((c: any) => c.status && (c.status.includes('Віза D готова') || c.status.includes('Вийшов'))).length;
    }, 0);
  }, [deals]);

  const formatCurrency = (val: number) => {
    return `${new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 }).format(val || 0)} ₴`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#0b101b] border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-950/40 via-purple-950/40 to-slate-900 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>Аналітичний дашборд воронки продажів та рекрутингу</span>
              </h3>
              <p className="text-xs text-slate-400">Конверсія етапів, транші 4х25% та статистика працевлаштування</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Бюджет воронки</span>
              </div>
              <div className="text-xl font-extrabold text-white">{formatCurrency(totalPipelineBudget)}</div>
              <div className="text-[11px] text-emerald-400 mt-0.5">Всього угод: {totalDeals}</div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                <CreditCard className="w-4 h-4 text-blue-400" />
                <span>Середній чек</span>
              </div>
              <div className="text-xl font-extrabold text-white">{formatCurrency(avgDealBudget)}</div>
              <div className="text-[11px] text-blue-300 mt-0.5">на 1 підприємство</div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                <Users className="w-4 h-4 text-purple-400" />
                <span>Кандидатів у роботі</span>
              </div>
              <div className="text-xl font-extrabold text-white">{totalCandidatesAssigned}</div>
              <div className="text-[11px] text-purple-300 mt-0.5">у всіх замовленнях</div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Готових віз D / Вихід</span>
              </div>
              <div className="text-xl font-extrabold text-amber-300">{visasReadyCount}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">завершальні етапи</div>
            </div>
          </div>

          {/* Funnel Conversion Breakdown */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h4 className="font-bold text-sm text-white flex items-center justify-between">
              <span>Воронка конверсії за етапами продажу та виконання</span>
              <span className="text-xs text-slate-400 font-normal">Динаміка проходження заявок</span>
            </h4>

            <div className="space-y-3">
              {stages.map((stage, idx) => {
                const stageDeals = deals.filter(d => d.stageId === stage.id);
                const stageBudget = stageDeals.reduce((sum, d) => sum + (Number(d.budget) || 0), 0);
                const percent = totalDeals > 0 ? Math.round((stageDeals.length / totalDeals) * 100) : 0;

                return (
                  <div key={stage.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-200">{stage.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 font-medium">{formatCurrency(stageBudget)}</span>
                        <span className="font-extrabold text-white w-14 text-right">{stageDeals.length} угод ({percent}%)</span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(4, percent)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Financial Lifecycle Tranches (4x25%) Explanation */}
          <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-5 space-y-3">
            <h4 className="font-bold text-xs text-indigo-300">Модель безпечних розрахунків 4х25%:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
                <div className="font-bold text-white mb-1">1. Транш 25% (Аванс)</div>
                <p className="text-slate-400 text-[11px]">Оплата за запуск підбору, відкриття вакансії та первинний скринінг.</p>
              </div>
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
                <div className="font-bold text-white mb-1">2. Транш 25% (Списки)</div>
                <p className="text-slate-400 text-[11px]">Після затвердження директором заводу фінальних кандидатів.</p>
              </div>
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
                <div className="font-bold text-white mb-1">3. Транш 25% (Візи D)</div>
                <p className="text-slate-400 text-[11px]">Після повної готовності робочих віз та пакету документів для виїзду.</p>
              </div>
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
                <div className="font-bold text-white mb-1">4. Транш 25% (Вихід)</div>
                <p className="text-slate-400 text-[11px]">Фінальний розрахунок після прибуття та відпрацювання перших змін.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
