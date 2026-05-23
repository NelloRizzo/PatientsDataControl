import mongoose from 'mongoose';

export interface IPatientDoctorDocument extends mongoose.Document {
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  status: 'active' | 'inactive';
  notifyOnNewMeasurement: boolean;
  assignedBy: mongoose.Types.ObjectId;
  assignedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const patientDoctorSchema = new mongoose.Schema<IPatientDoctorDocument>(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
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
    notifyOnNewMeasurement: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

patientDoctorSchema.index({ patientId: 1, doctorId: 1 }, { unique: true });
patientDoctorSchema.index({ doctorId: 1, status: 1 });
patientDoctorSchema.index({ patientId: 1, status: 1 });

export const PatientDoctor = mongoose.model<IPatientDoctorDocument>(
  'PatientDoctor',
  patientDoctorSchema
);
