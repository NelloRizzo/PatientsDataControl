import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { DeviceConnection } from '../models/DeviceConnection.js';
import { AppError } from '../middleware/errorHandler.js';
import { deviceRegistry } from '../services/device/index.js';
import { env } from '../config/env.js';

export async function listConnections(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const connections = await DeviceConnection.find({ userId: req.userId }).lean();
    res.json({ data: connections });
  } catch (error) {
    next(error);
  }
}

export async function connect(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { provider, name, accessToken, refreshToken } = req.body;
    const connection = await DeviceConnection.create({
      userId: req.userId,
      provider,
      name,
      accessToken,
      refreshToken,
    });
    res.status(201).json(connection);
  } catch (error) {
    next(error);
  }
}

export async function disconnect(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const connection = await DeviceConnection.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!connection) {
      throw new AppError(404, 'Connection not found');
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function getOAuthUrl(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { provider } = req.query as { provider?: string };
    if (!provider) throw new AppError(400, 'provider query param required');

    const devProv = deviceRegistry.get(provider);
    const redirectUri = `${env.appUrl}/api/devices/callback?provider=${provider}`;

    const state = Buffer.from(JSON.stringify({ userId: req.userId, provider })).toString('base64');
    const url = devProv.getOAuthUrl(state, redirectUri);

    res.json({ url, state });
  } catch (error) {
    next(error);
  }
}

export async function handleCallback(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { code, state, error: oauthError } = req.query as Record<string, string>;
    if (oauthError) throw new AppError(400, `OAuth error: ${oauthError}`);

    const parsed = JSON.parse(Buffer.from(state, 'base64').toString());
    const { userId, provider } = parsed;

    const devProv = deviceRegistry.get(provider);
    const redirectUri = `${env.appUrl}/api/devices/callback?provider=${provider}`;
    const tokens = await devProv.exchangeCode(code, redirectUri);

    const connection = await DeviceConnection.create({
      userId,
      provider,
      name: devProv.displayName,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    });

    res.redirect(`${env.appUrl}/profile?device=connected&provider=${provider}`);
  } catch (error) {
    next(error);
  }
}

export async function syncProvider(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { provider } = req.params;
    const devProv = deviceRegistry.get(provider);

    const connection = await DeviceConnection.findOne({ userId: req.userId, provider, active: true });
    if (!connection) throw new AppError(404, `No active ${provider} connection`);

    let token = connection.accessToken;
    if (connection.expiresAt && connection.expiresAt < new Date() && connection.refreshToken) {
      const refreshed = await devProv.refreshAccessToken(connection.refreshToken);
      token = refreshed.accessToken;
      connection.accessToken = refreshed.accessToken;
      connection.refreshToken = refreshed.refreshToken;
      connection.expiresAt = refreshed.expiresAt;
    }

    const result = await devProv.syncMeasurements(token);

    connection.lastSync = new Date();
    await connection.save();

    res.json({
      synced: result.measurements.length,
      errors: result.errors,
    });
  } catch (error) {
    next(error);
  }
}
