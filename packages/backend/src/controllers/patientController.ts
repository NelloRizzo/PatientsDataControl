import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { PatientDoctor } from '../models/PatientDoctor.js';
import { PatientNote } from '../models/PatientNote.js';
import { Anamnesis } from '../models/Anamnesis.js';
import { Measurement } from '../models/Measurement.js';
import { GdprConsent } from '../models/GdprConsent.js';
import { AppError } from '../middleware/errorHandler.js';
import { updateSharingSchema, privacyConsentSchema } from '@healthbridge/shared';

const BMI_LEVELS = [
  { min: 0, max: 18.5, label: 'Underweight', color: 'text-blue-500' },
  { min: 18.5, max: 25, label: 'Normal', color: 'text-green-600' },
  { min: 25, max: 30, label: 'Overweight', color: 'text-yellow-500' },
  { min: 30, max: 35, label: 'Obesity Class I', color: 'text-orange-500' },
  { min: 35, max: 40, label: 'Obesity Class II', color: 'text-red-500' },
  { min: 40, max: Infinity, label: 'Obesity Class III', color: 'text-red-900' },
];

export async function getBmiTimeSeries(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = (req.query.userId as string) || req.params.userId || req.userId!;
    const { from, to } = req.query as { from?: string; to?: string };

    const heightDoc = await Measurement.findOne({ userId, type: 'height' }).sort({ timestamp: -1 }).lean();
    if (!heightDoc) {
      res.json({ data: [] });
      return;
    }
    const heightCm = (heightDoc as any).values?.value;
    if (!heightCm) {
      res.json({ data: [] });
      return;
    }
    const heightM = heightCm / 100;

    const match: any = { userId: new mongoose.Types.ObjectId(userId), type: 'weight' };
    if (from || to) {
      match.timestamp = {};
      if (from) match.timestamp.$gte = new Date(from);
      if (to) match.timestamp.$lte = new Date(to);
    }

    const weights = await Measurement.find(match).sort({ timestamp: 1 }).lean();

    const data = weights.map((w: any) => {
      const weightKg = w.values?.value;
      if (!weightKg) return null;
      const bmi = weightKg / (heightM * heightM);
      return {
        timestamp: w.timestamp?.toISOString?.(),
        bmi: Math.round(bmi * 100) / 100,
        weightKg,
      };
    }).filter(Boolean);

    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getBmi(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = (req.query.userId as string) || req.params.userId || req.userId!;

    const [heightDoc, weightDoc] = await Promise.all([
      Measurement.findOne({ userId, type: 'height' }).sort({ timestamp: -1 }).lean(),
      Measurement.findOne({ userId, type: 'weight' }).sort({ timestamp: -1 }).lean(),
    ]);

    if (!heightDoc || !weightDoc) {
      res.json({ data: null, message: 'Height and weight measurements required' });
      return;
    }

    const heightCm = (heightDoc as any).values?.value;
    const weightKg = (weightDoc as any).values?.value;

    if (!heightCm || !weightKg) {
      res.json({ data: null, message: 'Invalid height or weight values' });
      return;
    }

    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);
    const level = BMI_LEVELS.find((l) => bmi >= l.min && bmi < l.max) || BMI_LEVELS[BMI_LEVELS.length - 1];

    res.json({
      data: {
        bmi: Math.round(bmi * 100) / 100,
        heightCm,
        weightKg,
        level: level.label,
        color: level.color,
        measuredAt: weightDoc.timestamp?.toISOString?.(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function myNotes(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const notes = await PatientNote.find({
      patientId: req.userId,
      showToPatient: true,
    })
      .populate('doctorId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const data = notes.map((n: any) => ({
      _id: n._id.toString(),
      content: n.content,
      doctorId: n.doctorId?._id?.toString(),
      doctorName: n.doctorId?.name,
      showToPatient: n.showToPatient,
      patientNotified: n.patientNotified,
      anamnesisId: n.anamnesisId?.toString(),
      createdAt: n.createdAt?.toISOString?.(),
      updatedAt: n.updatedAt?.toISOString?.(),
    }));

    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function myAnamnesis(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const anamneses = await Anamnesis.find({ patientId: req.userId })
      .sort({ recordedAt: -1 })
      .lean();

    const data = anamneses.map((a: any) => ({
      _id: a._id.toString(),
      patientId: a.patientId.toString(),
      recordedAt: a.recordedAt?.toISOString?.(),
      fisiologica: a.fisiologica,
      familiare: a.familiare,
      farmacologica: a.farmacologica,
      patologicaRemota: a.patologicaRemota,
      patologicaProssima: a.patologicaProssima,
      sociale: a.sociale,
      notes: a.notes,
      createdAt: a.createdAt?.toISOString?.(),
      updatedAt: a.updatedAt?.toISOString?.(),
    }));
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

// --- Doctor management ---

export async function myDoctors(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const associations = await PatientDoctor.find({ patientId: req.userId })
      .populate('doctorId', 'name email specialty')
      .sort({ status: 1, assignedAt: -1 })
      .lean();

    const data = associations
      .filter((a: any) => a.doctorId)
      .map((a: any) => ({
        _id: a._id.toString(),
        doctorId: a.doctorId._id.toString(),
        doctorName: a.doctorId.name,
        doctorEmail: a.doctorId.email,
        doctorSpecialty: a.doctorId.specialty,
        status: a.status,
        sharedMeasurementTypes: a.sharedMeasurementTypes || ['*'],
        assignedAt: a.assignedAt?.toISOString?.() || '',
      }));

    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function confirmDoctor(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { doctorId } = req.params;

    // Check GDPR consent first
    const consent = await GdprConsent.findOne({
      userId: req.userId,
      type: 'privacy_policy',
      granted: true,
    }).sort({ grantedAt: -1 }).lean();

    if (!consent) {
      throw new AppError(400, 'You must accept the privacy policy before confirming');
    }

    const association = await PatientDoctor.findOneAndUpdate(
      { patientId: req.userId, doctorId, status: 'pending' },
      { status: 'active', sharedMeasurementTypes: ['*'] },
      { new: true }
    );

    if (!association) {
      throw new AppError(404, 'No pending association found with this doctor');
    }

    // Notify the doctor
    const { Notification } = await import('../models/Notification.js');
    await Notification.create({
      userId: doctorId,
      category: 'info',
      title: 'Conferma paziente',
      body: 'Un paziente ha accettato la tua richiesta di assistenza',
      referenceId: req.userId,
      referenceModel: 'PatientDoctor',
    });

    res.json({ message: 'Association confirmed', status: 'active' });
  } catch (error) {
    next(error);
  }
}

export async function rejectDoctor(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { doctorId } = req.params;

    const association = await PatientDoctor.findOneAndUpdate(
      { patientId: req.userId, doctorId, status: 'pending' },
      { status: 'rejected' },
      { new: true }
    );

    if (!association) {
      throw new AppError(404, 'No pending association found with this doctor');
    }

    res.json({ message: 'Association rejected', status: 'rejected' });
  } catch (error) {
    next(error);
  }
}

// --- Sharing ---

export async function getDoctorSharing(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { doctorId } = req.params;

    const association = await PatientDoctor.findOne({
      patientId: req.userId,
      doctorId,
      status: { $in: ['active', 'pending'] },
    }).select('sharedMeasurementTypes status').lean();

    if (!association) {
      throw new AppError(404, 'No association found with this doctor');
    }

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

export async function updateDoctorSharing(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { doctorId } = req.params;
    const { types } = updateSharingSchema.parse(req.body);

    const association = await PatientDoctor.findOneAndUpdate(
      { patientId: req.userId, doctorId, status: 'active' },
      { sharedMeasurementTypes: types.length === 0 ? [] : types },
      { new: true }
    );

    if (!association) {
      throw new AppError(404, 'No active association found with this doctor');
    }

    res.json({
      message: 'Sharing settings updated',
      sharedMeasurementTypes: association.sharedMeasurementTypes,
    });
  } catch (error) {
    next(error);
  }
}

export async function disconnectDoctor(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { doctorId } = req.params;

    const association = await PatientDoctor.findOneAndUpdate(
      { patientId: req.userId, doctorId, status: 'active' },
      { status: 'inactive' },
      { new: true }
    );

    if (!association) {
      throw new AppError(404, 'No active association found with this doctor');
    }

    // Notify the doctor
    const { Notification } = await import('../models/Notification.js');
    await Notification.create({
      userId: doctorId,
      category: 'info',
      title: 'Paziente disconnesso',
      body: 'Un paziente ha rimosso la sua associazione',
      referenceId: req.userId,
      referenceModel: 'PatientDoctor',
    });

    res.json({ message: 'Association deactivated', status: 'inactive' });
  } catch (error) {
    next(error);
  }
}

// --- GDPR Privacy Consent ---

export async function privacyConsent(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { action } = privacyConsentSchema.parse(req.body);
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const granted = action === 'accept';

    const consent = await GdprConsent.create({
      userId: req.userId,
      type: 'privacy_policy',
      granted,
      grantedAt: new Date(),
      revokedAt: granted ? undefined : new Date(),
      ipAddress,
      userAgent,
    });

    // If revoking, freeze all active associations
    if (!granted) {
      await PatientDoctor.updateMany(
        { patientId: req.userId, status: 'active' },
        { status: 'inactive' }
      );
    }

    res.status(201).json({
      data: {
        _id: consent._id.toString(),
        type: consent.type,
        granted: consent.granted,
        grantedAt: consent.grantedAt.toISOString(),
        revokedAt: consent.revokedAt?.toISOString?.(),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getPrivacyConsentHistory(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const consents = await GdprConsent.find({
      userId: req.userId,
      type: 'privacy_policy',
    })
      .sort({ grantedAt: -1 })
      .lean();

    const data = consents.map((c) => ({
      _id: c._id.toString(),
      type: c.type,
      granted: c.granted,
      grantedAt: c.grantedAt.toISOString(),
      revokedAt: c.revokedAt?.toISOString?.(),
      ipAddress: c.ipAddress,
    }));

    res.json({ data });
  } catch (error) {
    next(error);
  }
}
