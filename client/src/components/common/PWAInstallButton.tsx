import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Check, Share } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSTip, setShowIOSTip] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for the beforeinstallprompt event (Chrome, Edge, Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSTip(true);
      return;
    }

    if (!deferredPrompt) {
      // If browser hasn't fired prompt yet, show friendly tip
      alert('Щоб встановити додаток: відкрийте меню вашого браузера (три крапки у верхньому кутку) та виберіть "Встановити додаток" або "Додати на головний екран".');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  // If already installed as app, don't show button
  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-r from-blue-600/15 via-indigo-600/15 to-purple-600/15 hover:from-blue-600/25 hover:to-indigo-600/25 text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-xl text-xs font-semibold transition group shadow-sm"
        title="Встановити CRM як окремий додаток на комп'ютер або смартфон"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
            <Download className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-medium text-slate-200">Встановити додаток</span>
        </div>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold uppercase">
          PWA
        </span>
      </button>

      {/* iOS Instructions Modal */}
      {showIOSTip && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 font-['Inter',sans-serif]"
          onClick={() => setShowIOSTip(false)}
        >
          <div 
            className="bg-[#0e131f] border border-slate-700/80 rounded-3xl w-full max-w-sm p-5 shadow-2xl space-y-4 animate-in fade-in slide-in-from-bottom-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-400" />
                <h4 className="text-sm font-bold text-white">Встановлення на iPhone</h4>
              </div>
              <button 
                onClick={() => setShowIOSTip(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              В браузері Safari додаток встановлюється в 2 простих кроки:
            </p>

            <ol className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">1</span>
                <span>Натисніть кнопку <strong>«Поділитися»</strong> <Share className="w-3.5 h-3.5 inline mx-1 text-blue-400" /> у нижній панелі Safari.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">2</span>
                <span>Прокрутіть меню та оберіть пункт <strong>«На екран "Додому"»</strong>.</span>
              </li>
            </ol>

            <button
              onClick={() => setShowIOSTip(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/20"
            >
              Зрозуміло
            </button>
          </div>
        </div>
      )}
    </>
  );
};
