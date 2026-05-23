import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Measurement } from '../models/Measurement.js';
import { PatientDoctor } from '../models/PatientDoctor.js';
import { AlertLog } from '../models/AlertLog.js';
import { AppError } from '../middleware/errorHandler.js';
import * as measurementService from '../services/measurementService.js';
import { resolvePatientIds } from '../services/filterUtils.js';
import { updateProfileSchema, createNoteSchema } from '@healthbridge/shared';

async function verifyAssociation(doctorId: string, patientId: string) {
  const association = await PatientDoctor.findOne({
    doctorId,
    patientId,
    status: 'active',
  });
  if (!association) {
    throw new AppError(403, 'You are not authorized to view this patient\'s data');
  }
}

export async function myPatients(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const associations = await PatientDoctor.find({
      doctorId: req.userId,
    })
      .populate('patientId', 'name email birthDate sex homeAddress legalAddress')
      .sort({ status: 1, assignedAt: -1 })
      .lean();

    const patients = associations
      .filter((a: any) => a.patientId)
      .map((a: any) => ({
        _id: a.patientId._id.toString(),
        name: a.patientId.name,
        email: a.patientId.email,
        birthDate: a.patientId.birthDate?.toISOString?.() || null,
        sex: a.patientId.sex || null,
        homeAddress: a.patientId.homeAddress || null,
        legalAddress: a.patientId.legalAddress || null,
        associationId: a._id.toString(),
        status: a.status,
        notifyOnNewMeasurement: a.notifyOnNewMeasurement,
        assignedAt: a.assignedAt?.toISOString?.() || '',
      }));

    res.json({ data: patients });
  } catch (error) {
    next(error);
  }
}

export async function addPatient(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = req.body;

    const patient = await User.findOne({ email, role: 'patient' });
    if (!patient) throw new AppError(404, 'Patient not found with that email');

    const existing = await PatientDoctor.findOne({
      patientId: patient._id,
      doctorId: req.userId,
    });

    if (existing) {
      if (existing.status === 'active') {
        throw new AppError(409, 'Patient already in your list');
      }
      existing.status = 'active';
      existing.assignedBy = req.userId as any;
      existing.assignedAt = new Date();
      await existing.save();
      res.json({ message: 'Patient reactivated', associationId: existing._id.toString() });
      return;
    }

    const association = await PatientDoctor.create({
      patientId: patient._id,
      doctorId: req.userId,
      assignedBy: req.userId,
    });
    res.status(201).json({ message: 'Patient added', associationId: association._id.toString() });
  } catch (error) {
    next(error);
  }
}

export async function updatePatientAssociation(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      throw new AppError(400, 'Status must be active or inactive');
    }

    const association = await PatientDoctor.findOneAndUpdate(
      { patientId, doctorId: req.userId },
      { status },
      { new: true }
    );
    if (!association) throw new AppError(404, 'Association not found');
    res.json({ message: `Patient ${status === 'active' ? 'reactivated' : 'deactivated'}`, associationId: association._id.toString(), status });
  } catch (error) {
    next(error);
  }
}

export async function removePatientAssociation(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId } = req.params;

    const association = await PatientDoctor.findOneAndDelete({
      patientId,
      doctorId: req.userId,
    });
    if (!association) throw new AppError(404, 'Association not found');
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function toggleNotify(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId } = req.params;
    const { notifyOnNewMeasurement } = req.body;
    if (typeof notifyOnNewMeasurement !== 'boolean') {
      throw new AppError(400, 'notifyOnNewMeasurement must be a boolean');
    }
    const association = await PatientDoctor.findOneAndUpdate(
      { patientId, doctorId: req.userId },
      { notifyOnNewMeasurement },
      { new: true }
    );
    if (!association) throw new AppError(404, 'Association not found');
    res.json({ notifyOnNewMeasurement: association.notifyOnNewMeasurement });
  } catch (error) {
    next(error);
  }
}

export async function recentActivity(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { since, limit: limitStr } = req.query as Record<string, string>;
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const limitInt = Math.min(parseInt(limitStr || '50', 10) || 50, 100);

    const associations = await PatientDoctor.find({
      doctorId: req.userId,
      status: 'active',
    }).select('patientId').lean();

    const patientIds = associations.map((a) => a.patientId);

    if (patientIds.length === 0) { res.json({ data: [] }); return; }

    const docs = await Measurement.find({
      userId: { $in: patientIds },
      timestamp: { $gte: sinceDate },
    })
      .sort({ timestamp: -1 })
      .limit(limitInt)
      .populate('userId', 'name email')
      .lean();

    const data = docs.map((d: any) => ({
      _id: d._id.toString(),
      patientId: d.userId?._id?.toString?.() || d.userId.toString(),
      patientName: d.userId?.name || 'Unknown',
      type: d.type,
      values: d.values,
      timestamp: d.timestamp?.toISOString?.() || '',
      source: d.source,
    }));

    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function updatePatientProfile(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId } = req.params;
    await verifyAssociation(req.userId!, patientId);

    const parsed = updateProfileSchema.parse(req.body);

    if (parsed.email) {
      const existing = await User.findOne({ email: parsed.email, _id: { $ne: patientId } });
      if (existing) throw new AppError(409, 'Email already in use');
    }

    if (parsed.password) {
      const user = await User.findById(patientId);
      if (!user) throw new AppError(404, 'User not found');
      user.password = parsed.password;
      const { password, ...rest } = parsed;
      Object.assign(user, rest);
      await user.save();
      res.json({ data: user.toJSON() });
      return;
    }

    const user = await User.findByIdAndUpdate(patientId, parsed, { new: true, runValidators: true }).select('-password');
    if (!user) throw new AppError(404, 'User not found');
    res.json({ data: user });
  } catch (error) {
    next(error);
  }
}

export async function getPatientNotes(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId } = req.params;
    await verifyAssociation(req.userId!, patientId);

    const { PatientNote } = await import('../models/PatientNote.js');
    const notes = await PatientNote.find({ patientId })
      .populate('doctorId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const data = notes.map((n: any) => ({
      _id: n._id.toString(),
      content: n.content,
      doctorId: n.doctorId?._id?.toString(),
      doctorName: n.doctorId?.name,
      createdAt: n.createdAt?.toISOString?.(),
    }));
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function addPatientNote(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId } = req.params;
    await verifyAssociation(req.userId!, patientId);

    const { PatientNote } = await import('../models/PatientNote.js');
    const { content } = createNoteSchema.parse(req.body);

    const note = await PatientNote.create({
      patientId,
      doctorId: req.userId,
      content,
    });

    await note.populate('doctorId', 'name');
    res.status(201).json({
      data: {
        _id: note._id.toString(),
        content: note.content,
        doctorId: note.doctorId?._id?.toString(),
        doctorName: (note.doctorId as any)?.name,
        createdAt: note.createdAt?.toISOString?.(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function patientMeasurements(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId } = req.params;
    await verifyAssociation(req.userId!, patientId);

    const { Measurement } = await import('../models/Measurement.js');
    const { type, from, to, page = '1', limit = '20' } = req.query as Record<string, string>;

    const filter: any = { userId: patientId };
    if (type) filter.type = type;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const [docs, total] = await Promise.all([
      Measurement.find(filter)
        .sort({ timestamp: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
      Measurement.countDocuments(filter),
    ]);

    res.json({
      data: docs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function deletePatientMeasurements(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId } = req.params;
    await verifyAssociation(req.userId!, patientId);

    const { type } = req.query as Record<string, string>;
    const deleted = await measurementService.deleteAllMeasurements(patientId, type);
    res.json({ deleted });
  } catch (error) {
    next(error);
  }
}

export async function patientTimeseries(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId } = req.params;
    await verifyAssociation(req.userId!, patientId);

    const { type, groupBy = 'day', fields, from, to, aggregation } = req.query as Record<string, string>;
    if (!type) { res.status(400).json({ error: 'Type query parameter is required' }); return; }

    const fieldList = fields ? fields.split(',').map((f) => f.trim()).filter(Boolean) : [];
    const result = await measurementService.getTimeSeries(
      patientId, type, groupBy as any, fieldList, { from, to }, aggregation as any
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function patientStats(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId } = req.params;
    await verifyAssociation(req.userId!, patientId);

    const { type, from, to } = req.query as Record<string, string>;
    if (!type) { res.status(400).json({ error: 'Type query parameter is required' }); return; }

    const result = await measurementService.getMeasurementStats(patientId, type, { from, to });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getPatientAlerts(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId } = req.params;
    await verifyAssociation(req.userId!, patientId);

    const { page = '1', limit = '20', measurementType, status, from, to } = req.query as Record<string, string>;

    const filter: any = { patientId, doctorId: req.userId };
    if (measurementType) filter.measurementType = measurementType;
    if (status) filter.status = status;
    if (from || to) {
      filter.sentAt = {};
      if (from) filter.sentAt.$gte = new Date(from);
      if (to) filter.sentAt.$lte = new Date(to);
    }

    const pageInt = Math.max(1, parseInt(page));
    const limitInt = Math.min(100, Math.max(1, parseInt(limit) || 20));

    const [docs, total] = await Promise.all([
      AlertLog.find(filter)
        .sort({ sentAt: -1 })
        .skip((pageInt - 1) * limitInt)
        .limit(limitInt)
        .lean(),
      AlertLog.countDocuments(filter),
    ]);

    const data = docs.map((l: any) => ({
      _id: l._id.toString(),
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

    res.json({
      data,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        totalPages: Math.ceil(total / limitInt),
      },
    });
  } catch (error) { next(error); }
}

export async function aggregatedTimeseries(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      type, groupBy = 'day', fields, from, to, aggregation,
      sex, ageFrom, ageTo, filterLogic,
      homeCity, homeProvince, homeRegion, homeCountry,
      legalCity, legalProvince, legalRegion, legalCountry,
    } = req.query as Record<string, string>;

    if (!type) { res.status(400).json({ error: 'Type query parameter is required' }); return; }

    const patientFilters = buildAggregatedFilters({
      sex, ageFrom, ageTo, filterLogic,
      homeCity, homeProvince, homeRegion, homeCountry,
      legalCity, legalProvince, legalRegion, legalCountry,
    });

    const userIds = await resolvePatientIds(req.userId!, patientFilters);
    const filter: any = { type };
    if (userIds !== null) {
      if (userIds.length === 0) { res.json({ type, groupBy, data: [] }); return; }
      filter.userId = { $in: userIds };
    }

    const fieldList = fields ? fields.split(',').map((f) => f.trim()).filter(Boolean) : [];
    const result = await measurementService.getTimeSeries(
      filter, type, groupBy as any, fieldList, { from, to }, aggregation as any
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function aggregatedStats(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      type, from, to,
      sex, ageFrom, ageTo, filterLogic,
      homeCity, homeProvince, homeRegion, homeCountry,
      legalCity, legalProvince, legalRegion, legalCountry,
    } = req.query as Record<string, string>;

    if (!type) { res.status(400).json({ error: 'Type query parameter is required' }); return; }

    const patientFilters = buildAggregatedFilters({
      sex, ageFrom, ageTo, filterLogic,
      homeCity, homeProvince, homeRegion, homeCountry,
      legalCity, legalProvince, legalRegion, legalCountry,
    });

    const userIds = await resolvePatientIds(req.userId!, patientFilters);
    const filter: any = { type };
    if (userIds !== null) {
      if (userIds.length === 0) {
        res.json({ type, fields: [], count: 0, trend: 'stable' });
        return;
      }
      filter.userId = { $in: userIds };
    }

    const result = await measurementService.getMeasurementStats(filter, type, { from, to });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

function buildAggregatedFilters(params: {
  sex?: string; ageFrom?: string; ageTo?: string; filterLogic?: string;
  homeCity?: string; homeProvince?: string; homeRegion?: string; homeCountry?: string;
  legalCity?: string; legalProvince?: string; legalRegion?: string; legalCountry?: string;
}): { logic: 'and' | 'or'; conditions: any[] } | undefined {
  const conditions: any[] = [];

  const addrFields: Record<string, string | undefined> = {
    'homeAddress.city': params.homeCity,
    'homeAddress.province': params.homeProvince,
    'homeAddress.region': params.homeRegion,
    'homeAddress.country': params.homeCountry,
    'legalAddress.city': params.legalCity,
    'legalAddress.province': params.legalProvince,
    'legalAddress.region': params.legalRegion,
    'legalAddress.country': params.legalCountry,
  };

  for (const [field, value] of Object.entries(addrFields)) {
    if (value) {
      conditions.push({ field, operator: 'in', value: value.split(',').map((v) => v.trim()) });
    }
  }

  if (params.sex) {
    conditions.push({ field: 'sex', operator: 'in', value: params.sex.split(',').map((s) => s.trim()) });
  }

  if (params.ageFrom || params.ageTo) {
    const val = params.ageFrom && params.ageTo
      ? [parseInt(params.ageFrom), parseInt(params.ageTo)]
      : parseInt(params.ageFrom || params.ageTo || '0');
    conditions.push({
      field: 'age',
      operator: params.ageFrom && params.ageTo ? 'between' : params.ageFrom ? 'gte' : 'lte',
      value: val,
    });
  }

  if (conditions.length === 0) return undefined;
  return { logic: (params.filterLogic === 'or' ? 'or' : 'and') as 'and' | 'or', conditions };
}
