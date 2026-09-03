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
  onOpenDeal: (dealId: string) => void;
  openCreateDeal?: () => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  pipeline,
  projectId = 'employers',
  searchQuery = '',
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
          search: searchQuery
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

    const interval = setInterval(fetchDeals, 2500);

    const handleDealCreated = (newDeal: Deal) => {
      setDeals((prev) => {
        if (prev.some(d => d.id === newDeal.id)) return prev;
        return [newDeal, ...prev];
      });
    };

    const handleDealUpdated = (updatedDeal: Deal) => {
      setDeals((prev) => prev.map(d => d.id === updatedDeal.id ? updatedDeal : d));
    };

    socket.on('deal_created', handleDealCreated);
    socket.on('deal_updated', handleDealUpdated);

    return () => {
      clearInterval(interval);
      socket.off('deal_created', handleDealCreated);
      socket.off('deal_updated', handleDealUpdated);
    };
  }, [pipeline?.id, projectId, searchQuery]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 px-1 flex-shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
              activeFilter === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>Всі угоди</span>
            <span className="px-1.5 py-0.2 rounded-md bg-slate-900/60 text-[10px]">{deals.length}</span>
          </button>

          <button
            onClick={() => setActiveFilter('no_tasks')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
              activeFilter === 'no_tasks'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-rose-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span>Без задач</span>
            <span className="px-1.5 py-0.2 rounded-md bg-slate-900/60 text-[10px] text-rose-300 font-bold">{noTaskCount}</span>
          </button>

          <button
            onClick={() => setActiveFilter('overdue')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
              activeFilter === 'overdue'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-amber-400'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Прострочені</span>
            <span className="px-1.5 py-0.2 rounded-md bg-slate-900/60 text-[10px] text-amber-300 font-bold">{overdueCount}</span>
          </button>

          <button
            onClick={() => setActiveFilter('my_deals')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
              activeFilter === 'my_deals'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-purple-300'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Мої угоди</span>
            <span className="px-1.5 py-0.2 rounded-md bg-slate-900/60 text-[10px] text-purple-200">{myDealsCount}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAnalyticsOpen(true)}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-slate-700/80 shadow-sm"
            title="Аналітика та конверсія воронки"
          >
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Аналітика воронки</span>
          </button>

          {openCreateDeal && (
            <button
              onClick={openCreateDeal}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-blue-600/30"
            >
              <Plus className="w-3.5 h-3.5" />
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
                className="w-72 sm:w-80 flex flex-col bg-[#0e1320] border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl"
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-slate-800/80 bg-[#111827] flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: stage.color || '#3b82f6' }}
                    />
                    <h3 className="font-bold text-xs text-white truncate max-w-[150px]">
                      {stage.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[11px] font-bold">
                      {stageDeals.length}
                    </span>
                  </div>

                  <span className="text-[11px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
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
                                className={`p-3.5 bg-[#141b2d] border border-slate-800/90 hover:border-blue-500/50 rounded-2xl shadow-md transition cursor-pointer space-y-2.5 ${
                                  snapshot.isDragging ? 'rotate-2 shadow-2xl border-blue-500 bg-[#1c263f]' : ''
                                }`}
                              >
                                {/* Title & Budget */}
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-bold text-xs text-white line-clamp-2 leading-snug">
                                    {deal.title}
                                  </h4>
                                  <span className="text-xs font-black text-emerald-400 whitespace-nowrap">
                                    {formatCurrency(deal.budget)}
                                  </span>
                                </div>

                                {/* Contact & Company Info */}
                                <div className="space-y-1 text-[11px] text-slate-400">
                                  {deal.company && (
                                    <div className="flex items-center gap-1.5 truncate">
                                      <Building2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                                      <span className="truncate">{deal.company.name}</span>
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
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                          tag === 'WhatsApp' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                          tag === 'Telegram' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' :
                                          'bg-slate-800 text-slate-300'
                                        }`}
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Bottom: Responsible & Date */}
                                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                                  <div className="flex items-center gap-1.5">
                                    {deal.responsible ? (
                                      <>
                                        <img
                                          src={deal.responsible.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                                          alt={deal.responsible.name}
                                          className="w-4 h-4 rounded-full object-cover"
                                        />
                                        <span className="truncate max-w-[90px]">{deal.responsible.name.split(' ')[0]}</span>
                                      </>
                                    ) : (
                                      <span>Не призначено</span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
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
                  <div className="p-2 border-t border-slate-800/80 bg-[#111827]">
                    <button
                      onClick={openCreateDeal}
                      className="w-full py-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
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
