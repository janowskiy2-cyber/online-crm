import React from 'react';
import { 
  Kanban, 
  MessageSquare, 
  CheckSquare, 
  Users, 
  BarChart3, 
  QrCode,
  Zap,
  Globe2,
  Calculator,
  Sparkles,
  Lock,
  Share2,
  LogOut,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLocation, useNavigate } from 'react-router-dom';

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
  const { isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const pathTab = location.pathname.split('/')[1];
  const activeTab = pathTab || currentTab || 'deals';

  const navItems = [
    { id: 'deals', label: 'Воронка угод', icon: Kanban, badge: null },
    { id: 'inbox', label: 'Месенджери', icon: MessageSquare, badge: 'WA / TG' },
    { id: 'candidates', label: 'База кандидатів', icon: Globe2, badge: 'POOL' },
    { id: 'integrations', label: 'Реклама & Вебхуки', icon: Share2, badge: 'ADS' },
    { id: 'tasks', label: 'Завдання', icon: CheckSquare, badge: null },
    { id: 'contacts', label: 'Підприємства', icon: Users, badge: null },
    { id: 'analytics', label: 'Аналітика & KPI', icon: BarChart3, badge: null },
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

      {/* Main Sidebar Shell */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-72 md:w-60 bg-slate-50/90 dark:bg-[#090d16] border-r border-slate-200/80 dark:border-white/[0.08] flex flex-col justify-between flex-shrink-0 select-none font-['Inter',sans-serif]
        transform transition-transform duration-200 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div>
          {/* Brand Header */}
          <div className="h-12 flex items-center justify-between px-4 border-b border-slate-200/80 dark:border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-sm shadow-blue-500/20">
                <Globe2 className="w-4 h-4 text-white" strokeWidth={1.75} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">Recruiting CRM</span>
                <span className="text-[9px] bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold px-1.5 py-0.2 rounded border border-blue-500/20">PRO</span>
              </div>
            </div>

            {/* Mobile Close Button */}
            {onCloseMobile && (
              <button 
                onClick={onCloseMobile}
                className="md:hidden p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Sales Tools Bar */}
          <div className="p-2.5 pb-1 grid grid-cols-2 gap-1.5">
            <button
              onClick={() => { openCalculator(); if (onCloseMobile) onCloseMobile(); }}
              className="p-1.5 bg-amber-500/10 hover:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Calculator className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Калькулятор</span>
            </button>

            <button
              onClick={() => { openObjections(); if (onCloseMobile) onCloseMobile(); }}
              className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Скрипти</span>
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="p-2.5 space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} strokeWidth={1.75} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                      isActive 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-200 dark:bg-white/[0.08] text-slate-600 dark:text-slate-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile, Quick Gateway and Admin */}
        <div className="p-2.5 space-y-2 border-t border-slate-200/80 dark:border-white/[0.06] bg-slate-100/50 dark:bg-white/[0.02]">
          {/* Admin Panel Master Trigger */}
          <button
            onClick={() => { openAdminPanel(); if (onCloseMobile) onCloseMobile(); }}
            className="w-full py-1.5 px-2.5 bg-rose-500/10 hover:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/20 rounded-lg text-xs font-medium flex items-center justify-between transition active:scale-95"
          >
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-rose-500" strokeWidth={1.75} />
              <span>Адмін-панель</span>
            </div>
            <span className="text-[9px] bg-rose-500/20 text-rose-700 dark:text-rose-300 px-1 py-0.2 rounded font-mono font-bold">PIN</span>
          </button>

          {/* User Account & Logout */}
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06]">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="relative">
                <img
                  src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={currentUser?.name}
                  className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                />
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#090d16]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {currentUser?.name || 'Адміністратор'}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {currentUser?.department || 'Керівництво'}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Вийти з акаунта"
              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
