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
  Calendar 
} from 'lucide-react';
import { Deal, Pipeline, Stage } from '../../types';
import { api, socket } from '../../services/api';

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

  const fetchDeals = async () => {
    try {
      const res = await api.get('/deals', {
        params: {
          pipelineId: pipeline?.id,
          projectId,
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

    const handleDealCreated = (newDeal: Deal) => {
      setDeals((prev) => [newDeal, ...prev.filter(d => d.id !== newDeal.id)]);
    };

    const handleDealUpdated = (updatedDeal: Deal) => {
      setDeals((prev) => prev.map(d => d.id === updatedDeal.id ? updatedDeal : d));
    };

    socket.on('deal_created', handleDealCreated);
    socket.on('deal_updated', handleDealUpdated);

    return () => {
      socket.off('deal_created', handleDealCreated);
      socket.off('deal_updated', handleDealUpdated);
    };
  }, [pipeline?.id, projectId, searchQuery]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const newStageId = destination.droppableId;

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

  const formatEUR = (val: number) => {
    return `€${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(val || 0)}`;
  };

  const stagesList = (pipeline && pipeline.stages) ? pipeline.stages : [];

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden p-5 bg-[#080c14] select-none font-['Inter',sans-serif]">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 h-full min-w-max pb-2">
          {stagesList.map((stage) => {
            const stageDeals = (deals || []).filter((d) => d.stageId === stage.id);
            const totalStageBudget = stageDeals.reduce((sum, d) => sum + (d.budget || 0), 0);

            return (
              <div
                key={stage.id}
                className="w-80 flex flex-col h-full bg-[#0e1422]/90 border border-slate-800/80 rounded-3xl overflow-hidden shadow-lg backdrop-blur-sm"
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-slate-800/80 bg-[#121929]/90 flex flex-col gap-1.5 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: stage.color }}
                      />
                      <h3 className="font-bold text-xs text-white truncate">
                        {stage.name}
                      </h3>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
                      {stageDeals.length}
                    </span>
                  </div>

                  {/* Stage total in EUR */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Сума етапу:</span>
                    <span className="font-bold text-emerald-400">
                      {formatEUR(totalStageBudget)}
                    </span>
                  </div>
                </div>

                {/* Droppable Deals Area */}
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 p-2.5 overflow-y-auto space-y-2.5 transition-colors ${
                        snapshot.isDraggingOver ? 'bg-blue-600/10' : ''
                      }`}
                    >
                      {stageDeals.map((deal, index) => {
                        let tags: string[] = [];
                        let customFields: Record<string, string> = {};
                        try {
                          if (deal.tags) tags = JSON.parse(deal.tags);
                          if (deal.customFields) customFields = JSON.parse(deal.customFields);
                        } catch (e) {}

                        return (
                          <Draggable key={deal.id} draggableId={deal.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => onOpenDeal(deal.id)}
                                className={`p-4 bg-[#141b2d] hover:bg-[#1a233a] border border-slate-800/90 hover:border-slate-700 rounded-2xl shadow-md cursor-pointer transition-all duration-150 space-y-2.5 ${
                                  snapshot.isDragging ? 'shadow-2xl ring-2 ring-blue-500 scale-105 z-50' : ''
                                }`}
                              >
                                {/* Top: Title & Budget in EUR */}
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-bold text-xs text-white leading-snug line-clamp-2">
                                    {deal.title}
                                  </h4>
                                  <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 flex-shrink-0">
                                    {formatEUR(deal.budget || 0)}
                                  </span>
                                </div>

                                {/* Company & Contact */}
                                <div className="space-y-1 text-xs text-slate-300">
                                  {deal.company && (
                                    <div className="flex items-center gap-1.5 truncate">
                                      <Building2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                                      <span className="truncate">{deal.company.name}</span>
                                    </div>
                                  )}
                                  {deal.contact && (
                                    <div className="flex items-center gap-1.5 text-slate-400 truncate">
                                      <UserIcon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                                      <span className="truncate">{deal.contact.name}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Tags & Milestones */}
                                {tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 pt-1">
                                    {tags.slice(0, 3).map((tag, idx) => (
                                      <span
                                        key={idx}
                                        className="text-[10px] bg-slate-800/90 text-slate-300 px-1.5 py-0.5 rounded-md border border-slate-700 font-medium truncate max-w-[120px]"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Bottom Info: Tasks & Manager Avatar */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                                  <div className="flex items-center gap-2">
                                    {deal.tasks && deal.tasks.length > 0 ? (
                                      <span className="flex items-center gap-1 text-amber-400 font-medium">
                                        <Clock className="w-3 h-3" />
                                        <span>{deal.tasks.length}</span>
                                      </span>
                                    ) : (
                                      <span className="text-rose-400 font-medium text-[10px]">
                                        Немає задач
                                      </span>
                                    )}
                                  </div>

                                  {deal.responsible && (
                                    <img
                                      src={deal.responsible.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                                      alt={deal.responsible.name}
                                      title={deal.responsible.name}
                                      className="w-5 h-5 rounded-full object-cover border border-slate-600"
                                    />
                                  )}
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
                  <div className="p-2 border-t border-slate-800/80 bg-[#121929]/50">
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
  );
};
