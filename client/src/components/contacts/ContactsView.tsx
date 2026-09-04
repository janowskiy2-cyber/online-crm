import React, { useState, useEffect } from 'react';
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
  ArrowRight,
  Filter,
  Sparkles,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Contact, Company } from '../../types';

interface ExtendedCompany extends Company {
  _count?: {
    contacts?: number;
    deals?: number;
  };
  industry?: string;
  country?: string;
  quota?: number;
}

interface ContactsViewProps {
  onOpenDeal: (dealId: string) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({ onOpenDeal }) => {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<ExtendedCompany[]>([]);
  const [activeTab, setActiveTab] = useState<'employers' | 'representatives'>('employers');
  const [search, setSearch] = useState('');
  const [isAddEmployerOpen, setIsAddEmployerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state for new employer
  const [employerForm, setEmployerForm] = useState({
    name: '',
    industry: 'Виробництво та металоконструкції',
    country: 'Польща',
    address: 'Гданськ, вул. Пшемислова, 12',
    phone: '+48 ',
    email: '',
    website: '',
    quota: 15
  });

  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalCandidates: 0,
    assignedCandidates: 0,
    freeReserveCandidates: 0,
    totalRepresentatives: 0
  });

  const fetchStats = async () => {
    try {
      const res = await api.get('/contacts/stats/overview');
      if (res.data) setStats(res.data);
    } catch (e) {}
  };

  const fetchContacts = async () => {
    try {
      const res = await api.get('/contacts', { params: { search, type: 'b2b_contact' } });
      setContacts(res.data);
    } catch (e) {
      console.error('Failed to load contacts:', e);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/contacts/companies/all');
      if (res.data && Array.isArray(res.data)) {
        setCompanies(res.data);
      }
    } catch (e) {
      console.error('Failed to load companies:', e);
    }
  };

  useEffect(() => {
    fetchContacts();
    fetchCompanies();
    fetchStats();
  }, [search]);

  const handleCreateEmployer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employerForm.name.trim()) return;
    setLoading(true);
    try {
      await api.post('/contacts/companies', {
        name: employerForm.name,
        phone: employerForm.phone,
        email: employerForm.email,
        website: employerForm.website,
        address: `${employerForm.country}, ${employerForm.address}`
      });
      setIsAddEmployerOpen(false);
      setEmployerForm({
        name: '',
        industry: 'Виробництво та металоконструкції',
        country: 'Польща',
        address: '',
        phone: '+48 ',
        email: '',
        website: '',
        quota: 10
      });
      fetchCompanies();
    } catch (e) {
      alert('Помилка збереження роботодавця');
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.address && c.address.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto bitrix-wallpaper font-['Inter',sans-serif]">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header Card (Bitrix24 Glassmorphism) */}
        <div className="bitrix-glass rounded-2xl p-6 shadow-2xl border border-white/10 backdrop-blur-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
                  <Building2 className="w-3 h-3" /> B2B КЛІЄНТИ
                </span>
                <span className="text-xs text-slate-400 font-mono">Замовники персоналу</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <span>База роботодавців</span>
                <span className="text-sm px-2.5 py-0.5 rounded-xl bg-white/10 text-slate-300 font-semibold">
                  {companies.length} підприємств
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Підприємства-клієнти, заводи та логістичні парки, які замовляють співробітників. До кожного роботодавця закріплюються кандидати з бази рекрутингу.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex bg-slate-900/80 p-1 rounded-xl border border-white/10 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('employers')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === 'employers' 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Роботодавці ({companies.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('representatives')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === 'representatives' 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Представники / HR ({contacts.length})</span>
                </button>
              </div>

              <button
                onClick={() => setIsAddEmployerOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-blue-600/30 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Додати роботодавця</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar (Real Data) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
            <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5">
              <div className="text-[11px] text-slate-400 font-medium">Активні підприємства</div>
              <div className="text-xl font-black text-white mt-0.5">{companies.length}</div>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5">
              <div className="text-[11px] text-slate-400 font-medium">Квота замовлень</div>
              <div className="text-xl font-black text-emerald-400 mt-0.5">
                {companies.reduce((acc, c) => acc + (c.quota || 10), 0)} чол.
              </div>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5">
              <div className="text-[11px] text-slate-400 font-medium">Закріплено кандидатів</div>
              <div className="text-xl font-black text-sky-400 mt-0.5">
                {stats.assignedCandidates} в пулі
              </div>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5">
              <div className="text-[11px] text-slate-400 font-medium">Країни-локації</div>
              <div className="text-xl font-black text-amber-400 mt-0.5">
                {Array.from(new Set(companies.map(c => c.address?.split(',')[0]?.trim()).filter(Boolean))).slice(0, 3).join(', ') || 'Європа, Україна'}
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bitrix-glass p-3 rounded-xl border border-white/10 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={activeTab === 'employers' ? "Пошук роботодавця за назвою, містом..." : "Пошук контактної особи за ПІБ, телефоном..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <button 
            onClick={() => navigate('/candidates')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition"
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>Перейти до Бази кандидатів</span>
            <ChevronRight className="w-3 h-3 opacity-60" />
          </button>
        </div>

        {/* Tab 1: Employers Grid */}
        {activeTab === 'employers' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCompanies.length === 0 ? (
              <div className="col-span-full bitrix-glass rounded-2xl p-12 text-center border border-white/10">
                <Building2 className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-50" />
                <h3 className="text-lg font-bold text-white">Роботодавців не знайдено</h3>
                <p className="text-xs text-slate-400 mt-1">Додайте перше підприємство-клієнта для призначення кандидатів</p>
                <button
                  onClick={() => setIsAddEmployerOpen(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Додати роботодавця
                </button>
              </div>
            ) : (
              filteredCompanies.map((comp) => {
                const assignedCount = comp.contacts?.length || comp._count?.contacts || 0;
                return (
                  <div
                    key={comp.id}
                    className="bitrix-glass rounded-2xl p-5 border border-white/10 hover:border-blue-500/40 transition-all duration-200 shadow-xl flex flex-col justify-between group"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600/30 to-indigo-600/30 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner flex-shrink-0">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-sm text-white group-hover:text-blue-400 transition tracking-tight">
                              {comp.name}
                            </h3>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/25">
                              {comp.industry || 'Промисловість / Логістика'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Location & Details */}
                      <div className="mt-4 space-y-2 text-xs text-slate-300">
                        {comp.address && (
                          <div className="flex items-center gap-2 text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                            <span className="truncate">{comp.address}</span>
                          </div>
                        )}
                        {comp.phone && (
                          <div className="flex items-center gap-2 text-slate-400">
                            <Phone className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            <span>{comp.phone}</span>
                          </div>
                        )}
                        {comp.email && (
                          <div className="flex items-center gap-2 text-slate-400">
                            <Mail className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                            <span className="truncate">{comp.email}</span>
                          </div>
                        )}
                      </div>

                      {/* Assigned Candidates Badge */}
                      <div className="mt-4 p-3 rounded-xl bg-slate-900/80 border border-white/5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Закріплено кандидатів:</span>
                          </div>
                          <span className="font-bold text-emerald-400 font-mono">
                            {assignedCount} чол.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                      <button
                        onClick={() => navigate('/candidates')}
                        className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-white border border-blue-500/30 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Кандидати ({assignedCount})</span>
                      </button>

                      {comp.phone && (
                        <a
                          href={`https://wa.me/${comp.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg transition"
                          title="Написати у WhatsApp"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Tab 2: Representatives / HR Contacts */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="bitrix-glass rounded-2xl p-5 border border-white/10 hover:border-slate-600 transition shadow-xl space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center border border-indigo-500/30">
                      {contact.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">{contact.name}</h3>
                      <p className="text-xs text-slate-400">{contact.position || 'Представник роботодавця'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-white/10">
                  {contact.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                  {contact.company && (
                    <div className="flex items-center gap-2 text-purple-300">
                      <Building2 className="w-3.5 h-3.5" />
                      <span className="truncate">{contact.company.name}</span>
                    </div>
                  )}
                </div>

                {contact.deals && contact.deals.length > 0 && (
                  <div className="pt-2 border-t border-white/10">
                    <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                      Пов'язані договори та замовлення:
                    </span>
                    <div className="space-y-1">
                      {contact.deals.map((d) => (
                        <div
                          key={d.id}
                          onClick={() => onOpenDeal(d.id)}
                          className="text-xs text-blue-400 hover:text-blue-300 flex items-center justify-between cursor-pointer py-0.5"
                        >
                          <span className="truncate">{d.title}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0 ml-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Add Employer (Client) */}
      {isAddEmployerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bitrix-glass w-full max-w-lg rounded-2xl p-6 border border-white/15 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Новий роботодавець (Клієнт)</h3>
                  <p className="text-xs text-slate-400">Підприємство для закріплення кандидатів</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddEmployerOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEmployer} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Назва підприємства / Компанії *</label>
                <input
                  type="text"
                  required
                  placeholder="наприклад: Завод металоконструкцій PolSteel Sp. z o.o."
                  value={employerForm.name}
                  onChange={(e) => setEmployerForm({ ...employerForm, name: e.target.value })}
                  className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Сфера діяльності</label>
                  <select
                    value={employerForm.industry}
                    onChange={(e) => setEmployerForm({ ...employerForm, industry: e.target.value })}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Виробництво та металоконструкції">Виробництво та металоконструкції</option>
                    <option value="Складська логістика">Складська логістика</option>
                    <option value="Харчова промисловість">Харчова промисловість</option>
                    <option value="Агросектор / Теплиці">Агросектор / Теплиці</option>
                    <option value="Будівництво">Будівництво</option>
                    <option value="HoReCa / Готелі">HoReCa / Готелі</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Країна розміщення</label>
                  <select
                    value={employerForm.country}
                    onChange={(e) => setEmployerForm({ ...employerForm, country: e.target.value })}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Польща">Польща</option>
                    <option value="Чехія">Чехія</option>
                    <option value="Німеччина">Німеччина</option>
                    <option value="Словаччина">Словаччина</option>
                    <option value="Литва">Литва</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Місто та адреса підприємства</label>
                <input
                  type="text"
                  placeholder="наприклад: Гданськ, вул. Пшемислова, 12"
                  value={employerForm.address}
                  onChange={(e) => setEmployerForm({ ...employerForm, address: e.target.value })}
                  className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Телефон / WhatsApp</label>
                  <input
                    type="text"
                    value={employerForm.phone}
                    onChange={(e) => setEmployerForm({ ...employerForm, phone: e.target.value })}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="hr@factory.pl"
                    value={employerForm.email}
                    onChange={(e) => setEmployerForm({ ...employerForm, email: e.target.value })}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddEmployerOpen(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/30"
                >
                  {loading ? 'Збереження...' : 'Зберегти роботодавця'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
