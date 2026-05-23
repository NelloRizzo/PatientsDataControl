import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import * as authService from '../services/authService.js';
import { User } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { updateProfileSchema } from '@healthbridge/shared';

export async function register(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password, name } = req.body;
    const result = await authService.registerUser(email, password, name);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function login(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function refresh(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }
    const result = await authService.refreshTokens(refreshToken);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function me(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = updateProfileSchema.parse(req.body);

    if (parsed.email) {
      const existing = await User.findOne({ email: parsed.email, _id: { $ne: req.userId } });
      if (existing) throw new AppError(409, 'Email already in use');
    }

    if (parsed.password) {
      const user = await User.findById(req.userId);
      if (!user) throw new AppError(404, 'User not found');
      user.password = parsed.password;
      const { password, ...rest } = parsed;
      Object.assign(user, rest);
      await user.save();
      res.json({ data: user.toJSON() });
      return;
    }

    const user = await User.findByIdAndUpdate(req.userId, parsed, { new: true, runValidators: true }).select('-password');
    if (!user) throw new AppError(404, 'User not found');
    res.json({ data: user });
  } catch (error) {
    next(error);
  }
}
