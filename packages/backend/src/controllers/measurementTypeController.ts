import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { MeasurementTypeConfig } from '../models/MeasurementTypeConfig.js';
import { AppError } from '../middleware/errorHandler.js';

export async function list(
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const types = await MeasurementTypeConfig.find({ active: true })
      .sort({ category: 1, name: 1 })
      .lean();
    res.json({ data: types });
  } catch (error) {
    next(error);
  }
}

export async function listAll(
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const types = await MeasurementTypeConfig.find()
      .sort({ category: 1, name: 1 })
      .lean();
    res.json({ data: types });
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
    const existing = await MeasurementTypeConfig.findOne({ key: req.body.key });
    if (existing) {
      throw new AppError(409, 'A type with this key already exists');
    }
    const type = await MeasurementTypeConfig.create(req.body);
    res.status(201).json(type);
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
    const type = await MeasurementTypeConfig.findOneAndUpdate(
      { key: req.params.key },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!type) {
      throw new AppError(404, 'Measurement type not found');
    }
    res.json(type);
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
    const type = await MeasurementTypeConfig.findOneAndDelete({ key: req.params.key });
    if (!type) {
      throw new AppError(404, 'Measurement type not found');
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
