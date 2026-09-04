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
  Send,
  HelpCircle,
  UserCheck,
  Lock,
  Play
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
  
  const [waStatus, setWaStatus] = useState<any>({
    status: 'qr_ready',
    phone: null,
    accountName: 'WhatsApp Business'
  });
  const [tgStatus, setTgStatus] = useState<any>({
    status: 'disconnected',
    phone: null,
    accountName: 'Telegram'
  });

  const [waQrImage, setWaQrImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Telegram Real Human User Account State
  const [tgPhone, setTgPhone] = useState('+380734277174');
  const [tgCode, setTgCode] = useState('');
  const [tgPassword2FA, setTgPassword2FA] = useState('');
  const [tgStep, setTgStep] = useState<'enter_phone' | 'enter_code'>('enter_phone');

  const fetchStatus = async () => {
    try {
      const res = await api.get('/chat/status');
      if (res.data?.whatsapp) {
        setWaStatus(res.data.whatsapp);
        if (res.data.whatsapp.qrCodeData) {
          setWaQrImage(res.data.whatsapp.qrCodeData);
        }
      }
      if (res.data?.telegram) {
        setTgStatus(res.data.telegram);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const fetchWhatsAppQR = async (force: boolean = false) => {
    setLoading(true);
    try {
      const res = await api.get(`/chat/whatsapp/qr${force ? '?force=true' : ''}`);
      if (res.data?.qrCodeData) {
        setWaQrImage(res.data.qrCodeData);
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
      fetchWhatsAppQR(false);
    }

    const handleStatusUpdate = (data: any) => {
      if (data.channel === 'whatsapp') {
        setWaStatus((prev: any) => ({ ...prev, ...data }));
        if (data.qrCodeData) setWaQrImage(data.qrCodeData);
      } else if (data.channel === 'telegram') {
        setTgStatus((prev: any) => ({ ...prev, ...data }));
      }
    };

    socket.on('messenger_status', handleStatusUpdate);

    // Auto-poll if WhatsApp is waiting for QR and not connected yet
    let pollInterval: any = null;
    if (activeChannel === 'whatsapp' && !isWaConnected) {
      pollInterval = setInterval(() => {
        if (!waQrImage) {
          fetchWhatsAppQR(false);
        }
      }, 3000);
    }

    return () => {
      socket.off('messenger_status', handleStatusUpdate);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [activeChannel, isWaConnected, waQrImage]);

  // Telegram Step 1: Send real official MTProto code to phone
  const handleTgSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);
    setLoading(true);
    try {
      await api.post('/chat/telegram/send-code', { phone: tgPhone });
      setTgStep('enter_code');
      setSuccessNotice(`✅ 5-значний код надіслано в додаток Telegram на номер ${tgPhone}`);
      setTimeout(() => setSuccessNotice(null), 6000);
    } catch (err: any) {
      setErrorNotice(err?.response?.data?.error || 'Помилка надсилання коду. Перевірте правильність номера.');
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
      const res = await api.post('/chat/telegram/verify-code', { 
        code: tgCode,
        password: tgPassword2FA || undefined
      });
      setTgStatus({ status: 'connected', phone: tgPhone, accountName: res.data.name || `Telegram (${tgPhone})` });
      setSuccessNotice('🎉 Корпоративний Telegram успішно підключено!');
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      setErrorNotice(err?.response?.data?.error || 'Невірний код або пароль 2FA. Спробуйте ще раз.');
    } finally {
      setLoading(false);
    }
  };

  // Test Inbound Lead Flow (Simulator)
  const handleSimulateLead = async (channel: 'whatsapp' | 'telegram') => {
    setIsSimulating(true);
    setErrorNotice(null);
    try {
      await api.post('/chat/simulate-incoming', {
        channel,
        senderName: channel === 'whatsapp' ? 'ТОВ "Агро-Холдинг Південь" (WA)' : 'Андрій Директор (TG)',
        phoneOrTg: channel === 'whatsapp' ? '+380734277174' : '@director_agro',
        text: 'Доброго дня! Потрібно 20 робітників на склад і фасування в Одесу. Надішліть КП 4х25% та договір.'
      });
      setSuccessNotice(`🚀 Тестовий вхідний лід (${channel.toUpperCase()}) успішно створено та розподілено в CRM! Перевірте Воронку та Месенджери.`);
      setTimeout(() => setSuccessNotice(null), 6000);
    } catch (err) {
      setErrorNotice('Помилка виконання тесту зв\'язку.');
    } finally {
      setIsSimulating(false);
    }
  };

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
                <span>Шлюз месенджерів (WhatsApp & Telegram)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full">REAL GATEWAY</span>
              </h2>
              <p className="text-xs text-slate-400">
                Прямий зв'язок з кандидатами та роботодавцями від імені компанії
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
            <span>Telegram (Особистий номер)</span>
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
                  Активний акаунт: <span className="text-emerald-400 font-bold">{activeChannel === 'whatsapp' ? (waStatus.phone || 'Корпоративний номер') : (tgStatus.accountName || tgPhone)}</span>
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-2">
                  Ви можете писати кандидатам і клієнтам напряму та надсилати файли.
                </p>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => handleSimulateLead(activeChannel)}
                  disabled={isSimulating}
                  className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isSimulating ? 'Тестування...' : '⚡ Протестувати прийом ліда'}</span>
                </button>

                <button
                  onClick={() => handleDisconnect(activeChannel)}
                  className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition"
                >
                  Відключити
                </button>
              </div>
            </div>
          ) : activeChannel === 'whatsapp' ? (
            /* WhatsApp Real Baileys QR View */
            <div className="space-y-4">
              <div className="inline-block p-3.5 bg-white rounded-3xl shadow-2xl border-4 border-slate-700">
                {waQrImage ? (
                  <img src={waQrImage} alt="WhatsApp QR" className="w-52 h-52 object-contain rounded-xl" />
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
                  <span>Відкрийте <b>WhatsApp</b> на смартфоні</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold text-[11px] flex-shrink-0">2</span>
                  <span>Натисніть <b>Налаштування ➔ Пов'язані пристрої ➔ Прив'язати пристрій</b></span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold text-[11px] flex-shrink-0">3</span>
                  <span>Наведіть камеру на QR-код вище</span>
                </div>
              </div>

              <div className="flex justify-center gap-2">
                <button
                  onClick={() => fetchWhatsAppQR(true)}
                  disabled={loading}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Оновити QR</span>
                </button>

                <button
                  onClick={() => handleSimulateLead('whatsapp')}
                  disabled={isSimulating}
                  className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>⚡ Тест прийому ліда</span>
                </button>
              </div>
            </div>
          ) : (
            /* Telegram Real Human User Phone MTProto Login */
            <div className="space-y-4 text-left max-w-md mx-auto text-xs">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto border border-sky-500/20 shadow-lg shadow-sky-500/10">
                <UserCheck className="w-6 h-6" />
              </div>

              <div className="text-center">
                <h3 className="text-base font-bold text-white">Вхід у корпоративний Telegram</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Пряме підключення до офіційного сервера Telegram
                </p>
              </div>

              {tgStep === 'enter_phone' ? (
                <form onSubmit={handleTgSendCode} className="space-y-3.5 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1.5">
                      Номер телефону Telegram
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        placeholder="+380 73 427 71 74"
                        value={tgPhone}
                        onChange={(e) => setTgPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white text-xs focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-sky-600/30"
                  >
                    <span>{loading ? 'Надсилання запиту...' : 'Отримати код у Telegram'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleSimulateLead('telegram')}
                      disabled={isSimulating}
                      className="px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5 transition"
                    >
                      <Play className="w-3 h-3" />
                      <span>⚡ Перевірити обробку ліда Telegram</span>
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleTgVerifyCode} className="space-y-3.5 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1.5">
                      5-значний код із додатку Telegram на {tgPhone}
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
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-center text-lg tracking-widest text-white font-mono focus:outline-none focus:border-sky-500"
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/30"
                  >
                    <span>{loading ? 'Авторизація...' : 'Увійти'}</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setTgStep('enter_phone')}
                    className="w-full text-center text-[11px] text-slate-400 hover:text-white pt-1"
                  >
                    ← Змінити номер
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
