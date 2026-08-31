import React from 'react';
import { 
  Plus, 
  Search, 
  Layers, 
  Bell, 
  Send,
  MessageSquare
} from 'lucide-react';
import { Pipeline } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
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
  const activePipeline = pipelines.find(p => p.id === activePipelineId) || pipelines[0];

  return (
    <header className="h-16 bg-[#111827] border-b border-slate-800 px-6 flex items-center justify-between flex-shrink-0 z-10 select-none">
      {/* Pipeline Selector */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-800 text-slate-100 px-3.5 py-2 rounded-xl border border-slate-700 font-medium text-sm transition">
            <Layers className="w-4 h-4 text-blue-400" />
            <select
              value={activePipelineId}
              onChange={(e) => setActivePipelineId(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-4 text-sm"
            >
              {pipelines.map(p => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-md mx-6">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Поиск по сделкам, клиентам, телефонам или тегам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Simulate Inbound Lead / Message Test Button */}
        <button
          onClick={openSimulateMessageModal}
          title="Смоделировать входящее сообщение из WhatsApp или Telegram от нового клиента"
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
        >
          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
          <span>Тест входящего лида</span>
        </button>

        {/* Create Deal Button */}
        <button
          onClick={openCreateDealModal}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-md shadow-blue-600/30 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Новая сделка</span>
        </button>

        {/* Current User Role Badge */}
        <div 
          onClick={openUserSwitcher}
          className="flex items-center gap-2 pl-3 border-l border-slate-800 cursor-pointer"
        >
          <span className="text-xs font-medium text-slate-400">
            Роль: <span className="text-emerald-400 font-semibold">{currentUser?.role}</span>
          </span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
        </div>
      </div>
    </header>
  );
};
