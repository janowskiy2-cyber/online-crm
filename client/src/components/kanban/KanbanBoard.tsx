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
  AlertTriangle,
  Globe2, 
  Calendar,
  TrendingUp,
  Archive,
  Download,
  Copy,
  Trash2,
  Users,
  Check,
  CheckSquare,
  X
} from 'lucide-react';
import { Deal, Pipeline, Stage } from '../../types';
import { useNavigate } from 'react-router-dom';
import { api, socket } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { soundService } from '../../services/sound.service';
import { LossReasonModal } from '../modals/LossReasonModal';
import { PauseDealModal } from '../modals/PauseDealModal';
import { AnalyticsDashboardModal } from '../analytics/AnalyticsDashboardModal';
import { ArchivedDealsModal } from '../modals/ArchivedDealsModal';
import { DuplicateDealsScannerModal } from '../modals/DuplicateDealsScannerModal';
import { DealCard } from './DealCard';

interface KanbanBoardProps {
  pipeline: Pipeline;
  pipelines?: Pipeline[];
  onSelectPipeline?: (id: string) => void;
  projectId?: string;
  searchQuery?: string;
  refreshTrigger?: number;
  onOpenDeal: (dealId: string) => void;
  openCreateDeal?: (stageId?: string) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  pipeline,
  pipelines = [],
  onSelectPipeline,
  projectId = 'employers',
  searchQuery = '',
  refreshTrigger = 0,
  onOpenDeal,
  openCreateDeal,
}) => {
  const navigate = useNavigate();
  const { currentUser, users } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingLossDeal, setPendingLossDeal] = useState<{ id: string; title: string; targetStageId: string } | null>(null);
  const [pendingPauseDeal, setPendingPauseDeal] = useState<{ id: string; title: string; targetStageId: string } | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'future_tasks' | 'no_tasks' | 'overdue' | 'my_deals' | 'deferred'>('all');
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isDuplicatesModalOpen, setIsDuplicatesModalOpen] = useState(false);
  const [recentlyMovedDealId, setRecentlyMovedDealId] = useState<string | null>(null);

  // Bulk Actions State
  const [selectedDealIds, setSelectedDealIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isBulkExecuting, setIsBulkExecuting] = useState(false);
  const [bulkStageId, setBulkStageId] = useState<string>('');
  const [bulkResponsibleId, setBulkResponsibleId] = useState<string>('');

  const stagesList = (pipeline && pipeline.stages && Array.isArray(pipeline.stages)) ? pipeline.stages : [];
  const currentUserId = currentUser?.id || (typeof localStorage !== 'undefined' ? localStorage.getItem('crm_user_id') : 'usr-admin') || 'usr-admin';

  const futureTaskCount = deals.filter(d => {
    const active = (d.tasks || []).filter(t => !t.isCompleted && !t.isDeleted);
    return active.length > 0 && active.every(t => new Date(t.dueDate).getTime() >= Date.now());
  }).length;
  const noTaskCount = deals.filter(d => !d.tasks || d.tasks.filter(t => !t.isCompleted && !t.isDeleted).length === 0).length;
  const overdueCount = deals.filter(d => (d.tasks || []).some(t => !t.isCompleted && !t.isDeleted && new Date(t.dueDate).getTime() < Date.now())).length;
  const myDealsCount = deals.filter(d => d.responsibleId === currentUserId).length;
  const deferredCount = deals.filter(d => {
    const stg = stagesList.find(s => s.id === d.stageId);
    return stg && (
      stg.name.toLowerCase().includes('відкладений') || 
      stg.name.toLowerCase().includes('отложенный') || 
      stg.name.toLowerCase().includes('пауз')
    );
  }).length;

  const filteredDeals = deals.map(d => {
    // Safety fallback: if deal has an unknown stageId not in stagesList, assign it to stagesList[0].id so it never vanishes
    if (stagesList.length > 0 && !stagesList.some(s => s.id === d.stageId)) {
      return { ...d, stageId: stagesList[0].id };
    }
    return d;
  }).filter(d => {
    // If this deal was recently moved by the user, keep it in view so amoCRM auto-tasks don't abruptly evict it
    if (recentlyMovedDealId && d.id === recentlyMovedDealId) {
      return true;
    }
    if (activeFilter === 'future_tasks') {
      const active = (d.tasks || []).filter(t => !t.isCompleted && !t.isDeleted);
      return active.length > 0 && active.every(t => new Date(t.dueDate).getTime() >= Date.now());
    }
    if (activeFilter === 'no_tasks') {
      return !d.tasks || d.tasks.filter(t => !t.isCompleted && !t.isDeleted).length === 0;
    }
    if (activeFilter === 'overdue') {
      return (d.tasks || []).some(t => !t.isCompleted && !t.isDeleted && new Date(t.dueDate).getTime() < Date.now());
    }
    if (activeFilter === 'my_deals') {
      return d.responsibleId === currentUserId;
    }
    if (activeFilter === 'deferred') {
      const stg = stagesList.find(s => s.id === d.stageId);
      return !!stg && (
        stg.name.toLowerCase().includes('відкладений') || 
        stg.name.toLowerCase().includes('отложенный') || 
        stg.name.toLowerCase().includes('пауз')
      );
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

    const handleBulkDeleted = (data: { dealIds: string[] }) => {
      if (data?.dealIds && Array.isArray(data.dealIds)) {
        const idSet = new Set(data.dealIds);
        setDeals((prev) => prev.filter(d => !idSet.has(d.id)));
      }
    };

    socket.on('deal_created', handleDealCreated);
    socket.on('deal_updated', handleDealUpdated);
    socket.on('deal_deleted', handleDealDeleted);
    socket.on('deals_bulk_deleted', handleBulkDeleted);

    return () => {
      clearInterval(interval);
      socket.off('deal_created', handleDealCreated);
      socket.off('deal_updated', handleDealUpdated);
      socket.off('deal_deleted', handleDealDeleted);
      socket.off('deals_bulk_deleted', handleBulkDeleted);
    };
  }, [pipeline?.id, projectId, searchQuery, refreshTrigger]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    // No move occurred
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const newStageId = destination.droppableId;
    const targetStage = stagesList.find(s => s.id === newStageId);
    const isLossStage = targetStage && (
      targetStage.name.toLowerCase().includes('відмов') ||
      targetStage.name.toLowerCase().includes('програн') ||
      targetStage.name.toLowerCase().includes('отказ') ||
      targetStage.name.toLowerCase().includes('нереал') ||
      (targetStage as any).type === 'lost' ||
      targetStage.isLost === true
    );

    const isPauseStage = targetStage && (
      targetStage.name.toLowerCase().includes('відкладений') ||
      targetStage.name.toLowerCase().includes('отложенный') ||
      targetStage.name.toLowerCase().includes('пауз')
    );

    // If moving to a loss stage from a different stage, open modal
    if (isLossStage && source.droppableId !== newStageId) {
      const movedDeal = deals.find(d => d.id === draggableId);
      setPendingLossDeal({
        id: draggableId,
        title: movedDeal?.title || 'Угода',
        targetStageId: newStageId
      });
      return;
    }

    // If moving to a pause stage from a different stage, open pause modal
    if (isPauseStage && source.droppableId !== newStageId) {
      const movedDeal = deals.find(d => d.id === draggableId);
      setPendingPauseDeal({
        id: draggableId,
        title: movedDeal?.title || 'Угода',
        targetStageId: newStageId
      });
      return;
    }

    // Find the deal being moved
    const movedDeal = deals.find(d => d.id === draggableId);
    if (!movedDeal) return;

    // Keep deal visible even if its amoCRM task state changes
    setRecentlyMovedDealId(draggableId);
    setTimeout(() => setRecentlyMovedDealId(null), 8000);

    // Clean atomic reordering without relying on filtered indices
    const updatedDeal: Deal = { ...movedDeal, stageId: newStageId };

    setDeals((prev) => {
      // Remove moved deal from previous list
      const remaining = prev.filter(d => d.id !== draggableId);
      // Group deals belonging to target stage
      const targetColumnDeals = remaining.filter(d => d.stageId === newStageId);
      const otherColumnDeals = remaining.filter(d => d.stageId !== newStageId);

      // Insert at destination index within the target stage list
      targetColumnDeals.splice(destination.index, 0, updatedDeal);
      return [...otherColumnDeals, ...targetColumnDeals];
    });

    try {
      const res = await api.put(`/deals/${draggableId}`, { stageId: newStageId });
      if (res.data) {
        setDeals((prev) =>
          prev.map((d) => (d.id === draggableId ? { ...d, ...res.data, stageId: newStageId } : d))
        );
      }
    } catch (e) {
      console.error('Failed to move deal:', e);
      fetchDeals();
    }
  };

  const handleConfirmLoss = async (reason: string) => {
    if (!pendingLossDeal) return;
    const { id, targetStageId } = pendingLossDeal;
    setPendingLossDeal(null);

    setRecentlyMovedDealId(id);
    setTimeout(() => setRecentlyMovedDealId(null), 8000);

    setDeals((prev) =>
      prev.map((deal) =>
        deal.id === id ? { ...deal, stageId: targetStageId, lossReason: reason } : deal
      )
    );

    try {
      const res = await api.put(`/deals/${id}`, { stageId: targetStageId, lossReason: reason });
      if (res.data) {
        setDeals((prev) =>
          prev.map((d) => (d.id === id ? { ...d, ...res.data, stageId: targetStageId, lossReason: reason } : d))
        );
      }
    } catch (e) {
      console.error('Failed to save loss reason:', e);
      fetchDeals();
    }
  };

  const handleConfirmPause = async (data: { reason: string; wakeUpDate: string; autoCreateTask: boolean }) => {
    if (!pendingPauseDeal) return;
    const { id, targetStageId } = pendingPauseDeal;
    setPendingPauseDeal(null);

    setRecentlyMovedDealId(id);
    setTimeout(() => setRecentlyMovedDealId(null), 8000);

    setDeals((prev) =>
      prev.map((deal) =>
        deal.id === id ? { ...deal, stageId: targetStageId } : deal
      )
    );

    try {
      const res = await api.put(`/deals/${id}`, { 
        stageId: targetStageId,
        pauseData: data
      });
      if (res.data) {
        setDeals((prev) =>
          prev.map((d) => (d.id === id ? { ...d, ...res.data, stageId: targetStageId } : d))
        );
      }
      fetchDeals();
    } catch (e) {
      console.error('Failed to pause deal:', e);
      fetchDeals();
    }
  };

  const handleMoveDealStage = async (dealId: string, newStageId: string) => {
    if (!dealId || !newStageId) return;
    const currentDeal = deals.find((d) => d.id === dealId);
    if (!currentDeal || currentDeal.stageId === newStageId) return;

    const targetStage = stagesList.find((s) => s.id === newStageId);
    if (targetStage && targetStage.name.toLowerCase().includes('відмова')) {
      setPendingLossDeal({ id: dealId, title: currentDeal.title, targetStageId: newStageId });
      return;
    }

    if (targetStage && (
      targetStage.name.toLowerCase().includes('відкладений') ||
      targetStage.name.toLowerCase().includes('отложенный') ||
      targetStage.name.toLowerCase().includes('пауз')
    )) {
      setPendingPauseDeal({ id: dealId, title: currentDeal.title, targetStageId: newStageId });
      return;
    }

    setRecentlyMovedDealId(dealId);
    setTimeout(() => setRecentlyMovedDealId(null), 8000);

    setDeals((prev) =>
      prev.map((deal) =>
        deal.id === dealId ? { ...deal, stageId: newStageId } : deal
      )
    );

    try {
      const res = await api.put(`/deals/${dealId}`, { stageId: newStageId });
      if (res.data) {
        setDeals((prev) =>
          prev.map((d) => (d.id === dealId ? { ...d, ...res.data, stageId: newStageId } : d))
        );
      }
    } catch (e) {
      console.error('Failed to move deal:', e);
      fetchDeals();
    }
  };

  const handleExportDeals = async () => {
    try {
      const pId = pipeline?.id || '';
      const res = await api.get(`/export/deals?pipelineId=${pId}&projectId=${projectId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `deals_export_${pipeline?.name || 'pipeline'}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export deals error:', err);
      alert('Помилка завантаження експорту угод');
    }
  };

  const handleToggleSelectDeal = (dealId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedDealIds((prev) => {
      const next = new Set(prev);
      if (next.has(dealId)) {
        next.delete(dealId);
      } else {
        next.add(dealId);
      }
      if (next.size > 0 && !isSelectionMode) {
        setIsSelectionMode(true);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = filteredDeals.map((d) => d.id);
    setSelectedDealIds(new Set(allIds));
    setIsSelectionMode(true);
  };

  const handleClearSelection = () => {
    setSelectedDealIds(new Set());
    setIsSelectionMode(false);
    setBulkStageId('');
    setBulkResponsibleId('');
  };

  const handleToggleSelectStage = (stageId: string) => {
    const stageDealIds = filteredDeals.filter((d) => d.stageId === stageId).map((d) => d.id);
    setSelectedDealIds((prev) => {
      const next = new Set(prev);
      const allStageSelected = stageDealIds.length > 0 && stageDealIds.every((id) => next.has(id));
      if (allStageSelected) {
        stageDealIds.forEach((id) => next.delete(id));
      } else {
        stageDealIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const count = selectedDealIds.size;
    if (count === 0) return;
    if (!window.confirm(`Перемістити ${count} угод до кошика? Усі дані зберігаються в архіві з можливістю відновлення протягом 30 днів.`)) {
      return;
    }

    setIsBulkExecuting(true);
    try {
      const idsArray = Array.from(selectedDealIds);
      await api.post('/deals/bulk-action', {
        dealIds: idsArray,
        action: 'delete'
      });
      setDeals((prev) => prev.filter((d) => !selectedDealIds.has(d.id)));
      soundService.playSuccess();
      handleClearSelection();
      fetchDeals();
    } catch (err: any) {
      console.error('Bulk delete error:', err);
      alert(err?.response?.data?.error || 'Помилка видалення вибраних угод');
    } finally {
      setIsBulkExecuting(false);
    }
  };

  const handleBulkChangeStage = async (targetStageId: string) => {
    if (!targetStageId || selectedDealIds.size === 0) return;
    setIsBulkExecuting(true);
    try {
      const idsArray = Array.from(selectedDealIds);
      await api.post('/deals/bulk-action', {
        dealIds: idsArray,
        action: 'change_stage',
        targetStageId
      });
      setDeals((prev) => prev.map((d) => selectedDealIds.has(d.id) ? { ...d, stageId: targetStageId } : d));
      soundService.playSuccess();
      handleClearSelection();
      fetchDeals();
    } catch (err: any) {
      console.error('Bulk change stage error:', err);
      alert(err?.response?.data?.error || 'Помилка зміни етапу');
    } finally {
      setIsBulkExecuting(false);
    }
  };

  const handleBulkChangeResponsible = async (targetResponsibleId: string) => {
    if (!targetResponsibleId || selectedDealIds.size === 0) return;
    setIsBulkExecuting(true);
    try {
      const idsArray = Array.from(selectedDealIds);
      await api.post('/deals/bulk-action', {
        dealIds: idsArray,
        action: 'change_responsible',
        targetResponsibleId
      });
      setDeals((prev) => prev.map((d) => selectedDealIds.has(d.id) ? { ...d, responsibleId: targetResponsibleId } : d));
      soundService.playSuccess();
      handleClearSelection();
      fetchDeals();
    } catch (err: any) {
      console.error('Bulk change responsible error:', err);
      alert(err?.response?.data?.error || 'Помилка призначення відповідального');
    } finally {
      setIsBulkExecuting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return `${new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 }).format(val || 0)} ₴`;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bitrix-wallpaper p-3 sm:p-5 transition-colors duration-200 font-['Inter',-apple-system,sans-serif]">
      {/* Mobile Sticky Horizontal Stage Ribbon (md:hidden) */}
      {stagesList.length > 0 && (
        <div className="md:hidden flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1.5 mb-2.5 px-0.5 flex-shrink-0">
          {stagesList.map((stg) => {
            const stageDeals = (filteredDeals || []).filter((d) => d && d.stageId === stg.id);
            return (
              <button
                key={stg.id}
                type="button"
                onClick={() => {
                  const el = document.getElementById(`kanban-stage-${stg.id}`);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                  }
                }}
                className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-white/90 dark:bg-[#0e1424]/95 border border-black/[0.06] dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.04)] active:scale-[0.97] flex-shrink-0 transition-all"
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: stg.color || '#0071E3' }} />
                <span className="text-[#1D1D1F] dark:text-slate-200 truncate max-w-[110px]">{stg.name}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/[0.05] dark:bg-white/[0.08] text-[10px] font-mono text-[#86868B] dark:text-slate-400 font-bold">
                  {stageDeals.length}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Workspace guidance banner if candidate category is selected */}
      {projectId === 'candidates' && (
        <div className="mb-3.5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between gap-3 text-xs text-slate-800 dark:text-white backdrop-blur-md shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Globe2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div>
              <span className="font-bold text-emerald-700 dark:text-emerald-300">Проєкт: Кандидати (Пул).</span>
              <span className="text-slate-600 dark:text-slate-300 ml-1">Анкети, скринінг та закріплення працівників знаходяться в Базі кандидатів.</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/candidates')}
            className="px-4 py-1.5 bg-[#34C759] hover:bg-[#30B752] text-white rounded-full font-medium flex items-center gap-1.5 transition shadow-sm active:scale-[0.97] whitespace-nowrap"
          >
            <span>База кандидатів</span>
            <TrendingUp className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Smart Apple iOS Segmented Control Filter Bar & Action Hub */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5 px-0.5 flex-shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-nowrap text-xs font-medium p-1 bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08] rounded-2xl shadow-inner backdrop-blur-md max-w-full">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 active:scale-[0.97] ${
              activeFilter === 'all'
                ? 'bg-white text-[#1D1D1F] dark:bg-[#1E2536] dark:text-white font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]'
                : 'text-[#86868B] dark:text-slate-400 hover:text-[#1D1D1F] dark:hover:text-white hover:bg-black/[0.02] dark:hover:bg-white/[0.05]'
            }`}
          >
            <span>Всі угоди</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeFilter === 'all' ? 'bg-black/[0.06] dark:bg-black/20 text-[#1D1D1F] dark:text-white' : 'bg-black/[0.04] dark:bg-white/[0.08]'
            }`}>
              {deals.length}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('future_tasks')}
            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 active:scale-[0.97] ${
              activeFilter === 'future_tasks'
                ? 'bg-white text-[#34C759] dark:bg-[#1E2536] dark:text-emerald-400 font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]'
                : 'text-[#86868B] dark:text-slate-400 hover:text-[#34C759] dark:hover:text-emerald-400 hover:bg-[#34C759]/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#34C759] shadow-[0_0_6px_rgba(52,199,89,0.8)]" />
            <span>З задачами</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              activeFilter === 'future_tasks' ? 'bg-[#34C759]/15 text-[#34C759]' : 'bg-[#34C759]/10 text-[#34C759]'
            }`}>
              {futureTaskCount}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('no_tasks')}
            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 active:scale-[0.97] ${
              activeFilter === 'no_tasks'
                ? 'bg-white text-[#FF9500] dark:bg-[#1E2536] dark:text-amber-400 font-bold shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]'
                : 'text-[#86868B] dark:text-slate-400 hover:text-[#FF9500] dark:hover:text-amber-400 hover:bg-[#FF9500]/10'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#FF9500] flex-shrink-0" />
            <span>Без задач</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              activeFilter === 'no_tasks' ? 'bg-[#FF9500]/15 text-[#FF9500]' : 'bg-[#FF9500]/10 text-[#FF9500]'
            }`}>
              {noTaskCount}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('overdue')}
            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 active:scale-[0.97] ${
              activeFilter === 'overdue'
                ? 'bg-white text-[#FF3B30] dark:bg-[#1E2536] dark:text-rose-400 font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]'
                : 'text-[#86868B] dark:text-slate-400 hover:text-[#FF3B30] dark:hover:text-rose-400 hover:bg-[#FF3B30]/10'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-[#FF3B30] flex-shrink-0 animate-pulse" />
            <span>Прострочені</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              activeFilter === 'overdue' ? 'bg-[#FF3B30]/15 text-[#FF3B30]' : 'bg-[#FF3B30]/10 text-[#FF3B30]'
            }`}>
              {overdueCount}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('my_deals')}
            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 active:scale-[0.97] ${
              activeFilter === 'my_deals'
                ? 'bg-white text-[#5856D6] dark:bg-[#1E2536] dark:text-indigo-400 font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]'
                : 'text-[#86868B] dark:text-slate-400 hover:text-[#5856D6] dark:hover:text-indigo-400 hover:bg-[#5856D6]/10'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Мої угоди</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeFilter === 'my_deals' ? 'bg-[#5856D6]/15 text-[#5856D6]' : 'bg-[#5856D6]/10 text-[#5856D6]'
            }`}>
              {myDealsCount}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('deferred')}
            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 active:scale-[0.97] ${
              activeFilter === 'deferred'
                ? 'bg-white text-[#AF52DE] dark:bg-[#1E2536] dark:text-purple-400 font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]'
                : 'text-[#86868B] dark:text-slate-400 hover:text-[#AF52DE] dark:hover:text-purple-400 hover:bg-[#AF52DE]/10'
            }`}
          >
            <span className="text-[11px]">⏸️</span>
            <span>Відкладений попит</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              activeFilter === 'deferred' ? 'bg-[#AF52DE]/15 text-[#AF52DE]' : 'bg-[#AF52DE]/10 text-[#AF52DE]'
            }`}>
              {deferredCount}
            </span>
          </button>
        </div>

        {/* Apple Capsule Pipeline Selector & Action Buttons */}
        <div className="flex items-center gap-2">
          {pipelines && pipelines.length > 1 && onSelectPipeline && (
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/90 dark:bg-[#090e1a]/90 border border-black/[0.06] dark:border-white/[0.08] rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <span className="text-[11px] text-[#86868B] font-semibold hidden md:inline">Воронка:</span>
              <select
                value={pipeline?.id}
                onChange={(e) => onSelectPipeline(e.target.value)}
                className="bg-transparent text-xs font-semibold text-[#0071E3] dark:text-blue-400 focus:outline-none cursor-pointer"
              >
                {pipelines.map(p => (
                  <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900 text-[#1D1D1F] dark:text-white font-medium">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setIsDuplicatesModalOpen(true)}
            className="px-3.5 py-1.5 bg-white hover:bg-[#FAFAFB] dark:bg-[#090e1a]/80 dark:hover:bg-slate-800 text-[#1D1D1F] dark:text-slate-200 hover:text-amber-500 dark:hover:text-amber-400 rounded-full text-xs font-medium flex items-center gap-1.5 transition border border-black/[0.06] dark:border-white/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:scale-[0.97]"
            title="Пошук та об'єднання дублів за номерами телефонів"
          >
            <Copy className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.75} />
            <span className="hidden sm:inline">Пошук дублів</span>
          </button>

          <button
            onClick={() => setIsArchiveOpen(true)}
            className="px-3.5 py-1.5 bg-white hover:bg-[#FAFAFB] dark:bg-[#090e1a]/80 dark:hover:bg-slate-800 text-[#1D1D1F] dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 rounded-full text-xs font-medium flex items-center gap-1.5 transition border border-black/[0.06] dark:border-white/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:scale-[0.97]"
            title="Кошик та безпечне відновлення угод (30 днів)"
          >
            <Archive className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.75} />
            <span className="hidden sm:inline">Кошик / Архів</span>
          </button>

          <button
            onClick={() => setIsAnalyticsOpen(true)}
            className="px-3.5 py-1.5 bg-white hover:bg-[#FAFAFB] dark:bg-[#090e1a]/80 dark:hover:bg-slate-800 text-[#1D1D1F] dark:text-slate-200 hover:text-[#0071E3] dark:hover:text-white rounded-full text-xs font-medium flex items-center gap-1.5 transition border border-black/[0.06] dark:border-white/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:scale-[0.97]"
            title="Аналітика та конверсія воронки"
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#0071E3]" strokeWidth={1.75} />
            <span className="hidden sm:inline">Аналітика воронки</span>
          </button>

          <button
            onClick={() => {
              if (isSelectionMode && selectedDealIds.size === 0) {
                setIsSelectionMode(false);
              } else if (isSelectionMode) {
                handleClearSelection();
              } else {
                setIsSelectionMode(true);
              }
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition border shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:scale-[0.97] ${
              isSelectionMode || selectedDealIds.size > 0
                ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-[0_0_12px_rgba(0,113,227,0.35)]'
                : 'bg-white hover:bg-[#FAFAFB] dark:bg-[#090e1a]/80 dark:hover:bg-slate-800 text-[#1D1D1F] dark:text-slate-200 border-black/[0.06] dark:border-white/[0.08]'
            }`}
            title="Масові дії з лідами (видалення, переміщення, призначення)"
          >
            <CheckSquare className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span className="hidden sm:inline">
              {selectedDealIds.size > 0 ? `Вибрано: ${selectedDealIds.size}` : isSelectionMode ? 'Режим вибору' : 'Масові дії'}
            </span>
          </button>

          <button
            onClick={handleExportDeals}
            className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-medium flex items-center gap-1.5 transition border border-emerald-500/20 shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:scale-[0.97]"
            title="Експорт поточних угод у форматі CSV (Excel)"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={2} />
            <span className="hidden sm:inline">Експорт в Excel</span>
          </button>

          {openCreateDeal && (
            <button
              onClick={() => openCreateDeal()}
              className="px-4 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full text-xs font-medium flex items-center gap-1.5 transition shadow-[0_2px_6px_rgba(0,113,227,0.25)] active:scale-[0.97] whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              <span>+ Нова угода</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Sticky Stage Quick-Jump Bar (1-Tap stage navigation on smartphone) */}
      <div className="md:hidden flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1.5 px-2 bg-slate-950/40 backdrop-blur-xl border-b border-white/10 flex-shrink-0 z-20">
        {stagesList.map((stage) => {
          const stageDealsCount = (filteredDeals || []).filter((d) => d && d.stageId === stage.id).length;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => {
                const el = document.getElementById(`kanban-stage-${stage.id}`);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 transition border border-white/10 flex-shrink-0 text-xs text-slate-200"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0 shadow-sm"
                style={{ backgroundColor: stage.color || '#0071E3' }}
              />
              <span className="font-semibold whitespace-nowrap">{stage.name}</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300">
                {stageDealsCount}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth touch-pan-x">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 h-full min-w-max pb-2 px-1">
            {stagesList.map((stage) => {
              const stageDeals = (filteredDeals || []).filter((d) => d && d.stageId === stage.id);
              const totalStageBudget = stageDeals.reduce((sum, d) => sum + (Number(d.budget) || 0), 0);

              return (
                <div
                  key={stage.id}
                  id={`kanban-stage-${stage.id}`}
                  className="w-[85vw] max-w-xs sm:w-80 snap-center flex-shrink-0 flex flex-col bg-white/75 dark:bg-[#0e1424]/80 border border-black/[0.06] dark:border-white/[0.08] rounded-3xl overflow-hidden backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.02)]"
                >
                  {/* Column Header */}
                  <div className="p-3.5 border-b border-black/[0.05] dark:border-white/[0.06] bg-white/80 dark:bg-[#0e1424]/90 flex items-center justify-between flex-shrink-0 backdrop-blur-md">
                    <div className="flex items-center gap-2 min-w-0">
                      {isSelectionMode && stageDeals.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleToggleSelectStage(stage.id)}
                          className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all flex-shrink-0 active:scale-90 ${
                            stageDeals.every(d => selectedDealIds.has(d.id))
                              ? 'bg-[#0071E3] border-[#0071E3] text-white shadow-sm ring-2 ring-[#0071E3]/30'
                              : stageDeals.some(d => selectedDealIds.has(d.id))
                              ? 'bg-[#0071E3]/20 border-[#0071E3] text-[#0071E3]'
                              : 'bg-white/80 dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                          }`}
                          title={stageDeals.every(d => selectedDealIds.has(d.id)) ? "Зняти виділення з колонки" : "Вибрати всі угоди в колонці"}
                        >
                          {stageDeals.every(d => selectedDealIds.has(d.id)) ? (
                            <Check className="w-3 h-3 stroke-[3]" />
                          ) : stageDeals.some(d => selectedDealIds.has(d.id)) ? (
                            <div className="w-2 h-0.5 bg-[#0071E3] rounded" />
                          ) : null}
                        </button>
                      )}
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: stage.color || '#0071E3' }}
                      />
                      <h3 className="font-semibold text-xs text-[#1D1D1F] dark:text-slate-100 tracking-tight truncate max-w-[150px]">
                        {stage.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.08] text-[#86868B] dark:text-slate-300 text-[10px] font-mono font-medium">
                        {stageDeals.length}
                      </span>
                    </div>

                    <span className="text-[11px] font-semibold font-mono text-[#34C759] dark:text-emerald-400 bg-[#34C759]/10 px-2.5 py-0.5 rounded-full border border-[#34C759]/20 shadow-[0_1px_2px_rgba(52,199,89,0.08)]">
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
                          snapshot.isDraggingOver ? 'bg-[#0071E3]/5 ring-1 ring-[#0071E3]/20 rounded-2xl' : ''
                        }`}
                      >
                        {stageDeals.map((deal, index) => (
                          <Draggable key={deal.id} draggableId={deal.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={snapshot.isDragging ? 'rotate-1 scale-[1.03] shadow-2xl ring-2 ring-[#0071E3]/40 z-50 rounded-2xl' : ''}
                              >
                                <DealCard
                                  deal={deal}
                                  onClick={() => onOpenDeal(deal.id)}
                                  stageColor={stage.color || '#0071E3'}
                                  stages={stagesList}
                                  onMoveStage={handleMoveDealStage}
                                  onDealUpdated={(updated) => setDeals(prev => prev.map(d => d.id === updated.id ? { ...d, ...updated } : d))}
                                  isSelected={selectedDealIds.has(deal.id)}
                                  onToggleSelect={handleToggleSelectDeal}
                                  isSelectionMode={isSelectionMode || selectedDealIds.size > 0}
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
                    <div className="p-2.5 border-t border-black/[0.05] dark:border-white/[0.06] bg-white/40 dark:bg-[#0e1424]/40">
                      <button
                        onClick={() => openCreateDeal(stage.id)}
                        className="w-full py-2 text-[#86868B] hover:text-[#1D1D1F] dark:text-slate-400 dark:hover:text-white hover:bg-white/90 dark:hover:bg-white/[0.05] rounded-2xl text-xs font-medium flex items-center justify-center gap-1.5 transition border border-dashed border-black/[0.12] dark:border-white/[0.12] hover:border-[#0071E3]/40 active:scale-[0.98]"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#0071E3]" strokeWidth={2} />
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

      {/* Pause / Delayed Demand Modal */}
      {pendingPauseDeal && (
        <PauseDealModal
          dealTitle={pendingPauseDeal.title}
          onClose={() => setPendingPauseDeal(null)}
          onConfirm={handleConfirmPause}
        />
      )}

      {/* Analytics & Conversion Funnel Dashboard Modal */}
      <AnalyticsDashboardModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        deals={deals}
        pipeline={pipeline}
      />

      {/* 30-Day Recovery Archive / Recycle Bin Modal */}
      {isArchiveOpen && (
        <ArchivedDealsModal
          onClose={() => setIsArchiveOpen(false)}
          onDealRestored={(restoredDeal) => {
            setDeals((prev) => [restoredDeal, ...prev]);
            fetchDeals();
          }}
        />
      )}

      {/* Duplicate Deals Scanner & Merger Modal */}
      {isDuplicatesModalOpen && (
        <DuplicateDealsScannerModal
          onClose={() => {
            setIsDuplicatesModalOpen(false);
            fetchDeals();
          }}
          onOpenDeal={onOpenDeal}
        />
      )}

      {/* Floating Bulk Action Bar (Glassmorphic Luxury Dock) */}
      {selectedDealIds.size > 0 && (
        <div className="fixed bottom-6 inset-x-0 z-50 flex justify-center px-4 pointer-events-none animate-in slide-in-from-bottom-6 fade-in duration-200">
          <div className="pointer-events-auto bg-[#0a1020]/95 border border-blue-500/35 backdrop-blur-2xl px-4 sm:px-6 py-3 rounded-2xl sm:rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_20px_rgba(0,113,227,0.2)] flex flex-wrap items-center justify-between gap-3 text-white max-w-4xl w-full ring-1 ring-white/10">
            {/* Left: Selection Counter and Select All / Deselect */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-xl">
                <Check className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-blue-200">
                  Вибрано: <span className="font-mono text-white text-sm">{selectedDealIds.size}</span>
                </span>
              </div>

              <button
                type="button"
                onClick={selectedDealIds.size === filteredDeals.length ? handleClearSelection : handleSelectAll}
                className="text-xs text-slate-300 hover:text-white underline underline-offset-4 decoration-slate-500 hover:decoration-white transition"
              >
                {selectedDealIds.size === filteredDeals.length ? 'Зняти всі' : `Вибрати всі (${filteredDeals.length})`}
              </button>
            </div>

            {/* Right: Actions (Change Stage, Change Manager, Delete) */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Change Stage Dropdown */}
              <div className="relative">
                <select
                  value={bulkStageId}
                  disabled={isBulkExecuting}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBulkStageId(val);
                    if (val) handleBulkChangeStage(val);
                  }}
                  className="bg-slate-800/90 border border-slate-700 hover:border-slate-600 text-xs font-semibold text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer disabled:opacity-50"
                >
                  <option value="">📁 Перемістити на етап...</option>
                  {stagesList.map(stg => (
                    <option key={stg.id} value={stg.id} className="bg-slate-900 text-white">
                      {stg.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Change Responsible Dropdown */}
              {users && users.length > 0 && (
                <div className="relative">
                  <select
                    value={bulkResponsibleId}
                    disabled={isBulkExecuting}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBulkResponsibleId(val);
                      if (val) handleBulkChangeResponsible(val);
                    }}
                    className="bg-slate-800/90 border border-slate-700 hover:border-slate-600 text-xs font-semibold text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer disabled:opacity-50"
                  >
                    <option value="">👤 Призначити менеджера...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Mass Delete to Recycle Bin */}
              <button
                type="button"
                disabled={isBulkExecuting}
                onClick={handleBulkDelete}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-rose-600/30 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                title="Перемістити вибрані угоди до кошика з 30-денним вікном відновлення"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Видалити в кошик</span>
              </button>

              {/* Cancel / Close */}
              <button
                type="button"
                onClick={handleClearSelection}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition active:scale-95"
                title="Скасувати виділення"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
