import React from 'react';
import { 
  Kanban, 
  MessageSquare, 
  CheckSquare, 
  Users, 
  BarChart3, 
  ShieldAlert, 
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
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden animate-in fade-in"
        />
      )}

      {/* Sidebar Element */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-72 md:w-64 bg-[#0e1320] border-r border-slate-800 flex flex-col justify-between flex-shrink-0 select-none font-['Inter',sans-serif]
        transform transition-transform duration-200 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div>
          {/* Brand Header */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 bg-[#111827]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Globe2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                  <span>Recruiting CRM</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded">PRO</span>
                </div>
                <p className="text-[11px] text-slate-400">Міжнародний найм у штат</p>
              </div>
            </div>

            {/* Mobile Close Button */}
            {onCloseMobile && (
              <button 
                onClick={onCloseMobile}
                className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Quick Sales Tools Bar */}
          <div className="p-3 pb-1 grid grid-cols-2 gap-1.5">
            <button
              onClick={() => { openCalculator(); if (onCloseMobile) onCloseMobile(); }}
              className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Калькулятор</span>
            </button>

            <button
              onClick={() => { openObjections(); if (onCloseMobile) onCloseMobile(); }}
              className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Заперечення</span>
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Admin Panel & Messengers & User Profile */}
        <div className="p-3 space-y-2 border-t border-slate-800/80 bg-slate-900/40">
          
          {/* Admin Panel Master Trigger */}
          <button
            onClick={() => { openAdminPanel(); if (onCloseMobile) onCloseMobile(); }}
            className="w-full py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center justify-between transition shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>Адмін-панель</span>
            </div>
            <span className="text-[10px] bg-rose-500/20 px-1.5 py-0.5 rounded font-mono">ROOT</span>
          </button>

          {/* Messengers QR Quick Connect Card */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-3 border border-slate-700/60">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                <span>Шлюз месенджерів</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">● 0 €</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={() => { openQRModal('whatsapp'); if (onCloseMobile) onCloseMobile(); }}
                className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <span>WhatsApp</span>
              </button>
              <button
                onClick={() => { openQRModal('telegram'); if (onCloseMobile) onCloseMobile(); }}
                className="px-2.5 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <span>Telegram</span>
              </button>
            </div>
          </div>

          {/* User Account & Logout */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-slate-800/40 border border-slate-700/50">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={currentUser?.name}
                className="w-8 h-8 rounded-full object-cover border border-slate-600"
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {currentUser?.name || 'Адміністратор'}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {currentUser?.department}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Вийти"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
