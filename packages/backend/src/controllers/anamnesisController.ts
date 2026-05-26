import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { Anamnesis } from '../models/Anamnesis.js';
import { PatientDoctor } from '../models/PatientDoctor.js';
import { AppError } from '../middleware/errorHandler.js';
import { createAnamnesisSchema } from '@healthbridge/shared';

async function verifyAssociation(doctorId: string, patientId: string) {
  const assoc = await PatientDoctor.findOne({
    doctorId,
    patientId,
    status: 'active',
  });
  if (!assoc) throw new AppError(403, 'No active association with this patient');
}

export async function listAnamnesis(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId } = req.params;
    await verifyAssociation(req.userId!, patientId);

    const anamneses = await Anamnesis.find({ patientId })
      .sort({ recordedAt: -1 })
      .lean();

    const data = anamneses.map((a) => ({
      _id: a._id.toString(),
      patientId: a.patientId.toString(),
      recordedAt: a.recordedAt?.toISOString?.(),
      pathologies: a.pathologies,
      therapies: a.therapies,
      notes: a.notes,
      createdAt: a.createdAt?.toISOString?.(),
      updatedAt: a.updatedAt?.toISOString?.(),
    }));
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function createAnamnesis(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId } = req.params;
    await verifyAssociation(req.userId!, patientId);

    const { pathologies, therapies, notes, recordedAt } = createAnamnesisSchema.parse(req.body);

    const anamnesis = await Anamnesis.create({
      patientId,
      pathologies,
      therapies,
      notes,
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
    });

    const responseData = {
      _id: anamnesis._id.toString(),
      patientId: anamnesis.patientId.toString(),
      recordedAt: anamnesis.recordedAt?.toISOString?.(),
      pathologies: anamnesis.pathologies,
      therapies: anamnesis.therapies,
      notes: anamnesis.notes,
      createdAt: anamnesis.createdAt?.toISOString?.(),
      updatedAt: anamnesis.updatedAt?.toISOString?.(),
    };
    res.status(201).json({ data: responseData });
  } catch (error) {
    next(error);
  }
}
