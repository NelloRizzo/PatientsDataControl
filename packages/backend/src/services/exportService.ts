import { Measurement } from '../models/Measurement.js';
import { MeasurementTypeConfig } from '../models/MeasurementTypeConfig.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

interface ExportQuery {
  type?: string;
  from?: string;
  to?: string;
  userIds?: string[];
}

function csvEscape(val: unknown): string {
  if (val == null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function fieldsToHeader(fieldKeys: string[]): string {
  return fieldKeys.map(csvEscape).join(',');
}

function valuesToRow(
  timestamp: string,
  patientId: string,
  patientName: string,
  type: string,
  values: Record<string, number>,
  fieldKeys: string[],
  source: string,
  notes: string | undefined,
): string {
  const cols = [
    csvEscape(timestamp),
    csvEscape(patientId),
    csvEscape(patientName),
    csvEscape(type),
    ...fieldKeys.map((k) => csvEscape(values[k] ?? '')),
    csvEscape(source),
    csvEscape(notes ?? ''),
  ];
  return cols.join(',');
}

export async function exportCsv(query: ExportQuery): Promise<string> {
  const { type, from, to, userIds } = query;

  const match: any = {};
  if (type) match.type = type;
  if (userIds) match.userId = { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) };
  if (from || to) {
    match.timestamp = {};
    if (from) match.timestamp.$gte = new Date(from);
    if (to) match.timestamp.$lte = new Date(to);
  }

  const docs = await Measurement.find(match)
    .populate('userId', 'name')
    .sort({ timestamp: -1 })
    .limit(10000)
    .lean();

  if (docs.length === 0) {
    return 'timestamp,patientId,patientName,type\n';
  }

  let fieldKeys: string[];
  if (type) {
    const config = await MeasurementTypeConfig.findOne({ key: type, active: true }).lean();
    fieldKeys = config ? config.fields.map((f: any) => f.key) : [];
  } else {
    const allKeys = new Set<string>();
    for (const doc of docs) {
      if (doc.values) Object.keys(doc.values).forEach((k) => allKeys.add(k));
    }
    fieldKeys = Array.from(allKeys);
  }

  const header = `timestamp,patientId,patientName,type,${fieldsToHeader(fieldKeys)},source,notes`;

  const rows = docs.map((doc: any) => {
    const ts = doc.timestamp?.toISOString?.() ?? '';
    const patientId = doc.userId?._id?.toString?.() ?? doc.userId?.toString?.() ?? '';
    const patientName = doc.userId?.name ?? 'Unknown';
    return valuesToRow(ts, patientId, patientName, doc.type, doc.values ?? {}, fieldKeys, doc.source ?? 'manual', doc.notes);
  });

  return [header, ...rows].join('\n');
}
