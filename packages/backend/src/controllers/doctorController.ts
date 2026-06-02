import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Measurement } from '../models/Measurement.js';
import { PatientDoctor } from '../models/PatientDoctor.js';
import { AlertLog } from '../models/AlertLog.js';
import { AppError } from '../middleware/errorHandler.js';
import * as measurementService from '../services/measurementService.js';
import { resolvePatientIds } from '../services/filterUtils.js';
import { updateProfileSchema, createNoteSchema, doctorCreatePatientSchema, createMeasurementSchema, requestSharingSchema, resetPasswordSchema } from '@healthbridge/shared';
import { DoctorContract } from '../models/DoctorContract.js';
import { calculateConsumedSince } from '../services/contractHelper.js';
import { sendEmail } from '../services/emailService.js';
import { env } from '../config/env.js';

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
        birthCity: a.patientId.birthCity || null,
        homeAddress: a.patientId.homeAddress || null,
        legalAddress: a.patientId.legalAddress || null,
        associationId: a._id.toString(),
        status: a.status,
        sharedMeasurementTypes: a.sharedMeasurementTypes || ['*'],
        notifyOnNewMeasurement: a.notifyOnNewMeasurement,
        assignedAt: a.assignedAt?.toISOString?.() || '',
      }));

    // Batch fetch alert presence for all patients
    const patientIds = patients.map((p) => p._id);
    const alertCounts = await AlertLog.aggregate([
      { $match: { patientId: { $in: patientIds }, doctorId: req.userId, status: { $in: ['alert', 'danger'] } } },
      { $group: { _id: '$patientId', count: { $sum: 1 } } },
    ]);
    const alertMap = new Map(alertCounts.map((a) => [a._id.toString(), a.count]));

    // Batch check GDPR consent
    const { GdprConsent } = await import('../models/GdprConsent.js');
    const allConsents = await GdprConsent.find({
      userId: { $in: patientIds },
      type: 'privacy_policy',
    }).sort({ grantedAt: -1 }).lean();
    const consentMap = new Map<string, boolean>();
    for (const c of allConsents) {
      if (!consentMap.has(c.userId.toString())) {
        consentMap.set(c.userId.toString(), c.granted);
      }
    }

    const data = patients.map((p) => ({
      ...p,
      hasAlerts: (alertMap.get(p._id) || 0) > 0,
      gdprConsented: consentMap.get(p._id) ?? false,
    }));

    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function patientLatestMeasurements(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId } = req.params;
    await verifyAssociation(req.userId!, patientId);
    await verifyGdprConsent(patientId);

    const sharedTypes = await getSharedTypes(req.userId!, patientId);
    if (!sharedTypes) { res.status(403).json({ error: 'No active association' }); return; }

    const match: any = { userId: new mongoose.Types.ObjectId(patientId) };
    if (sharedTypes[0] !== '*') {
      match.type = { $in: sharedTypes };
    }

    const grouped = await Measurement.aggregate([
      { $match: match },
      { $sort: { timestamp: -1 } },
      { $group: { _id: '$type', docs: { $push: '$$ROOT' } } },
      {
        $project: {
          latest: { $arrayElemAt: ['$docs', 0] },
          previous: { $ifNull: [{ $arrayElemAt: ['$docs', 1] }, null] },
        },
      },
    ]);

    const data = grouped.map((g: any) => {
      const latest = g.latest;
      const previous = g.previous;

      const prevValues = previous?.values || null;
      const trends: Record<string, 'up' | 'down' | 'stable'> = {};

      if (prevValues && latest.values) {
        for (const [key, val] of Object.entries(latest.values) as [string, number][]) {
          const prevVal = (prevValues as Record<string, number>)?.[key];
          if (prevVal != null) {
            trends[key] = val > prevVal ? 'up' : val < prevVal ? 'down' : 'stable';
          }
        }
      }

      return {
        _id: latest._id.toString(),
        userId: latest.userId.toString(),
        type: latest.type,
        values: latest.values,
        units: latest.units,
        source: latest.source,
        timestamp: latest.timestamp,
        notes: latest.notes,
        tags: latest.tags,
        deviceId: latest.deviceId,
        evaluation: latest.evaluation,
        createdAt: latest.createdAt,
        updatedAt: latest.updatedAt,
        previousValues: prevValues,
        trends,
      };
    });

    res.json({ data });
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
    const doctorId = req.userId!;

    // If only email provided, try to add existing patient by email
    if (req.body.email && !req.body.name) {
      const existingUser = await User.findOne({ email: req.body.email.toLowerCase().trim(), role: 'patient' });
      if (!existingUser) {
        throw new AppError(404, 'Patient not found with this email. Use "Create Account" to register a new patient.');
      }

      const existingAssoc = await PatientDoctor.findOne({
        doctorId,
        patientId: existingUser._id,
      });
      if (existingAssoc) {
        if (existingAssoc.status === 'rejected') {
          throw new AppError(400, 'Patient rejected your association request previously');
        }
        throw new AppError(409, `Association already exists (status: ${existingAssoc.status})`);
      }

      // Check max patients
      const doctor = await User.findById(doctorId).select('maxPatients');
      if (doctor?.maxPatients != null) {
        const activeCount = await PatientDoctor.countDocuments({
          doctorId,
          status: { $in: ['active', 'pending'] },
        });
        if (activeCount >= doctor.maxPatients) {
          throw new AppError(403, `Maximum of ${doctor.maxPatients} patients reached. Contact admin.`);
        }
      }

        const assocTypes = req.body.sharedMeasurementTypes || ['*'];
        const association = await PatientDoctor.create({
          patientId: existingUser._id,
          doctorId,
          status: 'pending',
          assignedBy: doctorId,
          sharedMeasurementTypes: assocTypes,
        });

        res.status(201).json({
          message: 'Patient added (pending confirmation)',
          user: existingUser.toJSON(),
          associationId: association._id.toString(),
          status: 'pending',
        });
        return;
      }

      // Full create account flow
      const parsed = doctorCreatePatientSchema.parse(req.body);

    const existingUser = await User.findOne({ email: parsed.email.toLowerCase().trim() });
    if (existingUser) throw new AppError(409, 'Email already in use');

    // Check max patients limit
    const doctor = await User.findById(doctorId).select('maxPatients');
    if (doctor?.maxPatients != null) {
      const activeCount = await PatientDoctor.countDocuments({
        doctorId,
        status: { $in: ['active', 'pending'] },
      });
      if (activeCount >= doctor.maxPatients) {
        throw new AppError(403, `Maximum of ${doctor.maxPatients} patients reached. Contact admin.`);
      }
    }

    // Create user with temporary password
    const user = await User.create({
      email: parsed.email,
      password: parsed.password,
      name: parsed.name,
      role: 'patient',
      birthDate: new Date(parsed.birthDate),
      sex: parsed.sex,
      birthCity: parsed.birthCity,
      homeAddress: parsed.homeAddress,
      mustChangePassword: true,
      emailVerified: true,
    });

    // Create height measurement if provided
    if (parsed.height) {
      await Measurement.create({
        userId: user._id,
        type: 'height',
        values: { value: parsed.height },
        units: { value: 'cm' },
        source: 'manual',
      });
    }

    // Create weight measurement if provided
    if (parsed.weight) {
      await Measurement.create({
        userId: user._id,
        type: 'weight',
        values: { value: parsed.weight },
        units: { value: 'kg' },
        source: 'manual',
      });
    }

    // Send notification email
    sendEmail(parsed.email, 'Benvenuto su HealthBridge',
      `Ciao ${parsed.name},\n\nIl tuo account è stato creato dal dottore. La password temporanea ti è stata comunicata dal tuo medico.\n\nAl primo accesso ti verrà richiesto di cambiare la password.\n\nAccedi qui: ${env.appUrl}/login`
    ).catch(() => {});

    // Create association (pending)
    const assocTypes = parsed.sharedMeasurementTypes || ['*'];
    const association = await PatientDoctor.create({
      patientId: user._id,
      doctorId,
      status: 'pending',
      assignedBy: doctorId,
      sharedMeasurementTypes: assocTypes,
    });

    res.status(201).json({
      message: 'Account paziente creato',
      user: user.toJSON(),
      associationId: association._id.toString(),
      status: 'pending',
    });
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
      const existing = await User.findOne({ email: parsed.email.toLowerCase().trim(), _id: { $ne: patientId } });
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

export async function resetPatientPassword(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId } = req.params;
    await verifyAssociation(req.userId!, patientId);

    const { password } = resetPasswordSchema.parse(req.body);

    const user = await User.findById(patientId);
    if (!user) throw new AppError(404, 'Patient not found');

    user.password = password;
    user.mustChangePassword = true;
    await user.save();

    sendEmail(user.email, 'Password reimpostata — HealthBridge',
      `Ciao ${user.name},\n\nLa tua password è stata reimpostata dal tuo medico.\n\nAl prossimo accesso ti verrà richiesto di cambiarla.\n\nAccedi qui: ${env.appUrl}/login`
    );

    res.json({ message: 'Password reimpostata con successo' });
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
      showToPatient: n.showToPatient ?? false,
      patientNotified: n.patientNotified ?? false,
      anamnesisId: n.anamnesisId?.toString(),
      createdAt: n.createdAt?.toISOString?.(),
      updatedAt: n.updatedAt?.toISOString?.(),
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
    const { content, showToPatient, notifyPatient, anamnesisId } = createNoteSchema.parse(req.body);

    const noteDoc: Record<string, any> = {
      patientId,
      doctorId: req.userId,
      content,
      showToPatient: showToPatient ?? false,
      patientNotified: false,
    };
    if (anamnesisId) {
      noteDoc.anamnesisId = anamnesisId;
    }
    const note = await PatientNote.create(noteDoc);

    if (showToPatient) {
      const { Notification } = await import('../models/Notification.js');
      await Notification.create({
        userId: patientId,
        category: 'medicalnote',
        title: 'New clinical note from your doctor',
        body: content,
        referenceId: note._id,
        referenceModel: 'PatientNote',
      });
    }

    if (notifyPatient && showToPatient) {
      try {
        const patient = await User.findById(patientId).select('email name').lean();
        const doctor = await User.findById(req.userId).select('name').lean();
        if (patient?.email) {
          const { sendEmail } = await import('../services/emailService.js');
          await sendEmail(
            patient.email,
            `New clinical note from Dr. ${(doctor as any)?.name || 'your doctor'}`,
            `Dr. ${(doctor as any)?.name || 'Your doctor'} has shared a clinical note with you:\n\n${content}`
          );
          await PatientNote.updateOne({ _id: note._id }, { patientNotified: true });
        }
      } catch {
        // email failure is non-critical
      }
    }

    await note.populate('doctorId', 'name');
    const responseData = {
      _id: note._id.toString(),
      content: note.content,
      doctorId: note.doctorId?._id?.toString(),
      doctorName: (note.doctorId as any)?.name,
      showToPatient: note.showToPatient,
      patientNotified: note.patientNotified,
      anamnesisId: note.anamnesisId?.toString(),
      createdAt: note.createdAt?.toISOString?.(),
      updatedAt: note.updatedAt?.toISOString?.(),
    };
    res.status(201).json({ data: responseData });
  } catch (error) {
    next(error);
  }
}

export async function createPatientMeasurement(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId } = req.params;
    await verifyAssociation(req.userId!, patientId);

    const parsed = createMeasurementSchema.parse(req.body);
    const measurement = await Measurement.create({
      ...parsed,
      userId: patientId,
      timestamp: parsed.timestamp ? new Date(parsed.timestamp) : new Date(),
    });
    res.status(201).json({ data: measurement });
  } catch (error) {
    next(error);
  }
}

export async function requestSharing(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId } = req.params;
    await verifyAssociation(req.userId!, patientId);

    const { types } = requestSharingSchema.parse(req.body);

    const { Notification } = await import('../models/Notification.js');
    const doctor = await User.findById(req.userId).select('name').lean();

    await Notification.create({
      userId: patientId,
      category: 'info',
      title: 'Sharing request from your doctor',
      body: `Dr. ${(doctor as any)?.name || 'Your doctor'} requests access to: ${types.join(', ')}`,
      referenceId: patientId,
      referenceModel: 'SharingRequest',
    });

    res.json({ message: 'Sharing request sent to patient' });
  } catch (error) {
    next(error);
  }
}

export async function getPatientSharing(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId } = req.params;
    const association = await PatientDoctor.findOne({
      doctorId: req.userId,
      patientId,
    }).select('sharedMeasurementTypes status').lean();

    if (!association) throw new AppError(404, 'Association not found');

    res.json({
      data: {
        status: association.status,
        sharedMeasurementTypes: association.sharedMeasurementTypes || ['*'],
      },
    });
  } catch (error) {
    next(error);
  }
}

async function verifyGdprConsent(patientId: string): Promise<void> {
  const { GdprConsent } = await import('../models/GdprConsent.js');
  const consent = await GdprConsent.findOne({
    userId: patientId,
    type: 'privacy_policy',
  }).sort({ grantedAt: -1 }).lean();
  if (!consent || !consent.granted) {
    throw new AppError(403, 'Patient has not provided GDPR consent');
  }
}

async function getSharedTypes(doctorId: string, patientId: string): Promise<string[] | null> {
  const assoc = await PatientDoctor.findOne({ doctorId, patientId, status: 'active' })
    .select('sharedMeasurementTypes')
    .lean();
  if (!assoc) return null;
  return assoc.sharedMeasurementTypes || ['*'];
}

export async function patientMeasurements(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId } = req.params;
    await verifyAssociation(req.userId!, patientId);
    await verifyGdprConsent(patientId);

    const sharedTypes = await getSharedTypes(req.userId!, patientId);
    if (!sharedTypes) { res.status(403).json({ error: 'No active association' }); return; }

    const { Measurement } = await import('../models/Measurement.js');
    const { type, from, to, page = '1', limit = '20' } = req.query as Record<string, string>;

    const filter: any = { userId: patientId };
    if (type) {
      if (sharedTypes[0] !== '*' && !sharedTypes.includes(type)) {
        res.status(403).json({ error: 'This measurement type is not shared with you' });
        return;
      }
      filter.type = type;
    } else if (sharedTypes[0] !== '*') {
      filter.type = { $in: sharedTypes };
    }
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
    await verifyGdprConsent(patientId);

    const sharedTypes = await getSharedTypes(req.userId!, patientId);
    if (!sharedTypes) { res.status(403).json({ error: 'No active association' }); return; }
    const { type } = req.query as Record<string, string>;
    if (type && sharedTypes[0] !== '*' && !sharedTypes.includes(type)) {
      res.status(403).json({ error: 'This measurement type is not shared with you' });
      return;
    }

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
    await verifyGdprConsent(patientId);

    const sharedTypes = await getSharedTypes(req.userId!, patientId);
    if (!sharedTypes) { res.status(403).json({ error: 'No active association' }); return; }

    const { type, groupBy = 'day', fields, from, to, aggregation } = req.query as Record<string, string>;
    if (!type) { res.status(400).json({ error: 'Type query parameter is required' }); return; }
    if (sharedTypes[0] !== '*' && !sharedTypes.includes(type)) {
      res.status(403).json({ error: 'This measurement type is not shared with you' });
      return;
    }

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
    await verifyGdprConsent(patientId);

    const sharedTypes = await getSharedTypes(req.userId!, patientId);
    if (!sharedTypes) { res.status(403).json({ error: 'No active association' }); return; }

    const { type, from, to } = req.query as Record<string, string>;
    if (!type) { res.status(400).json({ error: 'Type query parameter is required' }); return; }
    if (sharedTypes[0] !== '*' && !sharedTypes.includes(type)) {
      res.status(403).json({ error: 'This measurement type is not shared with you' });
      return;
    }

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

export async function getContractStatus(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const contract = await DoctorContract.findOne({
      doctorId: req.userId,
      status: 'active',
    }).lean();

    if (!contract) {
      res.json({ data: null });
      return;
    }

    const sinceDate = contract.lastInvoiceDate || contract.startDate;
    const now = new Date();
    const consumedSinceInvoice = calculateConsumedSince(
      contract.fee,
      contract.feeType,
      sinceDate,
      contract.startDate,
      contract.endDate,
      contract.maxPatients || 1,
      now,
    );

    res.json({
      data: {
        contractId: contract._id.toString(),
        feeType: contract.feeType,
        fee: contract.fee,
        maxPatients: contract.maxPatients,
        lastInvoiceDate: contract.lastInvoiceDate?.toISOString?.()?.split('T')[0] || null,
        sinceDate: sinceDate.toISOString?.()?.split('T')[0],
        consumedSinceInvoice,
        currency: contract.currency || 'EUR',
        startDate: contract.startDate?.toISOString?.()?.split('T')[0],
        endDate: contract.endDate?.toISOString?.()?.split('T')[0],
      },
    });
  } catch (error) {
    next(error);
  }
}
