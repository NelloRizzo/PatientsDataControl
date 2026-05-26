import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { PatientNote } from '../models/PatientNote.js';
import { Anamnesis } from '../models/Anamnesis.js';

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
