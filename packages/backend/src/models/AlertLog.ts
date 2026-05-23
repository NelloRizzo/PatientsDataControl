import mongoose from 'mongoose';
import type { AlertStatus, NotificationChannelType } from '@healthbridge/shared';

export interface IAlertLogDocument extends mongoose.Document {
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  measurementId: mongoose.Types.ObjectId;
  measurementType: string;
  status: AlertStatus;
  field: string;
  value: number;
  unit: string;
  message: string;
  channel: NotificationChannelType;
  delivered: boolean;
  sentAt: Date;
  createdAt: Date;
}

const alertLogSchema = new mongoose.Schema<IAlertLogDocument>(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    measurementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Measurement', required: true },
    measurementType: { type: String, required: true },
    status: { type: String, enum: ['alert', 'danger'], required: true },
    field: { type: String, required: true },
    value: { type: Number, required: true },
    unit: { type: String, required: true },
    message: { type: String, required: true },
    channel: { type: String, enum: ['email', 'sms', 'watchapp'], required: true },
    delivered: { type: Boolean, default: false },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

alertLogSchema.index({ patientId: 1, sentAt: -1 });
alertLogSchema.index({ doctorId: 1, sentAt: -1 });
alertLogSchema.index({ measurementId: 1 });

export const AlertLog = mongoose.model<IAlertLogDocument>('AlertLog', alertLogSchema);
