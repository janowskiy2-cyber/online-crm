import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckSquare, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  User as UserIcon,
  ExternalLink,
  Plus,
  X,
  Search,
  Sparkles,
  Phone,
  Handshake,
  CreditCard,
  FileText,
  Trash2,
  ChevronRight,
  Flame,
  ArrowRight,
  Building2,
  PhoneCall,
  MessageSquare,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { api, socket } from '../../services/api';
import { soundService } from '../../services/sound.service';
import { useAuth } from '../../context/AuthContext';
import { Task } from '../../types';
import { CallModal } from '../telephony/CallModal';

export interface ExtendedTask extends Task {
  deal?: {
    id: string;
    title: string;
    budget?: number;
    stage?: { id: string; name: string; color: string };
    contact?: { id: string; name: string; phone?: string };
    company?: { id: string; name: string; phone?: string };
  };
}

export interface DealWithoutTask {
  id: string;
  title: string;
  budget: number;
  stage?: { id: string; name: string; color: string };
  pipeline?: { id: string; name: string };
  contact?: { id: string; name: string; phone?: string; position?: string };
  company?: { id: string; name: string; phone?: string };
  responsible?: { id: string; name: string; avatar?: string };
  updatedAt: string;
}

interface TasksViewProps {
  onOpenDeal: (dealId: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ onOpenDeal }) => {
  const { currentUser, users } = useAuth();
  const [tasks, setTasks] = useState<ExtendedTask[]>([]);
  const [dealsWithoutTasks, setDealsWithoutTasks] = useState<DealWithoutTask[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filter state
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | 'tomorrow' | 'week' | 'overdue' | 'completed'>('all');
  const [roleFilter, setRoleFilter] = useState<'my' | 'all' | 'without_task'>('my');
  const [search, setSearch] = useState('');
  
  // Quick inline add state
  const [quickText, setQuickText] = useState('');
  const [quickType, setQuickType] = useState('call');
  const [quickDuePreset, setQuickDuePreset] = useState<'today' | 'tomorrow' | 'three_days' | 'no_date'>('today');
  const [isQuickSubmitting, setIsQuickSubmitting] = useState(false);

  // Full modal creation state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalText, setModalText] = useState('');
  const [modalDue, setModalDue] = useState('');
  const [modalType, setModalType] = useState('call');
  const [modalAssigneeId, setModalAssigneeId] = useState(currentUser?.id || '');
  const [modalDealId, setModalDealId] = useState<string>('');
  const [isModalSubmitting, setIsModalSubmitting] = useState(false);

  // Call modal trigger
  const [activeCallModal, setActiveCallModal] = useState<{
    dealId?: string;
    contactName: string;
    phoneNumber: string;
    companyName?: string;
  } | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks', { 
        params: { 
          search: search.trim() || undefined
        } 
      });
      setTasks(res.data || []);
    } catch (e) {
      console.error('Failed to load tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDealsWithoutTasks = async () => {
    try {
      const res = await api.get('/tasks/deals-without-tasks');
      setDealsWithoutTasks(res.data || []);
    } catch (e) {
      console.error('Failed to load deals without tasks:', e);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTasks();
      fetchDealsWithoutTasks();
    }, 200);

    const handleTaskEvent = () => {
      fetchTasks();
      fetchDealsWithoutTasks();
    };

    socket.on('task_created', handleTaskEvent);
    socket.on('task_updated', handleTaskEvent);
    socket.on('task_deleted', handleTaskEvent);

    return () => {
      clearTimeout(timer);
      socket.off('task_created', handleTaskEvent);
      socket.off('task_updated', handleTaskEvent);
      socket.off('task_deleted', handleTaskEvent);
    };
  }, [search]);

  // Compute due date from preset
  const getDueDateFromPreset = (preset: 'today' | 'tomorrow' | 'three_days' | 'no_date'): string => {
    const now = new Date();
    if (preset === 'today') {
      const d = new Date(now);
      d.setHours(18, 0, 0, 0);
      if (d.getTime() < now.getTime()) {
        d.setHours(now.getHours() + 2, 0, 0, 0);
      }
      return d.toISOString();
    }
    if (preset === 'tomorrow') {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(12, 0, 0, 0);
      return d.toISOString();
    }
    if (preset === 'three_days') {
      const d = new Date(now);
      d.setDate(d.getDate() + 3);
      d.setHours(18, 0, 0, 0);
      return d.toISOString();
    }
    // no_date (default 30 days ahead)
    const d = new Date(now);
    d.setDate(d.getDate() + 30);
    return d.toISOString();
  };

  // Quick inline creation
  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickText.trim() || isQuickSubmitting) return;

    setIsQuickSubmitting(true);
    try {
      const dueDate = getDueDateFromPreset(quickDuePreset);
      await api.post('/tasks', {
        text: quickText.trim(),
        dueDate,
        type: quickType,
        responsibleId: currentUser?.id
      });
      soundService.playSuccess();
      setQuickText('');
      fetchTasks();
      fetchDealsWithoutTasks();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Не вдалося створити завдання');
    } finally {
      setIsQuickSubmitting(false);
    }
  };

  // Open modal to assign task to specific deal without task
  const handleOpenCreateForDeal = (deal: DealWithoutTask) => {
    setModalDealId(deal.id);
    setModalText(`Передзвонити клієнту щодо угоди: ${deal.title}`);
    setModalType('call');
    setModalDue(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
    setModalAssigneeId(deal.responsible?.id || currentUser?.id || '');
    setIsModalOpen(true);
  };

  // Full modal creation
  const handleModalCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalText.trim() || isModalSubmitting) return;

    setIsModalSubmitting(true);
    try {
      await api.post('/tasks', {
        dealId: modalDealId || undefined,
        text: modalText.trim(),
        dueDate: modalDue ? new Date(modalDue).toISOString() : new Date(Date.now() + 86400000).toISOString(),
        type: modalType,
        responsibleId: modalAssigneeId || currentUser?.id
      });
      soundService.playSuccess();
      setModalText('');
      setModalDue('');
      setModalDealId('');
      setIsModalOpen(false);
      fetchTasks();
      fetchDealsWithoutTasks();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Не вдалося створити завдання');
    } finally {
      setIsModalSubmitting(false);
    }
  };

  // 1-Click Toggle completion
  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    try {
      if (!currentStatus) {
        soundService.playSuccess();
      }
      // Optimistic update
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isCompleted: !currentStatus } : t));
      await api.put(`/tasks/${taskId}`, { isCompleted: !currentStatus });
    } catch (e) {
      console.error('Failed to toggle task:', e);
      fetchTasks();
    }
  };

  // Postpone by +1 day
  const handlePostponeTask = async (taskId: string, currentDueDate: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const nextDay = new Date(new Date(currentDueDate).getTime() + 86400000).toISOString();
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, dueDate: nextDay } : t));
      await api.put(`/tasks/${taskId}`, { dueDate: nextDay });
    } catch (e) {
      console.error('Failed to postpone task:', e);
      fetchTasks();
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Ви дійсно хочете видалити це завдання?')) return;
    try {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      await api.delete(`/tasks/${taskId}`);
    } catch (e) {
      console.error('Failed to delete task:', e);
      fetchTasks();
    }
  };

  // Date classification helpers
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);
  const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59, 999);

  // Filter tasks based on role and period, then SORT BY TIME ASCENDING
  const filteredTasks = useMemo(() => {
    return tasks
      .filter(task => {
        // 1. Role filter: 'my' shows only current user's tasks
        if (roleFilter === 'my' && currentUser?.id && task.responsibleId !== currentUser.id) {
          return false;
        }

        const dueDate = new Date(task.dueDate);
        const isOverdue = !task.isCompleted && dueDate < now;
        const isToday = !task.isCompleted && dueDate >= startOfToday && dueDate <= endOfToday;
        const isTomorrow = !task.isCompleted && dueDate > endOfToday && dueDate <= endOfTomorrow;
        const isThisWeek = !task.isCompleted && dueDate > endOfTomorrow && dueDate <= endOfWeek;

        // 2. Period filter
        if (filterPeriod === 'completed') return task.isCompleted;
        if (filterPeriod === 'overdue') return isOverdue;
        if (filterPeriod === 'today') return isToday;
        if (filterPeriod === 'tomorrow') return isTomorrow;
        if (filterPeriod === 'week') return isThisWeek;
        if (filterPeriod === 'all') return !task.isCompleted;

        return true;
      })
      .sort((a, b) => {
        // Completed at bottom
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        // Strict chronological sort by dueDate
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [tasks, roleFilter, filterPeriod, currentUser?.id]);

  // Group counters (scoped to selected role: my vs all)
  const scopedTasks = useMemo(() => {
    if (roleFilter === 'my' && currentUser?.id) {
      return tasks.filter(t => t.responsibleId === currentUser.id);
    }
    return tasks;
  }, [tasks, roleFilter, currentUser?.id]);

  const totalActive = scopedTasks.filter(t => !t.isCompleted).length;
  const countOverdue = scopedTasks.filter(t => !t.isCompleted && new Date(t.dueDate) < now).length;
  const countToday = scopedTasks.filter(t => !t.isCompleted && new Date(t.dueDate) >= startOfToday && new Date(t.dueDate) <= endOfToday).length;
  const countTomorrow = scopedTasks.filter(t => !t.isCompleted && new Date(t.dueDate) > endOfToday && new Date(t.dueDate) <= endOfTomorrow).length;
  const countCompleted = scopedTasks.filter(t => t.isCompleted).length;

  const countWithoutTasks = useMemo(() => {
    if (roleFilter === 'my' && currentUser?.id) {
      return dealsWithoutTasks.filter(d => d.responsible?.id === currentUser.id).length;
    }
    return dealsWithoutTasks.length;
  }, [dealsWithoutTasks, roleFilter, currentUser?.id]);

  const scopedDealsWithoutTasks = useMemo(() => {
    if (roleFilter === 'my' && currentUser?.id) {
      return dealsWithoutTasks.filter(d => d.responsible?.id === currentUser.id);
    }
    return dealsWithoutTasks;
  }, [dealsWithoutTasks, roleFilter, currentUser?.id]);

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'call': return <Phone className="w-3.5 h-3.5 text-emerald-400" />;
      case 'meeting': return <Handshake className="w-3.5 h-3.5 text-purple-400" />;
      case 'invoice': return <CreditCard className="w-3.5 h-3.5 text-amber-400" />;
      case 'presentation': return <FileText className="w-3.5 h-3.5 text-blue-400" />;
      default: return <Clock className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case 'call': return 'Дзвінок';
      case 'meeting': return 'Зустріч';
      case 'invoice': return 'Оплата / Рахунок';
      case 'presentation': return 'КП / Документи';
      default: return 'Нагадування';
    }
  };

  const formatTaskTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const timeStr = d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    const isT = d >= startOfToday && d <= endOfToday;
    const isTom = d > endOfToday && d <= endOfTomorrow;
    if (isT) return `Сьогодні, ${timeStr}`;
    if (isTom) return `Завтра, ${timeStr}`;
    return `${d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })}, ${timeStr}`;
  };

  return (
    <div className="flex-1 p-3 sm:p-5 md:p-8 overflow-y-auto bitrix-wallpaper font-['Inter',sans-serif]">
      <div className="max-w-7xl mx-auto space-y-5">
        
        {/* Header (Bitrix24 Glassmorphism) */}
        <div className="bitrix-glass rounded-3xl p-5 sm:p-6 shadow-2xl border border-white/10 backdrop-blur-2xl space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
                  <CheckSquare className="w-3 h-3" /> РОБОЧІ ЗАВДАННЯ
                </span>
                <span className="text-xs text-slate-400 font-mono">Контроль домовленостей з клієнтами та лідами</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3 flex-wrap">
                <span>{roleFilter === 'my' ? 'Мої завдання по клієнтах' : 'Всі завдання компанії'}</span>
                <span className="text-xs px-2.5 py-1 rounded-xl bg-white/10 text-slate-300 font-semibold">
                  {totalActive} в роботі
                </span>
                {countOverdue > 0 && (
                  <span className="text-xs px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold flex items-center gap-1 animate-pulse">
                    <Flame className="w-3.5 h-3.5" />
                    {countOverdue} прострочено
                  </span>
                )}
              </h1>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Search Bar */}
              <div className="relative min-w-[200px] sm:min-w-[260px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Пошук клієнта або завдання..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-8 pr-7 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 transition"
                />
                {search && (
                  <button 
                    onClick={() => setSearch('')} 
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* New Detailed Task Button */}
              <button
                type="button"
                onClick={() => {
                  setModalDealId('');
                  setIsModalOpen(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-blue-600/30 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Нове завдання</span>
              </button>
            </div>
          </div>

          {/* Role Filter Tabs (Мої клієнти vs Всі vs Без задач) */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-900/80 border border-white/10 p-1 rounded-2xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setRoleFilter('my')}
                className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                  roleFilter === 'my' 
                    ? 'bg-blue-600 text-white shadow-sm font-bold' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Мої завдання ({currentUser?.name?.split(' ')[0] || 'Я'})</span>
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('all')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  roleFilter === 'all' 
                    ? 'bg-blue-600 text-white shadow-sm font-bold' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Всі співробітники
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('without_task')}
                className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                  roleFilter === 'without_task'
                    ? 'bg-rose-600 text-white shadow-sm font-bold'
                    : countWithoutTasks > 0
                    ? 'text-rose-400 hover:text-rose-300 bg-rose-500/10'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Угоди без задач ({countWithoutTasks})</span>
              </button>
            </div>

            {/* Time / Status Filter Pills */}
            {roleFilter !== 'without_task' && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setFilterPeriod('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                    filterPeriod === 'all'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                      : 'bg-slate-900/60 text-slate-300 border-white/5 hover:border-white/20'
                  }`}
                >
                  Всі активні ({totalActive})
                </button>

                <button
                  type="button"
                  onClick={() => setFilterPeriod('today')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                    filterPeriod === 'today'
                      ? 'bg-amber-600 text-white border-amber-500 shadow-sm font-bold'
                      : 'bg-slate-900/60 text-amber-300/90 border-amber-500/20 hover:border-amber-500/40'
                  }`}
                >
                  ☀️ Сьогодні ({countToday})
                </button>

                <button
                  type="button"
                  onClick={() => setFilterPeriod('tomorrow')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                    filterPeriod === 'tomorrow'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm font-bold'
                      : 'bg-slate-900/60 text-indigo-300/90 border-indigo-500/20 hover:border-indigo-500/40'
                  }`}
                >
                  📅 Завтра ({countTomorrow})
                </button>

                {countOverdue > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterPeriod('overdue')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                      filterPeriod === 'overdue'
                        ? 'bg-rose-600 text-white border-rose-500 shadow-sm font-bold'
                        : 'bg-rose-950/40 text-rose-300 border-rose-500/30 hover:border-rose-500/50'
                    }`}
                  >
                    🔥 Прострочені ({countOverdue})
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setFilterPeriod('completed')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                    filterPeriod === 'completed'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm font-bold'
                      : 'bg-slate-900/60 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/40'
                  }`}
                >
                  ✅ Виконані ({countCompleted})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* System Alert: Leads without tasks banner */}
        {countWithoutTasks > 0 && roleFilter !== 'without_task' && (
          <div className="p-4 bg-gradient-to-r from-rose-950/70 via-rose-900/40 to-slate-900/80 border border-rose-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-rose-950/30 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 flex-shrink-0 animate-pulse">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Увага: {countWithoutTasks} {countWithoutTasks === 1 ? 'угода' : 'угод'} без запланованого завдання!</span>
                </h4>
                <p className="text-xs text-rose-200/80">
                  За правилами CRM кожен клієнт повинен мати наступний запланований контакт, інакше лід втрачається.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRoleFilter('without_task')}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 shadow-md shadow-rose-600/30 active:scale-95"
            >
              <span>Поставити завдання ({countWithoutTasks})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Fast Inline 1-Click Task Creator Bar */}
        {roleFilter !== 'without_task' && (
          <form 
            onSubmit={handleQuickCreate}
            className="bitrix-glass rounded-2xl p-3 sm:p-4 border border-blue-500/30 bg-slate-900/80 backdrop-blur-xl shadow-xl flex flex-col md:flex-row items-stretch md:items-center gap-3"
          >
            <div className="flex-1 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <Plus className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="+ Швидке завдання (наприклад: Зателефонувати Олександру узгодити договір)..."
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none font-medium"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {/* Task Type selector */}
              <select
                value={quickType}
                onChange={(e) => setQuickType(e.target.value)}
                className="bg-slate-800 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none font-medium cursor-pointer"
              >
                <option value="call">📞 Дзвінок</option>
                <option value="meeting">🤝 Зустріч</option>
                <option value="invoice">💳 Рахунок / Оплата</option>
                <option value="presentation">📄 КП / Договір</option>
                <option value="follow_up">⏰ Нагадування</option>
              </select>

              {/* Deadline preset */}
              <div className="flex items-center bg-slate-800 border border-white/10 rounded-xl p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setQuickDuePreset('today')}
                  className={`px-2.5 py-1 rounded-lg transition ${quickDuePreset === 'today' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Сьогодні
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDuePreset('tomorrow')}
                  className={`px-2.5 py-1 rounded-lg transition ${quickDuePreset === 'tomorrow' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Завтра
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDuePreset('three_days')}
                  className={`px-2.5 py-1 rounded-lg transition ${quickDuePreset === 'three_days' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  +3 дні
                </button>
              </div>

              <button
                type="submit"
                disabled={isQuickSubmitting || !quickText.trim()}
                className="flex-1 sm:flex-initial justify-center px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/30 flex items-center gap-1.5 shrink-0 active:scale-95"
              >
                <span>{isQuickSubmitting ? 'Збереження...' : '+ Додати'}</span>
              </button>
            </div>
          </form>
        )}

        {/* View Mode: Leads Without Tasks */}
        {roleFilter === 'without_task' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Угоди, які потребують призначення завдання ({scopedDealsWithoutTasks.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => setRoleFilter('my')}
                className="text-xs text-slate-400 hover:text-white transition underline"
              >
                Повернутися до моїх завдань
              </button>
            </div>

            {scopedDealsWithoutTasks.length === 0 ? (
              <div className="text-center py-16 bg-[#111827]/50 border border-emerald-500/20 rounded-3xl space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-200">Чудова робота! Всі угоди мають заплановані завдання</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Жоден клієнт не залишений без контролю. Продовжуйте своєчасно виконувати дедлайни.
                </p>
              </div>
            ) : (
              scopedDealsWithoutTasks.map((deal) => {
                const clientName = deal.contact?.name || deal.company?.name || 'Клієнт';
                const clientPhone = deal.contact?.phone || deal.company?.phone || '';

                return (
                  <div
                    key={deal.id}
                    className="bitrix-glass p-4 sm:p-5 rounded-2xl border border-rose-500/30 hover:border-rose-500/60 transition shadow-lg bg-rose-950/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-black shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 text-[11px] font-bold border border-rose-500/30">
                            Без наступної задачі
                          </span>
                          {deal.stage && (
                            <span 
                              className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-white border"
                              style={{ backgroundColor: `${deal.stage.color}30`, borderColor: `${deal.stage.color}60` }}
                            >
                              Етап: {deal.stage.name}
                            </span>
                          )}
                          {deal.budget > 0 && (
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              {deal.budget.toLocaleString()} грн
                            </span>
                          )}
                        </div>

                        <h4 
                          onClick={() => onOpenDeal(deal.id)}
                          className="text-sm font-bold text-white hover:text-blue-300 cursor-pointer transition truncate"
                        >
                          {deal.title}
                        </h4>

                        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                          <span className="text-slate-200 font-semibold">{clientName}</span>
                          {clientPhone && (
                            <span className="font-mono text-slate-300">{clientPhone}</span>
                          )}
                          <span className="text-slate-500 text-[11px]">
                            Відповідальний: {deal.responsible?.name || 'Менеджер'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      {clientPhone && (
                        <button
                          type="button"
                          onClick={() => setActiveCallModal({
                            dealId: deal.id,
                            contactName: clientName,
                            phoneNumber: clientPhone,
                            companyName: deal.company?.name
                          })}
                          className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                          title="Зателефонувати клієнту"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>Подзвонити</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenCreateForDeal(deal)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/30 flex items-center gap-1.5 active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Поставити задачу</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenDeal(deal.id)}
                        className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
                        title="Відкрити картку угоди"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Tasks List (Sorted chronologically by time) */
          filteredTasks.length === 0 ? (
            <div className="text-center py-16 bg-[#111827]/50 border border-white/5 rounded-3xl space-y-3">
              <CheckSquare className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-300">Немає завдань у цій категорії</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Всі заплановані завдання виконані. Додайте завдання у верхньому полі для контролю клієнтів.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const dueDate = new Date(task.dueDate);
                const isOverdue = !task.isCompleted && dueDate < now;
                const isToday = !task.isCompleted && dueDate >= startOfToday && dueDate <= endOfToday;
                const clientName = task.deal?.contact?.name || task.deal?.company?.name;
                const clientPhone = task.deal?.contact?.phone || task.deal?.company?.phone;

                return (
                  <div
                    key={task.id}
                    className={`bitrix-glass p-4 sm:p-5 rounded-2xl border transition-all duration-200 group flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      task.isCompleted
                        ? 'border-white/5 opacity-60 bg-slate-950/40'
                        : isOverdue
                        ? 'border-rose-500/50 hover:border-rose-500/80 shadow-lg shadow-rose-500/10 bg-rose-950/20'
                        : isToday
                        ? 'border-amber-500/40 hover:border-amber-500/70 bg-amber-950/15 shadow-md shadow-amber-500/5'
                        : 'border-white/10 hover:border-blue-500/40'
                    }`}
                  >
                    {/* Left part: Checkbox + Text + Deal & Client Info */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggleTask(task.id, task.isCompleted)}
                        className="mt-0.5 text-slate-500 hover:text-emerald-400 transition shrink-0"
                        title={task.isCompleted ? 'Позначити як невиконане' : 'Завершити завдання'}
                      >
                        {task.isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-in zoom-in-75" />
                        ) : (
                          <div className="w-5 h-5 rounded-lg border-2 border-slate-600 hover:border-emerald-400 flex items-center justify-center transition" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Type badge */}
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 text-[11px] font-semibold text-slate-300 border border-white/5">
                            {getTypeIcon(task.type)}
                            <span>{getTypeLabel(task.type)}</span>
                          </span>

                          {/* Time badge with exact clock */}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold ${
                            isOverdue
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : isToday
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-300 border border-white/5'
                          }`}>
                            <Clock className="w-3 h-3" />
                            <span>{formatTaskTime(task.dueDate)}</span>
                          </span>

                          {/* Overdue alert badge */}
                          {isOverdue && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider animate-pulse shadow-sm">
                              <Flame className="w-3 h-3 text-white" />
                              <span>Прострочено!</span>
                            </span>
                          )}

                          {/* Deal Stage badge if available */}
                          {task.deal?.stage && (
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-white border"
                              style={{ backgroundColor: `${task.deal.stage.color}25`, borderColor: `${task.deal.stage.color}50` }}
                            >
                              {task.deal.stage.name}
                            </span>
                          )}
                        </div>

                        {/* Main Task Description */}
                        <p className={`text-sm font-semibold leading-snug break-words ${task.isCompleted ? 'line-through text-slate-500' : 'text-white'}`}>
                          {task.text}
                        </p>

                        {/* Client details & Deal link */}
                        {task.deal && (
                          <div className="flex items-center gap-3 text-xs flex-wrap pt-0.5">
                            <button
                              type="button"
                              onClick={() => onOpenDeal(task.deal!.id)}
                              className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-semibold transition hover:underline"
                              title="Відкрити картку угоди"
                            >
                              <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              <span className="truncate max-w-[200px] sm:max-w-xs">{task.deal.title}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>

                            {clientName && (
                              <span className="text-slate-300 font-medium flex items-center gap-1">
                                <span className="text-slate-500">•</span>
                                <span>{clientName}</span>
                              </span>
                            )}

                            {clientPhone && (
                              <span className="font-mono text-emerald-400 text-[11px] flex items-center gap-1">
                                <span className="text-slate-500">•</span>
                                <span>{clientPhone}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right part: Actions & Manager */}
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      {/* 1-Click Call Contact Button */}
                      {clientPhone && !task.isCompleted && (
                        <button
                          type="button"
                          onClick={() => setActiveCallModal({
                            dealId: task.deal?.id,
                            contactName: clientName || 'Клієнт',
                            phoneNumber: clientPhone,
                            companyName: task.deal?.company?.name
                          })}
                          className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
                          title={`Зателефонувати: ${clientPhone}`}
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="hidden md:inline">Дзвінок</span>
                        </button>
                      )}

                      {/* Quick Postpone (+1 день) button */}
                      {!task.isCompleted && (
                        <button
                          type="button"
                          onClick={(e) => handlePostponeTask(task.id, task.dueDate, e)}
                          className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-[11px] font-semibold transition border border-white/5 flex items-center gap-1"
                          title="Перенести дедлайн на +1 день"
                        >
                          <Calendar className="w-3 h-3 text-indigo-400" />
                          <span className="hidden sm:inline">+1 день</span>
                        </button>
                      )}

                      {/* Responsible User */}
                      <div className="text-right pl-1">
                        <div className="text-[11px] font-semibold text-slate-300 truncate max-w-[100px]">
                          {task.responsible?.name || 'Менеджер'}
                        </div>
                      </div>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteTask(task.id, e)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-xl hover:bg-rose-500/10 transition"
                        title="Видалити завдання"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Modal: Create Detailed Task */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-['Inter',sans-serif]">
            <div className="bg-[#111827] border border-slate-700/80 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-white">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-blue-400" />
                  <span>{modalDealId ? 'Завдання для вибраної угоди' : 'Нове завдання по клієнту'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setModalDealId('');
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl transition hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleModalCreate} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Суть завдання *
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Наприклад: Зателефонувати щодо узгодження умов договору та виставити рахунок..."
                    value={modalText}
                    onChange={(e) => setModalText(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Тип дії
                    </label>
                    <select
                      value={modalType}
                      onChange={(e) => setModalType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="call">📞 Дзвінок</option>
                      <option value="meeting">🤝 Зустріч / Zoom</option>
                      <option value="invoice">💳 Рахунок / Оплата</option>
                      <option value="presentation">📄 КП / Договір</option>
                      <option value="follow_up">⏰ Нагадування</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Дедлайн
                    </label>
                    <input
                      type="datetime-local"
                      value={modalDue}
                      onChange={(e) => setModalDue(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Відповідальний менеджер
                  </label>
                  <select
                    value={modalAssigneeId}
                    onChange={(e) => setModalAssigneeId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setModalDealId('');
                    }}
                    className="px-4 py-2.5 text-xs text-slate-400 hover:text-white rounded-xl transition"
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    disabled={isModalSubmitting}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-blue-600/30"
                  >
                    {isModalSubmitting ? 'Збереження...' : 'Створити завдання'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Real Active Call Modal */}
        {activeCallModal && (
          <CallModal
            dealId={activeCallModal.dealId}
            contactName={activeCallModal.contactName}
            phoneNumber={activeCallModal.phoneNumber}
            companyName={activeCallModal.companyName}
            onClose={() => {
              setActiveCallModal(null);
              fetchTasks();
              fetchDealsWithoutTasks();
            }}
          />
        )}

      </div>
    </div>
  );
};
