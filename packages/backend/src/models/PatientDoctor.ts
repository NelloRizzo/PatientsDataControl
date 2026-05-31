import mongoose from 'mongoose';

export interface IPatientDoctorDocument extends mongoose.Document {
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  status: 'pending' | 'active' | 'inactive' | 'rejected';
  sharedMeasurementTypes: string[];
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
      enum: ['pending', 'active', 'inactive', 'rejected'],
      default: 'pending',
    },
    sharedMeasurementTypes: {
      type: [String],
      default: ['*'],
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
