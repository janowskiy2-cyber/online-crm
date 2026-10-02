import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { AuthRequest, adminRequired } from '../middleware/auth.middleware';

export function createApiKeyRouter(prisma: PrismaClient) {
  const router = Router();

  // All endpoints require admin authorization
  router.use(adminRequired);

  /**
   * GET /api/admin/api-keys
   * List all generated API keys with usage statistics
   */
  router.get('/', async (req: AuthRequest, res: Response) => {
    try {
      const keys = await prisma.apiKey.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          scopes: true,
          isActive: true,
          lastUsedAt: true,
          usageCount: true,
          expiresAt: true,
          createdAt: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      const formatted = keys.map(k => {
        let parsedScopes: string[] = ['full_access'];
        try {
          parsedScopes = JSON.parse(k.scopes);
        } catch {}
        return {
          ...k,
          scopes: parsedScopes
        };
      });

      return res.json(formatted);
    } catch (err: any) {
      console.error('Error fetching API keys:', err);
      return res.status(500).json({ error: 'Помилка при завантаженні списку API-ключів' });
    }
  });

  /**
   * POST /api/admin/api-keys
   * Generate a new cryptographically secure API key for an AI agent
   */
  router.post('/', async (req: AuthRequest, res: Response) => {
    try {
      const { name, scopes, expiresInDays } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Вкажіть назву для AI-агента або інтеграції' });
      }

      // Generate secure 32-byte (64 hex char) random secret key
      const randomSecret = crypto.randomBytes(32).toString('hex');
      const fullKey = `crm_live_${randomSecret}`;
      const keyPrefix = `crm_live_${randomSecret.slice(0, 8)}...`;
      const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');

      let expiresAt: Date | null = null;
      if (expiresInDays && Number(expiresInDays) > 0) {
        expiresAt = new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000);
      }

      const scopesJson = Array.isArray(scopes) && scopes.length > 0 
        ? JSON.stringify(scopes) 
        : JSON.stringify(['full_access', 'deals:all', 'chats:all', 'tasks:all', 'contacts:all', 'analytics:all']);

      const createdKey = await prisma.apiKey.create({
        data: {
          name: name.trim(),
          keyPrefix,
          keyHash,
          scopes: scopesJson,
          createdById: req.userId || 'usr-admin',
          expiresAt
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          userId: req.userId || 'usr-admin',
          action: 'CREATE_API_KEY',
          entityType: 'ApiKey',
          entityId: createdKey.id,
          details: JSON.stringify({
            name: createdKey.name,
            keyPrefix,
            expiresAt
          })
        }
      }).catch(() => {});

      console.log(`🔑 [Security] Згенеровано новий API-ключ "${createdKey.name}" (${keyPrefix}) адміністратором ${req.userId}`);

      // Return fullKey ONLY ONCE here. It is never stored in plaintext anywhere.
      return res.status(201).json({
        id: createdKey.id,
        name: createdKey.name,
        key: fullKey,
        keyPrefix: createdKey.keyPrefix,
        scopes: JSON.parse(createdKey.scopes),
        expiresAt: createdKey.expiresAt,
        createdAt: createdKey.createdAt,
        createdBy: createdKey.createdBy
      });
    } catch (err: any) {
      console.error('Error creating API key:', err);
      return res.status(500).json({ error: 'Помилка при створенні API-ключа' });
    }
  });

  /**
   * POST /api/admin/api-keys/:id/toggle
   * Temporarily pause or re-activate an API key
   */
  router.post('/:id/toggle', async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const key = await prisma.apiKey.findUnique({ where: { id } });
      if (!key) return res.status(404).json({ error: 'Ключ не знайдено' });

      const updated = await prisma.apiKey.update({
        where: { id },
        data: { isActive: !key.isActive }
      });

      await prisma.auditLog.create({
        data: {
          userId: req.userId || 'usr-admin',
          action: updated.isActive ? 'ACTIVATE_API_KEY' : 'DEACTIVATE_API_KEY',
          entityType: 'ApiKey',
          entityId: id,
          details: JSON.stringify({ name: key.name, isActive: updated.isActive })
        }
      }).catch(() => {});

      return res.json({ id: updated.id, isActive: updated.isActive });
    } catch (err: any) {
      return res.status(500).json({ error: 'Помилка при зміні статусу ключа' });
    }
  });

  /**
   * DELETE /api/admin/api-keys/:id
   * Permanently revoke and delete an API key
   */
  router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const key = await prisma.apiKey.findUnique({ where: { id } });
      if (!key) return res.status(404).json({ error: 'Ключ не знайдено' });

      await prisma.apiKey.delete({ where: { id } });

      await prisma.auditLog.create({
        data: {
          userId: req.userId || 'usr-admin',
          action: 'REVOKE_API_KEY',
          entityType: 'ApiKey',
          entityId: id,
          details: JSON.stringify({ name: key.name, keyPrefix: key.keyPrefix })
        }
      }).catch(() => {});

      console.log(`🗑️ [Security] Відкликано та видалено API-ключ "${key.name}" (${key.keyPrefix})`);
      return res.json({ success: true, message: 'API-ключ успішно відкликано' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Помилка при відкликанні ключа' });
    }
  });

  return router;
}
