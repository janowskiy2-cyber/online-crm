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
 * Middleware: require super_admin or sales_director role.
 * Must be used AFTER authRequired.
 */
export function adminRequired(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'super_admin' && req.userRole !== 'sales_director') {
    return res.status(403).json({ error: 'Недостатньо прав доступу' });
  }
  next();
}
