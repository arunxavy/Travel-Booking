import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../modules/auth/auth.service.js';

type Role = 'member' | 'operations' | 'admin';

export function requireAuth(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Missing or malformed Authorization header' });
      return;
    }

    const token = authHeader.slice(7);

    try {
      const payload = verifyAccessToken(token);
      req.user = { id: payload.id, role: payload.role };

      if (roles.length > 0 && !roles.includes(payload.role as Role)) {
        res.status(403).json({ message: 'Forbidden', code: 'forbidden' });
        return;
      }

      next();
    } catch (err: unknown) {
      const isExpired = (err as Error).name === 'TokenExpiredError';
      if (isExpired) {
        res.status(401).json({ message: 'Token expired', code: 'token_expired' });
      } else {
        res.status(401).json({ message: 'Invalid token' });
      }
    }
  };
}
