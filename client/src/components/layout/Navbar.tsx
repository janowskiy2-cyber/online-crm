import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Handshake, 
  PlaneTakeoff, 
  Search, 
  Plus, 
  SlidersHorizontal,
  ChevronDown,
  Menu,
  QrCode,
  Lock,
  Sparkles,
  PhoneCall
} from 'lucide-react';
import { Pipeline, ProjectCategory, ProjectInfo } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api, socket } from '../../services/api';

export const PROJECTS_CONFIG: ProjectInfo[] = [
  {
    id: 'employers',
    name: 'Проєкт: Роботодавці',
    shortName: 'Роботодавці (B2B)',
    description: 'Підприємства, заводи, агрохолдинги та замовлення на персонал',
    iconName: 'Building2',
    color: '#3b82f6'
  },
  {
    id: 'candidates',
    name: 'Проєкт: Кандидати',
    shortName: 'Кандидати (Пул)',
    description: 'Пошукачі з Азії та Африки, анкети, скринінг, інтерв\'ю',
    iconName: 'Users',
    color: '#10b981'
  },
  {
    id: 'agencies',
    name: 'Проєкт: Кадрові агенції',
    shortName: 'Агенції-партнери',
    description: 'Партнерські агентства в країнах-донорах (Узбекистан, Індія, Туреччина)',
    iconName: 'Handshake',
    color: '#8b5cf6'
  },
  {
    id: 'legal_logistics',
    name: 'Проєкт: Візи & Логістика',
    shortName: 'Візи & Кордон',
    description: 'Дозволи Держпраці, візи D, транзит Молдова ➔ Одеса',
    iconName: 'PlaneTakeoff',
    color: '#f59e0b'
  }
];

interface NavbarProps {
  currentWorkspace: ProjectCategory;
  setCurrentWorkspace: (proj: ProjectCategory) => void;
  pipelines: Pipeline[];
  activePipelineId: string;
  setActivePipelineId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  openCreateDeal: () => void;
  openQRModal: (channel?: 'whatsapp' | 'telegram') => void;
  openAdminPanel: () => void;
  onToggleMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentWorkspace,
  setCurrentWorkspace,
  pipelines,
  activePipelineId,
  setActivePipelineId,
  searchQuery,
  setSearchQuery,
  openCreateDeal,
  openQRModal,
  openAdminPanel,
  onToggleMobileSidebar
}) => {
  const { currentUser } = useAuth();
  const [lineBusy, setLineBusy] = useState(false);
  const [lineDetails, setLineDetails] = useState<any>(null);

  useEffect(() => {
    api.get('/chat/line-status')
      .then(res => {
        if (res.data?.whatsapp?.isBusy) {
          setLineBusy(true);
          setLineDetails(res.data.whatsapp);
        }
      })
      .catch(() => {});

    const handleLineUpdate = (data: any) => {
      const wa = data.whatsapp || data;
      setLineBusy(!!wa.isBusy);
      setLineDetails(wa);
    };

    socket.on('line_status_update', handleLineUpdate);
    return () => {
      socket.off('line_status_update', handleLineUpdate);
    };
  }, []);

  const getProjectIcon = (id: ProjectCategory) => {
    switch (id) {
      case 'employers': return <Building2 className="w-4 h-4" />;
      case 'candidates': return <Users className="w-4 h-4" />;
      case 'agencies': return <Handshake className="w-4 h-4" />;
      case 'legal_logistics': return <PlaneTakeoff className="w-4 h-4" />;
    }
  };

  return (
    <header className="bg-[#090D18]/90 border-b border-white/[0.07] backdrop-blur-xl flex flex-col justify-between flex-shrink-0 select-none font-['Inter',sans-serif]">
      {/* Top Bar: Workspaces & Mobile Menu Trigger */}
      <div className="h-12 px-3 sm:px-5 border-b border-white/[0.06] bg-[#070B14]/80 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {/* Mobile Drawer Button */}
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 text-slate-400 hover:text-white bg-white/[0.04] border border-white/[0.08] rounded-xl"
            title="Відкрити меню"
          >
            <Menu className="w-4 h-4" />
          </button>

          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden lg:inline mr-1">
            Простір:
          </span>

          {PROJECTS_CONFIG.map((proj) => {
            const isActive = currentWorkspace === proj.id;
            return (
              <button
                key={proj.id}
                onClick={() => setCurrentWorkspace(proj.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white/[0.08] text-white border border-white/[0.12] shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <span style={{ color: proj.color }}>{getProjectIcon(proj.id)}</span>
                <span className="hidden sm:inline">{proj.shortName}</span>
                <span className="sm:hidden">{proj.shortName.split(' ')[0]}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full shadow-[0_0_6px_currentColor]" style={{ backgroundColor: proj.color }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Admin and Messengers trigger for mobile header */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Corporate Line Live Busy / Free Indicator */}
          <div
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition cursor-default ${
              lineBusy
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)] animate-pulse'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
            }`}
            title={lineBusy ? `Лінія зайнята: ${lineDetails?.activeManager || 'Менеджер'} розмовляє з ${lineDetails?.activeCaller || 'клієнтом'}` : 'Корпоративна лінія вільна для викликів'}
          >
            <span className={`w-2 h-2 rounded-full ${lineBusy ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
            <span className="hidden md:inline">{lineBusy ? 'Лінія зайнята' : 'Лінія вільна'}</span>
          </div>

          <button
            onClick={() => openQRModal()}
            className="p-1.5 sm:px-2.5 sm:py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 rounded-xl text-xs font-semibold flex items-center gap-1 transition active:scale-[0.98]"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Шлюз</span>
          </button>

          <button
            onClick={openAdminPanel}
            className="p-1.5 sm:px-2.5 sm:py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 rounded-xl text-xs font-semibold flex items-center gap-1 transition active:scale-[0.98]"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Адмін</span>
          </button>
        </div>
      </div>

      {/* Sub Bar: Active Pipeline & Responsive Search */}
      <div className="h-14 px-3 sm:px-5 flex items-center justify-between gap-3 bg-[#090D18]/80">
        {/* Pipeline Selector */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative max-w-[200px] sm:max-w-xs">
            <select
              value={activePipelineId}
              onChange={(e) => setActivePipelineId(e.target.value)}
              className="w-full bg-[#070B14] border border-white/[0.08] focus:border-blue-500/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-100 appearance-none pr-8 focus:outline-none cursor-pointer shadow-sm truncate transition"
            >
              {pipelines.map((pipe) => (
                <option key={pipe.id} value={pipe.id} className="bg-slate-900 text-slate-100">
                  {pipe.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Search & Create Deal Button */}
        <div className="flex items-center gap-2 flex-1 justify-end max-w-md">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Швидкий пошук угод..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#070B14] border border-white/[0.08] focus:border-blue-500/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition shadow-inner"
            />
          </div>

          <button
            onClick={openCreateDeal}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-blue-600/25 active:scale-[0.98] flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Створити</span>
          </button>
        </div>
      </div>
    </header>
  );
};
