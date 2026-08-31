import React from 'react';
import { 
  Kanban, 
  MessageSquare, 
  CheckSquare, 
  Users, 
  BarChart3, 
  GitMerge, 
  ShieldAlert, 
  QrCode,
  Zap,
  PhoneCall
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openQRModal: (channel?: 'whatsapp' | 'telegram') => void;
  openUserSwitcher: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  openQRModal,
  openUserSwitcher
}) => {
  const { currentUser } = useAuth();

  const navItems = [
    { id: 'deals', label: 'Сделки', icon: Kanban, badge: null },
    { id: 'inbox', label: 'Мессенджеры', icon: MessageSquare, badge: 'WA / TG' },
    { id: 'tasks', label: 'Задачи', icon: CheckSquare, badge: null },
    { id: 'contacts', label: 'Контакты', icon: Users, badge: null },
    { id: 'analytics', label: 'Аналитика', icon: BarChart3, badge: null },
    { id: 'automation', label: 'Автоворонка', icon: Zap, badge: 'PRO' },
    { id: 'users', label: '20 Пользователей', icon: ShieldAlert, badge: 'RBAC' },
  ];

  return (
    <aside className="w-64 bg-[#111827] border-r border-slate-800 flex flex-col justify-between flex-shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-slate-800 gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Kanban className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              <span>Online CRM</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-400 font-semibold px-1.5 py-0.5 rounded">amoPRO</span>
            </div>
            <p className="text-xs text-slate-400">Enterprise Edition</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
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

      {/* Messengers QR Quick Connect Card */}
      <div className="p-3 space-y-2 border-t border-slate-800/80 bg-slate-900/40">
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl p-3 border border-slate-700/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              Подключение QR
            </span>
            <span className="text-[10px] text-emerald-400 font-medium animate-pulse">● Live Sync</span>
          </div>
          <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
            Подключите WhatsApp и Telegram для переписки прямо из сделок.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => openQRModal('whatsapp')}
              className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition"
            >
              <span>WhatsApp QR</span>
            </button>
            <button
              onClick={() => openQRModal('telegram')}
              className="px-2.5 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition"
            >
              <span>Telegram QR</span>
            </button>
          </div>
        </div>

        {/* User Account / Role Switcher Trigger */}
        <div 
          onClick={openUserSwitcher}
          className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 cursor-pointer border border-slate-700/50 transition group"
        >
          <img
            src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={currentUser?.name}
            className="w-9 h-9 rounded-full object-cover border border-slate-600"
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate group-hover:text-blue-400 transition">
              {currentUser?.name || 'Пользователь'}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {currentUser?.department} • <span className="text-blue-400 font-medium">{currentUser?.role}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
