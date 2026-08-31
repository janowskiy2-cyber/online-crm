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
  Sparkles 
} from 'lucide-react';
import { api } from '../../services/api';
import { Contact } from '../../types';

export const CandidatesView: React.FC = () => {
  const [candidates, setCandidates] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [filterCountry, setFilterCountry] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '+380',
    whatsapp: '+380',
    telegram: '@',
    email: '',
    country: 'Узбекистан',
    profession: 'Оператор автоматичної лінії / Склад',
    language: 'Російська (вільно)',
    status: 'Скринінг / Анкета',
    videoUrl: ''
  });

  const fetchCandidates = async () => {
    try {
      const res = await api.get('/contacts', { params: { type: 'candidate', search } });
      if (res.data && Array.isArray(res.data)) {
        setCandidates(res.data);
      }
    } catch (e) {
      console.warn('Candidates fetch:', e);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [search]);

  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/contacts', {
        name: formData.name,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
        telegram: formData.telegram,
        email: formData.email || undefined,
        type: 'candidate'
      });
      setIsCreateOpen(false);
      setFormData({
        name: '',
        phone: '+380',
        whatsapp: '+380',
        telegram: '@',
        email: '',
        country: 'Узбекистан',
        profession: 'Оператор автоматичної лінії / Склад',
        language: 'Російська (вільно)',
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

  const handleDeleteCandidate = async (id: string, name: string) => {
    if (!window.confirm(`Видалити кандидата ${name}?`)) return;
    try {
      await api.delete(`/contacts/${id}`);
      setCandidates(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#080c14] select-none font-['Inter',sans-serif]">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <Globe2 className="w-7 h-7 text-purple-400" />
              <span>Міжнародний пул кандидатів</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              База іноземних робітників: Узбекистан, Індія, Азербайджан, Туреччина, Африка
            </p>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-purple-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>+ Додати кандидата</span>
          </button>
        </div>

        {/* Filter & Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Пошук за ім'ям, телефоном або спеціальністю..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#111827] border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex gap-2 bg-[#111827] p-1 rounded-2xl border border-slate-800 text-xs font-bold">
            {['all', 'Узбекистан', 'Індія', 'Азербайджан'].map((c) => (
              <button
                key={c}
                onClick={() => setFilterCountry(c)}
                className={`px-3 py-1.5 rounded-xl transition ${
                  filterCountry === c ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {c === 'all' ? 'Всі країни' : c}
              </button>
            ))}
          </div>
        </div>

        {/* Candidates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {candidates.length === 0 ? (
            <div className="col-span-3 p-12 text-center text-slate-500 text-xs bg-[#111827] border border-slate-800 rounded-3xl space-y-3">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-300">База кандидатів готова до заповнення</p>
              <p>Натисніть «+ Додати кандидата», щоб зареєструвати першу анкету.</p>
            </div>
          ) : (
            candidates.map((cand) => (
              <div
                key={cand.id}
                className="bg-[#111827] border border-slate-800 hover:border-purple-500/50 rounded-3xl p-5 shadow-xl transition space-y-4 relative group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-300 font-black text-base flex items-center justify-center border border-purple-500/30">
                      {cand.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">{cand.name}</h3>
                      <div className="text-[11px] text-slate-400">
                        {cand.phone || cand.whatsapp || 'Телефон не вказано'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteCandidate(cand.id, cand.name)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-slate-800/80 text-xs">
                  {cand.telegram && (
                    <div className="text-sky-400 font-semibold flex items-center gap-1.5 text-[11px]">
                      <span>TG: {cand.telegram}</span>
                    </div>
                  )}
                  {cand.whatsapp && (
                    <div className="text-emerald-400 font-semibold flex items-center gap-1.5 text-[11px]">
                      <span>WA: {cand.whatsapp}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                    ● В базі
                  </span>
                  <span className="text-slate-500">
                    {new Date(cand.createdAt).toLocaleDateString('uk-UA')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal: Create Candidate */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#111827] border border-slate-700/80 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-purple-400" />
                  <span>Додати нового кандидата в базу</span>
                </h3>
                <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCandidate} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">ПІБ кандидата</label>
                  <input
                    type="text"
                    required
                    placeholder="Бахром Юлдашев"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Телефон / WhatsApp</label>
                    <input
                      type="tel"
                      required
                      placeholder="+380734277174"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value, whatsapp: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Telegram (@username)</label>
                    <input
                      type="text"
                      placeholder="@candidate_tg"
                      value={formData.telegram}
                      onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Країна походження</label>
                    <select
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                    >
                      <option value="Узбекистан">Узбекистан</option>
                      <option value="Індія">Індія</option>
                      <option value="Азербайджан">Азербайджан</option>
                      <option value="Туреччина">Туреччина</option>
                      <option value="Африка (Гана/Нігерія)">Африка (Гана/Нігерія)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Спеціальність</label>
                    <input
                      type="text"
                      placeholder="Зварювальник / Склад / Фасувальник"
                      value={formData.profession}
                      onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 mt-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{loading ? 'Збереження...' : 'Зберегти кандидата в базу'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
