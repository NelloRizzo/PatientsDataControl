import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMeasurements, deleteMeasurement } from '../api/measurements';
import { getMeasurementTypes } from '../api/measurementTypes';
import apiClient from '../api/client';
import type { IMeasurement, IMeasurementTypeConfig } from '@healthbridge/shared';

export function Measurements() {
  const [measurements, setMeasurements] = useState<IMeasurement[]>([]);
  const [types, setTypes] = useState<IMeasurementTypeConfig[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState('');

  // CSV import
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState<{ imported: number; errors: { row: number; error: string }[] } | null>(null);

  const load = async () => {
    const res = await getMeasurements({ type: filterType || undefined, page, limit: 20 });
    setMeasurements(res.data);
    setTotalPages(res.pagination.totalPages);
  };

  useEffect(() => {
    getMeasurementTypes().then(setTypes).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [page, filterType]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this measurement?')) return;
    await deleteMeasurement(id);
    load();
  };

  const handleDeleteAll = async () => {
    const msg = filterType
      ? `Delete ALL measurements of type "${types.find(t => t.key === filterType)?.name || filterType}"?`
      : 'Delete ALL your measurements? This cannot be undone.';
    if (!confirm(msg)) return;
    await apiClient.delete('/measurements/all', { params: filterType ? { type: filterType } : {} });
    setPage(1);
    load();
  };

  const handleImport = async () => {
    if (!csvText.trim()) return;
    setImportResult(null);
    try {
      const res = await apiClient.post('/measurements/import', { csv: csvText });
      setImportResult(res.data);
      if (res.data.imported > 0) load();
    } catch (e: any) {
      setImportResult({ imported: 0, errors: [{ row: 0, error: e.response?.data?.error || 'Import failed' }] });
    }
  };

  const formatValue = (m: IMeasurement) => {
    const type = types.find((t) => t.key === m.type);
    if (!type) return JSON.stringify(m.values);
    return type.fields.map((f) => {
      const val = m.values[f.key];
      const unit = m.units[f.key] || f.unit;
      return `${f.name}: ${val} ${unit}`;
    }).join(', ');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Measurements</h1>
        <div className="flex gap-2">
          <button onClick={() => { setShowImport(!showImport); setImportResult(null); setCsvText(''); }} className="bg-white border border-blue-600 text-blue-600 px-4 py-2 rounded hover:bg-blue-50">
            {showImport ? 'Cancel' : 'Import CSV'}
          </button>
          <Link to="/measurements/new" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">New Measurement</Link>
        </div>
      </div>

      {showImport && (
        <div className="bg-white p-4 rounded-lg shadow-sm border space-y-3">
          <p className="text-sm text-gray-600">Paste CSV data. Each row = one measurement. Format:</p>
          <pre className="text-xs bg-gray-50 p-2 rounded border overflow-x-auto">
{`type,fields,timestamp,notes
blood_pressure,systolic=120|mmHg\,diastolic=80|mmHg,2026-05-21T10:00,
glucose,value=95|mg/dL,2026-05-21T10:00,
weight,value=75|kg,2026-05-21T10:00,optional note`}
          </pre>
          <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={6} className="w-full border rounded px-3 py-2 text-sm font-mono" placeholder="Paste CSV here..." />
          <div className="flex gap-2 items-center">
            <button onClick={handleImport} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Import</button>
            {importResult && (
              <span className={`text-sm ${importResult.errors.length > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                {importResult.imported} imported{importResult.errors.length > 0 ? `, ${importResult.errors.length} errors` : ''}
              </span>
            )}
          </div>
          {importResult?.errors.length ? (
            <div className="text-xs text-red-600 space-y-0.5">
              {importResult.errors.map((e, i) => <p key={i}>Row {e.row}: {e.error}</p>)}
            </div>
          ) : null}
        </div>
      )}

      <div className="flex gap-2 items-center">
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="border rounded px-3 py-2"
        >
          <option value="">All types</option>
          {(() => {
            const groups: Record<string, typeof types> = {};
            for (const t of types) {
              const g = t.macrogroup || 'other';
              if (!groups[g]) groups[g] = [];
              groups[g].push(t);
            }
            const labels: Record<string, string> = {
              generalhealth: 'General Health',
              cardiac: 'Cardiac',
              blood_gas: 'Blood / Gas',
              lipidemia: 'Lipid Profile',
              renal: 'Renal Function',
            };
            return Object.entries(groups).map(([group, ts]) => (
              <optgroup key={group} label={labels[group] || group}>
                {ts.map((t) => (
                  <option key={t.key} value={t.key}>{t.name}</option>
                ))}
              </optgroup>
            ));
          })()}
        </select>
        <button onClick={handleDeleteAll} className="text-sm text-red-600 border border-red-300 px-3 py-2 rounded hover:bg-red-50">
          Delete All
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Values</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Source</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {measurements.map((m) => (
              <tr key={m._id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  {types.find((t) => t.key === m.type)?.name || m.type}
                </td>
                <td className="px-4 py-3">
                  {m.evaluation && (() => {
                    const worst = m.evaluation.reduce<'' | 'alert' | 'danger'>((w, e) =>
                      e.status === 'danger' ? 'danger' : e.status === 'alert' ? 'alert' : w, '');
                    if (!worst) return <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">OK</span>;
                    if (worst === 'alert') return <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">ALERT</span>;
                    return <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">DANGER</span>;
                  })()}
                </td>
                <td className="px-4 py-3 text-sm">{formatValue(m)}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{m.source}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(m.timestamp).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/measurements/${m._id}`}
                    className="text-blue-600 hover:underline text-sm mr-2"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(m._id)}
                    className="text-red-600 hover:underline text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {measurements.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  No measurements found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm">Page {page} of {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
