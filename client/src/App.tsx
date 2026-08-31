import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { KanbanBoard } from './components/kanban/KanbanBoard';
import { UnifiedInbox } from './components/inbox/UnifiedInbox';
import { TasksView } from './components/tasks/TasksView';
import { ContactsView } from './components/contacts/ContactsView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { AutomationView } from './components/automation/AutomationView';
import { CandidatesView } from './components/recruiting/CandidatesView';
import { RecruitingCalculatorModal } from './components/recruiting/RecruitingCalculatorModal';
import { ObjectionsCheatSheetModal } from './components/recruiting/ObjectionsCheatSheetModal';
import { DealDetailModal } from './components/deal-modal/DealDetailModal';
import { QRConnectModal } from './components/modals/QRConnectModal';
import { UserSwitcherModal } from './components/modals/UserSwitcherModal';
import { CreateDealModal } from './components/modals/CreateDealModal';
import { SimulateMessageModal } from './components/modals/SimulateMessageModal';
import { LoginPage } from './components/auth/LoginPage';
import { Pipeline, Deal } from './types';
import { api, socket } from './services/api';
import { useAuth } from './context/AuthContext';
import { Bell } from 'lucide-react';

const recruitingDefaultPipelines: Pipeline[] = [
  {
    id: 'pipe-recruiting-sales',
    name: 'B2B Продажі: Залучення роботодавців',
    isDefault: true,
    sortOrder: 0,
    stages: [
      { id: 'stg-s1', pipelineId: 'pipe-recruiting-sales', name: 'Нова заявка підприємства', color: '#64748b', sortOrder: 0, isWon: false, isLost: false },
      { id: 'stg-s2', pipelineId: 'pipe-recruiting-sales', name: 'Дзвінок-кваліфікація (15 хв)', color: '#3b82f6', sortOrder: 1, isWon: false, isLost: false },
      { id: 'stg-s3', pipelineId: 'pipe-recruiting-sales', name: 'Прорахунок & Відправка КП', color: '#06b6d4', sortOrder: 2, isWon: false, isLost: false },
      { id: 'stg-s4', pipelineId: 'pipe-recruiting-sales', name: 'Узгодження договору (25%)', color: '#f59e0b', sortOrder: 3, isWon: false, isLost: false },
      { id: 'stg-s5', pipelineId: 'pipe-recruiting-sales', name: 'Договір підписано / В роботі', color: '#10b981', sortOrder: 4, isWon: true, isLost: false },
      { id: 'stg-s6', pipelineId: 'pipe-recruiting-sales', name: 'Відмова клієнта', color: '#ef4444', sortOrder: 5, isWon: false, isLost: true }
    ]
  },
  {
    id: 'pipe-recruiting-ops',
    name: 'Операційний процес: Візи та Доставка персоналу',
    isDefault: false,
    sortOrder: 1,
    stages: [
      { id: 'stg-o1', pipelineId: 'pipe-recruiting-ops', name: '1. Договір і заявка (25%)', color: '#3b82f6', sortOrder: 0, isWon: false, isLost: false },
      { id: 'stg-o2', pipelineId: 'pipe-recruiting-ops', name: '2. Скринінг & Інтерв\'ю (25%)', color: '#06b6d4', sortOrder: 1, isWon: false, isLost: false },
      { id: 'stg-o3', pipelineId: 'pipe-recruiting-ops', name: '3. Дозвіл на роботу (~7 днів)', color: '#8b5cf6', sortOrder: 2, isWon: false, isLost: false },
      { id: 'stg-o4', pipelineId: 'pipe-recruiting-ops', name: '4. Робоча віза D (25%)', color: '#f59e0b', sortOrder: 3, isWon: false, isLost: false },
      { id: 'stg-o5', pipelineId: 'pipe-recruiting-ops', name: '5. Молдова ➔ Одеса (Транзит)', color: '#ec4899', sortOrder: 4, isWon: false, isLost: false },
      { id: 'stg-o6', pipelineId: 'pipe-recruiting-ops', name: '6. Вихід на зміну (25%)', color: '#10b981', sortOrder: 5, isWon: true, isLost: false }
    ]
  },
  {
    id: 'pipe-recruiting-ltv',
    name: 'LTV & Продовження дозволів на 1-2 роки',
    isDefault: false,
    sortOrder: 2,
    stages: [
      { id: 'stg-l1', pipelineId: 'pipe-recruiting-ltv', name: 'Місяць супроводу (4 контакти)', color: '#3b82f6', sortOrder: 0, isWon: false, isLost: false },
      { id: 'stg-l2', pipelineId: 'pipe-recruiting-ltv', name: 'Стабільна робота на заводі', color: '#8b5cf6', sortOrder: 1, isWon: false, isLost: false },
      { id: 'stg-l3', pipelineId: 'pipe-recruiting-ltv', name: 'Продовження дозволу (через 6 міс)', color: '#f59e0b', sortOrder: 2, isWon: false, isLost: false },
      { id: 'stg-l4', pipelineId: 'pipe-recruiting-ltv', name: 'Успішно продовжено на 1-2 роки', color: '#10b981', sortOrder: 3, isWon: true, isLost: false }
    ]
  }
];

export const App: React.FC = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('deals');
  const [pipelines, setPipelines] = useState<Pipeline[]>(recruitingDefaultPipelines);
  const [activePipelineId, setActivePipelineId] = useState<string>(recruitingDefaultPipelines[0].id);
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
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isObjectionsOpen, setIsObjectionsOpen] = useState(false);

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
      console.warn('Backend connecting...', e);
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
      if (res.data) {
        setDeals(res.data);
      }
    } catch (e) {
      console.warn('Deals fetching...', e);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchPipelines();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDeals();
    }
  }, [activePipelineId, searchQuery, currentUser, isAuthenticated]);

  useEffect(() => {
    const handleDealCreated = (newDeal: Deal) => {
      fetchDeals();
      setNotification({
        title: 'Нова заявка підприємства!',
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
  }, [activePipelineId, isAuthenticated]);

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

  if (!isAuthenticated) {
    return <LoginPage />;
  }

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
        openCalculator={() => setIsCalculatorOpen(true)}
        openObjections={() => setIsObjectionsOpen(true)}
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

          {currentTab === 'candidates' && (
            <CandidatesView />
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
                <div className="w-16 h-16 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto border border-purple-500/30 shadow-lg shadow-purple-500/20">
                  <span className="text-2xl font-black">20</span>
                </div>
                <h2 className="text-xl font-bold text-white">Матриця 20 користувачів та ролей</h2>
                <p className="text-xs text-slate-400">
                  Керуйте правами доступу та перемикайтеся між генеральним директором, РОП, рекрутерами, візовими координаторами та підтримкою.
                </p>
                <button
                  onClick={() => setIsUserSwitcherOpen(true)}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-purple-600/30"
                >
                  Відкрити матрицю 20 користувачів
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

      {/* Recruiting Calculator Modal */}
      {isCalculatorOpen && (
        <RecruitingCalculatorModal onClose={() => setIsCalculatorOpen(false)} />
      )}

      {/* Objections Cheat Sheet Modal */}
      {isObjectionsOpen && (
        <ObjectionsCheatSheetModal onClose={() => setIsObjectionsOpen(false)} />
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
