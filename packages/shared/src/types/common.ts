export type MeasurementSource = 'manual' | 'fitbit' | 'google_fit' | 'apple_health' | 'device_api' | 'import';

export type UnitSystem = 'metric' | 'imperial';

export type FieldThresholdStatus = 'normal' | 'alert' | 'danger';

export interface MeasurementFieldConfig {
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
}

export interface FieldEvaluation {
  key: string;
  status: FieldThresholdStatus;
  value: number;
  unit: string;
  alertMin?: number;
  alertMax?: number;
  dangerMin?: number;
  dangerMax?: number;
}

export interface IMeasurementTypeConfig {
  _id: string;
  key: string;
  name: string;
  description?: string;
  category: string;
  macrogroup: string;
  fields: MeasurementFieldConfig[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DateRangeQuery {
  from?: string;
  to?: string;
}
