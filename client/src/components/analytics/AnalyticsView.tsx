import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Percent, 
  Award, 
  AlertTriangle,
  Users
} from 'lucide-react';
import { api } from '../../services/api';

export const AnalyticsView: React.FC = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/analytics/dashboard');
        setData(res.data);
      } catch (e) {
        console.error('Failed to load analytics:', e);
      }
    };
    fetchAnalytics();
  }, []);

  if (!data) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0b0f19]">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-emerald-500" />
            <span>Аналитика продаж и KPI</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Конверсия воронки, выполнение плана и эффективность 20 менеджеров
          </p>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Выручка (Оплачено)</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400">
              {formatCurrency(data.summary.wonBudget)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Успешно закрытых сделок: {data.summary.wonDeals}
            </div>
          </div>

          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Сделок в работе</span>
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-blue-400">
              {formatCurrency(data.summary.inProgressBudget)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Активных сделок: {data.summary.inProgressDeals}
            </div>
          </div>

          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Конверсия (Win Rate)</span>
              <Percent className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-purple-400">
              {data.summary.winRate}%
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Из всех зашедших лидов
            </div>
          </div>

          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Средний чек</span>
              <Award className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400">
              {formatCurrency(data.summary.avgCheck)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              По реализованным сделкам
            </div>
          </div>
        </div>

        {/* Funnel & Conversion Breakdown */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <span>Воронка этапов продаж</span>
          </h3>

          <div className="space-y-3">
            {data.funnel.map((f: any) => {
              const percentage = data.summary.totalDeals > 0 ? Math.round((f.count / data.summary.totalDeals) * 100) : 0;
              return (
                <div key={f.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.color }} />
                      {f.name}
                    </span>
                    <span className="text-slate-400 font-bold">
                      {f.count} сделок ({percentage}%)
                    </span>
                  </div>
                  <div className="h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(percentage, 5)}%`,
                        backgroundColor: f.color || '#3b82f6'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Managers Leaderboard & Loss Reasons Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leaderboard */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Рейтинг менеджеров (Выручка)</span>
            </h3>

            <div className="space-y-3">
              {data.leaderboard.map((m: any, idx: number) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      idx === 1 ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30' :
                      idx === 2 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                      'text-slate-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <img
                      src={m.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={m.name}
                      className="w-8 h-8 rounded-full object-cover border border-slate-700"
                    />
                    <div>
                      <div className="font-semibold text-xs text-white">{m.name}</div>
                      <div className="text-[10px] text-slate-400">{m.department}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold text-emerald-400">
                      {formatCurrency(m.totalRevenue)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {m.wonCount} из {m.dealsCount} сделок
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Loss Reasons */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span>Причины проигрыша сделок</span>
            </h3>

            <div className="space-y-3">
              {data.lossReasons.length > 0 ? (
                data.lossReasons.map((lr: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800"
                  >
                    <span className="text-xs text-slate-300 font-medium">{lr.reason}</span>
                    <span className="text-xs bg-rose-500/20 text-rose-400 font-bold px-2 py-0.5 rounded-lg border border-rose-500/30">
                      {lr.count} сделок
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-500">
                  Нет проигранных сделок с указанными причинами
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
