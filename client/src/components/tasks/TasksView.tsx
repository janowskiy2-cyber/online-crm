import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  User as UserIcon,
  ExternalLink,
  Plus
} from 'lucide-react';
import { api, socket } from '../../services/api';
import { DealTask } from '../../types';

interface TasksViewProps {
  onOpenDeal: (dealId: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ onOpenDeal }) => {
  const [tasks, setTasks] = useState<DealTask[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');

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

  const overdueTasks = tasks.filter(t => !t.isCompleted && new Date(t.dueDate) < new Date());
  const todayTasks = tasks.filter(t => !t.isCompleted && new Date(t.dueDate).toDateString() === new Date().toDateString());
  const upcomingTasks = tasks.filter(t => !t.isCompleted && new Date(t.dueDate) > new Date() && new Date(t.dueDate).toDateString() !== new Date().toDateString());
  const completedTasks = tasks.filter(t => t.isCompleted);

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0b0f19]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <CheckSquare className="w-7 h-7 text-blue-500" />
              <span>Задачи и Дедлайны</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Контроль выполнения договоренностей по сделкам и клиентам
            </p>
          </div>

          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition ${filter === 'active' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
            >
              Активные ({tasks.filter(t => !t.isCompleted).length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1.5 rounded-lg transition ${filter === 'completed' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
            >
              Завершенные
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${filter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
            >
              Все
            </button>
          </div>
        </div>

        {/* Task Sections */}
        <div className="space-y-6">
          {/* Overdue Section */}
          {overdueTasks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>Просроченные задачи ({overdueTasks.length})</span>
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
                <span>На сегодня ({todayTasks.length})</span>
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
                <span>Предстоящие ({upcomingTasks.length})</span>
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
                <span>Выполненные ({completedTasks.length})</span>
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
                <span>Сделка: {task.deal.title}</span>
                <ExternalLink className="w-3 h-3" />
              </div>
            )}

            <div className="flex items-center justify-between mt-3 text-xs text-slate-400 pt-2 border-t border-slate-800">
              <span className={isOverdue && !task.isCompleted ? 'text-rose-400 font-bold' : ''}>
                Дедлайн: {new Date(task.dueDate).toLocaleDateString('ru-RU')}
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
