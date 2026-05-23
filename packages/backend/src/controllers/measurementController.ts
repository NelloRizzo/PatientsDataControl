import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import * as measurementService from '../services/measurementService.js';

export async function create(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const measurement = await measurementService.createMeasurement(req.userId!, req.body);
    res.status(201).json(measurement);
  } catch (error) {
    next(error);
  }
}

export async function list(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { type, from, to, page = '1', limit = '20' } = req.query as Record<string, string>;
    const result = await measurementService.getMeasurements(req.userId!, {
      type: type as any,
      from,
      to,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getById(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const measurement = await measurementService.getMeasurementById(
      req.userId!,
      req.params.id
    );
    res.json(measurement);
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
    const measurement = await measurementService.updateMeasurement(
      req.userId!,
      req.params.id,
      req.body
    );
    res.json(measurement);
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
    await measurementService.deleteMeasurement(req.userId!, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function deleteAll(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { type } = req.query as Record<string, string>;
    const deleted = await measurementService.deleteAllMeasurements(req.userId!, type);
    res.json({ deleted });
  } catch (error) {
    next(error);
  }
}

export async function timeseries(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { type, groupBy = 'day', fields, from, to, aggregation } = req.query as Record<string, string>;
    if (!type) {
      res.status(400).json({ error: 'Type query parameter is required' });
      return;
    }
    const fieldList = fields ? fields.split(',').map((f: string) => f.trim()).filter(Boolean) : [];
    const result = await measurementService.getTimeSeries(req.userId!, type, groupBy as any, fieldList, { from, to }, aggregation as any);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function importCsv(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'CSV file is required' }); return; }

    const csv = file.buffer.toString('utf-8');
    const measurementType = req.body.measurementType as string;
    const patientId = req.body.patientId as string | undefined;
    const deleteExisting = req.body.deleteExisting === 'true' || req.body.deleteExisting === true;

    if (!measurementType) { res.status(400).json({ error: 'measurementType is required' }); return; }

    const result = await measurementService.importFromCsv({
      userId: req.userId!,
      userRole: req.userRole!,
      csv,
      measurementType,
      patientId,
      deleteExisting,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function stats(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { type, from, to } = req.query as Record<string, string>;
    if (!type) {
      res.status(400).json({ error: 'Type query parameter is required' });
      return;
    }
    const result = await measurementService.getMeasurementStats(req.userId!, type as any, {
      from,
      to,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}


