import React, { useState, useEffect } from 'react';
import { 
  X, 
  Phone, 
  Mail, 
  MessageSquare, 
  Briefcase, 
  Clock, 
  Copy, 
  Check, 
  Shield, 
  Sparkles 
} from 'lucide-react';
import { DEFAULT_ADMIN_AVATAR } from '../../constants/defaultAvatar';

interface EmployeeProfileModalProps {
  colleague: {
    id: string;
    name: string;
    role?: string;
    department?: string;
    phone?: string;
    email?: string;
    telegram?: string;
    status?: 'online' | 'busy' | 'offline';
    avatar?: string;
  };
  onClose: () => void;
  onCall: (name: string, phone: string) => void;
  onChat: (colleagueId: string) => void;
  onFilterDeals?: (managerName: string) => void;
}

export const EmployeeProfileModal: React.FC<EmployeeProfileModalProps> = ({
  colleague,
  onClose,
  onCall,
  onChat,
  onFilterDeals
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isOnline = colleague.status === 'online' || !colleague.status;

  const roleLabels: Record<string, string> = {
    super_admin: 'Суперадміністратор',
    admin: 'Адміністратор компанії',
    manager: 'Менеджер з рекрутингу',
    recruiter: 'Рекрутер / Скринінг',
    coordinator: 'Координатор кандидатів',
    lawyer: 'Юрист (Візи & Дозволи)'
  };

  const displayRole = roleLabels[colleague.role || ''] || colleague.role || 'Співробітник';
  const displayDept = colleague.department || 'Відділ працевлаштування та рекрутингу';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-[#0e1424]/95 border border-white/15 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden backdrop-blur-2xl text-white select-none animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover Banner with Bitrix24 Glass Accent */}
        <div className="relative h-28 bg-gradient-to-r from-blue-600/40 via-indigo-600/30 to-purple-600/40 border-b border-white/10 p-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-1.5 text-blue-200">
              <Shield className="w-3 h-3 text-blue-400" />
              Команда CRM
            </span>
          </div>
          
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-slate-300 hover:text-white flex items-center justify-center transition border border-white/10"
            title="Закрити"
            aria-label="Закрити"
            data-testid="close-modal"
            data-modal-close="employee-profile"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Card Body */}
        <div className="px-6 pb-6 pt-0 relative">
          {/* Avatar with Ring & Status Badge */}
          <div className="relative -mt-14 mb-4 flex justify-between items-end">
            <div className="relative">
              <img 
                src={colleague.avatar || DEFAULT_ADMIN_AVATAR} 
                alt={colleague.name}
                className="w-24 h-24 rounded-2xl object-cover border-4 border-[#0e1424] shadow-xl ring-2 ring-white/10"
              />
              <span 
                className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-[#0e1424] shadow-md ${
                  isOnline ? 'bg-emerald-500 ring-2 ring-emerald-500/30' : 'bg-amber-500'
                }`}
                title={isOnline ? 'В мережі' : 'Не в мережі'}
              />
            </div>

            {/* Live Work Status Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-white/10 text-xs font-semibold">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className={isOnline ? 'text-emerald-300' : 'text-amber-300'}>
                {isOnline ? 'В мережі (Працює)' : 'Зайнятий'}
              </span>
            </div>
          </div>

          {/* Name & Title */}
          <div className="mb-4">
            <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              {colleague.name}
              <Sparkles className="w-4 h-4 text-blue-400 fill-blue-400/20" />
            </h3>
            <p className="text-sm font-medium text-blue-400 mt-0.5">{displayRole}</p>
            <p className="text-xs text-slate-400 mt-0.5">{displayDept}</p>
          </div>

          {/* Contact Details List with 1-Click Copy */}
          <div className="space-y-2 mb-5">
            {/* Phone */}
            {colleague.phone && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Робочий телефон</div>
                    <div className="text-xs font-mono font-medium text-slate-200">{colleague.phone}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(colleague.phone || '', 'phone')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                  title="Скопіювати телефон"
                >
                  {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}

            {/* Email */}
            {colleague.email && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Корпоративний Email</div>
                    <div className="text-xs font-mono font-medium text-slate-200">{colleague.email}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(colleague.email || '', 'email')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                  title="Скопіювати Email"
                >
                  {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}

            {/* Work Schedule */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Робочий графік</div>
                  <div className="text-xs font-medium text-slate-200">Пн–Пт, 09:00 – 18:00 (Київ)</div>
                </div>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                Зміна відкрита
              </span>
            </div>
          </div>

          {/* Quick Stats Pill Grid */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            <div 
              onClick={() => onFilterDeals && onFilterDeals(colleague.name)}
              className="p-3 rounded-xl bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 cursor-pointer transition text-center"
            >
              <div className="text-lg font-black text-blue-400 font-mono">14</div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">Активні угоди</div>
            </div>

            <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 text-center">
              <div className="text-lg font-black text-purple-400 font-mono">6</div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">Завдань в роботі</div>
            </div>
          </div>

          {/* Explicit User Actions — No Creepy Auto-Calling! */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => {
                onChat(colleague.id);
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition transform active:scale-95"
            >
              <MessageSquare className="w-4 h-4" />
              Написати в чат
            </button>

            <button
              onClick={() => {
                onCall(colleague.name, colleague.phone || '+380');
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition transform active:scale-95"
            >
              <Phone className="w-4 h-4 fill-current" />
              Зателефонувати
            </button>
          </div>

          {/* Secondary Action: Filter Deals */}
          {onFilterDeals && (
            <button
              onClick={() => {
                onFilterDeals(colleague.name);
                onClose();
              }}
              className="w-full mt-2.5 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition border border-white/10"
            >
              <Briefcase className="w-3.5 h-3.5 text-blue-400" />
              Показати всі угоди співробітника
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
