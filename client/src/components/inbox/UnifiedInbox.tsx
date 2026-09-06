import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Search, 
  Send, 
  Phone, 
  User as UserIcon, 
  Building2, 
  CheckCheck, 
  Clock, 
  QrCode, 
  Sparkles, 
  ExternalLink, 
  RefreshCw, 
  DollarSign, 
  CheckCircle2, 
  Calendar, 
  ChevronRight, 
  FileText,
  Paperclip,
  X,
  ArrowLeft,
  Mic,
  Image as ImageIcon,
  Play,
  Volume2,
  VolumeX,
  Video,
  Maximize2,
  Eye,
  Bot,
  Copy,
  Check,
  Plus,
  Save,
  Edit3,
  CheckSquare,
  Square,
  ChevronDown,
  Trash2,
  AlertCircle,
  Briefcase
} from 'lucide-react';
import { api, socket } from '../../services/api';
import { soundService } from '../../services/sound.service';
import { ChatMessage, Deal, Pipeline, Company, Task } from '../../types';
import { DealDetailModal } from '../deal-modal/DealDetailModal';
import { MediaViewerModal } from '../media/MediaViewerModal';
import { AudioMessagePlayer } from '../media/AudioMessagePlayer';
import { VoiceRecorder } from '../media/VoiceRecorder';
import { CallModal } from '../telephony/CallModal';
import { SlashCommandsPopup } from '../chat/SlashCommandsPopup';
import { CannedResponse } from '../../constants/cannedResponses';

interface UnifiedInboxProps {
  onOpenDeal: (dealId: string) => void;
  openQRModal: (channel?: 'whatsapp' | 'telegram') => void;
}

export const UnifiedInbox: React.FC<UnifiedInboxProps> = ({
  onOpenDeal,
  openQRModal
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedChatKey, setSelectedChatKey] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [search, setSearch] = useState('');
  const [filterChannel, setFilterChannel] = useState<'all' | 'whatsapp' | 'telegram'>('all');
  
  // Voice Recording & Telephony & Media View state
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<{ url: string; type: 'image' | 'pdf' | 'video' | 'document'; title?: string } | null>(null);
  const [activeCall, setActiveCall] = useState<{ name: string; phone: string; type: 'whatsapp' | 'telegram' | 'gsm' } | null>(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<{ name: string; base64: string; type: string } | null>(null);
  const [isSendingFile, setIsSendingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-expand textarea proportionally to typed/generated text
  useEffect(() => {
    if (replyTextareaRef.current) {
      replyTextareaRef.current.style.height = 'auto';
      const scrollHeight = replyTextareaRef.current.scrollHeight;
      replyTextareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 40), 220)}px`;
    }
  }, [replyText]);

  // Active deal connected to selected chat
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isDealPanelOpen, setIsDealPanelOpen] = useState(true);
  const [modalDealId, setModalDealId] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<'details' | 'notes' | 'tasks' | 'payment'>('details');

  // Inline deal editing state
  const [editTitle, setEditTitle] = useState('');
  const [editBudget, setEditBudget] = useState<number | string>('');
  const [editContactName, setEditContactName] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');
  const [editContactEmail, setEditContactEmail] = useState('');
  const [editCompanyId, setEditCompanyId] = useState('');
  const [isSavingDeal, setIsSavingDeal] = useState(false);
  const [saveDealSuccess, setSaveDealSuccess] = useState(false);

  // Prospect employer requisition state (before official catalog promotion upon payment)
  const [editEmployerName, setEditEmployerName] = useState('');
  const [editEmployerIndustry, setEditEmployerIndustry] = useState('');
  const [editEmployerHeadcount, setEditEmployerHeadcount] = useState('');
  const [editEmployerPositions, setEditEmployerPositions] = useState('');
  const [editEmployerLocation, setEditEmployerLocation] = useState('');
  const [editEmployerSalary, setEditEmployerSalary] = useState('');
  const [isPromotingCompany, setIsPromotingCompany] = useState(false);
  const [companyPromoteSuccess, setCompanyPromoteSuccess] = useState<string | null>(null);

  // Quick notes state
  const [dealNoteInput, setDealNoteInput] = useState('');
  const [isAddingDealNote, setIsAddingDealNote] = useState(false);

  // Quick tasks state
  const [dealTaskInput, setDealTaskInput] = useState('');
  const [isAddingDealTask, setIsAddingDealTask] = useState(false);

  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isCreatingDeal, setIsCreatingDeal] = useState(false);

  // Slash commands state
  const [slashFilter, setSlashFilter] = useState<string | null>(null);

  // Anti-Collision Presence (active viewers in currently opened dialog)
  const [activeViewers, setActiveViewers] = useState<string[]>([]);

  // Sound notification state
  const [soundEnabled, setSoundEnabled] = useState(soundService.isEnabled());

  // Message copying state
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const handleCopyMessage = (id: string, text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // AI Copilot state & actions
  const [isGeneratingAiDraft, setIsGeneratingAiDraft] = useState(false);

  const handleGenerateAiDraft = async (intent: 'followup' | 'kp_offer' | 'meeting' | 'polite_reminder' = 'followup') => {
    if (!activeDialog) return;
    setIsGeneratingAiDraft(true);
    try {
      const res = await api.post('/ai/draft-reply', {
        clientName: activeDialog.senderName,
        stageName: activeDeal?.stage?.name || 'Переговори',
        dealTitle: activeDeal?.title || `Діалог з ${activeDialog.senderName}`,
        lastMessage: activeDialog.lastMessage?.text || '',
        intent
      });
      if (res.data?.draft) {
        setReplyText(res.data.draft);
        setIsInternalNote(false);
      }
    } catch (e) {
      console.warn('AI draft error:', e);
    } finally {
      setIsGeneratingAiDraft(false);
    }
  };

  const handleGenerateAiObjection = async () => {
    if (!activeDialog) return;
    setIsGeneratingAiDraft(true);
    try {
      const objectionText = activeDialog.lastMessage?.text || 'Дорого і не зрозуміло';
      const res = await api.post('/ai/objection', { objectionText });
      if (res.data?.answer) {
        setReplyText(res.data.answer);
        setIsInternalNote(false);
      }
    } catch (e) {
      console.warn('AI objection error:', e);
    } finally {
      setIsGeneratingAiDraft(false);
    }
  };

  const handleGenerateAiSummary = async () => {
    if (!activeDialog) return;
    setIsGeneratingAiDraft(true);
    try {
      const res = await api.post('/ai/draft-reply', {
        clientName: activeDialog.senderName,
        dealTitle: activeDeal?.title,
        lastMessage: activeDialog.lastMessage?.text || '',
        intent: 'polite_reminder'
      });
      const summaryNote = `📋 [ШІ-Резюме]: Останнє звернення від ${activeDialog.senderName}: "${activeDialog.lastMessage?.text || 'Запит'}". Рекомендований наступний крок: узгодити специфікацію та терміни.`;
      setReplyText(summaryNote);
      setIsInternalNote(true);
    } catch (e) {
      console.warn('AI summary error:', e);
    } finally {
      setIsGeneratingAiDraft(false);
    }
  };

  useEffect(() => {
    const handleSoundChange = (e: any) => {
      setSoundEnabled(e.detail?.enabled ?? soundService.isEnabled());
    };
    window.addEventListener('crm_sound_changed', handleSoundChange);
    return () => window.removeEventListener('crm_sound_changed', handleSoundChange);
  }, []);

  const fetchPipelines = async () => {
    try {
      const res = await api.get('/pipelines');
      if (res.data) setPipelines(res.data);
    } catch (e) {}
  };

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/contacts/companies/all');
      if (res.data && Array.isArray(res.data)) {
        setCompanies(res.data);
      }
    } catch (e) {}
  };

  const fetchMessages = async () => {
    try {
      const res = await api.get('/chat/messages');
      if (res.data && Array.isArray(res.data)) {
        setMessages(res.data);
      }
    } catch (e) {
      console.warn('Inbox fetch:', e);
    }
  };

  // Real-time WhatsApp read status synchronization (Blue ticks ack)
  useEffect(() => {
    const handleStatusUpdate = ({ externalMsgId, status }: { externalMsgId: string; status: string }) => {
      setMessages(prev => prev.map(m => {
        if ((m as any).externalId === externalMsgId || m.id === externalMsgId) {
          return { ...m, status: status as any };
        }
        return m;
      }));
    };

    socket.on('message_status_updated', handleStatusUpdate);
    return () => {
      socket.off('message_status_updated', handleStatusUpdate);
    };
  }, []);

  // Real-time Dialog Collision Detection (joins dialog room and tracks viewers)
  useEffect(() => {
    if (!selectedChatKey) {
      setActiveViewers([]);
      return;
    }
    const currentUserName = typeof localStorage !== 'undefined' ? localStorage.getItem('crm_user_name') || 'Менеджер' : 'Менеджер';
    socket.emit('dialog_join', { dialogKey: selectedChatKey, userName: currentUserName });

    const handleViewers = ({ dialogKey, viewers }: { dialogKey: string; viewers: string[] }) => {
      if (dialogKey === selectedChatKey) {
        setActiveViewers(viewers);
      }
    };

    socket.on('dialog_viewers', handleViewers);

    return () => {
      socket.emit('dialog_leave', { dialogKey: selectedChatKey });
      socket.off('dialog_viewers', handleViewers);
    };
  }, [selectedChatKey]);

  useEffect(() => {
    fetchMessages();
    fetchPipelines();
    fetchCompanies();

    // High performance: 30s background poll, instant visibility refresh, WebSockets for 0-delay new messages
    const interval = setInterval(fetchMessages, 30000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchMessages();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    const handleNewMessage = (msg: ChatMessage) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        if (!msg.isFromUser && msg.type !== 'system') {
          soundService.playIncoming();
        }
        return [...prev, msg];
      });
    };

    socket.on('new_message', handleNewMessage);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      socket.off('new_message', handleNewMessage);
    };
  }, []);

  const dialogsMap = new Map<string, {
    key: string;
    senderName: string;
    channel: 'whatsapp' | 'telegram';
    phoneOrId: string;
    lastMessage: ChatMessage;
    messages: ChatMessage[];
    dealId?: string;
  }>();

  messages.forEach(msg => {
    const key = msg.senderPhone || msg.senderTgId || (msg.dealId ? `deal_${msg.dealId}` : msg.id);
    if (!dialogsMap.has(key)) {
      dialogsMap.set(key, {
        key,
        senderName: msg.senderName || (msg.channel === 'whatsapp' ? `WhatsApp (+${msg.senderPhone})` : `Telegram (${msg.senderTgId})`),
        channel: msg.channel,
        phoneOrId: msg.senderPhone || msg.senderTgId || '',
        lastMessage: msg,
        messages: [msg],
        dealId: msg.dealId
      });
    } else {
      const d = dialogsMap.get(key)!;
      d.messages.push(msg);
      d.lastMessage = msg;
      if (!d.dealId && msg.dealId) {
        d.dealId = msg.dealId;
      }
    }
  });

  const dialogs = Array.from(dialogsMap.values()).sort((a, b) => 
    new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
  );

  const filteredDialogs = dialogs.filter(d => {
    if (filterChannel !== 'all' && d.channel !== filterChannel) return false;
    if (search && !d.senderName.toLowerCase().includes(search.toLowerCase()) && !d.lastMessage.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeDialog = dialogs.find(d => d.key === selectedChatKey) || (typeof window !== 'undefined' && window.innerWidth > 768 ? filteredDialogs[0] : null);

  const currentPipeline = pipelines.find(p => p.id === activeDeal?.pipelineId) || pipelines[0];

  // Smart Deal Loader: loads deal by dealId or automatically by phone match in database
  useEffect(() => {
    let isCancelled = false;
    const loadDealForDialog = async () => {
      if (!activeDialog) {
        setActiveDeal(null);
        return;
      }

      if (activeDialog.dealId) {
        try {
          const res = await api.get(`/deals/${activeDialog.dealId}`);
          if (!isCancelled && res.data) {
            setActiveDeal(res.data);
            return;
          }
        } catch (e) {}
      }

      // If no dealId on message, check by clean phone digits in CRM database
      const phoneDigits = activeDialog.phoneOrId?.replace(/\D/g, '');
      if (phoneDigits && phoneDigits.length >= 7) {
        try {
          const res = await api.get(`/deals/check-duplicate?query=${encodeURIComponent(phoneDigits)}`);
          if (!isCancelled && res.data?.duplicates?.length > 0) {
            const matchedDealId = res.data.duplicates[0].id;
            const dealRes = await api.get(`/deals/${matchedDealId}`);
            if (!isCancelled && dealRes.data) {
              setActiveDeal(dealRes.data);
              activeDialog.dealId = matchedDealId;
              return;
            }
          }
        } catch (e) {}
      }

      if (!isCancelled) {
        setActiveDeal(null);
      }
    };

    loadDealForDialog();
    return () => { isCancelled = true; };
  }, [activeDialog?.key, activeDialog?.dealId]);

  // Sync inline edit form whenever activeDeal or activeDialog changes
  useEffect(() => {
    if (activeDeal) {
      setEditTitle(activeDeal.title || '');
      setEditBudget(activeDeal.budget || 0);
      setEditContactName(activeDeal.contact?.name || activeDialog?.senderName || '');
      setEditContactPhone(activeDeal.contact?.phone || activeDialog?.phoneOrId || '');
      setEditContactEmail(activeDeal.contact?.email || '');
      setEditCompanyId(activeDeal.companyId || '');

      let cf: any = {};
      try {
        cf = typeof activeDeal.customFields === 'string' ? JSON.parse(activeDeal.customFields) : (activeDeal.customFields || {});
      } catch (e) { cf = {}; }

      const emp = cf.employerOrder || {};
      setEditEmployerName(emp.companyName || activeDeal.company?.name || '');
      setEditEmployerIndustry(emp.industry || '');
      setEditEmployerHeadcount(emp.headcount || '');
      setEditEmployerPositions(emp.positions || '');
      setEditEmployerLocation(emp.location || activeDeal.company?.address || '');
      setEditEmployerSalary(emp.salary || '');
    } else if (activeDialog) {
      setEditTitle(`Угода: ${activeDialog.senderName}`);
      setEditBudget(1000);
      setEditContactName(activeDialog.senderName);
      setEditContactPhone(activeDialog.phoneOrId);
      setEditContactEmail('');
      setEditCompanyId('');
      setEditEmployerName('');
      setEditEmployerIndustry('');
      setEditEmployerHeadcount('');
      setEditEmployerPositions('');
      setEditEmployerLocation('');
      setEditEmployerSalary('');
    }
  }, [activeDeal?.id, activeDialog?.key]);

  const handleStageChange = async (newStageId: string) => {
    if (!activeDeal) return;
    try {
      const res = await api.put(`/deals/${activeDeal.id}`, { stageId: newStageId });
      setActiveDeal(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('Розмір файлу перевищує 50 МБ. Будь ласка, оберіть файл меншого розміру.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      let mime = file.type;
      if (!mime) {
        if (file.name.toLowerCase().endsWith('.mp4')) mime = 'video/mp4';
        else if (file.name.toLowerCase().endsWith('.webm')) mime = 'video/webm';
        else if (file.name.toLowerCase().endsWith('.mov')) mime = 'video/quicktime';
        else if (file.name.toLowerCase().endsWith('.pdf')) mime = 'application/pdf';
        else mime = 'application/octet-stream';
      }

      setSelectedFile({
        name: file.name,
        base64: reader.result as string,
        type: mime
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSendVoiceNote = async (audioBase64: string, durationSec: number) => {
    if (!activeDialog) return;
    setIsVoiceRecording(false);
    try {
      await api.post('/chat/send-file', {
        channel: activeDialog.channel,
        to: activeDialog.phoneOrId,
        fileBase64: audioBase64,
        fileName: `voice_${Date.now()}.ogg`,
        mimeType: 'audio/ogg; codecs=opus',
        caption: `🎤 Голосове повідомлення (${durationSec} сек)`,
        dealId: activeDialog.dealId,
        isVoiceNote: true
      });
      soundService.playOutgoing();
      fetchMessages();
    } catch (e) {
      alert('Помилка відправки голосового повідомлення');
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    if (!activeDialog) return;

    const to = activeDialog.phoneOrId;
    const channel = activeDialog.channel;

    if (selectedFile) {
      setIsSendingFile(true);
      try {
        await api.post('/chat/send-file', {
          channel,
          to,
          fileBase64: selectedFile.base64,
          fileName: selectedFile.name,
          mimeType: selectedFile.type,
          caption: replyText || undefined,
          dealId: activeDialog.dealId
        });
        soundService.playOutgoing();
        setSelectedFile(null);
        setReplyText('');
        fetchMessages();
      } catch (err) {
        alert('Помилка відправки файлу');
      } finally {
        setIsSendingFile(false);
      }
      return;
    }

    const textToSend = customText || replyText;
    if (!textToSend.trim()) return;

    try {
      await api.post('/chat/send', {
        channel: isInternalNote ? 'internal' : channel,
        isInternal: isInternalNote,
        to,
        text: textToSend,
        dealId: activeDialog.dealId
      });
      soundService.playOutgoing();
      setReplyText('');
      fetchMessages();
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.error || 'Помилка надсилання повідомлення');
    }
  };

  const handleCreateDealFromChat = async () => {
    if (!activeDialog) return;
    setIsCreatingDeal(true);
    try {
      const defaultPipeline = pipelines[0];
      const defaultStage = defaultPipeline?.stages?.[0];
      const currentUserId = typeof localStorage !== 'undefined' ? localStorage.getItem('crm_user_id') : 'usr-admin';

      const res = await api.post('/deals', {
        title: `Угода: ${activeDialog.senderName}`,
        pipelineId: defaultPipeline?.id,
        stageId: defaultStage?.id,
        responsibleId: currentUserId || 'usr-admin',
        budget: 1200,
        contactData: {
          name: activeDialog.senderName,
          phone: activeDialog.phoneOrId
        }
      });

      if (res.data?.id) {
        activeDialog.dealId = res.data.id;
        setActiveDeal(res.data);
        setIsDealPanelOpen(true);
        fetchMessages();
      }
    } catch (e) {
      console.error('Failed to create deal from chat:', e);
      alert('Помилка створення угоди з чату');
    } finally {
      setIsCreatingDeal(false);
    }
  };

  const handleSaveDealChanges = async () => {
    if (!activeDeal) return;
    setIsSavingDeal(true);
    try {
      let cf: any = {};
      try {
        cf = typeof activeDeal.customFields === 'string' ? JSON.parse(activeDeal.customFields) : (activeDeal.customFields || {});
      } catch (e) { cf = {}; }

      const updatedCustomFields = {
        ...cf,
        employerOrder: {
          ...(cf.employerOrder || {}),
          companyName: editEmployerName,
          industry: editEmployerIndustry,
          headcount: editEmployerHeadcount,
          positions: editEmployerPositions,
          location: editEmployerLocation,
          salary: editEmployerSalary
        }
      };

      const res = await api.put(`/deals/${activeDeal.id}`, {
        title: editTitle,
        budget: Number(editBudget) || 0,
        companyId: editCompanyId || null,
        customFields: JSON.stringify(updatedCustomFields),
        contactData: {
          name: editContactName,
          phone: editContactPhone,
          email: editContactEmail
        }
      });
      if (res.data) {
        setActiveDeal(res.data);
        setSaveDealSuccess(true);
        setTimeout(() => setSaveDealSuccess(false), 2500);
      }
    } catch (e) {
      alert('Помилка збереження картки угоди');
    } finally {
      setIsSavingDeal(false);
    }
  };

  const handlePromoteToOfficialCompany = async () => {
    if (!activeDeal) return;
    const compName = editEmployerName.trim() || activeDeal.title;
    if (!compName) {
      alert('Будь ласка, вкажіть назву підприємства перед внесенням до бази');
      return;
    }
    setIsPromotingCompany(true);
    try {
      // 1. Create company in official catalog
      const compRes = await api.post('/companies', {
        name: compName,
        address: editEmployerLocation.trim() || undefined,
        phone: editContactPhone.trim() || undefined,
        email: editContactEmail.trim() || undefined,
        notes: `Сфера діяльності: ${editEmployerIndustry || 'Не вказано'}\nПотреба у персоналі: ${editEmployerHeadcount || 'Не вказано'}\nПосади: ${editEmployerPositions || 'Не вказано'}\nСтавка: ${editEmployerSalary || 'Не вказано'}\n(Створено з ліда після підтвердження оплати)`
      });

      const newCompanyId = compRes.data?.id;

      // 2. Link deal to this newly created company
      let cf: any = {};
      try {
        cf = typeof activeDeal.customFields === 'string' ? JSON.parse(activeDeal.customFields) : (activeDeal.customFields || {});
      } catch (e) { cf = {}; }

      const updatedCustomFields = {
        ...cf,
        employerOrder: {
          companyName: compName,
          industry: editEmployerIndustry,
          headcount: editEmployerHeadcount,
          positions: editEmployerPositions,
          location: editEmployerLocation,
          salary: editEmployerSalary,
          isOfficial: true,
          officialCompanyId: newCompanyId
        }
      };

      const dealRes = await api.put(`/deals/${activeDeal.id}`, {
        companyId: newCompanyId,
        customFields: JSON.stringify(updatedCustomFields)
      });

      // 3. Add system note to deal
      await api.post(`/deals/${activeDeal.id}/notes`, {
        content: `💎 Підприємство "${compName}" офіційно внесено до реєстру роботодавців CRM після отримання оплати (Сфера: ${editEmployerIndustry || '-'}, Потреба: ${editEmployerHeadcount || '-'}).`,
        type: 'status_change'
      }).catch(() => {});

      setActiveDeal(dealRes.data);
      setEditCompanyId(newCompanyId);
      setCompanies(prev => [compRes.data, ...prev.filter(c => c.id !== newCompanyId)]);
      setCompanyPromoteSuccess(`Підприємство "${compName}" успішно внесено до офіційного реєстру роботодавців!`);
      setTimeout(() => setCompanyPromoteSuccess(null), 4000);
    } catch (err: any) {
      console.error('Failed to promote company:', err);
      alert(err?.response?.data?.error || 'Помилка створення підприємства в базі');
    } finally {
      setIsPromotingCompany(false);
    }
  };

  const handleAddDealNote = async () => {
    if (!activeDeal || !dealNoteInput.trim()) return;
    setIsAddingDealNote(true);
    try {
      const currentUserId = typeof localStorage !== 'undefined' ? localStorage.getItem('crm_user_id') : 'usr-admin';
      const res = await api.post(`/deals/${activeDeal.id}/notes`, {
        content: dealNoteInput.trim(),
        type: 'comment',
        userId: currentUserId || 'usr-admin'
      });
      if (res.data) {
        setActiveDeal(prev => prev ? {
          ...prev,
          notes: [res.data, ...(prev.notes || [])]
        } : null);
        setDealNoteInput('');
      }
    } catch (e) {
      alert('Помилка додавання замітки');
    } finally {
      setIsAddingDealNote(false);
    }
  };

  const handleAddDealTask = async () => {
    if (!activeDeal || !dealTaskInput.trim()) return;
    setIsAddingDealTask(true);
    try {
      const currentUserId = typeof localStorage !== 'undefined' ? localStorage.getItem('crm_user_id') : 'usr-admin';
      const res = await api.post('/tasks', {
        text: dealTaskInput.trim(),
        dealId: activeDeal.id,
        type: 'call',
        dueDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        responsibleId: currentUserId || 'usr-admin'
      });
      if (res.data) {
        setActiveDeal(prev => prev ? {
          ...prev,
          tasks: [...(prev.tasks || []), res.data]
        } : null);
        setDealTaskInput('');
      }
    } catch (e) {
      alert('Помилка додавання завдання');
    } finally {
      setIsAddingDealTask(false);
    }
  };

  const handleToggleMilestone = async (milestoneId: number) => {
    if (!activeDeal) return;
    let paid: number[] = [];
    try {
      const parsed = typeof activeDeal.customFields === 'string' ? JSON.parse(activeDeal.customFields) : activeDeal.customFields;
      paid = Array.isArray(parsed?.paidMilestones) ? parsed.paidMilestones : [];
    } catch (e) {}

    const nextPaid = paid.includes(milestoneId)
      ? paid.filter(id => id !== milestoneId)
      : [...paid, milestoneId];

    try {
      const parsed = typeof activeDeal.customFields === 'string' ? JSON.parse(activeDeal.customFields || '{}') : (activeDeal.customFields || {});
      const nextCustomFields = { ...parsed, paidMilestones: nextPaid };
      const res = await api.put(`/deals/${activeDeal.id}`, {
        customFields: JSON.stringify(nextCustomFields)
      });
      if (res.data) setActiveDeal(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const quickSnippets = [
    { label: '📄 Розрахунок КП', text: 'Доброго дня! Підготували для вашого підприємства офіційну комерційну пропозицію з прорахунком вартості та графіком 4х25%. Надіслати PDF?' },
    { label: '💳 Схема 4х25%', text: 'Оплата здійснюється безпечно за 4 транші по 25%: 1) Договір ➔ 2) Затвердження кандидатів ➔ 3) Віза D ➔ 4) Фактичний вихід на завод.' },
    { label: '🛡️ Гарантія заміни', text: 'У нас діє 1 місяць повного супроводу координатором та 1 безкоштовна гарантійна заміна у разі необхідності.' }
  ];

  return (
    <div className="flex-1 flex overflow-hidden bitrix-wallpaper bg-[#080c14]/80 font-['Inter',sans-serif] w-full">
      
      {/* Dialogs List (Hidden on mobile if chat is active) */}
      <div className={`
        w-full md:w-80 border-r border-white/10 flex flex-col justify-between bitrix-glass flex-shrink-0
        ${activeDialog ? 'hidden md:flex' : 'flex'}
      `}>
        <div className="p-4 border-b border-white/10 space-y-3 bg-slate-900/40">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>Месенджери (WA / TG)</span>
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSoundEnabled(soundService.toggle())}
                title={soundEnabled ? "Звукові сповіщення увімкнено (натисніть щоб вимкнути)" : "Звукові сповіщення вимкнено (натисніть щоб увімкнути)"}
                className={`p-1.5 rounded-xl border transition ${
                  soundEnabled 
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/40' 
                    : 'bg-slate-800/80 border-slate-700 text-slate-500 hover:text-slate-300'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
              </button>

              <button
                onClick={() => openQRModal()}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                <span>Шлюз</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Пошук діалогів..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex gap-1.5 bg-slate-900 p-1 rounded-xl text-[11px] font-bold">
            <button
              onClick={() => setFilterChannel('all')}
              className={`flex-1 py-1 rounded-lg transition ${filterChannel === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
            >
              Всі
            </button>
            <button
              onClick={() => setFilterChannel('whatsapp')}
              className={`flex-1 py-1 rounded-lg transition ${filterChannel === 'whatsapp' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
            >
              WhatsApp
            </button>
            <button
              onClick={() => setFilterChannel('telegram')}
              className={`flex-1 py-1 rounded-lg transition ${filterChannel === 'telegram' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}
            >
              Telegram
            </button>
          </div>
        </div>

        {/* Dialogs Stream */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
          {filteredDialogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
              <p>Немає активних діалогів.</p>
              <p className="text-[11px] text-slate-400">Надішліть повідомлення на номер WhatsApp/TG, щоб розпочати спілкування.</p>
            </div>
          ) : (
            filteredDialogs.map((d) => {
              const isActive = activeDialog?.key === d.key;
              const isWA = d.channel === 'whatsapp';
              return (
                <div
                  key={d.key}
                  onClick={() => setSelectedChatKey(d.key)}
                  className={`p-3.5 cursor-pointer transition-all duration-150 flex items-start gap-3 relative group ${
                    isActive 
                      ? 'bg-gradient-to-r from-blue-600/20 via-indigo-600/15 to-transparent border-l-4 border-blue-500 shadow-md' 
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xs shadow-md transition-transform group-hover:scale-105 ${
                      isWA 
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-emerald-900/30 border border-emerald-400/30' 
                        : 'bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-sky-900/30 border border-sky-300/30'
                    }`}>
                      {isWA ? 'WA' : 'TG'}
                    </div>
                    {/* Live pulse indicator */}
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-sm" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-bold text-xs text-white truncate group-hover:text-blue-300 transition">
                        {d.senderName}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                        {new Date(d.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase tracking-wider ${
                        isWA ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                      }`}>
                        {isWA ? 'WhatsApp' : 'Telegram'}
                      </span>
                      <p className="text-xs text-slate-400 truncate flex-1">{d.lastMessage.text}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Central Chat Room (Full Width on Mobile when active) */}
      <div className={`
        flex-1 flex-col justify-between overflow-hidden bg-slate-900/40 backdrop-blur-xl border-r border-white/10 w-full
        ${activeDialog ? 'flex' : 'hidden md:flex'}
      `}>
        {activeDialog ? (
          <>
            <div className="border-b border-white/10 bg-slate-900/60 backdrop-blur-md flex-shrink-0">
              <div className="h-14 px-4 sm:px-6 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setSelectedChatKey(null)}
                    className="md:hidden p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-xl mr-1"
                    title="Назад до списку"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="relative flex-shrink-0">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-black text-xs shadow-md ${
                      activeDialog.channel === 'whatsapp' 
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-emerald-900/30 border border-emerald-400/30' 
                        : 'bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-sky-900/30 border border-sky-300/30'
                    }`}>
                      {activeDialog.channel === 'whatsapp' ? 'WA' : 'TG'}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-sm" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-xs sm:text-sm text-white truncate">{activeDialog.senderName}</h3>
                      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>В мережі</span>
                      </span>
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-slate-400 truncate flex items-center gap-1.5 font-mono">
                      <span>{activeDialog.phoneOrId}</span>
                      <span>•</span>
                      <span className="text-slate-500 uppercase">{activeDialog.channel}</span>
                    </div>
                  </div>
                </div>

                {/* Right Action Buttons: Sound, Call & Deal Card */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setSoundEnabled(soundService.toggle())}
                    title={soundEnabled ? "Звукові сповіщення увімкнено (натисніть щоб вимкнути)" : "Звукові сповіщення вимкнено (натисніть щоб увімкнути)"}
                    className={`p-2 rounded-xl border transition flex items-center gap-1.5 text-xs font-semibold ${
                      soundEnabled 
                        ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/40' 
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                  </button>

                  <button
                    onClick={() => setActiveCall({
                      name: activeDialog.senderName,
                      phone: activeDialog.phoneOrId,
                      type: activeDialog.channel === 'whatsapp' ? 'whatsapp' : 'telegram'
                    })}
                    className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                    title="Зателефонувати в 1 клік"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Дзвінок</span>
                  </button>

                  {activeDeal ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsDealPanelOpen(prev => !prev)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm ${
                          isDealPanelOpen 
                            ? 'bg-blue-600 text-white shadow-blue-600/30' 
                            : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30'
                        }`}
                        title={isDealPanelOpen ? "Приховати бічну панель картки" : "Відкрити бічну панель картки клієнта"}
                      >
                        <UserIcon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{isDealPanelOpen ? 'Панель відкрита' : 'Картка клієнта'}</span>
                        <span className="sm:hidden">Панель</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setModalDealId(activeDeal.id)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm active:scale-95"
                        title="Відкрити повну картку клієнта у модальному вікні"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
                        <span className="hidden md:inline">Повна картка ↗</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDealPanelOpen(true);
                        if (!isCreatingDeal) handleCreateDealFromChat();
                      }}
                      disabled={isCreatingDeal}
                      className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-blue-600/30 flex-shrink-0 active:scale-95"
                      title="Створити та відкрити картку угоди для цього контакту"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isCreatingDeal ? 'Створення...' : '+ Створити картку'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Anti-Collision Warning Banner */}
              {activeViewers.length > 1 && (
                <div className="px-4 sm:px-6 py-1.5 bg-amber-500/15 border-t border-amber-500/30 text-amber-300 text-xs flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span className="font-semibold text-[11px]">
                      Увага: у цьому діалозі зараз також колеги ({activeViewers.join(', ')})
                    </span>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-200 font-bold">
                    Запобігання колізіям
                  </span>
                </div>
              )}

              {activeDeal && currentPipeline && (
                <div className="px-4 sm:px-6 py-2 bg-[#0c101c] border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto">
                  <span className="text-[10px] text-slate-500 uppercase font-bold mr-1">Етап:</span>
                  {(currentPipeline?.stages || []).map((stg) => {
                    const isCurrent = activeDeal.stageId === stg.id;
                    return (
                      <button
                        key={stg.id}
                        onClick={() => handleStageChange(stg.id)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition whitespace-nowrap ${
                          isCurrent
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stg.color }} />
                        <span className="truncate max-w-[120px]">{stg.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Chat History Stream */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3.5">
              {activeDialog.messages.map((m) => {
                if (m.channel === 'internal') {
                  return (
                    <div key={m.id} className="w-full flex justify-center my-2 group/msg">
                      <div className="max-w-md w-full bg-amber-950/30 border border-amber-500/40 rounded-2xl p-3 text-xs text-amber-200 space-y-1 shadow-md select-text cursor-text">
                        <div className="flex items-center justify-between text-[10px] text-amber-400">
                          <span className="font-bold flex items-center gap-1">🔒 Внутрішня замітка команди ({m.senderName || 'Команда'})</span>
                          <div className="flex items-center gap-1.5">
                            <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <button
                              type="button"
                              onClick={(e) => handleCopyMessage(m.id, m.text, e)}
                              className="opacity-0 group-hover/msg:opacity-100 p-1 rounded bg-amber-900/40 hover:bg-amber-800 text-amber-300 transition"
                              title={copiedMsgId === m.id ? "Скопійовано!" : "Скопіювати замітку"}
                            >
                              {copiedMsgId === m.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                        <p className="whitespace-pre-line text-amber-100 font-medium select-text">{m.text}</p>
                      </div>
                    </div>
                  );
                }

                const isOut = m.direction === 'outgoing';
                const isFile = m.text.startsWith('📎 Файл') || m.mediaType === 'pdf' || m.mediaType === 'document';
                const isVoice = m.text.startsWith('🎤 Голосове') || m.text.includes('[Голосове') || m.mediaType === 'audio';
                const isImage = m.text.startsWith('📷 [Зображення]') || m.text.endsWith('.jpg') || m.text.endsWith('.png') || m.mediaType === 'image';
                const isVideo = m.mediaType === 'video' || m.text.startsWith('🎥') || m.text.startsWith('📹') || m.mediaUrl?.endsWith('.mp4') || m.mediaUrl?.endsWith('.webm') || m.mediaUrl?.endsWith('.mov') || m.mediaUrl?.includes('/video/');

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col group/msg ${isOut ? 'items-end' : 'items-start'}`}
                  >
                    <div className={`flex items-center gap-1.5 mb-1 text-[10px] ${isOut ? 'justify-end' : 'justify-start'}`}>
                      <span className={`font-semibold ${isOut ? 'text-blue-400' : 'text-slate-300'}`}>
                        {isOut ? 'Менеджер CRM' : (m.senderName || activeDialog.senderName)}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-500 font-mono">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {isVoice ? (
                      <div className="max-w-[85%] sm:max-w-md w-full">
                        <AudioMessagePlayer
                          audioUrl={m.mediaUrl || 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'}
                          duration={12}
                          transcription={m.text.replace('🎤 Голосове повідомлення', '').replace('🎤', '').trim()}
                          isOutgoing={isOut}
                        />
                      </div>
                    ) : isVideo && m.mediaUrl ? (
                      <div className="max-w-xs sm:max-w-sm rounded-2xl overflow-hidden border border-slate-700/80 bg-black shadow-2xl">
                        <video
                          controls
                          preload="metadata"
                          src={m.mediaUrl}
                          className="w-full max-h-64 object-contain bg-black rounded-t-2xl"
                        />
                        <div className="p-2.5 bg-slate-900/95 flex items-center justify-between text-xs text-slate-300 border-t border-slate-800">
                          <div className="flex items-center gap-1.5 truncate">
                            <Video className="w-4 h-4 text-rose-400 flex-shrink-0" />
                            <span className="truncate font-medium">{m.text?.replace(/^🎥\s*/, '') || 'Відео'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setViewingMedia({ url: m.mediaUrl!, type: 'video', title: m.text || 'Відеоповідомлення' })}
                            className="p-1 hover:text-blue-400 text-slate-400 hover:bg-slate-800 rounded-lg transition ml-2 flex-shrink-0"
                            title="Відкрити у вікні перегляду"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : isImage && m.mediaUrl ? (
                      <div
                        onClick={() => setViewingMedia({ url: m.mediaUrl, type: 'image', title: 'Фото' })}
                        className="cursor-pointer max-w-xs rounded-2xl overflow-hidden border border-slate-700/80 shadow-lg hover:opacity-90 transition"
                      >
                        <img src={m.mediaUrl} alt="Зображення" className="w-full object-cover max-h-48" />
                      </div>
                    ) : (
                      <div className={`flex items-center gap-1.5 max-w-[88%] sm:max-w-xl ${isOut ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div
                          onClick={() => {
                            if (isFile && m.mediaUrl) {
                              setViewingMedia({
                                url: m.mediaUrl,
                                type: 'pdf',
                                title: m.text.replace('📎 Файл: ', '').replace('📎 Файл TG: ', '')
                              });
                            }
                          }}
                          className={`p-3.5 rounded-2xl text-xs leading-relaxed select-text cursor-text shadow-lg ${
                            isOut
                              ? 'bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-600 text-white rounded-tr-xs shadow-blue-900/25 border border-blue-400/25'
                              : 'bg-slate-800/90 text-slate-100 backdrop-blur-md border border-white/10 rounded-tl-xs shadow-black/20'
                          } ${isFile ? 'border-2 border-amber-400/50 font-semibold cursor-pointer hover:bg-slate-800 transition flex items-center gap-2' : ''}`}
                        >
                          {isFile && <FileText className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                          <p className="select-text whitespace-pre-wrap">{m.text}</p>
                          <div className={`flex items-center justify-end gap-1 mt-1.5 text-[10px] font-mono ${
                            isOut ? 'text-blue-200/90' : 'text-slate-400'
                          }`}>
                            <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isOut && <CheckCheck className="w-3.5 h-3.5 text-blue-200 ml-0.5" />}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleCopyMessage(m.id, m.text, e)}
                          className="opacity-0 group-hover/msg:opacity-100 p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white transition shadow-sm flex-shrink-0"
                          title={copiedMsgId === m.id ? "Скопійовано!" : "Скопіювати текст повідомлення"}
                        >
                          {copiedMsgId === m.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* File Attachment preview */}
            {selectedFile && (
              <div className="mx-3 sm:mx-4 p-2.5 bg-slate-900 border border-amber-500/40 rounded-2xl flex items-center justify-between text-xs text-amber-300 animate-in fade-in">
                <div className="flex items-center gap-2 truncate">
                  {selectedFile.type.startsWith('video/') ? (
                    <Video className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  ) : (
                    <Paperclip className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  )}
                  <span className="font-semibold truncate">
                    {selectedFile.type.startsWith('video/') ? '🎥 Відео: ' : 'Прикріплено: '}
                    {selectedFile.name}
                  </span>
                </div>
                <button onClick={() => setSelectedFile(null)} className="p-1 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* In-Chat Voice Recorder Bar OR Regular Text/File Form */}
            <div className="p-3 sm:p-3.5 border-t border-white/10 bg-[#0a0f1d]/95 backdrop-blur-2xl space-y-2">
              {isVoiceRecording ? (
                <VoiceRecorder
                  onSendVoice={handleSendVoiceNote}
                  onCancel={() => setIsVoiceRecording(false)}
                />
              ) : (
                <>
                  {/* Mode Selector: Client Message vs Private Team Note (Chatwoot Standard) */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setIsInternalNote(false)}
                        className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 ${
                          !isInternalNote 
                            ? (activeDialog.channel === 'whatsapp' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-sky-600 text-white shadow-sm')
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Клієнту ({activeDialog.channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsInternalNote(true)}
                        className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 ${
                          isInternalNote 
                            ? 'bg-amber-600 text-white shadow-sm' 
                            : 'text-slate-400 hover:text-amber-300'
                        }`}
                      >
                        <span>🔒 Внутрішня замітка</span>
                      </button>
                    </div>

                    <span className="text-[10px] text-slate-500 hidden sm:inline">
                      {isInternalNote ? '⚠️ Клієнт НЕ побачить цей коментар' : 'Повідомлення в месенджер'}
                    </span>
                  </div>

                  {/* AI Copilot Quick Assist Bar (Gemini 2.5 Flash / Flash-Lite Free Tier) */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800/60 pt-1">
                    <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1 px-1.5 py-0.5 bg-indigo-950/50 border border-indigo-500/30 rounded-lg flex-shrink-0">
                      <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
                      <span>ШІ-Копілот:</span>
                    </span>

                    <button
                      type="button"
                      disabled={isGeneratingAiDraft}
                      onClick={() => handleGenerateAiDraft('followup')}
                      className="px-2.5 py-1 bg-gradient-to-r from-indigo-900/40 to-blue-900/40 hover:from-indigo-800/60 hover:to-blue-800/60 text-indigo-200 hover:text-white border border-indigo-500/40 rounded-xl text-[10px] font-bold flex items-center gap-1.5 whitespace-nowrap transition shadow-sm active:scale-95 disabled:opacity-50"
                      title="ШІ згенерує ввічливу та конверсійну відповідь з урахуванням історії діалогу"
                    >
                      <Bot className="w-3 h-3 text-indigo-400" />
                      <span>{isGeneratingAiDraft ? 'Генерація...' : '✨ ШІ-Чернетка'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isGeneratingAiDraft}
                      onClick={() => handleGenerateAiDraft('kp_offer')}
                      className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 border border-slate-700/60 rounded-xl text-[10px] font-medium flex items-center gap-1 whitespace-nowrap transition disabled:opacity-50"
                      title="Запропонувати комерційну пропозицію та розрахунок 4х25%"
                    >
                      <span>📄 Запропонувати КП</span>
                    </button>

                    <button
                      type="button"
                      disabled={isGeneratingAiDraft}
                      onClick={handleGenerateAiObjection}
                      className="px-2.5 py-1 bg-amber-950/40 hover:bg-amber-900/60 text-amber-200 border border-amber-500/40 rounded-xl text-[10px] font-bold flex items-center gap-1 whitespace-nowrap transition active:scale-95 disabled:opacity-50"
                      title="ШІ відпрацює останнє заперечення клієнта (дорого, гарантії, терміни)"
                    >
                      <span>🛡️ ШІ-Заперечення</span>
                    </button>

                    <button
                      type="button"
                      disabled={isGeneratingAiDraft}
                      onClick={handleGenerateAiSummary}
                      className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-amber-200 border border-slate-700/60 rounded-xl text-[10px] font-medium flex items-center gap-1 whitespace-nowrap transition disabled:opacity-50"
                      title="Створити коротке резюме діалогу як внутрішню замітку команди"
                    >
                      <span>📋 ШІ-Підсумок</span>
                    </button>
                  </div>

                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {quickSnippets.map((snip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(undefined, snip.text)}
                        className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 rounded-xl text-[10px] font-semibold flex items-center gap-1 whitespace-nowrap transition"
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>{snip.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    {slashFilter !== null && (
                      <SlashCommandsPopup
                        filterQuery={slashFilter}
                        onSelect={(item) => {
                          const newText = replyText.replace(/(^|\s)(\/[^\s]*)$/, `$1${item.text}`);
                          setReplyText(newText);
                          setSlashFilter(null);
                        }}
                        onClose={() => setSlashFilter(null)}
                      />
                    )}

                    <form onSubmit={(e) => handleSendMessage(e)} className="flex items-end gap-1.5 sm:gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="application/pdf,image/*,video/*,.doc,.docx,.mp4,.mov,.webm"
                      />

                      <input
                        type="file"
                        ref={videoInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="video/*,.mp4,.mov,.webm"
                      />

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        title="Прикріпити файл (PDF / Фото / Договір)"
                        className="p-2 sm:p-2.5 mb-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 border border-slate-700 rounded-2xl transition flex items-center justify-center flex-shrink-0"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        title="Надіслати відео (зустріч кандидата, огляд житла/заводу, візитка)"
                        className="p-2 sm:p-2.5 mb-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-400 border border-slate-700 rounded-2xl transition flex items-center justify-center flex-shrink-0"
                      >
                        <Video className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsVoiceRecording(true)}
                        title="Записати голосове повідомлення"
                        className="p-2 sm:p-2.5 mb-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700 rounded-2xl transition flex items-center justify-center flex-shrink-0"
                      >
                        <Mic className="w-4 h-4" />
                      </button>

                      <textarea
                        ref={replyTextareaRef}
                        rows={1}
                        placeholder={isInternalNote 
                          ? "Напишіть службову замітку для команди (клієнт не побачить)... (Enter — надіслати, Shift+Enter — новий рядок)"
                          : `Написати у ${activeDialog.channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'}... (введіть / для швидких шаблонів, Enter — надіслати, Shift+Enter — новий рядок)`}
                        value={replyText}
                        onChange={(e) => {
                          const val = e.target.value;
                          setReplyText(val);
                          const match = val.match(/(^|\s)(\/[^\s]*)$/);
                          if (match) {
                            setSlashFilter(match[2]);
                          } else {
                            setSlashFilter(null);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        className={`flex-1 bg-slate-900 border rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition resize-none leading-relaxed overflow-y-auto ${
                          isInternalNote 
                            ? 'border-amber-500/60 focus:border-amber-400 ring-1 ring-amber-500/20' 
                            : 'border-slate-700 focus:border-blue-500'
                        }`}
                        style={{ minHeight: '40px', maxHeight: '220px' }}
                      />
                      <button
                        type="submit"
                        disabled={isSendingFile}
                        className={`px-3 sm:px-4 py-2 sm:py-2.5 mb-0.5 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg flex-shrink-0 ${
                          isInternalNote 
                            ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30' 
                            : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                        }`}
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">
                          {isSendingFile ? '...' : (isInternalNote ? 'Зберегти' : 'Надіслати')}
                        </span>
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-500 text-xs">
            Виберіть діалог для перегляду листування
          </div>
        )}
      </div>

      {/* Right In-Messenger Client & Deal Workspace Panel (Collapsible / Full editing) */}
      {activeDialog && isDealPanelOpen && (
        <div className="w-80 sm:w-96 border-l border-white/10 bg-[#0b0f1c]/95 backdrop-blur-2xl flex flex-col justify-between h-full overflow-hidden text-xs flex-shrink-0 z-20 shadow-2xl animate-in slide-in-from-right duration-200">
          {/* Panel Header */}
          <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="truncate">
                <h4 className="font-extrabold text-white text-xs truncate">Картка клієнта</h4>
                <p className="text-[10px] text-slate-400 truncate">{activeDialog.senderName}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {activeDeal && (
                <button
                  type="button"
                  onClick={() => setModalDealId(activeDeal.id)}
                  className="p-1.5 text-slate-400 hover:text-blue-300 hover:bg-slate-800 rounded-lg transition"
                  title="Розгорнути повну картку угоди у вікні"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsDealPanelOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                title="Сховати панель"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {activeDeal ? (
            <>
              {/* Tabs selector */}
              <div className="flex border-b border-white/10 bg-slate-900/40 p-1 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setPanelTab('details')}
                  className={`flex-1 py-1.5 rounded-lg transition text-center ${
                    panelTab === 'details' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Інфо & Етап
                </button>
                <button
                  type="button"
                  onClick={() => setPanelTab('notes')}
                  className={`flex-1 py-1.5 rounded-lg transition text-center relative ${
                    panelTab === 'notes' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Замітки {activeDeal.notes?.length ? `(${activeDeal.notes.length})` : ''}
                </button>
                <button
                  type="button"
                  onClick={() => setPanelTab('tasks')}
                  className={`flex-1 py-1.5 rounded-lg transition text-center ${
                    panelTab === 'tasks' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Завдання {activeDeal.tasks?.length ? `(${activeDeal.tasks.length})` : ''}
                </button>
                <button
                  type="button"
                  onClick={() => setPanelTab('payment')}
                  className={`flex-1 py-1.5 rounded-lg transition text-center ${
                    panelTab === 'payment' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  4х25%
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
                {panelTab === 'details' && (
                  <div className="space-y-3">
                    {/* Stage Switcher */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Етап воронки:
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(currentPipeline?.stages || []).map(stg => {
                          const isCur = activeDeal.stageId === stg.id;
                          return (
                            <button
                              key={stg.id}
                              type="button"
                              onClick={() => handleStageChange(stg.id)}
                              className={`px-2 py-1.5 rounded-xl text-[10px] font-bold transition flex items-center gap-1.5 truncate border ${
                                isCur
                                  ? 'bg-blue-600 text-white border-blue-400 shadow-md ring-1 ring-blue-400/50'
                                  : 'bg-slate-900/80 text-slate-300 border-white/5 hover:border-white/20 hover:bg-slate-800'
                              }`}
                            >
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stg.color }} />
                              <span className="truncate">{stg.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Inline Form */}
                    <div className="space-y-2.5 pt-2 border-t border-white/5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Назва угоди</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Бюджет угоди (€)</label>
                          <input
                            type="number"
                            value={editBudget}
                            onChange={(e) => setEditBudget(e.target.value)}
                            className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Контактна особа</label>
                          <input
                            type="text"
                            value={editContactName}
                            onChange={(e) => setEditContactName(e.target.value)}
                            className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Телефон</label>
                          <input
                            type="text"
                            value={editContactPhone}
                            onChange={(e) => setEditContactPhone(e.target.value)}
                            className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Email</label>
                          <input
                            type="email"
                            value={editContactEmail}
                            onChange={(e) => setEditContactEmail(e.target.value)}
                            placeholder="email@company.com"
                            className="w-full bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Employer Requisition / Prospect Company Section */}
                      <div className="p-3 bg-slate-900/95 border border-purple-500/30 rounded-2xl space-y-2.5 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-purple-300 flex items-center gap-1.5 uppercase tracking-wider">
                            <Building2 className="w-3.5 h-3.5 text-purple-400" />
                            Підприємство & Заявка
                          </span>
                          {activeDeal.company ? (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Офіційне в базі
                            </span>
                          ) : (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold flex items-center gap-1" title="Підприємство вноситься в офіційний реєстр після оплати">
                              <Clock className="w-2.5 h-2.5" />
                              Попереднє (до оплати)
                            </span>
                          )}
                        </div>

                        {companyPromoteSuccess && (
                          <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-bold animate-in fade-in">
                            ✅ {companyPromoteSuccess}
                          </div>
                        )}

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-300 mb-0.5">
                            Назва підприємства / заводу
                          </label>
                          <input
                            type="text"
                            placeholder="ТОВ 'Агро-Пром' / Budimex..."
                            value={editEmployerName}
                            onChange={(e) => setEditEmployerName(e.target.value)}
                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-300 mb-0.5">
                              Чим займається (сфера)
                            </label>
                            <input
                              type="text"
                              placeholder="Агро / Метал / Логістика..."
                              value={editEmployerIndustry}
                              onChange={(e) => setEditEmployerIndustry(e.target.value)}
                              className="w-full bg-slate-800 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-300 mb-0.5">
                              Скільки людей потрібно
                            </label>
                            <input
                              type="text"
                              placeholder="10 зварювальників..."
                              value={editEmployerHeadcount}
                              onChange={(e) => setEditEmployerHeadcount(e.target.value)}
                              className="w-full bg-slate-800 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-cyan-300 font-bold placeholder-slate-500 focus:outline-none focus:border-purple-400"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-300 mb-0.5">
                              Посади / Вакансії
                            </label>
                            <input
                              type="text"
                              placeholder="Монтажники, токарі..."
                              value={editEmployerPositions}
                              onChange={(e) => setEditEmployerPositions(e.target.value)}
                              className="w-full bg-slate-800 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-300 mb-0.5">
                              Локація / Країна
                            </label>
                            <input
                              type="text"
                              placeholder="Польща / Україна..."
                              value={editEmployerLocation}
                              onChange={(e) => setEditEmployerLocation(e.target.value)}
                              className="w-full bg-slate-800 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-300 mb-0.5">
                            Ставка / Оплата для працівників
                          </label>
                          <input
                            type="text"
                            placeholder="25-28 PLN/год / 1200€..."
                            value={editEmployerSalary}
                            onChange={(e) => setEditEmployerSalary(e.target.value)}
                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-emerald-300 placeholder-slate-500 focus:outline-none focus:border-purple-400"
                          />
                        </div>

                        {/* Action buttons for Company */}
                        {!activeDeal.companyId ? (
                          <div className="pt-1.5 space-y-1.5">
                            <button
                              type="button"
                              onClick={handlePromoteToOfficialCompany}
                              disabled={isPromotingCompany || !editEmployerName.trim()}
                              className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-purple-900/30 active:scale-95 disabled:opacity-50"
                              title="Внести дані до офіційного реєстру підприємств після підтвердження оплати"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                              <span>{isPromotingCompany ? 'Внесення...' : '💎 Внести в офіційні підприємства (Оплачено)'}</span>
                            </button>
                            <div className="flex items-center justify-between gap-1 text-[10px] text-slate-400 pt-0.5">
                              <span>Або пов'язати з існуючим:</span>
                              <select
                                value={editCompanyId}
                                onChange={(e) => setEditCompanyId(e.target.value)}
                                className="bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none cursor-pointer max-w-[150px] truncate"
                              >
                                <option value="">-- Без компанії --</option>
                                {companies.map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-1 flex items-center justify-between text-[11px] text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 p-2 rounded-xl">
                            <span className="font-semibold truncate">
                              Офіційно: <strong className="text-white">{activeDeal.company?.name}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditCompanyId('')}
                              className="text-[10px] text-slate-400 hover:text-rose-400 underline ml-2 flex-shrink-0"
                            >
                              Відкріпити
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveDealChanges}
                        disabled={isSavingDeal}
                        className="w-full mt-2 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-md shadow-blue-600/30 active:scale-95 disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSavingDeal ? 'Збереження...' : (saveDealSuccess ? '✅ Збережено успішно!' : 'Зберегти зміни')}</span>
                      </button>
                    </div>
                  </div>
                )}

                {panelTab === 'notes' && (
                  <div className="space-y-3">
                    {/* Add note input */}
                    <div className="space-y-2 p-2.5 bg-amber-950/20 border border-amber-500/30 rounded-2xl">
                      <span className="text-[10px] font-bold text-amber-300 block">
                        🔒 Нова службова замітка (тільки для команди)
                      </span>
                      <textarea
                        rows={2}
                        placeholder="Введіть замітку щодо клієнта..."
                        value={dealNoteInput}
                        onChange={(e) => setDealNoteInput(e.target.value)}
                        className="w-full bg-slate-900 border border-amber-500/40 rounded-xl p-2 text-xs text-amber-100 placeholder-amber-400/50 focus:outline-none focus:border-amber-400 resize-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddDealNote}
                        disabled={isAddingDealNote || !dealNoteInput.trim()}
                        className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm disabled:opacity-50 active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isAddingDealNote ? 'Додавання...' : 'Додати замітку'}</span>
                      </button>
                    </div>

                    {/* Notes list */}
                    <div className="space-y-2">
                      {activeDeal.notes && activeDeal.notes.length > 0 ? (
                        activeDeal.notes.map(note => (
                          <div key={note.id} className="p-2.5 bg-slate-900/90 border border-white/5 rounded-xl space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="font-semibold text-amber-300">{note.user?.name || 'Менеджер'}</span>
                              <span className="font-mono">{new Date(note.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </div>
                            <p className="text-xs text-slate-200 whitespace-pre-wrap">{note.content}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-slate-500 text-[11px]">
                          Заміток по цій угоді ще немає
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {panelTab === 'tasks' && (
                  <div className="space-y-3">
                    {/* Add task input */}
                    <div className="space-y-2 p-2.5 bg-slate-900/90 border border-emerald-500/30 rounded-2xl">
                      <span className="text-[10px] font-bold text-emerald-400 block">
                        📋 Поставити завдання по клієнту
                      </span>
                      <input
                        type="text"
                        placeholder="напр.: Передзвонити щодо договору"
                        value={dealTaskInput}
                        onChange={(e) => setDealTaskInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddDealTask(); }}
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddDealTask}
                        disabled={isAddingDealTask || !dealTaskInput.trim()}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm disabled:opacity-50 active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isAddingDealTask ? 'Створення...' : 'Створити завдання'}</span>
                      </button>
                    </div>

                    {/* Tasks list */}
                    <div className="space-y-1.5">
                      {activeDeal.tasks && activeDeal.tasks.length > 0 ? (
                        activeDeal.tasks.map(t => (
                          <div key={t.id} className="p-2.5 bg-slate-900/90 border border-white/5 rounded-xl flex items-start gap-2">
                            <span className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${t.isCompleted ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs ${t.isCompleted ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                                {t.text}
                              </p>
                              <span className="text-[10px] text-slate-500 font-mono">
                                До: {new Date(t.dueDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-slate-500 text-[11px]">
                          Немає відкритих завдань
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {panelTab === 'payment' && (
                  <div className="space-y-3">
                    {(() => {
                      let paid: number[] = [];
                      try {
                        const parsed = typeof activeDeal.customFields === 'string' ? JSON.parse(activeDeal.customFields) : activeDeal.customFields;
                        paid = Array.isArray(parsed?.paidMilestones) ? parsed.paidMilestones : [];
                      } catch (e) {}

                      const tranches = [
                        { id: 1, name: '1. Договір (25%)' },
                        { id: 2, name: '2. Скринінг (25%)' },
                        { id: 3, name: '3. Віза D (25%)' },
                        { id: 4, name: '4. Вихід на завод (25%)' }
                      ];

                      return (
                        <div className="p-3 bg-slate-900/90 border border-white/10 rounded-2xl space-y-2.5">
                          <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Графік оплати (4х25%):
                            </span>
                            <span className="text-emerald-400 font-extrabold text-xs">
                              €{activeDeal.budget || 0}
                            </span>
                          </div>

                          <div className="space-y-2 text-xs">
                            {tranches.map(t => {
                              const isPaid = paid.includes(t.id);
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => handleToggleMilestone(t.id)}
                                  className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                                    isPaid 
                                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' 
                                      : 'bg-slate-800/60 border-white/5 text-slate-400 hover:border-white/20'
                                  }`}
                                >
                                  <span className="font-semibold">{t.name}</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold">{isPaid ? 'Оплачено' : 'Очікується'}</span>
                                    {isPaid ? (
                                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                      <Square className="w-4 h-4 text-slate-500" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Bottom full deal button */}
              <div className="p-3 border-t border-white/10 bg-slate-900/80">
                <button
                  type="button"
                  onClick={() => setModalDealId(activeDeal.id)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition border border-white/10 active:scale-95"
                >
                  <span>Повна картка угоди (вікно)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="p-6 text-center space-y-4 my-auto">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-white text-sm">Картку угоди не знайдено</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Для цього клієнта ще не створено угоду в CRM. Створіть її в один клік прямо зараз.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateDealFromChat}
                disabled={isCreatingDeal}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/30 active:scale-95 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{isCreatingDeal ? 'Створення угоди...' : '⚡ Створити картку клієнта'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* In-App Deal Detail Modal Overlay (stay in chat while viewing/editing full deal) */}
      {modalDealId && (
        <DealDetailModal
          dealId={modalDealId}
          pipeline={currentPipeline || pipelines[0] || { id: 'default', name: 'Воронка', stages: [] }}
          onClose={() => {
            setModalDealId(null);
            if (activeDeal?.id) {
              api.get(`/deals/${activeDeal.id}`).then(res => res.data && setActiveDeal(res.data)).catch(() => {});
            }
          }}
          onDealUpdated={(updated) => {
            setActiveDeal(updated);
          }}
          onDealDeleted={() => {
            setModalDealId(null);
            setActiveDeal(null);
          }}
        />
      )}

      {/* In-App Media Viewer Lightbox & PDF Viewer Modal */}
      {viewingMedia && (
        <MediaViewerModal
          mediaUrl={viewingMedia.url}
          mediaType={viewingMedia.type}
          title={viewingMedia.title}
          onClose={() => setViewingMedia(null)}
        />
      )}

      {/* In-App Telephony & Calling Modal */}
      {activeCall && (
        <CallModal
          dealId={activeDeal?.id}
          contactName={activeCall.name}
          phoneNumber={activeCall.phone}
          companyName={activeDeal?.company?.name}
          callType={activeCall.type}
          onClose={() => setActiveCall(null)}
        />
      )}

    </div>
  );
};
