import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Activity, 
  Cake, 
  UserPlus, 
  Phone, 
  MessageSquare, 
  ChevronRight as ChevronRightIcon,
  Sparkles,
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
  const { currentUser, users } = useAuth();
  
  // Important Announcements State
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  const announcements = [
    {
      id: 1,
      author: 'Олег Строкатий',
      role: 'Керівник відділу рекрутингу',
      date: 'Сьогодні, 10:15',
      title: 'У середу оновлення шлюзу WhatsApp',
      text: 'Прохання перевірити всі термінові діалоги до 18:00 у зв\'язку з плановим оновленням сесій.'
    },
    {
      id: 2,
      author: 'Роман Яновський',
      role: 'CEO / Засновник',
      date: 'Вчора, 14:00',
      title: 'Нова квота: 25 зварювальників у Польщу',
      text: 'Відкрито термінове замовлення на завод металоконструкцій у Гданську. Ставка 28 PLN/год.'
    }
  ];

  // Tasks Summary State
  const [taskCounts, setTaskCounts] = useState({
    doing: 4,
    helping: 1,
    assigned: 2,
    observing: 18
  });

  useEffect(() => {
    api.get('/tasks')
      .then(res => {
        if (res.data && Array.isArray(res.data)) {
          const myId = currentUser?.id;
          const doing = res.data.filter((t: any) => !t.isCompleted && t.responsibleId === myId).length;
          const assigned = res.data.filter((t: any) => !t.isCompleted && t.createdById === myId && t.responsibleId !== myId).length;
          setTaskCounts(prev => ({ ...prev, doing: doing || prev.doing, assigned: assigned || prev.assigned }));
        }
      })
      .catch(() => {});
  }, [currentUser]);

  const currentAnnounce = announcements[announcementIndex] || announcements[0];

  return (
    <aside className="w-80 flex-shrink-0 hidden xl:flex flex-col gap-3.5 p-4 overflow-y-auto select-none border-l border-white/10 bg-slate-900/60 backdrop-blur-xl text-white">
      
      {/* 1. Quick Action: Invite Colleague / Candidate */}
      <button
        type="button"
        onClick={() => onOpenFeed?.()}
        className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white rounded-2xl font-bold text-xs flex items-center justify-between shadow-lg shadow-sky-500/20 transition transform active:scale-95"
      >
        <span className="flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          <span>Запросити співробітника</span>
        </span>
        <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-extrabold">+</span>
      </button>

      {/* 2. Company Pulse Gauge */}
      <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-cyan-400">
            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>Пульс компанії</span>
          </div>
          <span className="font-mono font-bold text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-lg">86%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full w-[86%] transition-all duration-1000" />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>Активність за тиждень</span>
          <span className="text-emerald-400 font-semibold">+14% vs минулий</span>
        </div>
      </div>

      {/* 3. Important Announcement Card (Bitrix24 Pinned Widget) */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent border border-amber-500/30 p-3.5 space-y-2.5 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold tracking-wider uppercase text-amber-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Важливе повідомлення</span>
          </span>
          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
            <button
              onClick={() => setAnnouncementIndex(prev => (prev > 0 ? prev - 1 : announcements.length - 1))}
              className="p-1 hover:text-white rounded hover:bg-white/10"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span>{announcementIndex + 1}/{announcements.length}</span>
            <button
              onClick={() => setAnnouncementIndex(prev => (prev < announcements.length - 1 ? prev + 1 : 0))}
              className="p-1 hover:text-white rounded hover:bg-white/10"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-amber-500/30 border border-amber-400/40 flex items-center justify-center text-[10px] font-bold text-amber-200">
              {currentAnnounce.author[0]}
            </div>
            <div>
              <div className="text-xs font-bold text-white leading-none">{currentAnnounce.author}</div>
              <div className="text-[10px] text-amber-300/80">{currentAnnounce.date}</div>
            </div>
          </div>
          <h4 className="text-xs font-semibold text-amber-100 pt-1">{currentAnnounce.title}</h4>
          <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3">
            {currentAnnounce.text}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setHasAcknowledged(true)}
          className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            hasAcknowledged
              ? 'bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 cursor-default'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
          }`}
        >
          {hasAcknowledged ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ознайомлено</span>
            </>
          ) : (
            <span>Я прочитав(ла)</span>
          )}
        </button>
      </div>

      {/* 4. My Tasks Widget (Bitrix24 Task Roles) */}
      <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            <span>Мої завдання</span>
          </h3>
          <button
            onClick={() => onOpenTasks?.()}
            className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold"
          >
            Всі
          </button>
        </div>

        <div className="space-y-1.5 text-xs">
          <div 
            onClick={() => onOpenTasks?.()}
            className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.06] cursor-pointer transition"
          >
            <span className="text-slate-300">Виконую</span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white">{taskCounts.doing}</span>
              <span className="w-4 h-4 rounded-full bg-rose-500/30 text-rose-400 border border-rose-500/40 text-[10px] font-extrabold flex items-center justify-center">!</span>
            </div>
          </div>

          <div 
            onClick={() => onOpenTasks?.()}
            className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.06] cursor-pointer transition"
          >
            <span className="text-slate-300">Допомагаю</span>
            <span className="font-bold text-white">{taskCounts.helping}</span>
          </div>

          <div 
            onClick={() => onOpenTasks?.()}
            className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.06] cursor-pointer transition"
          >
            <span className="text-slate-300">Доручив</span>
            <span className="font-bold text-white">{taskCounts.assigned}</span>
          </div>

          <div 
            onClick={() => onOpenTasks?.()}
            className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.06] cursor-pointer transition"
          >
            <span className="text-slate-300">Спостерігаю</span>
            <span className="font-bold text-slate-400">{taskCounts.observing}</span>
          </div>
        </div>
      </div>

      {/* 5. Upcoming Birthdays */}
      <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Cake className="w-4 h-4 text-pink-400" />
            <span>Дні народження</span>
          </h3>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-1.5 rounded-xl hover:bg-white/[0.04] transition">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-xs font-bold text-white shadow">
                ОЧ
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">Оксана Черезова</div>
                <div className="text-[10px] text-pink-400 font-medium">12 вересня (через 8 дн)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Online Teammates Quick Contacts Strip */}
      <div className="pt-2 border-t border-white/10 space-y-2">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Колеги онлайн</span>
        <div className="space-y-1.5">
          {(users || []).slice(0, 4).map(u => (
            <div key={u.id} className="flex items-center justify-between p-1.5 rounded-xl hover:bg-white/[0.05] transition">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-6 h-6 rounded-full bg-blue-600/40 border border-blue-400/40 flex items-center justify-center text-[10px] font-bold text-blue-200">
                    {u.name[0]}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-slate-900" />
                </div>
                <span className="text-xs text-slate-300 font-medium truncate max-w-[140px]">{u.name}</span>
              </div>
              <button
                type="button"
                onClick={() => onCallUser?.(u.name, '+380671234567')}
                title="Швидкий дзвінок"
                className="p-1 hover:text-emerald-400 text-slate-500 transition"
              >
                <Phone className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

    </aside>
  );
};
