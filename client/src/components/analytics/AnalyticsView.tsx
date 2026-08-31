import React from 'react';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  BarChart2, 
  PieChart, 
  Award,
  Globe2,
  Calendar
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const formatEUR = (val: number) => `€${new Intl.NumberFormat('ru-RU').format(val)}`;

  const kpis = [
    {
      title: 'Загальний обсяг замовлень',
      value: formatEUR(148000),
      change: '+24% за місяць',
      isPositive: true,
      icon: DollarSign,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20'
    },
    {
      title: 'Залучено працівників у штат',
      value: '142 особи',
      change: '+18 осіб за тиждень',
      isPositive: true,
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20'
    },
    {
      title: 'Середній чек залучення',
      value: formatEUR(1100),
      change: 'за 1 працівника',
      isPositive: true,
      icon: TrendingUp,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20'
    },
    {
      title: 'Конверсія з КП в договір',
      value: '46.8%',
      change: '+5.2% від плану',
      isPositive: true,
      icon: Award,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20'
    }
  ];

  const countriesBreakdown = [
    { country: 'Узбекистан (Центральна Азія)', count: '64 особи', share: '45%', amount: formatEUR(76800), speed: '1–2 міс.' },
    { country: 'Індія (Англомовні фахівці)', count: '48 осіб', share: '34%', amount: formatEUR(48000), speed: '3–4 міс.' },
    { country: 'Азербайджан & Туреччина', count: '30 осіб', share: '21%', amount: formatEUR(36000), speed: '1–2 міс.' }
  ];

  const departmentsLeaderboard = [
    { name: 'Олександр Громов (Керівництво)', closedDeals: 14, revenue: formatEUR(58000), conversion: '64%' },
    { name: 'Іван Соколов (B2B Продажі)', closedDeals: 11, revenue: formatEUR(38500), conversion: '52%' },
    { name: 'Марія Попова (B2B Продажі)', closedDeals: 8, revenue: formatEUR(28000), conversion: '48%' },
    { name: 'Кирило Морозов (Рекрутер Азія)', closedDeals: 6, revenue: formatEUR(18500), conversion: '42%' }
  ];

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#080c14] select-none font-['Inter',sans-serif]">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <BarChart2 className="w-7 h-7 text-blue-500" />
              <span>Аналітика найму та фінансові показники</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Зведена статистика укладених договорів, оплат 4х25% та структури персоналу
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#111827] border border-slate-800 p-1.5 rounded-2xl text-xs">
            <Calendar className="w-4 h-4 text-slate-400 ml-2" />
            <span className="text-slate-300 font-bold pr-2">Поточний квартал 2026</span>
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
                  <div className={`p-2 rounded-2xl border ${kpi.bg}`}>
                    <Icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-white">{kpi.value}</div>
                  <div className="text-xs text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                    <span>{kpi.change}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Geographic Breakdown */}
        <div className="bg-[#111827] border border-slate-800/90 rounded-3xl p-6 shadow-lg space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-blue-400" />
            <span>Розподіл залученого персоналу за країнами-донорами</span>
          </h3>

          <div className="space-y-3">
            {countriesBreakdown.map((item, idx) => (
              <div key={idx} className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white text-sm">{item.country}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Середній строк доставки: <b className="text-slate-200">{item.speed}</b>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-bold text-white">{item.count}</div>
                    <div className="text-[10px] text-slate-400">{item.share} від загального пулу</div>
                  </div>
                  <div className="text-right font-black text-emerald-400 text-sm">
                    {item.amount}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sales Reps Leaderboard */}
        <div className="bg-[#111827] border border-slate-800/90 rounded-3xl p-6 shadow-lg space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Рейтинг менеджерів за виручкою укладених договорів</span>
          </h3>

          <div className="divide-y divide-slate-800/60 text-xs">
            {departmentsLeaderboard.map((rep, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-xs">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-slate-200 text-sm">{rep.name}</span>
                </div>

                <div className="flex items-center gap-8 text-right">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Угод закрито</span>
                    <span className="font-bold text-white">{rep.closedDeals}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Конверсія</span>
                    <span className="font-bold text-blue-400">{rep.conversion}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Виручка (€)</span>
                    <span className="font-black text-emerald-400 text-sm">{rep.revenue}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
