import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Globe2, 
  CheckCircle2, 
  FileText, 
  Video, 
  Calendar, 
  Building2, 
  Plus, 
  Filter, 
  Trash2, 
  Phone, 
  Mail, 
  X, 
  Check, 
  Sparkles,
  ExternalLink,
  Briefcase,
  Play,
  ArrowRight,
  UserCheck,
  ChevronDown,
  Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Contact, Company } from '../../types';

export const CandidatesView: React.FC = () => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState('');
  const [filterEmployerId, setFilterEmployerId] = useState('all');
  const [filterCountry, setFilterCountry] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeVideoModal, setActiveVideoModal] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '+380',
    whatsapp: '+380',
    telegram: '@',
    email: '',
    companyId: '', // Employer linking
    profession: 'Оператор автоматичної лінії / Склад',
    country: 'Узбекистан',
    status: 'Скринінг / Анкета',
    videoUrl: ''
  });

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/contacts/companies/all');
      if (res.data && Array.isArray(res.data)) {
        setCompanies(res.data);
      }
    } catch (e) {
      console.warn('Companies fetch error:', e);
    }
  };

  const fetchCandidates = async () => {
    try {
      const res = await api.get('/contacts', { params: { search, type: 'candidate' } });
      if (res.data && Array.isArray(res.data)) {
        setCandidates(res.data);
      }
    } catch (e) {
      console.warn('Candidates fetch:', e);
    }
  };

  useEffect(() => {
    fetchCandidates();
    fetchCompanies();
  }, [search]);

  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setLoading(true);
    try {
      await api.post('/contacts', {
        name: formData.name,
        phone: formData.phone,
        whatsapp: formData.whatsapp || formData.phone,
        telegram: formData.telegram,
        email: formData.email || undefined,
        companyId: formData.companyId || null,
        type: 'candidate',
        country: formData.country,
        profession: formData.profession,
        position: formData.profession,
        status: formData.status,
        videoUrl: formData.videoUrl
      });
      setIsCreateOpen(false);
      setFormData({
        name: '',
        phone: '+380',
        whatsapp: '+380',
        telegram: '@',
        email: '',
        companyId: '',
        profession: 'Оператор автоматичної лінії / Склад',
        country: 'Узбекистан',
        status: 'Скринінг / Анкета',
        videoUrl: ''
      });
      fetchCandidates();
    } catch (e) {
      alert('Помилка збереження кандидата');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignEmployer = async (candidateId: string, companyId: string) => {
    try {
      await api.put(`/contacts/${candidateId}`, {
        companyId: companyId ? companyId : null
      });
      fetchCandidates();
    } catch (e) {
      alert('Не вдалося призначити роботодавця');
    }
  };

  const handleDeleteCandidate = async (id: string, name: string) => {
    if (!window.confirm(`Видалити кандидата ${name}?`)) return;
    try {
      await api.delete(`/contacts/${id}`);
      setCandidates(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await api.get(`/export/candidates?country=${filterCountry}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `candidates_${filterCountry}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('Помилка завантаження експорту');
    }
  };

  // Filter candidates
  const filteredCandidates = candidates.filter(cand => {
    if (filterEmployerId !== 'all') {
      if (filterEmployerId === 'unassigned') {
        if (cand.companyId) return false;
      } else {
        if (cand.companyId !== filterEmployerId) return false;
      }
    }
    if (filterCountry !== 'all') {
      if ((cand as any).country !== filterCountry) return false;
    }
    return true;
  });

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto bitrix-wallpaper font-['Inter',sans-serif] select-none">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header (Bitrix24 Glassmorphism) */}
        <div className="bitrix-glass rounded-2xl p-6 shadow-2xl border border-white/10 backdrop-blur-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <Users className="w-3 h-3" /> ПУЛ КАНДИДАТІВ
                </span>
                <span className="text-xs text-slate-400 font-mono">Пошукачі роботи & Працевлаштування</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <span>База кандидатів</span>
                <span className="text-sm px-2.5 py-0.5 rounded-xl bg-white/10 text-slate-300 font-semibold">
                  {candidates.length} анкет
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Міжнародні та локальні кандидати для працевлаштування. Кожного кандидата можна закріпити за конкретним роботодавцем або тримати в загальному резерві.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => navigate('/contacts')}
                className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-white/10 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>База роботодавців ({companies.length})</span>
              </button>

              <button
                onClick={handleExportCsv}
                className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-white/10 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                title="Завантажити список кандидатів у форматі Excel (CSV)"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Експорт в Excel (CSV)</span>
              </button>

              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-600/30 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Додати кандидата</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
            <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5">
              <div className="text-[11px] text-slate-400 font-medium">Всього в базі</div>
              <div className="text-xl font-black text-white mt-0.5">{candidates.length} чол.</div>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5">
              <div className="text-[11px] text-slate-400 font-medium">Прив'язані до роботодавців</div>
              <div className="text-xl font-black text-blue-400 mt-0.5">
                {candidates.filter(c => c.companyId).length} чол.
              </div>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5">
              <div className="text-[11px] text-slate-400 font-medium">Вільний резерв</div>
              <div className="text-xl font-black text-amber-400 mt-0.5">
                {candidates.filter(c => !c.companyId).length} чол.
              </div>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5">
              <div className="text-[11px] text-slate-400 font-medium">Доступні роботодавці</div>
              <div className="text-xl font-black text-purple-400 mt-0.5">{companies.length} компаній</div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bitrix-glass p-3 rounded-xl border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Пошук за ім'ям, телефоном, спеціальністю..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Employer Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">Фільтр роботодавця:</span>
            <select
              value={filterEmployerId}
              onChange={(e) => setFilterEmployerId(e.target.value)}
              className="bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Всі роботодавці ({candidates.length})</option>
              <option value="unassigned">⚠️ Не закріплені в резерві ({candidates.filter(c => !c.companyId).length})</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>
                  🏢 {c.name} ({candidates.filter(cand => cand.companyId === c.id).length})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Country Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {['all', 'Узбекистан', 'Індія', 'Туреччина', 'Бангладеш', 'Філіппіни', 'Непал'].map(c => (
            <button
              key={c}
              onClick={() => setFilterCountry(c)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition border ${
                filterCountry === c
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                  : 'bg-slate-900/60 text-slate-300 border-white/10 hover:border-white/20'
              }`}
            >
              {c === 'all' ? 'Всі країни' : c}
            </button>
          ))}
        </div>

        {/* Candidates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCandidates.length === 0 ? (
            <div className="col-span-full bitrix-glass rounded-2xl p-12 text-center border border-white/10">
              <Users className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-50" />
              <h3 className="text-lg font-bold text-white">Кандидатів не знайдено</h3>
              <p className="text-xs text-slate-400 mt-1">Додайте нового кандидата або змініть критерії фільтрації</p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Додати кандидата
              </button>
            </div>
          ) : (
            filteredCandidates.map((cand) => (
              <div
                key={cand.id}
                className="bitrix-glass rounded-2xl p-5 border border-white/10 hover:border-emerald-500/40 transition-all duration-200 shadow-xl flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header: Avatar & Info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600/30 to-teal-600/30 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-black text-base shadow-inner flex-shrink-0">
                        {cand.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-white group-hover:text-emerald-400 transition tracking-tight">
                          {cand.name}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">
                          {cand.position || 'Пошукач роботи'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteCandidate(cand.id, cand.name)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-rose-400 transition"
                      title="Видалити"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Contact Links */}
                  <div className="mt-3.5 space-y-1.5 text-xs text-slate-300 pt-3 border-t border-white/10">
                    {cand.phone && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <Phone className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span>{cand.phone}</span>
                      </div>
                    )}
                    {cand.whatsapp && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="text-[10px] font-bold text-emerald-400">WA:</span>
                        <span>{cand.whatsapp}</span>
                      </div>
                    )}
                    {cand.telegram && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="text-[10px] font-bold text-sky-400">TG:</span>
                        <span>{cand.telegram}</span>
                      </div>
                    )}
                  </div>

                  {/* Assigned Employer (Crucial Business Model Requirement) */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-900/80 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-400" />
                        <span>Роботодавець:</span>
                      </span>
                      {cand.company ? (
                        <span className="font-bold text-blue-400 truncate max-w-[130px]">
                          {cand.company.name}
                        </span>
                      ) : (
                        <span className="font-semibold text-amber-400 text-[10px]">
                          В резерві
                        </span>
                      )}
                    </div>

                    {/* Quick Select / Reassign Employer */}
                    <div className="pt-1.5 border-t border-white/5">
                      <select
                        value={cand.companyId || ''}
                        onChange={(e) => handleAssignEmployer(cand.id, e.target.value)}
                        className="w-full bg-slate-800/90 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="">-- Призначити роботодавця --</option>
                        {companies.map(c => (
                          <option key={c.id} value={c.id}>
                            🏢 {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Video / Action */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    ● Активний
                  </span>

                  <button
                    onClick={() => setActiveVideoModal(cand.name)}
                    className="px-2.5 py-1 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 hover:text-white border border-purple-500/30 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    <Video className="w-3.5 h-3.5 text-purple-400" />
                    <span>Відеовізитівка</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal: Video Presentation Viewer */}
        {activeVideoModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bitrix-glass w-full max-w-md rounded-2xl p-6 border border-white/15 shadow-2xl space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold text-white text-sm">Відеовізитівка: {activeVideoModal}</h3>
                </div>
                <button
                  onClick={() => setActiveVideoModal(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="aspect-video bg-slate-950 rounded-xl flex flex-col items-center justify-center border border-white/10 p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-400 mb-2">
                  <Play className="w-6 h-6 ml-0.5" />
                </div>
                <p className="text-xs text-slate-300 font-semibold">Відеоінтерв'ю та презентація навичок</p>
                <p className="text-[10px] text-slate-500 mt-1">Кандидат готовий до презентації роботодавцю</p>
              </div>

              <button
                onClick={() => setActiveVideoModal(null)}
                className="w-full py-2 bg-white/10 hover:bg-white/15 text-slate-200 rounded-xl text-xs font-semibold transition"
              >
                Закрити
              </button>
            </div>
          </div>
        )}

        {/* Modal: Create Candidate */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bitrix-glass w-full max-w-lg rounded-2xl p-6 border border-white/15 shadow-2xl space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">Новий кандидат у базу</h3>
                    <p className="text-xs text-slate-400">Реєстрація пошукача роботи та прив'язка</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="text-slate-400 hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateCandidate} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ПІБ Кандидата *</label>
                  <input
                    type="text"
                    required
                    placeholder="наприклад: Алішер Усманов"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Спеціальність / Посада</label>
                    <input
                      type="text"
                      value={formData.profession}
                      onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                      className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Країна походження</label>
                    <select
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Узбекистан">Узбекистан</option>
                      <option value="Індія">Індія</option>
                      <option value="Азербайджан">Азербайджан</option>
                      <option value="Туреччина">Туреччина</option>
                      <option value="Україна">Україна</option>
                      <option value="Бангладеш">Бангладеш</option>
                    </select>
                  </div>
                </div>

                {/* Employer Linking Dropdown */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    🏢 Призначити до роботодавця (Клієнта)
                  </label>
                  <select
                    value={formData.companyId}
                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Без прив'язки (Залишити в резерві) --</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.address || 'Європа'})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Кандидат буде миттєво відображатися у картці обраного роботодавця
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Телефон / WhatsApp *</label>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value, whatsapp: e.target.value })}
                      className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Telegram (нікнейм)</label>
                    <input
                      type="text"
                      value={formData.telegram}
                      onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                      className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/15 text-slate-300 rounded-xl text-xs font-semibold transition"
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/30"
                  >
                    {loading ? 'Збереження...' : 'Зберегти кандидата'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
