import React, { useState, useEffect, useRef } from 'react';
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
  ExternalLink,
  Paperclip,
  Mic,
  CreditCard,
  Download,
  UploadCloud,
  Check,
  RefreshCw,
  Image as ImageIcon,
  Edit3,
  Volume2,
  VolumeX,
  Maximize2
} from 'lucide-react';
import { Deal, Pipeline, Stage, User } from '../../types';
import { api, socket } from '../../services/api';
import { soundService } from '../../services/sound.service';
import { useAuth } from '../../context/AuthContext';
import { KPGeneratorModal } from '../recruiting/KPGeneratorModal';
import { ObjectionsCheatSheetModal } from '../recruiting/ObjectionsCheatSheetModal';
import { RecruitingCalculatorModal } from '../recruiting/RecruitingCalculatorModal';
import { CallModal } from '../telephony/CallModal';
import { MediaViewerModal } from '../media/MediaViewerModal';
import { AudioMessagePlayer } from '../media/AudioMessagePlayer';
import { VoiceRecorder } from '../media/VoiceRecorder';
import { GeminiModal } from '../recruiting/GeminiModal';
import { startSpeechToText } from '../../utils/speechRecognition';
import { openPrintableInvoice } from '../../utils/invoiceGenerator';

const resolveMediaUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const apiBase = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || 'https://online-crm.onrender.com';
  return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

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
  const [activeTab, setActiveTab] = useState<'all' | 'chat' | 'candidates' | 'documents' | 'notes' | 'tasks'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Modals state
  const [isKPModalOpen, setIsKPModalOpen] = useState(false);
  const [isObjectionsModalOpen, setIsObjectionsModalOpen] = useState(false);
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<{ url: string; type: 'image' | 'pdf' | 'video' | 'document'; title?: string } | null>(null);

  // Documents state
  const [docCategory, setDocCategory] = useState('Договір з підприємством');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const docFileInputRef = useRef<HTMLInputElement | null>(null);

  // Speech Recognition / Voice Dictation state
  const [isDictating, setIsDictating] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Voice Note Recorder state
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);

  // File Upload state
  const [selectedFile, setSelectedFile] = useState<{ name: string; base64: string; type: string } | null>(null);
  const [isSendingFile, setIsSendingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  // New Note / Comment input
  const [noteText, setNoteText] = useState('');
  
  // New Chat Message input
  const [chatChannel, setChatChannel] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [chatMessageText, setChatMessageText] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(soundService.isEnabled());

  useEffect(() => {
    const handleSoundChange = (e: any) => {
      setSoundEnabled(e.detail?.enabled ?? soundService.isEnabled());
    };
    window.addEventListener('crm_sound_changed', handleSoundChange);
    return () => window.removeEventListener('crm_sound_changed', handleSoundChange);
  }, []);

  // New Task input
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskText, setTaskText] = useState('');
  const [taskType, setTaskType] = useState('call');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');

  // Candidate Manager state (Sprint 3: Huntflow)
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [newCandName, setNewCandName] = useState('');
  const [newCandCountry, setNewCandCountry] = useState('Узбекистан');
  const [newCandProfession, setNewCandProfession] = useState('Зварювальник MIG/MAG');
  const [newCandStatus, setNewCandStatus] = useState('Оформлення візи D');

  // AI Candidate Semantic Matchmaking (gemini-embedding-2, 1,500 RPM)
  const [isMatchingAI, setIsMatchingAI] = useState(false);
  const [matchJobText, setMatchJobText] = useState('Потрібні досвідчені зварювальники, токарі або оператори верстатів на завод');
  const [isMatchingLoading, setIsMatchingLoading] = useState(false);
  const [matchedResults, setMatchedResults] = useState<any[]>([]);

  // AI Resume Auto-Parser state
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [resumeInputText, setResumeInputText] = useState('');
  const [isParsingLoading, setIsParsingLoading] = useState(false);

  // Anti-Duplicate Guard state
  const [duplicateAlert, setDuplicateAlert] = useState<any | null>(null);

  // Live WhatsApp & Telegram presence & detection state
  const [messengerStatus, setMessengerStatus] = useState<{
    loading: boolean;
    whatsapp: { exists: boolean; jid?: string; phoneLink?: string };
    telegram: { exists: boolean; username?: string; firstName?: string; phoneLink?: string };
    whatsappConnected: boolean;
    telegramConnected: boolean;
  }>({
    loading: false,
    whatsapp: { exists: false },
    telegram: { exists: false },
    whatsappConnected: false,
    telegramConnected: false
  });

  // Direct Contact Editing state
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editContactName, setEditContactName] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');
  const [editContactPhone2, setEditContactPhone2] = useState('');
  const [editContactTg, setEditContactTg] = useState('');
  const [editContactEmail, setEditContactEmail] = useState('');
  const [editContactPosition, setEditContactPosition] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);

  // Quick Notes state (right column)
  const [quickNoteText, setQuickNoteText] = useState('');
  const [isSavingQuickNote, setIsSavingQuickNote] = useState(false);

  const checkMessengers = async (phone: string) => {
    if (!phone) return;
    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 9) return;

    setMessengerStatus(prev => ({ ...prev, loading: true }));
    try {
      const res = await api.post('/chat/check-contact', { phone: cleanDigits });
      if (res.data) {
        setMessengerStatus({
          loading: false,
          whatsapp: res.data.whatsapp || { exists: false },
          telegram: res.data.telegram || { exists: false },
          whatsappConnected: !!res.data.whatsappConnected,
          telegramConnected: !!res.data.telegramConnected
        });

        // Smart auto-selection of active channel
        if (res.data.whatsapp?.exists) {
          setChatChannel('whatsapp');
        } else if (res.data.telegram?.exists) {
          setChatChannel('telegram');
        }
      }
    } catch (err) {
      setMessengerStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const fetchDealDetails = async () => {
    try {
      const res = await api.get(`/deals/${dealId}`);
      if (res.data) {
        setDeal(res.data);
        setTaskAssigneeId(res.data.responsibleId);

        // Check messenger presence for contact
        const contactPhone = res.data.contact?.phone || res.data.contact?.whatsapp || res.data.contact?.phone2;
        if (contactPhone) {
          checkMessengers(contactPhone);
        }

        // Anti-Duplicate check
        api.get(`/deals/check-duplicate?query=${encodeURIComponent(res.data.title)}&dealId=${dealId}`)
          .then(dupRes => {
            if (dupRes.data.duplicateFound && dupRes.data.duplicates.length > 0) {
              setDuplicateAlert(dupRes.data.duplicates[0]);
            }
          })
          .catch(() => {});
      }
    } catch (e) {
      console.error('Failed to load deal details:', e);
    }
  };

  useEffect(() => {
    fetchDealDetails();

    const handleMessage = (msg: any) => {
      if (msg.dealId === dealId) {
        if (!msg.isFromUser && msg.type !== 'system') {
          soundService.playIncoming();
        }
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
    return () => clearTimeout(timer);
  }, [deal?.messages?.length, activeTab]);

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

  const handleAddNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!noteText.trim()) return;
    try {
      await api.post(`/deals/${deal.id}/notes`, { content: noteText, type: 'comment' });
      setNoteText('');
      fetchDealDetails();
    } catch (e) {
      console.error('Failed to add note:', e);
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
    setIsVoiceRecording(false);
    const to = chatChannel === 'whatsapp' 
      ? (deal.contact?.whatsapp || deal.contact?.phone || '+380734277174')
      : (deal.contact?.telegram || '@client_tg');

    try {
      await api.post('/chat/send-file', {
        channel: chatChannel,
        to,
        fileBase64: audioBase64,
        fileName: `voice_${Date.now()}.ogg`,
        mimeType: 'audio/ogg; codecs=opus',
        caption: `🎤 Голосове повідомлення (${durationSec} сек)`,
        dealId: deal.id,
        contactId: deal.contactId,
        isVoiceNote: true
      });
      soundService.playOutgoing();
      fetchDealDetails();
    } catch (e) {
      alert('Помилка відправки голосового повідомлення');
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const to = chatChannel === 'whatsapp' 
      ? (deal.contact?.whatsapp || deal.contact?.phone)
      : (deal.contact?.telegram || deal.contact?.phone);

    if (!to) {
      alert('У контакту не вказано номер телефону або Telegram. Додайте контактні дані перед надсиланням повідомлення.');
      return;
    }

    if (selectedFile) {
      setIsSendingFile(true);
      try {
        await api.post('/chat/send-file', {
          channel: chatChannel,
          to,
          fileBase64: selectedFile.base64,
          fileName: selectedFile.name,
          mimeType: selectedFile.type,
          caption: chatMessageText || undefined,
          dealId: deal.id,
          contactId: deal.contactId
        });
        soundService.playOutgoing();
        setSelectedFile(null);
        setChatMessageText('');
        fetchDealDetails();
      } catch (err: any) {
        alert(err?.response?.data?.error || 'Помилка відправки файлу');
      } finally {
        setIsSendingFile(false);
      }
      return;
    }

    const text = textToSend || chatMessageText;
    if (!text.trim()) return;

    try {
      await api.post('/chat/send', {
        channel: chatChannel,
        to,
        text,
        dealId: deal.id,
        contactId: deal.contactId
      });
      soundService.playOutgoing();
      setChatMessageText('');
      fetchDealDetails();
    } catch (e: any) {
      console.error('Failed to send message:', e);
      alert(e?.response?.data?.error || 'Помилка надсилання повідомлення');
    }
  };

  const handleStartEditContact = () => {
    setEditContactName(deal?.contact?.name || '');
    setEditContactPhone(deal?.contact?.phone || '');
    setEditContactPhone2(deal?.contact?.phone2 || '');
    setEditContactTg(deal?.contact?.telegram || '');
    setEditContactEmail(deal?.contact?.email || '');
    setEditContactPosition(deal?.contact?.position || 'Клієнт');
    setIsEditingContact(true);
  };

  const handleSaveContact = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editContactName.trim() && !editContactPhone.trim()) {
      alert('Вкажіть ім\'я або номер телефону клієнта');
      return;
    }

    setIsSavingContact(true);
    try {
      if (deal?.contact?.id) {
        const res = await api.put(`/contacts/${deal.contact.id}`, {
          name: editContactName.trim() || 'Клієнт',
          phone: editContactPhone.trim() || undefined,
          phone2: editContactPhone2.trim() || undefined,
          telegram: editContactTg.trim() ? (editContactTg.trim().startsWith('@') ? editContactTg.trim() : `@${editContactTg.trim()}`) : undefined,
          email: editContactEmail.trim() || undefined,
          position: editContactPosition.trim() || undefined
        });
        const updatedDeal = { ...deal, contact: res.data };
        setDeal(updatedDeal);
        onDealUpdated(updatedDeal);
      } else if (deal) {
        const res = await api.post('/contacts', {
          name: editContactName.trim() || 'Клієнт',
          phone: editContactPhone.trim() || undefined,
          phone2: editContactPhone2.trim() || undefined,
          telegram: editContactTg.trim() ? (editContactTg.trim().startsWith('@') ? editContactTg.trim() : `@${editContactTg.trim()}`) : undefined,
          email: editContactEmail.trim() || undefined,
          position: editContactPosition.trim() || undefined
        });
        const dealRes = await api.put(`/deals/${deal.id}`, { contactId: res.data.id });
        setDeal(dealRes.data);
        onDealUpdated(dealRes.data);
      }
      setIsEditingContact(false);
      fetchDealDetails();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Помилка збереження даних клієнта');
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleAddQuickNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNoteText.trim() || !deal) return;

    setIsSavingQuickNote(true);
    try {
      const res = await api.post(`/deals/${deal.id}/notes`, {
        content: quickNoteText.trim(),
        type: 'comment'
      });
      const updatedNotes = [res.data, ...(deal.notes || [])];
      const updatedDeal = { ...deal, notes: updatedNotes };
      setDeal(updatedDeal);
      onDealUpdated(updatedDeal);
      setQuickNoteText('');
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Помилка додавання замітки');
    } finally {
      setIsSavingQuickNote(false);
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

  const handleQuickTaskPreset = async (text: string, hoursAhead: number, type: string) => {
    try {
      const dueDate = new Date(Date.now() + hoursAhead * 60 * 60 * 1000).toISOString();
      await api.post('/tasks', {
        dealId: deal.id,
        responsibleId: deal.responsibleId || currentUser?.id,
        type,
        text,
        dueDate
      });
      fetchDealDetails();
    } catch (e) {
      console.error('Failed to create quick task:', e);
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

  // Safe parsing of customFields and tags
  let customFieldsObj: Record<string, string> = {};
  try {
    customFieldsObj = typeof deal.customFields === 'string' ? JSON.parse(deal.customFields) : (deal.customFields || {});
  } catch (e) {
    customFieldsObj = {};
  }

  let tagsList: string[] = [];
  try {
    tagsList = Array.isArray(deal.tags) ? deal.tags : (typeof deal.tags === 'string' ? JSON.parse(deal.tags) : []);
  } catch (e) {
    tagsList = [];
  }

  const timelineItems = [
    ...(deal.notes || []).map((n: any) => ({ ...n, itemType: 'note', timestamp: new Date(n.createdAt).getTime() })),
    ...(deal.messages || []).map((m: any) => ({ ...m, itemType: 'message', timestamp: new Date(m.createdAt).getTime() }))
  ].sort((a, b) => a.timestamp - b.timestamp);

  interface CandidateItem {
    id: string;
    name: string;
    country: string;
    profession: string;
    status: string;
  }

  const assignedCandidates: CandidateItem[] = Array.isArray((customFieldsObj as any).candidates)
    ? (customFieldsObj as any).candidates
    : [];

  const paidMilestones: number[] = Array.isArray((customFieldsObj as any).paidMilestones)
    ? (customFieldsObj as any).paidMilestones
    : [1];

  const handleSaveCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandName.trim()) return;
    const newCand: CandidateItem = {
      id: `cand-${Date.now()}`,
      name: newCandName.trim(),
      country: newCandCountry,
      profession: newCandProfession,
      status: newCandStatus
    };
    const updated = [newCand, ...assignedCandidates];
    const newCustomFields = { ...customFieldsObj, candidates: updated };
    try {
      const res = await api.put(`/deals/${deal.id}`, { customFields: newCustomFields });
      setDeal(res.data);
      onDealUpdated(res.data);
      setIsAddingCandidate(false);
      setNewCandName('');
    } catch (err) {
      console.error('Failed to save candidate:', err);
    }
  };

  const handleToggleMilestone = async (milestoneIndex: number) => {
    const updated = paidMilestones.includes(milestoneIndex)
      ? paidMilestones.filter(m => m !== milestoneIndex)
      : [...paidMilestones, milestoneIndex];
    const newCustomFields = { ...customFieldsObj, paidMilestones: updated };
    try {
      const res = await api.put(`/deals/${deal.id}`, { customFields: newCustomFields });
      setDeal(res.data);
      onDealUpdated(res.data);
    } catch (err) {
      console.error('Failed to toggle milestone:', err);
    }
  };

  const handleUpdateCandidateStatus = async (candId: string, status: string) => {
    const updated = assignedCandidates.map(c => c.id === candId ? { ...c, status } : c);
    const newCustomFields = { ...customFieldsObj, candidates: updated };
    try {
      const res = await api.put(`/deals/${deal.id}`, { customFields: newCustomFields });
      setDeal(res.data);
      onDealUpdated(res.data);
    } catch (err) {
      console.error('Failed to update candidate status:', err);
    }
  };

  const handleDeleteCandidate = async (candId: string) => {
    const updated = assignedCandidates.filter(c => c.id !== candId);
    const newCustomFields = { ...customFieldsObj, candidates: updated };
    try {
      const res = await api.put(`/deals/${deal.id}`, { customFields: newCustomFields });
      setDeal(res.data);
      onDealUpdated(res.data);
    } catch (err) {
      console.error('Failed to delete candidate:', err);
    }
  };

  const handleRunAiMatch = async () => {
    setIsMatchingLoading(true);
    try {
      const pool = [
        ...assignedCandidates,
        { id: 'cand-pool-1', name: 'Фарход Карімов', country: 'Узбекистан', profession: 'Зварювальник MIG/MAG 135/136', status: 'Віза D готова' },
        { id: 'cand-pool-2', name: 'Раджеш Кумар', country: 'Індія', profession: 'Оператор CNC / токар', status: 'Оформлення візи D' },
        { id: 'cand-pool-3', name: 'Азізбек Норматов', country: 'Узбекистан', profession: 'Слюсар-складальник металоконструкцій', status: 'Кваліфіковано' },
        { id: 'cand-pool-4', name: 'Марк Дела Круз', country: 'Філіппіни', profession: 'Електрик промислового обладнання', status: 'Кваліфіковано' },
        { id: 'cand-pool-5', name: 'Нурлан Абдуллаєв', country: 'Азербайджан', profession: 'Водій навантажувача / карщик', status: 'Віза D готова' }
      ];
      // Filter duplicates by name
      const uniquePool = pool.filter((v, i, a) => a.findIndex(t => t.name === v.name) === i);
      const res = await api.post('/ai/match-candidates', {
        jobRequirements: matchJobText || deal.title || 'Працівники виробництва',
        candidates: uniquePool
      });
      setMatchedResults(res.data.matches || []);
    } catch (err) {
      console.error('Match failed:', err);
    } finally {
      setIsMatchingLoading(false);
    }
  };

  const handleAddMatchedCandidate = async (matchedCand: any) => {
    if (assignedCandidates.some(c => c.name === matchedCand.name)) {
      alert('Цей кандидат вже є у замовленні!');
      return;
    }
    const newCand = {
      id: `cand-${Date.now()}`,
      name: matchedCand.name,
      country: matchedCand.country,
      profession: matchedCand.profession,
      status: matchedCand.status || 'Кваліфіковано / Резюме',
      addedAt: new Date().toISOString()
    };
    const updated = [...assignedCandidates, newCand];
    const newCustomFields = { ...customFieldsObj, candidates: updated };
    try {
      const res = await api.put(`/deals/${deal.id}`, { customFields: newCustomFields });
      setDeal(res.data);
      onDealUpdated(res.data);
    } catch (err) {
      console.error('Failed to add matched candidate:', err);
    }
  };

  const handleParseResume = async () => {
    if (!resumeInputText.trim()) return;
    setIsParsingLoading(true);
    try {
      const res = await api.post('/ai/parse-resume', { text: resumeInputText });
      const c = res.data.candidate;
      if (c) {
        setNewCandName(c.name || '');
        setNewCandProfession(c.profession || '');
        setNewCandCountry(c.country || 'Узбекистан');
        setNewCandStatus(c.status || 'Кваліфіковано / Резюме');
        setIsAddingCandidate(true);
        setIsParsingResume(false);
        setResumeInputText('');
      }
    } catch (err) {
      console.error('Failed to parse resume:', err);
    } finally {
      setIsParsingLoading(false);
    }
  };

  interface DocumentItem {
    id: string;
    name: string;
    url: string;
    category: string;
    mimeType: string;
    sizeKb: number;
    uploadedAt: string;
  }

  const documentsList: DocumentItem[] = Array.isArray((customFieldsObj as any).documents)
    ? (customFieldsObj as any).documents
    : [];

  const handleUploadDocumentFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const newDoc: DocumentItem = {
        id: `doc-${Date.now()}`,
        name: file.name,
        url: uploadRes.data.url,
        category: docCategory,
        mimeType: file.type || 'application/pdf',
        sizeKb: uploadRes.data.sizeKb || Math.round(file.size / 1024),
        uploadedAt: uploadRes.data.uploadedAt || new Date().toISOString()
      };

      const updatedDocs = [newDoc, ...documentsList];
      const newCustomFields = { ...customFieldsObj, documents: updatedDocs };
      const res = await api.put(`/deals/${deal.id}`, { customFields: newCustomFields });
      setDeal(res.data);
      onDealUpdated(res.data);
    } catch (err: any) {
      console.error('Failed to upload document:', err);
      alert(err?.response?.data?.error || 'Помилка при завантаженні файлу');
    } finally {
      setIsUploadingDoc(false);
      if (docFileInputRef.current) docFileInputRef.current.value = '';
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm('Видалити цей документ?')) return;
    const updated = documentsList.filter(d => d.id !== docId);
    const newCustomFields = { ...customFieldsObj, documents: updated };
    try {
      const res = await api.put(`/deals/${deal.id}`, { customFields: newCustomFields });
      setDeal(res.data);
      onDealUpdated(res.data);
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const currentStages = pipeline?.stages || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none font-['Inter',sans-serif]">
      <div className="bg-white dark:bg-[#0c111d] border border-slate-200 dark:border-white/[0.1] rounded-2xl w-full max-w-6xl h-[94vh] sm:h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Top Bar */}
        <div className="h-14 px-4 sm:px-6 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between bg-slate-50/90 dark:bg-[#0f1526]/90 flex-shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-md">
              {deal.title}
            </h2>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono text-xs sm:text-sm px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              €{new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(deal.budget || 0)}
            </span>
          </div>

          {/* Quick Action Tools: Call, AI, KP, Calc */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setIsCallModalOpen(true)}
              className="px-2.5 sm:px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
              title="Зателефонувати клієнту"
            >
              <Phone className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span className="hidden sm:inline">Зателефонувати</span>
            </button>

            <button
              onClick={() => setIsCalcModalOpen(true)}
              className="px-2.5 sm:px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
            >
              <Calculator className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span className="hidden sm:inline">Калькулятор</span>
            </button>

            <button
              onClick={() => setIsKPModalOpen(true)}
              className="px-2.5 sm:px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/20 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
            >
              <FileText className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span className="hidden sm:inline">КП (PDF)</span>
            </button>

            {currentUser?.canDeleteDeals && (
              <button
                onClick={handleDeleteDeal}
                title="Видалити угоду"
                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4" strokeWidth={1.75} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.08] rounded-lg transition"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Anti-Duplicate Guard Banner */}
        {duplicateAlert && (
          <div className="bg-amber-50 dark:bg-amber-950/70 border-b border-amber-200 dark:border-amber-500/40 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200 animate-in fade-in flex-shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" strokeWidth={1.75} />
              <span>
                <strong>Увага (Захист від дублів):</strong> Знайдено схожу угоду: <strong>«{duplicateAlert.title}»</strong> ({duplicateAlert.stageName})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDuplicateAlert(null)}
              className="text-amber-700 dark:text-amber-400 hover:underline text-[11px] font-bold ml-2"
            >
              Зрозуміло
            </button>
          </div>
        )}

        {/* Pipeline Stage Bar */}
        <div className="px-4 sm:px-6 py-2 bg-slate-100/80 dark:bg-[#080c14] border-b border-slate-200/80 dark:border-white/[0.08] flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mr-1 flex-shrink-0">
            Етап:
          </span>
          {currentStages.map((stage) => {
            const isCurrent = deal.stageId === stage.id;
            return (
              <button
                key={stage.id}
                onClick={() => handleStageChange(stage.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-2 transition flex-shrink-0 ${
                  isCurrent
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-white/[0.04] hover:bg-slate-200/70 dark:hover:bg-white/[0.08] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08]'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: stage.color || '#3b82f6' }}
                />
                <span>{stage.name}</span>
              </button>
            );
          })}
        </div>

        {/* 3-Column Content Layout */}
        <div className="flex-1 grid grid-cols-12 overflow-y-auto md:overflow-hidden bg-white dark:bg-[#0c111d]">
          
          {/* Left Column: Client & Project Params (3 Cols) */}
          <div className="col-span-12 md:col-span-3 border-r border-slate-200/80 dark:border-white/[0.08] p-4 sm:p-5 overflow-y-auto space-y-4 sm:space-y-5 bg-slate-50/50 dark:bg-[#090d16]/50 text-xs">
            {/* Responsible manager */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Відповідальний менеджер
              </label>
              <select
                value={deal.responsibleId}
                onChange={(e) => handleResponsibleChange(e.target.value)}
                disabled={!currentUser?.canEditDeals}
                className="w-full bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
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
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Контакт клієнта (HR / Директор)
                </label>
                {deal.contact ? (
                  <button
                    type="button"
                    onClick={handleStartEditContact}
                    className="p-1 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition flex items-center gap-1 text-[11px]"
                    title="Редагувати дані клієнта"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Редагувати</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartEditContact}
                    className="p-1 text-blue-400 hover:text-blue-300 rounded-lg hover:bg-slate-800 transition flex items-center gap-1 text-[11px] font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Додати</span>
                  </button>
                )}
              </div>

              {isEditingContact ? (
                <form onSubmit={handleSaveContact} className="bg-slate-900 border border-blue-500/40 rounded-2xl p-3.5 space-y-2.5 animate-in fade-in">
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">ПІБ / Назва контакту</label>
                    <input
                      type="text"
                      placeholder="Олександр Директор"
                      value={editContactName}
                      onChange={(e) => setEditContactName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Телефон 1</label>
                      <input
                        type="text"
                        placeholder="+380..."
                        value={editContactPhone}
                        onChange={(e) => setEditContactPhone(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Телефон 2</label>
                      <input
                        type="text"
                        placeholder="+380..."
                        value={editContactPhone2}
                        onChange={(e) => setEditContactPhone2(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Telegram (@username)</label>
                      <input
                        type="text"
                        placeholder="@username"
                        value={editContactTg}
                        onChange={(e) => setEditContactTg(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Посада</label>
                      <input
                        type="text"
                        placeholder="Керівник"
                        value={editContactPosition}
                        onChange={(e) => setEditContactPosition(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Email</label>
                    <input
                      type="email"
                      placeholder="client@company.com"
                      value={editContactEmail}
                      onChange={(e) => setEditContactEmail(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingContact(false)}
                      className="px-2.5 py-1 text-slate-400 hover:text-white text-xs"
                    >
                      Скасувати
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingContact}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isSavingContact ? 'Збереження...' : 'Зберегти'}</span>
                    </button>
                  </div>
                </form>
              ) : deal.contact ? (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                  <div className="font-bold text-sm text-white flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-blue-400" />
                    <span>{deal.contact.name}</span>
                    {deal.contact.position && (
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-normal">
                        {deal.contact.position}
                      </span>
                    )}
                  </div>

                  {deal.contact.phone && (
                    <div className="text-xs text-slate-300 flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <Phone className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span className="truncate">{deal.contact.phone}</span>
                      </div>
                      <a
                        href={`tg://resolve?phone=${deal.contact.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 transition flex-shrink-0"
                        title="Відкрити чат Telegram за номером"
                      >
                        <span>Telegram</span>
                      </a>
                    </div>
                  )}

                  {deal.contact.phone2 && (
                    <div className="text-xs text-slate-300 flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <Phone className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span className="truncate">{deal.contact.phone2}</span>
                      </div>
                      <a
                        href={`tg://resolve?phone=${deal.contact.phone2.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 transition flex-shrink-0"
                        title="Відкрити чат Telegram за дод. номером"
                      >
                        <span>Telegram 2</span>
                      </a>
                    </div>
                  )}

                  {deal.contact.telegram ? (
                    <div className="text-xs text-slate-300 flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-sky-400 font-bold text-xs">TG:</span>
                        <a href={`https://t.me/${deal.contact.telegram.replace('@', '')}`} target="_blank" rel="noreferrer" className="hover:underline text-sky-400 font-medium truncate">
                          @{deal.contact.telegram.replace('@', '')}
                        </a>
                      </div>
                      <a
                        href={`https://t.me/${deal.contact.telegram.replace('@', '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[10px] font-bold transition flex-shrink-0"
                      >
                        Відкрити
                      </a>
                    </div>
                  ) : null}

                  {deal.contact.email && (
                    <div className="text-xs text-slate-300 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-amber-400" />
                      <span>{deal.contact.email}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-slate-900/60 border border-dashed border-slate-700 rounded-2xl text-center space-y-2">
                  <p className="text-xs text-slate-400 italic">Контакт ще не заповнено</p>
                  <button
                    type="button"
                    onClick={handleStartEditContact}
                    className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-semibold transition"
                  >
                    + Заповнити дані клієнта
                  </button>
                </div>
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
                    <div className="text-[11px] text-slate-400">{deal.company.address}</div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Компанію не прив'язано</p>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
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
          <div className="col-span-12 md:col-span-6 flex flex-col min-h-[500px] md:min-h-0 h-full bg-[#080c14] border-r border-slate-800/80">
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
                <button
                  onClick={() => setActiveTab('documents')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                    activeTab === 'documents' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Документи ({documentsList.length})</span>
                </button>
              </div>

              {/* AI Tools Header Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsGeminiModalOpen(true)}
                  className="text-[11px] font-extrabold text-indigo-300 hover:text-white flex items-center gap-1 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 hover:from-indigo-600/50 hover:to-purple-600/50 px-2.5 py-1 rounded-lg border border-indigo-500/40 shadow-sm transition"
                  title="Google Gemini AI помічник з рекрутингу"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                  <span>Gemini AI</span>
                </button>

                <button
                  onClick={() => setIsObjectionsModalOpen(true)}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-200 flex items-center gap-1 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/60"
                >
                  <span>Скрипти</span>
                </button>
              </div>
            </div>

            {/* Content Area based on Tab */}
            {activeTab === 'candidates' ? (
              /* Huntflow Candidate Tracker & 4x25% Milestone Manager */
              <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
                {/* 4x25% Payment Milestones */}
                <div className="bg-[#111726] border border-slate-800/90 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Фінансові транші договору (4х25%)</span>
                    </h5>
                    <span className="text-[11px] font-bold text-emerald-400">
                      Бюджет: {formatCurrency(deal.budget || 0)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { index: 1, label: '1. Договір (25%)', sub: 'Аванс' },
                      { index: 2, label: '2. Списки (25%)', sub: 'Кандидати' },
                      { index: 3, label: '3. Візи D (25%)', sub: 'Дозволи' },
                      { index: 4, label: '4. Вихід (25%)', sub: 'На заводі' }
                    ].map(m => {
                      const isPaid = paidMilestones.includes(m.index);
                      const amount = (deal.budget ? (deal.budget * 0.25) : 0);
                      return (
                        <button
                          key={m.index}
                          type="button"
                          onClick={() => handleToggleMilestone(m.index)}
                          className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                            isPaid
                              ? 'bg-emerald-950/40 border-emerald-500/60 text-white'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold">{m.label}</span>
                            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black ${
                              isPaid ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-500'
                            }`}>
                              {isPaid ? '✓' : ''}
                            </span>
                          </div>
                          <div className="mt-1 flex items-baseline justify-between">
                            <span className={`text-xs font-extrabold ${isPaid ? 'text-emerald-300' : 'text-slate-300'}`}>
                              {formatCurrency(amount)}
                            </span>
                            <span className="text-[9px] text-slate-500">{isPaid ? 'Сплачено' : 'Очікується'}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* 1-Click Ukrainian Invoice Generator (PDF) */}
                  <div className="flex flex-wrap items-center justify-between pt-1 text-xs border-t border-slate-800/80 gap-2">
                    <span className="text-[11px] text-slate-400">Натисніть на транш для позначки або сформуйте офіційний рахунок:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextTranche = [1, 2, 3, 4].find(n => !paidMilestones.includes(n)) || 1;
                        openPrintableInvoice({
                          dealTitle: deal.title,
                          companyName: deal.company?.name || deal.title,
                          trancheNumber: nextTranche,
                          tranchePercent: 25,
                          totalDealBudget: deal.budget || 100000,
                          dealId: deal.id,
                          contactName: deal.contact?.name,
                          contactPhone: deal.contact?.phone
                        });
                      }}
                      className="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 hover:text-white border border-blue-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                    >
                      <FileText className="w-3 h-3" />
                      <span>🧾 Сформувати Рахунок-фактуру (PDF)</span>
                    </button>
                  </div>
                </div>

                {/* Candidate Pool Header */}
                <div className="flex flex-wrap items-center justify-between pt-1 gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      <span>Пул кандидатів</span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold">
                        {assignedCandidates.length}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400">Керування працівниками, візами та виїздом на об'єкт</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsParsingResume(!isParsingResume)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isParsingResume ? 'Закрити парсер' : '📄 AI-парсинг резюме'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const next = !isMatchingAI;
                        setIsMatchingAI(next);
                        if (next && matchedResults.length === 0) {
                          handleRunAiMatch();
                        }
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>{isMatchingAI ? 'Сховати смарт-підбір' : '🔍 AI Смарт-підбір'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsAddingCandidate(!isAddingCandidate)}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-purple-600/30 flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAddingCandidate ? 'Скасувати' : '+ Додати вручну'}</span>
                    </button>
                  </div>
                </div>

                {/* AI Resume Parser Input Block */}
                {isParsingResume && (
                  <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-4 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-bold text-white">AI-парсер резюме (Gemini 2.5 Flash)</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Вставте текст резюме або анкету</span>
                    </div>

                    <textarea
                      value={resumeInputText}
                      onChange={(e) => setResumeInputText(e.target.value)}
                      rows={3}
                      placeholder="Вставте сюди текст резюме кандидата (ПІБ, телефон, спеціальність, досвід)..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsParsingResume(false)}
                        className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-semibold"
                      >
                        Скасувати
                      </button>
                      <button
                        type="button"
                        onClick={handleParseResume}
                        disabled={isParsingLoading || !resumeInputText.trim()}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isParsingLoading ? 'animate-spin' : ''}`} />
                        <span>{isParsingLoading ? 'Розпізнавання...' : '⚡ Розпізнати та створити кандидата'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* AI Semantic Candidate Matchmaking Panel */}
                {isMatchingAI && (
                  <div className="bg-gradient-to-br from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-500/40 rounded-2xl p-4 space-y-3 animate-in fade-in">
                    <div className="flex flex-wrap items-center justify-between border-b border-indigo-500/20 pb-2 gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span className="text-xs font-bold text-white">Векторний AI-підбір кандидатів (gemini-embedding-2)</span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">1,500 RPM • 0$</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Семантичний аналіз за досвідом та паспортом</span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={matchJobText}
                        onChange={(e) => setMatchJobText(e.target.value)}
                        placeholder="Опишіть вимоги до людей або спеціальність..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleRunAiMatch}
                        disabled={isMatchingLoading}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isMatchingLoading ? 'animate-spin' : ''}`} />
                        <span>{isMatchingLoading ? 'Аналіз...' : 'Знайти кандидатів'}</span>
                      </button>
                    </div>

                    {/* Matched Candidates List */}
                    {matchedResults.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <div className="text-[11px] font-bold text-slate-300">Найбільш відповідні кандидати з бази:</div>
                        <div className="grid grid-cols-1 gap-2">
                          {matchedResults.map((m) => {
                            const isAssigned = assignedCandidates.some(c => c.name === m.name);
                            return (
                              <div
                                key={m.id}
                                className="p-2.5 bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 rounded-xl flex items-center justify-between gap-3 transition"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-white">{m.name}</span>
                                    <span className="text-[10px] text-slate-400">({m.country})</span>
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold border border-emerald-500/30">
                                      {m.score}% Збіг
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-indigo-300 font-medium truncate">
                                    {m.profession}
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    {m.matchReason}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleAddMatchedCandidate(m)}
                                  disabled={isAssigned}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 flex-shrink-0 ${
                                    isAssigned
                                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                                  }`}
                                >
                                  {isAssigned ? (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span>У замовленні</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>+ Прикріпити</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Inline Add Candidate Form */}
                {isAddingCandidate && (
                  <form onSubmit={handleSaveCandidate} className="bg-slate-900 border border-purple-500/40 rounded-2xl p-3.5 space-y-3 animate-in fade-in">
                    <div className="text-xs font-bold text-purple-300">Новий кандидат на об'єкт:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        placeholder="ПІБ кандидата (напр. Бахром Юлдашев)"
                        value={newCandName}
                        onChange={(e) => setNewCandName(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                        required
                        autoFocus
                      />
                      <input
                        type="text"
                        placeholder="Професія / Спеціальність"
                        value={newCandProfession}
                        onChange={(e) => setNewCandProfession(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <select
                        value={newCandCountry}
                        onChange={(e) => setNewCandCountry(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="Узбекистан">🇺🇿 Узбекистан</option>
                        <option value="Індія">🇮🇳 Індія</option>
                        <option value="Азербайджан">🇦🇿 Азербайджан</option>
                        <option value="Філіппіни">🇵🇭 Філіппіни</option>
                        <option value="Туреччина">🇹🇷 Туреччина</option>
                        <option value="Україна">🇺🇦 Україна</option>
                      </select>
                      <select
                        value={newCandStatus}
                        onChange={(e) => setNewCandStatus(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="Кваліфіковано / Резюме">Кваліфіковано / Резюме</option>
                        <option value="Оформлення візи D">Оформлення візи D</option>
                        <option value="Віза D готова">Віза D готова</option>
                        <option value="Квитки куплено / В дорозі">Квитки куплено / В дорозі</option>
                        <option value="Вийшов на зміну">Вийшов на зміну (Успіх)</option>
                        <option value="Відмова / Заміна">Відмова / Потрібна заміна</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingCandidate(false)}
                        className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-semibold"
                      >
                        Скасувати
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                      >
                        Зберегти до пулу
                      </button>
                    </div>
                  </form>
                )}

                {/* Candidate List Cards */}
                <div className="space-y-2.5">
                  {assignedCandidates.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      Кандидатів ще не додано. Натисніть "+ Додати кандидата"
                    </div>
                  ) : (
                    assignedCandidates.map(c => (
                      <div
                        key={c.id}
                        className="p-3.5 bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-300 flex-shrink-0">
                            {c.name.slice(0, 1)}
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs flex items-center gap-1.5">
                              <span>{c.name}</span>
                              <span className="text-[10px] text-slate-500">({c.country})</span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                              <span>{c.profession}</span>
                              <span className="text-slate-600">•</span>
                              <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <FileText className="w-2.5 h-2.5" /> Резюме (PDF)
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <select
                            value={c.status}
                            onChange={(e) => handleUpdateCandidateStatus(c.id, e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-[11px] font-bold text-purple-300 focus:outline-none"
                          >
                            <option value="Кваліфіковано / Резюме">Кваліфіковано</option>
                            <option value="Оформлення візи D">Оформлення візи D</option>
                            <option value="Віза D готова">Віза D готова</option>
                            <option value="Квитки куплено / В дорозі">Квитки / В дорозі</option>
                            <option value="Вийшов на зміну">Вийшов на зміну</option>
                            <option value="Відмова / Заміна">Відмова / Заміна</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleDeleteCandidate(c.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition"
                            title="Видалити з пулу"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : activeTab === 'documents' ? (
              /* Enterprise Documents & Contracts Manager */
              <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
                {/* Upload Document Box */}
                <div className="bg-[#111726] border border-cyan-500/30 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Документообіг підприємства</span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Договори, бриф-заявки, рахунки 4х25% та акти в хмарному сховищі Cloudinary з авто-стисненням (0$ Free Tier)
                      </p>
                    </div>

                    <label className="cursor-pointer px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-cyan-600/30 flex items-center gap-1.5">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{isUploadingDoc ? 'Стиснення та завантаження...' : '+ Додати документ'}</span>
                      <input
                        ref={docFileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleUploadDocumentFile}
                        disabled={isUploadingDoc}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                      />
                    </label>
                  </div>

                  {/* Category Selector */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] text-slate-400 font-semibold">Категорія файлу:</span>
                    <select
                      value={docCategory}
                      onChange={(e) => setDocCategory(e.target.value)}
                      className="bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1 text-xs text-cyan-300 font-semibold focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Договір з підприємством">⚖️ Договір з підприємством</option>
                      <option value="Заявка на підбір (Бриф)">📋 Заявка на підбір (Бриф)</option>
                      <option value="Рахунок-фактура (25%)">💳 Рахунок-фактура (25%)</option>
                      <option value="Акт виконаних робіт">📑 Акт виконаних робіт</option>
                      <option value="Інший документ">📎 Інший документ</option>
                    </select>
                  </div>
                </div>

                {/* Document List */}
                <div className="space-y-2.5">
                  {documentsList.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      Документів ще не завантажено. Натисніть «+ Додати документ»
                    </div>
                  ) : (
                    documentsList.map((doc) => {
                      const isContract = doc.category.includes('Договір');
                      const isBrief = doc.category.includes('Бриф') || doc.category.includes('Заявка');
                      const isInvoice = doc.category.includes('Рахунок');

                      return (
                        <div
                          key={doc.id}
                          className="p-3.5 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold border flex-shrink-0 ${
                              isContract
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                : isBrief
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                : isInvoice
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                            }`}>
                              <FileText className="w-4 h-4" />
                            </div>

                            <div>
                              <div className="font-bold text-white text-xs flex items-center gap-2">
                                <span className="truncate max-w-[240px] sm:max-w-md">{doc.name}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  isContract
                                    ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                    : isBrief
                                    ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                                    : isInvoice
                                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                    : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                                }`}>
                                  {doc.category}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5">
                                <span>{doc.sizeKb} KB</span>
                                <span>•</span>
                                <span>{new Date(doc.uploadedAt).toLocaleDateString()} {new Date(doc.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span className="text-emerald-400 font-medium flex items-center gap-0.5 text-[10px]">
                                  <Check className="w-3 h-3" /> Стиснено в хмарі
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                            >
                              <Download className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Відкрити / Скачати</span>
                            </a>

                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                              title="Видалити документ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              /* Timeline Stream */
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
                {timelineItems.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    Історія подій поки порожня
                  </div>
                ) : (
                  timelineItems.map((item: any) => {
                    if (item.itemType === 'message') {
                      const isOutgoing = item.direction === 'outgoing';
                      const isWhatsApp = item.channel === 'whatsapp';
                      const isFile = item.text?.startsWith('📎') || item.mediaType === 'pdf' || item.mediaType === 'document';
                      const isVoice = item.text?.startsWith('🎤') || item.mediaType === 'audio' || item.text?.includes('Voice_Note');
                      const isImage = item.mediaType === 'image' || item.text?.startsWith('📷') || item.mediaUrl?.startsWith('data:image');
                      const isVideo = item.mediaType === 'video' || item.text?.startsWith('🎥') || item.text?.startsWith('📹') || item.mediaUrl?.endsWith('.mp4') || item.mediaUrl?.endsWith('.webm') || item.mediaUrl?.endsWith('.mov') || item.mediaUrl?.includes('/video/');

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

                          {isVoice ? (
                            <div className="max-w-[85%] sm:max-w-md w-full">
                              <AudioMessagePlayer
                                audioUrl={resolveMediaUrl(item.mediaUrl) || 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'}
                                duration={12}
                                transcription={item.text.replace('🎤 Голосове повідомлення', '').replace('🎤', '').trim()}
                                isOutgoing={isOutgoing}
                              />
                            </div>
                          ) : isVideo && item.mediaUrl ? (
                            <div className="max-w-xs sm:max-w-sm rounded-2xl overflow-hidden border border-slate-700 bg-black shadow-xl">
                              <video
                                controls
                                preload="metadata"
                                src={resolveMediaUrl(item.mediaUrl)}
                                className="w-full max-h-64 object-contain bg-black rounded-t-2xl"
                              />
                              <div className="p-2.5 bg-slate-900 flex items-center justify-between text-xs text-slate-300 border-t border-slate-800">
                                <div className="flex items-center gap-1.5 truncate">
                                  <Video className="w-4 h-4 text-rose-400 flex-shrink-0" />
                                  <span className="truncate font-medium">{item.text?.replace(/^🎥\s*/, '') || 'Відео'}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setViewingMedia({ url: resolveMediaUrl(item.mediaUrl), type: 'video', title: item.text || 'Відеоповідомлення' })}
                                  className="p-1 hover:text-blue-400 text-slate-400 hover:bg-slate-800 rounded-lg transition ml-2 flex-shrink-0"
                                  title="Відкрити у вікні перегляду"
                                >
                                  <Maximize2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : isImage && item.mediaUrl ? (
                            <div
                              onClick={() => setViewingMedia({ url: resolveMediaUrl(item.mediaUrl), type: 'image', title: 'Фото від клієнта' })}
                              className="cursor-pointer max-w-xs rounded-2xl overflow-hidden border border-slate-700 shadow-md hover:opacity-90 transition"
                            >
                              <img src={resolveMediaUrl(item.mediaUrl)} alt="Зображення" className="w-full object-cover max-h-48" />
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                if (isFile) {
                                  setViewingMedia({
                                    url: resolveMediaUrl(item.mediaUrl) || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                                    type: 'pdf',
                                    title: item.text.replace('📎 Файл: ', '').replace('📎 Файл TG: ', '')
                                  });
                                }
                              }}
                              className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                                isOutgoing
                                  ? 'bg-blue-600 text-white rounded-tr-none shadow-md'
                                  : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-none'
                              } ${isFile ? 'border-2 border-amber-400/50 cursor-pointer hover:bg-slate-700/80 transition flex items-center gap-2' : ''}`}
                            >
                              {isFile && <FileText className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                              <span>{item.text}</span>
                            </div>
                          )}
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
                        <p className="text-slate-300 leading-relaxed whitespace-pre-line">{item.content}</p>
                      </div>
                    );
                  })
                )}
                {/* Scroll Anchor for instant scroll to newest message */}
                <div ref={messagesEndRef} />
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

                  <form onSubmit={(e) => handleAddNote(e)} className="flex gap-2">
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
              ) : isVoiceRecording ? (
                /* In-Modal Voice Recorder */
                <VoiceRecorder
                  onSendVoice={handleSendVoiceNote}
                  onCancel={() => setIsVoiceRecording(false)}
                />
              ) : (
                /* Regular Chat Bar with File Attachment & Voice Recording */
                <>
                  {selectedFile && (
                    <div className="p-2 bg-slate-900 border border-amber-500/40 rounded-xl flex items-center justify-between text-xs text-amber-300 animate-in fade-in">
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

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-2xl">
                      {/* WhatsApp Channel */}
                      <button
                        type="button"
                        onClick={() => setChatChannel('whatsapp')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          chatChannel === 'whatsapp'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                        title={
                          messengerStatus.whatsapp.exists
                            ? 'WhatsApp знайдено та готовий до відправки прямо з CRM'
                            : 'WhatsApp на цьому номері перевіряється або не знайдено'
                        }
                      >
                        <span className={`w-2 h-2 rounded-full ${messengerStatus.whatsapp.exists ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                        <span>WhatsApp</span>
                        {messengerStatus.loading ? (
                          <span className="text-[10px] opacity-60">...</span>
                        ) : messengerStatus.whatsapp.exists ? (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-extrabold px-1.5 py-0.2 rounded">
                            АКТИВНИЙ
                          </span>
                        ) : (
                          <span className="text-[9px] opacity-50 font-normal">
                            не знайдено
                          </span>
                        )}
                      </button>

                      {/* Telegram Channel */}
                      <button
                        type="button"
                        onClick={() => setChatChannel('telegram')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          chatChannel === 'telegram'
                            ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                        title={
                          messengerStatus.telegram.exists
                            ? `Telegram знайдено (${messengerStatus.telegram.username || 'активний'}). Повідомлення надійде прямо в чат клієнту`
                            : 'Telegram за цим номером не знайдено'
                        }
                      >
                        <span className={`w-2 h-2 rounded-full ${messengerStatus.telegram.exists ? 'bg-sky-400 animate-pulse' : 'bg-slate-500'}`} />
                        <span>Telegram</span>
                        {messengerStatus.loading ? (
                          <span className="text-[10px] opacity-60">...</span>
                        ) : messengerStatus.telegram.exists ? (
                          <span className="text-[9px] bg-sky-500/20 text-sky-300 font-extrabold px-1.5 py-0.2 rounded">
                            {messengerStatus.telegram.username || 'АКТИВНИЙ'}
                          </span>
                        ) : (
                          <span className="text-[9px] opacity-50 font-normal">
                            не знайдено
                          </span>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSoundEnabled(soundService.toggle())}
                        title={soundEnabled ? "Звукові сповіщення увімкнено (натисніть щоб вимкнути)" : "Звукові сповіщення вимкнено (натисніть щоб увімкнути)"}
                        className={`px-2.5 py-1.5 rounded-xl border transition flex items-center gap-1.5 text-[11px] font-semibold ${
                          soundEnabled 
                            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/40' 
                            : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                        <span className="hidden sm:inline">{soundEnabled ? 'Звук: Увімк' : 'Звук: Вимк'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={toggleVoiceDictation}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition ${
                          isDictating 
                            ? 'bg-rose-600 text-white animate-pulse' 
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        <Mic className="w-3 h-3 text-emerald-400" />
                        <span>{isDictating ? 'Запис...' : 'Голосове введення'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Response Snippets */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                    <span className="text-[10px] text-slate-500 uppercase font-bold flex-shrink-0">Шаблони:</span>
                    {[
                      { label: '📄 КП', text: 'Доброго дня! Підготували офіційну комерційну пропозицію щодо персоналу. Надіслати детальний розрахунок у PDF?' },
                      { label: '💳 4х25%', text: 'Оплата поетапна: 1) Договір (25%) ➔ 2) Затвердження кандидатів (25%) ➔ 3) Робоча віза (25%) ➔ 4) Вихід на підприємство (25%).' },
                      { label: '🛡️ Гарантія', text: 'У нас діє 1 місяць повного супроводу координатором та 1 безкоштовна заміна у разі необхідності.' },
                      { label: '📞 Не взяв', text: 'Доброго дня! Намагався вам зателефонувати щодо заявки на персонал. Підкажіть, будь ласка, коли вам зручно поспілкуватися?' },
                      { label: '📋 Вимоги', text: "Уточніть, будь ласка: скільки працівників потрібно, який графік роботи та чи надається житло на об'єкті?" }
                    ].map((snip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setChatMessageText(snip.text)}
                        className="px-2 py-0.5 bg-slate-800/90 hover:bg-blue-600/30 text-slate-300 hover:text-blue-300 border border-slate-700/80 hover:border-blue-500/40 rounded-lg transition flex-shrink-0 whitespace-nowrap text-[10px] font-medium"
                      >
                        {snip.label}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
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
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 border border-slate-700 rounded-2xl transition flex items-center justify-center flex-shrink-0"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      title="Надіслати відео (зустріч кандидата, огляд житла/заводу, візитка)"
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-400 border border-slate-700 rounded-2xl transition flex items-center justify-center flex-shrink-0"
                    >
                      <Video className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsVoiceRecording(true)}
                      title="Записати голосове повідомлення"
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700 rounded-2xl transition flex items-center justify-center flex-shrink-0"
                    >
                      <Mic className="w-4 h-4" />
                    </button>

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
                      disabled={isSendingFile}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-blue-600/30 flex-shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSendingFile ? '...' : 'Надіслати'}</span>
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Tasks Checklist & Quick Notes (3 Cols) */}
          <div className="col-span-12 md:col-span-3 p-4 sm:p-5 overflow-y-auto space-y-4 bg-[#0e1422]">
            
            {/* Quick Notes & Customer Insights */}
            <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Замітки по клієнту</span>
                </h3>
                <span className="text-[10px] text-slate-500">{(deal.notes || []).length} записів</span>
              </div>

              <form onSubmit={handleAddQuickNote} className="space-y-2">
                <textarea
                  rows={2}
                  placeholder="Запишіть деталі про клієнта під час листування..."
                  value={quickNoteText}
                  onChange={(e) => setQuickNoteText(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingQuickNote || !quickNoteText.trim()}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isSavingQuickNote ? '...' : 'Зберегти замітку'}</span>
                  </button>
                </div>
              </form>

              {/* Recent Notes Stream */}
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {(deal.notes || []).length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">Поки немає заміток</p>
                ) : (
                  (deal.notes || []).map((n: any) => (
                    <div key={n.id} className="p-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-bold text-amber-300">{n.user?.name || 'Менеджер'}</span>
                        <span>{new Date(n.createdAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-200 leading-snug whitespace-pre-line text-[11px]">{n.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

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

            {/* amoCRM Warning & Quick Presets: No Open Tasks */}
            {(!deal.tasks || deal.tasks.filter((t: any) => !t.isCompleted).length === 0) && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/50 rounded-2xl space-y-2.5 animate-in fade-in">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  <span>Угода без наступного кроку!</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Клієнт без запланованої задачі буде втрачений. Призначте дію в 1 клік:
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickTaskPreset('Зателефонувати клієнту', 24, 'call')}
                    className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-left text-[11px] flex items-center justify-between transition group"
                  >
                    <span className="font-semibold">📞 Дзвінок завтра</span>
                    <span className="text-[10px] text-slate-500 group-hover:text-blue-400">+24г</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickTaskPreset('Контроль вивчення КП та розрахунку', 48, 'meeting')}
                    className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-left text-[11px] flex items-center justify-between transition group"
                  >
                    <span className="font-semibold">📄 Контроль КП</span>
                    <span className="text-[10px] text-slate-500 group-hover:text-amber-400">+2 дні</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickTaskPreset('Узгодити правки до договору', 72, 'other')}
                    className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-left text-[11px] flex items-center justify-between transition group"
                  >
                    <span className="font-semibold">⚖️ Договір</span>
                    <span className="text-[10px] text-slate-500 group-hover:text-emerald-400">+3 дні</span>
                  </button>
                </div>
              </div>
            )}

            {/* Task Add Form */}
            {isAddingTask && (
              <form onSubmit={handleCreateTask} className="bg-slate-900 border border-slate-700 rounded-2xl p-3.5 space-y-3 animate-in fade-in">
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
                    type="datetime-local"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-xl p-1.5 text-xs text-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingTask(false)}
                    className="px-3 py-1 text-slate-400 hover:text-white text-xs"
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
                  >
                    Додати
                  </button>
                </div>
              </form>
            )}

            {/* Tasks List */}
            <div className="space-y-2">
              {(deal.tasks || []).length === 0 ? (
                <p className="text-xs text-slate-500 italic">Немає запланованих завдань</p>
              ) : (
                (deal.tasks || []).map((t: any) => (
                  <div
                    key={t.id}
                    className={`p-3 rounded-2xl border transition flex items-start justify-between gap-2.5 ${
                      t.isCompleted
                        ? 'bg-slate-900/40 border-slate-800/50 opacity-60'
                        : 'bg-slate-900 border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <button
                        onClick={() => handleToggleTask(t.id, t.isCompleted)}
                        className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center transition flex-shrink-0 ${
                          t.isCompleted
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'border-slate-600 hover:border-blue-500'
                        }`}
                      >
                        {t.isCompleted && <CheckCircle2 className="w-3 h-3" />}
                      </button>
                      <div className="min-w-0">
                        <p className={`text-xs ${t.isCompleted ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                          {t.text}
                        </p>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-1">
                          <span>{t.type}</span>
                          <span>•</span>
                          <span>{new Date(t.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* KP Generator Modal */}
      {isKPModalOpen && (
        <KPGeneratorModal
          dealId={deal.id}
          dealTitle={deal.title}
          contactName={deal.contact?.name || 'Керівник підприємства'}
          companyName={deal.company?.name || 'ТОВ "Підприємство"'}
          onClose={() => setIsKPModalOpen(false)}
        />
      )}

      {/* Objections Scripts Modal */}
      {isObjectionsModalOpen && (
        <ObjectionsCheatSheetModal
          onClose={() => setIsObjectionsModalOpen(false)}
          onApplyScript={(scriptText) => {
            setChatMessageText(scriptText);
            setActiveTab('chat');
            setIsObjectionsModalOpen(false);
          }}
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
          callType={chatChannel === 'whatsapp' ? 'whatsapp' : 'telegram'}
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

      {/* Google Gemini AI Recruiter Assistant Modal */}
      {isGeminiModalOpen && (
        <GeminiModal
          isOpen={isGeminiModalOpen}
          onClose={() => setIsGeminiModalOpen(false)}
          dealTitle={deal.title}
          companyName={deal.company?.name || deal.title}
          onInsertNote={async (text) => {
            try {
              await api.post(`/deals/${deal.id}/notes`, { content: text });
              fetchDealDetails();
            } catch (e) {
              console.error('Failed to insert AI note:', e);
            }
          }}
        />
      )}
    </div>
  );
};
