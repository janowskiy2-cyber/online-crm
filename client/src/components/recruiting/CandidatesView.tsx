import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Globe2, 
  CheckCircle2, 
  FileText, 
  Video, 
  Passport, 
  Calendar, 
  Building2, 
  Plus,
  Filter
} from 'lucide-react';

interface Candidate {
  id: string;
  name: string;
  country: string;
  language: 'Російська (вільно)' | 'Англійська (базова)' | 'Англійська (вільно)';
  profession: string;
  experienceYears: number;
  status: 'screening' | 'interview_passed' | 'work_permit_issued' | 'visa_d_ready' | 'arrived';
  assignedCompany?: string;
  videoUrl?: string;
  passportReady: boolean;
  avatar: string;
}

const mockCandidates: Candidate[] = [
  {
    id: 'cand-1',
    name: 'Бахром Юлдашев',
    country: 'Узбекистан (Ташкент)',
    language: 'Російська (вільно)',
    profession: 'Оператор автоматичної лінії / Склад',
    experienceYears: 4,
    status: 'visa_d_ready',
    assignedCompany: 'ПрАТ «МХП Агро»',
    passportReady: true,
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'cand-2',
    name: 'Раджеш Кумар',
    country: 'Індія (Пенджаб)',
    language: 'Англійська (вільно)',
    profession: 'Зварювальник MIG/MAG / Металообробка',
    experienceYears: 6,
    status: 'work_permit_issued',
    assignedCompany: 'ТОВ «Завод Віконних Систем»',
    passportReady: true,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'cand-3',
    name: 'Алішер Карімов',
    country: 'Узбекистан (Самарканд)',
    language: 'Російська (вільно)',
    profession: 'Пакувальник / Комплектувальник',
    experienceYears: 3,
    status: 'arrived',
    assignedCompany: 'ТОВ «Логістик Груп Київ»',
    passportReady: true,
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'cand-4',
    name: 'Аміт Шарма',
    country: 'Індія (Делі)',
    language: 'Англійська (базова)',
    profession: 'Будівельник / Арматурник',
    experienceYears: 5,
    status: 'interview_passed',
    assignedCompany: 'БК «Столиця Буд»',
    passportReady: true,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'cand-5',
    name: 'Ельдар Мамедов',
    country: 'Азербайджан (Баку)',
    language: 'Російська (вільно)',
    profession: 'Водій навантажувача (категорія B/C)',
    experienceYears: 7,
    status: 'screening',
    passportReady: true,
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'
  }
];

export const CandidatesView: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>(mockCandidates);
  const [search, setSearch] = useState('');
  const [filterCountry, setFilterCountry] = useState('all');

  const filtered = candidates.filter(c => {
    if (filterCountry !== 'all' && !c.country.includes(filterCountry)) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.profession.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getStatusBadge = (status: Candidate['status']) => {
    switch (status) {
      case 'screening':
        return <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">Скринінг / Анкета</span>;
      case 'interview_passed':
        return <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">Інтерв'ю пройдено</span>;
      case 'work_permit_issued':
        return <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">Дозвіл на роботу</span>;
      case 'visa_d_ready':
        return <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">Віза D готова</span>;
      case 'arrived':
        return <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">Прибув на зміну</span>;
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0b0f19] select-none font-['Inter',sans-serif]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <Globe2 className="w-7 h-7 text-blue-500" />
              <span>База перевірених кандидатів</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Міжнародний пул робітників (Індія, Узбекистан, Азербайджан) з готовими анкетами та паспортами
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => alert('Форма додавання нового кандидата в базу')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Додати кандидата</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 max-w-2xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Пошук за ім'ям, професією чи спеціальністю..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
          >
            <option value="all">Усі країни</option>
            <option value="Узбекистан">Узбекистан</option>
            <option value="Індія">Індія</option>
            <option value="Азербайджан">Азербайджан</option>
          </select>
        </div>

        {/* Candidates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cand) => (
            <div
              key={cand.id}
              className="bg-[#111827] border border-slate-800 hover:border-slate-700 rounded-3xl p-5 shadow-sm space-y-4 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={cand.avatar}
                    alt={cand.name}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-slate-700"
                  />
                  <div>
                    <h3 className="font-bold text-sm text-white">{cand.name}</h3>
                    <div className="text-xs text-blue-400 font-medium flex items-center gap-1 mt-0.5">
                      <Globe2 className="w-3.5 h-3.5" />
                      <span>{cand.country}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                <div className="flex justify-between">
                  <span className="text-slate-500">Спеціальність:</span>
                  <span className="font-semibold text-slate-200 text-right">{cand.profession}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Досвід:</span>
                  <span className="text-slate-200">{cand.experienceYears} роки</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Мова:</span>
                  <span className="text-slate-200 font-medium">{cand.language}</span>
                </div>
              </div>

              {/* Status */}
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">Статус легалізації:</span>
                {getStatusBadge(cand.status)}
              </div>

              {cand.assignedCompany && (
                <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800/80 text-xs text-slate-300 flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                  <span className="truncate">Закріплено: <b>{cand.assignedCompany}</b></span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
