import React, { useState } from 'react';
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

interface KanbanBoardProps {
  pipeline: Pipeline;
  deals: Deal[];
  onDealClick: (deal: Deal) => void;
  onMoveDeal: (dealId: string, newStageId: string) => void;
  onQuickAddDeal: (stageId: string) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  pipeline,
  deals,
  onDealClick,
  onMoveDeal,
  onQuickAddDeal,
}) => {
  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    onMoveDeal(draggableId, destination.droppableId);
  };

  const formatEUR = (val: number) => {
    return `€${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(val || 0)}`;
  };

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden p-5 bg-[#080c14] select-none font-['Inter',sans-serif]">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 h-full min-w-max pb-2">
          {pipeline.stages.map((stage) => {
            const stageDeals = deals.filter((d) => d.stageId === stage.id);
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
                        const tags: string[] = deal.tags ? JSON.parse(deal.tags) : [];
                        const customFields: Record<string, string> = deal.customFields
                          ? JSON.parse(deal.customFields)
                          : {};

                        return (
                          <Draggable key={deal.id} draggableId={deal.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => onDealClick(deal)}
                                className={`p-4 bg-[#141b2d] hover:bg-[#1a233a] border border-slate-800/90 hover:border-blue-500/50 rounded-2xl cursor-pointer shadow-md transition-all duration-150 space-y-2.5 group ${
                                  snapshot.isDragging ? 'shadow-2xl ring-2 ring-blue-500 scale-[1.02] bg-[#1a233a]' : ''
                                }`}
                              >
                                {/* Title and Budget */}
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-bold text-xs text-white group-hover:text-blue-400 transition leading-snug line-clamp-2">
                                    {deal.title}
                                  </h4>
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="text-emerald-400 font-extrabold text-xs px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                    {formatEUR(deal.budget || 0)}
                                  </div>
                                  {customFields['Кількість працівників'] && (
                                    <span className="text-[10px] bg-blue-500/10 text-blue-300 font-bold px-2 py-0.5 rounded-lg border border-blue-500/20">
                                      {customFields['Кількість працівників']}
                                    </span>
                                  )}
                                </div>

                                {/* Enterprise / Contact details */}
                                <div className="space-y-1 text-[11px] text-slate-300">
                                  {deal.company && (
                                    <div className="flex items-center gap-1.5 text-slate-200 font-medium truncate">
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

                                {/* Tags */}
                                {tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 pt-1">
                                    {tags.slice(0, 3).map((t, idx) => (
                                      <span
                                        key={idx}
                                        className="text-[10px] font-semibold bg-slate-800/90 text-slate-300 border border-slate-700/60 px-1.5 py-0.5 rounded-md"
                                      >
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Bottom Info Bar */}
                                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                                  <div className="flex items-center gap-1.5">
                                    {deal.responsible && (
                                      <img
                                        src={deal.responsible.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                                        alt={deal.responsible.name}
                                        className="w-5 h-5 rounded-full object-cover border border-slate-600"
                                        title={`Відповідальний: ${deal.responsible.name}`}
                                      />
                                    )}
                                    <span className="truncate max-w-[90px]">{deal.responsible?.name}</span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {deal.messages && deal.messages.length > 0 && (
                                      <span className="flex items-center gap-0.5 text-emerald-400 font-bold" title="WhatsApp/TG повідомлення">
                                        <MessageSquare className="w-3 h-3" />
                                        <span>{deal.messages.length}</span>
                                      </span>
                                    )}
                                    {deal.tasks && deal.tasks.length > 0 && (
                                      <span className="flex items-center gap-0.5 text-amber-400 font-semibold" title="Активні завдання">
                                        <Clock className="w-3 h-3" />
                                        <span>{deal.tasks.length}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}

                      {/* Quick Add Button */}
                      <button
                        onClick={() => onQuickAddDeal(stage.id)}
                        className="w-full py-2.5 bg-slate-800/40 hover:bg-slate-800/80 border border-dashed border-slate-700/80 hover:border-slate-500 rounded-2xl text-xs font-semibold text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Швидка угода</span>
                      </button>
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};
