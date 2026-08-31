import React, { useState, useEffect, useRef } from 'react';
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
  RefreshCw, 
  DollarSign, 
  CheckCircle2, 
  Calendar, 
  ChevronRight, 
  FileText,
  Paperclip,
  X,
  ArrowLeft,
  Mic,
  Image as ImageIcon,
  Play
} from 'lucide-react';
import { api, socket } from '../../services/api';
import { ChatMessage, Deal, Pipeline } from '../../types';
import { MediaViewerModal } from '../media/MediaViewerModal';
import { AudioMessagePlayer } from '../media/AudioMessagePlayer';
import { VoiceRecorder } from '../media/VoiceRecorder';
import { CallModal } from '../telephony/CallModal';

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
  
  // Voice Recording & Telephony & Media View state
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<{ url: string; type: 'image' | 'pdf' | 'video' | 'document'; title?: string } | null>(null);
  const [activeCall, setActiveCall] = useState<{ name: string; phone: string; type: 'whatsapp' | 'telegram' | 'gsm' } | null>(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<{ name: string; base64: string; type: string } | null>(null);
  const [isSendingFile, setIsSendingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Active deal connected to selected chat
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);

  const fetchPipelines = async () => {
    try {
      const res = await api.get('/pipelines');
      if (res.data) setPipelines(res.data);
    } catch (e) {}
  };

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
    fetchPipelines();

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

  const activeDialog = dialogs.find(d => d.key === selectedChatKey) || (typeof window !== 'undefined' && window.innerWidth > 768 ? filteredDialogs[0] : null);

  useEffect(() => {
    if (activeDialog?.dealId) {
      api.get(`/deals/${activeDialog.dealId}`).then(res => {
        if (res.data) setActiveDeal(res.data);
      }).catch(() => setActiveDeal(null));
    } else {
      setActiveDeal(null);
    }
  }, [activeDialog?.dealId]);

  const handleStageChange = async (newStageId: string) => {
    if (!activeDeal) return;
    try {
      const res = await api.put(`/deals/${activeDeal.id}`, { stageId: newStageId });
      setActiveDeal(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        name: file.name,
        base64: reader.result as string,
        type: file.type || 'application/pdf'
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSendVoiceNote = async (audioBase64: string, durationSec: number) => {
    if (!activeDialog) return;
    setIsVoiceRecording(false);
    try {
      await api.post('/chat/send-file', {
        channel: activeDialog.channel,
        to: activeDialog.phoneOrId,
        fileBase64: audioBase64,
        fileName: `Voice_Note_${Date.now()}.webm`,
        mimeType: 'audio/webm',
        caption: `🎤 Голосове повідомлення (${durationSec} сек)`,
        dealId: activeDialog.dealId
      });
      fetchMessages();
    } catch (e) {
      alert('Помилка відправки голосового повідомлення');
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    if (!activeDialog) return;

    const to = activeDialog.phoneOrId;
    const channel = activeDialog.channel;

    if (selectedFile) {
      setIsSendingFile(true);
      try {
        await api.post('/chat/send-file', {
          channel,
          to,
          fileBase64: selectedFile.base64,
          fileName: selectedFile.name,
          mimeType: selectedFile.type,
          caption: replyText || undefined,
          dealId: activeDialog.dealId
        });
        setSelectedFile(null);
        setReplyText('');
        fetchMessages();
      } catch (err) {
        alert('Помилка відправки файлу');
      } finally {
        setIsSendingFile(false);
      }
      return;
    }

    const textToSend = customText || replyText;
    if (!textToSend.trim()) return;

    try {
      await api.post('/chat/send', {
        channel,
        to,
        text: textToSend,
        dealId: activeDialog.dealId
      });
      setReplyText('');
      fetchMessages();
    } catch (e) {
      console.error(e);
    }
  };

  const quickSnippets = [
    { label: '📄 Розрахунок КП', text: 'Доброго дня! Підготували для вашого підприємства офіційну комерційну пропозицію з прорахунком вартості та графіком 4х25%. Надіслати PDF?' },
    { label: '💳 Схема 4х25%', text: 'Оплата здійснюється безпечно за 4 транші по 25%: 1) Договір ➔ 2) Затвердження кандидатів ➔ 3) Віза D ➔ 4) Фактичний вихід на завод.' },
    { label: '🛡️ Гарантія заміни', text: 'У нас діє 1 місяць повного супроводу координатором та 1 безкоштовна гарантійна заміна у разі необхідності.' }
  ];

  const currentPipeline = pipelines.find(p => p.id === activeDeal?.pipelineId) || pipelines[0];

  return (
    <div className="flex-1 flex overflow-hidden bg-[#080c14] select-none font-['Inter',sans-serif] w-full">
      
      {/* Dialogs List (Hidden on mobile if chat is active) */}
      <div className={`
        w-full md:w-80 border-r border-slate-800 flex flex-col justify-between bg-[#0e1320] flex-shrink-0
        ${activeDialog ? 'hidden md:flex' : 'flex'}
      `}>
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
              <span>Шлюз</span>
            </button>
          </div>

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
              <p className="text-[11px] text-slate-400">Надішліть повідомлення на номер WhatsApp/TG, щоб розпочати спілкування.</p>
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

      {/* Central Chat Room (Full Width on Mobile when active) */}
      <div className={`
        flex-1 flex-col justify-between overflow-hidden bg-[#080c14] border-r border-slate-800 w-full
        ${activeDialog ? 'flex' : 'hidden md:flex'}
      `}>
        {activeDialog ? (
          <>
            <div className="border-b border-slate-800 bg-[#0e1320] flex-shrink-0">
              <div className="h-14 px-4 sm:px-6 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setSelectedChatKey(null)}
                    className="md:hidden p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-xl mr-1"
                    title="Назад до списку"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    activeDialog.channel === 'whatsapp' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  }`}>
                    {activeDialog.channel === 'whatsapp' ? 'WA' : 'TG'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs sm:text-sm text-white truncate">{activeDialog.senderName}</h3>
                    <div className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                      <span>{activeDialog.phoneOrId}</span>
                    </div>
                  </div>
                </div>

                {/* Right Action Buttons: Call & Deal Card */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setActiveCall({
                      name: activeDialog.senderName,
                      phone: activeDialog.phoneOrId,
                      type: activeDialog.channel === 'whatsapp' ? 'whatsapp' : 'telegram'
                    })}
                    className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                    title="Зателефонувати в 1 клік"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Дзвінок</span>
                  </button>

                  {activeDialog.dealId && (
                    <button
                      onClick={() => onOpenDeal(activeDialog.dealId!)}
                      className="px-2.5 py-1.5 sm:px-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition flex-shrink-0"
                    >
                      <span className="hidden sm:inline">Картка</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {activeDeal && currentPipeline && (
                <div className="px-4 sm:px-6 py-2 bg-[#0c101c] border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto">
                  <span className="text-[10px] text-slate-500 uppercase font-bold mr-1">Етап:</span>
                  {currentPipeline.stages.map((stg) => {
                    const isCurrent = activeDeal.stageId === stg.id;
                    return (
                      <button
                        key={stg.id}
                        onClick={() => handleStageChange(stg.id)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition whitespace-nowrap ${
                          isCurrent
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stg.color }} />
                        <span className="truncate max-w-[120px]">{stg.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Chat History Stream */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3.5">
              {activeDialog.messages.map((m) => {
                const isOut = m.direction === 'outgoing';
                const isFile = m.text.startsWith('📎 Файл');
                const isVoice = m.text.startsWith('🎤 Голосове') || m.text.includes('[Голосове');
                const isImage = m.text.startsWith('📷 [Зображення]') || m.text.endsWith('.jpg') || m.text.endsWith('.png');

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

                    {isVoice ? (
                      <div className="max-w-[85%] sm:max-w-md w-full">
                        <AudioMessagePlayer
                          audioUrl={m.mediaUrl || 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'}
                          duration={12}
                          transcription={m.text.replace('🎤 Голосове повідомлення', '').replace('🎤', '').trim()}
                          isOutgoing={isOut}
                        />
                      </div>
                    ) : isImage && m.mediaUrl ? (
                      <div
                        onClick={() => setViewingMedia({ url: m.mediaUrl, type: 'image', title: 'Фото' })}
                        className="cursor-pointer max-w-xs rounded-2xl overflow-hidden border border-slate-700 shadow-md hover:opacity-90 transition"
                      >
                        <img src={m.mediaUrl} alt="Зображення" className="w-full object-cover max-h-48" />
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          if (isFile) {
                            setViewingMedia({
                              url: m.mediaUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                              type: 'pdf',
                              title: m.text.replace('📎 Файл: ', '').replace('📎 Файл TG: ', '')
                            });
                          }
                        }}
                        className={`max-w-[85%] sm:max-w-lg p-3 sm:p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isOut
                            ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-600/20'
                            : 'bg-[#141b2d] text-slate-100 border border-slate-800 rounded-tl-none'
                        } ${isFile ? 'border-2 border-amber-400/40 font-semibold cursor-pointer hover:bg-slate-800/80 transition flex items-center gap-2' : ''}`}
                      >
                        {isFile && <FileText className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                        <span>{m.text}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* File Attachment preview */}
            {selectedFile && (
              <div className="mx-3 sm:mx-4 p-2.5 bg-slate-900 border border-amber-500/40 rounded-2xl flex items-center justify-between text-xs text-amber-300 animate-in fade-in">
                <div className="flex items-center gap-2 truncate">
                  <Paperclip className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span className="font-semibold truncate">Прикріплено: {selectedFile.name}</span>
                </div>
                <button onClick={() => setSelectedFile(null)} className="p-1 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* In-Chat Voice Recorder Bar OR Regular Text/File Form */}
            <div className="p-3 sm:p-3.5 border-t border-slate-800 bg-[#0e1320] space-y-2">
              {isVoiceRecording ? (
                <VoiceRecorder
                  onSendVoice={handleSendVoiceNote}
                  onCancel={() => setIsVoiceRecording(false)}
                />
              ) : (
                <>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {quickSnippets.map((snip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(undefined, snip.text)}
                        className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 rounded-xl text-[10px] font-semibold flex items-center gap-1 whitespace-nowrap transition"
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>{snip.label}</span>
                      </button>
                    ))}
                  </div>

                  <form onSubmit={(e) => handleSendMessage(e)} className="flex gap-1.5 sm:gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept="application/pdf,image/*,.doc,.docx"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Прикріпити файл (PDF / Фото / Договір)"
                      className="p-2 sm:p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 border border-slate-700 rounded-2xl transition flex items-center justify-center flex-shrink-0"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsVoiceRecording(true)}
                      title="Записати голосове повідомлення"
                      className="p-2 sm:p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700 rounded-2xl transition flex items-center justify-center flex-shrink-0"
                    >
                      <Mic className="w-4 h-4" />
                    </button>

                    <input
                      type="text"
                      placeholder={`Написати у ${activeDialog.channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'}...`}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={isSendingFile}
                      className="px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-blue-600/30 flex-shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{isSendingFile ? '...' : 'Надіслати'}</span>
                    </button>
                  </form>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-500 text-xs">
            Виберіть діалог для перегляду листування
          </div>
        )}
      </div>

      {/* Right Smart Deal Mini-Sidebar */}
      {activeDeal && (
        <div className="w-72 border-l border-slate-800 p-4 bg-[#0e1320] flex-col justify-between overflow-y-auto text-xs space-y-4 hidden xl:flex">
          <div className="space-y-3.5">
            <div className="border-b border-slate-800 pb-2.5 flex items-center justify-between">
              <span className="font-bold text-white text-xs">Параметри угоди</span>
              <span className="text-emerald-400 font-extrabold text-xs px-2 py-0.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                €{activeDeal.budget || 0}
              </span>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-white text-xs truncate">{activeDeal.title}</div>
              {activeDeal.company && (
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Building2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                  <span className="truncate">{activeDeal.company.name}</span>
                </div>
              )}
              {activeDeal.contact && (
                <div className="flex items-center gap-1.5 text-slate-400">
                  <UserIcon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <span className="truncate">{activeDeal.contact.name}</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Графік оплати (4х25%):
              </span>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between items-center text-slate-300">
                  <span>1. Договір (25%):</span>
                  <span className="text-emerald-400 font-bold">Оплачено</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>2. Скринінг (25%):</span>
                  <span className="text-blue-400 font-bold">Очікується</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>3. Віза D (25%):</span>
                  <span>Очікується</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>4. Вихід на завод (25%):</span>
                  <span>Очікується</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onOpenDeal(activeDeal.id)}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition"
          >
            <span>Повна карточка угоди</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* In-App Media Viewer Lightbox & PDF Viewer Modal */}
      {viewingMedia && (
        <MediaViewerModal
          mediaUrl={viewingMedia.url}
          mediaType={viewingMedia.type}
          title={viewingMedia.title}
          onClose={() => setViewingMedia(null)}
        />
      )}

      {/* In-App Telephony & Calling Modal */}
      {activeCall && (
        <CallModal
          dealId={activeDeal?.id}
          contactName={activeCall.name}
          phoneNumber={activeCall.phone}
          companyName={activeDeal?.company?.name}
          callType={activeCall.type}
          onClose={() => setActiveCall(null)}
        />
      )}

    </div>
  );
};
