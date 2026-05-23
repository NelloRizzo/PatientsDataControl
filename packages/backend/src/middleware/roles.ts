import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';
import { AppError } from './errorHandler.js';

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      throw new AppError(403, 'Insufficient permissions');
    }
    next();
  };
}
