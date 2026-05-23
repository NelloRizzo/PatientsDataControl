import mongoose from 'mongoose';

export interface IPatientNoteDocument extends mongoose.Document {
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const patientNoteSchema = new mongoose.Schema<IPatientNoteDocument>(
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
    content: {
      type: String,
      required: true,
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

patientNoteSchema.index({ patientId: 1, createdAt: -1 });

export const PatientNote = mongoose.model<IPatientNoteDocument>(
  'PatientNote',
  patientNoteSchema
);