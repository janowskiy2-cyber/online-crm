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
  Square,
  Bell,
  HelpCircle,
  LogOut,
  UserCheck,
  Camera,
  Loader2,
  ShieldAlert
} from 'lucide-react';
import { Pipeline, ProjectCategory, ProjectInfo } from '../../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { api, socket } from '../../services/api';
import { compressImageToBase64 } from '../../utils/imageUtils';
import { DEFAULT_ADMIN_AVATAR } from '../../constants/defaultAvatar';

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
  openUserSwitcher?: () => void;
  openObjections?: () => void;
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
  openUserSwitcher,
  openObjections,
  onToggleMobileSidebar
}) => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [lineBusy, setLineBusy] = useState(false);
  const [lineDetails, setLineDetails] = useState<any>(null);

  const [currentTime, setCurrentTime] = useState<string>('09:51');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = React.useRef<HTMLDivElement>(null);
  
  // Database Avatar Upload State
  const { updateUserAvatar } = useAuth();
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarSuccessNotice, setAvatarSuccessNotice] = useState<string | null>(null);

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.id) return;
    try {
      setIsUploadingAvatar(true);
      const base64 = await compressImageToBase64(file);
      const ok = await updateUserAvatar(currentUser.id, base64);
      if (ok) {
        setAvatarSuccessNotice('Аватар збережено в базі даних!');
        setTimeout(() => setAvatarSuccessNotice(null), 3000);
      } else {
        alert('Помилка збереження аватарки в базу даних');
      }
    } catch (err: any) {
      alert('Помилка обробки фотографії');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

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
      setCurrentTime(now.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isProfileMenuOpen && !isShiftMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProfileMenuOpen(false);
        setIsShiftMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileMenuOpen, isShiftMenuOpen]);

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
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
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

  return (
    <header className="bitrix-glass-nav flex flex-col justify-between flex-shrink-0 select-none font-['Inter',sans-serif] z-20">
      {/* Authentic Bitrix24 Single Clean Top Row */}
      <div className="h-14 px-3 sm:px-6 flex items-center justify-between gap-3">
        {/* Left Side: Mobile Menu Trigger & Bitrix Logo / Workspace Pills */}
        <div className="flex items-center gap-3 min-w-max">
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-1.5 text-white/80 hover:text-white bg-white/10 rounded-lg transition"
            title="Меню"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Project Category Pills */}
          <div className="flex items-center p-0.5 bg-black/20 border border-white/10 rounded-xl">
            {PROJECTS_CONFIG.map((proj) => {
              const isActive = currentWorkspace === proj.id;
              const handleWorkspaceSelect = () => {
                setCurrentWorkspace(proj.id);
                if (proj.id === 'candidates') {
                  navigate('/candidates');
                } else if (proj.id === 'employers') {
                  navigate('/deals');
                } else if (proj.id === 'agencies') {
                  navigate('/contacts');
                } else if (proj.id === 'legal_logistics') {
                  navigate('/deals');
                }
              };
              return (
                <button
                  key={proj.id}
                  onClick={handleWorkspaceSelect}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-white/20 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <span style={{ color: proj.color }}>●</span>
                  <span>{proj.shortName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Omnisearch & Bitrix24 Large Digital Clock + Shift Status */}
        <div className="flex items-center gap-4 flex-1 justify-center max-w-2xl">
          {/* Bitrix Search Capsule */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <Search className="w-4 h-4 text-white/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="искать сотрудника, документ, кандидата..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/15 hover:bg-white/20 focus:bg-white/25 border border-white/20 focus:border-white/40 rounded-full pl-10 pr-4 py-1.5 text-xs text-white placeholder-white/60 focus:outline-none transition shadow-inner"
            />
          </div>

          {/* Bitrix24 Large Digital Clock: 09:51 */}
          <div className="flex items-center gap-3">
            <div className="text-2xl sm:text-3xl font-light text-white font-mono tracking-wider drop-shadow">
              {currentTime}
            </div>

            {/* Bitrix24 Workday Status Capsule */}
            <div className="relative">
              <button
                onClick={() => setIsShiftMenuOpen(!isShiftMenuOpen)}
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border transition shadow-sm active:scale-95 ${
                  workStatus === 'working'
                    ? 'bg-white/20 hover:bg-white/30 text-white border-white/30'
                    : workStatus === 'break'
                    ? 'bg-amber-500/30 hover:bg-amber-500/40 text-amber-300 border-amber-500/40'
                    : 'bg-slate-700/50 hover:bg-slate-700/70 text-slate-300 border-slate-600'
                }`}
              >
                <span 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: workStatus === 'working' ? '#34d399' : workStatus === 'break' ? '#fbbf24' : '#94a3b8' }} 
                />
                <span className="uppercase tracking-wider font-extrabold text-[11px]">
                  {workStatus === 'working' ? 'РАБОТАЮ' : workStatus === 'break' ? 'ПЕРЕРЫВ' : 'ЗАВЕРШЕН'}
                </span>
                <span className="text-[10px] opacity-75 font-mono hidden sm:inline">
                  {formatShiftTime(shiftSeconds)}
                </span>
              </button>

              {isShiftMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-900/95 border border-white/15 rounded-2xl shadow-2xl backdrop-blur-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400">
                    Учет времени
                  </div>
                  <button
                    onClick={() => handleStatusChange('working')}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Продолжить день</span>
                  </button>
                  <button
                    onClick={() => handleStatusChange('break')}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-amber-400 hover:bg-amber-500/10 transition"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Перерыв / Обед</span>
                  </button>
                  <button
                    onClick={() => handleStatusChange('stopped')}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Завершить день</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: User Profile, Help Icon, Notification Bell */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Hidden File Input for Database Avatar */}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarFileSelect}
            className="hidden"
          />

          {/* User Profile Capsule (Bitrix Оксана Черезова Style) */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 py-1 px-2 rounded-xl hover:bg-white/10 transition"
            >
              <img
                src={currentUser?.avatar || DEFAULT_ADMIN_AVATAR}
                alt="Профіль"
                className="w-8 h-8 rounded-full object-cover border border-white/30"
              />
              <span className="text-xs font-bold text-white hidden md:inline">
                {currentUser?.name || 'Головний Адміністратор'}
              </span>
              <ChevronDown className="w-3 h-3 text-white/70" />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900/95 border border-white/15 rounded-2xl shadow-2xl backdrop-blur-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-white">{currentUser?.name || 'Головний Адміністратор'}</div>
                    <div className="text-[10px] text-slate-400">{currentUser?.email || 'admin@crm.pro'}</div>
                  </div>
                  <img
                    src={currentUser?.avatar || DEFAULT_ADMIN_AVATAR}
                    alt="Аватар"
                    className="w-9 h-9 rounded-full object-cover border-2 border-cyan-400"
                  />
                </div>

                {avatarSuccessNotice && (
                  <div className="m-2 p-1.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center text-[11px] font-bold text-emerald-400 animate-in fade-in">
                    {avatarSuccessNotice}
                  </div>
                )}

                <div className="p-1 space-y-1 text-xs">
                  {/* Avatar Upload Button (Saved directly to DB) */}
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-cyan-400 hover:bg-cyan-500/10 transition font-semibold"
                    title="Завантажити фото з комп'ютера та зберегти в базу даних"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                    <span>{isUploadingAvatar ? 'Збереження в БД...' : 'Змінити аватар (в базу даних)'}</span>
                  </button>

                  <button
                    onClick={() => { openAdminPanel(); setIsProfileMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-rose-400 hover:bg-rose-500/10 transition font-semibold"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Панель адміністратора</span>
                  </button>

                  <button
                    onClick={() => { if (openUserSwitcher) openUserSwitcher(); setIsProfileMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-purple-400 hover:bg-purple-500/10 transition font-semibold"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Матриця прав / Зміна користувача (RBAC)</span>
                  </button>

                  <button
                    onClick={() => { openQRModal(); setIsProfileMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-emerald-400 hover:bg-emerald-500/10 transition font-semibold"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Шлюз WhatsApp / Telegram</span>
                  </button>

                  <button
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-slate-300 hover:bg-white/10 transition"
                  >
                    {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
                    <span>{isDark ? 'Денний режим' : 'Нічний режим'}</span>
                  </button>

                  <div className="my-1 border-t border-white/10" />

                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-white/5 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Вийти з системи</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Help Icon: ? 2 — База знань & Скрипти */}
          <div className="relative">
            <button
              onClick={() => openObjections ? openObjections() : openQRModal()}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition text-xs font-bold"
              title="База знань та регламенти роботи"
            >
              <span>?</span>
            </button>
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-black flex items-center justify-center border border-[#0e1424]">
              2
            </span>
          </div>

          {/* Notification Bell: 🔔 1 (Bitrix Iconic Notification Badge) */}
          <div className="relative">
            <button
              onClick={openCreateDeal}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              title="Сповіщення"
            >
              <Bell className="w-4 h-4" />
            </button>
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border border-[#0e1424] animate-pulse">
              1
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
