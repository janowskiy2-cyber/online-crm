import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  CheckSquare, 
  Calendar, 
  HelpCircle, 
  Paperclip, 
  Send, 
  Heart, 
  Eye, 
  Share2, 
  FileText, 
  MoreHorizontal, 
  Search, 
  Smile, 
  ThumbsUp, 
  MessageCircle,
  Download,
  Edit3,
  Filter,
  CheckCircle2,
  Sparkles,
  Pin,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

interface FeedComment {
  id: string;
  author: string;
  authorId?: string;
  avatar?: string;
  date: string;
  text: string;
  file?: { name: string; size: string; version?: number };
  likes: number;
}

interface FeedPost {
  id: string;
  author: string;
  authorId?: string;
  authorAvatar?: string;
  authorRole?: string;
  recipient: string;
  type?: string;
  date: string;
  createdAt?: string;
  text: string;
  file?: { name: string; size: string; version?: number };
  reactions: { type: string; count: number; users: string[] }[];
  views: number;
  isPinned?: boolean;
  comments: FeedComment[];
}

export const LiveFeedView: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'message' | 'task' | 'event' | 'poll' | 'file'>('message');
  const [postText, setPostText] = useState('');
  const [isPinnedPost, setIsPinnedPost] = useState(false);
  const [activeReactionPostId, setActiveReactionPostId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);

  // Comments state
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});
  const [posts, setPosts] = useState<FeedPost[]>([]);

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/feed');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setPosts(res.data);
      } else {
        // Default seed fallback if DB is initially empty
        setPosts([
          {
            id: '1',
            author: 'Наталія Грихіна',
            authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face',
            authorRole: 'Юрист (Візи)',
            recipient: 'Всім співробітникам',
            date: 'Сьогодні о 10:35',
            text: 'Шановні колеги! Оновили шаблон комерційної пропозиції для заводів та додали новий розрахунок траншів 4х25%. Прохання ознайомитися та використовувати в роботі з новими роботодавцями.',
            file: {
              name: 'Новий_договір_та_КП_2026.docx',
              size: '6.43 КБ',
              version: 4
            },
            reactions: [
              { type: '👍', count: 3, users: ['Катерина Шеленкова', 'Дмитро Філаткін', 'Олег Строкатий'] },
              { type: '❤️', count: 2, users: ['Оксана Черезова', 'Роман Яновський'] }
            ],
            views: 18,
            isPinned: true,
            comments: [
              {
                id: 'c1',
                author: 'Катерина Шеленкова',
                avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
                date: 'Сьогодні о 10:48',
                text: 'Завантажила нову редакцію зі змінами юридичного відділу щодо відповідальності за робочу візу D.',
                likes: 2
              }
            ]
          }
        ]);
      }
    } catch (e) {
      console.warn('Live feed fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim() || isPosting) return;

    try {
      setIsPosting(true);
      const res = await api.post('/feed', {
        text: postText.trim(),
        recipient: 'Всім співробітникам',
        type: activeTab,
        isPinned: isPinnedPost
      });

      if (res.data) {
        setPosts(prev => [res.data, ...prev]);
        setPostText('');
        setIsPinnedPost(false);
      }
    } catch (e) {
      alert('Помилка створення публікації в базі даних');
    } finally {
      setIsPosting(false);
    }
  };

  const handleAddReaction = async (postId: string, emoji: string) => {
    try {
      const res = await api.post(`/feed/${postId}/reactions`, { emoji });
      if (res.data?.reactions) {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, reactions: res.data.reactions } : p));
      }
    } catch (e) {
      // optimistic fallback
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p;
        const myName = currentUser?.name || 'Ви';
        const existing = p.reactions.find(r => r.type === emoji);
        let updatedReactions = [...p.reactions];

        if (existing) {
          if (existing.users.includes(myName)) {
            updatedReactions = updatedReactions.map(r => 
              r.type === emoji ? { ...r, count: r.count - 1, users: r.users.filter(u => u !== myName) } : r
            ).filter(r => r.count > 0);
          } else {
            updatedReactions = updatedReactions.map(r => 
              r.type === emoji ? { ...r, count: r.count + 1, users: [...r.users, myName] } : r
            );
          }
        } else {
          updatedReactions.push({ type: emoji, count: 1, users: [myName] });
        }

        return { ...p, reactions: updatedReactions };
      }));
    }
    setActiveReactionPostId(null);
  };

  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId];
    if (!text?.trim()) return;

    try {
      const res = await api.post(`/feed/${postId}/comments`, { text: text.trim() });
      if (res.data) {
        setPosts(prev => prev.map(p => p.id === postId ? {
          ...p,
          comments: [...p.comments, res.data]
        } : p));
        setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      }
    } catch (e) {
      alert('Помилка надсилання коментаря');
    }
  };

  const handleTogglePin = async (postId: string) => {
    try {
      const res = await api.post(`/feed/${postId}/pin`);
      if (res.data?.success) {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, isPinned: res.data.isPinned } : p));
      }
    } catch (e) {}
  };

  const availableEmojis = ['👍', '❤️', '😆', '😮', '😢', '😡', '🎉', '🔥'];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 font-['Inter',sans-serif] select-none text-slate-100">
      
      {/* Top Publisher Canvas (Bitrix24 Live Feed Header) */}
      <div className="bitrix-widget-card shadow-2xl overflow-hidden">
        {/* Action Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 px-4 pt-3 border-b border-white/10 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'message', label: 'Повідомлення', icon: MessageSquare },
            { id: 'task', label: 'Завдання', icon: CheckSquare },
            { id: 'event', label: 'Подія', icon: Calendar },
            { id: 'poll', label: 'Опитування', icon: HelpCircle },
            { id: 'file', label: 'Файл', icon: Paperclip },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-2.5 px-3 flex items-center gap-1.5 transition whitespace-nowrap border-b-2 ${
                  isActive 
                    ? 'border-blue-500 text-blue-400 font-bold' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Input Area */}
        <form onSubmit={handleCreatePost} className="p-4 space-y-3">
          <textarea
            rows={3}
            placeholder="Написати повідомлення для команди чи відділу..."
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none resize-none"
          />

          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Одержувач:</span>
              <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                Всім співробітникам
              </span>
              <button
                type="button"
                onClick={() => setIsPinnedPost(!isPinnedPost)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                  isPinnedPost
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200 border-white/10'
                }`}
                title="Закріпити як важливе оголошення в правому віджеті"
              >
                <Pin className="w-3 h-3" />
                <span>Важливе оголошення</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={!postText.trim() || isPosting}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-500/20 flex items-center gap-1.5"
            >
              {isPosting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{isPosting ? 'Публікація...' : 'Опублікувати'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Subheader: Feed Title & Filter Search */}
      <div className="flex items-center justify-between px-2 pt-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span>Жива стрічка</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
            {posts.length} подій
          </span>
        </h2>

        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Фільтр + пошук..."
              className="pl-8 pr-4 py-1.5 bg-slate-900/60 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-48"
            />
          </div>
        </div>
      </div>

      {/* Posts Stream */}
      <div className="space-y-4">
        {posts.map(post => (
          <div 
            key={post.id}
            className="bitrix-widget-card p-5 space-y-4 transition hover:border-white/20"
          >
            {/* Header: Author & Recipient */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {post.authorAvatar ? (
                  <img
                    src={post.authorAvatar}
                    alt={post.author}
                    className="w-9 h-9 rounded-2xl object-cover border border-white/20 shadow-md flex-shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center font-bold text-xs text-white shadow-md flex-shrink-0">
                    {post.author?.[0] || 'U'}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-bold text-white hover:text-blue-400 cursor-pointer">{post.author}</span>
                    <span className="text-slate-500">➔</span>
                    <span className="text-blue-400 font-semibold">{post.recipient}</span>
                    {post.isPinned && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1">
                        <Pin className="w-2.5 h-2.5" />
                        <span>Закріплено</span>
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2">
                    <span>{post.date}</span>
                    {post.authorRole && (
                      <span className="text-slate-500">• {post.authorRole}</span>
                    )}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => handleTogglePin(post.id)}
                title={post.isPinned ? 'Відкріпити оголошення' : 'Закріпити оголошення'}
                className={`p-1.5 rounded-lg transition ${
                  post.isPinned ? 'text-amber-400 bg-amber-500/10' : 'text-slate-500 hover:text-white'
                }`}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Post Content */}
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {post.text}
            </p>

            {/* Attached Document Card (if any) */}
            {post.file && (
              <div className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-slate-200 truncate">{post.file.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {post.file.size} {post.file.version ? `• Версія ${post.file.version}` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="px-2.5 py-1 text-[11px] font-semibold text-blue-400 hover:bg-blue-500/10 rounded-lg transition">
                    Редагувати
                  </button>
                  <button className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition" title="Завантажити">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Social Action Bar & Reaction Picker */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between relative">
              <div className="flex items-center gap-3 text-xs">
                {/* Like / Reaction Button with Emoji Picker popup on hover/click */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveReactionPostId(activeReactionPostId === post.id ? null : post.id)}
                    className="flex items-center gap-1.5 font-semibold text-slate-400 hover:text-rose-400 transition"
                  >
                    <Heart className="w-4 h-4 text-rose-400" />
                    <span>Мені подобається</span>
                  </button>

                  {/* Reaction Hover Menu */}
                  {activeReactionPostId === post.id && (
                    <div className="absolute -top-12 left-0 z-30 p-1.5 bg-slate-800/95 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl flex items-center gap-1 animate-in fade-in zoom-in-95">
                      {availableEmojis.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleAddReaction(post.id, emoji)}
                          className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-base transition transform hover:scale-125"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => {
                    const el = document.getElementById(`comment-input-${post.id}`);
                    el?.focus();
                  }}
                  className="flex items-center gap-1.5 font-semibold text-slate-400 hover:text-blue-400 transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Коментувати</span>
                </button>
              </div>

              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                <Eye className="w-3.5 h-3.5" />
                <span>{post.views}</span>
              </div>
            </div>

            {/* Reaction Pill Counters */}
            {post.reactions.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {post.reactions.map((r, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddReaction(post.id, r.type)}
                    title={r.users.join(', ')}
                    className="px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 flex items-center gap-1.5 text-xs font-semibold transition"
                  >
                    <span>{r.type}</span>
                    <span className="text-slate-300 font-bold">{r.count}</span>
                    <span className="text-[10px] text-slate-400 hidden sm:inline truncate max-w-[120px]">
                      {r.users[0]}{r.users.length > 1 ? ` та ще ${r.users.length - 1}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Comments Thread */}
            {post.comments.length > 0 && (
              <div className="space-y-2.5 pt-2 pl-3 sm:pl-4 border-l-2 border-white/10">
                {post.comments.map(comment => (
                  <div key={comment.id} className="flex gap-2.5 items-start text-xs">
                    {comment.avatar ? (
                      <img
                        src={comment.avatar}
                        alt={comment.author}
                        className="w-7 h-7 rounded-xl object-cover border border-white/20 flex-shrink-0 mt-0.5"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-xl bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5">
                        {comment.author?.[0] || 'U'}
                      </div>
                    )}
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white truncate">{comment.author}</span>
                        <span className="text-[10px] text-slate-500">{comment.date}</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                        {comment.text}
                      </p>
                      {comment.file && (
                        <div className="text-[11px] text-blue-400 flex items-center gap-1 pl-1">
                          <FileText className="w-3 h-3" />
                          <span>{comment.file.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Comment Input */}
            <div className="flex items-center gap-2 pt-2">
              <input
                id={`comment-input-${post.id}`}
                type="text"
                placeholder="Написати коментар..."
                value={commentInputs[post.id] || ''}
                onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddComment(post.id);
                  }
                }}
                className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => handleAddComment(post.id)}
                className="p-2 bg-blue-600/30 hover:bg-blue-600/50 text-blue-400 border border-blue-500/40 rounded-xl transition"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
