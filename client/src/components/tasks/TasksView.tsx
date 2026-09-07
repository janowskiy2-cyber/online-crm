import React, { useState, useEffect } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { api, socket } from '../../services/api';
import { soundService } from '../../services/sound.service';
import { useAuth } from '../../context/AuthContext';
import { DealTask } from '../../types';

interface TasksViewProps {
  onOpenDeal: (dealId: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ onOpenDeal }) => {
  const { currentUser, users } = useAuth();
  const [tasks, setTasks] = useState<DealTask[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filter state
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | 'tomorrow' | 'week' | 'overdue' | 'completed'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'my' | 'assigned_by_me'>('all');
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
  const [isModalSubmitting, setIsModalSubmitting] = useState(false);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTasks();
    }, 200);

    const handleTaskEvent = () => fetchTasks();
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
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Не вдалося створити завдання');
    } finally {
      setIsQuickSubmitting(false);
    }
  };

  // Full modal creation
  const handleModalCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalText.trim() || isModalSubmitting) return;

    setIsModalSubmitting(true);
    try {
      await api.post('/tasks', {
        text: modalText.trim(),
        dueDate: modalDue ? new Date(modalDue).toISOString() : new Date(Date.now() + 86400000).toISOString(),
        type: modalType,
        responsibleId: modalAssigneeId || currentUser?.id
      });
      soundService.playSuccess();
      setModalText('');
      setModalDue('');
      setIsModalOpen(false);
      fetchTasks();
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

  // Filter tasks based on role and period
  const filteredTasks = tasks.filter(task => {
    // 1. Role filter
    if (roleFilter === 'my' && currentUser?.id && task.responsibleId !== currentUser.id) {
      return false;
    }
    if (roleFilter === 'assigned_by_me' && currentUser?.id && (task as any).createdById !== currentUser.id) {
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
  });

  // Group counters
  const totalActive = tasks.filter(t => !t.isCompleted).length;
  const countOverdue = tasks.filter(t => !t.isCompleted && new Date(t.dueDate) < now).length;
  const countToday = tasks.filter(t => !t.isCompleted && new Date(t.dueDate) >= startOfToday && new Date(t.dueDate) <= endOfToday).length;
  const countTomorrow = tasks.filter(t => !t.isCompleted && new Date(t.dueDate) > endOfToday && new Date(t.dueDate) <= endOfTomorrow).length;
  const countCompleted = tasks.filter(t => t.isCompleted).length;

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

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto bitrix-wallpaper font-['Inter',sans-serif]">
      <div className="max-w-7xl mx-auto space-y-5">
        
        {/* Header (Bitrix24 Glassmorphism) */}
        <div className="bitrix-glass rounded-3xl p-5 sm:p-6 shadow-2xl border border-white/10 backdrop-blur-2xl space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
                  <CheckSquare className="w-3 h-3" /> РОБОЧІ ЗАВДАННЯ
                </span>
                <span className="text-xs text-slate-400 font-mono">Контроль домовленостей з роботодавцями</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <span>Управління завданнями</span>
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
                  placeholder="Пошук (клієнт, договір, рахунок)..."
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
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-blue-600/30 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Детальне завдання</span>
              </button>
            </div>
          </div>

          {/* Bitrix24 Role Selector Tabs */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-900/80 border border-white/10 p-1 rounded-2xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setRoleFilter('all')}
                className={`px-3 py-1.5 rounded-xl transition ${roleFilter === 'all' ? 'bg-blue-600 text-white shadow-sm font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Всі завдання
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('my')}
                className={`px-3 py-1.5 rounded-xl transition ${roleFilter === 'my' ? 'bg-blue-600 text-white shadow-sm font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Я виконую
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('assigned_by_me')}
                className={`px-3 py-1.5 rounded-xl transition ${roleFilter === 'assigned_by_me' ? 'bg-blue-600 text-white shadow-sm font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Я доручив
              </button>
            </div>

            {/* Quick Period Filter Pills */}
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
                Активні ({totalActive})
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
          </div>
        </div>

        {/* Fast Inline 1-Click Task Creator Bar */}
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
              placeholder="+ Швидке завдання (натисніть Enter або кнопку)..."
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

        {/* Tasks List */}
        {filteredTasks.length === 0 ? (
          <div className="text-center py-16 bg-[#111827]/50 border border-white/5 rounded-3xl space-y-3">
            <CheckSquare className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-300">Немає завдань у цій категорії</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Всі завдання виконані або ще не створені. Додайте завдання у верхньому полі для контролю домовленостей.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const dueDate = new Date(task.dueDate);
              const isOverdue = !task.isCompleted && dueDate < now;
              const isToday = !task.isCompleted && dueDate >= startOfToday && dueDate <= endOfToday;

              return (
                <div
                  key={task.id}
                  className={`bitrix-glass p-4 sm:p-5 rounded-2xl border transition-all duration-200 group flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    task.isCompleted
                      ? 'border-white/5 opacity-60 bg-slate-950/40'
                      : isOverdue
                      ? 'border-rose-500/40 hover:border-rose-500/80 shadow-md shadow-rose-500/10 bg-rose-950/15'
                      : isToday
                      ? 'border-amber-500/30 hover:border-amber-500/60 bg-amber-950/10'
                      : 'border-white/10 hover:border-blue-500/40'
                  }`}
                >
                  {/* Left part: Checkbox + Text + Deal Link */}
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

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Type badge */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 text-[11px] font-semibold text-slate-300 border border-white/5">
                          {getTypeIcon(task.type)}
                          <span>{getTypeLabel(task.type)}</span>
                        </span>

                        {/* Overdue alert badge */}
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                            <Flame className="w-3 h-3 text-rose-400" />
                            <span>Прострочено</span>
                          </span>
                        )}

                        {/* Today badge */}
                        {isToday && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                            <span>Сьогодні</span>
                          </span>
                        )}
                      </div>

                      {/* Main Task Description */}
                      <p className={`text-sm font-semibold leading-snug break-words ${task.isCompleted ? 'line-through text-slate-500' : 'text-white'}`}>
                        {task.text}
                      </p>

                      {/* Deal Link if attached */}
                      {task.deal && (
                        <div
                          onClick={() => onOpenDeal(task.deal!.id)}
                          className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 cursor-pointer font-semibold transition hover:underline mt-0.5"
                          title="Відкрити картку угоди"
                        >
                          <Building2 className="w-3.5 h-3.5 text-purple-400" />
                          <span>Угода: {task.deal.title}</span>
                          <ExternalLink className="w-3 h-3 text-blue-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right part: Due Date + Assignee + Action Buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                    {/* Due Date */}
                    <div className="text-right">
                      <div className={`text-xs font-mono font-semibold ${isOverdue ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                        {dueDate.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        {' '}
                        {dueDate.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {task.responsible?.name || 'Менеджер'}
                      </div>
                    </div>

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
        )}

        {/* Modal: Create Detailed Task */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-['Inter',sans-serif]">
            <div className="bg-[#111827] border border-slate-700/80 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-white">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-blue-400" />
                  <span>Нове завдання для клієнта</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                    onClick={() => setIsModalOpen(false)}
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

      </div>
    </div>
  );
};
