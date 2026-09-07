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
  Maximize2,
  Minimize2,
  Link2,
  Copy,
  CheckSquare,
  Loader2
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
import { SlashCommandsPopup } from '../chat/SlashCommandsPopup';
import { CannedResponse } from '../../constants/cannedResponses';

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
  const [activeMobileTab, setActiveMobileTab] = useState<'chat' | 'info' | 'tasks_notes'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Deep Linking & Fullscreen Workspace State
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleCopyDealLink = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!deal) return;
    const dealUrl = `${window.location.origin}/deals/${deal.id}`;
    navigator.clipboard.writeText(dealUrl);
    setIsCopiedLink(true);
    setTimeout(() => setIsCopiedLink(false), 2500);
  };

  const [copiedItemTextId, setCopiedItemTextId] = useState<string | null>(null);
  const handleCopyText = (id: string, text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedItemTextId(id);
    setTimeout(() => setCopiedItemTextId(null), 2000);
  };
  
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
  const noteTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  
  // New Chat Message input
  const [chatChannel, setChatChannel] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [chatMessageText, setChatMessageText] = useState('');
  const chatTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const quickNoteTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(soundService.isEnabled());

  // Auto-expand chat input proportionally to typed/generated text
  useEffect(() => {
    if (chatTextareaRef.current) {
      chatTextareaRef.current.style.height = 'auto';
      const scrollHeight = chatTextareaRef.current.scrollHeight;
      chatTextareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 40), 220)}px`;
    }
  }, [chatMessageText]);

  // Auto-expand internal note input proportionally to typed text
  useEffect(() => {
    if (noteTextareaRef.current) {
      noteTextareaRef.current.style.height = 'auto';
      const scrollHeight = noteTextareaRef.current.scrollHeight;
      noteTextareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 48), 180)}px`;
    }
  }, [noteText]);

  // Auto-expand quick note input in right sidebar proportionally to dictated/typed text
  useEffect(() => {
    if (quickNoteTextareaRef.current) {
      quickNoteTextareaRef.current.style.height = 'auto';
      const scrollHeight = quickNoteTextareaRef.current.scrollHeight;
      quickNoteTextareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 48), 180)}px`;
    }
  }, [quickNoteText]);

  // AI Smart Assistant states
  const [isGeneratingAiDraft, setIsGeneratingAiDraft] = useState(false);
  const [aiDealScore, setAiDealScore] = useState<{ score: number; temperature: string; reason: string; nextAction: string } | null>(null);
  const [isScoringDeal, setIsScoringDeal] = useState(false);

  const handleGenerateAiDraft = async (intent: 'followup' | 'kp_offer' | 'meeting' | 'polite_reminder' = 'followup') => {
    if (!deal) return;
    setIsGeneratingAiDraft(true);
    try {
      const res = await api.post('/ai/draft-reply', {
        clientName: deal.contact?.name,
        stageName: deal.stage?.name,
        dealTitle: deal.title,
        lastMessage: messages.length > 0 ? messages[messages.length - 1].text : undefined,
        intent
      });
      if (res.data?.draft) {
        setChatMessageText(res.data.draft);
      }
    } catch (e) {
      console.warn('AI draft error:', e);
    } finally {
      setIsGeneratingAiDraft(false);
    }
  };

  const handleScoreDeal = async () => {
    if (!deal) return;
    setIsScoringDeal(true);
    try {
      const daysSince = Math.max(1, Math.round((Date.now() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
      const res = await api.post('/ai/deal-score', {
        title: deal.title,
        budget: deal.budget,
        stageName: deal.stage?.name,
        daysSinceCreation: daysSince,
        hasTasks: deal.tasks && deal.tasks.length > 0,
        hasNotes: deal.notes && deal.notes.length > 0
      });
      setAiDealScore(res.data);
    } catch (e) {
      console.warn('AI deal score error:', e);
    } finally {
      setIsScoringDeal(false);
    }
  };

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

  // Dynamic Custom Fields state (Twenty CRM benchmark)
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

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

  // Slash commands state
  const [slashFilter, setSlashFilter] = useState<string | null>(null);
  const [editContactPosition, setEditContactPosition] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);

  // Quick Notes state (right column)
  const [quickNoteText, setQuickNoteText] = useState('');
  const [isSavingQuickNote, setIsSavingQuickNote] = useState(false);
  const [isDictatingQuickNote, setIsDictatingQuickNote] = useState(false);
  const quickNoteRecognitionRef = useRef<any>(null);

  // Direct Company Editing state
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editCompanyAddress, setEditCompanyAddress] = useState('');
  const [editCompanyPhone, setEditCompanyPhone] = useState('');
  const [editCompanyEmail, setEditCompanyEmail] = useState('');
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  // Order / Vacancy Needs state
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editOrderPosition, setEditOrderPosition] = useState('');
  const [editOrderCount, setEditOrderCount] = useState('');
  const [editOrderSalary, setEditOrderSalary] = useState('');
  const [editOrderHousing, setEditOrderHousing] = useState('');
  const [editOrderLocation, setEditOrderLocation] = useState('');
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Sidebar Documents category
  const [sidebarDocCategory, setSidebarDocCategory] = useState<'Договір з підприємством' | 'Заявка на персонал' | 'Акт виконаних робіт' | 'Інше'>('Договір з підприємством');

  // Requisition AI Parser & Document Slots state
  const [isAiRequisitionModalOpen, setIsAiRequisitionModalOpen] = useState(false);
  const [aiRequisitionInputText, setAiRequisitionInputText] = useState('');
  const [isParsingRequisition, setIsParsingRequisition] = useState(false);
  const [isUploadingSlotDoc, setIsUploadingSlotDoc] = useState<string | null>(null);
  const reqFileInputRef = useRef<HTMLInputElement | null>(null);
  const contractFileInputRef = useRef<HTMLInputElement | null>(null);
  const receiptFileInputRef = useRef<HTMLInputElement | null>(null);


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

  const handleDeleteNote = async (noteId: string) => {
    if (!deal || !window.confirm('Видалити цю замітку?')) return;
    try {
      await api.delete(`/deals/${deal.id}/notes/${noteId}`);
      const updatedNotes = (deal.notes || []).filter((n: any) => n.id !== noteId);
      const updatedDeal = { ...deal, notes: updatedNotes };
      setDeal(updatedDeal);
      onDealUpdated(updatedDeal);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Помилка видалення замітки');
    }
  };

  const toggleQuickNoteDictation = () => {
    if (isDictatingQuickNote) {
      if (quickNoteRecognitionRef.current) quickNoteRecognitionRef.current.stop();
      setIsDictatingQuickNote(false);
    } else {
      setIsDictatingQuickNote(true);
      const instance = startSpeechToText({
        language: 'uk-UA',
        onResult: (text) => {
          setQuickNoteText(text);
        },
        onError: () => setIsDictatingQuickNote(false),
        onEnd: () => setIsDictatingQuickNote(false)
      });
      quickNoteRecognitionRef.current = instance;
    }
  };

  const handleStartEditCompany = () => {
    setEditCompanyName(deal?.company?.name || '');
    setEditCompanyAddress(deal?.company?.address || '');
    setEditCompanyPhone(deal?.company?.phone || '');
    setEditCompanyEmail(deal?.company?.email || '');
    setIsEditingCompany(true);
  };

  const handleSaveCompany = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editCompanyName.trim() || !deal) {
      alert('Вкажіть назву підприємства');
      return;
    }
    setIsSavingCompany(true);
    try {
      const res = await api.put(`/deals/${deal.id}`, {
        companyData: {
          name: editCompanyName.trim(),
          address: editCompanyAddress.trim() || undefined,
          phone: editCompanyPhone.trim() || undefined,
          email: editCompanyEmail.trim() || undefined
        }
      });
      setDeal(res.data);
      onDealUpdated(res.data);
      setIsEditingCompany(false);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Помилка збереження підприємства');
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleStartEditOrder = () => {
    const ord = (customFieldsObj as any)?.orderInfo || {};
    setEditOrderPosition(ord.position || deal?.title || '');
    setEditOrderCount(ord.count || '');
    setEditOrderSalary(ord.salary || '');
    setEditOrderHousing(ord.housing || '');
    setEditOrderLocation(ord.location || '');
    setIsEditingOrder(true);
  };

  const handleSaveOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!deal) return;
    setIsSavingOrder(true);
    try {
      const newOrder = {
        position: editOrderPosition.trim(),
        count: editOrderCount.trim(),
        salary: editOrderSalary.trim(),
        housing: editOrderHousing.trim(),
        location: editOrderLocation.trim()
      };
      const newCustomFields = { ...customFieldsObj, orderInfo: newOrder };
      const res = await api.put(`/deals/${deal.id}`, { customFields: newCustomFields });
      setDeal(res.data);
      onDealUpdated(res.data);
      setIsEditingOrder(false);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Помилка збереження замовлення');
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleUpdateContractStatus = async (status: string) => {
    if (!deal) return;
    const newCustomFields = { ...customFieldsObj, contractStatus: status };
    try {
      const res = await api.put(`/deals/${deal.id}`, { customFields: newCustomFields });
      setDeal(res.data);
      onDealUpdated(res.data);
      const label = 
        status === 'sent_unsigned' ? 'Надіслано клієнту (Очікує підпису)' :
        status === 'signed_unpaid' ? 'Підписано клієнтом (Очікує оплати)' :
        status === 'signed_active' ? 'Підписано та діє' : 'Не надіслано';
      await api.post(`/deals/${deal.id}/notes`, {
        content: `⚖️ Статус договору змінено на: "${label}"`,
        type: 'status_change'
      }).catch(() => {});
    } catch (err) {
      console.error('Failed to update contract status:', err);
    }
  };

  const handleUpdatePaymentStatus = async (status: string) => {
    if (!deal) return;
    const newCustomFields = { ...customFieldsObj, paymentStatus: status };
    try {
      const res = await api.put(`/deals/${deal.id}`, { customFields: newCustomFields });
      setDeal(res.data);
      onDealUpdated(res.data);
      const label = status === 'paid' ? 'Оплачено (Підтверджено)' : 'Очікує оплати';
      await api.post(`/deals/${deal.id}/notes`, {
        content: `💳 Статус оплати змінено на: "${label}"`,
        type: 'status_change'
      }).catch(() => {});
    } catch (err) {
      console.error('Failed to update payment status:', err);
    }
  };

  const handleUploadSlotDoc = async (category: 'requisition' | 'contract' | 'receipt', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !deal) return;

    setIsUploadingSlotDoc(category);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const catLabel = 
        category === 'requisition' ? 'Заявка на персонал (Бриф)' :
        category === 'contract' ? 'Договір з підприємством' :
        'Чек / Підтвердження оплати';

      const newDoc: DocumentItem = {
        id: `doc-${Date.now()}`,
        name: file.name,
        url: uploadRes.data.url,
        category: catLabel,
        mimeType: file.type || 'application/pdf',
        sizeKb: uploadRes.data.sizeKb || Math.round(file.size / 1024),
        uploadedAt: uploadRes.data.uploadedAt || new Date().toISOString()
      };

      const updatedDocs = [newDoc, ...documentsList];
      const newCustomFields: any = { 
        ...customFieldsObj, 
        documents: updatedDocs,
        [`${category}Doc`]: newDoc
      };

      if (category === 'contract' && !newCustomFields.contractStatus) {
        newCustomFields.contractStatus = 'sent_unsigned';
      }
      if (category === 'receipt') {
        newCustomFields.paymentStatus = 'paid';
      }

      const res = await api.put(`/deals/${deal.id}`, { customFields: newCustomFields });
      setDeal(res.data);
      onDealUpdated(res.data);

      await api.post(`/deals/${deal.id}/notes`, {
        content: `📎 Завантажено документ [${catLabel}]: "${file.name}"`,
        type: 'system'
      }).catch(() => {});
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Помилка завантаження файлу');
    } finally {
      setIsUploadingSlotDoc(null);
      e.target.value = '';
    }
  };

  const handleParseRequisitionSubmit = async (text?: string) => {
    const textToAnalyze = text || aiRequisitionInputText;
    if (!textToAnalyze.trim()) {
      alert('Будь ласка, введіть або вставте текст заявки роботодавця');
      return;
    }

    if (!deal) return;
    setIsParsingRequisition(true);
    try {
      const res = await api.post('/ai/parse-requisition', { text: textToAnalyze.trim() });
      const parsed = res.data;
      if (parsed) {
        const updatedOrder = {
          position: parsed.positions || editOrderPosition || '',
          count: parsed.headcount ? String(parsed.headcount) : editOrderCount || '',
          salary: parsed.salary || editOrderSalary || '',
          housing: parsed.housing || editOrderHousing || '',
          location: parsed.location || editOrderLocation || '',
          requirements: parsed.requirements || ''
        };

        let companyUpdate: any = {};
        if (parsed.companyName && !deal.company && !deal.companyId) {
          try {
            const compRes = await api.post('/companies', {
              name: parsed.companyName,
              address: parsed.location,
              notes: `Галузь: ${parsed.industry || '-'}. Створено через ШІ-парсинг заявки.`
            });
            if (compRes.data?.id) {
              companyUpdate.companyId = compRes.data.id;
            }
          } catch (compErr) {}
        }

        const newCustomFields = {
          ...customFieldsObj,
          orderInfo: updatedOrder,
          requisitionSummary: parsed.summary || ''
        };

        const updatePayload: any = {
          customFields: newCustomFields,
          ...companyUpdate
        };

        if (parsed.positions && (!deal.title || deal.title.startsWith('Угода') || deal.title.startsWith('Нова'))) {
          updatePayload.title = `${parsed.positions} (${parsed.headcount || 1} чол.)`;
        }

        const resDeal = await api.put(`/deals/${deal.id}`, updatePayload);
        setDeal(resDeal.data);
        onDealUpdated(resDeal.data);

        setEditOrderPosition(updatedOrder.position);
        setEditOrderCount(updatedOrder.count);
        setEditOrderSalary(updatedOrder.salary);
        setEditOrderHousing(updatedOrder.housing);
        setEditOrderLocation(updatedOrder.location);

        setIsAiRequisitionModalOpen(false);
        setAiRequisitionInputText('');

        await api.post(`/deals/${deal.id}/notes`, {
          content: `✨ ШІ успішно розпізнав заявку роботодавця:\n• Посади: ${parsed.positions}\n• Кількість: ${parsed.headcount} чол.\n• Ставка: ${parsed.salary}\n• Житло: ${parsed.housing}\n• Локація: ${parsed.location}`,
          type: 'system'
        }).catch(() => {});

        alert(`✨ ШІ успішно розпізнав заявку та оновив параметри угоди!`);
      }
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Помилка при розпізнаванні заявки');
    } finally {
      setIsParsingRequisition(false);
    }
  };

  const handlePromoteDealToCompany = async () => {
    if (!deal) return;
    const ord = (customFieldsObj as any)?.orderInfo || {};
    const compName = deal.company?.name || editCompanyName || deal.contact?.name || deal.title;
    if (!compName) {
      alert('Вкажіть назву підприємства перед внесенням до бази');
      return;
    }

    try {
      let compId = deal.companyId;
      if (!compId) {
        const compRes = await api.post('/companies', {
          name: compName,
          address: ord.location || deal.company?.address || undefined,
          phone: deal.contact?.phone || undefined,
          email: deal.contact?.email || undefined,
          notes: `Потреба: ${ord.position || '-'}, ${ord.count || '-'} чол., ставка ${ord.salary || '-'}. Офіційно внесено після підтвердження оплати.`
        });
        compId = compRes.data?.id;
      }

      const newCustomFields = {
        ...customFieldsObj,
        paymentStatus: 'paid',
        contractStatus: (customFieldsObj as any).contractStatus === 'not_sent' ? 'signed_active' : ((customFieldsObj as any).contractStatus || 'signed_active')
      };

      const res = await api.put(`/deals/${deal.id}`, {
        companyId: compId,
        customFields: newCustomFields
      });

      setDeal(res.data);
      onDealUpdated(res.data);

      await api.post(`/deals/${deal.id}/notes`, {
        content: `💎 Підприємство "${compName}" офіційно підтверджено та внесено до реєстру після підтвердження оплати.`,
        type: 'status_change'
      }).catch(() => {});

      alert(`💎 Підприємство "${compName}" успішно внесено до офіційного реєстру роботодавців!`);
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Не вдалося внести підприємство');
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
  let customFieldsObj: Record<string, any> = {};
  try {
    customFieldsObj = typeof deal?.customFields === 'string' ? JSON.parse(deal.customFields) : (deal?.customFields || {});
  } catch (e) {
    customFieldsObj = {};
  }

  const visibleCustomFields = Object.entries(customFieldsObj).filter(
    ([k]) => k !== 'candidates' && k !== 'paidMilestones' && k !== 'orderInfo' && k !== 'documents' && k !== 'employerOrder'
  );

  const handleSaveCustomField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldKey.trim() || !newFieldValue.trim() || !deal) return;
    const updatedFields = {
      ...customFieldsObj,
      [newFieldKey.trim()]: newFieldValue.trim()
    };
    try {
      const res = await api.put(`/deals/${deal.id}`, { customFields: JSON.stringify(updatedFields) });
      setDeal(res.data);
      onDealUpdated(res.data);
      setNewFieldKey('');
      setNewFieldValue('');
      setIsAddingField(false);
    } catch (err) {
      console.error('Failed to save custom field:', err);
    }
  };

  const handleDeleteCustomField = async (keyToDelete: string) => {
    if (!deal) return;
    const updatedFields = { ...customFieldsObj };
    delete updatedFields[keyToDelete];
    try {
      const res = await api.put(`/deals/${deal.id}`, { customFields: JSON.stringify(updatedFields) });
      setDeal(res.data);
      onDealUpdated(res.data);
    } catch (err) {
      console.error('Failed to delete custom field:', err);
    }
  };

  let tagsList: string[] = [];
  try {
    tagsList = Array.isArray(deal?.tags) ? deal.tags : (typeof deal?.tags === 'string' ? JSON.parse(deal.tags) : []);
  } catch (e) {
    tagsList = [];
  }

  const timelineItems = [
    ...(deal?.notes || []).map((n: any) => ({ ...n, itemType: 'note', timestamp: new Date(n.createdAt).getTime() })),
    ...(deal?.messages || []).map((m: any) => ({ ...m, itemType: 'message', timestamp: new Date(m.createdAt).getTime() }))
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
      let dbCandidates: any[] = [];
      try {
        const contactsRes = await api.get('/contacts', { params: { type: 'candidate', limit: 100 } });
        if (Array.isArray(contactsRes.data)) {
          dbCandidates = contactsRes.data.map((c: any) => ({
            id: c.id,
            name: c.name,
            country: c.country || c.citizenship || 'Узбекистан',
            profession: c.profession || c.position || 'Спеціаліст',
            status: c.status || 'Кваліфіковано / Резюме',
            experienceYears: c.experienceYears,
            skills: c.skills
          }));
        }
      } catch (fetchErr) {
        console.warn('Could not fetch real db candidates:', fetchErr);
      }

      // Fallback pool if database is still fresh / empty
      const fallbackPool = [
        { id: 'cand-pool-1', name: 'Фарход Карімов', country: 'Узбекистан', profession: 'Зварювальник MIG/MAG 135/136', status: 'Віза D готова' },
        { id: 'cand-pool-2', name: 'Раджеш Кумар', country: 'Індія', profession: 'Оператор CNC / токар', status: 'Оформлення візи D' },
        { id: 'cand-pool-3', name: 'Азізбек Норматов', country: 'Узбекистан', profession: 'Слюсар-складальник металоконструкцій', status: 'Кваліфіковано' },
        { id: 'cand-pool-4', name: 'Марк Дела Круз', country: 'Філіппіни', profession: 'Електрик промислового обладнання', status: 'Кваліфіковано' },
        { id: 'cand-pool-5', name: 'Нурлан Абдуллаєв', country: 'Азербайджан', profession: 'Водій навантажувача / карщик', status: 'Віза D готова' }
      ];

      const pool = [
        ...dbCandidates,
        ...(dbCandidates.length === 0 ? fallbackPool : []),
        ...assignedCandidates
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
      id: matchedCand.id || `cand-${Date.now()}`,
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

  const handleAddAllMatchedCandidates = async () => {
    const toAdd = matchedResults.filter(
      (m: any) => !assignedCandidates.some(c => c.name === m.name)
    );
    if (toAdd.length === 0) {
      alert('Усі підібрані кандидати вже додані до замовлення!');
      return;
    }
    const newItems = toAdd.map((m: any, idx: number) => ({
      id: m.id || `cand-${Date.now()}-${idx}`,
      name: m.name,
      country: m.country,
      profession: m.profession,
      status: m.status || 'Кваліфіковано / Підібрано ШІ',
      addedAt: new Date().toISOString()
    }));
    const updated = [...assignedCandidates, ...newItems];
    const newCustomFields = { ...customFieldsObj, candidates: updated };
    try {
      const res = await api.put(`/deals/${deal.id}`, { customFields: newCustomFields });
      setDeal(res.data);
      onDealUpdated(res.data);
    } catch (err) {
      console.error('Failed to add all matched candidates:', err);
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

  if (!deal) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 font-['Inter',sans-serif]">
        <div className="bg-slate-900 border border-white/15 rounded-3xl p-8 flex flex-col items-center gap-4 text-white shadow-2xl max-w-sm w-full animate-in fade-in zoom-in-95">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="font-bold text-base text-white">Картка клієнта</h3>
            <p className="text-xs text-slate-400">Синхронізація даних угоди та підприємства...</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full mt-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-white/10 transition"
          >
            Закрити
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center ${isFullscreen ? 'p-0' : 'p-0 sm:p-4'} font-['Inter',sans-serif]`}>
      <div className={`bg-white dark:bg-[#0c111d] border-0 sm:border border-slate-200 dark:border-white/[0.1] flex flex-col shadow-2xl overflow-hidden transition-all duration-200 ${
        isFullscreen ? 'w-full h-full rounded-none' : 'w-full h-full sm:rounded-2xl sm:max-w-6xl sm:h-[92vh] animate-in fade-in zoom-in-95 duration-150'
      }`}>
        
        {/* Modal Top Bar */}
        <div className="h-14 px-3 sm:px-6 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between bg-slate-50/90 dark:bg-[#0f1526]/90 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <h2 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white truncate max-w-[130px] sm:max-w-md">
              {deal.title}
            </h2>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono text-[11px] sm:text-sm px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg whitespace-nowrap">
              €{new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(deal.budget || 0)}
            </span>
          </div>

          {/* Quick Action Tools: Direct Link, Open in Tab, Fullscreen, Call, AI, KP, Calc */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* 1-Click Copy Shareable Deal URL */}
            <button
              onClick={handleCopyDealLink}
              className="hidden sm:flex px-2.5 sm:px-3 py-1 bg-slate-200/70 hover:bg-slate-300/80 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 border border-slate-300/70 dark:border-white/10 rounded-lg text-xs font-semibold items-center gap-1.5 transition active:scale-95"
              title="Скопіювати пряме посилання на цю угоду"
            >
              {isCopiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Скопійовано!</span>
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden md:inline">Пряме посилання</span>
                </>
              )}
            </button>

            {/* Open Deal in New Tab */}
            <a
              href={`/deals/${deal.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.08] rounded-lg transition"
              title="Відкрити в окремій вкладці браузера"
            >
              <ExternalLink className="w-4 h-4" strokeWidth={1.75} />
            </a>

            {/* Fullscreen Workspace Toggle */}
            <button
              onClick={() => setIsFullscreen(prev => !prev)}
              className="hidden md:flex p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.08] rounded-lg transition"
              title={isFullscreen ? "Згорнути у вікно" : "Розгорнути на весь екран (Розвантажити фон)"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" strokeWidth={1.75} /> : <Maximize2 className="w-4 h-4" strokeWidth={1.75} />}
            </button>

            <div className="hidden sm:block w-[1px] h-4 bg-slate-300 dark:bg-white/10 mx-0.5" />

            <button
              onClick={() => setIsCallModalOpen(true)}
              className="px-2 sm:px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
              title="Зателефонувати клієнту"
            >
              <Phone className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span className="hidden sm:inline">Зателефонувати</span>
            </button>

            <button
              onClick={() => setIsCalcModalOpen(true)}
              className="px-2 sm:px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
              title="Калькулятор найму"
            >
              <Calculator className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span className="hidden sm:inline">Калькулятор</span>
            </button>

            <button
              onClick={() => setIsKPModalOpen(true)}
              className="hidden sm:flex px-2.5 sm:px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/20 rounded-lg text-xs font-semibold items-center gap-1.5 transition active:scale-95"
            >
              <FileText className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>КП (PDF)</span>
            </button>

            <button
              onClick={handleScoreDeal}
              disabled={isScoringDeal}
              className={`px-2 sm:px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 border ${
                aiDealScore 
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm'
                  : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 border-purple-500/20'
              }`}
              title={aiDealScore ? `${aiDealScore.reason}. Наступна дія: ${aiDealScore.nextAction}` : "ШІ-оцінка здоров'я угоди та ймовірності виграшу"}
            >
              <Sparkles className={`w-3.5 h-3.5 text-purple-400 ${isScoringDeal ? 'animate-spin' : ''}`} strokeWidth={1.75} />
              <span className="hidden sm:inline">{aiDealScore ? `${aiDealScore.temperature} (${aiDealScore.score}%)` : (isScoringDeal ? 'Оцінка...' : 'ШІ-Скоринг')}</span>
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
        <div className="px-3 sm:px-6 py-2 bg-slate-100/80 dark:bg-[#080c14] border-b border-slate-200/80 dark:border-white/[0.08] flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-shrink-0">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mr-1 flex-shrink-0">
            Етап:
          </span>
          {currentStages.map((stage) => {
            const isCurrent = deal.stageId === stage.id;
            return (
              <button
                key={stage.id}
                onClick={() => handleStageChange(stage.id)}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0 ${
                  isCurrent
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-white/[0.04] hover:bg-slate-200/70 dark:hover:bg-white/[0.08] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08]'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: stage.color || '#3b82f6' }}
                />
                <span className="whitespace-nowrap">{stage.name}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile Navigation Tabs (Phone/Tablet portrait): Chat | Info | Tasks */}
        <div className="md:hidden flex items-center bg-slate-100 dark:bg-[#0b101d] border-b border-slate-200 dark:border-white/[0.08] p-1.5 gap-1.5 text-xs flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveMobileTab('chat')}
            className={`flex-1 py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition text-xs font-semibold ${
              activeMobileTab === 'chat'
                ? 'bg-blue-600 text-white shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white/70 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.05]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
            <span className="truncate">Чат ({(deal?.messages || []).length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileTab('info')}
            className={`flex-1 py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition text-xs font-semibold ${
              activeMobileTab === 'info'
                ? 'bg-blue-600 text-white shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white/70 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.05]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-purple-400" />
            <span className="truncate">Інфо / Потреба</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileTab('tasks_notes')}
            className={`flex-1 py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition text-xs font-semibold ${
              activeMobileTab === 'tasks_notes'
                ? 'bg-blue-600 text-white shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white/70 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.05]'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
            <span className="truncate">Задачі ({(deal?.tasks || []).length})</span>
          </button>
        </div>

        {/* 3-Column Content Layout */}
        <div className="flex-1 grid grid-cols-12 overflow-hidden bg-white dark:bg-[#0c111d] min-h-0">
          
          {/* Left Column: Client & Project Params (3 Cols) */}
          <div className={`col-span-12 md:col-span-3 border-r border-slate-200/80 dark:border-white/[0.08] p-4 sm:p-5 overflow-y-auto space-y-4 sm:space-y-5 bg-slate-50/50 dark:bg-[#090d16]/50 text-xs h-full ${
            activeMobileTab === 'info' ? 'block' : 'hidden md:block'
          }`}>
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

            {/* Company Info with 1-Click Inline Editing */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Підприємство / Завод
                </label>
                {deal.company ? (
                  <button
                    type="button"
                    onClick={handleStartEditCompany}
                    className="p-1 text-slate-400 hover:text-purple-400 rounded-lg hover:bg-slate-800 transition flex items-center gap-1 text-[11px]"
                    title="Редагувати дані підприємства"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Редагувати</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartEditCompany}
                    className="p-1 text-purple-400 hover:text-purple-300 rounded-lg hover:bg-slate-800 transition flex items-center gap-1 text-[11px] font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Додати</span>
                  </button>
                )}
              </div>

              {isEditingCompany ? (
                <form onSubmit={handleSaveCompany} className="bg-slate-900 border border-purple-500/40 rounded-2xl p-3.5 space-y-2.5 animate-in fade-in">
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Назва підприємства / заводу</label>
                    <input
                      type="text"
                      placeholder="ТОВ 'Промбуд Схід' / Budimex S.A."
                      value={editCompanyName}
                      onChange={(e) => setEditCompanyName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Адреса / Місто / Країна</label>
                    <input
                      type="text"
                      placeholder="Польща, м. Вроцлав, вул. Fabryczna 10"
                      value={editCompanyAddress}
                      onChange={(e) => setEditCompanyAddress(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Телефон</label>
                      <input
                        type="text"
                        placeholder="+48..."
                        value={editCompanyPhone}
                        onChange={(e) => setEditCompanyPhone(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Email</label>
                      <input
                        type="email"
                        placeholder="office@company.com"
                        value={editCompanyEmail}
                        onChange={(e) => setEditCompanyEmail(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingCompany(false)}
                      className="px-2.5 py-1 text-slate-400 hover:text-white text-xs"
                    >
                      Скасувати
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingCompany}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isSavingCompany ? 'Збереження...' : 'Зберегти'}</span>
                    </button>
                  </div>
                </form>
              ) : deal.company ? (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                  <div className="font-bold text-sm text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span className="truncate">{deal.company.name}</span>
                  </div>
                  {deal.company.address && (
                    <div className="text-xs text-slate-300 flex items-start gap-1.5">
                      <Globe2 className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span className="leading-snug">{deal.company.address}</span>
                    </div>
                  )}
                  {deal.company.phone && (
                    <div className="text-xs text-slate-300 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>{deal.company.phone}</span>
                    </div>
                  )}
                  {deal.company.email && (
                    <div className="text-xs text-slate-300 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span className="truncate">{deal.company.email}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-slate-900/60 border border-dashed border-slate-700 rounded-2xl text-center space-y-2">
                  <p className="text-xs text-slate-500 italic">Компанію ще не прив'язано</p>
                  <button
                    type="button"
                    onClick={handleStartEditCompany}
                    className="px-3 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-semibold transition"
                  >
                    + Додати підприємство
                  </button>
                </div>
              )}
            </div>

            {/* Order / Vacancy Needs Parameters (Editable on the fly) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Замовлення / Потреба
                </label>
                <button
                  type="button"
                  onClick={handleStartEditOrder}
                  className="p-1 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition flex items-center gap-1 text-[11px]"
                  title="Редагувати параметри замовлення"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Редагувати</span>
                </button>
              </div>

              {isEditingOrder ? (
                <form onSubmit={handleSaveOrder} className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-3.5 space-y-2.5 animate-in fade-in">
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Посада / Спеціальність</label>
                    <input
                      type="text"
                      placeholder="Зварювальник MIG/MAG, Арматурник..."
                      value={editOrderPosition}
                      onChange={(e) => setEditOrderPosition(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Кількість людей</label>
                      <input
                        type="text"
                        placeholder="10 осіб"
                        value={editOrderCount}
                        onChange={(e) => setEditOrderCount(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Ставка / Оплата</label>
                      <input
                        type="text"
                        placeholder="25 PLN/год або €14/год"
                        value={editOrderSalary}
                        onChange={(e) => setEditOrderSalary(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Житло / Умови</label>
                      <input
                        type="text"
                        placeholder="Безкоштовно / €100/міс"
                        value={editOrderHousing}
                        onChange={(e) => setEditOrderHousing(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Локація / Місто</label>
                      <input
                        type="text"
                        placeholder="Вроцлав / Варшава"
                        value={editOrderLocation}
                        onChange={(e) => setEditOrderLocation(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingOrder(false)}
                      className="px-2.5 py-1 text-slate-400 hover:text-white text-xs"
                    >
                      Скасувати
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingOrder}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isSavingOrder ? 'Збереження...' : 'Зберегти'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white truncate">
                      {(customFieldsObj as any)?.orderInfo?.position || deal.title || 'Посада не вказана'}
                    </span>
                    {(customFieldsObj as any)?.orderInfo?.count && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold border border-emerald-500/30">
                        {(customFieldsObj as any)?.orderInfo?.count}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                    <div className="bg-slate-800/60 p-1.5 rounded-lg border border-slate-700/50">
                      <span className="text-[9px] text-slate-400 block uppercase">Ставка:</span>
                      <span className="font-semibold text-emerald-300">
                        {(customFieldsObj as any)?.orderInfo?.salary || 'За домовленістю'}
                      </span>
                    </div>
                    <div className="bg-slate-800/60 p-1.5 rounded-lg border border-slate-700/50">
                      <span className="text-[9px] text-slate-400 block uppercase">Житло:</span>
                      <span className="font-semibold text-slate-200">
                        {(customFieldsObj as any)?.orderInfo?.housing || 'Уточнюється'}
                      </span>
                    </div>
                  </div>
                  {(customFieldsObj as any)?.orderInfo?.location && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-0.5">
                      <Globe2 className="w-3 h-3 text-slate-500" />
                      <span>{(customFieldsObj as any)?.orderInfo?.location}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dedicated Documents & Contract Execution Block */}
            <div className="space-y-2.5 p-3.5 bg-slate-900/90 border border-blue-500/25 rounded-2xl">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-extrabold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Документи та оформлення</span>
                </label>
                <span className="text-[10px] text-slate-400 font-semibold">3 ключові слоти</span>
              </div>

              {/* Slot 1: Employer Requisition (Заявка / Бриф) */}
              <div className="p-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white flex items-center gap-1">
                      <span>📋 Заявка / Бриф роботодавця</span>
                    </span>
                  </div>
                  {((customFieldsObj as any).requisitionDoc || documentsList.find(d => d.category.includes('Заявка'))) ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" /> Прикріплено
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-700/60 text-slate-400">
                      Не прикріплено
                    </span>
                  )}
                </div>

                {/* Attached file link if exists */}
                {(() => {
                  const reqDoc = (customFieldsObj as any).requisitionDoc || documentsList.find(d => d.category.includes('Заявка'));
                  if (!reqDoc) return null;
                  return (
                    <div className="p-2 bg-slate-900/90 border border-slate-700/60 rounded-lg flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="font-semibold text-slate-200 truncate">{reqDoc.name}</span>
                        <span className="text-[10px] text-slate-500">({reqDoc.sizeKb} KB)</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={resolveMediaUrl(reqDoc.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 text-[10px] font-bold rounded flex items-center gap-1 transition"
                        >
                          <Download className="w-3 h-3" />
                          <span>Файл</span>
                        </a>
                      </div>
                    </div>
                  );
                })()}

                {/* Action buttons for Requisition */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <label className="flex-1 cursor-pointer py-1.5 px-2 bg-slate-700/70 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold text-center transition flex items-center justify-center gap-1">
                    <UploadCloud className="w-3 h-3 text-blue-400" />
                    <span>{isUploadingSlotDoc === 'requisition' ? 'Завантаження...' : '+ Файл заявки'}</span>
                    <input
                      ref={reqFileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => handleUploadSlotDoc('requisition', e)}
                      disabled={isUploadingSlotDoc === 'requisition'}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsAiRequisitionModalOpen(true)}
                    className="flex-1 py-1.5 px-2 bg-gradient-to-r from-purple-600/30 to-blue-600/30 hover:from-purple-600/40 hover:to-blue-600/40 border border-purple-500/40 text-purple-200 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 active:scale-95 shadow-sm"
                    title="ШІ автоматично розпізнає посади, кількість людей, ставку та локацію"
                  >
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    <span>✨ ШІ-парсинг</span>
                  </button>
                </div>
              </div>

              {/* Slot 2: Cooperation Contract (Договір) */}
              <div className="p-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-white flex items-center gap-1">
                    <span>⚖️ Договір про співпрацю</span>
                  </span>
                  {/* Status Badge */}
                  {(() => {
                    const st = (customFieldsObj as any).contractStatus || 'not_sent';
                    if (st === 'signed_active') {
                      return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">🟢 Підписано та діє</span>;
                    }
                    if (st === 'signed_unpaid') {
                      return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">🔵 Підписано (Очікує оплати)</span>;
                    }
                    if (st === 'sent_unsigned') {
                      return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">🟡 Надіслано (Очікує)</span>;
                    }
                    return <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-700/60 text-slate-400">⚪ Не надіслано</span>;
                  })()}
                </div>

                {/* Attached Contract file */}
                {(() => {
                  const contractDoc = (customFieldsObj as any).contractDoc || documentsList.find(d => d.category.includes('Договір'));
                  if (!contractDoc) return null;
                  return (
                    <div className="p-2 bg-slate-900/90 border border-slate-700/60 rounded-lg flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="font-semibold text-slate-200 truncate">{contractDoc.name}</span>
                        <span className="text-[10px] text-slate-500">({contractDoc.sizeKb} KB)</span>
                      </div>
                      <a
                        href={resolveMediaUrl(contractDoc.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 text-[10px] font-bold rounded flex items-center gap-1 transition shrink-0"
                      >
                        <Download className="w-3 h-3" />
                        <span>Файл</span>
                      </a>
                    </div>
                  );
                })()}

                {/* Controls: Change status & Upload contract */}
                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  <select
                    value={(customFieldsObj as any).contractStatus || 'not_sent'}
                    onChange={(e) => handleUpdateContractStatus(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-[10px] font-bold text-purple-300 focus:outline-none cursor-pointer"
                  >
                    <option value="not_sent">⚪ Не надіслано</option>
                    <option value="sent_unsigned">🟡 Надіслано клієнту</option>
                    <option value="signed_unpaid">🔵 Підписано (Без оплати)</option>
                    <option value="signed_active">🟢 Підписано та діє</option>
                  </select>

                  <label className="cursor-pointer py-1.5 px-2 bg-slate-700/70 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[10px] font-semibold text-center transition flex items-center justify-center gap-1">
                    <UploadCloud className="w-3 h-3 text-purple-400" />
                    <span>{isUploadingSlotDoc === 'contract' ? 'Завантаження...' : '+ Файл договору'}</span>
                    <input
                      ref={contractFileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => handleUploadSlotDoc('contract', e)}
                      disabled={isUploadingSlotDoc === 'contract'}
                      accept=".pdf,.doc,.docx"
                    />
                  </label>
                </div>
              </div>

              {/* Slot 3: Payment Receipt / Check (Чек / Оплата) */}
              <div className="p-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-white flex items-center gap-1">
                    <span>💳 Чек / Підтвердження оплати</span>
                  </span>
                  {/* Status Badge */}
                  {(() => {
                    const isPaid = (customFieldsObj as any).paymentStatus === 'paid';
                    return isPaid ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        🟢 Оплачено
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        ⚪ Очікує оплати
                      </span>
                    );
                  })()}
                </div>

                {/* Attached Receipt file */}
                {(() => {
                  const receiptDoc = (customFieldsObj as any).receiptDoc || documentsList.find(d => d.category.includes('Чек') || d.category.includes('Рахунок'));
                  if (!receiptDoc) return null;
                  return (
                    <div className="p-2 bg-slate-900/90 border border-slate-700/60 rounded-lg flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-semibold text-slate-200 truncate">{receiptDoc.name}</span>
                        <span className="text-[10px] text-slate-500">({receiptDoc.sizeKb} KB)</span>
                      </div>
                      <a
                        href={resolveMediaUrl(receiptDoc.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-[10px] font-bold rounded flex items-center gap-1 transition shrink-0"
                      >
                        <Download className="w-3 h-3" />
                        <span>Чек</span>
                      </a>
                    </div>
                  );
                })()}

                {/* Upload receipt button + Status toggle */}
                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  <select
                    value={(customFieldsObj as any).paymentStatus || 'unpaid'}
                    onChange={(e) => handleUpdatePaymentStatus(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-[10px] font-bold text-emerald-300 focus:outline-none cursor-pointer"
                  >
                    <option value="unpaid">⚪ Очікує оплати</option>
                    <option value="paid">🟢 Оплачено (Підтверджено)</option>
                  </select>

                  <label className="cursor-pointer py-1.5 px-2 bg-slate-700/70 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[10px] font-semibold text-center transition flex items-center justify-center gap-1">
                    <UploadCloud className="w-3 h-3 text-emerald-400" />
                    <span>{isUploadingSlotDoc === 'receipt' ? 'Завантаження...' : '+ Додати чек'}</span>
                    <input
                      ref={receiptFileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => handleUploadSlotDoc('receipt', e)}
                      disabled={isUploadingSlotDoc === 'receipt'}
                      accept=".pdf,.png,.jpg,.jpeg,.doc"
                    />
                  </label>
                </div>

                {/* Official Company Promotion Button */}
                <button
                  type="button"
                  onClick={handlePromoteDealToCompany}
                  className="w-full mt-1.5 py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 active:scale-95"
                  title="Офіційно створити або підтвердити підприємство в каталозі роботодавців"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                  <span>💎 Внести в офіційні підприємства (Оплачено)</span>
                </button>
              </div>
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
          <div className={`col-span-12 md:col-span-6 flex flex-col min-h-0 h-full bg-[#080c14] border-r border-slate-800/80 ${
            activeMobileTab === 'chat' ? 'flex' : 'hidden md:flex'
          }`}>
            {/* Timeline Filter tabs */}
            <div className="p-2 sm:p-3 border-b border-slate-800/80 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none bg-[#0e1320] flex-shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
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
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="text-[11px] font-bold text-slate-300">Найбільш відповідні кандидати з бази:</div>
                          <button
                            type="button"
                            onClick={handleAddAllMatchedCandidates}
                            className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition shadow-sm active:scale-95"
                            title="Додати всіх кандидатів з високим збігом до замовлення"
                          >
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            <span>⚡ Прикріпити всіх підібраних</span>
                          </button>
                        </div>
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
                            <div className={`flex items-center gap-1.5 max-w-[88%] sm:max-w-md ${isOutgoing ? 'flex-row-reverse' : 'flex-row'}`}>
                              <div
                                onClick={() => {
                                  if (isFile && item.mediaUrl) {
                                    setViewingMedia({
                                      url: resolveMediaUrl(item.mediaUrl),
                                      type: 'pdf',
                                      title: item.text.replace('📎 Файл: ', '').replace('📎 Файл TG: ', '')
                                    });
                                  }
                                }}
                                className={`p-3 sm:p-3.5 rounded-2xl text-xs leading-relaxed select-text cursor-text ${
                                  isOutgoing
                                    ? 'bg-blue-600 text-white rounded-tr-none shadow-md'
                                    : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-none'
                                } ${isFile ? 'border-2 border-amber-400/50 cursor-pointer hover:bg-slate-700/80 transition flex items-center gap-2' : ''}`}
                              >
                                {isFile && <FileText className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                                <span className="select-text whitespace-pre-wrap">{item.text}</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleCopyText(item.id, item.text, e)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white transition shadow-sm flex-shrink-0"
                                title={copiedItemTextId === item.id ? "Скопійовано!" : "Скопіювати текст"}
                              >
                                {copiedItemTextId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    }

                    const isAudit = item.type === 'status_change' || item.type === 'system';

                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl p-3 text-xs space-y-1.5 transition select-text cursor-text group/note relative ${
                          isAudit
                            ? 'bg-indigo-950/30 border border-indigo-500/30'
                            : 'bg-slate-900/80 border border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between text-slate-400">
                          <div className="flex items-center gap-1.5">
                            {isAudit ? (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-bold text-[10px] flex items-center gap-1 border border-indigo-500/30">
                                <span>🔄</span>
                                <span>Аудит / Історія змін</span>
                              </span>
                            ) : (
                              <span className="font-semibold text-slate-200">
                                {item.user?.name || 'Система'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500">
                              {new Date(item.createdAt).toLocaleString('uk-UA')}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleCopyText(item.id, item.text || item.content || '', e)}
                              className="opacity-0 group-hover/note:opacity-100 p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                              title={copiedItemTextId === item.id ? "Скопійовано!" : "Скопіювати замітку"}
                            >
                              {copiedItemTextId === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                        <p className={`leading-relaxed whitespace-pre-line select-text ${isAudit ? 'text-indigo-200 font-medium' : 'text-slate-300'}`}>
                          {item.text || item.content}
                        </p>
                      </div>
                    );
                  })
                )}
                {/* Scroll Anchor for instant scroll to newest message */}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Input / Message Bar */}
            <div className="p-3 sm:p-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] border-t border-slate-800/80 bg-[#0e1422] space-y-2.5 flex-shrink-0">
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

                  <form onSubmit={(e) => handleAddNote(e)} className="flex items-end gap-2">
                    <textarea
                      ref={noteTextareaRef}
                      rows={2}
                      placeholder="Надиктуйте голосом або напишіть замітку..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className={`flex-1 bg-slate-900 border rounded-2xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition resize-none leading-relaxed overflow-y-auto ${
                        isDictating ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-700 focus:border-amber-500'
                      }`}
                      style={{ minHeight: '48px', maxHeight: '180px' }}
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

                  {/* Quick Response Snippets with AI Auto-Draft */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleGenerateAiDraft('followup')}
                      disabled={isGeneratingAiDraft}
                      className="px-2.5 py-0.5 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 text-purple-300 border border-purple-500/40 rounded-lg transition flex items-center gap-1 flex-shrink-0 text-[10px] font-bold shadow-sm active:scale-95"
                      title="Згенерувати персоналізовану відповідь за контекстом угоди через Gemini AI"
                    >
                      <Sparkles className={`w-3 h-3 text-purple-400 ${isGeneratingAiDraft ? 'animate-spin' : ''}`} />
                      <span>{isGeneratingAiDraft ? 'Генерація...' : '✨ ШІ-чернетка'}</span>
                    </button>

                    <span className="text-[10px] text-slate-500 uppercase font-bold flex-shrink-0 ml-1">Шаблони:</span>
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

                  <div className="relative">
                    {slashFilter !== null && (
                      <SlashCommandsPopup
                        filterQuery={slashFilter}
                        onSelect={(item) => {
                          const newText = chatMessageText.replace(/(^|\s)(\/[^\s]*)$/, `$1${item.text}`);
                          setChatMessageText(newText);
                          setSlashFilter(null);
                        }}
                        onClose={() => setSlashFilter(null)}
                      />
                    )}

                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-end gap-2">
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
                        className="p-2.5 mb-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 border border-slate-700 rounded-2xl transition flex items-center justify-center flex-shrink-0"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        title="Надіслати відео (зустріч кандидата, огляд житла/заводу, візитка)"
                        className="p-2.5 mb-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-400 border border-slate-700 rounded-2xl transition flex items-center justify-center flex-shrink-0"
                      >
                        <Video className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsVoiceRecording(true)}
                        title="Записати голосове повідомлення"
                        className="p-2.5 mb-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700 rounded-2xl transition flex items-center justify-center flex-shrink-0"
                      >
                        <Mic className="w-4 h-4" />
                      </button>

                      <textarea
                        ref={chatTextareaRef}
                        rows={1}
                        placeholder={`Напишіть повідомлення клієнту в ${chatChannel === 'whatsapp' ? 'WhatsApp' : 'Telegram'}... (введіть / для швидких шаблонів, Enter — надіслати, Shift+Enter — новий рядок)`}
                        value={chatMessageText}
                        onChange={(e) => {
                          const val = e.target.value;
                          setChatMessageText(val);
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
                        className={`flex-1 bg-slate-900 border rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition resize-none leading-relaxed overflow-y-auto ${
                          isDictating ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-700 focus:border-blue-500'
                        }`}
                        style={{ minHeight: '40px', maxHeight: '220px' }}
                      />
                      <button
                        type="submit"
                        disabled={isSendingFile}
                        className="px-4 py-2.5 mb-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-blue-600/30 flex-shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSendingFile ? '...' : 'Надіслати'}</span>
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Tasks Checklist, Quick Notes & Attached Documents (3 Cols) */}
          <div className={`col-span-12 md:col-span-3 p-4 sm:p-5 overflow-y-auto space-y-4 bg-[#0e1422] h-full ${
            activeMobileTab === 'tasks_notes' ? 'block' : 'hidden md:block'
          }`}>
            
            {/* 1-Click Inline Pipeline Stage Selector */}
            <div className="bg-slate-900/90 border border-blue-500/30 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Етап воронки</span>
                </span>
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: currentStages.find(s => s.id === deal.stageId)?.color || '#3b82f6' }}
                />
              </div>
              <select
                value={deal.stageId}
                onChange={(e) => handleStageChange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition cursor-pointer"
              >
                {currentStages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Notes & Customer Insights with Voice Dictation & Deletion */}
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
                  ref={quickNoteTextareaRef}
                  rows={2}
                  placeholder={isDictatingQuickNote ? "Слухаю голос... Говоріть..." : "Запишіть деталі про клієнта під час листування..."}
                  value={quickNoteText}
                  onChange={(e) => setQuickNoteText(e.target.value)}
                  className={`w-full bg-slate-800/90 border rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition resize-none leading-relaxed overflow-y-auto ${
                    isDictatingQuickNote ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-700/80 focus:border-amber-500'
                  }`}
                  style={{ minHeight: '48px', maxHeight: '200px' }}
                />
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={toggleQuickNoteDictation}
                    className={`px-2 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 transition ${
                      isDictatingQuickNote
                        ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                    title={isDictatingQuickNote ? "Слухаю... Натисніть щоб зупинити" : "Надиктувати замітку голосом"}
                  >
                    <Mic className={`w-3.5 h-3.5 ${isDictatingQuickNote ? 'text-white' : 'text-emerald-400'}`} />
                    <span className="text-[10px]">{isDictatingQuickNote ? 'Слухаю...' : '🎙️ Голос'}</span>
                  </button>

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

              {/* Recent Notes Stream with Delete Button */}
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {(deal.notes || []).length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">Поки немає заміток</p>
                ) : (
                  (deal.notes || []).map((n: any) => (
                    <div key={n.id} className="p-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs space-y-1 group">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-bold text-amber-300">{n.user?.name || 'Менеджер'}</span>
                        <div className="flex items-center gap-1">
                          <span>{new Date(n.createdAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(n.id)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 transition"
                            title="Видалити замітку"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-200 leading-snug whitespace-pre-line text-[11px]">{n.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Documents & Contracts Widget (Accessible while chatting) */}
            <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>Документи & Договори</span>
                </h3>
                <span className="text-[10px] text-slate-500">{documentsList.length} файлів</span>
              </div>

              {/* Fast Upload Bar */}
              <div className="space-y-2 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                <div className="flex items-center justify-between gap-1.5">
                  <select
                    value={sidebarDocCategory}
                    onChange={(e: any) => setSidebarDocCategory(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-200 focus:outline-none"
                  >
                    <option value="Договір з підприємством">📄 Договір</option>
                    <option value="Заявка на персонал">📋 Бриф-заявка</option>
                    <option value="Акт виконаних робіт">📑 Акт</option>
                    <option value="Інше">📁 Інше</option>
                  </select>

                  <label className="cursor-pointer px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 flex-shrink-0">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{isUploadingDoc ? '...' : '+ Додати'}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={async (e) => {
                        setDocCategory(sidebarDocCategory);
                        await handleUploadDocumentFile(e);
                      }}
                      disabled={isUploadingDoc}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    />
                  </label>
                </div>
              </div>

              {/* Attached Documents List with 1-Click Delete */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {documentsList.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">Договір або заявку ще не завантажено</p>
                ) : (
                  documentsList.map((d) => (
                    <div
                      key={d.id}
                      className="p-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 rounded-xl flex items-center justify-between gap-2 text-xs transition group"
                    >
                      <div
                        onClick={() => setViewingMedia({ url: resolveMediaUrl(d.url), type: 'pdf', title: d.name })}
                        className="min-w-0 flex items-center gap-2 cursor-pointer flex-1"
                        title="Натисніть для перегляду документа"
                      >
                        <FileText className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="font-semibold text-white block truncate text-[11px] group-hover:text-cyan-300">
                            {d.name}
                          </span>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                            <span className="text-cyan-300 font-medium">{d.category}</span>
                            <span>•</span>
                            <span>{d.sizeKb} KB</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <a
                          href={resolveMediaUrl(d.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-slate-400 hover:text-white transition"
                          title="Завантажити / Відкрити"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(d.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition"
                          title="Видалити файл"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Custom Fields / Metadata Card (Twenty CRM benchmark) */}
            <div className="bg-slate-900/90 border border-blue-500/30 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-blue-400" />
                  <span>Кастомні поля угоди</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddingField(!isAddingField)}
                  className="p-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl text-xs font-bold transition flex items-center gap-1 px-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingField ? 'Скасувати' : 'Додати'}</span>
                </button>
              </div>

              {isAddingField && (
                <form onSubmit={handleSaveCustomField} className="space-y-2 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                  <input
                    type="text"
                    placeholder="Назва поля (напр: Термін виходу)"
                    value={newFieldKey}
                    onChange={(e) => setNewFieldKey(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Значення (напр: 15 жовтня)"
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsAddingField(false)}
                      className="px-2.5 py-1 text-slate-400 hover:text-white text-xs"
                    >
                      Скасувати
                    </button>
                    <button
                      type="submit"
                      disabled={!newFieldKey.trim() || !newFieldValue.trim()}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition"
                    >
                      Зберегти
                    </button>
                  </div>
                </form>
              )}

              {visibleCustomFields.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">Немає додаткових полів</p>
              ) : (
                <div className="space-y-1.5">
                  {visibleCustomFields.map(([k, v]) => (
                    <div key={k} className="p-2 bg-slate-800/70 border border-slate-700/60 rounded-xl text-xs flex items-center justify-between group">
                      <div className="min-w-0 pr-2">
                        <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">{k}</span>
                        <span className="text-white font-semibold truncate block">{String(v)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomField(k)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition"
                        title="Видалити поле"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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

      {/* Modal: AI Employer Requisition Parser */}
      {isAiRequisitionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-['Inter',sans-serif]">
          <div className="bg-[#101726] border border-purple-500/40 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">ШІ-парсинг заявки роботодавця</h3>
                  <p className="text-[11px] text-slate-400">Автоматичне розпізнавання посади, кількості людей, зарплати та житла</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAiRequisitionModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl transition hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Текст заявки або повідомлення від клієнта в месенджері:
                </label>
                <textarea
                  rows={6}
                  placeholder="Вставте сюди текст, який прислав роботодавець, наприклад:
Потрібно 10 зварювальників MIG/MAG у Вроцлав на завод металоконструкцій. Ставка 26 зл/год на руки, житло надаємо безкоштовно. Досвід від 1 року..."
                  value={aiRequisitionInputText}
                  onChange={(e) => setAiRequisitionInputText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition resize-none leading-relaxed"
                />
              </div>

              {/* Preset from deal chat button if messages exist */}
              {deal.messages && deal.messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const clientMsgs = (deal.messages || [])
                      .filter(m => !m.isOutgoing && m.text)
                      .map(m => m.text)
                      .slice(-8)
                      .join('\n');
                    if (clientMsgs) {
                      setAiRequisitionInputText(clientMsgs);
                    } else {
                      alert('Немає вхідних повідомлень від клієнта');
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-purple-300 border border-purple-500/20 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Вставити останні повідомлення з чату угоди</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAiRequisitionModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl transition font-medium"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={() => handleParseRequisitionSubmit()}
                disabled={isParsingRequisition || !aiRequisitionInputText.trim()}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-purple-600/30 flex items-center gap-2"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isParsingRequisition ? 'animate-spin' : ''}`} />
                <span>{isParsingRequisition ? 'Розпізнавання ШІ...' : '✨ Заповнити картку через ШІ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
