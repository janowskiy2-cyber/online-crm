import React, { useState } from 'react';
import { X, Plus, Building2, User as UserIcon, Tag, DollarSign } from 'lucide-react';
import { Pipeline, Stage, User } from '../../types';
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
  const [tagsInput, setTagsInput] = useState('Лид, WhatsApp');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      // 1. Create company if provided
      let companyId: string | null = null;

      // 2. Create contact if provided
      let contactId: string | null = null;
      if (contactName.trim() || contactPhone.trim()) {
        const contRes = await api.post('/contacts', {
          name: contactName || 'Новый клиент',
          phone: contactPhone,
          phone2: contactPhone2,
          whatsapp: contactPhone,
          telegram: contactTelegram
        });
        contactId = contRes.data.id;
      }

      // 3. Create deal
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const res = await api.post('/deals', {
        title,
        budget: Number(budget) || 0,
        pipelineId,
        stageId: stageId || selectedPipeline?.stages?.[0]?.id || 'stage-default',
        responsibleId,
        contactId,
        tags
      });

      onDealCreated(res.data);
      alert(`✅ Лід "${title}" успішно додано до воронки на етап "${selectedPipeline?.stages?.find(s => s.id === stageId)?.name || 'Нова заявка'}"!`);
      onClose();
    } catch (e) {
      console.error('Failed to create deal:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-[#141b2d]">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-400" />
            <span>Новая сделка</span>
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1 font-semibold">Название сделки *</label>
            <input
              type="text"
              placeholder="Наприклад: Підбір 15 зварювальників для ТОВ Агропром"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">Бюджет (€)</label>
              <input
                type="number"
                placeholder="100000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">Ответственный менеджер</label>
              <select
                value={responsibleId}
                onChange={(e) => setResponsibleId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">Воронка</label>
              <select
                value={pipelineId}
                onChange={(e) => {
                   setPipelineId(e.target.value);
                   const p = pipelines.find(pl => pl.id === e.target.value);
                   if (p && p.stages && p.stages.length > 0) setStageId(p.stages[0].id);
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
              >
                {pipelines.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">Этап</label>
              <select
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
              >
                {(selectedPipeline?.stages || []).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Client Details */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <h3 className="font-semibold text-slate-300">Данные клиента для связи</h3>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Имя контакта"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500"
              />
              <input
                type="text"
                placeholder="Телефон (+380...)"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Додатковий телефон"
                value={contactPhone2}
                onChange={(e) => setContactPhone2(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500"
              />
              <input
                type="text"
                placeholder="Telegram (@username)"
                value={contactTelegram}
                onChange={(e) => setContactTelegram(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 mt-3">
              <input
                type="text"
                placeholder="Теги (через запятую)"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md shadow-blue-600/30"
            >
              Создать сделку
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
