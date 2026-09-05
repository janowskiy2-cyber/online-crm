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
  ShieldAlert,
  Briefcase,
  CheckSquare,
  X
} from 'lucide-react';
import { Pipeline, ProjectCategory, ProjectInfo } from '../../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { api, socket } from '../../services/api';
import { compressImageToBase64 } from '../../utils/imageUtils';
import { DEFAULT_ADMIN_AVATAR } from '../../constants/defaultAvatar';
import { NotificationsPopover } from '../common/NotificationsPopover';

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
  onOpenDeal?: (dealId: string) => void;
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
  onToggleMobileSidebar,
  onOpenDeal
}) => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [lineBusy, setLineBusy] = useState(false);
  const [lineDetails, setLineDetails] = useState<any>(null);

  const [currentTime, setCurrentTime] = useState<string>('09:51');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const profileMenuRef = React.useRef<HTMLDivElement>(null);

  // Synaptic Omnisearch State
  const [omniData, setOmniData] = useState<{
    terms: string[];
    deals: any[];
    candidates: any[];
    employers: any[];
    tasks: any[];
    totalFound: number;
  } | null>(null);
  const [isOmniLoading, setIsOmniLoading] = useState(false);
  const [isOmniOpen, setIsOmniOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);

  // Omnisearch Synapse Fetcher
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setOmniData(null);
      setIsOmniLoading(false);
      return;
    }

    setIsOmniLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/ai/omnisearch', { params: { q: searchQuery.trim() } });
        setOmniData(res.data);
      } catch (err) {
        console.warn('Omnisearch error:', err);
      } finally {
        setIsOmniLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener for Omnisearch Popover
  useEffect(() => {
    if (!isOmniOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsOmniOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOmniOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOmniOpen]);
  
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

          <button
            onClick={() => setIsMobileSearchOpen(prev => !prev)}
            className="md:hidden p-1.5 text-white/80 hover:text-white bg-white/10 rounded-lg transition"
            title="ШІ-пошук"
          >
            <Search className="w-5 h-5" />
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
          {/* Bitrix Search Capsule with Synaptic AI Omnisearch */}
          <div ref={searchContainerRef} className="relative flex-1 max-w-md hidden md:block">
            <Search className="w-4 h-4 text-white/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="ШІ-пошук: синоніми, посада, угода, кандидат..."
              value={searchQuery}
              onFocus={() => {
                if (searchQuery.trim().length >= 2) setIsOmniOpen(true);
              }}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim().length >= 2) {
                  setIsOmniOpen(true);
                }
              }}
              className="w-full bg-white/15 hover:bg-white/20 focus:bg-white/25 border border-white/20 focus:border-white/40 rounded-full pl-10 pr-9 py-1.5 text-xs text-white placeholder-white/60 focus:outline-none transition shadow-inner"
            />
            {isOmniLoading ? (
              <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsOmniOpen(false);
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition"
                title="Очистити"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}

            {/* Omnisearch Synaptic Dropdown Popover */}
            {isOmniOpen && searchQuery.trim().length >= 2 && (
              <div className="absolute left-0 right-0 sm:-left-8 sm:-right-8 mt-2 bg-slate-900/95 border border-white/20 rounded-2xl shadow-2xl backdrop-blur-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 max-h-[75vh] overflow-y-auto">
                {/* Popover Header with Synaptic expansion */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[11px] font-extrabold text-white uppercase tracking-wider">
                      Синаптичний ШІ-пошук
                    </span>
                  </div>
                  {isOmniLoading ? (
                    <span className="text-[10px] text-sky-400 font-mono flex items-center gap-1">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" /> Аналіз синапсів...
                    </span>
                  ) : omniData ? (
                    <span className="text-[10px] text-slate-400 font-mono">
                      Знайдено: {omniData.totalFound}
                    </span>
                  ) : null}
                </div>

                {/* Synapse Terms Tags */}
                {omniData?.terms && omniData.terms.length > 0 && (
                  <div className="mb-3 px-1">
                    <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
                      <span>🧠 Активовані синапси (синоніми):</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {omniData.terms.slice(0, 7).map((term, idx) => (
                        <span 
                          key={idx} 
                          className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/40 text-[10px] font-semibold text-blue-300"
                        >
                          {term}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Body Content */}
                {isOmniLoading && !omniData ? (
                  <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                    <span>Пошук по всій CRM з синаптичним аналізом...</span>
                  </div>
                ) : omniData && omniData.totalFound === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    Нічого не знайдено за запитом «<span className="text-white font-medium">{searchQuery}</span>»
                  </div>
                ) : omniData ? (
                  <div className="space-y-3 text-left">
                    {/* Deals Section */}
                    {omniData.deals && omniData.deals.length > 0 && (
                      <div>
                        <div className="px-1 text-[10px] uppercase font-bold text-blue-400 tracking-wider flex items-center justify-between mb-1">
                          <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> Угоди / Сделки</span>
                          <span className="text-slate-400 font-normal">{omniData.deals.length}</span>
                        </div>
                        <div className="space-y-1">
                          {omniData.deals.map((deal: any) => (
                            <div
                              key={deal.id}
                              onClick={() => {
                                if (onOpenDeal) {
                                  onOpenDeal(deal.id);
                                } else {
                                  navigate(`/deals/${deal.id}`);
                                }
                                setIsOmniOpen(false);
                              }}
                              className="p-2 rounded-xl bg-white/5 hover:bg-blue-600/20 border border-white/5 hover:border-blue-500/30 cursor-pointer transition flex items-center justify-between"
                            >
                              <div className="min-w-0 flex-1 mr-2">
                                <div className="text-xs font-semibold text-white truncate">{deal.title}</div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {deal.contact?.name || deal.company?.name || 'Без контакту'}
                                </div>
                              </div>
                              {deal.stage?.name && (
                                <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-[10px] font-bold text-blue-300 shrink-0">
                                  {deal.stage.name}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Candidates Section */}
                    {omniData.candidates && omniData.candidates.length > 0 && (
                      <div>
                        <div className="px-1 text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center justify-between mb-1">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Кандидати (Пул)</span>
                          <span className="text-slate-400 font-normal">{omniData.candidates.length}</span>
                        </div>
                        <div className="space-y-1">
                          {omniData.candidates.map((cand: any) => (
                            <div
                              key={cand.id}
                              onClick={() => {
                                navigate('/candidates');
                                setIsOmniOpen(false);
                              }}
                              className="p-2 rounded-xl bg-white/5 hover:bg-emerald-600/20 border border-white/5 hover:border-emerald-500/30 cursor-pointer transition flex items-center justify-between"
                            >
                              <div className="min-w-0 flex-1 mr-2">
                                <div className="text-xs font-semibold text-white truncate">{cand.name}</div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {cand.profession || 'Кандидат'} • {cand.country || 'Країна не вказана'}
                                </div>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                {cand.phone || cand.whatsapp || ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Employers / Companies Section */}
                    {omniData.employers && omniData.employers.length > 0 && (
                      <div>
                        <div className="px-1 text-[10px] uppercase font-bold text-indigo-400 tracking-wider flex items-center justify-between mb-1">
                          <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> Роботодавці</span>
                          <span className="text-slate-400 font-normal">{omniData.employers.length}</span>
                        </div>
                        <div className="space-y-1">
                          {omniData.employers.map((emp: any) => (
                            <div
                              key={emp.id}
                              onClick={() => {
                                navigate('/contacts');
                                setIsOmniOpen(false);
                              }}
                              className="p-2 rounded-xl bg-white/5 hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/30 cursor-pointer transition flex items-center justify-between"
                            >
                              <div className="min-w-0 flex-1 mr-2">
                                <div className="text-xs font-semibold text-white truncate">{emp.name}</div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {emp.address || emp.phone || 'Роботодавець B2B'}
                                </div>
                              </div>
                              {emp._count && (
                                <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-[10px] font-medium text-indigo-300 shrink-0">
                                  {emp._count.deals || 0} угод • {emp._count.contacts || 0} конт.
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tasks Section */}
                    {omniData.tasks && omniData.tasks.length > 0 && (
                      <div>
                        <div className="px-1 text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center justify-between mb-1">
                          <span className="flex items-center gap-1"><CheckSquare className="w-3 h-3" /> Завдання</span>
                          <span className="text-slate-400 font-normal">{omniData.tasks.length}</span>
                        </div>
                        <div className="space-y-1">
                          {omniData.tasks.map((task: any) => (
                            <div
                              key={task.id}
                              onClick={() => {
                                navigate('/tasks');
                                setIsOmniOpen(false);
                              }}
                              className="p-2 rounded-xl bg-white/5 hover:bg-amber-600/20 border border-white/5 hover:border-amber-500/30 cursor-pointer transition flex items-center justify-between"
                            >
                              <div className="min-w-0 flex-1 mr-2">
                                <div className="text-xs font-semibold text-white truncate">{task.text}</div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {task.deal?.title ? `Угода: ${task.deal.title}` : (task.responsible?.name || 'Завдання')}
                                </div>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${task.isCompleted ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                                {task.isCompleted ? 'Виконано' : 'В роботі'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Popover Footer */}
                {omniData && omniData.totalFound > 0 && (
                  <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 px-1">
                    <span>Всього результатів: {omniData.totalFound}</span>
                    <span className="font-mono">Esc щоб закрити</span>
                  </div>
                )}
              </div>
            )}
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

          {/* Notification Bell: 🔔 (Bitrix/amoCRM Dedicated System Notifications) */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(prev => !prev)}
              className={`w-8 h-8 rounded-full transition flex items-center justify-center ${
                isNotificationsOpen ? 'bg-white/30 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title="Сповіщення системи та воронок"
            >
              <Bell className="w-4 h-4" />
            </button>
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border border-[#0e1424] animate-pulse pointer-events-none">
              2
            </span>

            <NotificationsPopover
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
            />
          </div>
        </div>
      </div>

      {/* Mobile Omnisearch Input Bar */}
      {isMobileSearchOpen && (
        <div className="md:hidden px-3 py-2 border-t border-white/10 bg-black/50 backdrop-blur-md animate-in slide-in-from-top-2">
          <div className="relative">
            <Search className="w-4 h-4 text-white/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="ШІ-пошук: синоніми, угода, кандидат..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/15 border border-white/20 rounded-full pl-9 pr-8 py-1.5 text-xs text-white placeholder-white/60 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
