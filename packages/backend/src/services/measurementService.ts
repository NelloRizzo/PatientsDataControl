import mongoose from 'mongoose';
import { parse as csvParse } from 'csv-parse/sync';
import { Measurement } from '../models/Measurement.js';
import { AppError } from '../middleware/errorHandler.js';
import { MeasurementTypeConfig } from '../models/MeasurementTypeConfig.js';
import { processAlert, sendInfoNotification } from './alertService.js';
import { t } from './i18n.js';
import type {
  CreateMeasurementRequest,
  UpdateMeasurementRequest,
  MeasurementStats,
  PaginatedResponse,
  IMeasurement,
  TimeGroupBy,
  AggregationFunction,
  TimeSeriesResponse,
  FieldEvaluation,
} from '@healthbridge/shared';

const thresholdCache = new Map<string, any>();

async function getTypeConfig(type: string) {
  if (!thresholdCache.has(type)) {
    const config = await MeasurementTypeConfig.findOne({ key: type, active: true }).lean();
    thresholdCache.set(type, config);
    setTimeout(() => thresholdCache.delete(type), 60000);
  }
  return thresholdCache.get(type);
}

function evaluateThresholds(
  values: Record<string, number>,
  typeConfig: any
): FieldEvaluation[] {
  if (!typeConfig?.fields) return [];
  return typeConfig.fields.map((field: any) => {
    const value = values[field.key];
    if (value == null) return null;

    const evaluation: FieldEvaluation = {
      key: field.key,
      status: 'normal',
      value,
      unit: field.unit,
      alertMin: field.alertMin,
      alertMax: field.alertMax,
      dangerMin: field.dangerMin,
      dangerMax: field.dangerMax,
    };

    const thresholds: Array<{ min?: number; max?: number; status: 'alert' | 'danger' }> = [
      { min: field.dangerMin, max: field.dangerMax, status: 'danger' },
      { min: field.alertMin, max: field.alertMax, status: 'alert' },
    ];

    for (const t of thresholds) {
      const exceedsMin = t.min != null && value < t.min;
      const exceedsMax = t.max != null && value > t.max;
      if (exceedsMin || exceedsMax) {
        evaluation.status = t.status;
        break;
      }
    }

    return evaluation;
  }).filter(Boolean);
}

function toJSON(doc: any): IMeasurement {
  return {
    _id: doc._id.toString(),
    userId: doc.userId.toString(),
    type: doc.type,
    values: doc.values,
    units: doc.units,
    source: doc.source,
    timestamp: doc.timestamp.toISOString(),
    notes: doc.notes,
    tags: doc.tags,
    deviceId: doc.deviceId,
    evaluation: doc.evaluation,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function createMeasurement(
  userId: string,
  data: CreateMeasurementRequest,
  userRole?: string,
  patientId?: string,
): Promise<IMeasurement> {
  const targetUserId = patientId && (userRole === 'doctor' || userRole === 'admin')
    ? determineTargetUserId(userId, userRole, patientId)
    : userId;

  const typeConfig = await getTypeConfig(data.type);
  const evaluation = typeConfig ? evaluateThresholds(data.values, typeConfig) : undefined;

  const doc = await Measurement.create({
    userId: targetUserId,
    type: data.type,
    values: data.values,
    units: data.units,
    source: data.source || 'manual',
    timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
    notes: data.notes,
    tags: data.tags,
    evaluation,
  });

  if (evaluation && evaluation.some((f) => f.status !== 'normal')) {
    processAlert(doc.userId.toString(), doc._id.toString(), data.type, evaluation, data.values).catch((err) =>
      console.error('[Alert] processAlert error:', err)
    );
  }

  sendInfoNotification(doc.userId.toString(), doc._id.toString(), data.type, data.values, typeConfig).catch((err) =>
    console.error('[Alert] sendInfoNotification error:', err)
  );

  return toJSON(doc);
}

export async function getMeasurements(
  userId: string,
  query: {
    type?: string;
    from?: string;
    to?: string;
    page: number;
    limit: number;
  }
): Promise<PaginatedResponse<IMeasurement>> {
  const filter: any = { userId };
  if (query.type) filter.type = query.type;
  if (query.from || query.to) {
    filter.timestamp = {};
    if (query.from) filter.timestamp.$gte = new Date(query.from);
    if (query.to) filter.timestamp.$lte = new Date(query.to);
  }

  const [docs, total] = await Promise.all([
    Measurement.find(filter)
      .sort({ timestamp: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    Measurement.countDocuments(filter),
  ]);

  return {
    data: docs.map(toJSON),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getMeasurementById(
  userId: string,
  measurementId: string
): Promise<IMeasurement> {
  const doc = await Measurement.findOne({ _id: measurementId, userId });
  if (!doc) {
    throw new AppError(404, t('error.measurement.notFound'));
  }
  return toJSON(doc);
}

export async function updateMeasurement(
  userId: string,
  measurementId: string,
  data: UpdateMeasurementRequest
): Promise<IMeasurement> {
  const doc = await Measurement.findOneAndUpdate(
    { _id: measurementId, userId },
    { $set: data },
    { new: true, runValidators: true }
  );
  if (!doc) {
    throw new AppError(404, t('error.measurement.notFound'));
  }
  return toJSON(doc);
}

export async function deleteMeasurement(
  userId: string,
  measurementId: string
): Promise<void> {
  const doc = await Measurement.findOneAndDelete({ _id: measurementId, userId });
  if (!doc) {
    throw new AppError(404, t('error.measurement.notFound'));
  }
}

export async function deleteAllMeasurements(
  userId: string,
  type?: string
): Promise<number> {
  const filter: any = { userId };
  if (type) filter.type = type;
  const result = await Measurement.deleteMany(filter);
  return result.deletedCount;
}

export async function importFromCsv(params: {
  userId: string;
  userRole: string;
  csv: string;
  measurementType: string;
  patientId?: string;
  deleteExisting?: boolean;
}): Promise<{ imported: number; errors: { row: number; error: string }[] }> {
  const { userId, userRole, csv, measurementType, deleteExisting } = params;

  const resolvedUserId = determineTargetUserId(userId, userRole, params.patientId);
  const typeConfig = await MeasurementTypeConfig.findOne({ key: measurementType, active: true }).lean();
  if (!typeConfig) { return { imported: 0, errors: [{ row: 0, error: `Unknown measurement type: ${measurementType}` }] }; }

  const fieldKeys = typeConfig.fields.map((f: any) => f.key);
  const records: any[] = csvParse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  const errors: { row: number; error: string }[] = [];
  const rows: Array<{ timestamp: Date; values: Record<string, number>; units: Record<string, string> }> = [];

  if (records.length === 0) {
    return { imported: 0, errors: [{ row: 0, error: 'CSV is empty' }] };
  }

  // Validate header: first column must be data_ora, rest must match field keys
  const headerKeys = Object.keys(records[0]);
  if (headerKeys.length < 2 || headerKeys[0] !== 'data_ora') {
    return { imported: 0, errors: [{ row: 0, error: 'CSV must have "data_ora" as first column followed by field keys' }] };
  }

  const csvFieldKeys = headerKeys.slice(1);
  for (const k of csvFieldKeys) {
    if (!fieldKeys.includes(k)) {
      return { imported: 0, errors: [{ row: 0, error: `Unknown field "${k}". Expected: ${fieldKeys.join(', ')}` }] };
    }
  }

  const allDates: Date[] = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 2;
    try {
      const dataOra = row.data_ora?.trim();
      if (!dataOra) { errors.push({ row: rowNum, error: 'Missing data_ora' }); continue; }

      const timestamp = new Date(dataOra);
      if (isNaN(timestamp.getTime())) { errors.push({ row: rowNum, error: `Invalid date: ${dataOra}` }); continue; }

      const values: Record<string, number> = {};
      const units: Record<string, string> = {};

      for (const k of csvFieldKeys) {
        const raw = row[k]?.trim();
        if (!raw || raw === '') { errors.push({ row: rowNum, error: `Missing value for ${k}` }); break; }
        const num = parseFloat(raw);
        if (isNaN(num)) { errors.push({ row: rowNum, error: `Invalid number for ${k}: ${raw}` }); continue; }

        values[k] = num;
        const fieldDef = typeConfig.fields.find((f: any) => f.key === k);
        if (fieldDef?.unit) units[k] = fieldDef.unit;
      }

      if (Object.keys(values).length !== csvFieldKeys.length) continue;

      allDates.push(timestamp);
      rows.push({ timestamp, values, units });
    } catch (e: any) {
      errors.push({ row: rowNum, error: e.message });
    }
  }

  if (rows.length === 0) {
    return { imported: 0, errors };
  }

  // Delete existing data in range if requested
  if (deleteExisting && allDates.length > 0) {
    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
    await Measurement.deleteMany({
      userId: resolvedUserId,
      type: measurementType,
      timestamp: { $gte: minDate, $lte: maxDate },
    });
  }

  // Insert all measurements
  const docs = await Measurement.insertMany(
    rows.map((r) => ({
      userId: resolvedUserId,
      type: measurementType,
      values: r.values,
      units: r.units,
      timestamp: r.timestamp,
      source: 'import',
    }))
  );

  // Evaluate thresholds and trigger alerts
  for (const doc of docs) {
    const evaluation = evaluateThresholds(doc.values, typeConfig);
    if (evaluation && evaluation.some((f: any) => f.status !== 'normal')) {
      processAlert(resolvedUserId, doc._id.toString(), measurementType, evaluation, doc.values).catch(() => {});
    }
    sendInfoNotification(resolvedUserId, doc._id.toString(), measurementType, doc.values, typeConfig).catch(() => {});
  }

  return { imported: docs.length, errors };
}

function determineTargetUserId(
  userId: string,
  userRole: string,
  patientId?: string
): string {
  if (userRole === 'patient') return userId;
  if (userRole === 'doctor' || userRole === 'admin') {
    if (!patientId) throw new AppError(400, t('error.patient.idRequired'));
    return patientId;
  }
  throw new AppError(403, t('error.measurement.roleNotAllowed'));
}

function getDateFormat(groupBy: TimeGroupBy): string {
  switch (groupBy) {
    case 'hour': return '%Y-%m-%dT%H:00:00';
    case 'day': return '%Y-%m-%d';
    case 'week': return '%Y-W%V';
    case 'month': return '%Y-%m';
    case 'year': return '%Y';
    default: return '%Y-%m-%d';
  }
}

function toObjectId(value: string) {
  return new mongoose.Types.ObjectId(value);
}

function normalizeMatch(userIdOrFilter: string | any, type: string): any {
  let match: any;
  if (typeof userIdOrFilter === 'string') {
    match = { userId: toObjectId(userIdOrFilter), type };
  } else {
    match = { ...userIdOrFilter, type };
    if (match.userId?.$in) {
      match.userId.$in = match.userId.$in.map((id: string) => toObjectId(id));
    }
  }
  return match;
}

export async function getTimeSeries(
  userIdOrFilter: string | any,
  type: string,
  groupBy: TimeGroupBy,
  fields: string[],
  range?: { from?: string; to?: string },
  aggregation: AggregationFunction = 'avg'
): Promise<TimeSeriesResponse> {
  const match = normalizeMatch(userIdOrFilter, type);

  if (range?.from || range?.to) {
    match.timestamp = {};
    if (range.from) match.timestamp.$gte = new Date(range.from);
    if (range.to) match.timestamp.$lte = new Date(range.to);
  }

  const format = getDateFormat(groupBy);

  const aggOp: Record<string, string> = { avg: '$avg', min: '$min', max: '$max' };
  const aggKey = aggOp[aggregation] || '$avg';
  const aggLabel = `${aggregation}Value`;

  const pipeline = [
    { $match: match },
    { $addFields: { entries: { $objectToArray: '$values' } } },
    { $unwind: '$entries' },
    { $match: fields.length > 0 ? { 'entries.k': { $in: fields } } : {} },
    {
      $group: {
        _id: {
          date: { $dateToString: { format, date: '$timestamp' } },
          field: '$entries.k',
        },
        [aggLabel]: { [aggKey]: '$entries.v' },
      },
    },
    { $sort: { '_id.date': 1 } },
    {
      $group: {
        _id: '$_id.date',
        fields: {
          $push: { k: '$_id.field', v: `$${aggLabel}` },
        },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const results = await Measurement.aggregate(pipeline as any);

  const data = results.map((r: any) => {
    const values: Record<string, number> = {};
    for (const f of r.fields) {
      values[f.k] = Math.round(f.v * 100) / 100;
    }
    return { timestamp: r._id, values };
  });

  return { type, groupBy, data };
}

export async function getMeasurementStats(
  userIdOrFilter: string | any,
  type: string,
  range?: { from?: string; to?: string }
): Promise<MeasurementStats> {
  const match: any = typeof userIdOrFilter === 'string'
    ? { userId: userIdOrFilter, type }
    : { ...userIdOrFilter, type };

  if (range?.from || range?.to) {
    match.timestamp = {};
    if (range.from) match.timestamp.$gte = new Date(range.from);
    if (range.to) match.timestamp.$lte = new Date(range.to);
  }

  const docs = await Measurement.find(match).sort({ timestamp: 1 }).lean();

  if (docs.length === 0) {
    return {
      type,
      fields: [],
      count: 0,
      trend: 'stable',
    };
  }

  const fieldKeys = Object.keys(docs[0].values || {});
  const fields = fieldKeys.map((key) => {
    const values = docs.map((d: any) => d.values[key]).filter((v: number) => v != null) as number[];
    if (values.length === 0) {
      return { key, average: 0, min: 0, max: 0, unit: '' };
    }
    const sum = values.reduce((a: number, b: number) => a + b, 0);
    const first = values[0];
    const last = values[values.length - 1];
    const trend: 'up' | 'down' | 'stable' = last > first ? 'up' : last < first ? 'down' : 'stable';

    return {
      key,
      average: Math.round((sum / values.length) * 100) / 100,
      min: Math.min(...values),
      max: Math.max(...values),
      unit: docs[0].units?.[key] || '',
      trend,
    };
  });

  return {
    type,
    fields,
    count: docs.length,
    trend: 'stable',
    range: range?.from || range?.to
      ? { from: range.from || '', to: range.to || '' }
      : undefined,
  };
}
