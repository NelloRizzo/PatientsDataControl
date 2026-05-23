import mongoose from 'mongoose';
import type { MeasurementSource } from '@healthbridge/shared';

export interface IMeasurementDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  type: string;
  values: Record<string, number>;
  units: Record<string, string>;
  source: MeasurementSource;
  timestamp: Date;
  notes?: string;
  tags?: string[];
  deviceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const measurementSchema = new mongoose.Schema<IMeasurementDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
    },
    values: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    units: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    source: {
      type: String,
      enum: ['manual', 'fitbit', 'google_fit', 'apple_health', 'device_api', 'import'],
      default: 'manual',
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
    tags: [String],
    deviceId: String,
  },
  { timestamps: true }
);

measurementSchema.index({ userId: 1, type: 1, timestamp: -1 });

export const Measurement = mongoose.model<IMeasurementDocument>('Measurement', measurementSchema);
