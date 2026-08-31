import React, { useState } from 'react';
import { X, Send, MessageSquare, Smartphone, Zap } from 'lucide-react';
import { api } from '../../services/api';

interface SimulateMessageModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const SimulateMessageModal: React.FC<SimulateMessageModalProps> = ({ onClose, onSuccess }) => {
  const [channel, setChannel] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [senderName, setSenderName] = useState('Владимир Смирнов (Новый Заказчик)');
  const [senderContact, setSenderContact] = useState('+7 (925) 333-88-99');
  const [text, setText] = useState('Здравствуйте! Хотим заказать у вас внедрение CRM на 50 рабочих мест. Сколько стоит и какие сроки?');
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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-[#141b2d]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Симулятор входящего лида (WhatsApp / Telegram)
              </h2>
              <p className="text-xs text-slate-400">
                Протестируйте авто-создание сделки и омниканальный чат
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Channel selector */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setChannel('whatsapp');
                setSenderContact('+7 (925) 333-88-99');
              }}
              className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition ${
                channel === 'whatsapp' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              <span>WhatsApp сообщение</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setChannel('telegram');
                setSenderContact('@vladimir_smirnov');
              }}
              className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition ${
                channel === 'telegram' ? 'bg-sky-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              <span>Telegram сообщение</span>
            </button>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-semibold">Имя клиента</label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-semibold">
              {channel === 'whatsapp' ? 'Телефон клиента' : 'Telegram никнейм (@)'}
            </label>
            <input
              type="text"
              value={senderContact}
              onChange={(e) => setSenderContact(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-semibold">Текст входящего сообщения клиента</label>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-2 transition shadow-md shadow-blue-600/30"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Отправить как клиент</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
