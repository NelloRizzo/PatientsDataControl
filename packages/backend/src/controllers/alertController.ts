import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { AlertTemplate } from '../models/AlertTemplate.js';
import { AlertLog } from '../models/AlertLog.js';
import { AppError } from '../middleware/errorHandler.js';
import { createAlertTemplateSchema, updateAlertTemplateSchema } from '@healthbridge/shared';

export async function listTemplates(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const templates = await AlertTemplate.find().sort({ measurementType: 1, status: 1 }).lean();
    const data = templates.map((t) => ({ ...t, _id: t._id.toString() }));
    res.json({ data });
  } catch (error) { next(error); }
}

export async function createTemplate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = createAlertTemplateSchema.parse(req.body);
    const existing = await AlertTemplate.findOne({ measurementType: parsed.measurementType, status: parsed.status });
    if (existing) throw new AppError(409, 'Template already exists for this type and status');

    const doc = await AlertTemplate.create(parsed);
    res.status(201).json({ data: { ...doc.toObject(), _id: doc._id.toString() } });
  } catch (error) { next(error); }
}

export async function updateTemplate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = updateAlertTemplateSchema.parse(req.body);
    const doc = await AlertTemplate.findByIdAndUpdate(req.params.id, parsed, { new: true, runValidators: true });
    if (!doc) throw new AppError(404, 'Template not found');
    res.json({ data: { ...doc.toObject(), _id: doc._id.toString() } });
  } catch (error) { next(error); }
}

export async function deleteTemplate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const doc = await AlertTemplate.findByIdAndDelete(req.params.id);
    if (!doc) throw new AppError(404, 'Template not found');
    res.status(204).end();
  } catch (error) { next(error); }
}

export async function listLogs(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const filter: any = {};
    if (req.userRole === 'doctor') {
      filter.doctorId = req.userId;
    }

    const logs = await AlertLog.find(filter)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email')
      .sort({ sentAt: -1 })
      .limit(100)
      .lean();

    const data = logs.map((l: any) => ({
      _id: l._id.toString(),
      patientId: l.patientId?._id?.toString(),
      patientName: l.patientId?.name,
      doctorId: l.doctorId?._id?.toString(),
      doctorName: l.doctorId?.name,
      measurementId: l.measurementId?.toString(),
      measurementType: l.measurementType,
      status: l.status,
      field: l.field,
      value: l.value,
      unit: l.unit,
      message: l.message,
      channel: l.channel,
      delivered: l.delivered,
      sentAt: l.sentAt?.toISOString?.(),
    }));

    res.json({ data });
  } catch (error) { next(error); }
}
