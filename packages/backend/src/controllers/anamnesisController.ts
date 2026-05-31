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

    const data = anamneses.map((a: any) => ({
      _id: a._id.toString(),
      patientId: a.patientId.toString(),
      recordedAt: a.recordedAt?.toISOString?.(),
      fisiologica: a.fisiologica || { entries: [] },
      familiare: a.familiare || { entries: [] },
      farmacologica: a.farmacologica || { entries: [] },
      patologicaRemota: a.patologicaRemota || { entries: [] },
      patologicaProssima: a.patologicaProssima || { entries: [] },
      sociale: a.sociale || { entries: [] },
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

    const parsed = createAnamnesisSchema.parse(req.body);

    const anamnesis = await Anamnesis.create({
      patientId,
      fisiologica: parsed.fisiologica || { entries: [] },
      familiare: parsed.familiare || { entries: [] },
      farmacologica: parsed.farmacologica || { entries: [] },
      patologicaRemota: parsed.patologicaRemota || { entries: [] },
      patologicaProssima: parsed.patologicaProssima || { entries: [] },
      sociale: parsed.sociale || { entries: [] },
      notes: parsed.notes,
      recordedAt: parsed.recordedAt ? new Date(parsed.recordedAt) : new Date(),
    });

    const responseData = {
      _id: anamnesis._id.toString(),
      patientId: anamnesis.patientId.toString(),
      recordedAt: anamnesis.recordedAt?.toISOString?.(),
      fisiologica: anamnesis.fisiologica || { entries: [] },
      familiare: anamnesis.familiare || { entries: [] },
      farmacologica: anamnesis.farmacologica || { entries: [] },
      patologicaRemota: anamnesis.patologicaRemota || { entries: [] },
      patologicaProssima: anamnesis.patologicaProssima || { entries: [] },
      sociale: anamnesis.sociale || { entries: [] },
      notes: anamnesis.notes,
      createdAt: anamnesis.createdAt?.toISOString?.(),
      updatedAt: anamnesis.updatedAt?.toISOString?.(),
    };
    res.status(201).json({ data: responseData });
  } catch (error) {
    next(error);
  }
}
