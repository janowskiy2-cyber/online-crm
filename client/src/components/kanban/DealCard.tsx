import React, { useState } from 'react';
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
  Check
} from 'lucide-react';
import { Deal, Stage } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_ADMIN_AVATAR } from '../../constants/defaultAvatar';

interface DealCardProps {
  deal: Deal;
  onClick: () => void;
  stageColor?: string;
  stages?: Stage[];
  onMoveStage?: (dealId: string, stageId: string) => void;
}

export const DealCard: React.FC<DealCardProps> = ({ 
  deal, 
  onClick, 
  stageColor = '#3b82f6',
  stages = [],
  onMoveStage
}) => {
  const { currentUser, users } = useAuth();
  const [copiedLink, setCopiedLink] = useState(false);
  const [isStagePickerOpen, setIsStagePickerOpen] = useState(false);

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
  const activeTasks = (deal.tasks || []).filter((t: any) => !t.isCompleted && !t.isDeleted);
  const overdueTasks = activeTasks.filter((t: any) => new Date(t.dueDate).getTime() < Date.now());
  const isTaskOverdue = overdueTasks.length > 0;

  // Earliest active task (if overdue, show earliest overdue; else earliest upcoming)
  const sortedTasks = [...activeTasks].sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const activeTask = isTaskOverdue 
    ? [...overdueTasks].sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]
    : (sortedTasks.length > 0 ? sortedTasks[0] : null);

  const taskStatus: 'future' | 'overdue' | 'no_task' = activeTasks.length === 0 
    ? 'no_task' 
    : (isTaskOverdue ? 'overdue' : 'future');

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

  // AI Health Score calculation (deterministic fast scoring backed by Gemini AI heuristics)
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
      className="group relative bg-white dark:bg-[#0f1422] hover:bg-slate-50/90 dark:hover:bg-[#141b2e] border border-slate-200/90 dark:border-white/[0.08] border-l-[3.5px] rounded-xl p-3 shadow-sm hover:shadow-card-hover transition-all duration-150 cursor-pointer"
    >
      {/* Top Header: Status Indicator + Title & Direct Link Copy Button */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-start gap-1.5 min-w-0 flex-1">
          {taskStatus === 'future' && (
            <span 
              className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] mt-0.5 flex-shrink-0" 
              title={`Завдання заплановано на майбутнє: ${activeTask ? formatTaskTime(activeTask.dueDate) : ''}`}
            />
          )}
          {taskStatus === 'overdue' && (
            <span 
              className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] mt-0.5 flex-shrink-0 animate-ping" 
              title={`Увага! Завдання прострочено: ${activeTask ? formatTaskTime(activeTask.dueDate) : ''}`}
            />
          )}
          {taskStatus === 'no_task' && (
            <span title="Увага! Лід без задачі!">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0 animate-pulse" />
            </span>
          )}
          <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition leading-snug line-clamp-2">
            {deal.title}
          </h4>
        </div>
        <button
          onClick={handleCopyLink}
          className={`opacity-0 group-hover:opacity-100 p-1 rounded transition flex-shrink-0 ${
            copiedLink 
              ? 'opacity-100 bg-emerald-500/20 text-emerald-500' 
              : 'text-slate-400 hover:text-blue-500 hover:bg-blue-500/10'
          }`}
          title={copiedLink ? "Посилання скопійовано!" : "Скопіювати пряме посилання на угоду"}
        >
          {copiedLink ? <Check className="w-3 h-3 text-emerald-500" /> : <Link2 className="w-3 h-3" />}
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            {formatCurrency(deal.budget || 0)}
          </span>
          <span 
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${aiBadge.color}`}
            title={`ШІ-Скоринг здоров'я угоди: ${aiBadge.label}`}
          >
            {aiBadge.text}
          </span>
        </div>

        {/* 1-Click Quick Contact Icons (WhatsApp, TG, Phone) */}
        {primaryPhone && (
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition" onClick={(e) => e.stopPropagation()}>
            <a
              href={`https://wa.me/${primaryPhone}`}
              target="_blank"
              rel="noreferrer"
              title="WhatsApp"
              className="p-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition"
            >
              <MessageSquare className="w-3 h-3" strokeWidth={1.75} />
            </a>
            <a
              href={tgUser ? `https://t.me/${tgUser}` : `tg://resolve?phone=${primaryPhone}`}
              target="_blank"
              rel="noreferrer"
              title="Telegram"
              className="p-1 rounded-md bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 transition text-[10px] font-bold leading-none"
            >
              TG
            </a>
            <a
              href={`tel:+${primaryPhone}`}
              title="Зателефонувати"
              className="p-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition"
            >
              <Phone className="w-3 h-3" strokeWidth={1.75} />
            </a>
          </div>
        )}
      </div>

      {/* Client / Company Details */}
      {(deal.company || deal.contact) && (
        <div className="space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 mb-2">
          {deal.company && (
            <div className="flex items-center gap-1.5 truncate">
              <Building2 className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0" strokeWidth={1.5} />
              <span className="truncate">{deal.company.name}</span>
            </div>
          )}
          {deal.contact && (
            <div className="flex items-center gap-1.5 truncate">
              <UserIcon className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0" strokeWidth={1.5} />
              <span className="truncate">{deal.contact.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Tags: Linear pastel pills */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="text-[10px] font-medium bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.06] px-1.5 py-0.2 rounded"
            >
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-[10px] text-slate-400 self-center">+{tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Bottom Footer: Next Task & Responsible User */}
      <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
        {/* Next Task Indicator - 3 States: Green (Future), Red (Overdue), Yellow Triangle (No task) */}
        <div className="flex items-center gap-1.5 text-[11px] min-w-0 pr-1">
          {taskStatus === 'future' && activeTask && (
            <div 
              className="flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 shadow-sm"
              title={`Завдання на майбутнє: ${activeTask.text} (${formatTaskTime(activeTask.dueDate)})`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
              <Clock className="w-3 h-3 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
              <span className="truncate max-w-[125px]">{formatTaskTime(activeTask.dueDate)}</span>
            </div>
          )}

          {taskStatus === 'overdue' && activeTask && (
            <div 
              className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/35 shadow-sm"
              title={`Прострочена задача: ${activeTask.text} (${formatTaskTime(activeTask.dueDate)})`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)] animate-ping" />
              <AlertCircle className="w-3 h-3 text-rose-500 dark:text-rose-400 flex-shrink-0" />
              <span className="truncate max-w-[125px]">Прострочено ({formatTaskTime(activeTask.dueDate)})</span>
            </div>
          )}

          {taskStatus === 'no_task' && (
            <div 
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-sm"
              title="Увага! У ліда немає жодної запланованої задачі. Призначте дію!"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span>Без задачі!</span>
            </div>
          )}
        </div>

        {/* Right side: 1-Tap Quick Stage Mover & Responsible Manager */}
        <div className="flex items-center gap-1.5">
          {onMoveStage && stages.length > 1 && (
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setIsStagePickerOpen(prev => !prev)}
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] hover:bg-blue-500/10 hover:text-blue-500 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/[0.06] transition flex items-center gap-0.5 active:scale-95"
                title="Змінити етап в 1 клік (без перетягування)"
              >
                <span>➔ Етап</span>
              </button>
              {isStagePickerOpen && (
                <div 
                  className="absolute bottom-full mb-1 right-0 z-50 bg-white dark:bg-[#121829] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl p-1.5 min-w-[180px] space-y-0.5 animate-in fade-in zoom-in-95"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-white/5">
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
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                          isCurrent 
                            ? 'bg-blue-500/10 text-blue-500 font-bold opacity-60 cursor-default' 
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-blue-600'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stg.color || '#3b82f6' }} />
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
              className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-200 dark:ring-white/[0.1] shadow-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
