import type { FieldEvaluation, MeasurementSource } from './common.js';

export interface IMeasurement {
  _id: string;
  userId: string;
  type: string;
  values: Record<string, number>;
  units: Record<string, string>;
  source: MeasurementSource;
  timestamp: string;
  notes?: string;
  tags?: string[];
  deviceId?: string;
  evaluation?: FieldEvaluation[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateMeasurementRequest {
  type: string;
  values: Record<string, number>;
  units: Record<string, string>;
  source?: MeasurementSource;
  timestamp?: string;
  notes?: string;
  tags?: string[];
}

export interface UpdateMeasurementRequest {
  values?: Record<string, number>;
  units?: Record<string, string>;
  timestamp?: string;
  notes?: string;
  tags?: string[];
}

export interface MeasurementStats {
  type: string;
  fields: Array<{
    key: string;
    average: number;
    min: number;
    max: number;
    unit: string;
  }>;
  count: number;
  trend: 'up' | 'down' | 'stable';
  range?: {
    from: string;
    to: string;
  };
}
