import React from 'react';
import { 
  Kanban, 
  MessageSquare, 
  CheckSquare, 
  Users, 
  BarChart3, 
  Zap, 
  Globe2, 
  Calculator, 
  Sparkles, 
  Lock, 
  Share2, 
  LogOut, 
  X, 
  Rss, 
  Building2,
  Settings,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { DEFAULT_ADMIN_AVATAR } from '../../constants/defaultAvatar';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openQRModal: (channel?: 'whatsapp' | 'telegram') => void;
  openUserSwitcher: () => void;
  openCalculator: () => void;
  openObjections: () => void;
  openAdminPanel: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  openQRModal,
  openUserSwitcher,
  openCalculator,
  openObjections,
  openAdminPanel,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const pathTab = location.pathname.split('/')[1];
  const activeTab = pathTab || currentTab || 'feed';

  const navItems = [
    { id: 'feed', label: 'Живая лента', icon: Rss, badge: null },
    { id: 'tasks', label: 'Задачи и Проекты', icon: CheckSquare, badge: null },
    { id: 'inbox', label: 'Чат и звонки', icon: MessageSquare, badge: 'WA / TG' },
    { id: 'contacts', label: 'Работодатели (Клиенты)', icon: Building2, badge: 'B2B' },
    { id: 'candidates', label: 'База кандидатов', icon: Globe2, badge: 'POOL' },
    { id: 'deals', label: 'CRM (Воронка сделок)', icon: Kanban, badge: null },
    { id: 'analytics', label: 'Аналитика и отчеты', icon: BarChart3, badge: null },
    { id: 'integrations', label: 'Реклама и вебхуки', icon: Share2, badge: 'ADS' },
    { id: 'automation', label: 'Автоворонка', icon: Zap, badge: 'AUTO' },
  ];

  const handleNavClick = (tabId: string) => {
    setCurrentTab(tabId);
    navigate(`/${tabId}`);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in"
        />
      )}

      {/* Main Sidebar Shell (Bitrix24 Floating Glass Sidebar) */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40
        w-64 md:w-56 bitrix-glass-sidebar flex flex-col justify-between flex-shrink-0 select-none font-['Inter',sans-serif]
        transform transition-transform duration-200 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div>
          {/* Brand Header */}
          <div className="h-14 flex items-center justify-between px-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white drop-shadow">
                Битрикс 24
              </span>
              <span className="text-[9px] bg-blue-500/20 text-blue-300 font-bold px-1.5 py-0.2 rounded border border-blue-500/30">
                PRO
              </span>
            </div>

            {onCloseMobile && (
              <button 
                onClick={onCloseMobile}
                className="md:hidden p-1 text-white/60 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Navigation Menu */}
          <nav className="p-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  data-nav-id={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2 rounded-full text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-white/20 text-white font-bold shadow-sm backdrop-blur-md'
                      : 'text-slate-200/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-300/70'}`} strokeWidth={1.75} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1 flex-shrink-0 ${
                      isActive 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white/15 text-slate-200'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions: Калькулятор, Заперечення, Додаток & Співробітники */}
        <div className="p-3 space-y-1.5 border-t border-white/10">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={openCalculator}
              className="py-1.5 px-2 text-[11px] font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition"
              title="Калькулятор комісій та маржинальності"
            >
              <Calculator className="w-3.5 h-3.5 text-blue-400" />
              <span>Калькулятор</span>
            </button>

            <button
              onClick={openObjections}
              className="py-1.5 px-2 text-[11px] font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition"
              title="Скрипти та відпрацювання заперечень B2B"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Скрипти</span>
            </button>
          </div>

          {/* Administrator / Current User Profile Capsule */}
          <div 
            onClick={openAdminPanel}
            className="p-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-2xl flex items-center gap-2.5 cursor-pointer transition select-none group"
            title="Профіль та налаштування адміністратора"
          >
            <div className="relative flex-shrink-0">
              <img
                src={currentUser?.avatar || DEFAULT_ADMIN_AVATAR}
                alt={currentUser?.name || 'Адміністратор'}
                className="w-9 h-9 rounded-xl object-cover border border-white/20 group-hover:border-blue-400 transition"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0e1320]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate group-hover:text-blue-400 transition">
                {currentUser?.name || 'Головний Адміністратор'}
              </div>
              <div className="text-[10px] text-blue-400/90 font-medium truncate">
                {currentUser?.role === 'super_admin' ? 'Суперадміністратор' : (currentUser?.department || 'Керівництво')}
              </div>
            </div>
            <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition flex-shrink-0" />
          </div>

          <button
            onClick={openAdminPanel}
            className="w-full py-2 px-3 bg-gradient-to-r from-blue-600/80 to-indigo-600/80 hover:from-blue-600 hover:to-indigo-600 text-white rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition border border-white/15 shadow-md shadow-blue-600/20 active:scale-95"
          >
            <span>Пригласить сотрудников</span>
            <span className="text-sm font-black">+</span>
          </button>
        </div>
      </aside>
    </>
  );
};
