import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Search, 
  User as UserIcon, 
  CheckCheck, 
  Phone, 
  ExternalLink,
  QrCode
} from 'lucide-react';
import { api, socket } from '../../services/api';
import { Deal } from '../../types';

interface Conversation {
  id: string;
  channel: string;
  senderName: string;
  senderPhone?: string;
  senderTgId?: string;
  contact?: any;
  deal?: Deal;
  lastMessage: any;
  unreadCount: number;
}

interface UnifiedInboxProps {
  onOpenDeal: (dealId: string) => void;
  openQRModal: (channel?: 'whatsapp' | 'telegram') => void;
}

export const UnifiedInbox: React.FC<UnifiedInboxProps> = ({ onOpenDeal, openQRModal }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'whatsapp' | 'telegram'>('all');
  const [search, setSearch] = useState('');

  const fetchConversations = async () => {
    try {
      const res = await api.get('/chat/conversations');
      setConversations(res.data);
      if (res.data.length > 0 && !activeConvId) {
        setActiveConvId(res.data[0].id);
      }
    } catch (e) {
      console.error('Failed to load conversations:', e);
    }
  };

  const fetchMessages = async (conv: Conversation) => {
    try {
      const res = await api.get('/chat/messages', {
        params: {
          dealId: conv.deal?.id,
          contactId: conv.contact?.id
        }
      });
      setMessages(res.data);
    } catch (e) {
      console.error('Failed to load messages:', e);
    }
  };

  useEffect(() => {
    fetchConversations();

    const handleNewMessage = () => {
      fetchConversations();
      if (activeConv) {
        fetchMessages(activeConv);
      }
    };

    socket.on('new_message', handleNewMessage);
    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [activeConvId]);

  const activeConv = conversations.find(c => c.id === activeConvId);

  useEffect(() => {
    if (activeConv) {
      fetchMessages(activeConv);
    }
  }, [activeConvId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeConv) return;

    const to = activeConv.channel === 'whatsapp' 
      ? (activeConv.senderPhone || activeConv.contact?.phone || '')
      : (activeConv.senderTgId || activeConv.contact?.telegram || '');

    try {
      await api.post('/chat/send', {
        channel: activeConv.channel,
        to,
        text: replyText,
        dealId: activeConv.deal?.id,
        contactId: activeConv.contact?.id
      });
      setReplyText('');
      fetchMessages(activeConv);
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  };

  const filteredConversations = conversations.filter(c => {
    if (channelFilter !== 'all' && c.channel !== channelFilter) return false;
    if (search && !c.senderName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex-1 flex bg-[#0b0f19] overflow-hidden">
      {/* Left Chat List Column */}
      <div className="w-80 border-r border-slate-800 bg-[#111827] flex flex-col flex-shrink-0">
        {/* Header & Filter */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              <span>Чаты и Мессенджеры</span>
            </h2>
            <button
              onClick={() => openQRModal()}
              title="QR-коды подключения"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 border border-slate-700"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>QR</span>
            </button>
          </div>

          <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setChannelFilter('all')}
              className={`flex-1 py-1 rounded-lg transition ${channelFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
            >
              Все
            </button>
            <button
              onClick={() => setChannelFilter('whatsapp')}
              className={`flex-1 py-1 rounded-lg transition ${channelFilter === 'whatsapp' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
            >
              WhatsApp
            </button>
            <button
              onClick={() => setChannelFilter('telegram')}
              className={`flex-1 py-1 rounded-lg transition ${channelFilter === 'telegram' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}
            >
              Telegram
            </button>
          </div>

          <input
            type="text"
            placeholder="Поиск диалогов..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        {/* List of Conversations */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Диалогов пока нет
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConvId;
              const isWhatsApp = conv.channel === 'whatsapp';
              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`p-3.5 cursor-pointer transition ${
                    isActive ? 'bg-slate-800/90 border-l-4 border-l-blue-500' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isWhatsApp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-sky-500/20 text-sky-400'
                      }`}>
                        {isWhatsApp ? 'WA' : 'TG'}
                      </span>
                      <span className="font-semibold text-xs text-white truncate">
                        {conv.senderName}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 flex-shrink-0">
                      {new Date(conv.lastMessage?.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-1 mb-1">
                    {conv.lastMessage?.text || 'Нет сообщений'}
                  </p>

                  {conv.deal && (
                    <span className="text-[10px] text-blue-400/90 truncate block">
                      Сделка: {conv.deal.title}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Messages Column */}
      {activeConv ? (
        <div className="flex-1 flex flex-col h-full bg-[#0b0f19]">
          {/* Chat Top Info Bar */}
          <div className="h-16 px-6 border-b border-slate-800 bg-[#111827] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-blue-400 font-bold border border-slate-700">
                {activeConv.senderName.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>{activeConv.senderName}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    activeConv.channel === 'whatsapp' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-sky-500/20 text-sky-400'
                  }`}>
                    {activeConv.channel}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {activeConv.senderPhone || activeConv.senderTgId || 'В сети'}
                </p>
              </div>
            </div>

            {activeConv.deal && (
              <button
                onClick={() => onOpenDeal(activeConv.deal!.id)}
                className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <span>Открыть сделку</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {messages.map((msg) => {
              const isOutgoing = msg.direction === 'outgoing';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-lg p-3.5 rounded-2xl text-xs leading-relaxed ${
                      isOutgoing
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Reply Form */}
          <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-[#111827] flex gap-3">
            <input
              type="text"
              placeholder={`Ответить в ${activeConv.channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-md shadow-blue-600/30"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Отправить</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          Выберите диалог из списка слева
        </div>
      )}
    </div>
  );
};
