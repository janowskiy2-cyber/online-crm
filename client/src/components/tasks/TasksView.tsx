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
  X
} from 'lucide-react';
import { api, socket } from '../../services/api';
import { DealTask } from '../../types';

interface TasksViewProps {
  onOpenDeal: (dealId: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ onOpenDeal }) => {
  const [tasks, setTasks] = useState<DealTask[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [isCreating, setIsCreating] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [newTaskType, setNewTaskType] = useState('call');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks', { params: { status: filter } });
      setTasks(res.data);
    } catch (e) {
      console.error('Failed to load tasks:', e);
    }
  };

  useEffect(() => {
    fetchTasks();

    const handleTaskChange = () => fetchTasks();
    socket.on('task_created', handleTaskChange);
    socket.on('task_updated', handleTaskChange);

    return () => {
      socket.off('task_created', handleTaskChange);
      socket.off('task_updated', handleTaskChange);
    };
  }, [filter]);

  const handleToggleTask = async (taskId: string, isCompleted: boolean) => {
    try {
      await api.put(`/tasks/${taskId}`, { isCompleted: !isCompleted });
      fetchTasks();
    } catch (e) {
      console.error('Failed to update task:', e);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    setIsSubmitting(true);
    try {
      await api.post('/tasks', {
        text: newTaskText.trim(),
        dueDate: newTaskDue ? new Date(newTaskDue).toISOString() : new Date(Date.now() + 86400000).toISOString(),
        type: newTaskType
      });
      setNewTaskText('');
      setNewTaskDue('');
      setIsCreating(false);
      fetchTasks();
    } catch (err) {
      alert('Не вдалося створити завдання');
    } finally {
      setIsSubmitting(false);
    }
  };

  const overdueTasks = tasks.filter(t => !t.isCompleted && new Date(t.dueDate) < new Date());
  const todayTasks = tasks.filter(t => !t.isCompleted && new Date(t.dueDate).toDateString() === new Date().toDateString());
  const upcomingTasks = tasks.filter(t => !t.isCompleted && new Date(t.dueDate) > new Date() && new Date(t.dueDate).toDateString() !== new Date().toDateString());
  const completedTasks = tasks.filter(t => t.isCompleted);

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto bitrix-wallpaper font-['Inter',sans-serif] select-none">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header (Bitrix24 Glassmorphism) */}
        <div className="bitrix-glass rounded-2xl p-6 shadow-2xl border border-white/10 backdrop-blur-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
                  <CheckSquare className="w-3 h-3" /> РОБОЧІ ЗАВДАННЯ
                </span>
                <span className="text-xs text-slate-400 font-mono">Контроль дедлайнів & Домовленостей</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <span>Мої завдання</span>
                <span className="text-sm px-2.5 py-0.5 rounded-xl bg-white/10 text-slate-300 font-semibold">
                  {tasks.length} завдань
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Оперативне керування дорученнями, дзвінками кандидатам та виставленням рахунків роботодавцям.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => setIsCreating(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-blue-600/30 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Нове завдання</span>
              </button>

              <div className="flex bg-slate-900/80 border border-white/10 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setFilter('active')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'active' ? 'bg-blue-600 text-white shadow-sm font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Активні
                </button>
                <button
                  onClick={() => setFilter('completed')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'completed' ? 'bg-emerald-600 text-white shadow-sm font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Завершені
                </button>
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${filter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Всі
                </button>
              </div>
            </div>
          </div>

          {/* Bitrix24 Task Roles Bar (Live Counts) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-6 pt-5 border-t border-white/10">
            <button
              onClick={() => setFilter('active')}
              className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900/90 border border-white/5 hover:border-blue-500/30 text-left transition"
            >
              <div className="text-[11px] text-slate-400 font-medium">В роботі (Виконую)</div>
              <div className="text-xl font-black text-blue-400 mt-0.5">{tasks.filter(t => !t.isCompleted).length}</div>
            </button>
            <button
              onClick={() => setFilter('completed')}
              className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900/90 border border-white/5 hover:border-emerald-500/30 text-left transition"
            >
              <div className="text-[11px] text-slate-400 font-medium">Виконані</div>
              <div className="text-xl font-black text-emerald-400 mt-0.5">{tasks.filter(t => t.isCompleted).length}</div>
            </button>
            <button
              onClick={() => setFilter('active')}
              className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900/90 border border-white/5 hover:border-rose-500/30 text-left transition"
            >
              <div className="text-[11px] text-slate-400 font-medium">Прострочені</div>
              <div className="text-xl font-black text-rose-400 mt-0.5">
                {tasks.filter(t => !t.isCompleted && new Date(t.dueDate) < new Date()).length}
              </div>
            </button>
            <button
              onClick={() => setFilter('all')}
              className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900/90 border border-white/5 hover:border-purple-500/30 text-left transition"
            >
              <div className="text-[11px] text-slate-400 font-medium">Всього завдань</div>
              <div className="text-xl font-black text-purple-300 mt-0.5">{tasks.length}</div>
            </button>
          </div>
        </div>

        {/* Modal: Create Task */}
        {isCreating && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#111827] border border-slate-700/80 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-400" />
                  <span>Нове завдання</span>
                </h3>
                <button
                  onClick={() => setIsCreating(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Суть завдання *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Наприклад: Дзвінок директору щодо КП..."
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Тип дії
                    </label>
                    <select
                      value={newTaskType}
                      onChange={(e) => setNewTaskType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="call">📞 Дзвінок</option>
                      <option value="meeting">🤝 Зустріч / Zoom</option>
                      <option value="invoice">📑 Рахунок / Оплата</option>
                      <option value="presentation">📄 КП / Презентація</option>
                      <option value="follow_up">⏰ Нагадування</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Дедлайн
                    </label>
                    <input
                      type="datetime-local"
                      value={newTaskDue}
                      onChange={(e) => setNewTaskDue(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2.5 text-xs text-slate-400 hover:text-white rounded-xl transition"
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-blue-600/30"
                  >
                    {isSubmitting ? 'Збереження...' : 'Створити'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Empty State */}
        {tasks.length === 0 && (
          <div className="text-center py-16 bg-[#111827]/40 border border-slate-800/60 rounded-3xl space-y-3">
            <CheckSquare className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-300">Немає завдань у цій категорії</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Всі завдання виконані або ще не створені. Додайте нове завдання для контролю клієнтів.
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold transition"
            >
              + Створити перше завдання
            </button>
          </div>
        )}

        {/* Task Sections */}
        <div className="space-y-6">
          {/* Overdue Section */}
          {overdueTasks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>Прострочені завдання ({overdueTasks.length})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {overdueTasks.map(task => renderTaskCard(task, true))}
              </div>
            </div>
          )}

          {/* Today Section */}
          {todayTasks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>На сьогодні ({todayTasks.length})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {todayTasks.map(task => renderTaskCard(task, false))}
              </div>
            </div>
          )}

          {/* Upcoming Section */}
          {upcomingTasks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Заплановані ({upcomingTasks.length})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {upcomingTasks.map(task => renderTaskCard(task, false))}
              </div>
            </div>
          )}

          {/* Completed Section */}
          {filter !== 'active' && completedTasks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Завершені ({completedTasks.length})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {completedTasks.map(task => renderTaskCard(task, false))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );

  function renderTaskCard(task: DealTask, isOverdue: boolean) {
    return (
      <div
        key={task.id}
        className={`p-4 rounded-2xl border transition-all duration-200 bitrix-glass ${
          task.isCompleted
            ? 'border-white/5 opacity-60'
            : isOverdue
            ? 'border-rose-500/40 hover:border-rose-500/80 shadow-md shadow-rose-500/10'
            : 'border-white/10 hover:border-blue-500/40 shadow-lg'
        }`}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={() => handleToggleTask(task.id, task.isCompleted)}
            className="mt-0.5"
          >
            <CheckCircle2
              className={`w-5 h-5 transition ${
                task.isCompleted ? 'text-emerald-400' : 'text-slate-600 hover:text-emerald-400'
              }`}
            />
          </button>

          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-semibold ${task.isCompleted ? 'line-through text-slate-500' : 'text-white'}`}>
              {task.text}
            </h4>

            {task.deal && (
              <div
                onClick={() => onOpenDeal(task.deal!.id)}
                className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer font-medium"
              >
                <span>Угода: {task.deal.title}</span>
                <ExternalLink className="w-3 h-3" />
              </div>
            )}

            <div className="flex items-center justify-between mt-3 text-xs text-slate-400 pt-2 border-t border-slate-800">
              <span className={isOverdue && !task.isCompleted ? 'text-rose-400 font-bold' : ''}>
                Дедлайн: {new Date(task.dueDate).toLocaleDateString('uk-UA')}
              </span>
              <div className="flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>{task.responsible?.name}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
};
