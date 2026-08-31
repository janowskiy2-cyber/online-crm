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
import { UserSwitcherModal } from './components/modals/UserSwitcherModal';
import { AdminPanelModal } from './components/admin/AdminPanelModal';
import { RecruitingCalculatorModal } from './components/recruiting/RecruitingCalculatorModal';
import { ObjectionsCheatSheetModal } from './components/recruiting/ObjectionsCheatSheetModal';
import { LoginPage } from './components/auth/LoginPage';
import { useAuth } from './context/AuthContext';
import { api, socket } from './services/api';
import { Pipeline, Deal } from './types';

export function App() {
  const { isAuthenticated, currentUser } = useAuth();

  const [currentTab, setCurrentTab] = useState('deals');
  const [currentWorkspace, setCurrentWorkspace] = useState<'employers' | 'candidates' | 'agencies' | 'logistics'>('employers');
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipelineId, setActivePipelineId] = useState<string>('');
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  
  // Modals state
  const [isCreateDealOpen, setIsCreateDealOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [qrChannel, setQrChannel] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isObjectionsOpen, setIsObjectionsOpen] = useState(false);

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

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

  // If not authenticated, render clean branded Login Page
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
      {/* Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openQRModal={handleOpenQRModal}
        openUserSwitcher={() => setIsUserSwitcherOpen(true)}
        openCalculator={() => setIsCalcOpen(true)}
        openObjections={() => setIsObjectionsOpen(true)}
        openAdminPanel={() => setIsAdminPanelOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#080c14]">
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
        />

        {/* Dynamic Views */}
        <main className="flex-1 flex overflow-hidden">
          {currentTab === 'deals' && (
            <KanbanBoard
              pipeline={activePipeline}
              projectId={currentWorkspace}
              searchQuery={searchQuery}
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
            <ContactsView />
          )}

          {currentTab === 'analytics' && (
            <AnalyticsView />
          )}

          {currentTab === 'automation' && (
            <AutomationView />
          )}
        </main>
      </div>

      {/* Deal Detail Modal */}
      {selectedDealId && (
        <DealDetailModal
          dealId={selectedDealId}
          pipeline={activePipeline}
          onClose={() => setSelectedDealId(null)}
          onDealUpdated={() => {}}
          onDealDeleted={() => setSelectedDealId(null)}
        />
      )}

      {/* Create Deal Modal */}
      {isCreateDealOpen && (
        <CreateDealModal
          pipelines={pipelines}
          initialPipelineId={activePipelineId}
          initialProjectId={currentWorkspace}
          onClose={() => setIsCreateDealOpen(false)}
          onDealCreated={(newDeal) => {
            setIsCreateDealOpen(false);
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

      {/* Admin Panel Modal (Protected by Master PIN 22222222) */}
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
    </div>
  );
}
