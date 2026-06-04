import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';
import { User } from '../models/User.js';
import { t } from '../services/i18n.js';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export async function authenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, t('error.auth.tokenRequired'));
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, env.jwtSecret) as { userId: string };

    const user = await User.findById(payload.userId);
    if (!user) {
      throw new AppError(401, t('error.auth.userNotFound'));
    }

    req.userId = user._id.toString();
    req.userRole = user.role;
    next();
  } catch (error) {
    if (error instanceof AppError) { next(error); return; }
    next(new AppError(401, t('error.auth.tokenExpired')));
  }
}
