import React, { useState } from 'react';
import { X, Sparkles, Copy, Check, Send, FileText, ShieldAlert, Cpu } from 'lucide-react';
import { api } from '../../services/api';

interface GeminiModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealTitle: string;
  companyName?: string;
  onInsertNote?: (text: string) => void;
}

export const GeminiModal: React.FC<GeminiModalProps> = ({
  isOpen,
  onClose,
  dealTitle,
  companyName = 'Підприємство',
  onInsertNote
}) => {
  const [activeMode, setActiveMode] = useState<'brief' | 'pitch' | 'objection'>('brief');
  
  // Inputs
  const [briefInput, setBriefInput] = useState('Потрібно 10 операторів лінії та 5 зварювальників на завод металоконструкцій. Зміна 10 годин, ставка 22-26 злотих/год, проживання надається.');
  const [candidateName, setCandidateName] = useState('Бахром Юлдашев');
  const [candidateProfession, setCandidateProfession] = useState('Оператор автоматичної лінії');
  const [objectionText, setObjectionText] = useState('Чому ми маємо сплачувати 25% авансу до того, як побачимо людей у цеху?');

  // Outputs
  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleRunAi = async () => {
    setLoading(true);
    setResultText('');
    try {
      if (activeMode === 'brief') {
        const res = await api.post('/ai/analyze-brief', { briefText: briefInput });
        setResultText(res.data.analysis || 'Немає результату');
      } else if (activeMode === 'pitch') {
        const res = await api.post('/ai/pitch-candidate', {
          companyName,
          vacancy: candidateProfession,
          candidate: { name: candidateName, profession: candidateProfession, country: 'Узбекистан' }
        });
        setResultText(res.data.pitch || 'Немає результату');
      } else if (activeMode === 'objection') {
        const res = await api.post('/ai/objection', { objectionText });
        setResultText(res.data.answer || 'Немає результату');
      }
    } catch (e: any) {
      setResultText('Помилка генерації AI: ' + (e.message || 'Спробуйте ще раз'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!resultText) return;
    navigator.clipboard.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertAsNote = () => {
    if (resultText && onInsertNote) {
      onInsertNote(`🤖 [Gemini AI Рекомендація]:\n\n${resultText}`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#0b101b] border border-indigo-500/40 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-950/60 to-purple-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
              <Cpu className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Google Gemini 1.5 Recruiter AI</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-extrabold border border-indigo-500/30">
                  FREE 0$
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Розумний асистент підбору персоналу для {companyName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="p-3 border-b border-slate-800/80 bg-[#0e1424] flex items-center gap-2">
          <button
            onClick={() => { setActiveMode('brief'); setResultText(''); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeMode === 'brief'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Аналіз заявки</span>
          </button>

          <button
            onClick={() => { setActiveMode('pitch'); setResultText(''); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeMode === 'pitch'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Супровідний лист</span>
          </button>

          <button
            onClick={() => { setActiveMode('objection'); setResultText(''); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeMode === 'objection'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Відповідь на заперечення</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeMode === 'brief' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Вимоги або текст заявки від підприємства:
              </label>
              <textarea
                value={briefInput}
                onChange={(e) => setBriefInput(e.target.value)}
                rows={3}
                placeholder="Опишіть вимоги до людей, графік, ставки, умови проживання..."
                className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {activeMode === 'pitch' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    ПІБ Кандидата:
                  </label>
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Вакансія / Посада:
                  </label>
                  <input
                    type="text"
                    value={candidateProfession}
                    onChange={(e) => setCandidateProfession(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeMode === 'objection' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Заперечення підприємства або питання директора:
              </label>
              <input
                type="text"
                value={objectionText}
                onChange={(e) => setObjectionText(e.target.value)}
                placeholder="Наприклад: Чому передоплата 25%? або А якщо вони не вийдуть?"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          {/* Action Trigger Button */}
          <button
            onClick={handleRunAi}
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:opacity-90 text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? 'AI генерує відповідь...' : '⚡ Запустити аналіз Gemini AI'}</span>
          </button>

          {/* Result Output Area */}
          {resultText && (
            <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Відповідь Gemini AI:</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopy}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Скопійовано' : 'Скопіювати'}</span>
                  </button>
                  {onInsertNote && (
                    <button
                      onClick={handleInsertAsNote}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                    >
                      <Send className="w-3 h-3" />
                      <span>Вставити в замітки</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                {resultText}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
