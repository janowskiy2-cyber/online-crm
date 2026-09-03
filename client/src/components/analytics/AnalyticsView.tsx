import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  BarChart2, 
  Award, 
  Calendar,
  Layers,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { api } from '../../services/api';

export const AnalyticsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const formatEUR = (val: number) => `€${new Intl.NumberFormat('uk-UA').format(Math.round(val || 0))}`;

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/dashboard');
      setData(res.data);
    } catch (e) {
      console.warn('Analytics fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const summary = data?.summary || {
    totalDeals: 0,
    wonDeals: 0,
    lostDeals: 0,
    inProgressDeals: 0,
    totalBudget: 0,
    wonBudget: 0,
    inProgressBudget: 0,
    winRate: 0,
    avgCheck: 0
  };

  const funnel = data?.funnel || [];
  const leaderboard = data?.leaderboard || [];

  const kpis = [
    {
      title: 'Загальний пайплайн угод',
      value: formatEUR(summary.totalBudget),
      change: `${summary.totalDeals} угод у системі`,
      icon: DollarSign,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20'
    },
    {
      title: 'Успішно реалізовано (Won)',
      value: formatEUR(summary.wonBudget),
      change: `${summary.wonDeals} закритих контрактів`,
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20'
    },
    {
      title: 'Середній чек контракту',
      value: formatEUR(summary.avgCheck),
      change: 'за успішну угоду',
      icon: TrendingUp,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20'
    },
    {
      title: 'Конверсія в успіх (Win Rate)',
      value: `${summary.winRate}%`,
      change: `${summary.inProgressDeals} угод в роботі`,
      icon: Award,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20'
    }
  ];

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#080c14] select-none font-['Inter',sans-serif]">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <BarChart2 className="w-7 h-7 text-blue-500" />
              <span>Аналітика найму та фінансові KPI</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Реальні показники з хмарної бази даних Neon PostgreSQL
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="px-3.5 py-2 bg-[#111827] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-2xl text-xs font-bold flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
              <span>Оновити</span>
            </button>
            <div className="flex items-center gap-2 bg-[#111827] border border-slate-800 px-3 py-2 rounded-2xl text-xs">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-slate-300 font-bold">2026 Live Data</span>
            </div>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div
                key={idx}
                className="bg-[#111827] border border-slate-800/90 rounded-3xl p-5 shadow-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">{kpi.title}</span>
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border ${kpi.bg} ${kpi.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-white tracking-tight">{kpi.value}</div>
                  <div className="text-[11px] font-bold text-slate-400 mt-1">{kpi.change}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 2-Column Grid: Funnel & Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Воронка конверсії етапів */}
          <div className="bg-[#111827] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Розподіл угод за етапами</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">Всього: {summary.totalDeals}</span>
            </div>

            {funnel.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">Немає створених етапів у воронці</p>
            ) : (
              <div className="space-y-3">
                {funnel.map((st: any) => {
                  const pct = summary.totalDeals > 0 ? Math.round((st.count / summary.totalDeals) * 100) : 0;
                  return (
                    <div key={st.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300">{st.name}</span>
                        <span className="font-bold text-white">{st.count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(3, pct)}%`,
                            backgroundColor: st.color || '#3b82f6'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Рейтинг менеджерів (Leaderboard) */}
          <div className="bg-[#111827] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Рейтинг менеджерів за виручкою</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">Команда</span>
            </div>

            {leaderboard.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">Немає угод, прив’язаних до менеджерів</p>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((m: any, idx: number) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-xs font-black text-slate-500">
                        #{idx + 1}
                      </span>
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center">
                        {m.avatar ? (
                          <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{m.name}</div>
                        <div className="text-[10px] text-slate-400">{m.department || 'Продажі'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-emerald-400">{formatEUR(m.totalRevenue)}</div>
                      <div className="text-[10px] text-slate-400">{m.dealsCount} угод ({m.wonCount} виграно)</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
