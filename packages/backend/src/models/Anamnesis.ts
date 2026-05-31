import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema({
  entries: [String],
}, { _id: false });

export interface IAnamnesisDocument extends mongoose.Document {
  patientId: mongoose.Types.ObjectId;
  recordedAt: Date;
  fisiologica?: { entries: string[] };
  familiare?: { entries: string[] };
  farmacologica?: { entries: string[] };
  patologicaRemota?: { entries: string[] };
  patologicaProssima?: { entries: string[] };
  sociale?: { entries: string[] };
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
    fisiologica: { type: sectionSchema },
    familiare: { type: sectionSchema },
    farmacologica: { type: sectionSchema },
    patologicaRemota: { type: sectionSchema },
    patologicaProssima: { type: sectionSchema },
    sociale: { type: sectionSchema },
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
