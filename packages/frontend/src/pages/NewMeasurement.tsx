import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getMeasurementTypes } from '../api/measurementTypes';
import { createMeasurement, extractMeasurements } from '../api/measurements';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { IMeasurementTypeConfig, ExtractionResult, ExtractedField } from '@healthbridge/shared';

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
  const [searchParams] = useSearchParams();
  const forPatient = searchParams.get('forPatient');

  const [types, setTypes] = useState<IMeasurementTypeConfig[]>([]);
  const [cards, setCards] = useState<Record<string, CardState>>({});
  const [globalMsg, setGlobalMsg] = useState('');
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Patient name for title
  const [patientName, setPatientName] = useState('');
  const isForPatient = !!forPatient;

  // Doctor patient selector (fallback if no forPatient)
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(forPatient || '');

  // Global AI extraction state
  const [globalFile, setGlobalFile] = useState<File | null>(null);
  const [globalExtracting, setGlobalExtracting] = useState(false);
  const [globalResults, setGlobalResults] = useState<ExtractionResult[] | null>(null);
  const [globalError, setGlobalError] = useState('');
  const globalFileRef = useRef<HTMLInputElement | null>(null);
  const [selectedExtractions, setSelectedExtractions] = useState<boolean[]>([]);

  useEffect(() => {
    getMeasurementTypes().then(setTypes).catch(() => {});
    if (user?.role === 'doctor') {
      apiClient.get('/doctor/patients').then((res) => {
        const list = res.data.data;
        setPatients(list);
        if (forPatient) {
          const p = list.find((p: any) => p._id === forPatient);
          if (p) setPatientName(p.name);
        }
      }).catch(() => {});
    }
  }, [user?.role, forPatient]);

  useEffect(() => {
    if (selectedPatientId && patients.length > 0) {
      const p = patients.find((p: any) => p._id === selectedPatientId);
      if (p) setPatientName(p.name);
    }
  }, [selectedPatientId, patients]);

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
    if (selectedPatientId) {
      payload.patientId = selectedPatientId;
    }
    return payload;
  };

  const saveMeasurement = async (payload: Record<string, any>) => {
    if (isForPatient || (user?.role === 'doctor' && selectedPatientId)) {
      await apiClient.post(`/doctor/patients/${selectedPatientId}/measurements`, payload);
    } else {
      await createMeasurement(payload as any);
    }
  };

  const handleManualSave = async (key: string, card: CardState) => {
    const numValues: Record<string, number> = {};
    for (const [k, v] of Object.entries(card.values)) {
      if (!v.trim()) {
        setCards((prev) => ({ ...prev, [key]: { ...prev[key], error: 'Compila tutti i campi' } }));
        return;
      }
      numValues[k] = parseFloat(v);
      if (isNaN(numValues[k])) {
        setCards((prev) => ({ ...prev, [key]: { ...prev[key], error: `Valore non valido per "${k}"` } }));
        return;
      }
    }

    setCards((prev) => ({ ...prev, [key]: { ...prev[key], saving: true, error: '' } }));
    try {
      await saveMeasurement(buildPayload(key, numValues, card.units, card.notes || undefined));
      const t = types.find((t) => t.key === key);
      setCards((prev) => ({ ...prev, [key]: { ...initCard(key, t!), saving: false, done: true, expanded: false } }));
      setGlobalMsg('Misurazione salvata');
      setTimeout(() => setGlobalMsg(''), 2000);
    } catch (err: any) {
      setCards((prev) => ({ ...prev, [key]: { ...prev[key], saving: false, error: err.response?.data?.error || 'Errore' } }));
    }
  };

  const handleCsvUpload = async (key: string, card: CardState) => {
    setCards((prev) => ({ ...prev, [key]: { ...prev[key], saving: true, error: '' } }));
    try {
      const formData = new FormData();
      formData.append('file', card.file!);
      formData.append('measurementType', key);
      if (selectedPatientId) {
        formData.append('patientId', selectedPatientId);
      }
      await apiClient.post('/measurements/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCards((prev) => ({ ...prev, [key]: { ...initCard(key, types.find((t) => t.key === key)!), saving: false, done: true, expanded: false } }));
      setGlobalMsg('CSV importato');
      setTimeout(() => setGlobalMsg(''), 2000);
    } catch (err: any) {
      setCards((prev) => ({ ...prev, [key]: { ...prev[key], saving: false, error: err.response?.data?.error || 'Import fallito' } }));
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
        setCards((prev) => ({ ...prev, [key]: { ...prev[key], error: 'Usa l\'area di upload globale per immagini/PDF' } }));
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
        setGlobalError('L\'IA non ha identificato misurazioni in questo documento.');
      } else {
        setGlobalResults(results);
        setSelectedExtractions(results.map(() => true));
      }
    } catch (err: any) {
      setGlobalError(err.response?.data?.error || 'Estrazione IA fallita');
    }
    setGlobalExtracting(false);
  };

  const handleGlobalSaveSelected = async () => {
    if (!globalResults) return;
    const toSave = globalResults.filter((_, i) => selectedExtractions[i]);
    if (toSave.length === 0) return;
    setGlobalExtracting(true);
    let saved = 0;
    let failed = 0;
    for (const result of toSave) {
      try {
        const values: Record<string, number> = {};
        const units: Record<string, string> = {};
        for (const f of result.fields) {
          values[f.key] = f.value;
          units[f.key] = f.unit;
        }
        await saveMeasurement(buildPayload(result.type, values, units, result.notes));
        saved++;
      } catch {
        failed++;
      }
    }
    setGlobalResults(null);
    setGlobalFile(null);
    setSelectedExtractions([]);
    setGlobalExtracting(false);
    setGlobalMsg(`Salvate ${saved} misurazione(i)${failed > 0 ? `, ${failed} fallite` : ''}`);
    setTimeout(() => setGlobalMsg(''), 3000);
  };

  const toggleAllExtractions = (value: boolean) => {
    if (!globalResults) return;
    setSelectedExtractions(globalResults.map(() => value));
  };

  const toggleExtraction = (index: number) => {
    setSelectedExtractions((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const updateGlobalField = (typeIndex: number, fieldIndex: number, value: number) => {
    if (!globalResults) return;
    const results = [...globalResults];
    const fields = [...results[typeIndex].fields];
    fields[fieldIndex] = { ...fields[fieldIndex], value };
    results[typeIndex] = { ...results[typeIndex], fields };
    setGlobalResults(results);
  };

  const title = isForPatient
    ? (patientName ? `Nuova Misurazione per ${patientName}` : 'Nuova Misurazione Paziente')
    : 'Nuova Misurazione';

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        {globalMsg && <p className="text-sm text-green-600">{globalMsg}</p>}
      </div>

      {/* Patient selector (doctor only, no forPatient) */}
      {user?.role === 'doctor' && !isForPatient && (
        <div className="bg-white rounded-lg border shadow-sm p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Paziente</label>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="w-full max-w-sm border rounded px-3 py-2 text-sm"
          >
            <option value="">Le mie misure</option>
            {patients.map((p: any) => (
              <option key={p._id} value={p._id}>{p.name} ({p.email})</option>
            ))}
          </select>
        </div>
      )}

      {/* Global upload zone */}
      <div className="bg-white rounded-lg border shadow-sm p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Carica Documento</h2>
        <p className="text-xs text-gray-500 mb-3">
          Carica un referto PDF, screenshot o immagine. L'IA estrarrà automaticamente tutte le misurazioni.
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
                Rimuovi
              </button>
            </div>
          ) : (
            <div>
              <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-500">Clicca per caricare PDF o immagine</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF accettati</p>
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
            {globalExtracting ? 'Analisi in corso...' : 'Analizza Documento con IA'}
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
            <p className="text-sm text-gray-600">Analisi documento in corso...</p>
          </div>
        </div>
      )}

      {/* Multi-type preview modal */}
      {globalResults && !globalExtracting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setGlobalResults(null); setGlobalFile(null); setSelectedExtractions([]); }}>
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Misurazioni Estratte</h2>
              <span className="text-xs text-gray-400">{globalResults.length} tipo(i) trovati</span>
            </div>

            <div className="flex gap-2 mb-3">
              <button onClick={() => toggleAllExtractions(true)} className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded border border-blue-300 hover:bg-blue-50">
                Seleziona tutti
              </button>
              <button onClick={() => toggleAllExtractions(false)} className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded border border-gray-300 hover:bg-gray-50">
                Deseleziona tutti
              </button>
            </div>

            {globalResults.map((result, ti) => {
              const selected = selectedExtractions[ti] ?? true;
              return (
              <div key={result.type} className={`border rounded-lg mb-4 overflow-hidden transition-opacity ${selected ? '' : 'opacity-50'}`}>
                <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-b">
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleExtraction(ti)}
                      className="w-4 h-4"
                    />
                    <span className="text-lg">{getIcon(result.type)}</span>
                    <span className="font-medium text-sm">{result.typeName}</span>
                    {result.isNew && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-semibold">🆕 Nuovo</span>}
                  </label>
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
                          disabled={!selected}
                          className={`flex-1 border rounded px-3 py-1.5 text-sm ${selected ? '' : 'bg-gray-100 text-gray-400'}`}
                        />
                        <span className="text-sm text-gray-500 w-12">{f.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              );
            })}

            {globalResults.some(r => r.isNew) && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 text-xs text-purple-700 mb-3">
                I tipi contrassegnati con 🆕 Nuovo sono stati aggiunti automaticamente al sistema.
                Un amministratore deve attivarli prima che appaiano tra i tipi di misurazione.
              </div>
            )}
            <div className="flex gap-2 sticky bottom-0 bg-white pt-3 border-t">
              <button
                onClick={handleGlobalSaveSelected}
                disabled={selectedExtractions.filter(Boolean).length === 0}
                className={`flex-1 py-2 rounded-lg text-sm ${
                  selectedExtractions.filter(Boolean).length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Salva ({selectedExtractions.filter(Boolean).length} di {globalResults.length} selezionate)
              </button>
              <button
                onClick={() => { setGlobalResults(null); setGlobalFile(null); setSelectedExtractions([]); }}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg text-sm hover:bg-gray-300"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Measurement type cards */}
      {types.length === 0 && (
        <p className="text-center py-12 text-gray-500 bg-white rounded-lg border">Nessun tipo misurazione disponibile</p>
      )}

      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-700">Oppure inserisci manualmente</h2>
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
                {done && <span className="text-green-600 text-sm shrink-0">✓ Salvato</span>}
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
                      Manuale
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
                          placeholder="Note (opzionale)"
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
                            <p className="text-xs text-gray-400 mt-1">Clicca Importa CSV qui sotto</p>
                            <button
                              onClick={(e) => { e.stopPropagation(); setFile(t.key, null); }}
                              className="text-xs text-red-500 hover:underline mt-1"
                            >
                              Rimuovi
                            </button>
                          </div>
                        ) : (
                          <div>
                            <svg className="w-6 h-6 text-gray-400 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="text-xs text-gray-500">Carica file CSV per import massivo</p>
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
                    {saving ? 'Salvataggio...' : mode === 'manual' ? 'Salva' : 'Importa CSV'}
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
