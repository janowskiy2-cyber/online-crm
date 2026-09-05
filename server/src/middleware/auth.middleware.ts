import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'crm_super_secret_jwt_key_2026';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  userEmail?: string;
}

/**
 * Middleware: require valid JWT Bearer token.
 * Attaches userId, userRole, userEmail to request.
 */
export function authRequired(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Токен авторизації відсутній' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      role: string;
      email: string;
    };
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    req.userEmail = decoded.email;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Недійсний або прострочений токен' });
  }
}

/**
 * Middleware: require super_admin or sales_director role,
 * or valid admin master PIN header (x-admin-pin: 22222222).
 * Works reliably both with and without preceding authRequired.
 */
export function adminRequired(req: AuthRequest, res: Response, next: NextFunction) {
  const masterKey = process.env.ADMIN_MASTER_KEY || '22222222';
  const pinHeader = req.headers['x-admin-pin'] || req.headers['x-admin-master-pin'];

  // 1. Direct admin PIN bypass / authorization
  if (pinHeader && pinHeader === masterKey) {
    req.userRole = 'super_admin';
    if (!req.userId) req.userId = 'usr-admin';
    return next();
  }

  // 2. Bearer JWT Token extraction if not already decoded
  if (!req.userRole) {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      try {
        const token = header.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as {
          userId: string;
          role: string;
          email: string;
        };
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        req.userEmail = decoded.email;
      } catch (err) {
        // Continue to check fallback
      }
    }
  }

  // 3. Check role
  if (req.userRole === 'super_admin' || req.userRole === 'sales_director' || req.userRole === 'admin') {
    return next();
  }

  return res.status(403).json({ error: 'Недостатньо прав доступу (потрібні права адміністратора)' });
}
