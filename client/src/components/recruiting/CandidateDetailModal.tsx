import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Briefcase, 
  MapPin, 
  Phone, 
  Mail, 
  Globe2, 
  FileText, 
  Video, 
  Building2, 
  Calendar, 
  DollarSign, 
  Award, 
  CheckCircle2, 
  ExternalLink, 
  Download, 
  Clock, 
  Languages, 
  Car, 
  Edit3, 
  Save, 
  Play, 
  ShieldCheck,
  Send,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { Contact, Company, CandidateDocument } from '../../types';
import { api, resolveMediaUrl } from '../../services/api';

interface CandidateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Contact;
  companies: Company[];
  onUpdateCandidate: (updated: Contact) => void;
  onOpenFilesModal?: (candidate: Contact) => void;
  initialTab?: 'overview' | 'resume' | 'documents' | 'employer';
}

export const CandidateDetailModal: React.FC<CandidateDetailModalProps> = ({
  isOpen,
  onClose,
  candidate,
  companies,
  onUpdateCandidate,
  onOpenFilesModal,
  initialTab = 'overview'
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'resume' | 'documents' | 'employer'>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form edit state
  const [name, setName] = useState(candidate.name);
  const [profession, setProfession] = useState(candidate.profession || candidate.position || '');
  const [country, setCountry] = useState(candidate.country || '');
  const [citizenship, setCitizenship] = useState(candidate.citizenship || candidate.country || '');
  const [phone, setPhone] = useState(candidate.phone || '');
  const [whatsapp, setWhatsapp] = useState(candidate.whatsapp || '');
  const [telegram, setTelegram] = useState(candidate.telegram || '');
  const [email, setEmail] = useState(candidate.email || '');
  const [experienceYears, setExperienceYears] = useState<number | ''>(candidate.experienceYears ?? '');
  const [salaryExpectation, setSalaryExpectation] = useState(candidate.salaryExpectation || '');
  const [languages, setLanguages] = useState(candidate.languages || '');
  const [driverLicense, setDriverLicense] = useState(candidate.driverLicense || '');
  const [bio, setBio] = useState(candidate.bio || '');
  const [status, setStatus] = useState(candidate.status || 'Скринінг / Анкета');
  const [companyId, setCompanyId] = useState(candidate.companyId || '');

  if (!isOpen) return null;

  // Resolve direct PDF URL
  // If candidate has resumeUrl, use it; otherwise, use the dynamic server PDF route
  const rawResumeUrl = candidate.resumeUrl || `/api/contacts/${candidate.id}/resume.pdf`;
  const resolvedResumeUrl = resolveMediaUrl(rawResumeUrl);

  // Parse skills
  let skillsList: string[] = [];
  if (Array.isArray(candidate.skills)) {
    skillsList = candidate.skills;
  } else if (typeof candidate.skills === 'string' && candidate.skills.trim()) {
    try {
      if (candidate.skills.startsWith('[')) {
        skillsList = JSON.parse(candidate.skills);
      } else {
        skillsList = candidate.skills.split(',').map(s => s.trim()).filter(Boolean);
      }
    } catch {
      skillsList = candidate.skills.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  // Parse documents
  let documents: CandidateDocument[] = [];
  if (Array.isArray(candidate.documents)) {
    documents = candidate.documents;
  } else if (typeof candidate.documents === 'string' && candidate.documents.trim()) {
    try {
      documents = JSON.parse(candidate.documents);
    } catch {
      documents = [];
    }
  }

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await api.put(`/contacts/${candidate.id}`, {
        name,
        profession,
        position: profession,
        country,
        citizenship,
        phone,
        whatsapp,
        telegram,
        email,
        experienceYears: experienceYears === '' ? null : Number(experienceYears),
        salaryExpectation,
        languages,
        driverLicense,
        bio,
        status,
        companyId: companyId || null
      });

      if (res.data) {
        onUpdateCandidate(res.data);
        setSaveSuccess(true);
        setIsEditing(false);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e: any) {
      setSaveError(e.response?.data?.error || e.message || 'Помилка збереження даних');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    try {
      const res = await api.put(`/contacts/${candidate.id}`, { status: newStatus });
      if (res.data) onUpdateCandidate(res.data);
    } catch (err) {
      console.error('Status update failed', err);
    }
  };

  const assignedCompany = companies.find(c => c.id === (candidate.companyId || companyId));

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bitrix-glass w-full max-w-4xl max-h-[92vh] rounded-3xl border border-white/15 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* TOP HEADER */}
        <div className="p-5 sm:p-6 bg-slate-900/90 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600/40 to-teal-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-black text-xl shadow-lg flex-shrink-0">
              {candidate.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-black text-white tracking-tight">{candidate.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {candidate.status || 'Скринінг / Анкета'}
                </span>
                {candidate.country && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                    <Globe2 className="w-3 h-3" /> {candidate.country}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-emerald-400 font-semibold mt-0.5">
                {candidate.profession || candidate.position || 'Пошукач роботи / Кандидат'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 border border-white/10 transition"
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                <span>Редагувати анкету</span>
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/30 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Збереження...' : 'Зберегти'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 flex items-center justify-center transition border border-white/10"
              title="Закрити (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* QUICK CONTACTS & ACTION STRIP */}
        <div className="bg-slate-950/60 px-5 sm:px-6 py-2.5 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap text-slate-300">
            {candidate.phone && (
              <a 
                href={`tel:${candidate.phone}`} 
                className="flex items-center gap-1.5 hover:text-emerald-400 transition font-medium"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>{candidate.phone}</span>
              </a>
            )}
            {candidate.whatsapp && (
              <a 
                href={`https://wa.me/${candidate.whatsapp.replace(/[^0-9]/g, '')}`} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-1 hover:text-emerald-400 transition font-medium"
              >
                <span className="font-extrabold text-emerald-400">WA:</span>
                <span>{candidate.whatsapp}</span>
              </a>
            )}
            {candidate.telegram && (
              <a 
                href={`tg://resolve?phone=${candidate.phone || candidate.telegram}`} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-1 hover:text-sky-400 transition font-medium"
              >
                <span className="font-extrabold text-sky-400">TG:</span>
                <span>{candidate.telegram}</span>
              </a>
            )}
            {candidate.email && (
              <a 
                href={`mailto:${candidate.email}`} 
                className="flex items-center gap-1.5 hover:text-blue-400 transition font-medium"
              >
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                <span>{candidate.email}</span>
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={resolvedResumeUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 rounded-lg font-bold flex items-center gap-1.5 border border-purple-500/40 transition"
              title="Відкрити PDF у новій вкладці браузера"
            >
              <FileText className="w-3.5 h-3.5 text-purple-300" />
              <span>Відкрити PDF</span>
              <ExternalLink className="w-3 h-3 text-purple-300 opacity-70" />
            </a>

            <a
              href={resolvedResumeUrl}
              download={`CV_${candidate.name.replace(/\s+/g, '_')}.pdf`}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium flex items-center gap-1 border border-white/10 transition"
              title="Завантажити файл резюме"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* NOTIFICATION MESSAGES */}
        {saveSuccess && (
          <div className="mx-6 mt-3 p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Зміни в анкеті кандидата успішно збережено!</span>
          </div>
        )}
        {saveError && (
          <div className="mx-6 mt-3 p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{saveError}</span>
          </div>
        )}

        {/* TABS NAVIGATION */}
        <div className="flex items-center px-6 pt-3 border-b border-white/10 gap-2 bg-slate-900/40 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Повна анкета кандидата</span>
          </button>

          <button
            onClick={() => setActiveTab('resume')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'resume'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Оригінал Резюме (PDF)</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'documents'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Відео & Документи ({documents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('employer')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'employer'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Роботодавець & Стан</span>
          </button>
        </div>

        {/* MODAL BODY CONTENT */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* TAB 1: OVERVIEW & PROFILE */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* KEY HIGHLIGHTS METRICS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 space-y-1">
                  <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Досвід роботи</span>
                  </div>
                  <div className="text-base font-extrabold text-white">
                    {candidate.experienceYears ? `${candidate.experienceYears} років` : 'Кваліфікований'}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 space-y-1">
                  <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                    <span>Очікувана ЗП</span>
                  </div>
                  <div className="text-base font-extrabold text-amber-300">
                    {candidate.salaryExpectation || 'Договірна'}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 space-y-1">
                  <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                    <Car className="w-3.5 h-3.5 text-blue-400" />
                    <span>Водійські права</span>
                  </div>
                  <div className="text-xs font-bold text-slate-200 truncate" title={candidate.driverLicense || 'Не зазначено'}>
                    {candidate.driverLicense || 'Не зазначено'}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 space-y-1">
                  <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                    <Languages className="w-3.5 h-3.5 text-purple-400" />
                    <span>Мовні навички</span>
                  </div>
                  <div className="text-xs font-bold text-slate-200 truncate" title={candidate.languages || 'Не зазначено'}>
                    {candidate.languages || 'Рідна мова'}
                  </div>
                </div>
              </div>

              {/* EDIT FORM (When editing is true) */}
              {isEditing ? (
                <div className="bg-slate-900/80 p-5 rounded-2xl border border-white/10 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-emerald-400" />
                    <span>Редагування профілю</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div>
                      <label className="text-slate-400 font-medium block mb-1">Повне ім'я</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 font-medium block mb-1">Спеціальність / Посада</label>
                      <input
                        type="text"
                        value={profession}
                        onChange={(e) => setProfession(e.target.value)}
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 font-medium block mb-1">Країна походження</label>
                      <input
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 font-medium block mb-1">Громадянство</label>
                      <input
                        type="text"
                        value={citizenship}
                        onChange={(e) => setCitizenship(e.target.value)}
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 font-medium block mb-1">Телефон</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 font-medium block mb-1">WhatsApp</label>
                      <input
                        type="text"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 font-medium block mb-1">Telegram</label>
                      <input
                        type="text"
                        value={telegram}
                        onChange={(e) => setTelegram(e.target.value)}
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 font-medium block mb-1">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 font-medium block mb-1">Досвід (років)</label>
                      <input
                        type="number"
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 font-medium block mb-1">Очікувана ЗП (€ або PLN)</label>
                      <input
                        type="text"
                        value={salaryExpectation}
                        onChange={(e) => setSalaryExpectation(e.target.value)}
                        placeholder="напр. 1500 - 1800 €"
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <label className="text-slate-400 font-medium block mb-1">Знання мов</label>
                      <input
                        type="text"
                        value={languages}
                        onChange={(e) => setLanguages(e.target.value)}
                        placeholder="напр. Польська B1, Англійська A2, Українська рідна"
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <label className="text-slate-400 font-medium block mb-1">Посвідчення водія / Ліцензії / Код 95</label>
                      <input
                        type="text"
                        value={driverLicense}
                        onChange={(e) => setDriverLicense(e.target.value)}
                        placeholder="напр. Кат. B, C, CE, Код 95 (ЄС), Чіп-карта водія"
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <label className="text-slate-400 font-medium block mb-1">Професійна біографія / Опис досвіду</label>
                      <textarea
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                    >
                      Скасувати
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30"
                    >
                      {isSaving ? 'Збереження...' : 'Зберегти зміни'}
                    </button>
                  </div>
                </div>
              ) : null}

              {/* PROFESSIONAL BIO */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/5 space-y-2.5">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-400" />
                  <span>Професійний профіль та біографія</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {candidate.bio || 'Детальний опис досвіду кандидата не внесено. Натисніть "Редагувати анкету", щоб додати інформацію.'}
                </p>
              </div>

              {/* SKILLS CHIPS */}
              {skillsList.length > 0 && (
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/5 space-y-3">
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span>Підтверджені професійні навички</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {skillsList.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/25"
                      >
                        ✓ {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ATTACHED EMPLOYER CARD */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-1">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <span>Закріплений роботодавець</span>
                  </div>
                  {assignedCompany ? (
                    <div className="text-base font-extrabold text-white">
                      🏢 {assignedCompany.name}
                      <span className="text-xs font-medium text-slate-400 ml-2">
                        ({assignedCompany.address || assignedCompany.industry || 'Міжнародне підприємство'})
                      </span>
                    </div>
                  ) : (
                    <div className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                      <span>⚠️ Вільний резерв (Не закріплений)</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setActiveTab('employer')}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/45 text-blue-300 text-xs font-bold border border-blue-500/40 transition"
                >
                  Змінити роботодавця
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: EMBEDDED RESUME (PDF) VIEWER */}
          {activeTab === 'resume' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-900/90 p-3.5 rounded-2xl border border-white/10">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span>Оригінальне резюме у форматі <strong>A4 PDF</strong> з повною історією роботи</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={resolvedResumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-purple-600/30"
                  >
                    <span>Відкрити у вікні</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={resolvedResumeUrl}
                    download={`CV_${candidate.name.replace(/\s+/g, '_')}.pdf`}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 border border-white/10 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Завантажити</span>
                  </a>
                </div>
              </div>

              {/* Embedded PDF iframe */}
              <div className="w-full h-[620px] rounded-2xl overflow-hidden border border-white/15 bg-slate-950 shadow-inner relative flex flex-col">
                <iframe
                  src={`${resolvedResumeUrl}#toolbar=1&navpanes=0`}
                  title={`Резюме - ${candidate.name}`}
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          )}

          {/* TAB 3: DOCUMENTS & VIDEO */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              
              {/* VIDEO BUSINESS CARD */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/5 space-y-3">
                <h3 className="text-xs font-extrabold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                  <Video className="w-4 h-4 text-purple-400" />
                  <span>Відеовізитівка кандидата</span>
                </h3>
                {candidate.videoUrl ? (
                  <div className="rounded-2xl overflow-hidden border border-white/10 bg-black max-w-xl mx-auto">
                    <video
                      src={resolveMediaUrl(candidate.videoUrl)}
                      controls
                      className="w-full max-h-80 object-cover"
                    />
                  </div>
                ) : (
                  <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl">
                    <Video className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
                    <p className="text-xs text-slate-400">Відеовізитівку ще не завантажено</p>
                    <button
                      onClick={() => onOpenFilesModal && onOpenFilesModal(candidate)}
                      className="mt-3 px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 rounded-xl text-xs font-bold border border-purple-500/30 inline-flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" /> Завантажити відео
                    </button>
                  </div>
                )}
              </div>

              {/* DOCUMENTS LIST */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Особисті документи & Сертифікати</span>
                  </h3>
                  <button
                    onClick={() => onOpenFilesModal && onOpenFilesModal(candidate)}
                    className="px-3 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 rounded-lg text-xs font-bold border border-emerald-500/30"
                  >
                    + Керувати файлами
                  </button>
                </div>

                {documents.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">
                    Немає додаткових файлів (закордонний паспорт, права, довідка про несудимість).
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3.5 rounded-xl bg-slate-800/80 border border-white/5 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                          <div className="truncate">
                            <div className="text-xs font-bold text-white truncate">{doc.name}</div>
                            <div className="text-[10px] text-slate-400 uppercase">{doc.category || 'Документ'}</div>
                          </div>
                        </div>

                        <a
                          href={resolveMediaUrl(doc.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-400 hover:text-white transition rounded-lg hover:bg-white/5 flex-shrink-0"
                          title="Переглянути"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 4: EMPLOYER & STATUS */}
          {activeTab === 'employer' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/5 space-y-4">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <span>Прив'язка до підприємства / роботодавця</span>
                </h3>

                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-1.5">
                    Оберіть компанію-роботодавця:
                  </label>
                  <select
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">-- Вільний резерв (Без роботодавця) --</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>
                        🏢 {c.name} {c.address ? `(${c.address})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-3 border-t border-white/5 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/30"
                  >
                    {isSaving ? 'Збереження...' : 'Зберегти призначення'}
                  </button>
                </div>
              </div>

              {/* RECRUITMENT STATUS SELECTOR */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/5 space-y-4">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Етап у рекрутинговому процесі</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    'Скринінг / Анкета',
                    'Співбесіда з роботодавцем',
                    'Оформлення візи / дозволу',
                    'Виїзд / Готовий до виходу',
                    'Працевлаштований',
                    'Відмова / Не відповідає'
                  ].map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(st)}
                      className={`p-3 rounded-xl text-xs font-bold text-left transition border flex items-center justify-between ${
                        candidate.status === st
                          ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50 shadow-sm'
                          : 'bg-slate-800/80 text-slate-300 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <span>{st}</span>
                      {candidate.status === st && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
