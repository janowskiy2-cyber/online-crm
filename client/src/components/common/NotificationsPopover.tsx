import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Briefcase, 
  Users, 
  Check, 
  X, 
  ArrowRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isWebPushSupported, getWebPushPermission, requestWebPushPermission } from '../../utils/webPush';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'deal' | 'task' | 'system' | 'lead';
  time: string;
  isRead: boolean;
  link?: string;
}

interface NotificationsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDeal?: (dealId: string) => void;
}

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({
  isOpen,
  onClose,
  onOpenDeal
}) => {
  const navigate = useNavigate();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(getWebPushPermission());

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      title: 'Digital Pipeline (Робот)',
      message: 'Угоду успішно переведено на етап узгодження. Створено контрольне завдання.',
      type: 'deal',
      time: '2 хв тому',
      isRead: false,
      link: '/deals'
    },
    {
      id: 'notif-2',
      title: 'Контроль дедлайнів B2B',
      message: 'Перевірте актуальні завдання на сьогодні: 3 завдання очікують зв\'язку.',
      type: 'task',
      time: '15 хв тому',
      isRead: false,
      link: '/tasks'
    },
    {
      id: 'notif-3',
      title: 'Капсула робочого дня',
      message: 'Зміна активна. Система фіксує продуктивність та комунікації в CRM.',
      type: 'system',
      time: '1 год тому',
      isRead: true
    }
  ]);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleClickItem = (item: NotificationItem) => {
    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));
    if (item.link) {
      navigate(item.link);
    }
    onClose();
  };

  return (
    <div 
      ref={popoverRef}
      className="absolute right-0 top-12 w-80 sm:w-96 bg-slate-900/95 border border-white/15 rounded-2xl shadow-2xl backdrop-blur-2xl p-0 z-50 animate-in fade-in zoom-in-95 font-['Inter',sans-serif] overflow-hidden"
    >
      {/* Header */}
      <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.04]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Сповіщення системи</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-mono font-black">
                  {unreadCount}
                </span>
              )}
            </h4>
            <p className="text-[10px] text-slate-400">Події воронок, завдань та комунікацій</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold px-2 py-1 rounded-lg hover:bg-white/5 transition"
              title="Позначити всі як прочитані"
            >
              Прочитано
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Web Push Native Activation Banner */}
      {pushPermission !== 'granted' && isWebPushSupported() && (
        <div className="p-2.5 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-b border-blue-500/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Bell className="w-3.5 h-3.5 text-blue-400 shrink-0 animate-bounce" />
            <span className="text-[10px] text-blue-200 truncate font-medium">
              Отримувати Push при згорнутому браузері
            </span>
          </div>
          <button
            onClick={async () => {
              const ok = await requestWebPushPermission();
              if (ok) setPushPermission('granted');
            }}
            className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[10px] font-bold transition shrink-0"
          >
            Увімкнути
          </button>
        </div>
      )}

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.06] text-xs">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400/60 mb-2" />
            <p className="font-semibold text-white">Все спокійно!</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Нових невідкладних сповіщень немає</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleClickItem(n)}
              className={`p-3 transition-colors cursor-pointer hover:bg-white/[0.06] flex items-start gap-2.5 ${
                !n.isRead ? 'bg-blue-500/[0.07]' : ''
              }`}
            >
              <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                !n.isRead ? 'bg-blue-400 ring-2 ring-blue-400/20' : 'bg-slate-600'
              }`} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="font-semibold text-slate-200 text-xs truncate">
                    {n.title}
                  </span>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap font-mono">
                    {n.time}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                  {n.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-white/10 bg-black/20 flex items-center justify-between text-[11px] text-slate-400 px-3">
        <button
          onClick={() => { navigate('/deals'); onClose(); }}
          className="hover:text-white transition flex items-center gap-1 font-semibold text-blue-400 hover:underline"
        >
          <span>Перейти до угод</span>
          <ArrowRight className="w-3 h-3" />
        </button>

        <button
          onClick={() => { navigate('/tasks'); onClose(); }}
          className="hover:text-white transition font-medium"
        >
          Всі завдання
        </button>
      </div>
    </div>
  );
};
