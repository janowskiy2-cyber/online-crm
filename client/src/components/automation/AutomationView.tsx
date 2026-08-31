import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Plus, 
  Trash2, 
  MessageSquare, 
  CheckSquare, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { api } from '../../services/api';
import { Pipeline } from '../../types';

interface AutomationViewProps {
  pipelines: Pipeline[];
}

export const AutomationView: React.FC<AutomationViewProps> = ({ pipelines }) => {
  const [rules, setRules] = useState<any[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState(pipelines[0]?.id || '');
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [triggerType, setTriggerType] = useState('on_stage_enter');
  const [stageId, setStageId] = useState('');
  const [actionType, setActionType] = useState('send_whatsapp');
  const [templateText, setTemplateText] = useState('Здравствуйте, {client_name}! Ваша заявка в работе.');
  const [taskText, setTaskText] = useState('Связаться с клиентом');

  const fetchRules = async () => {
    try {
      const res = await api.get('/automation');
      setRules(res.data);
    } catch (e) {
      console.error('Failed to load rules:', e);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const activePipeline = pipelines.find(p => p.id === selectedPipelineId) || pipelines[0];

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let actionData: any = {};
      if (actionType === 'send_whatsapp' || actionType === 'send_telegram') {
        actionData = { template: templateText };
      } else if (actionType === 'create_task') {
        actionData = { taskText, taskType: 'call', dueHours: 24 };
      }

      await api.post('/automation', {
        pipelineId: selectedPipelineId,
        stageId: stageId || activePipeline?.stages[0]?.id,
        triggerType,
        actionType,
        actionData
      });

      setIsCreating(false);
      fetchRules();
    } catch (e) {
      console.error('Failed to create rule:', e);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await api.delete(`/automation/${id}`);
      fetchRules();
    } catch (e) {
      console.error('Failed to delete rule:', e);
    }
  };

  const pipelineRules = rules.filter(r => r.pipelineId === selectedPipelineId);

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0b0f19]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <Zap className="w-7 h-7 text-amber-400" />
              <span>Digital Pipeline — Автоворонка</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Автоматические действия (отправка WhatsApp/Telegram, постановка задач) при переходах сделок
            </p>
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-md shadow-blue-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить автодействие</span>
          </button>
        </div>

        {/* Pipeline Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-semibold">Воронка:</label>
          <select
            value={selectedPipelineId}
            onChange={(e) => setSelectedPipelineId(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
          >
            {pipelines.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Create Rule Modal / Form */}
        {isCreating && (
          <form onSubmit={handleCreateRule} className="bg-[#111827] border border-blue-500/50 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-sm text-white">Создание нового автоматического действия</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">Событие-триггер</label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white"
                >
                  <option value="on_stage_enter">При переходе на этап</option>
                  <option value="on_deal_created">При создании сделки</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">Этап воронки</label>
                <select
                  value={stageId}
                  onChange={(e) => setStageId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white"
                >
                  {activePipeline?.stages.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">Действие</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white"
                >
                  <option value="send_whatsapp">Отправить WhatsApp сообщение</option>
                  <option value="send_telegram">Отправить Telegram сообщение</option>
                  <option value="create_task">Поставить автоматическую задачу</option>
                </select>
              </div>
            </div>

            {actionType === 'send_whatsapp' || actionType === 'send_telegram' ? (
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">
                  Шаблон сообщения (доступны переменные: {'{client_name}'}, {'{deal_title}'}, {'{manager_name}'})
                </label>
                <textarea
                  value={templateText}
                  onChange={(e) => setTemplateText(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none"
                />
              </div>
            ) : (
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">Текст задачи</label>
                <input
                  type="text"
                  value={taskText}
                  onChange={(e) => setTaskText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
              >
                Сохранить правило
              </button>
            </div>
          </form>
        )}

        {/* Existing Rules List */}
        <div className="space-y-3">
          {pipelineRules.map((rule) => {
            const config = JSON.parse(rule.actionData || '{}');
            const targetStage = activePipeline?.stages.find(s => s.id === rule.stageId);
            const isWA = rule.actionType === 'send_whatsapp';
            const isTG = rule.actionType === 'send_telegram';
            const isTask = rule.actionType === 'create_task';

            return (
              <div
                key={rule.id}
                className="bg-[#111827] border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isWA ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    isTG ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' :
                    'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {isWA || isTG ? <MessageSquare className="w-5 h-5" /> : <CheckSquare className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-white">
                        {rule.triggerType === 'on_stage_enter' ? 'При входе на этап' : 'При создании'}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                        {targetStage?.name || 'Любой этап'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400">
                      {isWA && `WhatsApp: "${config.template || ''}"`}
                      {isTG && `Telegram: "${config.template || ''}"`}
                      {isTask && `Автозадача: "${config.taskText || ''}"`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
