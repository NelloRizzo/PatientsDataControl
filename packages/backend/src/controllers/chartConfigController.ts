import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { ChartConfig } from '../models/ChartConfig.js';
import { AppError } from '../middleware/errorHandler.js';
import { t } from '../services/i18n.js';

export async function list(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const configs = await ChartConfig.find({ userId: req.userId })
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ data: configs });
  } catch (error) {
    next(error);
  }
}

export async function create(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const config = await ChartConfig.create({
      userId: req.userId,
      ...req.body,
    });
    res.status(201).json(config);
  } catch (error) {
    next(error);
  }
}

export async function update(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const config = await ChartConfig.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!config) {
      throw new AppError(404, t('error.chartConfig.notFound'));
    }
    res.json(config);
  } catch (error) {
    next(error);
  }
}

export async function remove(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const config = await ChartConfig.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!config) {
      throw new AppError(404, t('error.chartConfig.notFound'));
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
