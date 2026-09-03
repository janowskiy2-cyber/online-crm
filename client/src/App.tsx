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
import { IntegrationsView } from './components/integrations/IntegrationsView';
import { DealDetailModal } from './components/deal-modal/DealDetailModal';
import { CreateDealModal } from './components/modals/CreateDealModal';
import { QRConnectModal } from './components/modals/QRConnectModal';
import { AdminPanelModal } from './components/admin/AdminPanelModal';
import { RecruitingCalculatorModal } from './components/recruiting/RecruitingCalculatorModal';
import { ObjectionsCheatSheetModal } from './components/recruiting/ObjectionsCheatSheetModal';
import { LoginPage } from './components/auth/LoginPage';
import { IncomingCallModal, IncomingCallData } from './components/telephony/IncomingCallModal';
import { CallModal } from './components/telephony/CallModal';
import { useAuth } from './context/AuthContext';
import { api, socket } from './services/api';
import { Pipeline, Deal } from './types';
import { Kanban, MessageSquare, Globe2, CheckSquare, Menu } from 'lucide-react';

export function App() {
  const { isAuthenticated, currentUser } = useAuth();

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

  // Live Incoming Calls Listener (Isolated to responsible manager)
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleIncomingCall = (callData: IncomingCallData) => {
      const myId = currentUser?.id || localStorage.getItem('crm_user_id') || 'usr-admin';
      const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.canViewAllDeals;

      if (isSuperAdmin || !callData.responsibleId || callData.responsibleId === myId) {
        setIncomingCall(callData);
      }
    };

    socket.on('incoming_call', handleIncomingCall);
    return () => {
      socket.off('incoming_call', handleIncomingCall);
    };
  }, [isAuthenticated, currentUser]);

  const handleAcceptCall = (call: IncomingCallData) => {
    setIncomingCall(null);
    setActiveCallSession({
      name: call.callerName,
      phone: call.callerPhone,
      type: call.channel,
      dealId: call.dealId
    });
  };

  const handleRejectCall = (call: IncomingCallData) => {
    setIncomingCall(null);
  };

  const handleQuickReply = async (call: IncomingCallData, text: string) => {
    setIncomingCall(null);
    try {
      const cleanPhone = call.callerPhone.replace(/\D/g, '');
      if (call.channel === 'whatsapp') {
        await api.post('/chat/whatsapp/send', { phone: cleanPhone, text, dealId: call.dealId });
      } else {
        await api.post('/chat/telegram/send', { peer: cleanPhone, text, dealId: call.dealId });
      }
    } catch (e) {
      console.warn('Quick reply failed:', e);
    }
  };

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const activePipeline = pipelines.find(p => p.id === activePipelineId) || pipelines[0] || {
    id: 'default',
    name: '🏢 Роботодавці: B2B Продажі',
    stages: []
  };

  const handleOpenQRModal = (channel?: 'whatsapp' | 'telegram') => {
    if (channel) setQrChannel(channel);
    setIsQROpen(true);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#080c14] text-slate-100 font-['Inter',sans-serif]">
      {/* Left Sidebar (Desktop Fixed + Mobile Slide-over Drawer) */}
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#080c14] pb-14 md:pb-0">
        <Navbar
          currentWorkspace={currentWorkspace}
          setCurrentWorkspace={setCurrentWorkspace}
          pipelines={pipelines}
          activePipelineId={activePipelineId}
          setActivePipelineId={setActivePipelineId}
          openCreateDeal={() => setIsCreateDealOpen(true)}
          openQRModal={handleOpenQRModal}
          openAdminPanel={() => setIsAdminPanelOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
        />

        {/* Dynamic Views */}
        <main className="flex-1 flex overflow-hidden">
          {currentTab === 'deals' && (
            <KanbanBoard
              pipeline={activePipeline}
              projectId={currentWorkspace}
              searchQuery={searchQuery}
              refreshTrigger={refreshTrigger}
              onOpenDeal={(dealId) => setSelectedDealId(dealId)}
              openCreateDeal={() => setIsCreateDealOpen(true)}
            />
          )}

          {currentTab === 'inbox' && (
            <UnifiedInbox
              onOpenDeal={(dealId) => setSelectedDealId(dealId)}
              openQRModal={handleOpenQRModal}
            />
          )}

          {currentTab === 'candidates' && (
            <CandidatesView />
          )}

          {currentTab === 'integrations' && (
            <IntegrationsView />
          )}

          {currentTab === 'tasks' && (
            <TasksView
              onOpenDeal={(dealId) => setSelectedDealId(dealId)}
            />
          )}

          {currentTab === 'contacts' && (
            <ContactsView
              onOpenDeal={(dealId) => setSelectedDealId(dealId)}
            />
          )}

          {currentTab === 'analytics' && (
            <AnalyticsView />
          )}

          {currentTab === 'automation' && (
            <AutomationView
              pipelines={pipelines}
            />
          )}
        </main>

        {/* Native Mobile Bottom Navigation Bar (iOS / Android App Style) */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-[#0e1320] border-t border-slate-800 z-30 flex items-center justify-around px-2 select-none">
          <button
            onClick={() => setCurrentTab('deals')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition ${
              currentTab === 'deals' ? 'text-blue-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Kanban className="w-4 h-4" />
            <span className="text-[10px]">Воронка</span>
          </button>

          <button
            onClick={() => setCurrentTab('inbox')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition ${
              currentTab === 'inbox' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-[10px]">Месенджери</span>
          </button>

          <button
            onClick={() => setCurrentTab('candidates')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition ${
              currentTab === 'candidates' ? 'text-purple-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Globe2 className="w-4 h-4" />
            <span className="text-[10px]">Кандидати</span>
          </button>

          <button
            onClick={() => setCurrentTab('tasks')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition ${
              currentTab === 'tasks' ? 'text-amber-400 font-bold' : 'text-slate-400'
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

      {/* Deal Detail Modal */}
      {selectedDealId && (
        <DealDetailModal
          dealId={selectedDealId}
          pipeline={activePipeline}
          onClose={() => setSelectedDealId(null)}
          onDealUpdated={() => setRefreshTrigger(prev => prev + 1)}
          onDealDeleted={() => {
            setSelectedDealId(null);
            setRefreshTrigger(prev => prev + 1);
          }}
        />
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
        <AdminPanelModal
          onClose={() => setIsAdminPanelOpen(false)}
        />
      )}

      {/* Objections Scripts Library Modal */}
      {isObjectionsOpen && (
        <ObjectionsCheatSheetModal
          onClose={() => setIsObjectionsOpen(false)}
          onSendToChat={(text) => {
            setCurrentTab('inbox');
            setIsObjectionsOpen(false);
          }}
        />
      )}

      {/* Calculator Modal */}
      {isCalcOpen && (
        <RecruitingCalculatorModal
          onClose={() => setIsCalcOpen(false)}
        />
      )}

      {/* Live Incoming Call Ringing Alert (Isolated per responsible manager) */}
      <IncomingCallModal
        call={incomingCall}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
        onQuickReply={handleQuickReply}
      />

      {/* Active In-Call Softphone Modal with Microphone & Audio */}
      {activeCallSession && (
        <CallModal
          contactName={activeCallSession.name}
          phoneNumber={activeCallSession.phone}
          callType={activeCallSession.type}
          dealId={activeCallSession.dealId}
          onClose={() => setActiveCallSession(null)}
        />
      )}
    </div>
  );
}
