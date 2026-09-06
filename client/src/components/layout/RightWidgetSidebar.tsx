import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Activity, 
  Flame, 
  Building2,
  Briefcase,
  Users,
  UserPlus, 
  Plus,
  Phone, 
  MessageSquare, 
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { DEFAULT_ADMIN_AVATAR } from '../../constants/defaultAvatar';

interface RightWidgetSidebarProps {
  onOpenTasks?: () => void;
  onOpenFeed?: () => void;
  onCallUser?: (name: string, phone: string) => void;
  onInviteColleagues?: () => void;
  onOpenDeal?: (dealId: string) => void;
}

export const RightWidgetSidebar: React.FC<RightWidgetSidebarProps> = ({
  onOpenTasks,
  onOpenFeed,
  onCallUser,
  onInviteColleagues,
  onOpenDeal
}) => {
  const { currentUser } = useAuth();
  
  // Important Announcements State
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  // Pulse Stats State (Live from DB)
  const [pulseStats, setPulseStats] = useState({
    activityPercentage: 0,
    dealsThisWeek: 0,
    tasksThisWeek: 0,
    messagesThisWeek: 0,
    activeEmployees: 0,
    rank: 1
  });

  // Tasks Summary State (Live from DB)
  const [taskCounts, setTaskCounts] = useState({
    doing: 0,
    doingNew: 0,
    helping: 0,
    helpingNew: 0,
    assigned: 0,
    assignedNew: 0,
    observing: 0,
    observingNew: 0
  });

  // Hot Employer Orders & Requisitions State (Live from DB)
  const [hotOrders, setHotOrders] = useState<any[]>([]);

  useEffect(() => {
    // 1. Fetch Real Announcements
    api.get('/feed/announcements')
      .then(res => {
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setAnnouncements(res.data);
        }
      })
      .catch(() => {});

    // 2. Fetch Tasks Summary
    api.get('/tasks/summary')
      .then(res => {
        if (res.data) {
          setTaskCounts(res.data);
        }
      })
      .catch(() => {});

    // 3. Fetch Pulse Stats
    api.get('/users/pulse/stats')
      .then(res => {
        if (res.data) {
          setPulseStats(res.data);
        }
      })
      .catch(() => {});

    // 4. Fetch Hot Employer Requisitions & Deals
    api.get('/deals')
      .then(res => {
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          const sorted = [...res.data].sort((a, b) => (b.budget || 0) - (a.budget || 0));
          setHotOrders(sorted.slice(0, 4));
        }
      })
      .catch(() => {});
  }, []);

  const currentAnnounce = announcements[announcementIndex] || announcements[0];

  return (
    <aside className="w-72 2xl:w-80 flex flex-col gap-3 p-3 overflow-y-auto flex-shrink-0 font-['Inter',sans-serif]">
      
      {/* 1. Quick Action: Invite Colleague Button (Bitrix Cyan Style) */}
      <button
        type="button"
        onClick={() => onInviteColleagues ? onInviteColleagues() : onOpenFeed?.()}
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
            <span>{pulseStats.rank}</span>
            <span className="opacity-60">|</span>
            <span>{pulseStats.activityPercentage}%</span>
          </div>
        </div>
        <div className="p-3 bg-slate-900/90 text-xs space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span>Активность компании за неделю</span>
            <span className="text-cyan-400 font-bold">{pulseStats.activityPercentage}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full transition-all duration-700" 
              style={{ width: `${pulseStats.activityPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
            <span>Угоди: {pulseStats.dealsThisWeek}</span>
            <span>Завдання: {pulseStats.tasksThisWeek}</span>
            <span>Команда: {pulseStats.activeEmployees}</span>
          </div>
        </div>
      </div>

      {/* 3. Important Announcement Card (Bitrix24 Pinned Widget) */}
      {announcements.length > 0 && currentAnnounce && (
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
                src={currentAnnounce.avatar || DEFAULT_ADMIN_AVATAR} 
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
              <span>{hasAcknowledged ? 'Я ознайомлена' : 'Я ознайомлена'}</span>
            </button>
          </div>
        </div>
      )}

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
              {taskCounts.doingNew > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500/25 text-rose-400 text-[10px] font-bold flex items-center justify-center">
                  {taskCounts.doingNew}
                </span>
              )}
            </div>
          </div>

          <div 
            onClick={onOpenTasks}
            className="flex items-center justify-between px-3.5 py-2 hover:bg-white/5 cursor-pointer text-slate-200 transition"
          >
            <span>Помогаю</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{taskCounts.helping}</span>
              {taskCounts.helpingNew > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500/25 text-rose-400 text-[10px] font-bold flex items-center justify-center">
                  {taskCounts.helpingNew}
                </span>
              )}
            </div>
          </div>

          <div 
            onClick={onOpenTasks}
            className="flex items-center justify-between px-3.5 py-2 hover:bg-white/5 cursor-pointer text-slate-200 transition"
          >
            <span>Поручил</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{taskCounts.assigned}</span>
              {taskCounts.assignedNew > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500/25 text-rose-400 text-[10px] font-bold flex items-center justify-center">
                  {taskCounts.assignedNew}
                </span>
              )}
            </div>
          </div>

          <div 
            onClick={onOpenTasks}
            className="flex items-center justify-between px-3.5 py-2 hover:bg-white/5 cursor-pointer text-slate-200 transition"
          >
            <span>Наблюдаю</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{taskCounts.observing}</span>
              {taskCounts.observingNew > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500/25 text-rose-400 text-[10px] font-bold flex items-center justify-center">
                  {taskCounts.observingNew}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Hot Employer Orders & Requisitions Widget (B2B Recruiting Priority) */}
      <div className="bitrix-widget-card">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-3.5 py-1.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-200 fill-amber-200 animate-pulse" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Гарячі заявки</span>
          </div>
          <span className="text-[10px] font-mono bg-white/25 px-1.5 py-0.2 rounded font-bold">
            {hotOrders.length}
          </span>
        </div>
        <div className="divide-y divide-white/5 bg-slate-900/90">
          {hotOrders.length > 0 ? (
            hotOrders.map((order) => {
              let cf: any = {};
              try {
                cf = typeof order.customFields === 'string' ? JSON.parse(order.customFields) : (order.customFields || {});
              } catch (e) { cf = {}; }
              const emp = cf.employerOrder || {};
              const compName = order.company?.name || emp.companyName || order.title;
              const needText = emp.headcount ? `${emp.headcount} чол.` : (emp.positions || 'Терміновий підбір');

              return (
                <div 
                  key={order.id}
                  onClick={() => onOpenDeal ? onOpenDeal(order.id) : (typeof window !== 'undefined' && (window.location.href = `/deals/${order.id}`))}
                  className="p-3 hover:bg-white/5 cursor-pointer transition space-y-1 group"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs text-white group-hover:text-amber-300 transition truncate flex items-center gap-1.5">
                      <Building2 className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      <span className="truncate">{compName}</span>
                    </span>
                    <span className="text-emerald-400 font-mono font-bold text-[11px] flex-shrink-0">
                      €{order.budget || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="text-slate-300 flex items-center gap-1 truncate">
                      <Users className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                      <span className="truncate">{needText}</span>
                    </span>
                    {order.stage?.name && (
                      <span className="px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-300 border border-blue-500/20 text-[9px] font-semibold flex-shrink-0">
                        {order.stage.name}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center text-xs text-slate-400 space-y-1">
              <Briefcase className="w-5 h-5 text-slate-500 mx-auto" />
              <p>Всі заявки в роботі</p>
            </div>
          )}
        </div>
      </div>

    </aside>
  );
};
