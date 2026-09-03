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
    <div className="flex-1 p-8 overflow-y-auto bg-[#080c14] select-none font-['Inter',sans-serif]">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <CheckSquare className="w-7 h-7 text-blue-500" />
              <span>Завдання та Дедлайни</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Контроль виконання домовленостей по угодах та клієнтах
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-blue-600/30 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Нове завдання</span>
            </button>

            <div className="flex bg-[#111827] border border-slate-800 p-1 rounded-2xl text-xs font-semibold">
              <button
                onClick={() => setFilter('active')}
                className={`px-3 py-1.5 rounded-xl transition ${filter === 'active' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
              >
                Активні
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-3 py-1.5 rounded-xl transition ${filter === 'completed' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
              >
                Завершені
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-xl transition ${filter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
              >
                Всі
              </button>
            </div>
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
        className={`p-4 rounded-2xl border transition bg-[#111827] ${
          task.isCompleted
            ? 'border-slate-800 opacity-60'
            : isOverdue
            ? 'border-rose-500/40 hover:border-rose-500/80 shadow-sm shadow-rose-500/5'
            : 'border-slate-800 hover:border-slate-700'
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
