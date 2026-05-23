export type TimeGroupBy = 'hour' | 'day' | 'week' | 'month' | 'year';

export type AggregationFunction = 'avg' | 'min' | 'max';

export type ChartType = 'line' | 'area' | 'bar';

export type PatientFilterField =
  | 'sex'
  | 'age'
  | 'homeAddress.city' | 'homeAddress.province' | 'homeAddress.region' | 'homeAddress.country'
  | 'legalAddress.city' | 'legalAddress.province' | 'legalAddress.region' | 'legalAddress.country';

export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'in';

export interface PatientFilterCondition {
  field: PatientFilterField;
  operator: FilterOperator;
  value: any;
}

export interface PatientFilterGroup {
  logic: 'and' | 'or';
  conditions: PatientFilterCondition[];
}

export interface IChartConfig {
  _id: string;
  userId: string;
  name: string;
  measurementType: string;
  groupBy: TimeGroupBy;
  aggregation: AggregationFunction;
  fields: string[];
  chartType: ChartType;
  patientFilters?: PatientFilterGroup;
  dateRange?: {
    from?: string;
    to?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateChartConfigRequest {
  name: string;
  measurementType: string;
  groupBy: TimeGroupBy;
  aggregation?: AggregationFunction;
  fields: string[];
  chartType?: ChartType;
  patientFilters?: PatientFilterGroup;
  dateRange?: {
    from?: string;
    to?: string;
  };
}

export interface TimeSeriesPoint {
  timestamp: string;
  values: Record<string, number>;
}

export interface TimeSeriesResponse {
  type: string;
  groupBy: TimeGroupBy;
  data: TimeSeriesPoint[];
}
