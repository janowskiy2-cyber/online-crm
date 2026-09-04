import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

export function createFeedRouter(prisma: PrismaClient) {
  const router = Router();

  const authorSelect = {
    id: true,
    name: true,
    avatar: true,
    role: true,
    department: true
  };

  // 1. Get all feed posts (with author and comments)
  router.get('/', async (req: AuthRequest, res) => {
    try {
      const posts = await prisma.feedPost.findMany({
        include: {
          author: { select: authorSelect },
          comments: {
            include: {
              author: { select: authorSelect }
            },
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' }
        ],
        take: 50
      });

      // Increment views asynchronously
      if (posts.length > 0) {
        const ids = posts.map(p => p.id);
        prisma.feedPost.updateMany({
          where: { id: { in: ids } },
          data: { views: { increment: 1 } }
        }).catch(() => {});
      }

      const formatted = posts.map(p => ({
        id: p.id,
        author: p.author?.name || 'Співробітник',
        authorId: p.authorId,
        authorAvatar: p.author?.avatar,
        authorRole: p.author?.role,
        recipient: p.recipient,
        type: p.type,
        date: formatFeedDate(p.createdAt),
        createdAt: p.createdAt,
        text: p.text,
        file: p.fileData ? safeParseJSON(p.fileData) : undefined,
        reactions: p.reactions ? safeParseJSON(p.reactions) : [],
        views: p.views,
        isPinned: p.isPinned,
        comments: p.comments.map(c => ({
          id: c.id,
          author: c.author?.name || 'Користувач',
          authorId: c.authorId,
          avatar: c.author?.avatar,
          date: formatFeedDate(c.createdAt),
          text: c.text,
          file: c.fileData ? safeParseJSON(c.fileData) : undefined,
          likes: c.likes
        }))
      }));

      res.json(formatted);
    } catch (e) {
      console.error('Error fetching feed posts:', e);
      res.status(500).json({ error: 'Помилка завантаження живої стрічки' });
    }
  });

  // 2. Get pinned announcements for Bitrix Right Widget
  router.get('/announcements', async (req: AuthRequest, res) => {
    try {
      const pinned = await prisma.feedPost.findMany({
        where: { isPinned: true },
        include: {
          author: { select: authorSelect }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      // If no pinned posts exist yet, return top 2 recent posts
      let results = pinned;
      if (results.length === 0) {
        results = await prisma.feedPost.findMany({
          include: {
            author: { select: authorSelect }
          },
          orderBy: { createdAt: 'desc' },
          take: 2
        });
      }

      const formatted = results.map(p => ({
        id: p.id,
        author: p.author?.name || 'Керівництво',
        role: p.author?.role || 'Команда',
        date: formatFeedDate(p.createdAt),
        title: p.text.split('\n')[0].substring(0, 70),
        text: p.text,
        avatar: p.author?.avatar
      }));

      res.json(formatted);
    } catch (e) {
      res.status(500).json({ error: 'Помилка завантаження оголошень' });
    }
  });

  // 3. Create a new feed post
  router.post('/', async (req: AuthRequest, res) => {
    try {
      const { text, recipient, type, fileData, isPinned } = req.body;
      let authorId = req.userId;

      if (!authorId) {
        const firstUser = await prisma.user.findFirst({ where: { isActive: true } });
        authorId = firstUser?.id;
      }

      if (!authorId) {
        return res.status(401).json({ error: 'Не авторизовано' });
      }

      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Текст публікації обов’язковий' });
      }

      const post = await prisma.feedPost.create({
        data: {
          authorId,
          recipient: recipient || 'Всім співробітникам',
          type: type || 'message',
          text: text.trim(),
          fileData: fileData ? JSON.stringify(fileData) : null,
          reactions: JSON.stringify([
            { type: '👍', count: 0, users: [] },
            { type: '❤️', count: 0, users: [] },
            { type: '🎉', count: 0, users: [] }
          ]),
          isPinned: !!isPinned,
          views: 1
        },
        include: {
          author: { select: authorSelect },
          comments: true
        }
      });

      res.status(201).json({
        id: post.id,
        author: post.author?.name,
        authorId: post.authorId,
        authorAvatar: post.author?.avatar,
        authorRole: post.author?.role,
        recipient: post.recipient,
        type: post.type,
        date: 'Щойно',
        createdAt: post.createdAt,
        text: post.text,
        file: fileData || undefined,
        reactions: safeParseJSON(post.reactions || '[]'),
        views: post.views,
        isPinned: post.isPinned,
        comments: []
      });
    } catch (e) {
      console.error('Error creating feed post:', e);
      res.status(500).json({ error: 'Помилка створення публікації' });
    }
  });

  // 4. Toggle reaction on a post
  router.post('/:id/reactions', async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { emoji } = req.body;
      const userId = req.userId;

      if (!userId) return res.status(401).json({ error: 'Не авторизовано' });
      if (!emoji) return res.status(400).json({ error: 'Емодзі обов’язкове' });

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      const userName = user?.name || 'Користувач';

      const post = await prisma.feedPost.findUnique({ where: { id } });
      if (!post) return res.status(404).json({ error: 'Публікація не знайдена' });

      let reactions: { type: string; count: number; users: string[] }[] = safeParseJSON(post.reactions || '[]');
      
      let found = reactions.find(r => r.type === emoji);
      if (!found) {
        found = { type: emoji, count: 0, users: [] };
        reactions.push(found);
      }

      if (found.users.includes(userName)) {
        // Remove reaction
        found.users = found.users.filter(u => u !== userName);
        found.count = Math.max(0, found.count - 1);
      } else {
        // Add reaction
        found.users.push(userName);
        found.count += 1;
      }

      await prisma.feedPost.update({
        where: { id },
        data: { reactions: JSON.stringify(reactions) }
      });

      res.json({ success: true, reactions });
    } catch (e) {
      res.status(500).json({ error: 'Помилка додавання реакції' });
    }
  });

  // 5. Add comment to a post
  router.post('/:id/comments', async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { text, fileData } = req.body;
      let authorId = req.userId;

      if (!authorId) {
        const first = await prisma.user.findFirst({ where: { isActive: true } });
        authorId = first?.id;
      }
      if (!authorId) return res.status(401).json({ error: 'Не авторизовано' });
      if (!text || !text.trim()) return res.status(400).json({ error: 'Введіть коментар' });

      const comment = await prisma.feedComment.create({
        data: {
          postId: id,
          authorId,
          text: text.trim(),
          fileData: fileData ? JSON.stringify(fileData) : null
        },
        include: {
          author: { select: authorSelect }
        }
      });

      res.status(201).json({
        id: comment.id,
        author: comment.author?.name || 'Співробітник',
        authorId: comment.authorId,
        avatar: comment.author?.avatar,
        date: 'Щойно',
        text: comment.text,
        file: fileData || undefined,
        likes: comment.likes
      });
    } catch (e) {
      res.status(500).json({ error: 'Помилка додавання коментаря' });
    }
  });

  // 6. Toggle pin status
  router.post('/:id/pin', async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const post = await prisma.feedPost.findUnique({ where: { id } });
      if (!post) return res.status(404).json({ error: 'Пост не знайдено' });

      const updated = await prisma.feedPost.update({
        where: { id },
        data: { isPinned: !post.isPinned }
      });

      res.json({ success: true, isPinned: updated.isPinned });
    } catch (e) {
      res.status(500).json({ error: 'Помилка закріплення' });
    }
  });

  return router;
}

function safeParseJSON(val: string): any {
  try {
    return JSON.parse(val);
  } catch {
    return [];
  }
}

function formatFeedDate(date: Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) {
    const mins = Math.max(1, Math.round(diffMs / (1000 * 60)));
    return `${mins} хв тому`;
  }
  if (diffHours < 24 && d.getDate() === now.getDate()) {
    return `Сьогодні о ${d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.getDate() === yesterday.getDate()) {
    return `Вчора о ${d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
