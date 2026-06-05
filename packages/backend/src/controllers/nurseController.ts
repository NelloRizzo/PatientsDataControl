import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Measurement } from '../models/Measurement.js';
import { NursePatient } from '../models/NursePatient.js';
import { AppError } from '../middleware/errorHandler.js';
import { doctorCreatePatientSchema, createMeasurementSchema, resetPasswordSchema } from '@healthbridge/shared';
import { sendEmail } from '../services/emailService.js';
import { env } from '../config/env.js';
import { t } from '../services/i18n.js';

async function verifyAssociation(nurseId: string, patientId: string) {
  const association = await NursePatient.findOne({ nurseId, patientId, status: 'active' });
  if (!association) throw new AppError(403, t('error.forbidden'));
}

export async function myPatients(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const associations = await NursePatient.find({ nurseId: req.userId })
      .populate('patientId', 'name email birthDate sex')
      .sort({ status: 1, assignedAt: -1 })
      .lean();

    const data = associations
      .filter((a: any) => a.patientId)
      .map((a: any) => ({
        _id: a.patientId._id.toString(),
        name: a.patientId.name,
        email: a.patientId.email,
        birthDate: a.patientId.birthDate?.toISOString?.() || null,
        sex: a.patientId.sex || null,
        associationId: a._id.toString(),
        status: a.status,
        assignedAt: a.assignedAt?.toISOString?.() || '',
      }));

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
    const nurseId = req.userId!;

    if (req.body.email && !req.body.name) {
      const existingUser = await User.findOne({ email: req.body.email.toLowerCase().trim(), role: 'patient' });
      if (!existingUser) {
        throw new AppError(404, t('error.patient.notFoundEmail'));
      }

      const existingAssoc = await NursePatient.findOne({ nurseId, patientId: existingUser._id });
      if (existingAssoc) {
        throw new AppError(409, t('error.association.alreadyExistsStatus', { status: existingAssoc.status }));
      }

      const association = await NursePatient.create({
        patientId: existingUser._id,
        nurseId,
        status: 'pending',
        assignedBy: nurseId,
      });

      res.status(201).json({
        message: 'Patient added (pending confirmation)',
        user: existingUser.toJSON(),
        associationId: association._id.toString(),
        status: 'pending',
      });
      return;
    }

    const parsed = doctorCreatePatientSchema.parse(req.body);

    const existingUser = await User.findOne({ email: parsed.email.toLowerCase().trim() });
    if (existingUser) throw new AppError(409, t('error.user.emailAlreadyInUse'));

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

    if (parsed.height) {
      await Measurement.create({
        userId: user._id,
        type: 'height',
        values: { value: parsed.height },
        units: { value: 'cm' },
        source: 'manual',
      });
    }

    if (parsed.weight) {
      await Measurement.create({
        userId: user._id,
        type: 'weight',
        values: { value: parsed.weight },
        units: { value: 'kg' },
        source: 'manual',
      });
    }

    sendEmail(parsed.email, t('email.welcomeSubject'),
      t('email.welcomeBody', { name: parsed.name, url: `${env.appUrl}/login` })
    ).catch(() => {});

    const association = await NursePatient.create({
      patientId: user._id,
      nurseId,
      status: 'pending',
      assignedBy: nurseId,
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

export async function patientLatestMeasurements(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId } = req.params;
    await verifyAssociation(req.userId!, patientId);

    const grouped = await Measurement.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(patientId) } },
      { $sort: { timestamp: -1 } },
      { $group: { _id: '$type', docs: { $push: '$$ROOT' } } },
      { $project: { latest: { $arrayElemAt: ['$docs', 0] } } },
    ]);

    const data = grouped.map((g: any) => ({
      _id: g.latest._id.toString(),
      type: g.latest.type,
      values: g.latest.values,
      units: g.latest.units,
      timestamp: g.latest.timestamp,
      evaluation: g.latest.evaluation,
      source: g.latest.source,
    }));

    res.json({ data });
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

    const { type, from, to, page: pageStr = '1', limit: limitStr = '20' } = req.query as Record<string, string>;
    const page = Math.max(1, parseInt(pageStr, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr, 10) || 20));
    const skip = (page - 1) * limit;

    const filter: any = { userId: new mongoose.Types.ObjectId(patientId) };
    if (type) filter.type = type;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const [docs, total] = await Promise.all([
      Measurement.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      Measurement.countDocuments(filter),
    ]);

    res.json({
      data: docs.map((d: any) => ({
        _id: d._id.toString(),
        type: d.type,
        values: d.values,
        units: d.units,
        timestamp: d.timestamp,
        source: d.source,
        notes: d.notes,
        evaluation: d.evaluation,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}

export async function patientMedications(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId } = req.params;
    await verifyAssociation(req.userId!, patientId);

    const { Prescription } = await import('../models/Prescription.js');
    const docs = await Prescription.find({ patientId, active: true })
      .sort({ startDate: -1 })
      .lean();

    const data = docs.map((d: any) => ({
      _id: d._id.toString(),
      drugName: d.drugName,
      dosage: d.dosage,
      frequency: d.frequency,
      route: d.route,
      schedule: d.schedule,
      startDate: d.startDate?.toISOString?.() || '',
      endDate: d.endDate?.toISOString?.() || null,
      notes: d.notes,
      active: d.active,
    }));

    res.json({ data });
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
    if (!user || user.role !== 'patient') throw new AppError(404, t('error.patient.notFound'));

    user.password = password;
    user.mustChangePassword = true;
    await user.save();

    res.json({ message: 'Password reimpostata con successo' });
  } catch (error) {
    next(error);
  }
}
