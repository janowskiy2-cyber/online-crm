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

interface MediaViewerModalProps {
  mediaUrl: string;
  mediaType: 'image' | 'pdf' | 'video' | 'document';
  title?: string;
  onClose: () => void;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  mediaUrl,
  mediaType,
  title = 'Перегляд файлу',
  onClose
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 select-none font-['Inter',sans-serif] animate-in fade-in">
      
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
            href={mediaUrl}
            download
            target="_blank"
            rel="noreferrer"
            title="Завантажити оригінал"
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
        {mediaType === 'image' ? (
          <div className="w-full h-full flex items-center justify-center overflow-auto">
            <img
              src={mediaUrl}
              alt={title}
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease-out'
              }}
              className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
            />
          </div>
        ) : mediaType === 'pdf' ? (
          <iframe
            src={`${mediaUrl}#toolbar=1&navpanes=0`}
            title={title}
            className="w-full h-full rounded-xl border border-slate-800 bg-white"
          />
        ) : mediaType === 'video' ? (
          <video
            controls
            autoPlay
            src={mediaUrl}
            className="max-h-full max-w-full rounded-2xl shadow-2xl border border-slate-800"
          />
        ) : (
          <div className="text-center text-slate-400 space-y-4 p-8">
            <FileText className="w-16 h-16 text-blue-500 mx-auto" />
            <h4 className="font-bold text-white text-base">{title}</h4>
            <p className="text-xs">Цей формат документа оптимізовано для перегляду у зовнішньому вікні.</p>
            <a
              href={mediaUrl}
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
