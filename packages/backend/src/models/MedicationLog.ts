import mongoose from 'mongoose';

export interface IMedicationLogDocument extends mongoose.Document {
  prescriptionId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  takenAt: Date;
  scheduledTime: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const medicationLogSchema = new mongoose.Schema<IMedicationLogDocument>(
  {
    prescriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prescription',
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    takenAt: { type: Date, required: true, default: Date.now },
    scheduledTime: { type: String, required: true },
    notes: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true }
);

medicationLogSchema.index({ prescriptionId: 1, takenAt: -1 });

export const MedicationLog = mongoose.model<IMedicationLogDocument>(
  'MedicationLog',
  medicationLogSchema
);
