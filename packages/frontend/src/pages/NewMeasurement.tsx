import { useState, useEffect, useRef } from 'react';
import { getMeasurementTypes } from '../api/measurementTypes';
import { createMeasurement, extractMeasurements } from '../api/measurements';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { IMeasurementTypeConfig, ExtractionResult, ExtractedField, IUser } from '@healthbridge/shared';

type CardMode = 'manual' | 'upload';

interface CardState {
  expanded: boolean;
  mode: CardMode;
  values: Record<string, string>;
  units: Record<string, string>;
  notes: string;
  file: File | null;
  saving: boolean;
  done: boolean;
  error: string;
}

const icons: Record<string, string> = {
  blood_pressure: '❤️',
  heart_rate: '💓',
  glucose: '🩸',
  cholesterol: '🧬',
  weight: '⚖️',
  temperature: '🌡️',
  spo2: '🫁',
  respiratory_rate: '🌬️',
  height: '📏',
  body_composition: '🧍',
  body_circumferences: '📐',
};

function getIcon(key: string) {
  return icons[key] || '📊';
}

function getTypeName(key: string, types: IMeasurementTypeConfig[]) {
  return types.find(t => t.key === key)?.name || key;
}

function ConfidenceBadge({ value }: { value: number }) {
  if (value >= 80) return <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">{value}%</span>;
  if (value >= 50) return <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">{value}%</span>;
  return <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">{value}%</span>;
}

export function NewMeasurement() {
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';

  const [types, setTypes] = useState<IMeasurementTypeConfig[]>([]);
  const [cards, setCards] = useState<Record<string, CardState>>({});
  const [globalMsg, setGlobalMsg] = useState('');
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Doctor patient selector
  const [patients, setPatients] = useState<IUser[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');

  // Global AI extraction state
  const [globalFile, setGlobalFile] = useState<File | null>(null);
  const [globalExtracting, setGlobalExtracting] = useState(false);
  const [globalResults, setGlobalResults] = useState<ExtractionResult[] | null>(null);
  const [globalError, setGlobalError] = useState('');
  const globalFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    getMeasurementTypes().then(setTypes).catch(() => {});
    if (isDoctor) {
      apiClient.get('/doctor/patients').then((res) => setPatients(res.data.data)).catch(() => {});
    }
  }, [isDoctor]);

  const initCard = (key: string, t: IMeasurementTypeConfig): CardState => {
    const values: Record<string, string> = {};
    const units: Record<string, string> = {};
    for (const f of t.fields) {
      values[f.key] = '';
      units[f.key] = f.unit;
    }
    return { expanded: false, mode: 'manual', values, units, notes: '', file: null, saving: false, done: false, error: '' };
  };

  const toggleExpand = (key: string) => {
    setCards((prev) => {
      const t = types.find((t) => t.key === key);
      if (!t) return prev;
      const cur = prev[key];
      if (!cur) return { ...prev, [key]: initCard(key, t) };
      return { ...prev, [key]: { ...cur, expanded: !cur.expanded } };
    });
  };

  const setMode = (key: string, mode: CardMode) => {
    setCards((prev) => ({ ...prev, [key]: { ...prev[key], mode, error: '' } }));
  };

  const setField = (key: string, fieldKey: string, value: string) => {
    setCards((prev) => ({ ...prev, [key]: { ...prev[key], values: { ...prev[key].values, [fieldKey]: value } } }));
  };

  const setUnit = (key: string, fieldKey: string, unit: string) => {
    setCards((prev) => ({ ...prev, [key]: { ...prev[key], units: { ...prev[key].units, [fieldKey]: unit } } }));
  };

  const setNotes = (key: string, notes: string) => {
    setCards((prev) => ({ ...prev, [key]: { ...prev[key], notes } }));
  };

  const setFile = (key: string, file: File | null) => {
    setCards((prev) => ({ ...prev, [key]: { ...prev[key], file } }));
  };

  const buildPayload = (key: string, values: Record<string, number>, units: Record<string, string>, notes?: string) => {
    const payload: Record<string, any> = {
      type: key,
      values,
      units,
      notes,
    };
    if (isDoctor && selectedPatientId) {
      payload.patientId = selectedPatientId;
    }
    return payload;
  };

  const handleManualSave = async (key: string, card: CardState) => {
    const numValues: Record<string, number> = {};
    for (const [k, v] of Object.entries(card.values)) {
      if (!v.trim()) {
        setCards((prev) => ({ ...prev, [key]: { ...prev[key], error: 'Fill in all fields' } }));
        return;
      }
      numValues[k] = parseFloat(v);
      if (isNaN(numValues[k])) {
        setCards((prev) => ({ ...prev, [key]: { ...prev[key], error: `Invalid value for "${k}"` } }));
        return;
      }
    }

    setCards((prev) => ({ ...prev, [key]: { ...prev[key], saving: true, error: '' } }));
    try {
      await createMeasurement(buildPayload(key, numValues, card.units, card.notes || undefined) as any);
      const t = types.find((t) => t.key === key);
      setCards((prev) => ({ ...prev, [key]: { ...initCard(key, t!), saving: false, done: true, expanded: false } }));
      setGlobalMsg('Measurement saved');
      setTimeout(() => setGlobalMsg(''), 2000);
    } catch (err: any) {
      setCards((prev) => ({ ...prev, [key]: { ...prev[key], saving: false, error: err.response?.data?.error || 'Failed' } }));
    }
  };

  const handleCsvUpload = async (key: string, card: CardState) => {
    setCards((prev) => ({ ...prev, [key]: { ...prev[key], saving: true, error: '' } }));
    try {
      const formData = new FormData();
      formData.append('file', card.file!);
      formData.append('measurementType', key);
      if (isDoctor && selectedPatientId) {
        formData.append('patientId', selectedPatientId);
      }
      await apiClient.post('/measurements/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCards((prev) => ({ ...prev, [key]: { ...initCard(key, types.find((t) => t.key === key)!), saving: false, done: true, expanded: false } }));
      setGlobalMsg('CSV imported');
      setTimeout(() => setGlobalMsg(''), 2000);
    } catch (err: any) {
      setCards((prev) => ({ ...prev, [key]: { ...prev[key], saving: false, error: err.response?.data?.error || 'Import failed' } }));
    }
  };

  const handleCardSave = async (key: string) => {
    const card = cards[key];
    if (!card) return;
    if (card.mode === 'manual') {
      await handleManualSave(key, card);
    } else if (card.file) {
      const isCsv = card.file.type === 'text/csv' || card.file.name.endsWith('.csv');
      if (isCsv) {
        await handleCsvUpload(key, card);
      } else {
        setCards((prev) => ({ ...prev, [key]: { ...prev[key], error: 'Use the global upload area above for images/PDFs' } }));
      }
    }
  };

  // Global AI extraction
  const handleGlobalFileChange = (file: File | null) => {
    setGlobalFile(file);
    setGlobalResults(null);
    setGlobalError('');
  };

  const handleGlobalAnalyze = async () => {
    if (!globalFile) return;
    setGlobalExtracting(true);
    setGlobalError('');
    try {
      const results = await extractMeasurements(globalFile);
      if (results.length === 0) {
        setGlobalError('AI could not identify any measurements in this document.');
      } else {
        setGlobalResults(results);
      }
    } catch (err: any) {
      setGlobalError(err.response?.data?.error || 'AI extraction failed');
    }
    setGlobalExtracting(false);
  };

  const handleGlobalSaveAll = async () => {
    if (!globalResults) return;
    setGlobalExtracting(true);
    let saved = 0;
    let failed = 0;
    for (const result of globalResults) {
      try {
        const values: Record<string, number> = {};
        const units: Record<string, string> = {};
        for (const f of result.fields) {
          values[f.key] = f.value;
          units[f.key] = f.unit;
        }
        await createMeasurement(buildPayload(result.type, values, units, result.notes) as any);
        saved++;
      } catch {
        failed++;
      }
    }
    setGlobalResults(null);
    setGlobalFile(null);
    setGlobalExtracting(false);
    setGlobalMsg(`Saved ${saved} measurement(s)${failed > 0 ? `, ${failed} failed` : ''}`);
    setTimeout(() => setGlobalMsg(''), 3000);
  };

  const updateGlobalField = (typeIndex: number, fieldIndex: number, value: number) => {
    if (!globalResults) return;
    const results = [...globalResults];
    const fields = [...results[typeIndex].fields];
    fields[fieldIndex] = { ...fields[fieldIndex], value };
    results[typeIndex] = { ...results[typeIndex], fields };
    setGlobalResults(results);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">New Measurement</h1>
        {globalMsg && <p className="text-sm text-green-600">{globalMsg}</p>}
      </div>

      {/* Patient selector (doctor only) */}
      {isDoctor && (
        <div className="bg-white rounded-lg border shadow-sm p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="w-full max-w-sm border rounded px-3 py-2 text-sm"
          >
            <option value="">Select a patient...</option>
            {patients.map((p) => (
              <option key={p._id} value={p._id}>{p.name} ({p.email})</option>
            ))}
          </select>
          {isDoctor && !selectedPatientId && (
            <p className="text-xs text-amber-600 mt-1">Select a patient to record measurements for them</p>
          )}
        </div>
      )}

      {/* Global upload zone */}
      <div className="bg-white rounded-lg border shadow-sm p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Upload Document</h2>
        <p className="text-xs text-gray-500 mb-3">
          Upload a lab report PDF, screenshot, or image. AI will extract all measurements automatically.
        </p>

        <div
          onClick={() => globalFileRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
        >
          {globalFile ? (
            <div>
              <p className="text-sm font-medium text-blue-600">{globalFile.name}</p>
              <p className="text-xs text-gray-400">{(globalFile.size / 1024).toFixed(0)} KB</p>
              <button
                onClick={(e) => { e.stopPropagation(); handleGlobalFileChange(null); }}
                className="text-xs text-red-500 hover:underline mt-1"
              >
                Remove
              </button>
            </div>
          ) : (
            <div>
              <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-500">Click to upload PDF or image</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF accepted</p>
            </div>
          )}
        </div>

        <input
          ref={globalFileRef}
          type="file"
          accept=".png,.jpg,.jpeg,.pdf"
          onChange={(e) => handleGlobalFileChange(e.target.files?.[0] || null)}
          className="hidden"
        />

        {globalFile && (
          <button
            onClick={handleGlobalAnalyze}
            disabled={globalExtracting}
            className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {globalExtracting ? 'Analyzing with AI...' : 'Analyze Document with AI'}
          </button>
        )}

        {globalError && (
          <p className="mt-2 text-sm text-red-600">{globalError}</p>
        )}
      </div>

      {/* Global extraction loading overlay */}
      {globalExtracting && !globalResults && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 shadow-xl text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-gray-600">Analyzing document with AI...</p>
          </div>
        </div>
      )}

      {/* Multi-type preview modal */}
      {globalResults && !globalExtracting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setGlobalResults(null); setGlobalFile(null); }}>
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Extracted Measurements</h2>
              <span className="text-xs text-gray-400">{globalResults.length} type(s) found</span>
            </div>

            {globalResults.map((result, ti) => (
              <div key={result.type} className="border rounded-lg mb-4 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-b">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getIcon(result.type)}</span>
                    <span className="font-medium text-sm">{result.typeName}</span>
                  </div>
                  <ConfidenceBadge value={result.overallConfidence} />
                </div>

                {result.fields.some(f => f.alertStatus && f.alertStatus !== 'normal') && (
                  <div className="bg-red-50 border-b border-red-200 px-4 py-2 space-y-0.5">
                    {result.fields.filter(f => f.alertStatus && f.alertStatus !== 'normal').map((f, i) => (
                      <p key={i} className={`text-xs ${f.alertStatus === 'danger' ? 'text-red-600' : 'text-amber-600'}`}>
                        {f.alertStatus === 'danger' ? '🚨' : '⚠️'} {f.key}: {f.alertMessage}
                      </p>
                    ))}
                  </div>
                )}

                <div className="p-4 space-y-3">
                  {result.fields.map((f, fi) => (
                    <div key={f.key}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-gray-600 capitalize">{f.key}</label>
                        <ConfidenceBadge value={f.confidence} />
                      </div>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          step={f.value % 1 === 0 ? 1 : 0.01}
                          value={f.value}
                          onChange={(e) => updateGlobalField(ti, fi, parseFloat(e.target.value) || 0)}
                          className="flex-1 border rounded px-3 py-1.5 text-sm"
                        />
                        <span className="text-sm text-gray-500 w-12">{f.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex gap-2 sticky bottom-0 bg-white pt-3 border-t">
              <button
                onClick={handleGlobalSaveAll}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700"
              >
                Save All ({globalResults.length} measurement{globalResults.length > 1 ? 's' : ''})
              </button>
              <button
                onClick={() => { setGlobalResults(null); setGlobalFile(null); }}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg text-sm hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Measurement type cards */}
      {types.length === 0 && (
        <p className="text-center py-12 text-gray-500 bg-white rounded-lg border">No measurement types available</p>
      )}

      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-700">Or enter manually</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {types.map((t) => {
          const card = cards[t.key];
          const expanded = card?.expanded ?? false;
          const mode = card?.mode || 'manual';
          const saving = card?.saving || false;
          const done = card?.done || false;
          const error = card?.error || '';

          return (
            <div
              key={t.key}
              className={`bg-white rounded-xl border shadow-sm transition-all ${
                expanded ? 'ring-2 ring-blue-200' : 'hover:shadow-md'
              } ${done ? 'ring-2 ring-green-300 bg-green-50' : ''}`}
            >
              <button
                onClick={() => toggleExpand(t.key)}
                className="w-full text-left px-4 py-3 flex items-center gap-3"
              >
                <span className="text-2xl">{getIcon(t.key)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <p className="text-xs text-gray-400 truncate">{t.description || t.fields.map((f) => f.name).join(', ')}</p>
                </div>
                {done && <span className="text-green-600 text-sm shrink-0">✓ Saved</span>}
                {!done && (
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t pt-3">
                  <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setMode(t.key, 'manual')}
                      className={`flex-1 text-xs py-1 rounded-md transition-colors ${
                        mode === 'manual' ? 'bg-white text-gray-800 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Manual
                    </button>
                    <button
                      onClick={() => setMode(t.key, 'upload')}
                      className={`flex-1 text-xs py-1 rounded-md transition-colors ${
                        mode === 'upload' ? 'bg-white text-gray-800 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      CSV
                    </button>
                  </div>

                  {error && <p className="text-xs text-red-600">{error}</p>}

                  {mode === 'manual' && (
                    <div className="space-y-2">
                      {t.fields.map((f) => (
                        <div key={f.key}>
                          <label className="block text-xs text-gray-500 mb-0.5">{f.name}</label>
                          <div className="flex gap-1">
                            <input
                              type="number"
                              step={f.type === 'integer' ? 1 : 0.01}
                              value={card?.values[f.key] || ''}
                              onChange={(e) => setField(t.key, f.key, e.target.value)}
                              className="flex-1 border rounded px-2 py-1 text-sm min-w-0"
                              min={f.min}
                              max={f.max}
                              placeholder="0"
                              required
                            />
                            <select
                              value={card?.units[f.key] || f.unit}
                              onChange={(e) => setUnit(t.key, f.key, e.target.value)}
                              className="border rounded px-1.5 py-1 text-xs bg-white"
                            >
                              {f.units.map((u) => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                      <div>
                        <input
                          value={card?.notes || ''}
                          onChange={(e) => setNotes(t.key, e.target.value)}
                          placeholder="Notes (optional)"
                          maxLength={500}
                          className="w-full border rounded px-2 py-1 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {mode === 'upload' && (
                    <div>
                      <div
                        onClick={() => fileInputRefs.current[t.key]?.click()}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
                      >
                        {card?.file ? (
                          <div>
                            <p className="text-sm font-medium text-blue-600">{card.file.name}</p>
                            <p className="text-xs text-gray-400">{(card.file.size / 1024).toFixed(0)} KB</p>
                            <p className="text-xs text-gray-400 mt-1">Click Import CSV below</p>
                            <button
                              onClick={(e) => { e.stopPropagation(); setFile(t.key, null); }}
                              className="text-xs text-red-500 hover:underline mt-1"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div>
                            <svg className="w-6 h-6 text-gray-400 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="text-xs text-gray-500">Upload CSV file for bulk import</p>
                          </div>
                        )}
                      </div>
                      <input
                        ref={(el) => { fileInputRefs.current[t.key] = el; }}
                        type="file"
                        accept=".csv"
                        onChange={(e) => setFile(t.key, e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </div>
                  )}

                  <button
                    onClick={() => handleCardSave(t.key)}
                    disabled={saving}
                    className="w-full bg-blue-600 text-white text-sm py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Saving...' : mode === 'manual' ? 'Save' : 'Import CSV'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
