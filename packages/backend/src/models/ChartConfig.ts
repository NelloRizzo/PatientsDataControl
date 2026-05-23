import mongoose from 'mongoose';
import type { TimeGroupBy, ChartType, AggregationFunction } from '@healthbridge/shared';

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
  },
  { timestamps: true }
);

export const ChartConfig = mongoose.model<IChartConfigDocument>('ChartConfig', chartConfigSchema);
