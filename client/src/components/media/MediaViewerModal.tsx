import React, { useState } from 'react';
import { 
  X, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  FileText, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from 'lucide-react';

import { api, resolveMediaUrl } from '../../services/api';

interface MediaViewerModalProps {
  mediaUrl: string;
  mediaType: 'image' | 'pdf' | 'video' | 'document';
  title?: string;
  messageId?: string;
  channel?: string;
  onClose: () => void;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  mediaUrl,
  mediaType,
  title = 'Перегляд файлу',
  messageId,
  channel,
  onClose
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(mediaUrl);
  const [isRefetching, setIsRefetching] = useState(false);
  const [refetchError, setRefetchError] = useState<string | null>(null);

  React.useEffect(() => {
    setCurrentUrl(mediaUrl);
  }, [mediaUrl]);

  const resolvedUrl = React.useMemo(() => {
    return resolveMediaUrl(currentUrl);
  }, [currentUrl]);

  const handleRefetch = async () => {
    if (!messageId) return;
    setIsRefetching(true);
    setRefetchError(null);
    try {
      const res = await api.post(`/chat/messages/${messageId}/refetch-media`);
      if (res.data?.mediaUrl) {
        setCurrentUrl(res.data.mediaUrl);
        setHasError(false);
      }
    } catch (err: any) {
      setRefetchError(err.response?.data?.error || err.message || 'Не вдалося підтягнути файл');
    } finally {
      setIsRefetching(false);
    }
  };

  React.useEffect(() => {
    setHasError(false);
    if (!resolvedUrl) {
      setHasError(true);
      return;
    }
    // Pre-flight check for PDF or document to detect 404 before iframe displays blank/broken page
    if (mediaType === 'pdf' || mediaType === 'document') {
      let active = true;
      fetch(resolvedUrl, { method: 'HEAD' })
        .then(res => {
          if (active && (res.status === 404 || res.status === 410)) {
            setHasError(true);
          }
        })
        .catch(() => {
          // If CORS prevents HEAD request to external CDN, let iframe handle it naturally
        });
      return () => { active = false; };
    }
  }, [resolvedUrl, mediaType]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 font-['Inter',sans-serif] animate-in fade-in">
      
      {/* Top Toolbar */}
      <div className="h-14 px-6 bg-[#0e1320]/90 border border-slate-800 rounded-2xl flex items-center justify-between text-white flex-shrink-0 mb-3 shadow-2xl">
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <div className="truncate">
            <h3 className="font-bold text-xs sm:text-sm truncate">{title}</h3>
            <span className="text-[10px] text-slate-400 uppercase font-mono">{mediaType}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {mediaType === 'image' && (
            <>
              <button
                onClick={handleZoomOut}
                title="Зменшити"
                className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomIn}
                title="Збільшити"
                className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleRotate}
                title="Повернути на 90°"
                className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </>
          )}

          <a
            href={resolvedUrl}
            target="_blank"
            rel="noreferrer"
            title="Відкрити у новій вкладці"
            className="p-2 text-slate-300 hover:text-blue-400 bg-slate-800/80 hover:bg-slate-700 rounded-xl transition flex items-center gap-1.5 text-xs font-bold"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">Відкрити</span>
          </a>

          <a
            href={resolvedUrl}
            download
            target="_blank"
            rel="noreferrer"
            title="Завантажити файл"
            className="p-2 text-slate-300 hover:text-emerald-400 bg-slate-800/80 hover:bg-slate-700 rounded-xl transition flex items-center gap-1.5 text-xs font-bold"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Завантажити</span>
          </a>

          <button
            onClick={onClose}
            title="Закрити"
            className="p-2 text-slate-400 hover:text-white hover:bg-rose-500/20 rounded-xl transition ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Media Canvas */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative rounded-2xl bg-[#080c14] border border-slate-800/60 p-2">
        {hasError ? (
          <div className="max-w-md w-full bg-[#111827]/95 border border-amber-500/30 rounded-2xl p-6 text-center space-y-4 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm sm:text-base">Файл недоступний у сховищі</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Тимчасове посилання на цей файл застаріло або сервер оновлювався (HTTP 404).
              </p>
              {title && (
                <div className="mt-2 text-[11px] font-mono text-slate-300 bg-slate-900/90 px-3 py-1.5 rounded-lg truncate border border-slate-800">
                  {title}
                </div>
              )}
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-left text-[11px] text-blue-300 space-y-1.5">
              <p className="font-semibold text-blue-200">💡 Що робити:</p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                {title?.toLowerCase().includes('кп') || title?.toLowerCase().includes('комерці') || title?.toLowerCase().includes('кошторис') ? (
                  <li>Сформуйте свіжу Комерційну Пропозицію (КП) у картці угоди в один клік.</li>
                ) : null}
                <li>Усі нові файли та відео тепер надійно зберігаються на постійному хмарному сховищі.</li>
                <li>Ви можете завантажити та надіслати файл повторно у діалог.</li>
              </ul>
            </div>

            {refetchError && (
              <p className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 text-center">
                ⚠️ {refetchError}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {messageId && (
                <button
                  onClick={handleRefetch}
                  disabled={isRefetching}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
                  <span>{isRefetching ? 'Завантаження з серверів...' : `Підтягнути з ${channel === 'telegram' ? 'Telegram' : 'WhatsApp'}`}</span>
                </button>
              )}
              <a
                href={resolvedUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Пряме посилання</span>
              </a>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/30"
              >
                Зрозуміло
              </button>
            </div>
          </div>
        ) : mediaType === 'image' ? (
          <div className="w-full h-full flex items-center justify-center overflow-auto">
            <img
              src={resolvedUrl}
              alt={title}
              onError={() => setHasError(true)}
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease-out'
              }}
              className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
            />
          </div>
        ) : mediaType === 'pdf' ? (
          <div className="w-full h-full flex flex-col relative bg-white rounded-xl overflow-hidden shadow-2xl">
            <div className="h-9 px-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-slate-700 text-xs flex-shrink-0">
              <span className="font-semibold truncate">📄 {title || 'Документ PDF'}</span>
              <div className="flex items-center gap-3">
                <a
                  href={resolvedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold hover:underline"
                >
                  <span>Відкрити окремо</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
            <iframe
              src={`${resolvedUrl}#toolbar=1&navpanes=0`}
              title={title}
              onError={() => setHasError(true)}
              className="w-full flex-1 border-0 bg-white"
            />
          </div>
        ) : mediaType === 'video' ? (
          <video
            controls
            autoPlay
            src={resolvedUrl}
            onError={() => setHasError(true)}
            className="max-h-full max-w-full rounded-2xl shadow-2xl border border-slate-800"
          />
        ) : (
          <div className="text-center text-slate-400 space-y-4 p-8">
            <FileText className="w-16 h-16 text-blue-500 mx-auto" />
            <h4 className="font-bold text-white text-base">{title}</h4>
            <p className="text-xs">Цей формат документа оптимізовано для перегляду у зовнішньому вікні.</p>
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/30"
            >
              <span>Відкрити документ</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>

    </div>
  );
};
