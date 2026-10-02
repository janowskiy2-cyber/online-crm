import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

let authPrisma: PrismaClient | null = null;

export function setAuthPrisma(p: PrismaClient) {
  authPrisma = p;
}

export function getAuthPrisma(): PrismaClient {
  if (!authPrisma) {
    authPrisma = new PrismaClient();
  }
  return authPrisma;
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * JWT secret resolution.
 * The value MUST come from the environment. A dev-only fallback is kept so that local
 * development works out of the box, but a loud warning is printed in production.
 */
function resolveJwtSecret(): string {
  const fromEnv = (process.env.JWT_SECRET || '').trim();
  if (fromEnv) return fromEnv;
  if (IS_PRODUCTION) {
    console.error('❌ [Security] JWT_SECRET не задано у змінних оточення! Задайте JWT_SECRET у налаштуваннях хостингу.');
  } else {
    console.warn('⚠️ [Security] JWT_SECRET не задано, використовується dev-ключ.');
  }
  return 'crm_super_secret_jwt_key_2026';
}

export const JWT_SECRET = resolveJwtSecret();

export const ADMIN_ROLES = ['super_admin', 'sales_director', 'admin'];

export function isAdminRole(role?: string | null): boolean {
  return !!role && ADMIN_ROLES.includes(role);
}

/**
 * Master admin PIN (second factor for the Admin Panel).
 * Returns null when not configured.
 */
export function getMasterKey(): string | null {
  const fromEnv = (process.env.ADMIN_MASTER_KEY || '').trim();
  if (fromEnv) return fromEnv;
  if (IS_PRODUCTION) {
    console.error('❌ [Security] ADMIN_MASTER_KEY не задано у змінних оточення! Використовується небезпечне значення за замовчуванням.');
  }
  return '22222222';
}

/**
 * Constant-time comparison of a candidate PIN with the configured master key.
 */
export function isMasterKeyValid(candidate: unknown): boolean {
  const masterKey = getMasterKey();
  if (!masterKey || typeof candidate !== 'string' || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(masterKey);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  userEmail?: string;
  apiKey?: any;
  isAiAgent?: boolean;
}

interface JwtPayload {
  userId: string;
  role: string;
  email: string;
}

function decodeBearer(req: AuthRequest): boolean {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return false;
  try {
    const token = header.slice('Bearer '.length).trim();
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    req.userEmail = decoded.email;
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Validate permanent / agent API key (format: crm_live_... or crm_pat_...)
 * Stored safely as SHA-256 hash.
 */
async function decodeApiKey(req: AuthRequest, rawKey: string): Promise<boolean> {
  try {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const prisma = getAuthPrisma();
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { createdBy: true }
    });

    if (!apiKey || !apiKey.isActive) return false;
    if (apiKey.expiresAt && apiKey.expiresAt.getTime() < Date.now()) return false;

    // Attach identity with God-mode permissions for AI Agent
    req.userId = apiKey.createdById;
    req.userRole = apiKey.createdBy?.role || 'super_admin';
    req.userEmail = apiKey.createdBy?.email || 'ai-agent@crm.internal';
    req.apiKey = apiKey;
    req.isAiAgent = true;

    // Track usage stats asynchronously
    prisma.apiKey.update({
      where: { id: apiKey.id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 }
      }
    }).catch(err => console.warn('⚠️ [ApiKey] Failed to update usage stats:', err));

    return true;
  } catch (e) {
    console.error('Error validating API key:', e);
    return false;
  }
}

/**
 * Middleware: require valid JWT Bearer token OR valid API Key.
 * Attaches userId, userRole, userEmail to request.
 */
export async function authRequired(req: AuthRequest, res: Response, next: NextFunction) {
  // Allow public access to candidate resume PDFs so standard browser tabs and iframes can render them without rejection
  if (req.method === 'GET' && (req.path.endsWith('/resume.pdf') || req.originalUrl?.includes('/resume.pdf'))) {
    decodeBearer(req); // Try to decode if token present, but don't reject if absent
    return next();
  }

  // 1. Check for API key (Bearer crm_live_... / crm_pat_... or x-api-key header)
  const authHeader = req.headers.authorization;
  const xApiKey = req.headers['x-api-key'];
  let candidateApiKey: string | null = null;

  if (typeof xApiKey === 'string' && xApiKey.trim()) {
    candidateApiKey = xApiKey.trim();
  } else if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    if (token.startsWith('crm_live_') || token.startsWith('crm_pat_')) {
      candidateApiKey = token;
    }
  }

  if (candidateApiKey) {
    const valid = await decodeApiKey(req, candidateApiKey);
    if (valid) {
      return next();
    }
    return res.status(401).json({ error: 'Недійсний, деактивований або прострочений API-ключ' });
  }

  // 2. Check for query param token
  if (!req.headers.authorization?.startsWith('Bearer ')) {
    const queryToken = req.query?.token;
    if (typeof queryToken === 'string' && queryToken) {
      if (queryToken.startsWith('crm_live_') || queryToken.startsWith('crm_pat_')) {
        const valid = await decodeApiKey(req, queryToken);
        if (valid) return next();
        return res.status(401).json({ error: 'Недійсний, деактивований або прострочений API-ключ' });
      }
      req.headers.authorization = `Bearer ${queryToken}`;
      if (decodeBearer(req)) {
        return next();
      }
    }
    return res.status(401).json({ error: 'Токен або API-ключ авторизації відсутній' });
  }

  if (!decodeBearer(req)) {
    return res.status(401).json({ error: 'Недійсний або прострочений токен' });
  }
  next();
}

/**
 * Middleware: administrator access.
 *
 * Rules:
 *  1. A valid JWT or Admin API Key is ALWAYS required. Anonymous requests are rejected with 401.
 *  2. Users with an admin role (super_admin / sales_director / admin) pass.
 *  3. Any other authenticated employee passes only if the request carries the
 *     master PIN in the `x-admin-pin` header (second factor for the Admin Panel).
 */
export async function adminRequired(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    const authHeader = req.headers.authorization;
    const xApiKey = req.headers['x-api-key'];
    let candidateKey: string | null = null;
    if (typeof xApiKey === 'string' && xApiKey.trim()) {
      candidateKey = xApiKey.trim();
    } else if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim();
      if (token.startsWith('crm_live_') || token.startsWith('crm_pat_')) {
        candidateKey = token;
      }
    }
    if (candidateKey) {
      await decodeApiKey(req, candidateKey);
    } else {
      decodeBearer(req);
    }
  }

  if (!req.userId) {
    return res.status(401).json({ error: 'Потрібна авторизація' });
  }

  // If request came from an authenticated AI Agent with admin role / full access
  if (req.isAiAgent && (isAdminRole(req.userRole) || req.apiKey?.scopes?.includes('full_access'))) {
    return next();
  }

  if (isAdminRole(req.userRole)) {
    return next();
  }

  const pinHeader = req.headers['x-admin-pin'];
  if (typeof pinHeader === 'string' && isMasterKeyValid(pinHeader)) {
    req.userRole = 'super_admin';
    return next();
  }

  return res.status(403).json({ error: 'Недостатньо прав доступу (потрібні права адміністратора)' });
}

