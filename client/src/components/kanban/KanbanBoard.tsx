import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, MoreHorizontal } from 'lucide-react';
import { Pipeline, Deal } from '../../types';
import { DealCard } from './DealCard';

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
  const handleDragEnd = (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId !== result.source.droppableId) {
      onMoveDeal(draggableId, destination.droppableId);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex-1 overflow-x-auto p-6 flex gap-4 select-none bg-[#0b0f19]">
        {pipeline.stages.map((stage) => {
          const stageDeals = deals.filter((d) => d.stageId === stage.id);
          const stageSum = stageDeals.reduce((acc, d) => acc + (d.budget || 0), 0);

          return (
            <div
              key={stage.id}
              className="w-80 flex-shrink-0 flex flex-col bg-[#131926] rounded-2xl border border-slate-800/80 shadow-lg"
            >
              {/* Column Header */}
              <div className="p-4 border-b border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: stage.color || '#3b82f6' }}
                    />
                    <h3 className="font-bold text-sm text-slate-100 truncate">
                      {stage.name}
                    </h3>
                  </div>
                  <span className="text-xs bg-slate-800/80 text-slate-300 font-semibold px-2 py-0.5 rounded-full border border-slate-700">
                    {stageDeals.length}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                  <span className="text-slate-500">Сумма:</span>
                  <span className="text-slate-200 font-bold">{formatCurrency(stageSum)}</span>
                </div>
              </div>

              {/* Quick Add Button on top of column */}
              <div className="p-2 border-b border-slate-800/40">
                <button
                  onClick={() => onQuickAddDeal(stage.id)}
                  className="w-full py-1.5 px-3 rounded-xl border border-dashed border-slate-700 hover:border-blue-500 hover:bg-blue-500/10 text-slate-400 hover:text-blue-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Быстрая сделка</span>
                </button>
              </div>

              {/* Droppable Area */}
              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 p-2.5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-250px)] transition-colors ${
                      snapshot.isDraggingOver ? 'bg-blue-950/20 rounded-b-2xl' : ''
                    }`}
                  >
                    {stageDeals.map((deal, index) => (
                      <Draggable key={deal.id} draggableId={deal.id} index={index}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            style={{
                              ...dragProvided.draggableProps.style,
                              opacity: dragSnapshot.isDragging ? 0.9 : 1,
                            }}
                          >
                            <DealCard deal={deal} onClick={() => onDealClick(deal)} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};
