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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 md:p-6 font-['Inter',sans-serif]">
      <div 
        className="relative flex flex-col w-full h-full sm:max-w-6xl sm:h-[92vh] rounded-3xl shadow-2xl overflow-hidden border border-white/15 animate-in fade-in zoom-in-95 duration-200"
        style={{
          backgroundImage: `
            linear-gradient(180deg, rgba(10, 16, 32, 0.88) 0%, rgba(6, 10, 22, 0.95) 100%),
            url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2560&auto=format&fit=crop')
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backdropFilter: 'blur(24px)'
        }}
      >
        {/* Top Header Bar */}
        <div className="h-16 px-4 sm:px-6 border-b border-white/10 flex items-center justify-between bg-black/30 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 flex-shrink-0 shadow-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white truncate max-w-xs sm:max-w-md">
                  {displayName}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  B2B КЛІЄНТ
                </span>
                <span className="text-xs text-slate-400 font-mono hidden md:inline">
                  ID: {clientId.slice(0, 8)}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                {company?.address || 'Офіційна картка замовника персоналу'}
              </p>
            </div>
          </div>

          {/* Quick Actions in Header */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                copiedLink 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                  : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/15'
              }`}
              title="Скопіювати пряме посилання на клієнта"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedLink ? 'Скопійовано!' : 'Копіювати URL'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition border border-white/15"
              title="Закрити картку"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="px-4 sm:px-6 py-2 border-b border-white/10 bg-black/20 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none flex-shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'info'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Інформація про клієнта</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('candidates')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'candidates'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-purple-300" />
              <span>Закріплені кандидати ({assignedCandidates.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'tasks'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
              <span>Завдання ({tasks.filter(t => !t.isCompleted).length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'notes'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-300" />
              <span>Замітки та історія ({notes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('deals')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'deals'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-indigo-300" />
              <span>Угоди ({((company as any)?.deals || []).length})</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">
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
                <div className="bg-[#0b1020]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-400" />
                      <span>Паспорт підприємства та реквізити</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsEditingInfo(!isEditingInfo)}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/10"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                      <span>{isEditingInfo ? 'Скасувати' : 'Редагувати'}</span>
                    </button>
                  </div>

                  {isEditingInfo ? (
                    <form onSubmit={handleSaveInfo} className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="text-slate-400 font-semibold block mb-1">Назва компанії / Підприємства:</label>
                          <input
                            type="text"
                            required
                            value={companyForm.name}
                            onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="text-slate-400 font-semibold block mb-1">Галузь виробництва:</label>
                          <input
                            type="text"
                            value={companyForm.industry}
                            onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="text-slate-400 font-semibold block mb-1">Основний телефон підприємства:</label>
                          <input
                            type="tel"
                            value={companyForm.phone}
                            onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="text-slate-400 font-semibold block mb-1">Email компанії:</label>
                          <input
                            type="email"
                            value={companyForm.email}
                            onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="text-slate-400 font-semibold block mb-1">Веб-сайт:</label>
                          <input
                            type="text"
                            value={companyForm.website}
                            onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                            placeholder="https://company.com"
                            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="text-slate-400 font-semibold block mb-1">Фактична адреса / Завод:</label>
                          <input
                            type="text"
                            value={companyForm.address}
                            onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/10">
                        <h4 className="text-xs font-bold text-slate-200 mb-2.5">Контактна особа (Директор / HR):</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="text-slate-400 font-semibold block mb-1">ПІБ представника:</label>
                            <input
                              type="text"
                              value={companyForm.contactName}
                              onChange={(e) => setCompanyForm({ ...companyForm, contactName: e.target.value })}
                              placeholder="Коваль Петро Іванович"
                              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="text-slate-400 font-semibold block mb-1">Посада:</label>
                            <input
                              type="text"
                              value={companyForm.contactPosition}
                              onChange={(e) => setCompanyForm({ ...companyForm, contactPosition: e.target.value })}
                              placeholder="Керівник відділу персоналу"
                              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="text-slate-400 font-semibold block mb-1">Мобільний телефон (WhatsApp / TG):</label>
                            <input
                              type="tel"
                              value={companyForm.contactPhone}
                              onChange={(e) => setCompanyForm({ ...companyForm, contactPhone: e.target.value })}
                              placeholder="+48 ... або +380 ..."
                              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="text-slate-400 font-semibold block mb-1">Email представника:</label>
                            <input
                              type="email"
                              value={companyForm.contactEmail}
                              onChange={(e) => setCompanyForm({ ...companyForm, contactEmail: e.target.value })}
                              placeholder="hr@company.com"
                              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => setIsEditingInfo(false)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                        >
                          Скасувати
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingInfo}
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/30 flex items-center gap-1.5"
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
                        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                          <span className="text-slate-400 block font-medium">Галузь діяльності:</span>
                          <span className="text-white font-bold text-sm">{companyForm.industry || 'Міжнародне виробництво'}</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                          <span className="text-slate-400 block font-medium">Адреса та локація:</span>
                          <span className="text-white font-bold flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-rose-400" />
                            <span>{companyForm.address || 'Адреса не вказана'}</span>
                          </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                          <span className="text-slate-400 block font-medium">Телефон компанії:</span>
                          {displayPhone ? (
                            <div className="flex items-center justify-between">
                              <span className="text-white font-mono font-bold">{displayPhone}</span>
                              <div className="flex items-center gap-1">
                                <a
                                  href={`https://wa.me/${displayPhone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition text-[10px] font-bold"
                                  title="WhatsApp"
                                >
                                  WA
                                </a>
                                <a
                                  href={`tel:${displayPhone}`}
                                  className="p-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition text-[10px] font-bold"
                                  title="Виклик"
                                >
                                  <Phone className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500">Не вказано</span>
                          )}
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                          <span className="text-slate-400 block font-medium">Email / Сайт:</span>
                          <div className="space-y-0.5">
                            {displayEmail && <div className="text-white truncate font-medium">{displayEmail}</div>}
                            {companyForm.website && (
                              <a 
                                href={companyForm.website.startsWith('http') ? companyForm.website : `https://${companyForm.website}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-sky-400 hover:underline flex items-center gap-1"
                              >
                                <Globe2 className="w-3 h-3" />
                                <span className="truncate">{companyForm.website}</span>
                              </a>
                            )}
                            {!displayEmail && !companyForm.website && <span className="text-slate-500">Не вказано</span>}
                          </div>
                        </div>
                      </div>

                      {/* Contact Person Card */}
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-500/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-blue-400" />
                            <span>Представник замовника / HR</span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <h4 className="text-sm font-black text-white">{companyForm.contactName || 'Особа не закріплена'}</h4>
                            <p className="text-xs text-slate-400">{companyForm.contactPosition || 'Керівництво / Кадри'}</p>
                          </div>
                          {companyForm.contactPhone && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-emerald-400 font-bold">{companyForm.contactPhone}</span>
                              <a
                                href={`https://wa.me/${companyForm.contactPhone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-bold transition flex items-center gap-1"
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
                <div className="bg-[#0b1020]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Потреба в персоналі</span>
                  </h3>

                  <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-center space-y-1">
                    <span className="text-xs text-purple-300 font-semibold">Закріплено за підприємством:</span>
                    <div className="text-3xl font-black text-white font-mono">
                      {assignedCandidates.length} <span className="text-sm font-normal text-slate-400">кандидатів</span>
                    </div>
                    <p className="text-[11px] text-slate-400 pt-1">
                      Пул спеціалістів, які пройшли верифікацію та очікують заїзду
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('candidates')}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Керувати кандидатами</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('tasks')}
                    className="w-full py-2.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Поставити завдання менеджеру</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CANDIDATE ASSIGNMENT (БІЛЬШ ЗРУЧНО ПРИВ'ЯЗАТИ КАНДИДАТІВ) */}
          {activeTab === 'candidates' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0b1020]/80 p-4 rounded-2xl border border-white/10 backdrop-blur-xl">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span>Кандидати, прикріплені до підприємства</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Співробітники закріплені за цим роботодавцем для оформлення запрошень та виходу на роботу
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openAttachCandidateModal}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-600/30 flex items-center gap-2 self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Прив'язати кандидата з бази</span>
                </button>
              </div>

              {/* Assigned Candidates List */}
              {assignedCandidates.length === 0 ? (
                <div className="text-center py-16 bg-[#0b1020]/60 rounded-2xl border border-dashed border-white/10 p-8 space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                    <Users className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Кандидатів поки не прив'язано</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Натисніть «+ Прив'язати кандидата з бази», щоб обрати відповідних фахівців з бази рекрутингу для цього замовника.
                  </p>
                  <button
                    type="button"
                    onClick={openAttachCandidateModal}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition"
                  >
                    Обрати кандидатів
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {assignedCandidates.map(c => (
                    <div
                      key={c.id}
                      className="bg-[#0d1428]/90 border border-white/10 hover:border-purple-500/40 rounded-2xl p-4 shadow-xl space-y-3 transition flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 font-bold flex items-center justify-center">
                              {c.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-white truncate max-w-[170px]">{c.name}</h4>
                              <p className="text-[11px] text-purple-300 font-medium">{c.profession || 'Фахівець'}</p>
                            </div>
                          </div>

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {c.country || 'Україна'}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-slate-300 pt-1 border-t border-white/5">
                          {c.phone && (
                            <div className="flex items-center gap-2 text-slate-400">
                              <Phone className="w-3 h-3 text-emerald-400" />
                              <span className="font-mono">{c.phone}</span>
                            </div>
                          )}
                          {c.salaryExpectation && (
                            <div className="text-[11px] text-slate-400">
                              Очікувана зарплата: <span className="text-white font-bold">{c.salaryExpectation}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/10 gap-2">
                        <button
                          type="button"
                          onClick={() => openPrintableCandidateDossier(c)}
                          className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3 text-blue-400" />
                          <span>Досьє (PDF)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUnassignCandidate(c.id)}
                          className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-lg text-xs font-semibold transition"
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
              <div className="flex items-center justify-between bg-[#0b1020]/80 p-4 rounded-2xl border border-white/10 backdrop-blur-xl">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    <span>Завдання та контроль дедлайнів по клієнту</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Дзвінки, надсилання комерційних пропозицій, рахунків та зустрічі
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreatingTask(!isCreatingTask)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-amber-600/30 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isCreatingTask ? 'Скасувати' : '+ Поставити завдання'}</span>
                </button>
              </div>

              {/* Add Task Form */}
              {isCreatingTask && (
                <form onSubmit={handleCreateTask} className="bg-[#0b1020]/95 border border-amber-500/40 rounded-2xl p-4 shadow-xl space-y-3 animate-in fade-in">
                  <h4 className="text-xs font-bold text-amber-300">Нове завдання по клієнту:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <label className="text-slate-400 font-semibold block mb-1">Що потрібно зробити:</label>
                      <input
                        type="text"
                        required
                        placeholder="Наприклад: Зателефонувати щодо узгодження дати заїзду 5 зварювальників..."
                        value={taskForm.text}
                        onChange={(e) => setTaskForm({ ...taskForm, text: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">Тип дії:</label>
                      <select
                        value={taskForm.type}
                        onChange={(e) => setTaskForm({ ...taskForm, type: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="call">📞 Телефонний дзвінок</option>
                        <option value="meeting">🤝 Зустріч / Онлайн зум</option>
                        <option value="invoice">📑 Надіслати рахунок-фактуру</option>
                        <option value="follow_up">⏰ Follow-up контроль</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">Дедлайн:</label>
                      <input
                        type="datetime-local"
                        value={taskForm.dueDate}
                        onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">Відповідальний менеджер:</label>
                      <select
                        value={taskForm.responsibleId}
                        onChange={(e) => setTaskForm({ ...taskForm, responsibleId: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                      >
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-amber-600/30"
                      >
                        Створити завдання
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Tasks List */}
              {tasks.length === 0 ? (
                <div className="text-center py-12 bg-[#0b1020]/60 rounded-2xl border border-white/5 p-6 space-y-2 text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
                  <p>Завдань по цьому клієнту поки немає. Поставте нове завдання вище!</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {tasks.map(t => (
                    <div
                      key={t.id}
                      className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 text-xs ${
                        t.isCompleted
                          ? 'bg-slate-900/40 border-white/5 text-slate-500'
                          : 'bg-[#0b1020]/80 border-white/10 text-white shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(t.id, t.isCompleted)}
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition flex-shrink-0 ${
                            t.isCompleted 
                              ? 'bg-emerald-600 border-emerald-500 text-white' 
                              : 'border-slate-600 hover:border-amber-500 text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <div className="min-w-0">
                          <p className={`font-semibold truncate ${t.isCompleted ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                            {t.text}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
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

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        t.isCompleted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
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
              <div className="bg-[#0b1020]/80 p-4 rounded-2xl border border-white/10 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>Внутрішні замітки команди по клієнту</span>
                  </h3>

                  <button
                    type="button"
                    onClick={toggleVoiceDictation}
                    className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      isDictating 
                        ? 'bg-rose-600 text-white animate-pulse' 
                        : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>{isDictating ? 'Слухаю голос...' : '🎙️ Надиктувати голосом'}</span>
                  </button>
                </div>

                <form onSubmit={handleSaveNote} className="space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Зафіксуйте домовленості, особливості підприємства, вимоги до персоналу..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className={`w-full bg-slate-900 border rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none transition resize-none ${
                      isDictating ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-700 focus:border-emerald-500'
                    }`}
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingNote || !noteText.trim()}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
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
                  <div className="text-center py-12 bg-[#0b1020]/60 rounded-2xl border border-white/5 p-6 text-slate-400 text-xs">
                    Заміток по цьому клієнту поки немає. Додайте першу замітку вище або надиктуйте голосом!
                  </div>
                ) : (
                  notes.map((n: any) => (
                    <div
                      key={n.id}
                      className="bg-[#0b1020]/80 border border-white/10 rounded-2xl p-4 space-y-1.5 shadow-md"
                    >
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span className="font-bold text-slate-200">
                          {n.user?.name || 'Співробітник CRM'}
                        </span>
                        <span>{new Date(n.createdAt).toLocaleString('uk-UA')}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line select-text">
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
              <div className="bg-[#0b1020]/80 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-indigo-400" />
                    <span>Пов'язані угоди та замовлення</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Усі замовлення та договори, зареєстровані за цим підприємством
                  </p>
                </div>
              </div>

              {((company as any)?.deals || []).length === 0 ? (
                <div className="text-center py-12 bg-[#0b1020]/60 rounded-2xl border border-white/5 p-6 text-slate-400 text-xs">
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
                      className="bg-[#0d1428]/90 border border-white/10 hover:border-indigo-500/50 rounded-2xl p-4 shadow-xl cursor-pointer transition space-y-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-white group-hover:text-indigo-300 transition truncate">
                          {d.title}
                        </h4>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition flex-shrink-0" />
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                        <span className="font-mono font-bold text-emerald-400">
                          {new Intl.NumberFormat('uk-UA').format(d.budget || 0)} ₴
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white/10 text-slate-300 font-semibold text-[10px]">
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
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-purple-500/40 rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/30">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-purple-400" />
                  <span>Обрати кандидата для закріплення за {displayName}</span>
                </h3>
                <p className="text-[11px] text-slate-400">Оберіть відповідного фахівця з бази рекрутингу</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAttachCandidateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search filter in modal */}
            <div className="p-3 border-b border-white/10 bg-slate-900/60">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Пошук за посадою, країною або ПІБ кандидата..."
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
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
                      className="p-3 rounded-xl bg-slate-900/80 border border-white/5 hover:border-purple-500/30 flex items-center justify-between gap-3 text-xs transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-300 font-bold flex items-center justify-center flex-shrink-0">
                          {cand.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-bold text-white truncate">{cand.name}</h5>
                          <p className="text-[11px] text-purple-300 truncate">
                            {cand.profession || 'Фахівець'} • {cand.country || 'Україна'}
                          </p>
                        </div>
                      </div>

                      {isAlreadyAssigned ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          Вже закріплено
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={attachingId === cand.id}
                          onClick={() => handleAttachCandidate(cand.id)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 flex-shrink-0"
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
