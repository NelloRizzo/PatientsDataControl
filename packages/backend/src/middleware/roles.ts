import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';
import { AppError } from './errorHandler.js';
import { t } from '../services/i18n.js';

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      throw new AppError(403, t('error.forbidden'));
    }
    next();
  };
}
