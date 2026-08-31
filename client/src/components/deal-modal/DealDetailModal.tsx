import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  User as UserIcon, 
  Phone, 
  Mail, 
  Send, 
  MessageSquare, 
  CheckCircle2, 
  Plus, 
  Clock, 
  Tag, 
  Trash2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Deal, Pipeline, Stage, User } from '../../types';
import { api, socket } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface DealDetailModalProps {
  dealId: string;
  pipeline: Pipeline;
  onClose: () => void;
  onDealUpdated: (deal: Deal) => void;
  onDealDeleted: (dealId: string) => void;
}

export const DealDetailModal: React.FC<DealDetailModalProps> = ({
  dealId,
  pipeline,
  onClose,
  onDealUpdated,
  onDealDeleted,
}) => {
  const { currentUser, users } = useAuth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'chat' | 'notes' | 'tasks'>('all');
  
  // New Note / Comment input
  const [noteText, setNoteText] = useState('');
  
  // New Chat Message input
  const [chatChannel, setChatChannel] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [chatMessageText, setChatMessageText] = useState('');

  // New Task input
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskText, setTaskText] = useState('');
  const [taskType, setTaskType] = useState('call');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');

  const fetchDealDetails = async () => {
    try {
      const res = await api.get(`/deals/${dealId}`);
      setDeal(res.data);
      setTaskAssigneeId(res.data.responsibleId);
    } catch (e) {
      console.error('Failed to load deal details:', e);
    }
  };

  useEffect(() => {
    fetchDealDetails();

    const handleMessage = (msg: any) => {
      if (msg.dealId === dealId) {
        fetchDealDetails();
      }
    };

    const handleNoteAdded = (note: any) => {
      if (note.dealId === dealId) {
        fetchDealDetails();
      }
    };

    const handleTaskUpdated = () => {
      fetchDealDetails();
    };

    socket.on('new_message', handleMessage);
    socket.on('deal_note_added', handleNoteAdded);
    socket.on('task_created', handleTaskUpdated);
    socket.on('task_updated', handleTaskUpdated);

    return () => {
      socket.off('new_message', handleMessage);
      socket.off('deal_note_added', handleNoteAdded);
      socket.off('task_created', handleTaskUpdated);
      socket.off('task_updated', handleTaskUpdated);
    };
  }, [dealId]);

  if (!deal) return null;

  const handleStageChange = async (newStageId: string) => {
    try {
      const res = await api.put(`/deals/${deal.id}`, { stageId: newStageId });
      setDeal(res.data);
      onDealUpdated(res.data);
    } catch (e) {
      console.error('Failed to change stage:', e);
    }
  };

  const handleResponsibleChange = async (newResponsibleId: string) => {
    try {
      const res = await api.put(`/deals/${deal.id}`, { responsibleId: newResponsibleId });
      setDeal(res.data);
      onDealUpdated(res.data);
    } catch (e) {
      console.error('Failed to change responsible:', e);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    try {
      await api.post(`/deals/${deal.id}/notes`, { content: noteText, type: 'comment' });
      setNoteText('');
      fetchDealDetails();
    } catch (e) {
      console.error('Failed to add note:', e);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessageText.trim()) return;

    const to = chatChannel === 'whatsapp' 
      ? (deal.contact?.whatsapp || deal.contact?.phone || '79990001122')
      : (deal.contact?.telegram || '@client_tg');

    try {
      await api.post('/chat/send', {
        channel: chatChannel,
        to,
        text: chatMessageText,
        dealId: deal.id,
        contactId: deal.contactId
      });
      setChatMessageText('');
      fetchDealDetails();
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskText.trim()) return;
    try {
      await api.post('/tasks', {
        dealId: deal.id,
        responsibleId: taskAssigneeId || currentUser?.id,
        type: taskType,
        text: taskText,
        dueDate: taskDueDate || new Date(Date.now() + 86400000).toISOString()
      });
      setTaskText('');
      setIsAddingTask(false);
      fetchDealDetails();
    } catch (e) {
      console.error('Failed to create task:', e);
    }
  };

  const handleToggleTask = async (taskId: string, isCompleted: boolean) => {
    try {
      await api.put(`/tasks/${taskId}`, { isCompleted: !isCompleted });
      fetchDealDetails();
    } catch (e) {
      console.error('Failed to toggle task:', e);
    }
  };

  const handleDeleteDeal = async () => {
    if (!window.confirm('Вы действительно хотите удалить эту сделку?')) return;
    try {
      await api.delete(`/deals/${deal.id}`);
      onDealDeleted(deal.id);
      onClose();
    } catch (e) {
      alert('Ошибка при удалении: проверьте ваши права доступа (RBAC).');
    }
  };

  const customFieldsObj = deal.customFields ? JSON.parse(deal.customFields) : {};
  const tagsList: string[] = deal.tags ? JSON.parse(deal.tags) : [];

  // Combine timeline items: Notes and Chat Messages sorted by timestamp
  const timelineItems = [
    ...(deal.notes || []).map(n => ({ ...n, itemType: 'note', timestamp: new Date(n.createdAt).getTime() })),
    ...(deal.messages || []).map(m => ({ ...m, itemType: 'message', timestamp: new Date(m.createdAt).getTime() }))
  ].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Bar */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-[#141b2d] flex-shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <h2 className="text-lg font-bold text-white truncate max-w-md">
              {deal.title}
            </h2>
            <span className="text-emerald-400 font-extrabold text-lg px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(deal.budget || 0)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {currentUser?.canDeleteDeals && (
              <button
                onClick={handleDeleteDeal}
                title="Удалить сделку"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pipeline Stage Switcher Bar (amoCRM style progress) */}
        <div className="px-6 py-3 border-b border-slate-800 bg-[#0f1523] flex items-center gap-2 overflow-x-auto">
          {pipeline.stages.map((stage) => {
            const isCurrent = stage.id === deal.stageId;
            return (
              <button
                key={stage.id}
                onClick={() => handleStageChange(stage.id)}
                className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  isCurrent
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="truncate">{stage.name}</span>
              </button>
            );
          })}
        </div>

        {/* Modal 3-Column Layout */}
        <div className="flex-1 grid grid-cols-12 overflow-hidden">
          
          {/* Left Column: Deal & Client Info (4 Cols) */}
          <div className="col-span-3 border-r border-slate-800/80 p-5 overflow-y-auto space-y-6 bg-[#111827]">
            {/* Responsible manager */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Ответственный менеджер
              </label>
              <select
                value={deal.responsibleId}
                onChange={(e) => handleResponsibleChange(e.target.value)}
                disabled={!currentUser?.canEditDeals}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.department})
                  </option>
                ))}
              </select>
            </div>

            {/* Contact Person */}
            <div className="space-y-3">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Контактное лицо
              </label>
              {deal.contact ? (
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="font-semibold text-sm text-white flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-blue-400" />
                    <span>{deal.contact.name}</span>
                  </div>
                  {deal.contact.phone && (
                    <div className="text-xs text-slate-300 flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{deal.contact.phone}</span>
                    </div>
                  )}
                  {deal.contact.telegram && (
                    <div className="text-xs text-slate-300 flex items-center gap-2">
                      <span className="text-sky-400 font-bold text-xs">TG:</span>
                      <span>{deal.contact.telegram}</span>
                    </div>
                  )}
                  {deal.contact.email && (
                    <div className="text-xs text-slate-300 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-amber-400" />
                      <span>{deal.contact.email}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Контакт не привязан</p>
              )}
            </div>

            {/* Company Info */}
            <div className="space-y-3">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Компания
              </label>
              {deal.company ? (
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="font-semibold text-sm text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-purple-400" />
                    <span>{deal.company.name}</span>
                  </div>
                  {deal.company.address && (
                    <div className="text-xs text-slate-400">
                      {deal.company.address}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Компания не указана</p>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Теги
              </label>
              <div className="flex flex-wrap gap-1.5">
                {tagsList.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Custom Fields */}
            {Object.keys(customFieldsObj).length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Дополнительные поля
                </label>
                {Object.entries(customFieldsObj).map(([key, val]) => (
                  <div key={key} className="text-xs flex justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-400">{key}:</span>
                    <span className="text-slate-200 font-medium">{String(val)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Central Column: Live Timeline & Messengers Chat (6 Cols) */}
          <div className="col-span-6 flex flex-col h-full bg-[#0b0f19] border-r border-slate-800/80">
            {/* Timeline Filter tabs */}
            <div className="p-3 border-b border-slate-800/80 flex items-center gap-2 bg-[#0f1523]">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Все события
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'chat' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp / TG Чат</span>
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'notes' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Заметки
              </button>
            </div>

            {/* Timeline Stream */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {timelineItems.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  История событий пока пуста
                </div>
              ) : (
                timelineItems.map((item: any) => {
                  if (item.itemType === 'message') {
                    const isOutgoing = item.direction === 'outgoing';
                    const isWhatsApp = item.channel === 'whatsapp';
                    return (
                      <div
                        key={item.id}
                        className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isWhatsApp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-sky-500/20 text-sky-400'
                          }`}>
                            {isWhatsApp ? 'WhatsApp' : 'Telegram'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {isOutgoing ? 'Менеджер' : (item.senderName || 'Клиент')}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div
                          className={`max-w-md p-3 rounded-2xl text-xs leading-relaxed ${
                            isOutgoing
                              ? 'bg-blue-600 text-white rounded-tr-none'
                              : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-none'
                          }`}
                        >
                          {item.text}
                        </div>
                      </div>
                    );
                  }

                  // Note item
                  return (
                    <div
                      key={item.id}
                      className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="font-semibold text-slate-200">
                          {item.user?.name || 'Система'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(item.createdAt).toLocaleString('ru-RU')}
                        </span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">{item.content}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Reply & Note Bottom Bar */}
            <div className="p-3 border-t border-slate-800/80 bg-[#111827] space-y-3">
              {/* Channel Selector */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setChatChannel('whatsapp')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      chatChannel === 'whatsapp' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatChannel('telegram')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      chatChannel === 'telegram' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <span>Telegram</span>
                  </button>
                </div>
                <span className="text-[11px] text-slate-400">
                  Прямой ответ клиенту в мессенджер
                </span>
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Напишите сообщение в ${chatChannel === 'whatsapp' ? 'WhatsApp' : 'Telegram'}...`}
                  value={chatMessageText}
                  onChange={(e) => setChatMessageText(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Отправить</span>
                </button>
              </form>

              {/* Note Input */}
              <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Добавить внутренний комментарий / заметку к сделке..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="flex-1 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Заметка
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Tasks Checklist (3 Cols) */}
          <div className="col-span-3 p-5 overflow-y-auto space-y-4 bg-[#111827]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Задачи по сделке</span>
              </h3>
              <button
                onClick={() => setIsAddingTask(true)}
                className="p-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-xs font-bold transition flex items-center gap-1 px-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Задача</span>
              </button>
            </div>

            {/* Task Add Form */}
            {isAddingTask && (
              <form onSubmit={handleCreateTask} className="bg-slate-900 border border-slate-700 rounded-xl p-3 space-y-3">
                <input
                  type="text"
                  placeholder="Что нужно сделать?"
                  value={taskText}
                  onChange={(e) => setTaskText(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  >
                    <option value="call">Звонок</option>
                    <option value="meeting">Встреча</option>
                    <option value="email">КП / Письмо</option>
                    <option value="invoice">Оплата</option>
                  </select>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingTask(false)}
                    className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold"
                  >
                    Поставить
                  </button>
                </div>
              </form>
            )}

            {/* Tasks List */}
            <div className="space-y-2.5">
              {deal.tasks && deal.tasks.length > 0 ? (
                deal.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 rounded-xl border transition ${
                      task.isCompleted
                        ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <button
                        onClick={() => handleToggleTask(task.id, task.isCompleted)}
                        className="mt-0.5"
                      >
                        <CheckCircle2
                          className={`w-4 h-4 transition ${
                            task.isCompleted ? 'text-emerald-400' : 'text-slate-600 hover:text-emerald-400'
                          }`}
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-snug ${task.isCompleted ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                          {task.text}
                        </p>
                        <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                          <span>{new Date(task.dueDate).toLocaleDateString('ru-RU')}</span>
                          <span className="text-blue-400">{task.responsible?.name}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>По сделке нет активных задач! Поставьте задачу менеджеру.</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
