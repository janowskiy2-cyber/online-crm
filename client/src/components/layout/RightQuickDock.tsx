import React from 'react';
import { 
  Search, 
  Phone, 
  MessageSquare, 
  HelpCircle, 
  Bell, 
  UserCheck, 
  Sparkles 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_ADMIN_AVATAR } from '../../constants/defaultAvatar';

interface RightQuickDockProps {
  onQuickCall: () => void;
  onOpenMessenger: () => void;
  onSelectColleague?: (colleague: any) => void;
}

export const RightQuickDock: React.FC<RightQuickDockProps> = ({
  onQuickCall,
  onOpenMessenger,
  onSelectColleague
}) => {
  const { currentUser, users, presence } = useAuth();

  // Load real colleagues from DB users with LIVE presence from backend
  const activeColleagues = users && users.length > 0
    ? users
        .filter(u => u.id !== currentUser?.id)
        .slice(0, 8)
        .map(u => {
          const userPres = presence[u.id];
          const status = userPres ? userPres.status : 'offline';
          return {
            id: u.id,
            name: u.name,
            role: u.role,
            department: u.department,
            email: u.email,
            phone: u.phone || '+380',
            status: status as 'online' | 'away' | 'offline',
            todayTimeFormatted: userPres?.todayTimeFormatted || '0 хв',
            weekTimeFormatted: userPres?.weekTimeFormatted || '0 хв',
            todayMinutes: userPres?.todayMinutes || 0,
            avatar: u.avatar || DEFAULT_ADMIN_AVATAR
          };
        })
    : [];

  return (
    <aside className="w-14 flex flex-col justify-between items-center py-3 bg-slate-900/40 backdrop-blur-2xl border-l border-white/10 select-none flex-shrink-0 z-30">
      {/* Top Section: Quick Search & Notification */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={onOpenMessenger}
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition"
          title="Швидкий пошук співробітника"
        >
          <Search className="w-4 h-4" />
        </button>

        <div className="w-6 h-[1px] bg-white/10" />

        {/* Online Colleagues Avatars Stack with REAL Presence */}
        <div className="flex flex-col items-center gap-2.5">
          {activeColleagues.map((colleague) => {
            const isOnline = colleague.status === 'online';
            const isAway = colleague.status === 'away';
            return (
              <div
                key={colleague.id}
                onClick={() => onSelectColleague && onSelectColleague(colleague)}
                className="relative group cursor-pointer"
                title={`${colleague.name} (${colleague.role}) — ${isOnline ? '🟢 Онлайн' : isAway ? '🟡 Відійшов' : '⚪ Офлайн'}`}
              >
                <img
                  src={colleague.avatar}
                  alt={colleague.name}
                  className={`w-9 h-9 rounded-full object-cover border-2 transition transform group-hover:scale-105 ${
                    isOnline 
                      ? 'border-emerald-400 shadow-sm shadow-emerald-400/30' 
                      : isAway 
                        ? 'border-amber-400/80' 
                        : 'border-white/20 opacity-70 group-hover:opacity-100'
                  }`}
                />
                <span 
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#0e1424] ${
                    isOnline 
                      ? 'bg-emerald-400 shadow-sm shadow-emerald-400/60 animate-pulse' 
                      : isAway 
                        ? 'bg-amber-400' 
                        : 'bg-slate-500'
                  }`}
                />

                {/* Hover Tooltip Popup with Real Workday Stats */}
                <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden group-hover:flex flex-col gap-1 px-3 py-2 bg-slate-900/95 border border-white/15 rounded-xl shadow-2xl backdrop-blur-xl whitespace-nowrap z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{colleague.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      isOnline ? 'bg-emerald-500/20 text-emerald-400' : isAway ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isOnline ? 'Онлайн' : isAway ? 'Відійшов' : 'Офлайн'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Посада: <span className="text-slate-200">{colleague.role}</span>
                  </div>
                  <div className="text-[10px] text-cyan-400 font-mono flex items-center gap-1 border-t border-white/10 pt-1 mt-0.5">
                    ⏱️ Сьогодні в CRM: <span className="font-bold text-white">{colleague.todayTimeFormatted}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: 1-Click Phone Call Button (Iconic Bitrix24 Green Call Dock) */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={onQuickCall}
          className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 hover:shadow-emerald-500/60 transition-all transform hover:scale-110 active:scale-95 animate-pulse"
          title="Швидкий виклик / Телефонія"
        >
          <Phone className="w-5 h-5 fill-current" />
        </button>
      </div>
    </aside>
  );
};
