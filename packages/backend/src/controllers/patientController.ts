import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { PatientNote } from '../models/PatientNote.js';

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
      createdAt: n.createdAt?.toISOString?.(),
      updatedAt: n.updatedAt?.toISOString?.(),
    }));

    res.json({ data });
  } catch (error) {
    next(error);
  }
}
