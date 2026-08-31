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
  AlertCircle,
  FileText,
  Sparkles,
  Calculator,
  Globe2,
  HelpCircle,
  Users,
  Video,
  ExternalLink
} from 'lucide-react';
import { Deal, Pipeline, Stage, User } from '../../types';
import { api, socket } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { KPGeneratorModal } from '../recruiting/KPGeneratorModal';
import { ObjectionsCheatSheetModal } from '../recruiting/ObjectionsCheatSheetModal';
import { RecruitingCalculatorModal } from '../recruiting/RecruitingCalculatorModal';
import { CallModal } from '../telephony/CallModal';
import { MediaViewerModal } from '../media/MediaViewerModal';
import { startSpeechToText } from '../../utils/speechRecognition';

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
  const [activeTab, setActiveTab] = useState<'all' | 'chat' | 'candidates' | 'notes' | 'tasks'>('all');
  
  // Modals state
  const [isKPModalOpen, setIsKPModalOpen] = useState(false);
  const [isObjectionsModalOpen, setIsObjectionsModalOpen] = useState(false);
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<{ url: string; type: 'image' | 'pdf' | 'video' | 'document'; title?: string } | null>(null);

  // Speech Recognition / Voice Dictation state
  const [isDictating, setIsDictating] = useState(false);
  const recognitionRef = useRef<any>(null);

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

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || chatMessageText;
    if (!text.trim()) return;

    const to = chatChannel === 'whatsapp' 
      ? (deal.contact?.whatsapp || deal.contact?.phone || '+380734277174')
      : (deal.contact?.telegram || '@client_tg');

    try {
      await api.post('/chat/send', {
        channel: chatChannel,
        to,
        text,
        dealId: deal.id,
        contactId: deal.contactId
      });
      setChatMessageText('');
      fetchDealDetails();
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  };

  const toggleVoiceDictation = () => {
    if (isDictating) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsDictating(false);
    } else {
      setIsDictating(true);
      const instance = startSpeechToText({
        language: 'uk-UA',
        onResult: (text) => {
          if (activeTab === 'notes') {
            setNoteText(text);
          } else {
            setChatMessageText(text);
          }
        },
        onError: (err) => {
          console.warn('Speech recognition error:', err);
          setIsDictating(false);
        },
        onEnd: () => {
          setIsDictating(false);
        }
      });
      recognitionRef.current = instance;
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
    if (!window.confirm('Ви дійсно бажаєте видалити цю угоду?')) return;
    try {
      await api.delete(`/deals/${deal.id}`);
      onDealDeleted(deal.id);
      onClose();
    } catch (e) {
      alert('Помилка при видаленні.');
    }
  };

  const customFieldsObj: Record<string, string> = deal.customFields ? JSON.parse(deal.customFields) : {};
  const tagsList: string[] = deal.tags ? JSON.parse(deal.tags) : [];

  const timelineItems = [
    ...(deal.notes || []).map(n => ({ ...n, itemType: 'note', timestamp: new Date(n.createdAt).getTime() })),
    ...(deal.messages || []).map(m => ({ ...m, itemType: 'message', timestamp: new Date(m.createdAt).getTime() }))
  ].sort((a, b) => b.timestamp - a.timestamp);

  // Sample assigned candidates for this deal
  const assignedCandidates = [
    { id: 'cand-1', name: 'Бахром Юлдашев', country: 'Узбекистан', profession: 'Оператор автоматичної лінії / Склад', status: 'Віза D готова' },
    { id: 'cand-2', name: 'Раджеш Кумар', country: 'Індія', profession: 'Зварювальник MIG/MAG', status: 'Дозвіл видано' },
    { id: 'cand-3', name: 'Алішер Карімов', country: 'Узбекистан', profession: 'Пакувальник / Комплектувальник', status: 'Вийшов на зміну' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none font-['Inter',sans-serif]">
      <div className="bg-[#0e1422] border border-slate-700/80 rounded-3xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Bar */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-[#131929] flex-shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <h2 className="text-lg font-bold text-white truncate max-w-md">
              {deal.title}
            </h2>
            <span className="text-emerald-400 font-extrabold text-base px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              €{new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(deal.budget || 0)}
            </span>
          </div>

          {/* Quick Action Tools: Call, AI, KP, Calc */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCallModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Зателефонувати</span>
            </button>

            <button
              onClick={() => setIsCalcModalOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Калькулятор</span>
            </button>

            <button
              onClick={() => setIsKPModalOpen(true)}
              className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Сформувати КП</span>
            </button>

            <button
              onClick={() => setIsObjectionsModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Скрипти</span>
            </button>

            {currentUser?.canDeleteDeals && (
              <button
                onClick={handleDeleteDeal}
                title="Видалити угоду"
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

        {/* Pipeline Stage Switcher Bar */}
        <div className="px-6 py-2.5 border-b border-slate-800 bg-[#0a0f1d] flex items-center gap-2 overflow-x-auto">
          {pipeline.stages.map((stage) => {
            const isCurrent = stage.id === deal.stageId;
            return (
              <button
                key={stage.id}
                onClick={() => handleStageChange(stage.id)}
                className={`flex-1 min-w-[110px] py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
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

        {/* 3-Column Content Layout */}
        <div className="flex-1 grid grid-cols-12 overflow-hidden">
          
          {/* Left Column: Client & Project Params (3 Cols) */}
          <div className="col-span-3 border-r border-slate-800/80 p-5 overflow-y-auto space-y-5 bg-[#0e1422] text-xs">
            {/* Responsible manager */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Відповідальний менеджер
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

            {/* Contact Details */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Контакт клієнта (HR / Директор)
              </label>
              {deal.contact ? (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                  <div className="font-bold text-sm text-white flex items-center gap-2">
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
                <p className="text-xs text-slate-500 italic">Контакт не вказано</p>
              )}
            </div>

            {/* Company Info */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Підприємство / Завод
              </label>
              {deal.company ? (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-1.5">
                  <div className="font-bold text-sm text-white flex items-center gap-2">
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
                <p className="text-xs text-slate-500 italic">Підприємство не вказано</p>
              )}
            </div>

            {/* 4-Stage Payment Status */}
            <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                Графік оплати (4х25%):
              </span>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between items-center text-slate-300">
                  <span>1. Договір (25%):</span>
                  <span className="text-emerald-400 font-bold">Оплачено</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>2. Інтерв'ю (25%):</span>
                  <span className="text-blue-400 font-bold">Очікується</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>3. Віза D (25%):</span>
                  <span>Очікується</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>4. Вихід на завод (25%):</span>
                  <span>Очікується</span>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Теги угоди
              </label>
              <div className="flex flex-wrap gap-1.5">
                {tagsList.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Central Column: Live Timeline & Messengers Chat (6 Cols) */}
          <div className="col-span-6 flex flex-col h-full bg-[#080c14] border-r border-slate-800/80">
            {/* Timeline Filter tabs */}
            <div className="p-3 border-b border-slate-800/80 flex items-center justify-between bg-[#0e1320]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    activeTab === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Всі події
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                    activeTab === 'chat' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Чат (WA / TG)</span>
                </button>
                <button
                  onClick={() => setActiveTab('candidates')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                    activeTab === 'candidates' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  <span>Кандидати ({assignedCandidates.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    activeTab === 'notes' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Замітки
                </button>
              </div>

              {/* Quick AI Objection Hint */}
              <button
                onClick={() => setIsObjectionsModalOpen(true)}
                className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Скрипти</span>
              </button>
            </div>

            {/* Content Area based on Tab */}
            {activeTab === 'candidates' ? (
              /* Attached Candidates List */
              <div className="flex-1 p-5 overflow-y-auto space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h4 className="font-bold text-sm text-white">Відібрані кандидати для підприємства</h4>
                  <button
                    onClick={() => alert('Форма прикріплення кандидата з бази')}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    + Додати кандидата
                  </button>
                </div>

                <div className="space-y-2.5">
                  {assignedCandidates.map(c => (
                    <div key={c.id} className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-xs">{c.name}</div>
                        <div className="text-[11px] text-slate-400">{c.profession} • <span className="text-blue-400">{c.country}</span></div>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Timeline Stream */
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {timelineItems.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    Історія подій поки порожня
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
                              {isOutgoing ? 'Менеджер' : (item.senderName || 'Клієнт')}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div
                            className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
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

                    return (
                      <div
                        key={item.id}
                        className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="font-semibold text-slate-200">
                            {item.user?.name || 'Система'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(item.createdAt).toLocaleString('uk-UA')}
                          </span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">{item.content}</p>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Input / Message Bar */}
            <div className="p-3.5 border-t border-slate-800/80 bg-[#0e1422] space-y-2.5">
              {activeTab === 'notes' ? (
                /* Dedicated Voice Dictation & Note Box */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Нова замітка по угоді</span>
                    </span>

                    <button
                      type="button"
                      onClick={toggleVoiceDictation}
                      className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                        isDictating 
                          ? 'bg-rose-600 text-white animate-pulse' 
                          : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>{isDictating ? 'Слухаю голос...' : '🎙️ Надиктувати голосом'}</span>
                    </button>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); handleAddNote(); }} className="flex gap-2">
                    <textarea
                      rows={2}
                      placeholder="Надиктуйте голосом або напишіть замітку..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className={`flex-1 bg-slate-900 border rounded-2xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition ${
                        isDictating ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-700 focus:border-amber-500'
                      }`}
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 self-end"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Зберегти</span>
                    </button>
                  </form>
                </div>
              ) : (
                /* Regular Chat Bar with Voice Dictation Trigger */
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setChatChannel('whatsapp')}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                          chatChannel === 'whatsapp' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => setChatChannel('telegram')}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                          chatChannel === 'telegram' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Telegram
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={toggleVoiceDictation}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition ${
                        isDictating 
                          ? 'bg-rose-600 text-white animate-pulse' 
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      <Mic className="w-3 h-3 text-emerald-400" />
                      <span>{isDictating ? 'Запис...' : 'Голосове введення'}</span>
                    </button>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`Напишіть повідомлення клієнту в ${chatChannel === 'whatsapp' ? 'WhatsApp' : 'Telegram'}...`}
                      value={chatMessageText}
                      onChange={(e) => setChatMessageText(e.target.value)}
                      className={`flex-1 bg-slate-900 border rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition ${
                        isDictating ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-700 focus:border-blue-500'
                      }`}
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-blue-600/30"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Надіслати</span>
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Tasks Checklist (3 Cols) */}
          <div className="col-span-3 p-5 overflow-y-auto space-y-4 bg-[#0e1422]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Завдання по клієнту</span>
              </h3>
              <button
                onClick={() => setIsAddingTask(true)}
                className="p-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl text-xs font-bold transition flex items-center gap-1 px-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Завдання</span>
              </button>
            </div>

            {/* Task Add Form */}
            {isAddingTask && (
              <form onSubmit={handleCreateTask} className="bg-slate-900 border border-slate-700 rounded-2xl p-3.5 space-y-3">
                <input
                  type="text"
                  placeholder="Що потрібно зробити?"
                  value={taskText}
                  onChange={(e) => setTaskText(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none"
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-xl p-1.5 text-xs text-white"
                  >
                    <option value="call">Дзвінок</option>
                    <option value="meeting">Зустріч</option>
                    <option value="email">Відправка КП</option>
                    <option value="invoice">Оплата (25%)</option>
                  </select>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-xl p-1.5 text-xs text-white"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingTask(false)}
                    className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-blue-600 text-white rounded-xl text-xs font-bold"
                  >
                    Поставити
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
                    className={`p-3.5 rounded-2xl border transition ${
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
                          <span>{new Date(task.dueDate).toLocaleDateString('uk-UA')}</span>
                          <span className="text-blue-400">{task.responsible?.name}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>По клієнту немає активних завдань! Поставте завдання менеджеру.</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* KP Modal */}
      {isKPModalOpen && (
        <KPGeneratorModal
          deal={deal}
          onClose={() => setIsKPModalOpen(false)}
          onSendToWhatsApp={(text) => handleSendMessage(text)}
        />
      )}

      {/* Objections Modal */}
      {isObjectionsModalOpen && (
        <ObjectionsCheatSheetModal
          onClose={() => setIsObjectionsModalOpen(false)}
          onSendToChat={(text) => setChatMessageText(text)}
        />
      )}

      {/* Calculator Modal */}
      {isCalcModalOpen && (
        <RecruitingCalculatorModal
          onClose={() => setIsCalcModalOpen(false)}
          onApplyToDeal={async (calc) => {
            try {
              const res = await api.put(`/deals/${deal.id}`, {
                budget: calc.budget,
                customFields: JSON.stringify({
                  'Кількість працівників': `${calc.headcount} осіб`,
                  'Профіль': calc.profileType === 'russian' ? 'Центральна Азія' : 'Індія / Азія',
                  'Країна': calc.country,
                  'Етапний платіж (25%)': `€${calc.milestonePayment}`
                })
              });
              setDeal(res.data);
              onDealUpdated(res.data);
            } catch (e) {}
          }}
        />
      )}

      {/* Direct In-App Calling Modal */}
      {isCallModalOpen && (
        <CallModal
          dealId={deal.id}
          contactName={deal.contact?.name || deal.title}
          phoneNumber={deal.contact?.phone || deal.contact?.whatsapp || '+380734277174'}
          companyName={deal.company?.name}
          callType="whatsapp"
          onClose={() => setIsCallModalOpen(false)}
        />
      )}

      {/* In-App Media & Document Viewer Lightbox */}
      {viewingMedia && (
        <MediaViewerModal
          mediaUrl={viewingMedia.url}
          mediaType={viewingMedia.type}
          title={viewingMedia.title}
          onClose={() => setViewingMedia(null)}
        />
      )}
    </div>
  );
};
