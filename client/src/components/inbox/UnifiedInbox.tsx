import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Search, 
  Send, 
  Phone, 
  User as UserIcon, 
  Building2, 
  CheckCheck, 
  Clock, 
  QrCode,
  Sparkles,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { api, socket } from '../../services/api';
import { ChatMessage } from '../../types';

interface UnifiedInboxProps {
  onOpenDeal: (dealId: string) => void;
  openQRModal: (channel?: 'whatsapp' | 'telegram') => void;
}

export const UnifiedInbox: React.FC<UnifiedInboxProps> = ({
  onOpenDeal,
  openQRModal
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedChatKey, setSelectedChatKey] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [search, setSearch] = useState('');
  const [filterChannel, setFilterChannel] = useState<'all' | 'whatsapp' | 'telegram'>('all');
  const [loading, setLoading] = useState(false);

  const fetchMessages = async () => {
    try {
      const res = await api.get('/chat/messages');
      if (res.data && Array.isArray(res.data)) {
        setMessages(res.data);
      }
    } catch (e) {
      console.warn('Inbox fetch:', e);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Fast polling every 2.5 seconds to guarantee 100% instant sync with WhatsApp phone
    const interval = setInterval(fetchMessages, 2500);

    const handleNewMessage = (msg: ChatMessage) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    socket.on('new_message', handleNewMessage);
    return () => {
      clearInterval(interval);
      socket.off('new_message', handleNewMessage);
    };
  }, []);

  // Group messages into distinct dialogs by phone / tg / deal
  const dialogsMap = new Map<string, {
    key: string;
    senderName: string;
    channel: 'whatsapp' | 'telegram';
    phoneOrId: string;
    lastMessage: ChatMessage;
    messages: ChatMessage[];
    dealId?: string;
  }>();

  messages.forEach(msg => {
    const key = msg.senderPhone || msg.senderTgId || (msg.dealId ? `deal_${msg.dealId}` : msg.id);
    if (!dialogsMap.has(key)) {
      dialogsMap.set(key, {
        key,
        senderName: msg.senderName || (msg.channel === 'whatsapp' ? `WhatsApp (+${msg.senderPhone})` : `Telegram (${msg.senderTgId})`),
        channel: msg.channel,
        phoneOrId: msg.senderPhone || msg.senderTgId || '',
        lastMessage: msg,
        messages: [msg],
        dealId: msg.dealId
      });
    } else {
      const d = dialogsMap.get(key)!;
      d.messages.push(msg);
      d.lastMessage = msg;
    }
  });

  const dialogs = Array.from(dialogsMap.values()).sort((a, b) => 
    new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
  );

  const filteredDialogs = dialogs.filter(d => {
    if (filterChannel !== 'all' && d.channel !== filterChannel) return false;
    if (search && !d.senderName.toLowerCase().includes(search.toLowerCase()) && !d.lastMessage.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeDialog = dialogs.find(d => d.key === selectedChatKey) || filteredDialogs[0];

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeDialog) return;

    const to = activeDialog.phoneOrId;
    const channel = activeDialog.channel;

    try {
      await api.post('/chat/send', {
        channel,
        to,
        text: replyText,
        dealId: activeDialog.dealId
      });
      setReplyText('');
      fetchMessages();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#080c14] select-none font-['Inter',sans-serif]">
      {/* Dialogs List (Left) */}
      <div className="w-80 sm:w-96 border-r border-slate-800 flex flex-col justify-between bg-[#0e1320] flex-shrink-0">
        <div className="p-4 border-b border-slate-800/80 space-y-3 bg-[#111827]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>Месенджери (WA / TG)</span>
            </h2>
            <button
              onClick={() => openQRModal()}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>QR Шлюз</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Пошук діалогів..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Channel filter tabs */}
          <div className="flex gap-1.5 bg-slate-900 p-1 rounded-xl text-[11px] font-bold">
            <button
              onClick={() => setFilterChannel('all')}
              className={`flex-1 py-1 rounded-lg transition ${filterChannel === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
            >
              Всі
            </button>
            <button
              onClick={() => setFilterChannel('whatsapp')}
              className={`flex-1 py-1 rounded-lg transition ${filterChannel === 'whatsapp' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
            >
              WhatsApp
            </button>
            <button
              onClick={() => setFilterChannel('telegram')}
              className={`flex-1 py-1 rounded-lg transition ${filterChannel === 'telegram' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}
            >
              Telegram
            </button>
          </div>
        </div>

        {/* Dialogs Stream */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
          {filteredDialogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
              <p>Немає активних діалогів.</p>
              <p className="text-[11px] text-slate-400">Надішліть повідомлення на підключений номер WhatsApp, і воно з'явиться тут у режимі реального часу!</p>
            </div>
          ) : (
            filteredDialogs.map((d) => {
              const isActive = activeDialog?.key === d.key;
              const isWA = d.channel === 'whatsapp';
              return (
                <div
                  key={d.key}
                  onClick={() => setSelectedChatKey(d.key)}
                  className={`p-3.5 cursor-pointer transition flex items-start gap-3 ${
                    isActive ? 'bg-[#1a233a] border-l-4 border-blue-500' : 'hover:bg-slate-900/60'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    isWA ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  }`}>
                    {isWA ? 'WA' : 'TG'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-white truncate">{d.senderName}</h4>
                      <span className="text-[10px] text-slate-500">
                        {new Date(d.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{d.lastMessage.text}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Active Dialog Room (Right) */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden bg-[#080c14]">
        {activeDialog ? (
          <>
            {/* Room Header */}
            <div className="h-16 px-6 border-b border-slate-800 bg-[#0e1320] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs ${
                  activeDialog.channel === 'whatsapp' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                }`}>
                  {activeDialog.channel === 'whatsapp' ? 'WA' : 'TG'}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">{activeDialog.senderName}</h3>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <span>{activeDialog.phoneOrId}</span>
                    <span className="text-emerald-400 font-bold">● Пряме з'єднання</span>
                  </div>
                </div>
              </div>

              {activeDialog.dealId && (
                <button
                  onClick={() => onOpenDeal(activeDialog.dealId!)}
                  className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <span>Відкрити угоду в CRM</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Chat History */}
            <div className="flex-1 p-6 overflow-y-auto space-y-3.5">
              {activeDialog.messages.map((m) => {
                const isOut = m.direction === 'outgoing';
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isOut ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-500">
                      <span>{isOut ? 'Менеджер' : (m.senderName || activeDialog.senderName)}</span>
                      <span>•</span>
                      <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div
                      className={`max-w-lg p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isOut
                          ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-600/20'
                          : 'bg-[#141b2d] text-slate-100 border border-slate-800 rounded-tl-none'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Message Reply Form */}
            <div className="p-4 border-t border-slate-800 bg-[#0e1320]">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Написати клієнту у ${activeDialog.channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-blue-600/30"
                >
                  <Send className="w-4 h-4" />
                  <span>Надіслати</span>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-500 text-xs">
            Виберіть діалог ліворуч для перегляду листування
          </div>
        )}
      </div>
    </div>
  );
};
