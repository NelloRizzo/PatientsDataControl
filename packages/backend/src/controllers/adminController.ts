import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { PatientDoctor } from '../models/PatientDoctor.js';
import { AppError } from '../middleware/errorHandler.js';
import { registerSchema, createUserSchema, updateUserSchema, resetPasswordSchema } from '@healthbridge/shared';
import { generateVerificationToken } from '../services/authService.js';
import { sendVerificationEmail, sendEmail } from '../services/emailService.js';
import { t } from '../services/i18n.js';

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

    if (!patient) throw new AppError(404, t('error.patient.notFound'));
    if (!doctor) throw new AppError(404, t('error.doctor.notFound'));
    if (patient.role !== 'patient') throw new AppError(400, t('error.patient.notPatient'));
    if (doctor.role !== 'doctor') throw new AppError(400, t('error.doctor.notDoctor'));

    const existing = await PatientDoctor.findOne({ patientId, doctorId });
    if (existing) {
      if (existing.status === 'active') {
        throw new AppError(409, t('error.association.alreadyExists'));
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
    if (!association) throw new AppError(404, t('error.association.notFound'));
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
    const existing = await User.findOne({ email: parsed.email.toLowerCase().trim() });
    if (existing) throw new AppError(409, t('error.auth.emailAlreadyRegistered'));

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
      const existing = await User.findOne({ email: parsed.email.toLowerCase().trim(), _id: { $ne: id } });
      if (existing) throw new AppError(409, t('error.user.emailAlreadyInUse'));
    }

    if (parsed.password) {
      const user = await User.findById(id);
      if (!user) throw new AppError(404, t('error.user.notFound'));
      user.password = parsed.password;
      user.set(parsed);
      await user.save();
      res.json({ data: user.toJSON() });
      return;
    }

    const user = await User.findByIdAndUpdate(id, parsed, { new: true }).select('-password');
    if (!user) throw new AppError(404, t('error.user.notFound'));
    res.json({ data: user });
  } catch (error) {
    next(error);
  }
}

export async function resetUserPassword(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { password } = resetPasswordSchema.parse(req.body);
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) throw new AppError(404, t('error.user.notFound'));
    if (user.email === SYSTEM_ADMIN_EMAIL) throw new AppError(403, t('error.user.cannotResetSystemAdmin'));

    user.password = password;
    user.mustChangePassword = true;
    await user.save();

    sendEmail(user.email, t('email.resetPasswordByAdminSubject'),
      t('email.resetPasswordByAdminBody', { name: user.name, url: `${process.env.APP_URL || 'https://patientshealthbridge-app.onrender.com'}/login` })
    );

    res.json({ message: 'Password reimpostata con successo' });
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
    if (id === req.userId?.toString()) throw new AppError(400, t('error.user.cannotDeleteSelf'));

    const target = await User.findById(id).select('email');
    if (target?.email === SYSTEM_ADMIN_EMAIL) throw new AppError(403, t('error.user.cannotDeleteSystemAdmin'));

    const user = await User.findByIdAndDelete(id);
    if (!user) throw new AppError(404, t('error.user.notFound'));

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
