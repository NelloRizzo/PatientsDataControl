import mongoose from 'mongoose';
import type { TimeGroupBy, ChartType, AggregationFunction, ScopeMode, CompareView, TrendMethod } from '@healthbridge/shared';

export interface IChartConfigDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  measurementType: string;
  groupBy: TimeGroupBy;
  aggregation: AggregationFunction;
  fields: string[];
  chartType: ChartType;
  dateRange?: {
    from?: string;
    to?: string;
  };
  types?: string[];
  typeAggregations?: Record<string, AggregationFunction>;
  showKpi?: boolean;
  showTrend?: boolean;
  trendMethod?: TrendMethod;
  trendWindow?: number;
  scopeMode?: ScopeMode;
  compareView?: CompareView;
  patientIds?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const chartConfigSchema = new mongoose.Schema<IChartConfigDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    measurementType: { type: String, required: true },
    groupBy: {
      type: String,
      enum: ['hour', 'day', 'week', 'month', 'year'],
      default: 'day',
    },
    aggregation: {
      type: String,
      enum: ['avg', 'min', 'max'],
      default: 'avg',
    },
    fields: { type: [String], required: true },
    chartType: {
      type: String,
      enum: ['line', 'area', 'bar'],
      default: 'line',
    },
    dateRange: {
      from: String,
      to: String,
    },
    types: { type: [String] },
    typeAggregations: { type: Map, of: String },
    showKpi: { type: Boolean, default: true },
    showTrend: { type: Boolean, default: false },
    trendMethod: { type: String, enum: ['sma', 'linear'], default: 'sma' },
    trendWindow: { type: Number, default: 5 },
    scopeMode: { type: String, enum: ['single', 'compare', 'aggregated'], default: 'single' },
    compareView: { type: String, enum: ['overlaid', 'separate'], default: 'overlaid' },
    patientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export const ChartConfig = mongoose.model<IChartConfigDocument>('ChartConfig', chartConfigSchema);
