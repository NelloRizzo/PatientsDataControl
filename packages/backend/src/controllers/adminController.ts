import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { PatientDoctor } from '../models/PatientDoctor.js';
import { AppError } from '../middleware/errorHandler.js';
import { registerSchema, createUserSchema, updateUserSchema } from '@healthbridge/shared';
import { generateVerificationToken } from '../services/authService.js';
import { sendVerificationEmail } from '../services/emailService.js';

export async function listUsers(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { role } = req.query as Record<string, string>;
    const filter: any = {};
    if (role) filter.role = role;
    const users = await User.find(filter).select('-password').lean();
    res.json({ data: users });
  } catch (error) {
    next(error);
  }
}

export async function assignDoctor(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { patientId, doctorId } = req.body;

    const [patient, doctor] = await Promise.all([
      User.findById(patientId),
      User.findById(doctorId),
    ]);

    if (!patient) throw new AppError(404, 'Patient not found');
    if (!doctor) throw new AppError(404, 'Doctor not found');
    if (patient.role !== 'patient') throw new AppError(400, 'User is not a patient');
    if (doctor.role !== 'doctor') throw new AppError(400, 'User is not a doctor');

    const existing = await PatientDoctor.findOne({ patientId, doctorId });
    if (existing) {
      if (existing.status === 'active') {
        throw new AppError(409, 'Association already exists');
      }
      existing.status = 'active';
      existing.assignedBy = req.userId as any;
      existing.assignedAt = new Date();
      await existing.save();
      res.json(existing);
      return;
    }

    const association = await PatientDoctor.create({
      patientId,
      doctorId,
      assignedBy: req.userId,
    });
    res.status(201).json(association);
  } catch (error) {
    next(error);
  }
}

export async function removeAssociation(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const association = await PatientDoctor.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    );
    if (!association) throw new AppError(404, 'Association not found');
    res.json(association);
  } catch (error) {
    next(error);
  }
}

export async function createUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = createUserSchema.parse(req.body);
    const existing = await User.findOne({ email: parsed.email.toLowerCase() });
    if (existing) throw new AppError(409, 'Email already registered');

    const user = await User.create(parsed);
    const token = await generateVerificationToken(user._id.toString());
    await sendVerificationEmail(user.email, token);
    res.status(201).json({ data: user.toJSON() });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = updateUserSchema.parse(req.body);
    const { id } = req.params;

    if (parsed.email) {
      const existing = await User.findOne({ email: parsed.email.toLowerCase(), _id: { $ne: id } });
      if (existing) throw new AppError(409, 'Email already in use');
    }

    if (parsed.password) {
      const user = await User.findById(id);
      if (!user) throw new AppError(404, 'User not found');
      user.password = parsed.password;
      user.set(parsed);
      await user.save();
      res.json({ data: user.toJSON() });
      return;
    }

    const user = await User.findByIdAndUpdate(id, parsed, { new: true }).select('-password');
    if (!user) throw new AppError(404, 'User not found');
    res.json({ data: user });
  } catch (error) {
    next(error);
  }
}

const SYSTEM_ADMIN_EMAIL = 'admin@healthbridge.com';

export async function deleteUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    if (id === req.userId?.toString()) throw new AppError(400, 'Cannot delete yourself');

    const target = await User.findById(id).select('email');
    if (target?.email === SYSTEM_ADMIN_EMAIL) throw new AppError(403, 'Cannot delete system admin');

    const user = await User.findByIdAndDelete(id);
    if (!user) throw new AppError(404, 'User not found');

    await PatientDoctor.deleteMany({
      $or: [{ patientId: id }, { doctorId: id }],
    });

    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function listAssociations(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const associations = await PatientDoctor.find()
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email')
      .lean();

    const data = associations.map((a: any) => ({
      _id: a._id.toString(),
      patientId: a.patientId?._id?.toString(),
      patientName: a.patientId?.name,
      doctorId: a.doctorId?._id?.toString(),
      doctorName: a.doctorId?.name,
      status: a.status,
      assignedBy: a.assignedBy?.toString(),
      assignedAt: a.assignedAt?.toISOString?.(),
    }));

    res.json({ data });
  } catch (error) {
    next(error);
  }
}
