import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { IMeasurementTypeConfig } from '../../../shared/dist/index.js';

export function ImportMeasurements() {
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';
  const isAdmin = user?.role === 'admin';

  const [types, setTypes] = useState<IMeasurementTypeConfig[]>([]);
  const [patients, setPatients] = useState<{ _id: string; name: string; email: string }[]>([]);
  const [selectedType, setSelectedType] = useState('');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [deleteExisting, setDeleteExisting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: { row: number; error: string }[] } | null>(null);

  useEffect(() => {
    apiClient.get('/measurement-types').then((res) => setTypes(res.data.data));
  }, []);

  useEffect(() => {
    if (!isAdmin && !isDoctor) return;
    const url = isAdmin ? '/admin/users?role=patient' : '/doctor/patients';
    apiClient.get(url).then((res) => setPatients(res.data.data));
  }, [isAdmin, isDoctor]);

  const selectedTypeConfig = types.find((t) => t.key === selectedType);

  const csvHeader = selectedTypeConfig
    ? `data_ora,${selectedTypeConfig.fields.map((f) => f.key).join(',')}`
    : 'data_ora,...';

  const csvExample = selectedTypeConfig
    ? `${csvHeader}\n2026-05-22T10:00,${selectedTypeConfig.fields.map(() => '...').join(',')}\n2026-05-22T14:00,${selectedTypeConfig.fields.map(() => '...').join(',')}`
    : 'Select a measurement type first';

  const handleSubmit = async () => {
    if (!file || !selectedType) return;
    setLoading(true);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('measurementType', selectedType);
      if (selectedPatient) fd.append('patientId', selectedPatient);
      if (deleteExisting) fd.append('deleteExisting', 'true');

      const res = await apiClient.post('/measurements/import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
    } catch (e: any) {
      setResult({ imported: 0, errors: [{ row: 0, error: e.response?.data?.error || 'Import failed' }] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Import Measurements</h1>

      <div className="bg-white p-6 rounded-lg shadow-sm border space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Measurement Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Select type...</option>
              {types.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
            </select>
          </div>
          {(isAdmin || isDoctor) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
              <select
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select patient...</option>
                {patients.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.email})</option>)}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={deleteExisting} onChange={(e) => setDeleteExisting(e.target.checked)} className="rounded" />
            Delete existing measurements of this type within the CSV date range before importing
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">CSV Format</label>
          <div className="bg-gray-50 p-3 rounded border text-xs font-mono whitespace-pre overflow-x-auto">
            {csvExample}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            First column must be <code className="bg-gray-100 px-1 rounded">data_ora</code>. Subsequent columns = field keys of the selected type.
            One row per measurement. Use ISO date format.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CSV File</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!file || !selectedType || loading}
          className="bg-blue-600 text-white px-6 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Importing...' : 'Import'}
        </button>

        {result && (
          <div className={`text-sm ${result.errors.length > 0 ? 'text-yellow-700 bg-yellow-50 border-yellow-200' : 'text-green-700 bg-green-50 border-green-200'} border rounded p-3`}>
            <p className="font-medium">{result.imported} measurements imported successfully</p>
            {result.errors.length > 0 && (
              <div className="mt-2 space-y-0.5">
                <p className="font-medium">{result.errors.length} errors:</p>
                {result.errors.map((e, i) => <p key={i} className="text-xs">Row {e.row}: {e.error}</p>)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
