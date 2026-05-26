import mongoose from 'mongoose';

export interface IAnamnesisDocument extends mongoose.Document {
  patientId: mongoose.Types.ObjectId;
  recordedAt: Date;
  pathologies: string;
  therapies: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const anamnesisSchema = new mongoose.Schema<IAnamnesisDocument>(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recordedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    pathologies: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    therapies: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    notes: {
      type: String,
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

anamnesisSchema.index({ patientId: 1, recordedAt: -1 });

export const Anamnesis = mongoose.model<IAnamnesisDocument>(
  'Anamnesis',
  anamnesisSchema
);
