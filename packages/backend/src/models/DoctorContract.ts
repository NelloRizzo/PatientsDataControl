import mongoose from 'mongoose';

export interface IDoctorContractDocument extends mongoose.Document {
  doctorId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  maxPatients: number;
  fee: number;
  currency: string;
  notes?: string;
  status: 'active' | 'expired' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const doctorContractSchema = new mongoose.Schema<IDoctorContractDocument>(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    maxPatients: { type: Number, required: true, min: 1 },
    fee: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'EUR', trim: true },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active',
    },
  },
  { timestamps: true }
);

doctorContractSchema.index({ doctorId: 1, status: 1 });
doctorContractSchema.index({ doctorId: 1, startDate: 1, endDate: 1 });

export const DoctorContract = mongoose.model<IDoctorContractDocument>(
  'DoctorContract',
  doctorContractSchema
);
