import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  Plus, 
  Building2, 
  User as UserIcon, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  Flame, 
  Globe2, 
  Calendar,
  TrendingUp 
} from 'lucide-react';
import { Deal, Pipeline, Stage } from '../../types';
import { api, socket } from '../../services/api';
import { LossReasonModal } from '../modals/LossReasonModal';
import { AnalyticsDashboardModal } from '../analytics/AnalyticsDashboardModal';
import { DealCard } from './DealCard';

interface KanbanBoardProps {
  pipeline: Pipeline;
  projectId?: string;
  searchQuery?: string;
  refreshTrigger?: number;
  onOpenDeal: (dealId: string) => void;
  openCreateDeal?: (stageId?: string) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  pipeline,
  projectId = 'employers',
  searchQuery = '',
  refreshTrigger = 0,
  onOpenDeal,
  openCreateDeal,
}) => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingLossDeal, setPendingLossDeal] = useState<{ id: string; title: string; targetStageId: string } | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'no_tasks' | 'overdue' | 'my_deals'>('all');
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

  const currentUserId = typeof localStorage !== 'undefined' ? localStorage.getItem('crm_user_id') : 'usr-admin';

  const noTaskCount = deals.filter(d => !d.tasks || d.tasks.length === 0 || d.tasks.every(t => t.isCompleted)).length;
  const overdueCount = deals.filter(d => d.tasks && d.tasks.some(t => !t.isCompleted && new Date(t.dueDate) < new Date())).length;
  const myDealsCount = deals.filter(d => d.responsibleId === currentUserId).length;

  const filteredDeals = deals.filter(d => {
    if (activeFilter === 'no_tasks') {
      return !d.tasks || d.tasks.length === 0 || d.tasks.every(t => t.isCompleted);
    }
    if (activeFilter === 'overdue') {
      return d.tasks && d.tasks.some(t => !t.isCompleted && new Date(t.dueDate) < new Date());
    }
    if (activeFilter === 'my_deals') {
      return d.responsibleId === currentUserId;
    }
    return true;
  });

  const fetchDeals = async () => {
    try {
      const res = await api.get('/deals', {
        params: {
          pipelineId: pipeline?.id,
          search: searchQuery,
          projectId: projectId
        }
      });
      if (res.data && Array.isArray(res.data)) {
        setDeals(res.data);
      }
    } catch (e) {
      console.warn('Deals sync:', e);
    }
  };

  useEffect(() => {
    fetchDeals();

    const interval = setInterval(fetchDeals, 30000);

    const handleDealCreated = (newDeal: Deal) => {
      setDeals((prev) => {
        if (prev.some(d => d.id === newDeal.id)) return prev;
        return [newDeal, ...prev];
      });
    };

    const handleDealUpdated = (updatedDeal: Deal) => {
      setDeals((prev) => prev.map(d => d.id === updatedDeal.id ? updatedDeal : d));
    };

    const handleDealDeleted = (deletedId: string) => {
      setDeals((prev) => prev.filter(d => d.id !== deletedId));
    };

    socket.on('deal_created', handleDealCreated);
    socket.on('deal_updated', handleDealUpdated);
    socket.on('deal_deleted', handleDealDeleted);

    return () => {
      clearInterval(interval);
      socket.off('deal_created', handleDealCreated);
      socket.off('deal_updated', handleDealUpdated);
      socket.off('deal_deleted', handleDealDeleted);
    };
  }, [pipeline?.id, projectId, searchQuery, refreshTrigger]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    
    // In-column priority reordering
    if (destination.droppableId === source.droppableId) {
      if (destination.index === source.index) return;
      const columnDeals = deals.filter(d => d.stageId === source.droppableId);
      const otherDeals = deals.filter(d => d.stageId !== source.droppableId);
      const [moved] = columnDeals.splice(source.index, 1);
      columnDeals.splice(destination.index, 0, moved);
      setDeals([...otherDeals, ...columnDeals]);
      return;
    }

    const newStageId = destination.droppableId;
    const targetStage = stagesList.find(s => s.id === newStageId);
    const isLossStage = targetStage && (
      targetStage.name.toLowerCase().includes('відмов') ||
      targetStage.name.toLowerCase().includes('програн') ||
      targetStage.name.toLowerCase().includes('отказ') ||
      targetStage.name.toLowerCase().includes('нереал') ||
      (targetStage as any).type === 'lost'
    );

    if (isLossStage) {
      const movedDeal = deals.find(d => d.id === draggableId);
      setPendingLossDeal({
        id: draggableId,
        title: movedDeal?.title || 'Угода',
        targetStageId: newStageId
      });
      return;
    }

    // Optimistic UI update
    setDeals((prev) =>
      prev.map((deal) =>
        deal.id === draggableId ? { ...deal, stageId: newStageId } : deal
      )
    );

    try {
      await api.put(`/deals/${draggableId}`, { stageId: newStageId });
    } catch (e) {
      console.error('Failed to move deal:', e);
      fetchDeals();
    }
  };

  const handleConfirmLoss = async (reason: string) => {
    if (!pendingLossDeal) return;
    const { id, targetStageId } = pendingLossDeal;
    setPendingLossDeal(null);

    setDeals((prev) =>
      prev.map((deal) =>
        deal.id === id ? { ...deal, stageId: targetStageId, lossReason: reason } : deal
      )
    );

    try {
      await api.put(`/deals/${id}`, { stageId: targetStageId, lossReason: reason });
    } catch (e) {
      console.error('Failed to save loss reason:', e);
      fetchDeals();
    }
  };

  const formatCurrency = (val: number) => {
    return `${new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 }).format(val || 0)} ₴`;
  };

  const stagesList = (pipeline && pipeline.stages && Array.isArray(pipeline.stages)) ? pipeline.stages : [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-100/70 dark:bg-[#070b13] p-3 sm:p-4 select-none transition-colors duration-200 font-['Inter',sans-serif]">
      {/* Smart amoCRM & Speed-to-Lead Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3 px-0.5 flex-shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto text-xs font-medium p-1 bg-white/90 dark:bg-[#090d16]/90 border border-slate-200/80 dark:border-white/[0.08] rounded-xl shadow-sm backdrop-blur-md">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05]'
            }`}
          >
            <span>Всі угоди</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
              activeFilter === 'all' ? 'bg-white/20 dark:bg-black/10' : 'bg-slate-100 dark:bg-white/[0.08]'
            }`}>
              {deals.length}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('no_tasks')}
            className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
              activeFilter === 'no_tasks'
                ? 'bg-rose-500 text-white font-semibold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>Без задач</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
              activeFilter === 'no_tasks' ? 'bg-white/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}>
              {noTaskCount}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('overdue')}
            className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
              activeFilter === 'overdue'
                ? 'bg-amber-500 text-white font-semibold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Прострочені</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
              activeFilter === 'overdue' ? 'bg-white/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            }`}>
              {overdueCount}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('my_deals')}
            className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
              activeFilter === 'my_deals'
                ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Мої угоди</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
              activeFilter === 'my_deals' ? 'bg-white/20' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
            }`}>
              {myDealsCount}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAnalyticsOpen(true)}
            className="px-3 py-1.5 bg-white dark:bg-[#090e1a]/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-slate-200 dark:border-white/[0.08] shadow-sm active:scale-95"
            title="Аналітика та конверсія воронки"
          >
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" strokeWidth={1.75} />
            <span className="hidden sm:inline">Аналітика воронки</span>
          </button>

          {openCreateDeal && (
            <button
              onClick={() => openCreateDeal()}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm hover:shadow-md hover:shadow-blue-500/20 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              <span>+ Нова угода</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 h-full min-w-max pb-2">
            {stagesList.map((stage) => {
              const stageDeals = (filteredDeals || []).filter((d) => d && d.stageId === stage.id);
              const totalStageBudget = stageDeals.reduce((sum, d) => sum + (Number(d.budget) || 0), 0);

              return (
                <div
                  key={stage.id}
                  className="w-72 sm:w-80 flex flex-col bg-slate-200/50 dark:bg-[#0b101c]/80 border border-slate-200/90 dark:border-white/[0.07] rounded-xl overflow-hidden backdrop-blur-sm"
                >
                  {/* Column Header */}
                  <div className="p-3 border-b border-slate-200/80 dark:border-white/[0.06] bg-white/80 dark:bg-[#0e1424]/90 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: stage.color || '#3b82f6' }}
                      />
                      <h3 className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate max-w-[150px]">
                        {stage.name}
                      </h3>
                      <span className="px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300 text-[10px] font-mono font-medium">
                        {stageDeals.length}
                      </span>
                    </div>

                    <span className="text-[11px] font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      {formatCurrency(totalStageBudget)}
                    </span>
                  </div>

                  {/* Droppable Deals Area */}
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 p-2 overflow-y-auto space-y-2 transition-colors ${
                          snapshot.isDraggingOver ? 'bg-blue-500/5 ring-1 ring-blue-500/30' : ''
                        }`}
                      >
                        {stageDeals.map((deal, index) => (
                          <Draggable key={deal.id} draggableId={deal.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={snapshot.isDragging ? 'rotate-1 scale-105 shadow-xl ring-2 ring-blue-500/40 z-50' : ''}
                              >
                                <DealCard
                                  deal={deal}
                                  onClick={() => onOpenDeal(deal.id)}
                                  stageColor={stage.color || '#3b82f6'}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>

                  {/* Quick Add Button */}
                  {openCreateDeal && (
                    <div className="p-2 border-t border-slate-200/80 dark:border-white/[0.06] bg-white/40 dark:bg-[#0e1424]/40">
                      <button
                        onClick={() => openCreateDeal(stage.id)}
                        className="w-full py-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.05] rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition border border-dashed border-slate-300 dark:border-white/[0.1] hover:border-blue-500/40 active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5 text-blue-500" strokeWidth={1.75} />
                        <span>+ Додати угоду</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {/* Loss Reason Modal */}
      {pendingLossDeal && (
        <LossReasonModal
          dealTitle={pendingLossDeal.title}
          onClose={() => setPendingLossDeal(null)}
          onConfirm={handleConfirmLoss}
        />
      )}

      {/* Analytics & Conversion Funnel Dashboard Modal */}
      <AnalyticsDashboardModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        deals={deals}
        pipeline={pipeline}
      />
    </div>
  );
};
