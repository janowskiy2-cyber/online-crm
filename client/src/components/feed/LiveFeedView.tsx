import React, { useState } from 'react';
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
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface FeedComment {
  id: string;
  author: string;
  avatar?: string;
  date: string;
  text: string;
  file?: { name: string; size: string; version?: number };
  likes: number;
}

interface FeedPost {
  id: string;
  author: string;
  recipient: string;
  date: string;
  text: string;
  file?: { name: string; size: string; version?: number };
  reactions: { type: string; count: number; users: string[] }[];
  views: number;
  comments: FeedComment[];
}

export const LiveFeedView: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'message' | 'task' | 'event' | 'poll' | 'file'>('message');
  const [postText, setPostText] = useState('');
  const [activeReactionPostId, setActiveReactionPostId] = useState<string | null>(null);

  // Comments state
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});

  const [posts, setPosts] = useState<FeedPost[]>([
    {
      id: '1',
      author: 'Наталія Грихіна',
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
      comments: [
        {
          id: 'c1',
          author: 'Катерина Шеленкова',
          date: 'Сьогодні о 10:48',
          text: 'Завантажила нову редакцію зі змінами юридичного відділу щодо відповідальності за робочу візу D.',
          file: { name: 'Новий_договір_та_КП_2026_v4.docx', size: '6.43 КБ', version: 4 },
          likes: 2
        },
        {
          id: 'c2',
          author: 'Наталія Грихіна',
          date: 'Сьогодні о 11:05',
          text: 'Дякую, прийнято в роботу! Відтепер це єдиний затверджений зразок.',
          likes: 1
        }
      ]
    },
    {
      id: '2',
      author: 'Олег Строкатий',
      recipient: 'Відділ рекрутингу',
      date: 'Вчора о 16:20',
      text: '🎉 Вітаємо команду! Перша група з 12 фахівців з Ташкента успішно перетнула кордон та вже прибула до гуртожитку заводу у Вроцлаві. Координатор зустрів, відео звіт прикріплено в картках угод.',
      reactions: [
        { type: '🎉', count: 5, users: ['Роман Яновський', 'Оксана Черезова', 'Сергій Кулєшов'] },
        { type: '👍', count: 4, users: ['Наталія Грихіна'] }
      ],
      views: 34,
      comments: [
        {
          id: 'c3',
          author: 'Роман Яновський',
          date: 'Вчора о 16:45',
          text: 'Чудова злагоджена робота відділу логістики та рекрутерів! Премії за швидкий вихід узгоджено.',
          likes: 6
        }
      ]
    }
  ]);

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim()) return;

    const newPost: FeedPost = {
      id: String(Date.now()),
      author: currentUser?.name || 'Менеджер',
      recipient: 'Всім співробітникам',
      date: 'Щойно',
      text: postText,
      reactions: [],
      views: 1,
      comments: []
    };

    setPosts([newPost, ...posts]);
    setPostText('');
  };

  const handleAddReaction = (postId: string, emoji: string) => {
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
    setActiveReactionPostId(null);
  };

  const handleAddComment = (postId: string) => {
    const text = commentInputs[postId];
    if (!text?.trim()) return;

    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return {
        ...p,
        comments: [
          ...p.comments,
          {
            id: String(Date.now()),
            author: currentUser?.name || 'Менеджер',
            date: 'Щойно',
            text: text.trim(),
            likes: 0
          }
        ]
      };
    }));

    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
  };

  const availableEmojis = ['👍', '❤️', '😆', '😮', '😢', '😡', '🎉', '🔥'];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 font-['Inter',sans-serif] select-none text-slate-100">
      
      {/* Top Publisher Canvas (Bitrix24 Live Feed Header) */}
      <div className="rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
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
            </div>

            <button
              type="submit"
              disabled={!postText.trim()}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-500/20 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Опублікувати</span>
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
            className="rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 shadow-xl space-y-4 transition hover:border-white/20"
          >
            {/* Header: Author & Recipient */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center font-bold text-xs text-white shadow-md">
                  {post.author[0]}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-bold text-white hover:text-blue-400 cursor-pointer">{post.author}</span>
                    <span className="text-slate-500">➔</span>
                    <span className="text-blue-400 font-semibold">{post.recipient}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">{post.date}</div>
                </div>
              </div>

              <button className="p-1 text-slate-500 hover:text-white rounded-lg transition">
                <MoreHorizontal className="w-4 h-4" />
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
                  <div key={comment.id} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{comment.author}</span>
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
