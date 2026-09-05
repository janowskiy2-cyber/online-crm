import React, { useState, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  User, 
  Phone, 
  Globe2, 
  Briefcase, 
  Building2, 
  Tag, 
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { api } from '../../services/api';
import { Company } from '../../types';

interface ResumeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  onSuccess: () => void;
}

export const ResumeImportModal: React.FC<ResumeImportModalProps> = ({
  isOpen,
  onClose,
  companies,
  onSuccess
}) => {
  const [resumeText, setResumeText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parsed Candidate Form State
  const [candidateData, setCandidateData] = useState<{
    name: string;
    phone: string;
    whatsapp: string;
    telegram: string;
    email: string;
    country: string;
    profession: string;
    experienceYears: number;
    skills: string[];
    summary: string;
    companyId: string;
    status: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFileBase64(result);
      
      // If text file, preview directly
      if (file.type.includes('text') || file.name.endsWith('.txt')) {
        setResumeText(typeof result === 'string' && !result.startsWith('data:') ? result : `[Завантажено файл ${file.name}]`);
      } else {
        if (!resumeText) {
          setResumeText(`[Файл резюме: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]\nВставте також текст резюме нижче для максимальної точності AI розпізнавання:`);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleParseResume = async () => {
    if (!resumeText.trim() && !uploadedFile) {
      setErrorMessage('Будь ласка, вставте текст резюме або завантажте файл');
      return;
    }

    setIsParsing(true);
    setErrorMessage(null);

    try {
      const res = await api.post('/ai/parse-resume', { text: resumeText });
      const parsed = res.data?.candidate;
      if (!parsed) throw new Error('Не вдалося розпізнати резюме');

      setCandidateData({
        name: parsed.name || 'Новий Кандидат',
        phone: parsed.phone || '+380',
        whatsapp: parsed.phone || '+380',
        telegram: '@',
        email: '',
        country: parsed.country || 'Узбекистан',
        profession: parsed.profession || 'Оператор виробництва',
        experienceYears: parsed.experienceYears || 2,
        skills: Array.isArray(parsed.skills) ? parsed.skills : ['Досвід роботи', 'Готовність до виїзду'],
        summary: parsed.summary || '',
        companyId: '',
        status: 'Кваліфіковано / Резюме'
      });
      setSuccessMessage('Дані кандидата успішно розпізнано! Перевірте інформацію та підтвердіть створення.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Помилка розпізнавання резюме');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveCandidate = async () => {
    if (!candidateData || !candidateData.name.trim()) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      // 1. Create candidate contact
      const contactRes = await api.post('/contacts', {
        name: candidateData.name,
        phone: candidateData.phone,
        whatsapp: candidateData.whatsapp || candidateData.phone,
        telegram: candidateData.telegram,
        email: candidateData.email || undefined,
        type: 'candidate',
        country: candidateData.country,
        profession: candidateData.profession,
        position: candidateData.profession,
        companyId: candidateData.companyId || null,
        status: candidateData.status
      });

      const newContact = contactRes.data;

      // 2. If original resume file was attached, upload directly to candidate documents in Cloudinary
      if (uploadedFile && fileBase64 && newContact?.id) {
        try {
          await api.post(`/contacts/${newContact.id}/files`, {
            fileName: uploadedFile.name,
            fileBase64: fileBase64,
            mimeType: uploadedFile.type || 'application/pdf',
            category: 'resume'
          });
        } catch (fErr) {
          console.warn('Could not attach file to contact:', fErr);
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Помилка збереження кандидата');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto font-['Inter',sans-serif]">
      <div className="bitrix-glass w-full max-w-2xl rounded-2xl border border-white/15 shadow-2xl overflow-hidden animate-in fade-in my-8">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Імпорт кандидата через Резюме</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  AI Auto-Parser
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Вставте текст CV або завантажте файл — система автоматично витягне ПІБ, контакти, навички та країну.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Step 1: Input Resume Area */}
          {!candidateData ? (
            <div className="space-y-4">
              {/* File Dropzone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 hover:border-purple-400/50 bg-slate-900/40 hover:bg-slate-900/70 rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".pdf,.doc,.docx,.txt" 
                  className="hidden" 
                />
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 group-hover:scale-105 transition">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white">
                    {uploadedFile ? `Обрано: ${uploadedFile.name}` : 'Натисніть для вибору файлу резюме'}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Підтримуються PDF, DOCX, DOC або TXT резюме
                  </p>
                </div>
              </div>

              {/* Textarea for raw CV */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Або вставте текст резюме / анкети кандидата:</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Автоматичний парсинг</span>
                </label>
                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder={`Приклад:
Алієв Фарход Баходирович
Телефон: +998 90 123-45-67
Країна: Узбекистан
Спеціальність: Зварювальник MIG/MAG, 4 роки досвіду
Навички: напівавтомат, читання креслень, виготовлення металоконструкцій.`}
                  rows={8}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition font-mono leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                >
                  Скасувати
                </button>
                <button
                  type="button"
                  onClick={handleParseResume}
                  disabled={isParsing || (!resumeText.trim() && !uploadedFile)}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-purple-600/30"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Розпізнавання AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Розпізнати кандидата</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Step 2: Review & Edit Parsed Data */
            <div className="space-y-4">
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-300 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Розпізнано дані кандидата. Перевірте та відкоригуйте за потреби:</span>
                </div>
                <button
                  onClick={() => setCandidateData(null)}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Вставити інше
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                {/* Full Name */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    ПІБ Кандидата *
                  </label>
                  <input
                    type="text"
                    value={candidateData.name}
                    onChange={(e) => setCandidateData({ ...candidateData, name: e.target.value })}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-white font-bold focus:border-purple-500 transition"
                  />
                </div>

                {/* Profession / Position */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                    <span>Спеціальність / Професія</span>
                  </label>
                  <input
                    type="text"
                    value={candidateData.profession}
                    onChange={(e) => setCandidateData({ ...candidateData, profession: e.target.value })}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-white font-medium focus:border-purple-500 transition"
                  />
                </div>

                {/* Country */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Globe2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Країна походження</span>
                  </label>
                  <select
                    value={candidateData.country}
                    onChange={(e) => setCandidateData({ ...candidateData, country: e.target.value })}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-white font-medium focus:border-purple-500 transition cursor-pointer"
                  >
                    <option value="Узбекистан">Узбекистан</option>
                    <option value="Індія">Індія</option>
                    <option value="Туреччина">Туреччина</option>
                    <option value="Бангладеш">Бангладеш</option>
                    <option value="Філіппіни">Філіппіни</option>
                    <option value="Непал">Непал</option>
                    <option value="Азербайджан">Азербайджан</option>
                    <option value="Україна">Україна</option>
                    <option value="Інша">Інша країна</option>
                  </select>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-blue-400" />
                    <span>Номер телефону</span>
                  </label>
                  <input
                    type="text"
                    value={candidateData.phone}
                    onChange={(e) => setCandidateData({ 
                      ...candidateData, 
                      phone: e.target.value,
                      whatsapp: candidateData.whatsapp === candidateData.phone ? e.target.value : candidateData.whatsapp 
                    })}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-white font-medium focus:border-purple-500 transition"
                  />
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <span className="text-emerald-400 font-bold">WA</span>
                    <span>WhatsApp номер</span>
                  </label>
                  <input
                    type="text"
                    value={candidateData.whatsapp}
                    onChange={(e) => setCandidateData({ ...candidateData, whatsapp: e.target.value })}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-white font-medium focus:border-purple-500 transition"
                  />
                </div>

                {/* Telegram */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <span className="text-sky-400 font-bold">TG</span>
                    <span>Telegram username</span>
                  </label>
                  <input
                    type="text"
                    value={candidateData.telegram}
                    onChange={(e) => setCandidateData({ ...candidateData, telegram: e.target.value })}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-white font-medium focus:border-purple-500 transition"
                  />
                </div>

                {/* Assign Employer */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Закріпити за роботодавцем</span>
                  </label>
                  <select
                    value={candidateData.companyId}
                    onChange={(e) => setCandidateData({ ...candidateData, companyId: e.target.value })}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-white font-medium focus:border-purple-500 transition cursor-pointer"
                  >
                    <option value="">-- Вільний резерв (без роботодавця) --</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>
                        🏢 {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Skills Tags */}
              {candidateData.skills && candidateData.skills.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-purple-400" />
                    <span>Ключові навички з резюме:</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {candidateData.skills.map((skill, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-slate-800 border border-white/10 rounded-lg text-slate-200 text-[11px]">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Attached file badge */}
              {uploadedFile && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs text-emerald-300">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>Файл <strong>{uploadedFile.name}</strong> буде автоматично збережено в хмарному сховищі кандидата</span>
                  </div>
                </div>
              )}

              {/* Bottom Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setCandidateData(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                >
                  Назад до тексту
                </button>
                <button
                  type="button"
                  onClick={handleSaveCandidate}
                  disabled={isSaving || !candidateData.name.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-600/30"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Збереження в базі...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Зберегти кандидата в базу</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
