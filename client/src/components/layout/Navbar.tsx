import React from 'react';
import { 
  Building2, 
  Users, 
  Handshake, 
  PlaneTakeoff, 
  Search, 
  Plus, 
  MessageSquarePlus, 
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { Pipeline, ProjectCategory, ProjectInfo } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const PROJECTS_CONFIG: ProjectInfo[] = [
  {
    id: 'employers',
    name: 'Проєкт: Роботодавці',
    shortName: 'Роботодавці (B2B)',
    description: 'Підприємства, заводи, агрохолдинги та замовлення на персонал',
    iconName: 'Building2',
    color: '#3b82f6'
  },
  {
    id: 'candidates',
    name: 'Проєкт: Кандидати',
    shortName: 'Кандидати (Пул)',
    description: 'Пошукачі з Азії та Африки, анкети, скринінг, інтерв\'ю',
    iconName: 'Users',
    color: '#10b981'
  },
  {
    id: 'agencies',
    name: 'Проєкт: Кадрові агенції',
    shortName: 'Агенції-партнери',
    description: 'Партнерські агентства в країнах-донорах (Узбекистан, Індія, Туреччина)',
    iconName: 'Handshake',
    color: '#8b5cf6'
  },
  {
    id: 'legal_logistics',
    name: 'Проєкт: Візи & Логістика',
    shortName: 'Візи & Кордон',
    description: 'Дозволи Держпраці, візи D, транзит Молдова ➔ Одеса',
    iconName: 'PlaneTakeoff',
    color: '#f59e0b'
  }
];

interface NavbarProps {
  currentProject: ProjectCategory;
  setCurrentProject: (proj: ProjectCategory) => void;
  pipelines: Pipeline[];
  activePipelineId: string;
  setActivePipelineId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  openCreateDealModal: () => void;
  openSimulateMessageModal: () => void;
  openUserSwitcher: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentProject,
  setCurrentProject,
  pipelines,
  activePipelineId,
  setActivePipelineId,
  searchQuery,
  setSearchQuery,
  openCreateDealModal,
  openSimulateMessageModal,
  openUserSwitcher
}) => {
  const { currentUser } = useAuth();

  const getProjectIcon = (id: ProjectCategory) => {
    switch (id) {
      case 'employers': return <Building2 className="w-4 h-4" />;
      case 'candidates': return <Users className="w-4 h-4" />;
      case 'agencies': return <Handshake className="w-4 h-4" />;
      case 'legal_logistics': return <PlaneTakeoff className="w-4 h-4" />;
    }
  };

  return (
    <header className="bg-[#111827] border-b border-slate-800 flex flex-col justify-between flex-shrink-0 select-none font-['Inter',sans-serif]">
      {/* Top Bar: 4 Workspaces / Projects Switcher */}
      <div className="h-12 px-5 border-b border-slate-800/80 bg-[#0f1523] flex items-center justify-between overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-2 hidden sm:inline">
            Робочий простір:
          </span>
          {PROJECTS_CONFIG.map((proj) => {
            const isActive = currentProject === proj.id;
            return (
              <button
                key={proj.id}
                onClick={() => setCurrentProject(proj.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  isActive
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <span style={{ color: proj.color }}>{getProjectIcon(proj.id)}</span>
                <span>{proj.shortName}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: proj.color }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Leadgen / Inbound WhatsApp Simulator */}
        <div className="flex items-center gap-2">
          <button
            onClick={openSimulateMessageModal}
            className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition"
            title="Симулювати вхідне повідомлення клієнта або кандидата"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">+ Тест вхідного ліда</span>
          </button>
        </div>
      </div>

      {/* Sub Bar: Active Pipeline Selector & Search & Actions */}
      <div className="h-14 px-5 flex items-center justify-between gap-4">
        {/* Pipeline selector */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={activePipelineId}
              onChange={(e) => setActivePipelineId(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white appearance-none pr-8 focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
            >
              {pipelines.map((pipe) => (
                <option key={pipe.id} value={pipe.id}>
                  {pipe.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <span className="text-[11px] text-slate-400 hidden lg:inline">
            {PROJECTS_CONFIG.find(p => p.id === currentProject)?.description}
          </span>
        </div>

        {/* Right Search and Quick Create */}
        <div className="flex items-center gap-2.5">
          {/* Search bar */}
          <div className="relative w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Пошук угод, компаній, телефонів..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Quick Create Deal button */}
          <button
            onClick={openCreateDealModal}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-blue-600/30 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Створити</span>
          </button>
        </div>
      </div>
    </header>
  );
};
