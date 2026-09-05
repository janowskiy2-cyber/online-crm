import React, { useState } from 'react';
import { X, Send, MessageSquare, Smartphone, Zap } from 'lucide-react';
import { api } from '../../services/api';

interface SimulateMessageModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const SimulateMessageModal: React.FC<SimulateMessageModalProps> = ({ onClose, onSuccess }) => {
  const [channel, setChannel] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [senderName, setSenderName] = useState('Олексій Тарасович (ТОВ "Агро-Пром")');
  const [senderContact, setSenderContact] = useState('+380674502211');
  const [text, setText] = useState('Доброго дня! Терміново потрібно 15 фасувальників та операторів лінії на завод. Скільки коштує та які строки за схемою 4х25%?');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/chat/simulate-incoming', {
        channel,
        senderName,
        senderContact,
        text
      });
      onSuccess();
      onClose();
    } catch (e) {
      console.error('Failed to simulate message:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-['Inter',sans-serif] select-none animate-in fade-in">
      <div className="bitrix-glass border border-white/15 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden backdrop-blur-2xl">
        <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between bg-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Симулятор ліда (WhatsApp / Telegram)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  TEST BOT
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Перевірка авто-розподілу, створення угоди та сповіщень
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl transition hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Channel selector */}
          <div className="flex gap-2.5 p-1 bg-black/30 border border-white/10 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setChannel('whatsapp');
                setSenderContact('+380674502211');
                setSenderName('Олексій Тарасович (ТОВ "Агро-Пром")');
              }}
              className={`flex-1 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition ${
                channel === 'whatsapp' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🟢 WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setChannel('telegram');
                setSenderContact('@director_oleksiy');
                setSenderName('Директор Олексій (Завод)');
              }}
              className={`flex-1 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition ${
                channel === 'telegram' 
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🔵 Telegram</span>
            </button>
          </div>

          <div>
            <label className="text-slate-300 block mb-1 font-semibold">Ім'я замовника або кандидата</label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>

          <div>
            <label className="text-slate-300 block mb-1 font-semibold">
              {channel === 'whatsapp' ? 'Номер WhatsApp (+380...)' : 'Нікнейм Telegram (@юзернейм або телефон)'}
            </label>
            <input
              type="text"
              value={senderContact}
              onChange={(e) => setSenderContact(e.target.value)}
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500 font-mono transition"
              required
            />
          </div>

          <div>
            <label className="text-slate-300 block mb-1 font-semibold">Текст повідомлення клієнта</label>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 rounded-xl font-semibold transition border border-white/10"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl flex items-center gap-2 transition shadow-lg shadow-blue-600/30 active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Надсилання...' : 'Надіслати як клієнт'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
