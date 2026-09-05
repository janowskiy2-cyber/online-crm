import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  AlertCircle, 
  AlertTriangle,
  Building2, 
  User, 
  Euro, 
  FolderKanban,
  Sparkles,
  ChevronDown,
  Tag,
  ExternalLink
} from 'lucide-react';
import { Pipeline } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface CreateDealModalProps {
  pipelines: Pipeline[];
  activePipelineId: string;
  initialStageId?: string;
  onClose: () => void;
  onDealCreated: (deal: any) => void;
}

export const CreateDealModal: React.FC<CreateDealModalProps> = ({
  pipelines,
  activePipelineId,
  initialStageId,
  onClose,
  onDealCreated
}) => {
  const { currentUser, users } = useAuth();
  const [title, setTitle] = useState('');
  const [budget, setBudget] = useState('');
  const [pipelineId, setPipelineId] = useState(activePipelineId);
  const selectedPipeline = pipelines.find(p => p.id === pipelineId) || pipelines[0] || { id: 'default', name: 'Воронка', stages: [] };
  const [stageId, setStageId] = useState(initialStageId || selectedPipeline?.stages?.[0]?.id || '');
  const [responsibleId, setResponsibleId] = useState(currentUser?.id || '');
  
  // Client info
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactPhone2, setContactPhone2] = useState('');
  const [contactTelegram, setContactTelegram] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [tagsInput, setTagsInput] = useState('Лід, WhatsApp');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escape key close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Anti-Duplicate Live Guard
  const [duplicateWarning, setDuplicateWarning] = useState<any[]>([]);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  useEffect(() => {
    const query = contactPhone.trim() || companyName.trim();
    if (query.length < 5) {
      setDuplicateWarning([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setIsCheckingDuplicate(true);
        const res = await api.get('/deals/check-duplicate', { params: { query } });
        if (res.data?.duplicateFound && res.data?.duplicates?.length > 0) {
          setDuplicateWarning(res.data.duplicates);
        } else {
          setDuplicateWarning([]);
        }
      } catch (e) {
        setDuplicateWarning([]);
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [contactPhone, companyName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Введіть назву угоди');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Create company if provided
      let companyId: string | null = null;
      if (companyName.trim()) {
        try {
          const compRes = await api.post('/contacts/companies', { name: companyName.trim() });
          companyId = compRes.data?.id || null;
        } catch (compErr) {
          console.warn('Company auto-create fallback:', compErr);
        }
      }

      // 2. Create contact if provided
      let contactId: string | null = null;
      if (contactName.trim() || contactPhone.trim()) {
        const contRes = await api.post('/contacts', {
          name: contactName.trim() || 'Новий контакт',
          phone: contactPhone.trim(),
          phone2: contactPhone2.trim(),
          whatsapp: contactPhone.trim(),
          telegram: contactTelegram.trim(),
          companyId
        });
        contactId = contRes.data?.id || null;
      }

      // 3. Create deal
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const res = await api.post('/deals', {
        title: title.trim(),
        budget: Number(budget) || 0,
        pipelineId,
        stageId: stageId || selectedPipeline?.stages?.[0]?.id || 'stage-default',
        responsibleId: responsibleId || currentUser?.id,
        contactId,
        companyId,
        tags
      });

      onDealCreated(res.data);
      onClose();
    } catch (e: any) {
      console.error('Failed to create deal:', e);
      setError(e?.response?.data?.error || e?.message || 'Не вдалося створити угоду. Перевірте з’єднання.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-['Inter',sans-serif] animate-in fade-in duration-200">
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-3xl w-full max-w-lg shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.35)] overflow-hidden transition-all duration-300">
        
        {/* Modal Header */}
        <div className="h-16 px-6 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shadow-sm">
              <Plus className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-800 dark:text-white">
                Нова угода
              </h2>
              <p className="text-[11px] text-slate-400 font-normal">
                Створення картки клієнта та замовлення
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 rounded-2xl transition-all duration-200"
            title="Закрити"
            aria-label="Закрити"
            data-testid="close-modal"
            data-modal-close="create-deal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50/80 dark:bg-rose-500/10 border border-rose-200/50 dark:border-rose-500/20 rounded-2xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5 shadow-sm animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(88vh-8rem)] overflow-y-auto">
          
          {/* Main Deal Info Card */}
          <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300 space-y-3.5">
            <div>
              <label className="text-slate-800 dark:text-slate-200 block mb-1.5 font-semibold text-xs tracking-tight">
                Назва угоди <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Наприклад: Підбір 15 зварювальників для ТОВ Агропром"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-800 dark:text-slate-200 block mb-1.5 font-semibold text-xs tracking-tight flex items-center gap-1.5">
                  <Euro className="w-3.5 h-3.5 text-slate-400" />
                  <span>Бюджет (€)</span>
                </label>
                <input
                  type="number"
                  placeholder="6500"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-800 dark:text-slate-200 block mb-1.5 font-semibold text-xs tracking-tight flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Відповідальний менеджер</span>
                </label>
                <div className="relative">
                  <select
                    value={responsibleId}
                    onChange={(e) => setResponsibleId(e.target.value)}
                    className="w-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 appearance-none pr-9 cursor-pointer"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-800 dark:text-slate-200 block mb-1.5 font-semibold text-xs tracking-tight flex items-center gap-1.5">
                  <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
                  <span>Воронка</span>
                </label>
                <div className="relative">
                  <select
                    value={pipelineId}
                    onChange={(e) => {
                       setPipelineId(e.target.value);
                       const p = pipelines.find(pl => pl.id === e.target.value);
                       if (p && p.stages && p.stages.length > 0) setStageId(p.stages[0].id);
                    }}
                    className="w-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 appearance-none pr-9 cursor-pointer"
                  >
                    {pipelines.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-slate-800 dark:text-slate-200 block mb-1.5 font-semibold text-xs tracking-tight">Етап</label>
                <div className="relative">
                  <select
                    value={stageId}
                    onChange={(e) => setStageId(e.target.value)}
                    className="w-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 appearance-none pr-9 cursor-pointer"
                  >
                    {(selectedPipeline?.stages || []).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Client Details Floating Card */}
          <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                <span>Контактні дані клієнта та підприємства</span>
              </h3>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                Автостворення
              </span>
            </div>
            
            <div>
              <input
                type="text"
                placeholder="Підприємство / Завод / Роботодавець"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Контактна особа (ПІБ)"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                />
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Основний телефон (+380...)"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Додатковий номер"
                value={contactPhone2}
                onChange={(e) => setContactPhone2(e.target.value)}
                className="w-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 font-mono"
              />
              <input
                type="text"
                placeholder="Telegram (@username)"
                value={contactTelegram}
                onChange={(e) => setContactTelegram(e.target.value)}
                className="w-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 font-mono"
              />
            </div>

            {/* Live Duplicate Warning Banner */}
            {duplicateWarning.length > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center gap-1.5 font-bold text-amber-400">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Увага: у системі вже є схожі клієнти/угоди!</span>
                </div>
                <div className="space-y-1.5">
                  {duplicateWarning.map(dup => (
                    <div key={dup.id} className="bg-black/30 p-2 rounded-xl border border-amber-500/20 text-[11px] flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white">{dup.title}</div>
                        <div className="text-slate-400 text-[10px]">
                          {dup.companyName && <span>Підприємство: {dup.companyName} • </span>}
                          {dup.phone && <span>Тел: {dup.phone} • </span>}
                          <span>Менеджер: {dup.responsibleName} ({dup.stageName})</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Теги (через кому, наприклад: Лід, WhatsApp, Терміново)"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                />
                <Tag className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/50 dark:border-slate-800/50">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium tracking-tight rounded-2xl hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-all duration-200"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold tracking-tight rounded-2xl shadow-lg shadow-blue-500/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/40 active:translate-y-0 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-200" />
              <span>{isSubmitting ? 'Створення...' : 'Створити угоду'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
