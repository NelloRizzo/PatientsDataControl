import mongoose from 'mongoose';

export interface IMeasurementTypeConfigDocument extends mongoose.Document {
  key: string;
  name: string;
  description?: string;
  category: string;
  macrogroup: string;
  fields: Array<{
    key: string;
    name: string;
    unit: string;
    units: string[];
    type: 'number' | 'integer' | 'decimal';
    min?: number;
    max?: number;
    alertMin?: number;
    alertMax?: number;
    dangerMin?: number;
    dangerMax?: number;
  }>;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const fieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    name: { type: String, required: true },
    unit: { type: String, required: true },
    units: { type: [String], required: true },
    type: {
      type: String,
      enum: ['number', 'integer', 'decimal'],
      default: 'decimal',
    },
    min: Number,
    max: Number,
    alertMin: Number,
    alertMax: Number,
    dangerMin: Number,
    dangerMax: Number,
  },
  { _id: false }
);

const measurementTypeConfigSchema = new mongoose.Schema<IMeasurementTypeConfigDocument>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, required: true, trim: true },
    macrogroup: { type: String, required: true, trim: true },
    fields: { type: [fieldSchema], required: true, validate: [(v: any[]) => v.length > 0, 'At least one field required'] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const MeasurementTypeConfig = mongoose.model<IMeasurementTypeConfigDocument>(
  'MeasurementTypeConfig',
  measurementTypeConfigSchema
);
