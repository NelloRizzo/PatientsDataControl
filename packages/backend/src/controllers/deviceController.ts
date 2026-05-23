import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { DeviceConnection } from '../models/DeviceConnection.js';
import { AppError } from '../middleware/errorHandler.js';

export async function listConnections(
  req: AuthRequest,
  res: Response,
  next: NextFunction
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
  next: NextFunction
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
  next: NextFunction
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
