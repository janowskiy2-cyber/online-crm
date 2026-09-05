import React, { useEffect, useState } from 'react';
import { CANNED_RESPONSES, CannedResponse } from '../../constants/cannedResponses';
import { Sparkles, Command, ArrowRight } from 'lucide-react';

interface SlashCommandsPopupProps {
  filterQuery: string;
  onSelect: (item: CannedResponse) => void;
  onClose: () => void;
}

export const SlashCommandsPopup: React.FC<SlashCommandsPopupProps> = ({
  filterQuery,
  onSelect,
  onClose
}) => {
  const cleanQuery = filterQuery.toLowerCase().replace(/^\//, '').trim();
  const filtered = CANNED_RESPONSES.filter(item => 
    !cleanQuery || 
    item.shortcut.toLowerCase().includes(cleanQuery) ||
    item.title.toLowerCase().includes(cleanQuery) ||
    item.text.toLowerCase().includes(cleanQuery)
  );

  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [cleanQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filtered.length) % (filtered.length || 1));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (filtered[selectedIndex]) {
          e.preventDefault();
          onSelect(filtered[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [filtered, selectedIndex, onSelect, onClose]);

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full mb-2 left-0 right-0 max-w-xl z-50 bitrix-glass bg-slate-950/95 border border-emerald-500/40 rounded-2xl shadow-2xl p-2 backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-2">
      <div className="px-3 py-1.5 border-b border-white/10 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 font-bold text-emerald-400">
          <Command className="w-3.5 h-3.5" />
          <span>Швидкі відповіді та шаблони (натисніть Enter або клікніть)</span>
        </div>
        <span className="text-[10px] text-slate-500">Esc - закрити</span>
      </div>

      <div className="max-h-56 overflow-y-auto space-y-1 p-1 mt-1">
        {filtered.map((item, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <div
              key={item.shortcut}
              onMouseEnter={() => setSelectedIndex(idx)}
              onClick={() => onSelect(item)}
              className={`p-2.5 rounded-xl cursor-pointer transition flex items-start justify-between gap-3 ${
                isSelected 
                  ? 'bg-emerald-600/25 border border-emerald-500/40 text-white' 
                  : 'hover:bg-slate-900/60 text-slate-300 border border-transparent'
              }`}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-black text-xs border border-emerald-500/30">
                    {item.shortcut}
                  </span>
                  <span className="text-xs font-bold text-white truncate">{item.title}</span>
                  <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.2 bg-white/5 rounded">
                    {item.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1 leading-snug">
                  {item.text}
                </p>
              </div>

              {isSelected && (
                <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold self-center flex-shrink-0">
                  <span>Вставити</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

