import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthTokens } from '@healthbridge/shared';

export function generateTokens(userId: string): AuthTokens {
  const accessToken = jwt.sign({ userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as any,
  });

  const refreshToken = jwt.sign({ userId }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn as any,
  });

  return { accessToken, refreshToken };
}

export async function registerUser(
  email: string,
  password: string,
  name: string
) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError(409, 'Email already registered');
  }

  const user = await User.create({ email, password, name });
  const tokens = generateTokens(user._id.toString());

  return { user, tokens };
}

export async function loginUser(email: string, password: string) {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError(401, 'Invalid email or password');
  }

  const tokens = generateTokens(user._id.toString());
  return { user, tokens };
}

export async function refreshTokens(refreshToken: string) {
  try {
    const payload = jwt.verify(refreshToken, env.jwtRefreshSecret) as { userId: string };
    const user = await User.findById(payload.userId);
    if (!user) {
      throw new AppError(401, 'User not found');
    }

    const tokens = generateTokens(user._id.toString());
    return { user, tokens };
  } catch {
    throw new AppError(401, 'Invalid refresh token');
  }
}
