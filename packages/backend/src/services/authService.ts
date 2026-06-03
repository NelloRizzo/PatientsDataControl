import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendVerificationEmail } from './emailService.js';
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
  name: string,
  role?: 'doctor' | 'analyst'
) {
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw new AppError(409, 'Email already registered');
  }

  if (role && !['doctor', 'analyst'].includes(role)) {
    throw new AppError(400, 'Invalid role for self-registration');
  }
  const userRole = role || 'patient';
  if (userRole === 'patient') {
    throw new AppError(400, 'Patient registration is not available. Contact your doctor.');
  }

  const user = await User.create({ email, password, name, role: userRole });
  const tokens = generateTokens(user._id.toString());

  const token = await generateVerificationToken(user._id.toString());
  await sendVerificationEmail(email, token);

  return { user, tokens };
}

export async function loginUser(email: string, password: string) {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  const isMatch = await user.comparePassword(password.trim());
  if (!isMatch) {
    throw new AppError(401, 'Invalid email or password');
  }

  const tokens = generateTokens(user._id.toString());
  return { user, tokens, mustChangePassword: user.mustChangePassword };
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
  const user = await User.findOne({ email: email.toLowerCase().trim() });
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

export async function setPassword(token: string, newPassword: string) {
  const user = await User.findOne({
    verificationToken: token,
    verificationExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new AppError(400, 'Invalid or expired token');
  }

  user.password = newPassword;
  user.emailVerified = true;
  user.verificationToken = undefined;
  user.verificationExpires = undefined;
  await user.save();

  return { message: 'Password set successfully' };
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
  user.mustChangePassword = false;
  await user.save();

  return { message: 'Password changed successfully' };
}
