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
    <div className="flex-1 flex flex-col overflow-hidden bg-[#080c14] p-4 select-none font-['Inter',sans-serif]">
      {/* amoCRM Smart Filter Bar */}
      {/* Smart amoCRM & Speed-to-Lead Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5 px-1 flex-shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold p-1 bg-[#090E1A]/80 border border-white/[0.07] rounded-2xl backdrop-blur-md shadow-sm">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
              activeFilter === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <span>Всі угоди</span>
            <span className="px-1.5 py-0.2 rounded-md bg-black/30 text-[10px]">{deals.length}</span>
          </button>

          <button
            onClick={() => setActiveFilter('no_tasks')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
              activeFilter === 'no_tasks'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span>Без задач</span>
            <span className="px-1.5 py-0.2 rounded-md bg-black/30 text-[10px] text-rose-300 font-bold">{noTaskCount}</span>
          </button>

          <button
            onClick={() => setActiveFilter('overdue')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
              activeFilter === 'overdue'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25'
                : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Прострочені</span>
            <span className="px-1.5 py-0.2 rounded-md bg-black/30 text-[10px] text-amber-300 font-bold">{overdueCount}</span>
          </button>

          <button
            onClick={() => setActiveFilter('my_deals')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
              activeFilter === 'my_deals'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                : 'text-slate-400 hover:text-purple-300 hover:bg-purple-500/10'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Мої угоди</span>
            <span className="px-1.5 py-0.2 rounded-md bg-black/30 text-[10px] text-purple-200">{myDealsCount}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAnalyticsOpen(true)}
            className="px-3.5 py-1.5 bg-[#090E1A]/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-white/[0.08] shadow-sm active:scale-[0.98]"
            title="Аналітика та конверсія воронки"
          >
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Аналітика воронки</span>
          </button>

          {openCreateDeal && (
            <button
              onClick={openCreateDeal}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-blue-600/25 active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Нова угода</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3.5 h-full min-w-max pb-2">
            {stagesList.map((stage) => {
              const stageDeals = (filteredDeals || []).filter((d) => d && d.stageId === stage.id);
            const totalStageBudget = stageDeals.reduce((sum, d) => sum + (Number(d.budget) || 0), 0);

            return (
              <div
                key={stage.id}
                className="w-72 sm:w-80 flex flex-col bg-[#0A0F1D]/80 border border-white/[0.07] rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-sm"
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-white/[0.06] bg-[#0E1526]/90 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: stage.color || '#3b82f6' }}
                    />
                    <h3 className="font-semibold text-xs text-slate-100 truncate max-w-[150px]">
                      {stage.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300 text-[10px] font-semibold border border-white/[0.08]">
                      {stageDeals.length}
                    </span>
                  </div>

                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    {formatCurrency(totalStageBudget)}
                  </span>
                </div>

                {/* Droppable Deals Area */}
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 p-2.5 overflow-y-auto space-y-2.5 transition-colors ${
                        snapshot.isDraggingOver ? 'bg-slate-800/40' : ''
                      }`}
                    >
                      {stageDeals.map((deal, index) => {
                        let parsedTags: string[] = [];
                        try {
                          parsedTags = typeof deal.tags === 'string' ? JSON.parse(deal.tags) : (deal.tags || []);
                        } catch (e) {
                          parsedTags = [];
                        }

                        return (
                          <Draggable key={deal.id} draggableId={deal.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => onOpenDeal(deal.id)}
                                className={`p-3.5 bg-[#111728]/90 hover:bg-[#151D33] border border-white/[0.08] hover:border-blue-500/50 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:shadow-[0_12px_28px_-8px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer space-y-2.5 group ${
                                  snapshot.isDragging ? 'rotate-2 shadow-2xl border-blue-500 bg-[#1c263f]' : ''
                                }`}
                              >
                                {/* Title & Budget */}
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-semibold text-xs text-slate-100 group-hover:text-blue-300 transition line-clamp-2 leading-snug">
                                    {deal.title}
                                  </h4>
                                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg whitespace-nowrap">
                                    {formatCurrency(deal.budget)}
                                  </span>
                                </div>

                                {/* Contact & Company Info */}
                                <div className="space-y-1 text-[11px] text-slate-400">
                                  {deal.company && (
                                    <div className="flex items-center gap-1.5 truncate">
                                      <Building2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                                      <span className="truncate text-slate-300">{deal.company.name}</span>
                                    </div>
                                  )}
                                  {deal.contact && (
                                    <div className="flex items-center gap-1.5 truncate">
                                      <UserIcon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                                      <span className="truncate">{deal.contact.name}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Tags */}
                                {parsedTags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {parsedTags.slice(0, 3).map((tag, idx) => (
                                      <span
                                        key={idx}
                                        className={`px-1.5 py-0.5 rounded-md text-[9px] font-semibold ${
                                          tag === 'WhatsApp' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' :
                                          tag === 'Telegram' ? 'bg-sky-500/15 text-sky-400 border border-sky-500/25' :
                                          'bg-white/[0.04] text-slate-300 border border-white/[0.06]'
                                        }`}
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Bottom: Responsible & Date */}
                                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-slate-500">
                                  <div className="flex items-center gap-1.5">
                                    {deal.responsible ? (
                                      <>
                                        <img
                                          src={deal.responsible.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                                          alt={deal.responsible.name}
                                          className="w-4 h-4 rounded-full object-cover border border-white/10"
                                        />
                                        <span className="truncate max-w-[90px] text-slate-400 font-medium">{deal.responsible.name.split(' ')[0]}</span>
                                      </>
                                    ) : (
                                      <span className="text-slate-600">Не призначено</span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 text-slate-500 font-medium">
                                    <Calendar className="w-3 h-3" />
                                    <span>{new Date(deal.createdAt).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {/* Quick Add Button */}
                {openCreateDeal && (
                  <div className="p-2.5 border-t border-white/[0.06] bg-[#0E1526]/80">
                    <button
                      onClick={() => openCreateDeal(stage.id)}
                      className="w-full py-2 text-slate-400 hover:text-white hover:bg-white/[0.04] rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-dashed border-white/[0.08] hover:border-blue-500/40 active:scale-[0.99]"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-400" />
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
