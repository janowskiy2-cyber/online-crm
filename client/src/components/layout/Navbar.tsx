import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Handshake, 
  PlaneTakeoff, 
  Search, 
  Plus, 
  ChevronDown, 
  Menu, 
  QrCode, 
  Lock, 
  Sun, 
  Moon,
  Sparkles,
  Clock,
  Play,
  Pause,
  Square
} from 'lucide-react';
import { Pipeline, ProjectCategory, ProjectInfo } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
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
  const { theme, toggleTheme, isDark } = useTheme();
  const [lineBusy, setLineBusy] = useState(false);
  const [lineDetails, setLineDetails] = useState<any>(null);

  // Bitrix24 Real-time Digital Clock
  const [currentTime, setCurrentTime] = useState<string>('');
  
  // Bitrix24 Workday Shift Tracker
  const [workStatus, setWorkStatus] = useState<'working' | 'break' | 'stopped'>(() => {
    return (localStorage.getItem('crm_work_status') as any) || 'working';
  });
  const [shiftSeconds, setShiftSeconds] = useState<number>(() => {
    const saved = localStorage.getItem('crm_shift_seconds');
    return saved ? parseInt(saved, 10) : 28800; // 08:00:00 default
  });
  const [isShiftMenuOpen, setIsShiftMenuOpen] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let timer: any;
    if (workStatus === 'working') {
      timer = setInterval(() => {
        setShiftSeconds(prev => {
          const next = prev + 1;
          localStorage.setItem('crm_shift_seconds', next.toString());
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [workStatus]);

  const handleStatusChange = (status: 'working' | 'break' | 'stopped') => {
    setWorkStatus(status);
    localStorage.setItem('crm_work_status', status);
    setIsShiftMenuOpen(false);
  };

  const formatShiftTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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
      case 'employers': return <Building2 className="w-3.5 h-3.5" strokeWidth={1.75} />;
      case 'candidates': return <Users className="w-3.5 h-3.5" strokeWidth={1.75} />;
      case 'agencies': return <Handshake className="w-3.5 h-3.5" strokeWidth={1.75} />;
      case 'legal_logistics': return <PlaneTakeoff className="w-3.5 h-3.5" strokeWidth={1.75} />;
    }
  };

  return (
    <header className="bg-white/80 dark:bg-[#080c14]/85 border-b border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl flex flex-col justify-between flex-shrink-0 select-none transition-colors duration-200 font-['Inter',sans-serif]">
      {/* Top Bar: Workspaces Segmented Control & Global Actions */}
      <div className="h-12 px-3 sm:px-5 border-b border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {/* Mobile Drawer Trigger */}
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] rounded-lg transition"
            title="Відкрити меню"
          >
            <Menu className="w-4 h-4" strokeWidth={1.5} />
          </button>

          {/* Segmented Workspace Pills */}
          <div className="flex items-center p-0.5 bg-slate-100/90 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.06] rounded-xl">
            {PROJECTS_CONFIG.map((proj) => {
              const isActive = currentWorkspace === proj.id;
              return (
                <button
                  key={proj.id}
                  onClick={() => setCurrentWorkspace(proj.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-white dark:bg-white/[0.12] text-slate-900 dark:text-white shadow-sm font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
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
        </div>

        {/* Global Controls: Theme Toggle, Line Status, Gateway & Admin */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Bitrix24 Digital Clock */}
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-xl text-slate-700 dark:text-slate-200 font-mono text-xs font-semibold shadow-sm">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>{currentTime || '09:00:00'}</span>
          </div>

          {/* Bitrix24 Workday Shift Tracker Button */}
          <div className="relative">
            <button
              onClick={() => setIsShiftMenuOpen(!isShiftMenuOpen)}
              className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all shadow-sm active:scale-95 ${
                workStatus === 'working'
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : workStatus === 'break'
                  ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : 'bg-slate-500/15 hover:bg-slate-500/25 text-slate-600 dark:text-slate-400 border-slate-500/30'
              }`}
              title="Облік робочого часу"
            >
              <span 
                className="w-2 h-2 rounded-full animate-pulse" 
                style={{ backgroundColor: workStatus === 'working' ? '#10b981' : workStatus === 'break' ? '#f59e0b' : '#94a3b8' }} 
              />
              <span className="font-extrabold uppercase tracking-wide">
                {workStatus === 'working' ? 'Працюю' : workStatus === 'break' ? 'Перерва' : 'Завершено'}
              </span>
              <span className="font-mono text-[11px] opacity-80 border-l border-current/20 pl-2 hidden sm:inline">
                {formatShiftTime(shiftSeconds)}
              </span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {isShiftMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl backdrop-blur-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Робочий день
                </div>
                <button
                  onClick={() => handleStatusChange('working')}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Почати / Продовжити</span>
                </button>
                <button
                  onClick={() => handleStatusChange('break')}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Перерва (Обід)</span>
                </button>
                <button
                  onClick={() => handleStatusChange('stopped')}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Завершити день</span>
                </button>
              </div>
            )}
          </div>

          {/* Corporate Line Live Busy / Free Indicator */}
          <div
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition cursor-default ${
              lineBusy
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            }`}
            title={lineBusy ? `Лінія зайнята: ${lineDetails?.activeManager || 'Менеджер'}` : 'Корпоративна лінія вільна'}
          >
            <span className={`w-2 h-2 rounded-full ${lineBusy ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
            <span className="hidden lg:inline">{lineBusy ? 'Лінія зайнята' : 'Лінія вільна'}</span>
          </div>

          {/* Theme Switcher: Light / Dark Toggle (Stripe/Linear style) */}
          <button
            onClick={toggleTheme}
            className="p-1.5 sm:px-2.5 sm:py-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.09] border border-slate-200 dark:border-white/[0.08] rounded-lg text-xs font-medium flex items-center gap-1.5 transition active:scale-95"
            title={isDark ? 'Перемкнути на світлу тему' : 'Перемкнути на темну тему'}
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.75} />
                <span className="hidden sm:inline">День</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-500" strokeWidth={1.75} />
                <span className="hidden sm:inline">Ніч</span>
              </>
            )}
          </button>

          {/* WhatsApp & Telegram Gateway */}
          <button
            onClick={() => openQRModal()}
            className="p-1.5 sm:px-2.5 sm:py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium flex items-center gap-1.5 transition active:scale-95"
            title="Підключення месенджерів"
          >
            <QrCode className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span className="hidden sm:inline">Шлюз</span>
          </button>

          {/* Admin Panel Key */}
          <button
            onClick={openAdminPanel}
            className="p-1.5 sm:px-2.5 sm:py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-lg text-xs font-medium flex items-center gap-1.5 transition active:scale-95"
            title="Панель адміністратора"
          >
            <Lock className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span className="hidden sm:inline">Адмін</span>
          </button>
        </div>
      </div>

      {/* Sub Bar: Active Pipeline Dropdown & Spotlight Search */}
      <div className="h-13 px-3 sm:px-5 py-2 flex items-center justify-between gap-3">
        {/* Pipeline Selector */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative max-w-[220px] sm:max-w-xs">
            <select
              value={activePipelineId}
              onChange={(e) => setActivePipelineId(e.target.value)}
              className="w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] focus:border-blue-500 dark:focus:border-blue-500/80 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 appearance-none pr-8 focus:outline-none cursor-pointer shadow-sm truncate transition"
            >
              {pipelines.map((pipe) => (
                <option key={pipe.id} value={pipe.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
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
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.75} />
            <input
              type="text"
              placeholder="Пошук угод..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] focus:border-blue-500 dark:focus:border-blue-500/80 focus:ring-2 focus:ring-blue-500/10 rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition"
            />
            <span className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 dark:text-slate-500 font-mono bg-white dark:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] px-1 py-0.2 rounded">
              ⌘K
            </span>
          </div>

          <button
            onClick={openCreateDeal}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm hover:shadow-md hover:shadow-blue-500/20 active:scale-95 flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            <span className="hidden sm:inline">Створити угоду</span>
          </button>
        </div>
      </div>
    </header>
  );
};
