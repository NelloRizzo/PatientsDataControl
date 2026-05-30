import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { DoctorContract } from '../models/DoctorContract.js';
import { PatientDoctor } from '../models/PatientDoctor.js';
import { AppError } from '../middleware/errorHandler.js';
import { monthsBetween, calculateContractFee } from '../services/contractHelper.js';

export async function listContracts(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { doctorId, status, page = '1', limit = '50' } = req.query as Record<string, string>;
    const filter: any = {};
    if (doctorId) filter.doctorId = doctorId;
    if (status) filter.status = status;

    const pageInt = Math.max(1, parseInt(page));
    const limitInt = Math.min(100, Math.max(1, parseInt(limit) || 50));

    const [docs, total] = await Promise.all([
      DoctorContract.find(filter)
        .populate('doctorId', 'name email')
        .sort({ createdAt: -1 })
        .skip((pageInt - 1) * limitInt)
        .limit(limitInt)
        .lean(),
      DoctorContract.countDocuments(filter),
    ]);

    const data = docs.map((c: any) => ({
      _id: c._id.toString(),
      doctorId: c.doctorId?._id?.toString(),
      doctorName: c.doctorId?.name,
      doctorEmail: c.doctorId?.email,
      startDate: c.startDate?.toISOString?.()?.split('T')[0],
      endDate: c.endDate?.toISOString?.()?.split('T')[0],
      maxPatients: c.maxPatients,
      fee: c.fee,
      feeType: c.feeType,
      currency: c.currency,
      notes: c.notes,
      status: c.status,
      createdAt: c.createdAt?.toISOString?.(),
    }));

    res.json({
      data,
      pagination: { page: pageInt, limit: limitInt, total, totalPages: Math.ceil(total / limitInt) },
    });
  } catch (error) {
    next(error);
  }
}

export async function createContract(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { doctorId, startDate, endDate, maxPatients, fee, feeType, currency, notes, status } = req.body;

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      throw new AppError(400, 'Invalid doctor');
    }

    if (new Date(startDate) >= new Date(endDate)) {
      throw new AppError(400, 'startDate must be before endDate');
    }

    const contract = await DoctorContract.create({
      doctorId,
      startDate,
      endDate,
      maxPatients,
      fee: fee || 0,
      feeType: feeType || 'fixed',
      currency: currency || 'EUR',
      notes,
      status: status || 'active',
    });

    // Sync User.maxPatients if contract is active
    if (contract.status === 'active') {
      await User.findByIdAndUpdate(doctorId, { maxPatients });
    }

    res.status(201).json({ data: contract.toJSON() });
  } catch (error) {
    next(error);
  }
}

export async function updateContract(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const updates: Record<string, any> = {};
    const allowedFields = ['startDate', 'endDate', 'maxPatients', 'fee', 'feeType', 'currency', 'notes', 'status'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const contract = await DoctorContract.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!contract) throw new AppError(404, 'Contract not found');

    // Sync User.maxPatients if status changed or maxPatients changed
    if (updates.status === 'active' || (contract.status === 'active' && updates.maxPatients != null)) {
      await User.findByIdAndUpdate(contract.doctorId, { maxPatients: contract.maxPatients });
    }
    if (updates.status === 'expired' || updates.status === 'cancelled') {
      // Don't reset maxPatients — admin can adjust manually
    }

    res.json({ data: contract.toJSON() });
  } catch (error) {
    next(error);
  }
}

export async function deleteContract(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const contract = await DoctorContract.findByIdAndDelete(req.params.id);
    if (!contract) throw new AppError(404, 'Contract not found');
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function invoiceContract(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const contract = await DoctorContract.findByIdAndUpdate(
      id,
      { $set: { lastInvoiceDate: new Date() } },
      { new: true }
    );
    if (!contract) throw new AppError(404, 'Contract not found');
    res.json({ data: contract.toJSON() });
  } catch (error) {
    next(error);
  }
}

export async function getContractReport(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { from, to } = req.query as Record<string, string>;
    if (!from || !to) throw new AppError(400, 'from and to query parameters are required');

    const fromDate = new Date(from);
    const toDate = new Date(to);

    const doctors = await User.find({ role: 'doctor' }).select('name email maxPatients').lean();

    const report = await Promise.all(
      doctors.map(async (doctor: any) => {
        const contracts = await DoctorContract.find({
          doctorId: doctor._id,
        }).sort({ startDate: 1 }).lean();

        const activeContractsInPeriod = contracts.filter((c: any) => {
          const cStart = new Date(c.startDate);
          const cEnd = new Date(c.endDate);
          return c.status === 'active' && cStart <= toDate && cEnd >= fromDate;
        });

        // Calculate peak concurrent active patients in period
        const peakPatients = await calculatePeakPatients(doctor._id.toString(), fromDate, toDate);

        // Calculate average active patients
        const avgPatients = await calculateAvgPatients(doctor._id.toString(), fromDate, toDate);

        let totalConsumedFee = 0;
        let totalContractFee = 0;

        const contractInfos = activeContractsInPeriod.map((c: any) => {
          const cStart = new Date(c.startDate);
          const cEnd = new Date(c.endDate);
          const overlapStart = cStart > fromDate ? cStart : fromDate;
          const overlapEnd = cEnd < toDate ? cEnd : toDate;
          const overlapMonths = monthsBetween(overlapStart, overlapEnd);
          const contractMonths = monthsBetween(cStart, cEnd);
          const { totalFee, consumedFee } = calculateContractFee(
            c.fee || 0,
            c.feeType || 'fixed',
            overlapMonths,
            contractMonths,
            c.maxPatients || 1,
          );
          totalContractFee += totalFee;
          totalConsumedFee += consumedFee;
          return {
            _id: c._id.toString(),
            startDate: c.startDate?.toISOString?.()?.split('T')[0],
            endDate: c.endDate?.toISOString?.()?.split('T')[0],
            maxPatients: c.maxPatients,
            fee: c.fee,
            feeType: c.feeType,
            currency: c.currency,
            status: c.status,
            overlapMonths: Math.round(overlapMonths * 100) / 100,
            totalFee,
            consumedFee,
          };
        });

        return {
          doctorId: doctor._id.toString(),
          doctorName: doctor.name,
          doctorEmail: doctor.email,
          contracts: contractInfos,
          actualPeakPatients: peakPatients,
          actualAvgPatients: avgPatients,
          totalFeeOwed: Math.round(totalConsumedFee * 100) / 100,
          totalContractFee: Math.round(totalContractFee * 100) / 100,
          currency: activeContractsInPeriod[0]?.currency || 'EUR',
        };
      })
    );

    res.json({ data: report, period: { from, to } });
  } catch (error) {
    next(error);
  }
}

async function calculatePeakPatients(
  doctorId: string,
  fromDate: Date,
  toDate: Date
): Promise<number> {
  // Sample at 7-day intervals to estimate peak
  const samples: number[] = [];
  const current = new Date(fromDate);
  while (current <= toDate) {
    const count = await PatientDoctor.countDocuments({
      doctorId,
      status: 'active',
      assignedAt: { $lte: current },
    });
    samples.push(count);
    current.setDate(current.getDate() + 7);
  }
  return samples.length > 0 ? Math.max(...samples) : 0;
}

async function calculateAvgPatients(
  doctorId: string,
  fromDate: Date,
  toDate: Date
): Promise<number> {
  const samples: number[] = [];
  const current = new Date(fromDate);
  while (current <= toDate) {
    const count = await PatientDoctor.countDocuments({
      doctorId,
      status: 'active',
      assignedAt: { $lte: current },
    });
    samples.push(count);
    current.setDate(current.getDate() + 7);
  }
  if (samples.length === 0) return 0;
  return Math.round((samples.reduce((a, b) => a + b, 0) / samples.length) * 10) / 10;
}
