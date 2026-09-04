import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Activity, 
  Cake, 
  UserPlus, 
  Plus,
  Phone, 
  MessageSquare, 
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

interface RightWidgetSidebarProps {
  onOpenTasks?: () => void;
  onOpenFeed?: () => void;
  onCallUser?: (name: string, phone: string) => void;
}

export const RightWidgetSidebar: React.FC<RightWidgetSidebarProps> = ({
  onOpenTasks,
  onOpenFeed,
  onCallUser
}) => {
  const { currentUser } = useAuth();
  
  // Important Announcements State
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  const announcements = [
    {
      id: 1,
      author: 'Олег Строкатий',
      role: 'Керівник відділу',
      date: 'Сьогодні, 10:15',
      title: 'У середу оновлення шлюзу WhatsApp',
      text: 'Прохання перевірити всі термінові діалоги до 18:00 у зв\'язку з плановим оновленням сесій.',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face'
    },
    {
      id: 2,
      author: 'Роман Яновський',
      role: 'CEO / Засновник',
      date: 'Вчора, 14:00',
      title: 'Нова квота: 25 зварювальників у Польщу',
      text: 'Термінове замовлення на завод металоконструкцій у Гданську. Ставка 28 PLN/год.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
    }
  ];

  // Tasks Summary State (Matching Bitrix24 numbers)
  const [taskCounts, setTaskCounts] = useState({
    doing: 4,
    doingNew: 3,
    helping: 1,
    helpingNew: 1,
    assigned: 1,
    assignedNew: 1,
    observing: 32,
    observingNew: 11
  });

  const currentAnnounce = announcements[announcementIndex] || announcements[0];

  return (
    <aside className="w-72 2xl:w-80 flex flex-col gap-3 p-3 overflow-y-auto select-none flex-shrink-0 font-['Inter',sans-serif]">
      
      {/* 1. Quick Action: Invite Colleague Button (Bitrix Cyan Style) */}
      <button
        type="button"
        onClick={() => onOpenFeed?.()}
        className="w-full py-2.5 px-4 bg-[#29c2d1] hover:bg-[#22b2c1] text-white rounded-xl font-bold text-xs flex items-center justify-between shadow-md transition transform active:scale-95 uppercase tracking-wider"
      >
        <span>Пригласить сотрудников</span>
        <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-sm font-black">+</span>
      </button>

      {/* 2. Company Pulse Card (Bitrix24 Pulse) */}
      <div className="bitrix-widget-card">
        <div className="bg-[#4bc3d8] px-3.5 py-1.5 flex items-center justify-between text-white">
          <span className="text-[11px] font-bold uppercase tracking-wider">Пульс компании</span>
          <div className="flex items-center gap-1.5 bg-white/20 px-2 py-0.5 rounded text-[11px] font-mono font-bold">
            <span>1</span>
            <span className="opacity-60">|</span>
            <span>0%</span>
          </div>
        </div>
        <div className="p-3 bg-slate-900/90 text-xs space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span>Активность компании за неделю</span>
            <span className="text-cyan-400 font-bold">86%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full w-[86%]" />
          </div>
        </div>
      </div>

      {/* 3. Important Announcement Card (Bitrix24 Pinned Widget) */}
      <div className="bitrix-widget-card border-amber-500/30">
        <div className="bg-[#c27845] px-3.5 py-1.5 flex items-center justify-between text-white">
          <span className="text-[11px] font-bold uppercase tracking-wider">Важные сообщения</span>
          <div className="flex items-center gap-1 text-[11px] font-mono">
            <button
              onClick={() => setAnnouncementIndex(prev => prev > 0 ? prev - 1 : announcements.length - 1)}
              className="hover:text-amber-200"
            >
              &lt;
            </button>
            <span>{announcementIndex + 1} / {announcements.length}</span>
            <button
              onClick={() => setAnnouncementIndex(prev => prev < announcements.length - 1 ? prev + 1 : 0)}
              className="hover:text-amber-200"
            >
              &gt;
            </button>
          </div>
        </div>
        <div className="p-3.5 bg-slate-900/90 space-y-3 text-xs">
          <div className="flex items-center gap-2.5">
            <img 
              src={currentAnnounce.avatar} 
              alt={currentAnnounce.author}
              className="w-10 h-10 rounded-full object-cover border border-amber-400/40 flex-shrink-0"
            />
            <div>
              <div className="font-bold text-sky-400 text-xs">{currentAnnounce.author}</div>
              <div className="text-white text-xs font-semibold mt-0.5">{currentAnnounce.title}</div>
            </div>
          </div>
          <p className="text-slate-300 text-xs leading-relaxed">
            {currentAnnounce.text}
          </p>
          <button
            onClick={() => setHasAcknowledged(!hasAcknowledged)}
            className={`w-full py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              hasAcknowledged
                ? 'bg-emerald-600 text-white'
                : 'bg-[#f1cd53] hover:bg-[#e2bd44] text-slate-900 shadow-sm'
            }`}
          >
            {hasAcknowledged && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
            <span>{hasAcknowledged ? 'Я прочитала' : 'Я прочитала'}</span>
          </button>
        </div>
      </div>

      {/* 4. My Tasks Breakdown (Bitrix24 Tasks Widget with Pink Count Pills) */}
      <div className="bitrix-widget-card">
        <div className="bg-[#29a4d9] px-3.5 py-1.5 flex items-center justify-between text-white">
          <span className="text-[11px] font-bold uppercase tracking-wider">Мои задачи</span>
          <button
            onClick={onOpenTasks}
            className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center text-xs font-bold hover:bg-white/40 transition"
            title="Додати завдання"
          >
            +
          </button>
        </div>
        <div className="divide-y divide-white/5 bg-slate-900/90 text-xs font-medium">
          <div 
            onClick={onOpenTasks}
            className="flex items-center justify-between px-3.5 py-2 hover:bg-white/5 cursor-pointer text-slate-200 transition"
          >
            <span>Делаю</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{taskCounts.doing}</span>
              <span className="w-4 h-4 rounded-full bg-rose-500/25 text-rose-400 text-[10px] font-bold flex items-center justify-center">
                {taskCounts.doingNew}
              </span>
            </div>
          </div>

          <div 
            onClick={onOpenTasks}
            className="flex items-center justify-between px-3.5 py-2 hover:bg-white/5 cursor-pointer text-slate-200 transition"
          >
            <span>Помогаю</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{taskCounts.helping}</span>
              <span className="w-4 h-4 rounded-full bg-rose-500/25 text-rose-400 text-[10px] font-bold flex items-center justify-center">
                {taskCounts.helpingNew}
              </span>
            </div>
          </div>

          <div 
            onClick={onOpenTasks}
            className="flex items-center justify-between px-3.5 py-2 hover:bg-white/5 cursor-pointer text-slate-200 transition"
          >
            <span>Поручил</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{taskCounts.assigned}</span>
              <span className="w-4 h-4 rounded-full bg-rose-500/25 text-rose-400 text-[10px] font-bold flex items-center justify-center">
                {taskCounts.assignedNew}
              </span>
            </div>
          </div>

          <div 
            onClick={onOpenTasks}
            className="flex items-center justify-between px-3.5 py-2 hover:bg-white/5 cursor-pointer text-slate-200 transition"
          >
            <span>Наблюдаю</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{taskCounts.observing}</span>
              <span className="w-4 h-4 rounded-full bg-rose-500/25 text-rose-400 text-[10px] font-bold flex items-center justify-center">
                {taskCounts.observingNew}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Birthdays Widget (Bitrix24 Style) */}
      <div className="bitrix-widget-card">
        <div className="bg-[#e49e3d] px-3.5 py-1.5 text-white text-[11px] font-bold uppercase tracking-wider">
          Дни рождения
        </div>
        <div className="p-3 bg-slate-900/90 flex items-center gap-3">
          <img
            src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face"
            alt="Сергей Кулешов"
            className="w-10 h-10 rounded-full object-cover border border-amber-400/40"
          />
          <div>
            <div className="font-bold text-sky-400 text-xs">Сергей Кулешов</div>
            <div className="text-slate-400 text-xs">21 Июля</div>
          </div>
        </div>
      </div>

    </aside>
  );
};
