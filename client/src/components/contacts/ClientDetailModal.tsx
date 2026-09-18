import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Users, 
  Phone, 
  Mail, 
  Send, 
  Search, 
  ExternalLink,
  Plus, 
  Briefcase, 
  MapPin, 
  Globe2, 
  CheckCircle2, 
  Clock, 
  Check, 
  Copy, 
  X, 
  Trash2, 
  FileText, 
  Calendar, 
  AlertCircle, 
  UserCheck, 
  UserPlus, 
  Mic, 
  Shield, 
  Edit3, 
  Sparkles,
  Link2,
  ChevronRight,
  Filter
} from 'lucide-react';
import { api } from '../../services/api';
import { Contact, Company, User } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { startSpeechToText } from '../../utils/speechRecognition';
import { openPrintableCandidateDossier } from '../../utils/candidateDossierGenerator';

interface ClientDetailModalProps {
  clientId: string; // company ID or representative contact ID
  clientType?: 'company' | 'contact';
  onClose: () => void;
  onOpenDeal?: (dealId: string) => void;
  onUpdated?: () => void;
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  clientId,
  clientType = 'company',
  onClose,
  onOpenDeal,
  onUpdated
}) => {
  const { currentUser, users } = useAuth();

  const [activeTab, setActiveTab] = useState<'info' | 'candidates' | 'tasks' | 'notes' | 'deals'>('info');
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  
  // Assigned and available candidates state
  const [assignedCandidates, setAssignedCandidates] = useState<Contact[]>([]);
  const [availableCandidates, setAvailableCandidates] = useState<Contact[]>([]);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [isAttachCandidateModalOpen, setIsAttachCandidateModalOpen] = useState(false);
  const [attachingId, setAttachingId] = useState<string | null>(null);

  // Deep Link Copy state
  const [copiedLink, setCopiedLink] = useState(false);

  // Edit profile form state
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    industry: 'Виробництво та металоконструкції',
    contactName: '',
    contactPosition: '',
    contactPhone: '',
    contactEmail: '',
    quota: 10
  });

  // Tasks state
  const [tasks, setTasks] = useState<any[]>([]);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [taskForm, setTaskForm] = useState({
    text: '',
    type: 'call',
    dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    responsibleId: currentUser?.id || ''
  });

  // Notes state (No chat, internal notes only)
  const [notes, setNotes] = useState<any[]>([]);
  const [noteText, setNoteText] = useState('');
  const [isDictating, setIsDictating] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Synchronize URL to /contacts/:clientId for professional deep linking
  useEffect(() => {
    const targetUrl = `/contacts/${clientId}`;
    if (window.location.pathname !== targetUrl) {
      window.history.pushState({ modal: 'client-detail', clientId }, '', targetUrl);
    }

    return () => {
      if (window.location.pathname.startsWith('/contacts/')) {
        window.history.pushState(null, '', '/contacts');
      }
    };
  }, [clientId]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Load client data
  const loadClientData = async () => {
    setLoading(true);
    try {
      let compId = clientId;
      let targetComp: Company | null = null;
      let targetContact: Contact | null = null;

      // Try fetching as company
      try {
        const compRes = await api.get(`/contacts/companies/${clientId}`);
        if (compRes.data) {
          targetComp = compRes.data;
          compId = compRes.data.id;
        }
      } catch (err) {
        // If not company, fetch as contact
        const contactRes = await api.get(`/contacts/${clientId}`);
        if (contactRes.data) {
          targetContact = contactRes.data;
          if (contactRes.data.companyId) {
            compId = contactRes.data.companyId;
            const cRes = await api.get(`/contacts/companies/${contactRes.data.companyId}`);
            targetComp = cRes.data;
          }
        }
      }

      setCompany(targetComp);
      setContact(targetContact);

      if (targetComp) {
        setCompanyForm({
          name: targetComp.name || '',
          phone: targetComp.phone || '',
          email: targetComp.email || '',
          website: targetComp.website || '',
          address: targetComp.address || '',
          industry: targetComp.industry || 'Виробництво та металоконструкції',
          contactName: targetContact?.name || (targetComp as any).contacts?.[0]?.name || '',
          contactPosition: targetContact?.position || (targetComp as any).contacts?.[0]?.position || 'Директор / HR',
          contactPhone: targetContact?.phone || (targetComp as any).contacts?.[0]?.phone || '',
          contactEmail: targetContact?.email || (targetComp as any).contacts?.[0]?.email || '',
          quota: 10
        });
      }

      // Load candidates assigned to this company
      const candRes = await api.get('/contacts', {
        params: { type: 'candidate', companyId: compId }
      });
      setAssignedCandidates(candRes.data || []);

      // Load notes
      try {
        const notesRes = await api.get(`/contacts/companies/${compId}/notes`);
        setNotes(notesRes.data || []);
      } catch (e) {}

      // Load tasks
      try {
        const tasksRes = await api.get('/tasks', {
          params: { companyId: compId }
        });
        setTasks(tasksRes.data || []);
      } catch (e) {}

    } catch (e) {
      console.error('Error loading client details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientData();
  }, [clientId]);

  // Load candidate pool for attachment
  const openAttachCandidateModal = async () => {
    setIsAttachCandidateModalOpen(true);
    try {
      const res = await api.get('/contacts', { params: { type: 'candidate' } });
      setAvailableCandidates(res.data || []);
    } catch (e) {
      console.error('Failed to load candidate pool:', e);
    }
  };

  // Attach candidate to this company
  const handleAttachCandidate = async (candidateId: string) => {
    const compId = company?.id || clientId;
    setAttachingId(candidateId);
    try {
      await api.post('/contacts/batch-assign', {
        contactIds: [candidateId],
        companyId: compId
      });
      // Refresh list
      const candRes = await api.get('/contacts', {
        params: { type: 'candidate', companyId: compId }
      });
      setAssignedCandidates(candRes.data || []);
      setIsAttachCandidateModalOpen(false);
      if (onUpdated) onUpdated();
    } catch (e) {
      alert('Помилка прикріплення кандидата');
    } finally {
      setAttachingId(null);
    }
  };

  // Unassign candidate
  const handleUnassignCandidate = async (candidateId: string) => {
    if (!confirm('Відкріпити цього кандидата від підприємства?')) return;
    try {
      await api.post('/contacts/batch-assign', {
        contactIds: [candidateId],
        companyId: null
      });
      setAssignedCandidates(prev => prev.filter(c => c.id !== candidateId));
      if (onUpdated) onUpdated();
    } catch (e) {
      alert('Помилка відкріплення кандидата');
    }
  };

  // Save profile info
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    const compId = company?.id || clientId;
    setIsSavingInfo(true);
    try {
      await api.put(`/contacts/companies/${compId}`, {
        name: companyForm.name,
        phone: companyForm.phone,
        email: companyForm.email,
        website: companyForm.website,
        address: companyForm.address
      });

      // Update or create primary contact if entered
      if (companyForm.contactName.trim()) {
        const contactId = contact?.id || (company as any)?.contacts?.[0]?.id;
        if (contactId) {
          await api.put(`/contacts/${contactId}`, {
            name: companyForm.contactName,
            position: companyForm.contactPosition,
            phone: companyForm.contactPhone || undefined,
            email: companyForm.contactEmail || undefined
          });
        } else {
          await api.post('/contacts', {
            name: companyForm.contactName,
            position: companyForm.contactPosition,
            phone: companyForm.contactPhone || undefined,
            email: companyForm.contactEmail || undefined,
            companyId: compId,
            type: 'b2b_contact'
          });
        }
      }

      setIsEditingInfo(false);
      loadClientData();
      if (onUpdated) onUpdated();
    } catch (e) {
      alert('Помилка збереження даних клієнта');
    } finally {
      setIsSavingInfo(false);
    }
  };

  // Add Task for this client
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.text.trim()) return;
    try {
      const deals = (company as any)?.deals || [];
      const dealId = deals.length > 0 ? deals[0].id : null;

      await api.post('/tasks', {
        text: taskForm.text.trim(),
        type: taskForm.type,
        dueDate: new Date(taskForm.dueDate).toISOString(),
        responsibleId: taskForm.responsibleId || currentUser?.id,
        dealId
      });

      setTaskForm({
        text: '',
        type: 'call',
        dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
        responsibleId: currentUser?.id || ''
      });
      setIsCreatingTask(false);

      // Refresh tasks
      const compId = company?.id || clientId;
      const tasksRes = await api.get('/tasks', { params: { companyId: compId } });
      setTasks(tasksRes.data || []);
    } catch (e) {
      alert('Помилка створення завдання');
    }
  };

  // Complete Task
  const handleToggleTask = async (taskId: string, isCompleted: boolean) => {
    try {
      await api.put(`/tasks/${taskId}`, { isCompleted: !isCompleted });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isCompleted: !isCompleted } : t));
    } catch (e) {}
  };

  // Voice Dictation for Notes
  const toggleVoiceDictation = () => {
    if (isDictating) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsDictating(false);
    } else {
      setIsDictating(true);
      const instance = startSpeechToText({
        language: 'uk-UA',
        onResult: (text) => {
          setNoteText(prev => (prev ? `${prev} ${text}` : text));
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

  // Save Note (Strictly Notes, NO Chat)
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    const compId = company?.id || clientId;
    setIsSavingNote(true);
    try {
      const res = await api.post(`/contacts/companies/${compId}/notes`, {
        text: noteText.trim()
      });
      if (res.data) {
        setNotes(prev => [res.data, ...prev]);
      }
      setNoteText('');
    } catch (e) {
      alert('Помилка збереження замітки');
    } finally {
      setIsSavingNote(false);
    }
  };

  // Copy shareable link
  const handleCopyLink = () => {
    const url = `${window.location.origin}/contacts/${company?.id || clientId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const displayName = company?.name || contact?.name || 'Картка клієнта';
  const displayPhone = company?.phone || contact?.phone || '';
  const displayEmail = company?.email || contact?.email || '';

  return (
    <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 md:p-6 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','Inter',sans-serif]">
      <div 
        className="relative flex flex-col w-full h-full sm:max-w-[1500px] 2xl:max-w-[1750px] sm:h-[95vh] rounded-3xl shadow-[0_24px_70px_rgba(0,0,0,0.18)] overflow-hidden border border-black/[0.08] dark:border-white/10 bg-[#F5F5F7] dark:bg-[#1C1C1E] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Top Header Bar */}
        <div className="h-16 px-4 sm:px-6 border-b border-black/[0.06] dark:border-white/10 flex items-center justify-between bg-white/80 dark:bg-black/40 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#0071E3]/10 dark:bg-[#0071E3]/20 border border-[#0071E3]/20 flex items-center justify-center text-[#0071E3] dark:text-blue-400 flex-shrink-0 shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-semibold text-[#1D1D1F] dark:text-white truncate max-w-xs sm:max-w-md tracking-tight">
                  {displayName}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  B2B КЛІЄНТ
                </span>
                <span className="text-xs text-[#86868B] font-mono hidden md:inline">
                  ID: {clientId.slice(0, 8)}
                </span>
              </div>
              <p className="text-xs text-[#86868B] truncate">
                {company?.address || 'Офіційна картка замовника персоналу'}
              </p>
            </div>
          </div>

          {/* Quick Actions in Header */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 border active:scale-95 ${
                copiedLink 
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' 
                  : 'bg-black/[0.04] dark:bg-white/10 hover:bg-black/[0.08] dark:hover:bg-white/15 text-[#1D1D1F] dark:text-slate-200 border-black/[0.06] dark:border-white/10'
              }`}
              title="Скопіювати пряме посилання на клієнта"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Link2 className="w-3.5 h-3.5 text-[#86868B]" />}
              <span className="hidden sm:inline">{copiedLink ? 'Скопійовано!' : 'Копіювати URL'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/[0.05] hover:bg-black/[0.1] dark:bg-white/10 dark:hover:bg-white/20 text-[#86868B] hover:text-[#1D1D1F] dark:text-slate-300 dark:hover:text-white flex items-center justify-center transition active:scale-95"
              title="Закрити картку"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar - iOS Segmented Control */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-black/[0.06] dark:border-white/10 bg-white/60 dark:bg-black/20 backdrop-blur-md flex items-center justify-between gap-2 overflow-x-auto scrollbar-none flex-shrink-0">
          <div className="flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.06] p-1 rounded-full border border-black/[0.04] dark:border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 active:scale-95 ${
                activeTab === 'info'
                  ? 'bg-white dark:bg-[#0071E3] text-[#1D1D1F] dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] font-semibold'
                  : 'text-[#86868B] dark:text-slate-400 hover:text-[#1D1D1F] dark:hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Інформація про клієнта</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('candidates')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 active:scale-95 ${
                activeTab === 'candidates'
                  ? 'bg-white dark:bg-[#0071E3] text-[#1D1D1F] dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] font-semibold'
                  : 'text-[#86868B] dark:text-slate-400 hover:text-[#1D1D1F] dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Закріплені кандидати ({assignedCandidates.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 active:scale-95 ${
                activeTab === 'tasks'
                  ? 'bg-white dark:bg-[#0071E3] text-[#1D1D1F] dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] font-semibold'
                  : 'text-[#86868B] dark:text-slate-400 hover:text-[#1D1D1F] dark:hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Завдання ({tasks.filter(t => !t.isCompleted).length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 active:scale-95 ${
                activeTab === 'notes'
                  ? 'bg-white dark:bg-[#0071E3] text-[#1D1D1F] dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] font-semibold'
                  : 'text-[#86868B] dark:text-slate-400 hover:text-[#1D1D1F] dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Замітки та історія ({notes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('deals')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 active:scale-95 ${
                activeTab === 'deals'
                  ? 'bg-white dark:bg-[#0071E3] text-[#1D1D1F] dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] font-semibold'
                  : 'text-[#86868B] dark:text-slate-400 hover:text-[#1D1D1F] dark:hover:text-white'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Угоди ({((company as any)?.deals || []).length})</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[11px] text-[#86868B] font-medium">
              🔒 Тільки внутрішні замітки (без переписок)
            </span>
          </div>
        </div>

        {/* Modal Main Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: CLIENT INFORMATION & EDITING */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
              {/* Left 2 Cols: Detailed Form */}
              <div className="lg:col-span-2 space-y-5">
                <div className="bg-white dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/10 rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
                  <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/10 pb-3">
                    <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#0071E3]" />
                      <span>Паспорт підприємства та реквізити</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsEditingInfo(!isEditingInfo)}
                      className="px-3.5 py-1.5 bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/10 dark:hover:bg-white/20 text-[#1D1D1F] dark:text-white rounded-full text-xs font-medium transition flex items-center gap-1.5 border border-black/[0.06] dark:border-white/10 active:scale-95"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#0071E3]" />
                      <span>{isEditingInfo ? 'Скасувати' : 'Редагувати'}</span>
                    </button>
                  </div>

                  {isEditingInfo ? (
                    <form onSubmit={handleSaveInfo} className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="text-[#86868B] font-medium block mb-1">Назва компанії / Підприємства:</label>
                          <input
                            type="text"
                            required
                            value={companyForm.name}
                            onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                            className="w-full bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/10 rounded-xl px-3 py-2 text-[#1D1D1F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition"
                          />
                        </div>

                        <div>
                          <label className="text-[#86868B] font-medium block mb-1">Галузь виробництва:</label>
                          <input
                            type="text"
                            value={companyForm.industry}
                            onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                            className="w-full bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/10 rounded-xl px-3 py-2 text-[#1D1D1F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition"
                          />
                        </div>

                        <div>
                          <label className="text-[#86868B] font-medium block mb-1">Основний телефон підприємства:</label>
                          <input
                            type="tel"
                            value={companyForm.phone}
                            onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                            className="w-full bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/10 rounded-xl px-3 py-2 text-[#1D1D1F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition"
                          />
                        </div>

                        <div>
                          <label className="text-[#86868B] font-medium block mb-1">Email компанії:</label>
                          <input
                            type="email"
                            value={companyForm.email}
                            onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                            className="w-full bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/10 rounded-xl px-3 py-2 text-[#1D1D1F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition"
                          />
                        </div>

                        <div>
                          <label className="text-[#86868B] font-medium block mb-1">Веб-сайт:</label>
                          <input
                            type="text"
                            value={companyForm.website}
                            onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                            placeholder="https://company.com"
                            className="w-full bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/10 rounded-xl px-3 py-2 text-[#1D1D1F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition"
                          />
                        </div>

                        <div>
                          <label className="text-[#86868B] font-medium block mb-1">Фактична адреса / Завод:</label>
                          <input
                            type="text"
                            value={companyForm.address}
                            onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                            className="w-full bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/10 rounded-xl px-3 py-2 text-[#1D1D1F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition"
                          />
                        </div>
                      </div>

                      <div className="pt-3 border-t border-black/[0.06] dark:border-white/10">
                        <h4 className="text-xs font-semibold text-[#1D1D1F] dark:text-white mb-2.5">Контактна особа (Директор / HR):</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="text-[#86868B] font-medium block mb-1">ПІБ представника:</label>
                            <input
                              type="text"
                              value={companyForm.contactName}
                              onChange={(e) => setCompanyForm({ ...companyForm, contactName: e.target.value })}
                              placeholder="Коваль Петро Іванович"
                              className="w-full bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/10 rounded-xl px-3 py-2 text-[#1D1D1F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition"
                            />
                          </div>

                          <div>
                            <label className="text-[#86868B] font-medium block mb-1">Посада:</label>
                            <input
                              type="text"
                              value={companyForm.contactPosition}
                              onChange={(e) => setCompanyForm({ ...companyForm, contactPosition: e.target.value })}
                              placeholder="Керівник відділу персоналу"
                              className="w-full bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/10 rounded-xl px-3 py-2 text-[#1D1D1F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition"
                            />
                          </div>

                          <div>
                            <label className="text-[#86868B] font-medium block mb-1">Мобільний телефон (WhatsApp / TG):</label>
                            <input
                              type="tel"
                              value={companyForm.contactPhone}
                              onChange={(e) => setCompanyForm({ ...companyForm, contactPhone: e.target.value })}
                              placeholder="+48 ... або +380 ..."
                              className="w-full bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/10 rounded-xl px-3 py-2 text-[#1D1D1F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition"
                            />
                          </div>

                          <div>
                            <label className="text-[#86868B] font-medium block mb-1">Email представника:</label>
                            <input
                              type="email"
                              value={companyForm.contactEmail}
                              onChange={(e) => setCompanyForm({ ...companyForm, contactEmail: e.target.value })}
                              placeholder="hr@company.com"
                              className="w-full bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/10 rounded-xl px-3 py-2 text-[#1D1D1F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/[0.06] dark:border-white/10">
                        <button
                          type="button"
                          onClick={() => setIsEditingInfo(false)}
                          className="px-4 py-2 bg-black/[0.05] hover:bg-black/[0.08] dark:bg-white/10 dark:hover:bg-white/15 text-[#1D1D1F] dark:text-slate-300 rounded-full text-xs font-medium transition active:scale-95"
                        >
                          Скасувати
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingInfo}
                          className="px-5 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full text-xs font-medium transition shadow-sm flex items-center gap-1.5 active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isSavingInfo ? 'Збереження...' : 'Зберегти зміни'}</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Readonly Overview Grid */
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] space-y-1">
                          <span className="text-[#86868B] block font-medium">Галузь діяльності:</span>
                          <span className="text-[#1D1D1F] dark:text-white font-semibold text-sm">{companyForm.industry || 'Міжнародне виробництво'}</span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] space-y-1">
                          <span className="text-[#86868B] block font-medium">Адреса та локація:</span>
                          <span className="text-[#1D1D1F] dark:text-white font-semibold flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#FF3B30]" />
                            <span>{companyForm.address || 'Адреса не вказана'}</span>
                          </span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] space-y-1">
                          <span className="text-[#86868B] block font-medium">Телефон компанії:</span>
                          {displayPhone ? (
                            <div className="flex items-center justify-between">
                              <span className="text-[#1D1D1F] dark:text-white font-mono font-semibold">{displayPhone}</span>
                              <div className="flex items-center gap-1">
                                <a
                                  href={`https://wa.me/${displayPhone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition text-[10px] font-semibold"
                                  title="WhatsApp"
                                >
                                  WA
                                </a>
                                <a
                                  href={`tel:${displayPhone}`}
                                  className="p-1 rounded-full bg-[#0071E3]/10 text-[#0071E3] hover:bg-[#0071E3]/20 transition text-[10px] font-semibold"
                                  title="Виклик"
                                >
                                  <Phone className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[#86868B]">Не вказано</span>
                          )}
                        </div>

                        <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] space-y-1">
                          <span className="text-[#86868B] block font-medium">Email / Сайт:</span>
                          <div className="space-y-0.5">
                            {displayEmail && <div className="text-[#1D1D1F] dark:text-white truncate font-medium">{displayEmail}</div>}
                            {companyForm.website && (
                              <a 
                                href={companyForm.website.startsWith('http') ? companyForm.website : `https://${companyForm.website}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[#0071E3] hover:underline flex items-center gap-1 font-medium"
                              >
                                <Globe2 className="w-3 h-3" />
                                <span className="truncate">{companyForm.website}</span>
                              </a>
                            )}
                            {!displayEmail && !companyForm.website && <span className="text-[#86868B]">Не вказано</span>}
                          </div>
                        </div>
                      </div>

                      {/* Contact Person Card */}
                      <div className="p-4 rounded-2xl bg-[#0071E3]/[0.04] dark:bg-blue-950/20 border border-[#0071E3]/15 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[#0071E3] dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-[#0071E3]" />
                            <span>Представник замовника / HR</span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <h4 className="text-sm font-semibold text-[#1D1D1F] dark:text-white">{companyForm.contactName || 'Особа не закріплена'}</h4>
                            <p className="text-xs text-[#86868B]">{companyForm.contactPosition || 'Керівництво / Кадри'}</p>
                          </div>
                          {companyForm.contactPhone && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-semibold">{companyForm.contactPhone}</span>
                              <a
                                href={`https://wa.me/${companyForm.contactPhone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-medium transition flex items-center gap-1 active:scale-95"
                              >
                                <Send className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Col: Quick Stats & Direct Actions */}
              <div className="space-y-4">
                <div className="bg-white dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/10 rounded-3xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
                  <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span>Потреба в персоналі</span>
                  </h3>

                  <div className="p-4 rounded-2xl bg-purple-500/[0.06] border border-purple-500/15 text-center space-y-1">
                    <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">Закріплено за підприємством:</span>
                    <div className="text-3xl font-semibold text-[#1D1D1F] dark:text-white font-mono">
                      {assignedCandidates.length} <span className="text-sm font-normal text-[#86868B]">кандидатів</span>
                    </div>
                    <p className="text-[11px] text-[#86868B] pt-1">
                      Пул спеціалістів, які пройшли верифікацію та очікують заїзду
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('candidates')}
                    className="w-full py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full text-xs font-medium transition shadow-sm flex items-center justify-center gap-2 active:scale-95"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Керувати кандидатами</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('tasks')}
                    className="w-full py-2.5 bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/10 dark:hover:bg-white/15 text-[#1D1D1F] dark:text-white border border-black/[0.06] dark:border-white/10 rounded-full text-xs font-medium transition flex items-center justify-center gap-2 active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4 text-amber-500" />
                    <span>Поставити завдання менеджеру</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CANDIDATE ASSIGNMENT (БІЛЬШ ЗРУЧНО ПРИВ'ЯЗАТИ КАНДИДАТІВ) */}
          {activeTab === 'candidates' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#2C2C2E] p-4 rounded-2xl border border-black/[0.06] dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                <div>
                  <h3 className="text-base font-semibold text-[#1D1D1F] dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Кандидати, прикріплені до підприємства</span>
                  </h3>
                  <p className="text-xs text-[#86868B] mt-0.5">
                    Співробітники закріплені за цим роботодавцем для оформлення запрошень та виходу на роботу
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openAttachCandidateModal}
                  className="px-4 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full text-xs font-medium transition shadow-sm flex items-center gap-1.5 self-start sm:self-auto active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Прив'язати кандидата з бази</span>
                </button>
              </div>

              {/* Assigned Candidates List */}
              {assignedCandidates.length === 0 ? (
                <div className="text-center py-16 bg-white/70 dark:bg-[#2C2C2E]/60 rounded-3xl border border-dashed border-black/[0.08] dark:border-white/10 p-8 space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Users className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-semibold text-[#1D1D1F] dark:text-white">Кандидатів поки не прив'язано</h4>
                  <p className="text-xs text-[#86868B] max-w-md mx-auto">
                    Натисніть «+ Прив'язати кандидата з бази», щоб обрати відповідних фахівців з бази рекрутингу для цього замовника.
                  </p>
                  <button
                    type="button"
                    onClick={openAttachCandidateModal}
                    className="px-4 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full text-xs font-medium transition shadow-sm active:scale-95"
                  >
                    Обрати кандидатів
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {assignedCandidates.map(c => (
                    <div
                      key={c.id}
                      className="bg-white dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/10 hover:border-[#0071E3]/40 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md space-y-3 transition flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold flex items-center justify-center">
                              {c.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm text-[#1D1D1F] dark:text-white truncate max-w-[170px]">{c.name}</h4>
                              <p className="text-[11px] text-purple-700 dark:text-purple-300 font-medium">{c.profession || 'Фахівець'}</p>
                            </div>
                          </div>

                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            {c.country || 'Україна'}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-[#86868B] pt-1 border-t border-black/[0.04] dark:border-white/5">
                          {c.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span className="font-mono text-[#1D1D1F] dark:text-slate-200">{c.phone}</span>
                            </div>
                          )}
                          {c.salaryExpectation && (
                            <div className="text-[11px]">
                              Очікувана зарплата: <span className="text-[#1D1D1F] dark:text-white font-semibold">{c.salaryExpectation}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-black/[0.06] dark:border-white/10 gap-2">
                        <button
                          type="button"
                          onClick={() => openPrintableCandidateDossier(c)}
                          className="px-3 py-1 bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/10 dark:hover:bg-white/20 text-[#1D1D1F] dark:text-slate-200 rounded-full text-xs font-medium transition flex items-center gap-1 active:scale-95"
                        >
                          <FileText className="w-3 h-3 text-[#0071E3]" />
                          <span>Досьє (PDF)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUnassignCandidate(c.id)}
                          className="px-3 py-1 bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 text-[#FF3B30] rounded-full text-xs font-medium transition active:scale-95"
                          title="Відкріпити кандидата"
                        >
                          Відкріпити
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CLIENT TASKS (ПОСТАВИТИ ЗАДАЧУ) */}
          {activeTab === 'tasks' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#2C2C2E] p-4 rounded-2xl border border-black/[0.06] dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                <div>
                  <h3 className="text-base font-semibold text-[#1D1D1F] dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-500" />
                    <span>Завдання та контроль дедлайнів по клієнту</span>
                  </h3>
                  <p className="text-xs text-[#86868B] mt-0.5">
                    Дзвінки, надсилання комерційних пропозицій, рахунків та зустрічі
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreatingTask(!isCreatingTask)}
                  className="px-4 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full text-xs font-medium transition shadow-sm flex items-center gap-1.5 self-start sm:self-auto active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isCreatingTask ? 'Скасувати' : '+ Поставити завдання'}</span>
                </button>
              </div>

              {/* Add Task Form */}
              {isCreatingTask && (
                <form onSubmit={handleCreateTask} className="bg-white dark:bg-[#2C2C2E] border border-amber-500/30 rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4 animate-in fade-in">
                  <h4 className="text-xs font-semibold text-[#1D1D1F] dark:text-white">Нове завдання по клієнту:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <label className="text-[#86868B] font-medium block mb-1">Що потрібно зробити:</label>
                      <input
                        type="text"
                        required
                        placeholder="Наприклад: Зателефонувати щодо узгодження дати заїзду 5 зварювальників..."
                        value={taskForm.text}
                        onChange={(e) => setTaskForm({ ...taskForm, text: e.target.value })}
                        className="w-full bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/10 rounded-xl px-3 py-2 text-[#1D1D1F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition"
                      />
                    </div>

                    <div>
                      <label className="text-[#86868B] font-medium block mb-1">Тип дії:</label>
                      <select
                        value={taskForm.type}
                        onChange={(e) => setTaskForm({ ...taskForm, type: e.target.value })}
                        className="w-full bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/10 rounded-xl px-3 py-2 text-[#1D1D1F] dark:text-white focus:outline-none"
                      >
                        <option value="call">📞 Телефонний дзвінок</option>
                        <option value="meeting">🤝 Зустріч / Онлайн зум</option>
                        <option value="invoice">📑 Надіслати рахунок-фактуру</option>
                        <option value="follow_up">⏰ Follow-up контроль</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[#86868B] font-medium block mb-1">Дедлайн:</label>
                      <input
                        type="datetime-local"
                        value={taskForm.dueDate}
                        onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                        className="w-full bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/10 rounded-xl px-3 py-2 text-[#1D1D1F] dark:text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[#86868B] font-medium block mb-1">Відповідальний менеджер:</label>
                      <select
                        value={taskForm.responsibleId}
                        onChange={(e) => setTaskForm({ ...taskForm, responsibleId: e.target.value })}
                        className="w-full bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/10 rounded-xl px-3 py-2 text-[#1D1D1F] dark:text-white focus:outline-none"
                      >
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl text-xs font-medium transition shadow-sm active:scale-95"
                      >
                        Створити завдання
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Tasks List */}
              {tasks.length === 0 ? (
                <div className="text-center py-12 bg-white/70 dark:bg-[#2C2C2E]/60 rounded-3xl border border-dashed border-black/[0.08] dark:border-white/10 p-6 space-y-2 text-[#86868B] text-xs">
                  <CheckCircle2 className="w-8 h-8 text-[#86868B]/40 mx-auto" />
                  <p>Завдань по цьому клієнту поки немає. Поставте нове завдання вище!</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {tasks.map(t => (
                    <div
                      key={t.id}
                      className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 text-xs ${
                        t.isCompleted
                          ? 'bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.04] dark:border-white/5 text-[#86868B]'
                          : 'bg-white dark:bg-[#2C2C2E] border-black/[0.06] dark:border-white/10 text-[#1D1D1F] dark:text-white shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(t.id, t.isCompleted)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition flex-shrink-0 active:scale-90 ${
                            t.isCompleted 
                              ? 'bg-[#34C759] border-[#34C759] text-white' 
                              : 'border-black/[0.2] dark:border-white/20 hover:border-[#0071E3] text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <div className="min-w-0">
                          <p className={`font-medium truncate ${t.isCompleted ? 'line-through text-[#86868B]' : 'text-[#1D1D1F] dark:text-white'}`}>
                            {t.text}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-[#86868B] mt-0.5">
                            <span>{t.type === 'call' ? '📞 Дзвінок' : '📋 Завдання'}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(t.dueDate).toLocaleString('uk-UA')}
                            </span>
                            <span>•</span>
                            <span>{t.responsible?.name || 'Менеджер'}</span>
                          </div>
                        </div>
                      </div>

                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                        t.isCompleted ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                      }`}>
                        {t.isCompleted ? 'Виконано' : 'В роботі'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: INTERNAL NOTES ONLY (БЕЗ ПЕРЕПИСОК ТІЛЬКИ ЗАМІТКИ) */}
          {activeTab === 'notes' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-white dark:bg-[#2C2C2E] p-5 rounded-3xl border border-black/[0.06] dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Внутрішні замітки команди по клієнту</span>
                  </h3>

                  <button
                    type="button"
                    onClick={toggleVoiceDictation}
                    className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition active:scale-95 ${
                      isDictating 
                        ? 'bg-[#FF3B30] text-white animate-pulse' 
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>{isDictating ? 'Слухаю голос...' : '🎙️ Надиктувати голосом'}</span>
                  </button>
                </div>

                <form onSubmit={handleSaveNote} className="space-y-2.5">
                  <textarea
                    rows={2}
                    placeholder="Зафіксуйте домовленості, особливості підприємства, вимоги до персоналу..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className={`w-full bg-black/[0.03] dark:bg-white/[0.06] border rounded-2xl p-3 text-xs text-[#1D1D1F] dark:text-white placeholder-[#86868B] focus:outline-none transition resize-none ${
                      isDictating ? 'border-[#FF3B30] ring-2 ring-[#FF3B30]/20' : 'border-black/[0.08] dark:border-white/10 focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20'
                    }`}
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingNote || !noteText.trim()}
                      className="px-4 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-50 text-white rounded-full text-xs font-medium transition flex items-center gap-1.5 active:scale-95 shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isSavingNote ? 'Збереження...' : 'Зберегти замітку'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Notes Stream */}
              <div className="space-y-3">
                {notes.length === 0 ? (
                  <div className="text-center py-12 bg-white/70 dark:bg-[#2C2C2E]/60 rounded-3xl border border-dashed border-black/[0.08] dark:border-white/10 p-6 text-[#86868B] text-xs">
                    Заміток по цьому клієнту поки немає. Додайте першу замітку вище або надиктуйте голосом!
                  </div>
                ) : (
                  notes.map((n: any) => (
                    <div
                      key={n.id}
                      className="bg-white dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/10 rounded-2xl p-4 space-y-1.5 shadow-[0_2px_6px_rgba(0,0,0,0.02)]"
                    >
                      <div className="flex items-center justify-between text-[#86868B] text-[11px]">
                        <span className="font-semibold text-[#1D1D1F] dark:text-white">
                          {n.user?.name || 'Співробітник CRM'}
                        </span>
                        <span>{new Date(n.createdAt).toLocaleString('uk-UA')}</span>
                      </div>
                      <p className="text-xs text-[#1D1D1F] dark:text-slate-200 leading-relaxed whitespace-pre-line select-text">
                        {n.text || n.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: DEALS & ORDERS */}
          {activeTab === 'deals' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="bg-white dark:bg-[#2C2C2E] p-4 rounded-2xl border border-black/[0.06] dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-white flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#0071E3]" />
                    <span>Пов'язані угоди та замовлення</span>
                  </h3>
                  <p className="text-xs text-[#86868B] mt-0.5">
                    Усі замовлення та договори, зареєстровані за цим підприємством
                  </p>
                </div>
              </div>

              {((company as any)?.deals || []).length === 0 ? (
                <div className="text-center py-12 bg-white/70 dark:bg-[#2C2C2E]/60 rounded-3xl border border-dashed border-black/[0.08] dark:border-white/10 p-6 text-[#86868B] text-xs">
                  Активних угод у CRM для цього клієнта поки немає.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {((company as any)?.deals || []).map((d: any) => (
                    <div
                      key={d.id}
                      onClick={() => {
                        if (onOpenDeal) {
                          onOpenDeal(d.id);
                          onClose();
                        }
                      }}
                      className="bg-white dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/10 hover:border-[#0071E3]/40 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md cursor-pointer transition space-y-2 group active:scale-[0.99]"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm text-[#1D1D1F] dark:text-white group-hover:text-[#0071E3] transition truncate">
                          {d.title}
                        </h4>
                        <ChevronRight className="w-4 h-4 text-[#86868B] group-hover:text-[#0071E3] transition flex-shrink-0" />
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-black/[0.04] dark:border-white/5">
                        <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {new Intl.NumberFormat('uk-UA').format(d.budget || 0)} ₴
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/10 text-[#86868B] font-medium text-[10px]">
                          {d.stage?.name || 'Угода'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* POPUP MODAL: ATTACH CANDIDATE FROM POOL */}
      {isAttachCandidateModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/40 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-[#F5F5F7] dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/10 rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-[0_24px_70px_rgba(0,0,0,0.2)] overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-black/[0.06] dark:border-white/10 flex items-center justify-between bg-white/70 dark:bg-black/30 backdrop-blur-md">
              <div>
                <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Обрати кандидата для закріплення за {displayName}</span>
                </h3>
                <p className="text-[11px] text-[#86868B]">Оберіть відповідного фахівця з бази рекрутингу</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAttachCandidateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-black/[0.05] hover:bg-black/[0.1] dark:bg-white/10 text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white flex items-center justify-center transition active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search filter in modal */}
            <div className="p-3 border-b border-black/[0.06] dark:border-white/10 bg-white/50 dark:bg-black/20">
              <div className="relative">
                <Search className="w-4 h-4 text-[#86868B] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Пошук за посадою, країною або ПІБ кандидата..."
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  className="w-full bg-white dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/10 rounded-full pl-9 pr-3 py-1.5 text-xs text-[#1D1D1F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition"
                />
              </div>
            </div>

            {/* Candidates Pool List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {availableCandidates
                .filter(c => 
                  c.name.toLowerCase().includes(candidateSearch.toLowerCase()) ||
                  (c.profession && c.profession.toLowerCase().includes(candidateSearch.toLowerCase())) ||
                  (c.country && c.country.toLowerCase().includes(candidateSearch.toLowerCase()))
                )
                .slice(0, 50)
                .map(cand => {
                  const isAlreadyAssigned = cand.companyId === (company?.id || clientId);
                  return (
                    <div
                      key={cand.id}
                      className="p-3 rounded-2xl bg-white dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/10 hover:border-[#0071E3]/30 flex items-center justify-between gap-3 text-xs transition shadow-sm"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold flex items-center justify-center flex-shrink-0">
                          {cand.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-semibold text-[#1D1D1F] dark:text-white truncate">{cand.name}</h5>
                          <p className="text-[11px] text-[#86868B] truncate">
                            {cand.profession || 'Фахівець'} • {cand.country || 'Україна'}
                          </p>
                        </div>
                      </div>

                      {isAlreadyAssigned ? (
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                          Вже закріплено
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={attachingId === cand.id}
                          onClick={() => handleAttachCandidate(cand.id)}
                          className="px-3.5 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full text-xs font-medium transition flex items-center gap-1 flex-shrink-0 active:scale-95 shadow-sm"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{attachingId === cand.id ? 'Прикріплення...' : 'Прив’язати'}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
