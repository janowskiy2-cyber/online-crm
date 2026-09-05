import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

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
 * Middleware: require valid JWT Bearer token.
 * Attaches userId, userRole, userEmail to request.
 */
export function authRequired(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.headers.authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Токен авторизації відсутній' });
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
 *  1. A valid JWT is ALWAYS required. Anonymous requests are rejected with 401.
 *  2. Users with an admin role (super_admin / sales_director / admin) pass.
 *  3. Any other authenticated employee passes only if the request carries the
 *     master PIN in the `x-admin-pin` header (second factor for the Admin Panel).
 */
export function adminRequired(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    decodeBearer(req);
  }

  if (!req.userId) {
    return res.status(401).json({ error: 'Потрібна авторизація' });
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
