import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useMatch } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { KanbanBoard } from './components/kanban/KanbanBoard';
import { UnifiedInbox } from './components/inbox/UnifiedInbox';
import { TasksView } from './components/tasks/TasksView';
import { ContactsView } from './components/contacts/ContactsView';
import { RightWidgetSidebar } from './components/layout/RightWidgetSidebar';
import { RightQuickDock } from './components/layout/RightQuickDock';
import { CreateDealModal } from './components/modals/CreateDealModal';
import { QRConnectModal } from './components/modals/QRConnectModal';
import { LoginPage } from './components/auth/LoginPage';
import { IncomingCallModal, IncomingCallData } from './components/telephony/IncomingCallModal';
import { CallModal } from './components/telephony/CallModal';
import { useAuth } from './context/AuthContext';
import { api, socket } from './services/api';
import { Pipeline, Deal } from './types';
import { Kanban, MessageSquare, Globe2, CheckSquare, Menu } from 'lucide-react';

// Code-Splitting: Lazy load heavy modules for fast initial paint (<150KB)
const LiveFeedView = lazy(() => import('./components/feed/LiveFeedView').then(m => ({ default: m.LiveFeedView })));
const AnalyticsView = lazy(() => import('./components/analytics/AnalyticsView').then(m => ({ default: m.AnalyticsView })));
const AutomationView = lazy(() => import('./components/automation/AutomationView').then(m => ({ default: m.AutomationView })));
const CandidatesView = lazy(() => import('./components/recruiting/CandidatesView').then(m => ({ default: m.CandidatesView })));
const IntegrationsView = lazy(() => import('./components/integrations/IntegrationsView').then(m => ({ default: m.IntegrationsView })));
const DealDetailModal = lazy(() => import('./components/deal-modal/DealDetailModal').then(m => ({ default: m.DealDetailModal })));
const AdminPanelModal = lazy(() => import('./components/admin/AdminPanelModal').then(m => ({ default: m.AdminPanelModal })));
const RecruitingCalculatorModal = lazy(() => import('./components/recruiting/RecruitingCalculatorModal').then(m => ({ default: m.RecruitingCalculatorModal })));
const ObjectionsCheatSheetModal = lazy(() => import('./components/recruiting/ObjectionsCheatSheetModal').then(m => ({ default: m.ObjectionsCheatSheetModal })));

const ViewLoader = () => (
  <div className="flex-1 flex items-center justify-center bg-[#080c14]">
    <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
  </div>
);

export function App() {
  const { isAuthenticated, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [currentTab, setCurrentTab] = useState('deals');
  const [currentWorkspace, setCurrentWorkspace] = useState<'employers' | 'candidates' | 'agencies' | 'logistics'>('employers');
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipelineId, setActivePipelineId] = useState<string>('');
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  
  // Mobile responsive sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals state
  const [isCreateDealOpen, setIsCreateDealOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [qrChannel, setQrChannel] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isObjectionsOpen, setIsObjectionsOpen] = useState(false);

  // Incoming and Active Call State
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [activeCallSession, setActiveCallSession] = useState<{
    name: string;
    phone: string;
    type: 'whatsapp' | 'telegram' | 'gsm';
    dealId?: string;
  } | null>(null);

  // Search query
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Deep linking: URL match for /deals/:dealId
  const dealMatch = useMatch('/deals/:dealId');
  const activeDealId = dealMatch?.params.dealId || selectedDealId;

  const handleOpenDeal = (id: string) => {
    setSelectedDealId(id);
    navigate(`/deals/${id}`);
  };

  const handleCloseDeal = () => {
    setSelectedDealId(null);
    if (dealMatch) {
      navigate('/deals');
    }
  };

  // Fetch Pipelines
  const fetchPipelines = async () => {
    try {
      const res = await api.get('/pipelines');
      if (res.data && res.data.length > 0) {
        setPipelines(res.data);
        if (!activePipelineId) {
          const defaultPipe = res.data.find((p: Pipeline) => p.isDefault) || res.data[0];
          setActivePipelineId(defaultPipe.id);
        }
      }
    } catch (e) {
      console.warn('Pipelines sync:', e);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchPipelines();
    }
  }, [isAuthenticated]);

  // Telephony & Socket listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleIncomingCall = (data: IncomingCallData) => {
      setIncomingCall(data);
    };

    socket.on('incoming_call', handleIncomingCall);

    return () => {
      socket.off('incoming_call', handleIncomingCall);
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const activePipeline = pipelines.find(p => p.id === activePipelineId) || pipelines[0] || {
    id: 'default',
    name: 'Воронка роботодавців',
    isDefault: true,
    sortOrder: 0,
    stages: []
  };

  const handleOpenQRModal = (channel?: 'whatsapp' | 'telegram') => {
    setQrChannel(channel || 'whatsapp');
    setIsQROpen(true);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bitrix-wallpaper bg-[#070a12] text-slate-100 font-['Inter',sans-serif]">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openQRModal={handleOpenQRModal}
        openUserSwitcher={() => {}}
        openCalculator={() => setIsCalcOpen(true)}
        openObjections={() => setIsObjectionsOpen(true)}
        openAdminPanel={() => setIsAdminPanelOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Navbar */}
        <Navbar
          currentWorkspace={currentWorkspace}
          setCurrentWorkspace={setCurrentWorkspace}
          pipelines={pipelines}
          activePipelineId={activePipelineId}
          setActivePipelineId={setActivePipelineId}
          openCreateDeal={() => setIsCreateDealOpen(true)}
          openQRModal={handleOpenQRModal}
          openAdminPanel={() => setIsAdminPanelOpen(true)}
          openObjections={() => setIsObjectionsOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
        />

        {/* Dynamic Views & Bitrix24 Right Utility Widgets + Right Quick Dock */}
        <main className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Suspense fallback={<ViewLoader />}>
              <Routes>
                <Route path="/" element={<Navigate to="/feed" replace />} />
                
                <Route path="/feed" element={<LiveFeedView />} />

                <Route path="/deals" element={
                  <KanbanBoard
                    pipeline={activePipeline}
                    pipelines={pipelines}
                    onSelectPipeline={setActivePipelineId}
                    projectId={currentWorkspace}
                    searchQuery={searchQuery}
                    refreshTrigger={refreshTrigger}
                    onOpenDeal={handleOpenDeal}
                    openCreateDeal={() => setIsCreateDealOpen(true)}
                  />
                } />

                <Route path="/deals/:dealId" element={
                  <KanbanBoard
                    pipeline={activePipeline}
                    pipelines={pipelines}
                    onSelectPipeline={setActivePipelineId}
                    projectId={currentWorkspace}
                    searchQuery={searchQuery}
                    refreshTrigger={refreshTrigger}
                    onOpenDeal={handleOpenDeal}
                    openCreateDeal={() => setIsCreateDealOpen(true)}
                  />
                } />

                <Route path="/inbox" element={
                  <UnifiedInbox
                    onOpenDeal={handleOpenDeal}
                    openQRModal={handleOpenQRModal}
                  />
                } />

                <Route path="/candidates" element={<CandidatesView />} />
                <Route path="/integrations" element={<IntegrationsView />} />

                <Route path="/tasks" element={
                  <TasksView onOpenDeal={handleOpenDeal} />
                } />

                <Route path="/contacts" element={
                  <ContactsView onOpenDeal={handleOpenDeal} />
                } />

                <Route path="/analytics" element={<AnalyticsView />} />
                
                <Route path="/automation" element={
                  <AutomationView pipelines={pipelines} />
                } />

                <Route path="*" element={<Navigate to="/feed" replace />} />
              </Routes>
            </Suspense>
          </div>

          {/* Bitrix24 Right Utility Sidebar (Live Pulse, Pinned Notice, Tasks Role Breakdown, Birthdays) */}
          <aside className="hidden xl:block w-72 2xl:w-80 border-l border-white/10 bg-transparent flex-shrink-0 overflow-y-auto">
            <RightWidgetSidebar
              onOpenTasks={() => navigate('/tasks')}
              onOpenFeed={() => navigate('/feed')}
              onInviteColleagues={() => setIsAdminPanelOpen(true)}
              onCallUser={(name, phone) => {
                setActiveCallSession({
                  name,
                  phone,
                  type: 'gsm'
                });
              }}
            />
          </aside>

          {/* Bitrix24 Far-Right Vertical Dock (Colleagues Online Stack & 1-Click Call Button) */}
          <div className="hidden lg:flex">
            <RightQuickDock
              onQuickCall={() => {
                setActiveCallSession({
                  name: 'Швидкий виклик',
                  phone: '+380',
                  type: 'gsm'
                });
              }}
              onOpenMessenger={() => navigate('/inbox')}
              onSelectColleague={(name, phone) => {
                setActiveCallSession({
                  name,
                  phone,
                  type: 'gsm'
                });
              }}
            />
          </div>
        </main>

        {/* Native Mobile Bottom Navigation Bar (iOS / Android App Style) */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-[#0e1320] border-t border-slate-800 z-30 flex items-center justify-around px-2 select-none">
          <button
            onClick={() => { setCurrentTab('deals'); navigate('/deals'); }}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition ${
              location.pathname.startsWith('/deals') ? 'text-blue-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Kanban className="w-4 h-4" />
            <span className="text-[10px]">Воронка</span>
          </button>

          <button
            onClick={() => { setCurrentTab('inbox'); navigate('/inbox'); }}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition ${
              location.pathname.startsWith('/inbox') ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-[10px]">Чати</span>
          </button>

          <button
            onClick={() => { setCurrentTab('tasks'); navigate('/tasks'); }}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition ${
              location.pathname.startsWith('/tasks') ? 'text-amber-400 font-bold' : 'text-slate-400'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span className="text-[10px]">Завдання</span>
          </button>

          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-1 text-slate-400 hover:text-white transition"
          >
            <Menu className="w-4 h-4" />
            <span className="text-[10px]">Меню</span>
          </button>
        </div>
      </div>

      {/* Deal Detail Modal — Deep Linking & Direct URL Support */}
      {activeDealId && (
        <Suspense fallback={null}>
          <DealDetailModal
            dealId={activeDealId}
            pipeline={activePipeline}
            onClose={handleCloseDeal}
            onDealUpdated={() => setRefreshTrigger(prev => prev + 1)}
            onDealDeleted={() => {
              handleCloseDeal();
              setRefreshTrigger(prev => prev + 1);
            }}
          />
        </Suspense>
      )}

      {/* Create Deal Modal */}
      {isCreateDealOpen && (
        <CreateDealModal
          pipelines={pipelines}
          activePipelineId={activePipelineId}
          onClose={() => setIsCreateDealOpen(false)}
          onDealCreated={(newDeal) => {
            setIsCreateDealOpen(false);
            setRefreshTrigger(prev => prev + 1);
            if (newDeal?.id) {
              handleOpenDeal(newDeal.id);
            }
          }}
        />
      )}

      {/* WhatsApp & Telegram QR Gateway Modal */}
      {isQROpen && (
        <QRConnectModal
          initialChannel={qrChannel}
          onClose={() => setIsQROpen(false)}
        />
      )}

      {/* Admin Panel Modal */}
      {isAdminPanelOpen && (
        <Suspense fallback={null}>
          <AdminPanelModal
            onClose={() => setIsAdminPanelOpen(false)}
          />
        </Suspense>
      )}

      {/* Recruiting Commission Calculator Modal */}
      {isCalcOpen && (
        <Suspense fallback={null}>
          <RecruitingCalculatorModal
            onClose={() => setIsCalcOpen(false)}
          />
        </Suspense>
      )}

      {/* Objections & Scripting Cheat-Sheet Modal */}
      {isObjectionsOpen && (
        <Suspense fallback={null}>
          <ObjectionsCheatSheetModal
            onClose={() => setIsObjectionsOpen(false)}
          />
        </Suspense>
      )}

      {/* Incoming Call Overlay Alert Modal */}
      {incomingCall && (
        <IncomingCallModal
          data={incomingCall}
          onAnswer={(callData) => {
            setIncomingCall(null);
            setActiveCallSession({
              name: callData.contactName || 'Вхідний дзвінок',
              phone: callData.phone,
              type: 'gsm',
              dealId: callData.dealId
            });
          }}
          onDecline={() => setIncomingCall(null)}
        />
      )}

      {/* Outgoing or Answered Active Call Screen */}
      {activeCallSession && (
        <CallModal
          contactName={activeCallSession.name}
          phoneNumber={activeCallSession.phone}
          channel={activeCallSession.type}
          dealId={activeCallSession.dealId}
          onClose={() => setActiveCallSession(null)}
        />
      )}
    </div>
  );
}
