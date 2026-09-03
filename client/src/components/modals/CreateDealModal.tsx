import React, { useState } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-['Inter',sans-serif]">
      <div className="bg-[#111827] border border-slate-700/80 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-[#141b2d]">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-400" />
            <span>Нова угода</span>
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="text-slate-300 block mb-1.5 font-semibold">Назва угоди *</label>
            <input
              type="text"
              placeholder="Наприклад: Підбір 15 зварювальників для ТОВ Агропром"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 block mb-1.5 font-semibold">Бюджет (€)</label>
              <input
                type="number"
                placeholder="6500"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-slate-300 block mb-1.5 font-semibold">Відповідальний менеджер</label>
              <select
                value={responsibleId}
                onChange={(e) => setResponsibleId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 block mb-1.5 font-semibold">Воронка</label>
              <select
                value={pipelineId}
                onChange={(e) => {
                   setPipelineId(e.target.value);
                   const p = pipelines.find(pl => pl.id === e.target.value);
                   if (p && p.stages && p.stages.length > 0) setStageId(p.stages[0].id);
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
              >
                {pipelines.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-300 block mb-1.5 font-semibold">Етап</label>
              <select
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
              >
                {(selectedPipeline?.stages || []).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Client Details */}
          <div className="pt-3 border-t border-slate-800/80 space-y-3">
            <h3 className="font-bold text-slate-200">Контактні дані клієнта та підприємства</h3>
            
            <div>
              <input
                type="text"
                placeholder="Підприємство / Завод / Роботодавець"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Контактна особа (ПІБ)"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                placeholder="Основний телефон (+380...)"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Додатковий номер"
                value={contactPhone2}
                onChange={(e) => setContactPhone2(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                placeholder="Telegram (@username)"
                value={contactTelegram}
                onChange={(e) => setContactTelegram(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <input
                type="text"
                placeholder="Теги (через кому, наприклад: Лід, WhatsApp, Терміново)"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-slate-400 hover:text-white rounded-xl transition"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Створення...' : 'Створити угоду'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
