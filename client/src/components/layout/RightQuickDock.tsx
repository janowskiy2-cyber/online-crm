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
  const { currentUser, users } = useAuth();

  // Load real colleagues from DB users (excluding current user and duplicate root admin)
  const activeColleagues = users && users.length > 1
    ? users
        .filter(u => u.id !== currentUser?.id && (currentUser?.role !== 'super_admin' || u.role !== 'super_admin'))
        .slice(0, 6)
        .map(u => ({
          id: u.id,
          name: u.name,
          role: u.role,
          department: u.department,
          email: u.email,
          phone: u.phone || '+380',
          status: (u.isActive ? 'online' : 'busy') as 'online' | 'busy' | 'offline',
          avatar: u.avatar || DEFAULT_ADMIN_AVATAR
        }))
    : [
        { id: '1', name: 'Олег Строкатий', role: 'Керівник', department: 'Керівництво', email: 'oleg@crm.pro', phone: '+380671112233', status: 'online' as const, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face' },
        { id: '2', name: 'Катерина Шеленкова', role: 'HR Скринінг', department: 'Відділ найму', email: 'katerina@crm.pro', phone: '+380682223344', status: 'online' as const, avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face' },
        { id: '3', name: 'Дмитро Філаткін', role: 'Координатор', department: 'Логістика кандидатів', email: 'dmitro@crm.pro', phone: '+380993334455', status: 'online' as const, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face' },
        { id: '4', name: 'Наталія Грихіна', role: 'Юрист (Візи)', department: 'Юридичний супровід', email: 'natalia@crm.pro', phone: '+380974445566', status: 'busy' as const, avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face' }
      ];

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

        {/* Online Colleagues Avatars Stack */}
        <div className="flex flex-col items-center gap-2.5">
          {activeColleagues.map((colleague) => (
            <div
              key={colleague.id}
              onClick={() => onSelectColleague && onSelectColleague(colleague)}
              className="relative group cursor-pointer"
              title={`Картка співробітника: ${colleague.name} (${colleague.role})`}
            >
              <img
                src={colleague.avatar}
                alt={colleague.name}
                className="w-9 h-9 rounded-full object-cover border-2 border-white/20 hover:border-blue-400 transition transform group-hover:scale-105"
              />
              <span 
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#0e1424] ${
                  colleague.status === 'online' ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />

              {/* Hover Tooltip Popup */}
              <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-2 px-2.5 py-1.5 bg-slate-900/95 border border-white/15 rounded-xl shadow-2xl backdrop-blur-xl whitespace-nowrap z-50 animate-in fade-in zoom-in-95">
                <span className="text-xs font-bold text-white">{colleague.name}</span>
                <span className="text-[10px] text-slate-400">({colleague.role})</span>
              </div>
            </div>
          ))}
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
