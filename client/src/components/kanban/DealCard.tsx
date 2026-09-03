import React from 'react';
import { 
  Building2, 
  User as UserIcon, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MessageSquare,
  Phone
} from 'lucide-react';
import { Deal } from '../../types';

interface DealCardProps {
  deal: Deal;
  onClick: () => void;
}

export const DealCard: React.FC<DealCardProps> = ({ deal, onClick }) => {
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
      className="bg-[#1e293b] hover:bg-[#283548] border border-slate-700/80 hover:border-blue-500/50 rounded-xl p-3.5 shadow-sm hover:shadow-lg transition-all duration-150 cursor-pointer group select-none relative"
    >
      {/* Top Header: Title & Budget */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold text-slate-100 group-hover:text-blue-400 transition leading-snug line-clamp-2">
          {deal.title}
        </h4>
      </div>

      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-sm font-extrabold text-emerald-400">
          {formatCurrency(deal.budget || 0)}
        </span>

        {/* 1-Click Quick Contact Icons */}
        {primaryPhone && (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <a
              href={`https://wa.me/${primaryPhone}`}
              target="_blank"
              rel="noreferrer"
              title="Написати у WhatsApp"
              className="p-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 transition"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </a>
            <a
              href={tgUser ? `https://t.me/${tgUser}` : `tg://resolve?phone=${primaryPhone}`}
              target="_blank"
              rel="noreferrer"
              title="Написати у Telegram"
              className="p-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/40 text-sky-400 transition"
            >
              <span className="text-[11px] font-black leading-none px-0.5">TG</span>
            </a>
            <a
              href={`tel:+${primaryPhone}`}
              title="Зателефонувати"
              className="p-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 transition"
            >
              <Phone className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* Client / Company details */}
      <div className="space-y-1 text-xs text-slate-400 mb-3">
        {deal.company && (
          <div className="flex items-center gap-1.5 truncate">
            <Building2 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="truncate">{deal.company.name}</span>
          </div>
        )}
        {deal.contact && (
          <div className="flex items-center gap-1.5 truncate">
            <UserIcon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="truncate">{deal.contact.name}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-md"
            >
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-[10px] text-slate-500 self-center">+{tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Bottom Footer: Task status and Responsible User */}
      <div className="pt-2.5 border-t border-slate-700/60 flex items-center justify-between">
        {/* Next Task Indicator */}
        <div className="flex items-center gap-1.5 text-[11px]">
          {activeTask ? (
            <div className={`flex items-center gap-1 font-medium ${isTaskOverdue ? 'text-rose-400' : 'text-amber-400'}`}>
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="truncate max-w-[120px]">{activeTask.text}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-rose-400/80 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              <span>Без задачи</span>
            </div>
          )}
        </div>

        {/* Responsible Manager Avatar */}
        <div className="flex items-center" title={`Ответственный: ${deal.responsible?.name}`}>
          <img
            src={deal.responsible?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={deal.responsible?.name}
            className="w-6 h-6 rounded-full object-cover border border-slate-600 shadow-sm"
          />
        </div>
      </div>
    </div>
  );
};
