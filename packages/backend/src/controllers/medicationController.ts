import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import mongoose from 'mongoose';
import { Prescription } from '../models/Prescription.js';
import { MedicationLog } from '../models/MedicationLog.js';
import { PatientDoctor } from '../models/PatientDoctor.js';
import { Notification } from '../models/Notification.js';
import { sendEmail } from '../services/emailService.js';
import { AppError } from '../middleware/errorHandler.js';
import { env } from '../config/env.js';
import { t } from '../services/i18n.js';

async function verifyAssociation(doctorId: string, patientId: string) {
  const association = await PatientDoctor.findOne({
    doctorId,
    patientId,
    status: 'active',
  });
  if (!association) {
    throw new AppError(403, t('error.prescription.notAuthorized'));
  }
}

// ── Doctor endpoints ──

export async function listPatientMedications(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId } = req.params;
    await verifyAssociation(req.userId!, patientId);
    const prescriptions = await Prescription.find({ patientId })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ data: prescriptions });
  } catch (err) {
    next(err);
  }
}

export async function createPrescription(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId } = req.params;
    await verifyAssociation(req.userId!, patientId);
    const prescription = await Prescription.create({
      patientId,
      doctorId: req.userId!,
      ...req.body,
      schedule: req.body.schedule.map((s: any) => ({
        time: s.time,
        daysOfWeek: s.daysOfWeek ?? undefined,
      })),
    });
    // Notify patient of new prescription
    const populated = await Prescription.findById(prescription._id)
      .populate('doctorId', 'name')
      .lean();
    const doctorName = (populated as any)?.doctorId?.name || 'Il tuo medico';
    await Notification.create({
      userId: patientId,
      category: 'medication',
      title: `Nuova prescrizione: ${req.body.drugName}`,
      body: `${doctorName} ha prescritto ${req.body.drugName} ${req.body.dosage} — ${req.body.frequency}`,
      referenceId: prescription._id,
      referenceModel: 'Prescription',
    });
    // Send email to patient
    const { User } = await import('../models/User.js');
    const patient = await User.findById(patientId).lean();
    if (patient?.email) {
      await sendEmail(
        patient.email,
        t('email.newPrescriptionSubject', { drugName: req.body.drugName }),
        t('email.newPrescriptionBody', { doctorName, drugName: req.body.drugName, dosage: req.body.dosage, frequency: req.body.frequency, route: req.body.route, url: env.appUrl })
      );
    }
    res.status(201).json({ data: prescription });
  } catch (err) {
    next(err);
  }
}

export async function updatePrescription(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId, id } = req.params;
    await verifyAssociation(req.userId!, patientId);
    const prescription = await Prescription.findOneAndUpdate(
      { _id: id, patientId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!prescription) {
      throw new AppError(404, t('error.prescription.notFound'));
    }
    res.json({ data: prescription });
  } catch (err) {
    next(err);
  }
}

export async function deletePrescription(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId, id } = req.params;
    await verifyAssociation(req.userId!, patientId);
    const prescription = await Prescription.findOneAndDelete({ _id: id, patientId });
    if (!prescription) {
      throw new AppError(404, t('error.prescription.notFound'));
    }
    // Also delete associated logs
    await MedicationLog.deleteMany({ prescriptionId: id });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// ── Patient endpoints ──

export async function myMedications(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const now = new Date();
    const prescriptions = await Prescription.find({
      patientId: req.userId!,
      active: true,
      startDate: { $lte: now },
      $or: [
        { endDate: null },
        { endDate: { $gte: now } },
      ],
    })
      .populate('doctorId', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ data: prescriptions });
  } catch (err) {
    next(err);
  }
}

export async function getMedicationLog(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    // Verify ownership
    const prescription = await Prescription.findOne({ _id: id, patientId: req.userId! });
    if (!prescription) {
      throw new AppError(404, t('error.prescription.notFound'));
    }
    const logs = await MedicationLog.find({ prescriptionId: id })
      .sort({ takenAt: -1 })
      .limit(100)
      .lean();
    res.json({ data: logs });
  } catch (err) {
    next(err);
  }
}

export async function takeMedication(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const prescription = await Prescription.findOne({ _id: id, patientId: req.userId! });
    if (!prescription) {
      throw new AppError(404, t('error.prescription.notFound'));
    }
    const log = await MedicationLog.create({
      prescriptionId: id,
      patientId: req.userId!,
      takenAt: new Date(),
      scheduledTime: req.body.scheduledTime || 'now',
      notes: req.body.notes || '',
    });
    res.status(201).json({ data: log });
  } catch (err) {
    next(err);
  }
}

export async function dueMedications(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMin = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${currentHour}:${currentMin}`;
    const currentDay = now.getDay();

    const prescriptions = await Prescription.find({
      patientId: req.userId!,
      active: true,
      startDate: { $lte: now },
      $or: [
        { endDate: null },
        { endDate: { $gte: now } },
      ],
    }).lean();

    const due: any[] = [];
    for (const p of prescriptions) {
      for (const s of p.schedule) {
        if (s.daysOfWeek && s.daysOfWeek.length > 0 && !s.daysOfWeek.includes(currentDay)) {
          continue;
        }
        if (s.time <= currentTime) {
          // Check if already taken within last 90 minutes for this schedule time
          const windowStart = new Date(now.getTime() - 90 * 60 * 1000);
          const alreadyTaken = await MedicationLog.findOne({
            prescriptionId: p._id,
            scheduledTime: s.time,
            takenAt: { $gte: windowStart },
          });
          if (!alreadyTaken) {
            due.push({
              prescriptionId: p._id,
              drugName: p.drugName,
              dosage: p.dosage,
              frequency: p.frequency,
              route: p.route,
              scheduledTime: s.time,
            });
          }
        }
      }
    }

    // Create notifications for due medications
    for (const d of due) {
      const existing = await Notification.findOne({
        userId: req.userId!,
        category: 'medication',
        title: `È ora di prendere ${d.drugName}`,
        createdAt: { $gte: new Date(now.getTime() - 60 * 60 * 1000) },
      });
      if (!existing) {
        await Notification.create({
          userId: req.userId!,
          category: 'medication',
          title: `È ora di prendere ${d.drugName}`,
          body: `Dosaggio: ${d.dosage} — ${d.frequency}`,
          referenceId: d.prescriptionId,
          referenceModel: 'Prescription',
        });
      }
    }

    res.json({ data: due });
  } catch (err) {
    next(err);
  }
}
