import React, { useState, useEffect } from 'react';
import { 
  X, 
  QrCode, 
  RefreshCw, 
  CheckCircle2, 
  Smartphone, 
  ShieldCheck, 
  Zap,
  Phone,
  MessageSquare,
  AlertCircle,
  Key,
  ArrowRight,
  Send
} from 'lucide-react';
import { api, socket } from '../../services/api';

interface QRConnectModalProps {
  initialChannel?: 'whatsapp' | 'telegram';
  onClose: () => void;
}

export const QRConnectModal: React.FC<QRConnectModalProps> = ({
  initialChannel = 'whatsapp',
  onClose
}) => {
  const [activeChannel, setActiveChannel] = useState<'whatsapp' | 'telegram'>(initialChannel);
  
  // Real Messenger states from backend
  const [waStatus, setWaStatus] = useState<any>({
    status: 'qr_ready',
    phone: null,
    accountName: 'WhatsApp Business'
  });
  const [tgStatus, setTgStatus] = useState<any>({
    status: 'disconnected',
    phone: null,
    accountName: 'Telegram Користувач'
  });

  const [qrImage, setQrImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Telegram User Account Login Form (Phone -> 5-digit SMS/Telegram code)
  const [tgPhone, setTgPhone] = useState('+380734277174');
  const [tgCode, setTgCode] = useState('');
  const [tgStep, setTgStep] = useState<'enter_phone' | 'enter_code'>('enter_phone');

  const fetchStatus = async () => {
    try {
      const res = await api.get('/chat/status');
      if (res.data?.whatsapp) {
        setWaStatus(res.data.whatsapp);
        if (activeChannel === 'whatsapp' && res.data.whatsapp.qrCodeData) {
          setQrImage(res.data.whatsapp.qrCodeData);
        }
      }
      if (res.data?.telegram) {
        setTgStatus(res.data.telegram);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const fetchWhatsAppQR = async () => {
    setLoading(true);
    try {
      const res = await api.get('/chat/whatsapp/qr');
      if (res.data?.qrCodeData) {
        setQrImage(res.data.qrCodeData);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    if (activeChannel === 'whatsapp') {
      fetchWhatsAppQR();
    }

    const handleStatusUpdate = (data: any) => {
      if (data.channel === 'whatsapp') {
        setWaStatus((prev: any) => ({ ...prev, ...data }));
        if (data.qrCodeData) setQrImage(data.qrCodeData);
      } else if (data.channel === 'telegram') {
        setTgStatus((prev: any) => ({ ...prev, ...data }));
      }
    };

    socket.on('messenger_status', handleStatusUpdate);
    return () => {
      socket.off('messenger_status', handleStatusUpdate);
    };
  }, [activeChannel]);

  // Telegram Step 1: Send Code to Phone
  const handleTgSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);
    setLoading(true);
    try {
      const res = await api.post('/chat/telegram/send-code', { phone: tgPhone });
      setTgStep('enter_code');
      setSuccessNotice(`✅ Код надіслано в додаток Telegram на номер ${tgPhone}`);
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      setErrorNotice(err?.response?.data?.error || 'Помилка надсилання коду. Перевірте номер.');
    } finally {
      setLoading(false);
    }
  };

  // Telegram Step 2: Sign In with 5-digit Code
  const handleTgVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);
    setLoading(true);
    try {
      const res = await api.post('/chat/telegram/verify-code', { code: tgCode });
      setTgStatus({ status: 'connected', phone: tgPhone, accountName: `Telegram (${tgPhone})` });
      setSuccessNotice('🎉 Корпоративний Telegram успішно підключено!');
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      setErrorNotice(err?.response?.data?.error || 'Невірний код. Спробуйте ще раз.');
    } finally {
      setLoading(false);
    }
  };

  // Disconnect
  const handleDisconnect = async (channel: 'whatsapp' | 'telegram') => {
    if (!window.confirm(`Відключити ${channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'}?`)) return;
    try {
      await api.post(`/chat/${channel}/disconnect`);
      if (channel === 'whatsapp') {
        setWaStatus({ status: 'disconnected', phone: null });
        fetchWhatsAppQR();
      } else {
        setTgStatus({ status: 'disconnected', phone: null });
        setTgStep('enter_phone');
      }
    } catch (e) {}
  };

  const isWaConnected = waStatus.status === 'connected';
  const isTgConnected = tgStatus.status === 'connected';
  const isCurrentConnected = activeChannel === 'whatsapp' ? isWaConnected : isTgConnected;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none font-['Inter',sans-serif]">
      <div className="bg-[#0f1422] border border-slate-700/80 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-[#131929]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Корпоративні месенджери (Користувацькі акаунти)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full">REAL SYNC</span>
              </h2>
              <p className="text-xs text-slate-400">
                Пряме спілкування з клієнтами та кандидатами з ваших номерів
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Channel Tab Bar */}
        <div className="p-4 border-b border-slate-800 bg-[#0c101c] flex gap-2">
          <button
            onClick={() => setActiveChannel('whatsapp')}
            className={`flex-1 py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition ${
              activeChannel === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>WhatsApp (QR Web)</span>
            {isWaConnected && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
          </button>

          <button
            onClick={() => setActiveChannel('telegram')}
            className={`flex-1 py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition ${
              activeChannel === 'telegram'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Telegram (Особистий акаунт)</span>
            {isTgConnected && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
          </button>
        </div>

        {errorNotice && (
          <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorNotice}</span>
          </div>
        )}

        {successNotice && (
          <div className="mx-6 mt-4 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-semibold text-center animate-in fade-in">
            {successNotice}
          </div>
        )}

        {/* Body */}
        <div className="p-6 text-center space-y-5">
          {isCurrentConnected ? (
            /* Connected View */
            <div className="space-y-4 py-3">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {activeChannel === 'whatsapp' ? 'WhatsApp підключено' : 'Telegram підключено'}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Активний акаунт: <span className="text-emerald-400 font-bold">{activeChannel === 'whatsapp' ? (waStatus.phone || 'Корпоративний номер') : (tgStatus.phone || tgPhone)}</span>
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-2">
                  Ви можете писати кандидатам і роботодавцям напряму з карток угод у CRM.
                </p>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => handleDisconnect(activeChannel)}
                  className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition"
                >
                  Відключити номер
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/30"
                >
                  Готово
                </button>
              </div>
            </div>
          ) : activeChannel === 'whatsapp' ? (
            /* WhatsApp Real Baileys QR View */
            <div className="space-y-4">
              <div className="inline-block p-3.5 bg-white rounded-3xl shadow-2xl border-4 border-slate-700">
                {qrImage ? (
                  <img src={qrImage} alt="WhatsApp QR" className="w-52 h-52 object-contain rounded-xl" />
                ) : (
                  <div className="w-52 h-52 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                    <span>Генерація Meta QR...</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 max-w-md mx-auto text-left text-xs text-slate-300 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold text-[11px] flex-shrink-0">1</span>
                  <span>Відкрийте <b>WhatsApp</b> на вашому телефоні</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold text-[11px] flex-shrink-0">2</span>
                  <span>Натисніть <b>Налаштування (або 3 крапки) ➔ Пов'язані пристрої ➔ Прив'язати пристрій</b></span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold text-[11px] flex-shrink-0">3</span>
                  <span>Наведіть камеру на QR-код вище для підключення</span>
                </div>
              </div>

              <button
                onClick={fetchWhatsAppQR}
                disabled={loading}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 mx-auto transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Оновити QR-код</span>
              </button>
            </div>
          ) : (
            /* Telegram User Account Phone & Code View */
            <div className="space-y-4 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto border border-sky-500/20 shadow-lg shadow-sky-500/10">
                <Smartphone className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-base font-bold text-white">Вхід у корпоративний Telegram</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Підключення вашого робочого акаунта для відправки повідомлень кандидатам
                </p>
              </div>

              {tgStep === 'enter_phone' ? (
                <form onSubmit={handleTgSendCode} className="space-y-3 text-xs text-left">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Номер телефону Telegram</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        placeholder="+380 73 427 71 74"
                        value={tgPhone}
                        onChange={(e) => setTgPhone(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-sky-600/30"
                  >
                    <span>{loading ? 'Надсилання коду...' : 'Отримати код у Telegram'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleTgVerifyCode} className="space-y-3 text-xs text-left">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">
                      5-значний код із додатку Telegram на номер {tgPhone}
                    </label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="12345"
                        value={tgCode}
                        onChange={(e) => setTgCode(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-center text-lg tracking-widest text-white focus:outline-none focus:border-sky-500"
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/30"
                  >
                    <span>{loading ? 'Підключення...' : 'Увійти в Telegram'}</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setTgStep('enter_phone')}
                    className="w-full text-center text-[11px] text-slate-400 hover:text-white pt-1"
                  >
                    ← Змінити номер телефону
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
