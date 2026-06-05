import mongoose from 'mongoose';

export interface INursePatientDocument extends mongoose.Document {
  nurseId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  status: 'pending' | 'active' | 'inactive';
  assignedBy: mongoose.Types.ObjectId;
  assignedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const nursePatientSchema = new mongoose.Schema<INursePatientDocument>(
  {
    nurseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'inactive'],
      default: 'pending',
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

nursePatientSchema.index({ nurseId: 1, patientId: 1 }, { unique: true });
nursePatientSchema.index({ patientId: 1, status: 1 });
nursePatientSchema.index({ nurseId: 1, status: 1 });

export const NursePatient = mongoose.model<INursePatientDocument>('NursePatient', nursePatientSchema);
