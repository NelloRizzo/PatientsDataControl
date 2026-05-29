import { useState, useEffect, useRef } from 'react';
import { getMeasurementTypes } from '../api/measurementTypes';
import { createMeasurement } from '../api/measurements';
import type { IMeasurementTypeConfig } from '@healthbridge/shared';

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
};

function getIcon(key: string) {
  return icons[key] || '📊';
}

export function NewMeasurement() {
  const [types, setTypes] = useState<IMeasurementTypeConfig[]>([]);
  const [cards, setCards] = useState<Record<string, CardState>>({});
  const [globalMsg, setGlobalMsg] = useState('');
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    getMeasurementTypes().then(setTypes).catch(() => {});
  }, []);

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

  const handleSave = async (key: string) => {
    const card = cards[key];
    if (!card) return;

    if (card.mode === 'manual') {
      const numValues: Record<string, number> = {};
      for (const [k, v] of Object.entries(card.values)) {
        if (!v.trim()) {
          setCards((prev) => ({ ...prev, [key]: { ...prev[key], error: `Fill in all fields` } }));
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
        await createMeasurement({ type: key, values: numValues, units: card.units, notes: card.notes || undefined });
        const t = types.find((t) => t.key === key);
        setCards((prev) => ({ ...prev, [key]: { ...initCard(key, t!), saving: false, done: true, expanded: false } }));
        setTimeout(() => setCards((prev) => ({ ...prev, [key]: { ...prev[key], done: false } })), 2000);
      } catch (err: any) {
        setCards((prev) => ({ ...prev, [key]: { ...prev[key], saving: false, error: err.response?.data?.error || 'Failed' } }));
      }
    } else {
      // Upload mode — for now just confirm the file is selected
      if (!card.file) {
        setCards((prev) => ({ ...prev, [key]: { ...prev[key], error: 'Select a file' } }));
        return;
      }
      setCards((prev) => ({ ...prev, [key]: { ...prev[key], saving: true, error: '' } }));
      try {
        const { default: apiClient } = await import('../api/client');
        const formData = new FormData();
        formData.append('file', card.file);
        formData.append('type', key);
        await apiClient.post('/measurements/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        setCards((prev) => ({ ...prev, [key]: { ...initCard(key, types.find((t) => t.key === key)!), saving: false, done: true, expanded: false } }));
        setTimeout(() => setCards((prev) => ({ ...prev, [key]: { ...prev[key], done: false } })), 2000);
      } catch (err: any) {
        setCards((prev) => ({ ...prev, [key]: { ...prev[key], saving: false, error: err.response?.data?.error || 'Upload failed' } }));
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">New Measurement</h1>
        {globalMsg && <p className="text-sm text-green-600">{globalMsg}</p>}
      </div>

      {types.length === 0 && (
        <p className="text-center py-12 text-gray-500 bg-white rounded-lg border">No measurement types available</p>
      )}

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
              {/* Card header */}
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

              {/* Expanded content */}
              {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t pt-3">
                  {/* Mode toggle */}
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
                      Upload
                    </button>
                  </div>

                  {error && <p className="text-xs text-red-600">{error}</p>}

                  {/* Manual mode */}
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

                  {/* Upload mode */}
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
                            <p className="text-xs text-gray-500">Click to upload CSV / image</p>
                          </div>
                        )}
                      </div>
                      <input
                        ref={(el) => { fileInputRefs.current[t.key] = el; }}
                        type="file"
                        accept=".csv,.png,.jpg,.jpeg,.pdf"
                        onChange={(e) => setFile(t.key, e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </div>
                  )}

                  {/* Save button */}
                  <button
                    onClick={() => handleSave(t.key)}
                    disabled={saving}
                    className="w-full bg-blue-600 text-white text-sm py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Saving...' : mode === 'manual' ? 'Save' : 'Upload & Save'}
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
