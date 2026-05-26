import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { getMeasurementTypes } from '../api/measurementTypes';
import type { IMeasurementTypeConfig, AlertStatus } from '@healthbridge/shared';

interface AlertLogEntry {
  _id: string;
  patientId: string;
  patientName?: string;
  patientEmail?: string;
  measurementType: string;
  status: AlertStatus;
  field: string;
  value: number;
  unit: string;
  message: string;
  channel: string;
  delivered: boolean;
  sentAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function DoctorAlerts() {
  const [alerts, setAlerts] = useState<AlertLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [types, setTypes] = useState<IMeasurementTypeConfig[]>([]);
  const [loading, setLoading] = useState(false);

  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [page, setPage] = useState(1);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (filterType) params.measurementType = filterType;
      if (filterStatus) params.status = filterStatus;
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;

      const res = await apiClient.get('/alerts/logs', { params });
      setAlerts(res.data.data);
      setPagination(res.data.pagination);
    } catch { setAlerts([]); }
    setLoading(false);
  }, [page, filterType, filterStatus, filterFrom, filterTo]);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  useEffect(() => {
    getMeasurementTypes().then(setTypes).catch(() => {});
  }, []);

  const handleFilter = () => { setPage(1); loadAlerts(); };

  const statusBadge = (status: AlertStatus) => {
    const colors: Record<string, string> = { alert: 'bg-yellow-100 text-yellow-700', danger: 'bg-red-100 text-red-700', info: 'bg-blue-100 text-blue-700' };
    return <span className={`text-xs px-2 py-0.5 rounded ${colors[status] || 'bg-gray-100'}`}>{status}</span>;
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Patient Alerts</h1>

      <div className="bg-white p-4 rounded-lg shadow-sm border space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-gray-500">Measurement Type</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm">
              <option value="">All</option>
              {types.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm">
              <option value="">All</option>
              <option value="alert">Alert</option>
              <option value="danger">Danger</option>
              <option value="info">Info</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500">From</label>
            <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500">To</label>
            <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm" />
          </div>
          <div className="flex items-end">
            <button onClick={handleFilter}
              className="w-full bg-blue-600 text-white py-1.5 rounded text-sm hover:bg-blue-700">
              Filter
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading alerts...</p>
        ) : alerts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No alerts found</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 text-xs text-gray-500">Patient</th>
                <th className="text-left px-4 py-2 text-xs text-gray-500">Type</th>
                <th className="text-left px-4 py-2 text-xs text-gray-500">Status</th>
                <th className="text-left px-4 py-2 text-xs text-gray-500">Field</th>
                <th className="text-right px-4 py-2 text-xs text-gray-500">Value</th>
                <th className="text-left px-4 py-2 text-xs text-gray-500">Message</th>
                <th className="text-center px-4 py-2 text-xs text-gray-500">Delivered</th>
                <th className="text-left px-4 py-2 text-xs text-gray-500">Sent At</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {alerts.map((a) => (
                <tr key={a._id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{a.patientName || a.patientEmail || a.patientId}</td>
                  <td className="px-4 py-2 text-gray-600">{a.measurementType}</td>
                  <td className="px-4 py-2">{statusBadge(a.status)}</td>
                  <td className="px-4 py-2 text-gray-600">{a.field}</td>
                  <td className="px-4 py-2 text-right font-mono">{a.value} {a.unit}</td>
                  <td className="px-4 py-2 text-gray-600 max-w-xs truncate" title={a.message}>{a.message}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${a.delivered ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {a.delivered ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                    {new Date(a.sentAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
