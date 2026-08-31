import React, { useState, useEffect } from 'react';
import { 
  X, 
  QrCode, 
  RefreshCw, 
  CheckCircle2, 
  Smartphone, 
  ShieldCheck, 
  Zap,
  Phone
} from 'lucide-react';
import { api, socket } from '../../services/api';
import { MessengerStatus } from '../../types';

interface QRConnectModalProps {
  initialChannel?: 'whatsapp' | 'telegram';
  onClose: () => void;
}

export const QRConnectModal: React.FC<QRConnectModalProps> = ({
  initialChannel = 'whatsapp',
  onClose
}) => {
  const [activeChannel, setActiveChannel] = useState<'whatsapp' | 'telegram'>(initialChannel);
  const [waStatus, setWaStatus] = useState<MessengerStatus | null>(null);
  const [tgStatus, setTgStatus] = useState<MessengerStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/chat/status');
      setWaStatus(res.data.whatsapp);
      setTgStatus(res.data.telegram);
    } catch (e) {
      console.error('Failed to load messenger status:', e);
    }
  };

  useEffect(() => {
    fetchStatus();

    const handleStatusUpdate = (data: any) => {
      if (data.channel === 'whatsapp') {
        setWaStatus(prev => ({ ...prev, ...data }));
      } else if (data.channel === 'telegram') {
        setTgStatus(prev => ({ ...prev, ...data }));
      }
    };

    socket.on('messenger_status', handleStatusUpdate);
    return () => {
      socket.off('messenger_status', handleStatusUpdate);
    };
  }, []);

  const handleRegenerateQR = async () => {
    setLoading(true);
    try {
      if (activeChannel === 'whatsapp') {
        const res = await api.post('/chat/whatsapp/qr');
        setWaStatus(res.data);
      } else {
        const res = await api.post('/chat/telegram/qr');
        setTgStatus(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateConnect = async () => {
    setLoading(true);
    try {
      if (activeChannel === 'whatsapp') {
        await api.post('/chat/whatsapp/connect-sim', {
          phone: '+7 (999) 777-22-33',
          name: 'WhatsApp Корпоративный (amoCRM)'
        });
      } else {
        await api.post('/chat/telegram/connect-sim', {
          username: '@crm_sales_bot',
          name: 'Telegram Корпоративный Бот'
        });
      }
      fetchStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Отключить мессенджер от CRM?')) return;
    try {
      await api.post(`/chat/disconnect/${activeChannel}`);
      fetchStatus();
    } catch (e) {
      console.error(e);
    }
  };

  const currentStatus = activeChannel === 'whatsapp' ? waStatus : tgStatus;
  const isConnected = currentStatus?.status === 'connected';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-[#141b2d]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Подключение мессенджеров по QR-коду
              </h2>
              <p className="text-xs text-slate-400">
                amoCRM Multi-Device Messenger Engine
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Channel Tab Bar */}
        <div className="p-4 border-b border-slate-800 bg-[#0f1523] flex gap-2">
          <button
            onClick={() => setActiveChannel('whatsapp')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
              activeChannel === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>WhatsApp Business</span>
            {waStatus?.status === 'connected' && (
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            )}
          </button>

          <button
            onClick={() => setActiveChannel('telegram')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
              activeChannel === 'telegram'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Telegram Web / Bot</span>
            {tgStatus?.status === 'connected' && (
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            )}
          </button>
        </div>

        {/* QR Code and Status Area */}
        <div className="p-8 text-center space-y-6">
          {isConnected ? (
            <div className="space-y-4 py-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {activeChannel === 'whatsapp' ? 'WhatsApp успешно подключен' : 'Telegram успешно подключен'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Аккаунт: <span className="text-emerald-400 font-semibold">{currentStatus?.accountName || currentStatus?.phone}</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Все входящие и исходящие сообщения синхронизируются в реальном времени с карточками сделок.
                </p>
              </div>

              <button
                onClick={handleDisconnect}
                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition"
              >
                Отключить аккаунт
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* QR Image Box */}
              <div className="inline-block p-4 bg-white rounded-2xl shadow-xl border-4 border-slate-700">
                {currentStatus?.qrCodeData ? (
                  <img
                    src={currentStatus.qrCodeData}
                    alt="QR Code"
                    className="w-56 h-56 object-contain"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                    Генерация QR-кода...
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="space-y-2 max-w-sm mx-auto text-left text-xs text-slate-300">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-[11px] flex-shrink-0">1</span>
                  <span>Откройте <b>{activeChannel === 'whatsapp' ? 'WhatsApp' : 'Telegram'}</b> на вашем смартфоне</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-[11px] flex-shrink-0">2</span>
                  <span>
                    {activeChannel === 'whatsapp'
                      ? 'Перейдите в Настройки → Связанные устройства → Привязка устройства'
                      : 'Перейдите в Настройки → Устройства → Подключить устройство (или отсканируйте камерой)'}
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-[11px] flex-shrink-0">3</span>
                  <span>Наведите камеру на QR-код выше для автоматической авторизации</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleRegenerateQR}
                  disabled={loading}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Обновить QR</span>
                </button>

                {/* Instant Simulation Button for Quick Demo */}
                <button
                  onClick={handleSimulateConnect}
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-md shadow-emerald-600/30"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Симуляция сканирования QR</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
