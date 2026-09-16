import React, { useState, useEffect } from 'react';
import { X, Smartphone, QrCode, CheckCircle2, ShieldCheck, RefreshCw, PhoneCall, Download } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface TelephonyPairModalProps {
  onClose: () => void;
}

export const TelephonyPairModal: React.FC<TelephonyPairModalProps> = ({ onClose }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPairingInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const userId = currentUser?.id || 'usr-admin';
      const res = await api.get(`/telephony/qr-pair/${userId}`);
      if (res.data?.qrCode) {
        setQrCodeData(res.data.qrCode);
      }
      const statusRes = await api.get('/telephony/status');
      setDeviceStatus(statusRes.data);
    } catch (err: any) {
      console.error('Failed to load telephony pair info:', err);
      setError('Не вдалося згенерувати QR-код підключення');
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
                <span>Підключення SIM-карти смартфона</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  GSM GATEWAY
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Синхронізація викликів з SIM-карти та Click-to-Call</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl transition hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
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
                <span className="font-bold text-white block">Смартфон ще не підключено</span>
                <span className="text-[11px] text-slate-400">
                  Відскануйте QR-код нижче в додатку OnlineCRM Gateway для прив'язки
                </span>
              </div>
            </div>
          )}

          {/* Download APK Banner */}
          <div className="p-3.5 bg-gradient-to-r from-blue-900/30 via-indigo-900/30 to-purple-900/30 border border-blue-500/40 rounded-2xl flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 border border-blue-500/30">
                <Download className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <div className="font-bold text-white text-xs flex items-center gap-2">
                  <span>OnlineCRM Gateway для Android</span>
                  <span className="text-[10px] bg-blue-500/30 text-blue-200 px-1.5 py-0.2 rounded font-mono">v2.0 APK</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Встановіть на смартфон для підключення SIM-карти, запису та Caller ID
                </p>
              </div>
            </div>
            <a
              href="/api/telephony/download-apk"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-md whitespace-nowrap active:scale-95 flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Завантажити .apk</span>
            </a>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-4 bg-[#080c16] border border-white/[0.08] rounded-2xl space-y-3">
            {loading ? (
              <div className="w-48 h-48 flex items-center justify-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
              </div>
            ) : error ? (
              <div className="text-center py-6 text-rose-400">{error}</div>
            ) : qrCodeData ? (
              <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-blue-500/30">
                <img src={qrCodeData} alt="Telephony QR Pair" className="w-44 h-44 object-contain rounded-lg" />
              </div>
            ) : null}

            <p className="text-[11px] text-slate-400 text-center max-w-xs">
              Увійдіть у додатку за <strong>Email/Паролем</strong> або наведіть камеру для швидкої авторизації.
            </p>
          </div>

          {/* Steps list */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Швидке налаштування за 1 хвилину:
            </span>
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <div className="flex items-start gap-2 p-2 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">1</span>
                <span>Завантажте та встановіть <strong>OnlineCRM Gateway (.apk)</strong> на Android-смартфон.</span>
              </div>
              <div className="flex items-start gap-2 p-2 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">2</span>
                <span>Увійдіть у додаток під своїм корпоративним логіном або відскануйте QR-код.</span>
              </div>
              <div className="flex items-start gap-2 p-2 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">3</span>
                <span>Оберіть робочу SIM-карту (SIM 1 або SIM 2), щоб особисті дзвінки не потрапляли в CRM.</span>
              </div>
            </div>
          </div>

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
