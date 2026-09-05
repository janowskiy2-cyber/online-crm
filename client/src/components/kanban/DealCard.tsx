import React, { useState } from 'react';
import { 
  Building2, 
  User as UserIcon, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MessageSquare,
  Phone,
  Link2,
  Check
} from 'lucide-react';
import { Deal } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_ADMIN_AVATAR } from '../../constants/defaultAvatar';

interface DealCardProps {
  deal: Deal;
  onClick: () => void;
  stageColor?: string;
}

export const DealCard: React.FC<DealCardProps> = ({ deal, onClick, stageColor = '#3b82f6' }) => {
  const [copiedLink, setCopiedLink] = useState(false);

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
  const activeTask = deal.tasks && deal.tasks.length > 0 ? deal.tasks[0] : null;
  const isTaskOverdue = activeTask ? new Date(activeTask.dueDate) < new Date() : false;

  const primaryPhone = (deal.contact?.phone || deal.contact?.whatsapp || '').replace(/\D/g, '');
  const tgUser = deal.contact?.telegram ? deal.contact.telegram.replace('@', '') : '';

  return (
    <div
      onClick={onClick}
      style={{ borderLeftColor: stageColor }}
      className="group relative bg-white dark:bg-[#0f1422] hover:bg-slate-50/90 dark:hover:bg-[#141b2e] border border-slate-200/90 dark:border-white/[0.08] border-l-[3.5px] rounded-xl p-3 shadow-sm hover:shadow-card-hover transition-all duration-150 cursor-pointer select-none"
    >
      {/* Top Header: Title & Direct Link Copy Button */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition leading-snug line-clamp-2 flex-1">
          {deal.title}
        </h4>
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
        <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
          {formatCurrency(deal.budget || 0)}
        </span>

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
        {/* Next Task Indicator */}
        <div className="flex items-center gap-1.5 text-[11px]">
          {activeTask ? (
            <div className={`flex items-center gap-1 font-medium ${isTaskOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
              <AlertCircle className="w-3 h-3 flex-shrink-0" strokeWidth={1.75} />
              <span className="truncate max-w-[120px]">{activeTask.text}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500/80" />
              <span>Без задачі</span>
            </div>
          )}
        </div>

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
  );
};
