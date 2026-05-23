import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendVerificationEmail } from './emailService.js';
import type { AuthTokens } from '../../../shared/dist/index.js';

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

  const token = await generateVerificationToken(user._id.toString());
  await sendVerificationEmail(email, token);

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

export async function generateVerificationToken(userId: string): Promise<string> {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await User.findByIdAndUpdate(userId, { verificationToken, verificationExpires });
  return verificationToken;
}

export async function verifyEmailToken(token: string) {
  const user = await User.findOne({
    verificationToken: token,
    verificationExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new AppError(400, 'Invalid or expired verification token');
  }

  user.emailVerified = true;
  user.verificationToken = undefined;
  user.verificationExpires = undefined;
  await user.save();

  return { message: 'Email verified successfully' };
}

export async function resendVerification(email: string) {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError(404, 'User not found with that email');
  }

  if (user.emailVerified) {
    throw new AppError(400, 'Email is already verified');
  }

  const token = await generateVerificationToken(user._id.toString());
  await sendVerificationEmail(email, token);

  return { message: 'Verification email sent' };
}

export async function changePassword(userId: string, oldPassword: string, newPassword: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const isMatch = await user.comparePassword(oldPassword);
  if (!isMatch) {
    throw new AppError(401, 'Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  return { message: 'Password changed successfully' };
}
