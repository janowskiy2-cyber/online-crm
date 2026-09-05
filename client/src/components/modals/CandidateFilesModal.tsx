import React, { useState, useRef } from 'react';
import { 
  X, 
  Video, 
  FileText, 
  Upload, 
  Trash2, 
  ExternalLink, 
  Download, 
  Play, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  File, 
  Image as ImageIcon,
  ShieldCheck,
  Plus,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import { Contact, CandidateDocument } from '../../types';

interface CandidateFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Contact;
  onUpdateCandidate: (updated: Contact) => void;
}

export const CandidateFilesModal: React.FC<CandidateFilesModalProps> = ({
  isOpen,
  onClose,
  candidate,
  onUpdateCandidate
}) => {
  const [activeTab, setActiveTab] = useState<'video' | 'documents'>('video');
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Direct video URL input
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [isSavingVideoUrl, setIsSavingVideoUrl] = useState(false);

  // Upload category
  const [selectedCategory, setSelectedCategory] = useState<'resume' | 'video' | 'passport' | 'certificate' | 'contract' | 'document'>('document');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Parse documents from JSON string if needed
  let documents: CandidateDocument[] = [];
  if (Array.isArray(candidate.documents)) {
    documents = candidate.documents;
  } else if (typeof candidate.documents === 'string' && candidate.documents.trim()) {
    try {
      documents = JSON.parse(candidate.documents);
    } catch (e) {
      documents = [];
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isVideoFile = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: max 50MB for video, 20MB for docs
    const maxBytes = isVideoFile ? 50 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMessage(`Файл занадто великий. Максимальний розмір: ${isVideoFile ? '50MB' : '20MB'}`);
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const category = isVideoFile ? 'video' : selectedCategory;
        const res = await api.post(`/contacts/${candidate.id}/files`, {
          fileName: file.name,
          fileBase64: base64,
          mimeType: file.type || (isVideoFile ? 'video/mp4' : 'application/octet-stream'),
          category
        });

        if (res.data?.contact) {
          onUpdateCandidate(res.data.contact);
          setSuccessMessage(isVideoFile ? 'Відеовізитівку успішно завантажено та стиснуто!' : 'Документ успішно збережено в хмарі!');
          setTimeout(() => setSuccessMessage(null), 3500);
        }
      } catch (err: any) {
        setErrorMessage(err.response?.data?.error || err.message || 'Помилка завантаження файлу');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (videoInputRef.current) videoInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      setIsUploading(false);
      setErrorMessage('Помилка читання файлу з диска');
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteDocument = async (docId: string, docName: string) => {
    if (!window.confirm(`Видалити файл "${docName}" зі сховища?`)) return;
    setIsDeletingId(docId);
    setErrorMessage(null);
    try {
      const res = await api.delete(`/contacts/${candidate.id}/files/${docId}`);
      if (res.data?.contact) {
        onUpdateCandidate(res.data.contact);
        setSuccessMessage('Файл успішно видалено зі сховища');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      setErrorMessage('Помилка видалення файлу');
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleSaveVideoUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideoUrl.trim()) return;
    setIsSavingVideoUrl(true);
    setErrorMessage(null);
    try {
      const res = await api.put(`/contacts/${candidate.id}/video`, {
        videoUrl: newVideoUrl.trim()
      });
      if (res.data?.contact) {
        onUpdateCandidate(res.data.contact);
        setNewVideoUrl('');
        setSuccessMessage('Відеопосилання оновлено');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setErrorMessage('Помилка збереження посилання на відео');
    } finally {
      setIsSavingVideoUrl(false);
    }
  };

  const handleClearVideo = async () => {
    if (!window.confirm('Видалити поточну відеовізитівку?')) return;
    try {
      const res = await api.put(`/contacts/${candidate.id}/video`, { videoUrl: null });
      if (res.data?.contact) {
        onUpdateCandidate(res.data.contact);
        setSuccessMessage('Відеовізитівку видалено');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setErrorMessage('Помилка видалення відео');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'resume':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">Резюме / CV</span>;
      case 'passport':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">Паспорт / ID</span>;
      case 'certificate':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">Сертифікат / Диплом</span>;
      case 'contract':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Трудовий Договір</span>;
      case 'video':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">Відеопрезентація</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300">Документ</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto font-['Inter',sans-serif]">
      <div className="bitrix-glass w-full max-w-3xl rounded-2xl border border-white/15 shadow-2xl overflow-hidden animate-in fade-in my-8">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 font-bold text-lg">
              {candidate.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {candidate.name}
                </h2>
                {candidate.country && (
                  <span className="text-xs text-slate-400 font-medium">({candidate.country})</span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                {candidate.position || candidate.profession || 'Кандидат'} • Медіатека та сховище файлів
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

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-slate-950/40 px-6 pt-3 gap-3">
          <button
            onClick={() => setActiveTab('video')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 transition border-b-2 ${
              activeTab === 'video'
                ? 'border-purple-400 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Відеовізитівка {candidate.videoUrl && '✓'}</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 transition border-b-2 ${
              activeTab === 'documents'
                ? 'border-purple-400 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Документи та файли ({documents.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
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

          {/* TAB 1: VIDEO */}
          {activeTab === 'video' && (
            <div className="space-y-4">
              {candidate.videoUrl ? (
                <div className="space-y-3">
                  {/* Video Player Box */}
                  <div className="rounded-2xl overflow-hidden bg-black/90 border border-white/10 aspect-video flex items-center justify-center relative shadow-2xl">
                    {candidate.videoUrl.includes('youtube.com') || candidate.videoUrl.includes('youtu.be') ? (
                      <iframe
                        src={candidate.videoUrl.replace('watch?v=', 'embed/')}
                        className="w-full h-full border-0"
                        allowFullScreen
                        title="Candidate Video"
                      />
                    ) : (
                      <video
                        src={candidate.videoUrl}
                        controls
                        playsInline
                        className="w-full h-full max-h-[400px] object-contain"
                      >
                        Ваш браузер не підтримує тег video.
                      </video>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5 text-xs">
                    <div className="flex items-center gap-2 text-slate-300 truncate max-w-md">
                      <Video className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <span className="truncate">{candidate.videoUrl}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={candidate.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Відкрити
                      </a>
                      <button
                        onClick={handleClearVideo}
                        className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Видалити
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* No Video - Upload or URL Form */
                <div className="space-y-4">
                  {/* Upload video file dropzone */}
                  <div
                    onClick={() => videoInputRef.current?.click()}
                    className="border-2 border-dashed border-purple-500/30 hover:border-purple-400 bg-purple-950/10 hover:bg-purple-950/20 rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 group"
                  >
                    <input
                      type="file"
                      ref={videoInputRef}
                      onChange={(e) => handleFileUpload(e, true)}
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                    />
                    <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300 group-hover:scale-110 transition shadow-lg">
                      {isUploading ? (
                        <Loader2 className="w-7 h-7 animate-spin" />
                      ) : (
                        <Video className="w-7 h-7" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white">
                        {isUploading ? 'Стиснення та передача в хмару...' : 'Завантажити відеопрезентацію кандидата'}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Підтримуються формати MP4, WebM та MOV (до 50MB). Відео автоматично оптимізується до 720p HD для економії диска.
                      </p>
                    </div>
                  </div>

                  {/* Or link */}
                  <form onSubmit={handleSaveVideoUrl} className="pt-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Або вкажіть пряме посилання на відео (Cloudinary, YouTube або Google Drive):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={newVideoUrl}
                        onChange={(e) => setNewVideoUrl(e.target.value)}
                        placeholder="https://res.cloudinary.com/... або https://youtu.be/..."
                        className="flex-1 bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition"
                      />
                      <button
                        type="submit"
                        disabled={isSavingVideoUrl || !newVideoUrl.trim()}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        {isSavingVideoUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        <span>Зберегти</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              {/* Upload New Document Box */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-purple-400" />
                    <span>Додати новий документ до кандидата:</span>
                  </span>
                  
                  {/* Category selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Тип:</span>
                    <select
                      value={selectedCategory}
                      onChange={(e: any) => setSelectedCategory(e.target.value)}
                      className="bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="document">Звичайний документ</option>
                      <option value="resume">Резюме / CV</option>
                      <option value="passport">Паспорт / ID</option>
                      <option value="certificate">Сертифікат / Диплом</option>
                      <option value="contract">Трудовий Договір</option>
                    </select>
                  </div>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-white/20 hover:border-purple-400/60 bg-slate-950/40 rounded-xl p-4 text-center cursor-pointer transition flex items-center justify-center gap-3 group"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleFileUpload(e, false)}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                  />
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-300 group-hover:scale-105 transition">
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-white">
                      {isUploading ? 'Завантаження та оптимізація в Cloudinary...' : 'Виберіть PDF, DOCX або зображення'}
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Автоматично зберігається в хмарному сховищі з постійним доступом
                    </p>
                  </div>
                </div>
              </div>

              {/* Document List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Збережені файли ({documents.length})
                </h4>

                {documents.length === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-white/5">
                    <FileText className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                    <p className="text-xs text-slate-400">До цього кандидата ще не додано жодного документа</p>
                  </div>
                ) : (
                  documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 flex items-center justify-between gap-3 hover:border-purple-500/30 transition group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-purple-300 flex-shrink-0">
                          {doc.type.includes('image') ? (
                            <ImageIcon className="w-4 h-4 text-emerald-400" />
                          ) : doc.type.includes('video') ? (
                            <Video className="w-4 h-4 text-pink-400" />
                          ) : (
                            <FileText className="w-4 h-4 text-blue-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white truncate max-w-xs sm:max-w-sm">
                              {doc.name}
                            </span>
                            {getCategoryBadge(doc.category)}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {formatFileSize(doc.size)} {doc.size ? '•' : ''} {new Date(doc.uploadedAt).toLocaleDateString('uk-UA')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 text-slate-400 hover:text-purple-300 hover:bg-slate-800 rounded-lg transition"
                          title="Відкрити документ у новій вкладці"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDeleteDocument(doc.id, doc.name)}
                          disabled={isDeletingId === doc.id}
                          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition disabled:opacity-50"
                          title="Видалити зі сховища"
                        >
                          {isDeletingId === doc.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-900/40 flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Всі файли захищені та доступні в системі 24/7</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition"
          >
            Закрити
          </button>
        </div>
      </div>
    </div>
  );
};
