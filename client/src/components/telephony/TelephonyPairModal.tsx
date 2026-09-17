import React, { useState, useEffect } from 'react';
import { X, Smartphone, QrCode, CheckCircle2, ShieldCheck, RefreshCw, PhoneCall, Download } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface TelephonyPairModalProps {
  onClose: () => void;
}

export const TelephonyPairModal: React.FC<TelephonyPairModalProps> = ({ onClose }) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'download' | 'pair'>('download');
  const [loading, setLoading] = useState(true);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const DIRECT_APK_URL = '/OnlineCRM-Gateway.apk';
  const GITHUB_APK_URL = 'https://github.com/janowskiy2-cyber/online-crm/releases/download/gateway-latest/OnlineCRM-Gateway.apk';
  const FALLBACK_QR = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent('https://online-crm-alpha.vercel.app/OnlineCRM-Gateway.apk')}`;

  const [downloadQrCode, setDownloadQrCode] = useState<string | null>(FALLBACK_QR);
  const [downloadUrl, setDownloadUrl] = useState<string>(DIRECT_APK_URL);
  const [deviceStatus, setDeviceStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPairingInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const userId = currentUser?.id || 'usr-admin';
      
      const [pairRes, downloadRes, statusRes] = await Promise.all([
        api.get(`/telephony/qr-pair/${userId}`).catch(() => null),
        api.get(`/telephony/qr-download`).catch(() => null),
        api.get('/telephony/status').catch(() => null)
      ]);

      if (pairRes?.data?.qrCode) {
        setQrCodeData(pairRes.data.qrCode);
      }
      if (downloadRes?.data?.qrCode) {
        setDownloadQrCode(downloadRes.data.qrCode);
      }
      if (downloadRes?.data?.downloadUrl) {
        setDownloadUrl(downloadRes.data.downloadUrl);
      }
      if (statusRes?.data) {
        setDeviceStatus(statusRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load telephony pair info:', err);
      setError('Не вдалося завантажити інформацію про шлюз');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPairingInfo();
  }, [currentUser?.id]);

  const connectedDevices = (deviceStatus?.devices || []).filter(
    (d: any) => d.userId === currentUser?.id || currentUser?.role === 'super_admin'
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-['Inter',sans-serif] animate-in fade-in">
      <div className="relative overflow-hidden bg-[#0a0f1d] border border-blue-500/30 rounded-3xl w-full max-w-lg shadow-[0_0_35px_rgba(59,130,246,0.25)] backdrop-blur-2xl text-slate-100">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />

        {/* Header */}
        <div className="h-16 px-6 border-b border-white/[0.08] flex items-center justify-between bg-blue-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.3)]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <span>Android GSM SIM-Шлюз</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  v2.0 GATEWAY
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Синхронізація викликів, запис та спливаюча картка клієнта</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl transition hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/[0.08] bg-black/20 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('download')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'download'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>1. Завантажити додаток (.apk)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pair')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'pair'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>2. Авторизація та статус</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {activeTab === 'download' ? (
            <>
              {/* Download Action Box */}
              <div className="p-4 bg-gradient-to-r from-blue-900/30 via-indigo-900/30 to-purple-900/30 border border-blue-500/40 rounded-2xl flex items-center justify-between gap-3 shadow-lg">
                <div>
                  <h4 className="font-extrabold text-white text-sm">OnlineCRM Gateway (.apk)</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Підписаний релізний APK для швидкого встановлення на будь-який Android
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <a
                    href={downloadUrl}
                    download="OnlineCRM-Gateway.apk"
                    className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg whitespace-nowrap active:scale-95 cursor-pointer"
                    title="Пряме завантаження OnlineCRM-Gateway.apk"
                  >
                    <Download className="w-4 h-4" />
                    <span>Скачати .apk</span>
                  </a>
                  <a
                    href={GITHUB_APK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2.5 bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white rounded-xl font-medium text-[11px] flex items-center justify-center transition whitespace-nowrap"
                    title="Резервне пряме посилання з GitHub Releases"
                  >
                    <span>Резервне (GitHub)</span>
                  </a>
                </div>
              </div>

              {/* QR Code for direct phone camera scan */}
              <div className="flex flex-col items-center justify-center p-4 bg-[#080c16] border border-white/[0.08] rounded-2xl space-y-2.5">
                {loading ? (
                  <div className="w-40 h-40 flex items-center justify-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                  </div>
                ) : downloadQrCode ? (
                  <div className="p-2.5 bg-white rounded-2xl shadow-xl border-4 border-blue-500/30">
                    <img src={downloadQrCode} alt="Download APK QR" className="w-36 h-36 object-contain rounded-lg" />
                  </div>
                ) : null}

                <div className="text-center">
                  <span className="text-slate-200 font-bold block text-xs">
                    Наведіть камеру смартфона на цей QR-код
                  </span>
                  <span className="text-[11px] text-slate-400">
                    щоб завантажити .apk файл прямо на ваш телефон без шнурів
                  </span>
                </div>
              </div>

              {/* How it works after install */}
              <div className="space-y-1.5 p-3 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                <span className="text-[11px] font-bold text-sky-300 block mb-1">
                  ⚡ Як легко запустити після встановлення:
                </span>
                <div className="space-y-1 text-[11px] text-slate-300">
                  <p>1. Відкрийте додаток — на екрані з'являться <strong>4 кнопки дозволів</strong>.</p>
                  <p>2. Натисніть кожну кнопку (дзвінки, спливаюче вікно Caller ID, батарея, записи розмов).</p>
                  <p>3. Введіть свій <strong>Email та пароль</strong> співробітника — додаток відразу активується!</p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Active Status Badge */}
              {connectedDevices.length > 0 ? (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                      <span className="font-bold text-white block">
                        {connectedDevices[0].deviceName} • Підключено
                      </span>
                      <span className="text-[11px] text-emerald-300">
                        SIM-карта: {connectedDevices[0].simNumber || 'Активна'} ({connectedDevices[0].operator || 'GSM'})
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ONLINE
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-blue-950/30 border border-blue-500/30 rounded-2xl flex items-center gap-2.5">
                  <PhoneCall className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-white block">Смартфон очікує входу</span>
                    <span className="text-[11px] text-slate-400">
                      Увійдіть за Email/паролем або відскануйте QR-код нижче
                    </span>
                  </div>
                </div>
              )}

              {/* QR Code Container for quick login */}
              <div className="flex flex-col items-center justify-center p-4 bg-[#080c16] border border-white/[0.08] rounded-2xl space-y-2.5">
                {loading ? (
                  <div className="w-40 h-40 flex items-center justify-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                  </div>
                ) : error ? (
                  <div className="text-center py-6 text-rose-400">{error}</div>
                ) : qrCodeData ? (
                  <div className="p-2.5 bg-white rounded-2xl shadow-xl border-4 border-blue-500/30">
                    <img src={qrCodeData} alt="Telephony QR Pair" className="w-36 h-36 object-contain rounded-lg" />
                  </div>
                ) : null}

                <p className="text-[11px] text-slate-400 text-center max-w-xs">
                  Для швидкого входу без введення пароля: відскануйте цей QR-код у додатку.
                </p>
              </div>

              <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-[11px] text-slate-300">
                <span className="font-bold text-amber-300 block mb-0.5">💡 Підтримка Dual-SIM:</span>
                У налаштуваннях додатку на телефоні ви зможете обрати тільки робочу SIM-карту, щоб ваші особисті дзвінки ніколи не потрапляли в CRM.
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={fetchPairingInfo}
              className="text-slate-400 hover:text-white flex items-center gap-1.5 transition font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Оновити статус</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition shadow-md active:scale-95"
            >
              Готово
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
