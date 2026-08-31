import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { KanbanBoard } from './components/kanban/KanbanBoard';
import { UnifiedInbox } from './components/inbox/UnifiedInbox';
import { TasksView } from './components/tasks/TasksView';
import { ContactsView } from './components/contacts/ContactsView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { AutomationView } from './components/automation/AutomationView';
import { DealDetailModal } from './components/deal-modal/DealDetailModal';
import { QRConnectModal } from './components/modals/QRConnectModal';
import { UserSwitcherModal } from './components/modals/UserSwitcherModal';
import { CreateDealModal } from './components/modals/CreateDealModal';
import { SimulateMessageModal } from './components/modals/SimulateMessageModal';
import { Pipeline, Deal } from './types';
import { api, socket } from './services/api';
import { useAuth } from './context/AuthContext';
import { Bell } from 'lucide-react';

const defaultFallbackPipelines: Pipeline[] = [
  {
    id: 'pipe-b2b',
    name: 'B2B Корпоративные продажи',
    isDefault: true,
    sortOrder: 0,
    stages: [
      { id: 'stg-1', pipelineId: 'pipe-b2b', name: 'Неразобранное', color: '#64748b', sortOrder: 0, isWon: false, isLost: false },
      { id: 'stg-2', pipelineId: 'pipe-b2b', name: 'Первичный контакт', color: '#3b82f6', sortOrder: 1, isWon: false, isLost: false },
      { id: 'stg-3', pipelineId: 'pipe-b2b', name: 'Квалификация', color: '#06b6d4', sortOrder: 2, isWon: false, isLost: false },
      { id: 'stg-4', pipelineId: 'pipe-b2b', name: 'Коммерческое предложение', color: '#f59e0b', sortOrder: 3, isWon: false, isLost: false },
      { id: 'stg-5', pipelineId: 'pipe-b2b', name: 'Договор', color: '#8b5cf6', sortOrder: 4, isWon: false, isLost: false },
      { id: 'stg-6', pipelineId: 'pipe-b2b', name: 'Счет оплачен', color: '#10b981', sortOrder: 5, isWon: true, isLost: false },
      { id: 'stg-7', pipelineId: 'pipe-b2b', name: 'Отказ', color: '#ef4444', sortOrder: 6, isWon: false, isLost: true }
    ]
  }
];

export const App: React.FC = () => {
  const { currentUser, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('deals');
  const [pipelines, setPipelines] = useState<Pipeline[]>(defaultFallbackPipelines);
  const [activePipelineId, setActivePipelineId] = useState<string>(defaultFallbackPipelines[0].id);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrInitialChannel, setQrInitialChannel] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState(false);
  const [isCreateDealOpen, setIsCreateDealOpen] = useState(false);
  const [quickStageId, setQuickStageId] = useState<string | undefined>(undefined);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);

  // Live Toast Notifications
  const [notification, setNotification] = useState<{ title: string; body: string; dealId?: string } | null>(null);

  const fetchPipelines = async () => {
    try {
      const res = await api.get('/pipelines');
      if (res.data && res.data.length > 0) {
        setPipelines(res.data);
        if (!activePipelineId || !res.data.some((p: any) => p.id === activePipelineId)) {
          setActivePipelineId(res.data[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load pipelines:', e);
    }
  };

  const fetchDeals = async () => {
    if (!activePipelineId) return;
    try {
      const res = await api.get('/deals', {
        params: {
          pipelineId: activePipelineId,
          search: searchQuery
        }
      });
      setDeals(res.data);
    } catch (e) {
      console.error('Failed to load deals:', e);
    }
  };

  useEffect(() => {
    fetchPipelines();
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [activePipelineId, searchQuery, currentUser]);

  useEffect(() => {
    const handleDealCreated = (newDeal: Deal) => {
      fetchDeals();
      setNotification({
        title: 'Новая сделка!',
        body: `${newDeal.title}`,
        dealId: newDeal.id
      });
    };

    const handleDealUpdated = () => fetchDeals();
    const handleDealDeleted = () => fetchDeals();
    const handleNotification = (data: any) => {
      setNotification(data);
      fetchDeals();
    };

    socket.on('deal_created', handleDealCreated);
    socket.on('deal_updated', handleDealUpdated);
    socket.on('deal_deleted', handleDealDeleted);
    socket.on('notification', handleNotification);

    return () => {
      socket.off('deal_created', handleDealCreated);
      socket.off('deal_updated', handleDealUpdated);
      socket.off('deal_deleted', handleDealDeleted);
      socket.off('notification', handleNotification);
    };
  }, [activePipelineId]);

  const handleMoveDeal = async (dealId: string, newStageId: string) => {
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stageId: newStageId } : d));
    try {
      await api.put(`/deals/${dealId}`, { stageId: newStageId });
      fetchDeals();
    } catch (e) {
      console.error('Failed to update stage:', e);
      fetchDeals();
    }
  };

  const activePipeline = pipelines.find(p => p.id === activePipelineId) || pipelines[0];

  return (
    <div className="h-screen w-screen flex bg-[#0b0f19] text-slate-100 overflow-hidden font-['Inter',sans-serif]">
      {/* Toast Notification */}
      {notification && (
        <div 
          onClick={() => {
            if (notification.dealId) setSelectedDealId(notification.dealId);
            setNotification(null);
          }}
          className="fixed top-5 right-5 z-50 bg-[#1e293b] border-2 border-emerald-500/80 rounded-2xl p-4 shadow-2xl flex items-start gap-3 cursor-pointer max-w-sm animate-in slide-in-from-top-5 duration-300"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white">{notification.title}</h4>
            <p className="text-xs text-slate-300 line-clamp-2 mt-0.5">{notification.body}</p>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setNotification(null); }}
            className="text-slate-500 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openQRModal={(channel) => {
          if (channel) setQrInitialChannel(channel);
          setIsQRModalOpen(true);
        }}
        openUserSwitcher={() => setIsUserSwitcherOpen(true)}
      />

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          pipelines={pipelines}
          activePipelineId={activePipelineId}
          setActivePipelineId={setActivePipelineId}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          openCreateDealModal={() => {
            setQuickStageId(undefined);
            setIsCreateDealOpen(true);
          }}
          openSimulateMessageModal={() => setIsSimulateModalOpen(true)}
          openUserSwitcher={() => setIsUserSwitcherOpen(true)}
        />

        {/* Tab Views */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {currentTab === 'deals' && (
            <KanbanBoard
              pipeline={activePipeline}
              deals={deals}
              onDealClick={(deal) => setSelectedDealId(deal.id)}
              onMoveDeal={handleMoveDeal}
              onQuickAddDeal={(stageId) => {
                setQuickStageId(stageId);
                setIsCreateDealOpen(true);
              }}
            />
          )}

          {currentTab === 'inbox' && (
            <UnifiedInbox
              onOpenDeal={(dealId) => setSelectedDealId(dealId)}
              openQRModal={() => setIsQRModalOpen(true)}
            />
          )}

          {currentTab === 'tasks' && (
            <TasksView onOpenDeal={(dealId) => setSelectedDealId(dealId)} />
          )}

          {currentTab === 'contacts' && (
            <ContactsView onOpenDeal={(dealId) => setSelectedDealId(dealId)} />
          )}

          {currentTab === 'analytics' && <AnalyticsView />}

          {currentTab === 'automation' && <AutomationView pipelines={pipelines} />}

          {currentTab === 'users' && (
            <div className="flex-1 p-8 bg-[#0b0f19] flex items-center justify-center">
              <div className="text-center space-y-4 max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto border border-purple-500/30">
                  <span className="text-2xl font-black">20</span>
                </div>
                <h2 className="text-xl font-bold text-white">Управление 20 пользователями и ролями</h2>
                <p className="text-xs text-slate-400">
                  Откройте матрицу прав, чтобы моментально переключаться между генеральным директором, РОП, менеджерами, службой поддержки и аудитором.
                </p>
                <button
                  onClick={() => setIsUserSwitcherOpen(true)}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-600/30"
                >
                  Открыть матрицу 20 пользователей
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Flagship amoCRM Deal Detail Modal */}
      {selectedDealId && (
        <DealDetailModal
          dealId={selectedDealId}
          pipeline={activePipeline}
          onClose={() => setSelectedDealId(null)}
          onDealUpdated={fetchDeals}
          onDealDeleted={() => {
            setSelectedDealId(null);
            fetchDeals();
          }}
        />
      )}

      {/* QR Code Multi-device Connect Modal */}
      {isQRModalOpen && (
        <QRConnectModal
          initialChannel={qrInitialChannel}
          onClose={() => setIsQRModalOpen(false)}
        />
      )}

      {/* 20 Users Matrix Switcher Modal */}
      {isUserSwitcherOpen && (
        <UserSwitcherModal onClose={() => setIsUserSwitcherOpen(false)} />
      )}

      {/* Create Deal Modal */}
      {isCreateDealOpen && (
        <CreateDealModal
          pipelines={pipelines}
          activePipelineId={activePipelineId}
          initialStageId={quickStageId}
          onClose={() => setIsCreateDealOpen(false)}
          onDealCreated={fetchDeals}
        />
      )}

      {/* Inbound Lead Simulator Modal */}
      {isSimulateModalOpen && (
        <SimulateMessageModal
          onClose={() => setIsSimulateModalOpen(false)}
          onSuccess={() => {
            fetchDeals();
            setCurrentTab('deals');
          }}
        />
      )}
    </div>
  );
};
