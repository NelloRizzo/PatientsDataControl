import mongoose from 'mongoose';

export interface IPrescriptionDocument extends mongoose.Document {
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  drugName: string;
  dosage: string;
  frequency: string;
  route: string;
  schedule: { time: string; daysOfWeek?: number[] }[];
  startDate: Date;
  endDate: Date | null;
  notes: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const prescriptionSchema = new mongoose.Schema<IPrescriptionDocument>(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    drugName: { type: String, required: true, maxlength: 200 },
    dosage: { type: String, required: true, maxlength: 100 },
    frequency: { type: String, required: true, maxlength: 200 },
    route: { type: String, required: true, maxlength: 100 },
    schedule: [
      {
        time: { type: String, required: true },
        daysOfWeek: { type: [Number], default: undefined },
        _id: false,
      },
    ],
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    notes: { type: String, default: '', maxlength: 2000 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

prescriptionSchema.index({ patientId: 1, active: 1 });
prescriptionSchema.index({ doctorId: 1 });

export const Prescription = mongoose.model<IPrescriptionDocument>(
  'Prescription',
  prescriptionSchema
);
