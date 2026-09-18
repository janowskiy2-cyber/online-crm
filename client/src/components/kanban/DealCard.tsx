import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  User as UserIcon, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  AlertTriangle,
  MessageSquare,
  Phone,
  Link2,
  Check,
  ChevronDown,
  Plus,
  FileText,
  ExternalLink,
  Calendar,
  X,
  Send,
  Sparkles,
  Flame,
  CheckSquare
} from 'lucide-react';
import { Deal, Stage } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_ADMIN_AVATAR } from '../../constants/defaultAvatar';
import { api } from '../../services/api';
import { soundService } from '../../services/sound.service';

interface DealCardProps {
  deal: Deal;
  onClick: () => void;
  stageColor?: string;
  stages?: Stage[];
  onMoveStage?: (dealId: string, stageId: string) => void;
  onDealUpdated?: (updatedDeal: Deal) => void;
}

export const DealCard: React.FC<DealCardProps> = ({ 
  deal, 
  onClick, 
  stageColor = '#3b82f6',
  stages = [],
  onMoveStage,
  onDealUpdated
}) => {
  const { currentUser, users } = useAuth();
  const [copiedLink, setCopiedLink] = useState(false);
  const [isStagePickerOpen, setIsStagePickerOpen] = useState(false);
  
  // Expandable Mini-Card Drawer State
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedTab, setExpandedTab] = useState<'task' | 'note'>('task');

  // Interactive Task Popover / Result Plate State
  const [isTaskPlateOpen, setIsTaskPlateOpen] = useState(false);
  const [taskResultText, setTaskResultText] = useState('');
  const [isCompletingTask, setIsCompletingTask] = useState(false);

  // Quick Task Creation State
  const [quickTaskText, setQuickTaskText] = useState('');
  const [quickTaskType, setQuickTaskType] = useState('call');
  const [quickTaskDue, setQuickTaskDue] = useState('');
  const [isSavingTask, setIsSavingTask] = useState(false);

  // Quick Note Creation State
  const [quickNoteContent, setQuickNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSavedNotice, setNoteSavedNotice] = useState(false);

  // Local Tasks Sync for Instant Reactive UI
  const [localTasks, setLocalTasks] = useState<any[]>(deal.tasks || []);

  useEffect(() => {
    setLocalTasks(deal.tasks || []);
  }, [deal.tasks]);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const dealUrl = `${window.location.origin}/deals/${deal.id}`;
    navigator.clipboard.writeText(dealUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 }).format(val) + ' ₴';
  };

  const tags: string[] = deal.tags ? (typeof deal.tags === 'string' ? JSON.parse(deal.tags) : deal.tags) : [];

  // 3 Distinct Task States requested by user:
  // 1. Future Task: Green indicator (Active task exists, dueDate in future)
  // 2. Overdue Task: Red indicator (Active task exists, dueDate in past)
  // 3. No Task: Yellow/Amber Triangle warning indicator (No active tasks)
  const activeTasks = localTasks.filter((t: any) => !t.isCompleted && !t.isDeleted);
  const overdueTasks = activeTasks.filter((t: any) => new Date(t.dueDate).getTime() < Date.now());
  const isTaskOverdue = overdueTasks.length > 0;

  // Earliest active task
  const sortedTasks = [...activeTasks].sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const activeTask = isTaskOverdue 
    ? [...overdueTasks].sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]
    : (sortedTasks.length > 0 ? sortedTasks[0] : null);

  const taskStatus: 'future' | 'overdue' | 'no_task' = activeTasks.length === 0 
    ? 'no_task' 
    : (isTaskOverdue ? 'overdue' : 'future');

  const currentStage = stages.find(s => s.id === deal.stageId) || (deal.stage as any);
  const isPaused = currentStage && (
    (currentStage.name || '').toLowerCase().includes('відкладений') ||
    (currentStage.name || '').toLowerCase().includes('отложенный') ||
    (currentStage.name || '').toLowerCase().includes('пауз')
  );

  const formatTaskTime = (dueDateStr: string) => {
    try {
      const d = new Date(dueDateStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isTomorrow = d.toDateString() === tomorrow.toDateString();

      const timeStr = d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
      if (isToday) return `Сьогодні, ${timeStr}`;
      if (isTomorrow) return `Завтра, ${timeStr}`;
      return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const primaryPhone = (deal.contact?.phone || deal.contact?.whatsapp || '').replace(/\D/g, '');
  const tgUser = deal.contact?.telegram ? deal.contact.telegram.replace('@', '') : '';

  // Quick Preset Task Creation (1-Click)
  const handleQuickTaskPreset = async (e: React.MouseEvent, text: string, hoursAhead: number, type: string = 'call') => {
    e.stopPropagation();
    setIsSavingTask(true);
    try {
      const dueDate = new Date(Date.now() + hoursAhead * 3600 * 1000).toISOString();
      const res = await api.post('/tasks', {
        dealId: deal.id,
        responsibleId: deal.responsibleId || currentUser?.id || 'usr-admin',
        type,
        text,
        dueDate
      });
      if (res.data) {
        soundService.playSuccess();
        const updatedTasks = [res.data, ...localTasks.filter(t => t.id !== res.data.id)];
        setLocalTasks(updatedTasks);
        if (onDealUpdated) {
          onDealUpdated({ ...deal, tasks: updatedTasks });
        }
      }
      setIsTaskPlateOpen(false);
      setQuickTaskText('');
    } catch (err) {
      console.error('Failed to create quick task:', err);
    } finally {
      setIsSavingTask(false);
    }
  };

  // Custom Task Creation
  const handleCustomTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!quickTaskText.trim()) return;
    setIsSavingTask(true);
    try {
      const dueDate = quickTaskDue ? new Date(quickTaskDue).toISOString() : new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      const res = await api.post('/tasks', {
        dealId: deal.id,
        responsibleId: deal.responsibleId || currentUser?.id || 'usr-admin',
        type: quickTaskType,
        text: quickTaskText.trim(),
        dueDate
      });
      if (res.data) {
        soundService.playSuccess();
        const updatedTasks = [res.data, ...localTasks.filter(t => t.id !== res.data.id)];
        setLocalTasks(updatedTasks);
        if (onDealUpdated) {
          onDealUpdated({ ...deal, tasks: updatedTasks });
        }
      }
      setQuickTaskText('');
      setQuickTaskDue('');
      setIsTaskPlateOpen(false);
    } catch (err) {
      console.error('Failed to save task:', err);
    } finally {
      setIsSavingTask(false);
    }
  };

  // Quick Note Submission
  const handleQuickNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!quickNoteContent.trim()) return;
    setIsSavingNote(true);
    try {
      await api.post(`/deals/${deal.id}/notes`, {
        content: quickNoteContent.trim(),
        type: 'comment'
      });
      soundService.playSuccess();
      setQuickNoteContent('');
      setNoteSavedNotice(true);
      setTimeout(() => setNoteSavedNotice(false), 2500);
      if (onDealUpdated) {
        onDealUpdated({ 
          ...deal, 
          notes: [{ id: `n-${Date.now()}`, content: quickNoteContent.trim(), createdAt: new Date().toISOString() }, ...(deal.notes as any || [])] as any 
        });
      }
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setIsSavingNote(false);
    }
  };

  // Complete Task & Record Result Note
  const handleCompleteTaskWithResult = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    setIsCompletingTask(true);
    try {
      await api.put(`/tasks/${taskId}`, {
        isCompleted: true,
        resultText: taskResultText.trim() || undefined
      });
      if (taskResultText.trim()) {
        await api.post(`/deals/${deal.id}/notes`, {
          content: `✅ Завдання виконано: "${activeTask?.text || 'Задача'}" | Результат: ${taskResultText.trim()}`,
          type: 'system'
        }).catch(() => {});
      }
      soundService.playSuccess();
      const updatedTasks = localTasks.map(t => t.id === taskId ? { ...t, isCompleted: true } : t);
      setLocalTasks(updatedTasks);
      if (onDealUpdated) {
        onDealUpdated({ ...deal, tasks: updatedTasks });
      }
      setTaskResultText('');
      setIsTaskPlateOpen(false);
    } catch (err) {
      console.error('Failed to complete task:', err);
    } finally {
      setIsCompletingTask(false);
    }
  };

  // Postpone Task (+1 day / +2 days)
  const handlePostponeTask = async (e: React.MouseEvent, taskId: string, hours: number) => {
    e.stopPropagation();
    try {
      const newDueDate = new Date(Date.now() + hours * 3600 * 1000).toISOString();
      await api.put(`/tasks/${taskId}`, { dueDate: newDueDate });
      soundService.playSuccess();
      const updatedTasks = localTasks.map(t => t.id === taskId ? { ...t, dueDate: newDueDate } : t);
      setLocalTasks(updatedTasks);
      if (onDealUpdated) {
        onDealUpdated({ ...deal, tasks: updatedTasks });
      }
      setIsTaskPlateOpen(false);
    } catch (err) {
      console.error('Failed to postpone task:', err);
    }
  };

  // AI Health Score calculation
  const calculateAiScore = () => {
    let score = 50;
    if (activeTask) score += 30;
    if (deal.budget && deal.budget > 0) score += 10;
    if (deal.notes && (deal.notes as any).length > 0) score += 10;
    if (isTaskOverdue) score -= 25;
    return Math.max(15, Math.min(98, score));
  };

  const aiScore = calculateAiScore();
  const aiBadge = aiScore >= 80 
    ? { text: `🔥 ${aiScore}%`, color: 'text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/30', label: 'Гаряча угода' }
    : aiScore >= 50
    ? { text: `⚡ ${aiScore}%`, color: 'text-blue-500 dark:text-blue-400 bg-blue-500/10 border-blue-500/30', label: 'Перспективна' }
    : { text: `⚠️ ${aiScore}%`, color: 'text-rose-500 dark:text-rose-400 bg-rose-500/10 border-rose-500/30', label: 'Потребує уваги' };

  return (
    <div
      onClick={onClick}
      style={{ borderLeftColor: stageColor }}
      className={`group relative border border-black/[0.06] dark:border-white/[0.08] border-l-[3.5px] rounded-2xl p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.03),0_12px_24px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 active:scale-[0.985] transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-xl bg-white/95 dark:bg-[#0f172a]/95`}
    >
      {/* Dynamic Ambient Stage Glow in Top Right Corner */}
      <div 
        className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-25 dark:opacity-20 transition-opacity group-hover:opacity-45"
        style={{ backgroundColor: stageColor }}
      />

      {/* Top Header: Status Indicator + Title & Quick Action Buttons */}
      <div className="relative flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-1.5 min-w-0 flex-1">
          {taskStatus === 'future' && (
            <span 
              className="w-2 h-2 rounded-full bg-[#34C759] shadow-[0_0_6px_rgba(52,199,89,0.8)] mt-1 flex-shrink-0" 
              title={`Завдання заплановано на майбутнє: ${activeTask ? formatTaskTime(activeTask.dueDate) : ''}`}
            />
          )}
          {taskStatus === 'overdue' && (
            <span 
              className="w-2 h-2 rounded-full bg-[#FF3B30] shadow-[0_0_6px_rgba(255,59,48,0.8)] mt-1 flex-shrink-0 animate-pulse" 
              title={`Увага! Завдання прострочено: ${activeTask ? formatTaskTime(activeTask.dueDate) : ''}`}
            />
          )}
          {taskStatus === 'no_task' && (
            <span title="Увага! Лід без задачі!">
              <AlertTriangle className="w-3.5 h-3.5 text-[#FF9500] mt-0.5 flex-shrink-0 animate-pulse" />
            </span>
          )}
          <h4 className="text-xs font-semibold text-[#1D1D1F] dark:text-slate-100 group-hover:text-[#0071E3] dark:group-hover:text-blue-400 transition leading-snug line-clamp-2 tracking-tight">
            {deal.title}
          </h4>
        </div>

        {/* Top Right: Expand Drawer Button & Copy Link */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className={`p-1 rounded-full border transition-all flex items-center justify-center active:scale-95 ${
              isExpanded 
                ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-sm' 
                : 'bg-black/[0.04] dark:bg-white/[0.06] text-[#86868B] hover:text-[#0071E3] dark:text-slate-400 dark:hover:text-blue-400 border-black/[0.04] dark:border-white/[0.08]'
            }`}
            title={isExpanded ? "Згорнути міні-картку" : "Розгорнути міні-картку: швидко записати задачу або замітку"}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className={`opacity-0 group-hover:opacity-100 p-1 rounded-full transition-all flex-shrink-0 active:scale-95 ${
              copiedLink 
                ? 'opacity-100 bg-emerald-500/15 text-emerald-600' 
                : 'text-[#86868B] hover:text-[#0071E3] hover:bg-black/[0.04] dark:hover:bg-white/10'
            }`}
            title={copiedLink ? "Посилання скопійовано!" : "Скопіювати пряме посилання"}
          >
            {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Link2 className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Budget & AI Health Score */}
      <div className="relative flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold font-mono text-[#34C759] dark:text-emerald-400 bg-[#34C759]/10 px-2.5 py-0.5 rounded-full border border-[#34C759]/20 shadow-[0_1px_2px_rgba(52,199,89,0.06)]">
            {formatCurrency(deal.budget || 0)}
          </span>
          <span 
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${aiBadge.color}`}
            title={`ШІ-Скоринг здоров'я угоди: ${aiBadge.label}`}
          >
            {aiBadge.text}
          </span>
          {isPaused && (
            <span 
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 flex items-center gap-1 shadow-sm"
              title="Угода знаходиться в режимі відкладеного попиту"
            >
              <span>⏸️ Відкладено</span>
            </span>
          )}
        </div>

        {/* 1-Click Quick Contact Icons (WhatsApp, TG, Phone) */}
        {primaryPhone && (
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition" onClick={(e) => e.stopPropagation()}>
            <a
              href={`https://wa.me/${primaryPhone}`}
              target="_blank"
              rel="noreferrer"
              title="Написати у WhatsApp"
              className="p-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition active:scale-95"
            >
              <MessageSquare className="w-3 h-3" strokeWidth={1.75} />
            </a>
            <a
              href={tgUser ? `https://t.me/${tgUser}` : `tg://resolve?phone=${primaryPhone}`}
              target="_blank"
              rel="noreferrer"
              title="Написати у Telegram"
              className="px-1.5 py-0.5 rounded-full bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 transition text-[9px] font-bold leading-none active:scale-95"
            >
              TG
            </a>
            <a
              href={`tel:+${primaryPhone}`}
              title="Зателефонувати"
              className="p-1 rounded-full bg-[#0071E3]/10 hover:bg-[#0071E3]/20 text-[#0071E3] dark:text-blue-400 transition active:scale-95"
            >
              <Phone className="w-3 h-3" strokeWidth={1.75} />
            </a>
          </div>
        )}
      </div>

      {/* Client / Company Details */}
      {(deal.company || deal.contact) && (
        <div className="relative space-y-0.5 text-[11px] text-[#86868B] dark:text-slate-400 mb-2">
          {deal.company && (
            <div className="flex items-center gap-1.5 truncate">
              <Building2 className="w-3 h-3 text-[#86868B] dark:text-slate-500 flex-shrink-0" strokeWidth={1.5} />
              <span className="truncate font-medium text-[#1D1D1F]/80 dark:text-slate-300">{deal.company.name}</span>
            </div>
          )}
          {deal.contact && (
            <div className="flex items-center gap-1.5 truncate">
              <UserIcon className="w-3 h-3 text-[#86868B] dark:text-slate-500 flex-shrink-0" strokeWidth={1.5} />
              <span className="truncate">{deal.contact.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Tags: Apple Pills */}
      {tags.length > 0 && (
        <div className="relative flex flex-wrap gap-1 mb-2.5">
          {tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="text-[10px] font-medium bg-black/[0.04] dark:bg-white/[0.05] text-[#1D1D1F]/80 dark:text-slate-300 border border-black/[0.04] dark:border-white/[0.06] px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-[10px] text-[#86868B] self-center">+{tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Bottom Footer: Next Task & Responsible User */}
      <div className="relative pt-2 border-t border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between">
        {/* Next Task Indicator - Click opens Interactive Task Plate */}
        <div className="flex items-center gap-1.5 text-[11px] min-w-0 pr-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsTaskPlateOpen(!isTaskPlateOpen);
            }}
            className="text-left transition active:scale-[0.97] group/taskBtn"
          >
            {taskStatus === 'future' && activeTask && (
              <div 
                className="flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20 shadow-[0_1px_2px_rgba(52,199,89,0.06)] group-hover/taskBtn:border-[#34C759]/40"
                title="Натисніть, щоб зафіксувати результат або перенести завдання"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] shadow-[0_0_6px_rgba(52,199,89,0.8)]" />
                <Clock className="w-3 h-3 text-[#34C759] flex-shrink-0" />
                <span className="truncate max-w-[125px]">{formatTaskTime(activeTask.dueDate)}</span>
              </div>
            )}

            {taskStatus === 'overdue' && activeTask && (
              <div 
                className="flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/25 shadow-[0_1px_2px_rgba(255,59,48,0.06)] group-hover/taskBtn:border-[#FF3B30]/45"
                title="Увага! Натисніть, щоб зафіксувати результат або перенести завдання"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30] shadow-[0_0_6px_rgba(255,59,48,0.9)] animate-pulse" />
                <AlertCircle className="w-3 h-3 text-[#FF3B30] flex-shrink-0" />
                <span className="truncate max-w-[125px]">Прострочено ({formatTaskTime(activeTask.dueDate)})</span>
              </div>
            )}

            {taskStatus === 'no_task' && (
              <div 
                className="flex items-center gap-1 text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-[#FF9500]/10 text-[#FF9500] border border-[#FF9500]/20 shadow-sm group-hover/taskBtn:border-[#FF9500]/40"
                title="Натисніть, щоб швидко призначити наступне завдання"
              >
                <AlertTriangle className="w-3 h-3 text-[#FF9500] flex-shrink-0" />
                <span>+ Без задачі</span>
              </div>
            )}
          </button>
        </div>

        {/* Right side: 1-Tap Quick Stage Mover & Responsible Manager */}
        <div className="flex items-center gap-1.5">
          {onMoveStage && stages.length > 1 && (
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setIsStagePickerOpen(prev => !prev)}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] hover:bg-[#0071E3]/10 hover:text-[#0071E3] text-[#86868B] dark:text-slate-400 border border-black/[0.04] dark:border-white/[0.06] transition flex items-center gap-0.5 active:scale-[0.97]"
                title="Змінити етап в 1 клік (без перетягування)"
              >
                <span>➔ Етап</span>
              </button>
              {isStagePickerOpen && (
                <div 
                  className="absolute bottom-full mb-1.5 right-0 z-50 bg-white/95 dark:bg-[#121829]/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/10 rounded-2xl shadow-2xl p-1.5 min-w-[190px] space-y-0.5 animate-in fade-in zoom-in-95"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-[#86868B] uppercase tracking-wider border-b border-black/[0.04] dark:border-white/5">
                    Перемістити на:
                  </div>
                  {stages.map((stg) => {
                    const isCurrent = stg.id === deal.stageId;
                    return (
                      <button
                        key={stg.id}
                        type="button"
                        disabled={isCurrent}
                        onClick={() => {
                          setIsStagePickerOpen(false);
                          onMoveStage(deal.id, stg.id);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 transition ${
                          isCurrent 
                            ? 'bg-[#0071E3]/10 text-[#0071E3] font-semibold opacity-60 cursor-default' 
                            : 'text-[#1D1D1F] dark:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/5 hover:text-[#0071E3]'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stg.color || '#0071E3' }} />
                        <span className="truncate">{stg.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Responsible Manager Avatar */}
          <div className="flex items-center" title={`Відповідальний: ${deal.responsible?.name || 'Менеджер'}`}>
            <img
              src={(() => {
                const isSuperAdmin = deal.responsible?.role === 'super_admin' || deal.responsibleId === 'usr-admin' || deal.responsible?.email === 'admin@crm.pro';
                const matchingUser = users?.find(u => u.id === deal.responsibleId || (isSuperAdmin && u.role === 'super_admin'));
                return matchingUser?.avatar || deal.responsible?.avatar || (isSuperAdmin ? (currentUser?.avatar || DEFAULT_ADMIN_AVATAR) : DEFAULT_ADMIN_AVATAR);
              })()}
              alt={deal.responsible?.name || 'Менеджер'}
              className="w-5 h-5 rounded-full object-cover ring-1 ring-black/[0.08] dark:ring-white/[0.1] shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 🚀 EXPANDABLE MINI-CARD DRAWER (Розкривається по стрілці) */}
      {/* ======================================================== */}
      {isExpanded && (
        <div 
          onClick={(e) => e.stopPropagation()} 
          className="relative mt-3 pt-3 border-t border-black/[0.05] dark:border-white/[0.08] space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Tabs: [📅 Завдання] / [📝 Замітка про клієнта] - iOS Segmented Control */}
          <div className="flex items-center gap-1 bg-black/[0.04] dark:bg-black/40 p-1 rounded-full border border-black/[0.04] dark:border-white/5">
            <button
              type="button"
              onClick={() => setExpandedTab('task')}
              className={`flex-1 py-1 px-2.5 rounded-full text-[11px] font-medium transition flex items-center justify-center gap-1.5 active:scale-95 ${
                expandedTab === 'task'
                  ? 'bg-white dark:bg-[#0071E3] text-[#0071E3] dark:text-white shadow-sm font-semibold'
                  : 'text-[#86868B] dark:text-slate-400 hover:text-[#1D1D1F] dark:hover:text-white'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>+ Завдання</span>
            </button>
            <button
              type="button"
              onClick={() => setExpandedTab('note')}
              className={`flex-1 py-1 px-2.5 rounded-full text-[11px] font-medium transition flex items-center justify-center gap-1.5 active:scale-95 ${
                expandedTab === 'note'
                  ? 'bg-white dark:bg-amber-600 text-amber-600 dark:text-white shadow-sm font-semibold'
                  : 'text-[#86868B] dark:text-slate-400 hover:text-[#1D1D1F] dark:hover:text-white'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>+ Замітка</span>
            </button>
          </div>

          {/* Tab 1: Fast Task Creation */}
          {expandedTab === 'task' && (
            <div className="space-y-2">
              {/* 1-Click Task Presets */}
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={(e) => handleQuickTaskPreset(e, '📞 Дзвінок-кваліфікація (15 хв)', 24, 'call')}
                  disabled={isSavingTask}
                  className="p-1.5 rounded-xl bg-[#0071E3]/[0.08] hover:bg-[#0071E3]/[0.15] text-[#0071E3] dark:text-blue-300 font-medium border border-[#0071E3]/15 text-left truncate transition active:scale-[0.97]"
                >
                  📞 Завтра 10:00
                </button>
                <button
                  type="button"
                  onClick={(e) => handleQuickTaskPreset(e, '📄 Контроль розгляду КП та розрахунку', 48, 'meeting')}
                  disabled={isSavingTask}
                  className="p-1.5 rounded-xl bg-amber-500/[0.08] hover:bg-amber-500/[0.15] text-amber-700 dark:text-amber-300 font-medium border border-amber-500/15 text-left truncate transition active:scale-[0.97]"
                >
                  📄 Контроль КП (+2д)
                </button>
                <button
                  type="button"
                  onClick={(e) => handleQuickTaskPreset(e, '⚖️ Узгодження правок до договору', 72, 'other')}
                  disabled={isSavingTask}
                  className="p-1.5 rounded-xl bg-emerald-500/[0.08] hover:bg-emerald-500/[0.15] text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-500/15 text-left truncate transition active:scale-[0.97]"
                >
                  ⚖️ Договір (+3д)
                </button>
                <button
                  type="button"
                  onClick={(e) => handleQuickTaskPreset(e, '💳 Контроль надходження оплати (25%)', 24, 'invoice')}
                  disabled={isSavingTask}
                  className="p-1.5 rounded-xl bg-purple-500/[0.08] hover:bg-purple-500/[0.15] text-purple-700 dark:text-purple-300 font-medium border border-purple-500/15 text-left truncate transition active:scale-[0.97]"
                >
                  💳 Оплата (+24г)
                </button>
              </div>

              {/* Custom Task Input */}
              <form onSubmit={handleCustomTaskSubmit} className="space-y-1.5">
                <input
                  type="text"
                  placeholder="Введіть свою задачу..."
                  value={quickTaskText}
                  onChange={(e) => setQuickTaskText(e.target.value)}
                  className="w-full bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-[#1D1D1F] dark:text-white placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30 transition"
                />
                <div className="flex items-center gap-1.5">
                  <select
                    value={quickTaskType}
                    onChange={(e) => setQuickTaskType(e.target.value)}
                    className="bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/10 rounded-xl px-2 py-1 text-[11px] text-[#1D1D1F] dark:text-white focus:outline-none"
                  >
                    <option value="call">📞 Дзвінок</option>
                    <option value="meeting">🤝 Зустріч</option>
                    <option value="email">📄 КП / Пошта</option>
                    <option value="invoice">💳 Оплата</option>
                  </select>
                  <input
                    type="datetime-local"
                    value={quickTaskDue}
                    onChange={(e) => setQuickTaskDue(e.target.value)}
                    className="flex-1 bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/10 rounded-xl px-2 py-1 text-[11px] text-[#1D1D1F] dark:text-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSavingTask || !quickTaskText.trim()}
                    className="px-3 py-1 bg-[#0071E3] hover:bg-[#0077ED] active:scale-[0.97] disabled:opacity-50 text-white rounded-xl text-xs font-medium transition flex items-center gap-1 flex-shrink-0 shadow-sm"
                  >
                    <span>{isSavingTask ? '...' : '+ Додати'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 2: Fast Note Creation */}
          {expandedTab === 'note' && (
            <form onSubmit={handleQuickNoteSubmit} className="space-y-2">
              <textarea
                rows={2}
                placeholder="Запишіть інформацію, деталі дзвінка або вимоги клієнта..."
                value={quickNoteContent}
                onChange={(e) => setQuickNoteContent(e.target.value)}
                className="w-full bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/10 rounded-xl p-2 text-xs text-[#1D1D1F] dark:text-white placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none leading-relaxed transition"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {noteSavedNotice ? '✓ Замітку збережено!' : ''}
                </span>
                <button
                  type="submit"
                  disabled={isSavingNote || !quickNoteContent.trim()}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-500 active:scale-[0.97] disabled:opacity-50 text-white rounded-xl text-xs font-medium transition flex items-center gap-1 shadow-sm"
                >
                  <span>{isSavingNote ? 'Збереження...' : 'Зберегти замітку'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Mini-Card Footer Link */}
          <div className="pt-1 flex items-center justify-between text-[11px]">
            <span className="text-[#86868B] text-[10px] truncate max-w-[140px]">
              {deal.company?.name || deal.contact?.name || 'Картка клієнта'}
            </span>
            <button
              type="button"
              onClick={onClick}
              className="text-[#0071E3] hover:text-[#0077ED] hover:underline font-semibold text-[11px] flex items-center gap-1"
            >
              <span>Повна картка</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 📌 INTERACTIVE TASK ACTION PLATE (Вибиває по кліку на задачу) */}
      {/* ======================================================== */}
      {isTaskPlateOpen && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-2 bottom-2 z-50 p-3 bg-white/95 dark:bg-[#1D1D1F]/95 border border-black/[0.08] dark:border-white/10 rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.12)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 space-y-2.5"
        >
          <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/10 pb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1D1D1F] dark:text-white">
              <CheckSquare className="w-3.5 h-3.5 text-[#0071E3]" />
              <span>Дія по завданню</span>
            </div>
            <button
              type="button"
              onClick={() => setIsTaskPlateOpen(false)}
              className="p-1 text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {activeTask ? (
            <div className="space-y-2">
              <div className="text-[11px] bg-black/[0.03] dark:bg-white/[0.05] p-2.5 rounded-xl border border-black/[0.04] dark:border-white/[0.06]">
                <div className="font-semibold text-[#1D1D1F] dark:text-white truncate">
                  {activeTask.text}
                </div>
                <div className="text-[10px] text-[#86868B] dark:text-slate-400 mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#86868B]" />
                  <span>Термін: {formatTaskTime(activeTask.dueDate)}</span>
                </div>
              </div>

              {/* Record Call/Action Result */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-[#86868B] uppercase tracking-wider block">
                  Результат контакту:
                </label>
                <input
                  type="text"
                  placeholder="Що відповів клієнт? (збережеться в замітку)"
                  value={taskResultText}
                  onChange={(e) => setTaskResultText(e.target.value)}
                  className="w-full bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-[#1D1D1F] dark:text-white placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition"
                />
              </div>

              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  type="button"
                  disabled={isCompletingTask}
                  onClick={(e) => handleCompleteTaskWithResult(e, activeTask.id)}
                  className="flex-1 py-1.5 bg-[#34C759] hover:bg-[#30B753] text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1 shadow-sm active:scale-[0.97]"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isCompletingTask ? '...' : '✅ Виконано'}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handlePostponeTask(e, activeTask.id, 24)}
                  className="px-2.5 py-1.5 bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.15] text-[#1D1D1F] dark:text-white rounded-xl text-xs font-medium transition active:scale-[0.97]"
                  title="Перенести на +24 години"
                >
                  +1 день
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                У ліда немає задачі! Призначте дію в 1 клік:
              </p>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={(e) => handleQuickTaskPreset(e, '📞 Дзвінок-кваліфікація (15 хв)', 24, 'call')}
                  className="p-1.5 rounded-xl bg-[#0071E3]/[0.08] hover:bg-[#0071E3]/[0.15] text-[#0071E3] dark:text-blue-300 font-medium text-left border border-[#0071E3]/15 transition active:scale-[0.97]"
                >
                  📞 Завтра 10:00
                </button>
                <button
                  type="button"
                  onClick={(e) => handleQuickTaskPreset(e, '📄 Контроль КП та прорахунку', 48, 'meeting')}
                  className="p-1.5 rounded-xl bg-amber-500/[0.08] hover:bg-amber-500/[0.15] text-amber-700 dark:text-amber-300 font-medium text-left border border-amber-500/15 transition active:scale-[0.97]"
                >
                  📄 КП (+2 дні)
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
