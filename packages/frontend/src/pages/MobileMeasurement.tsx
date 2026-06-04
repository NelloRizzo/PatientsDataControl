import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMeasurementTypes } from '../api/measurementTypes';
import { createMeasurement } from '../api/measurements';
import { useAuth } from '../context/AuthContext';
import type { IMeasurementTypeConfig } from '@healthbridge/shared';

function getIcon(key: string) {
  const icons: Record<string, string> = {
    blood_pressure: '🫀',
    heart_rate: '❤️',
    glucose: '🩸',
    cholesterol: '🧬',
    weight: '⚖️',
    temperature: '🌡️',
    spo2: '🫁',
    respiratory_rate: '💨',
  };
  return icons[key] || '📋';
}

function loadPreferred(userId: string): string[] {
  try {
    const raw = localStorage.getItem(`hb_preferred_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function savePreferred(userId: string, keys: string[]) {
  localStorage.setItem(`hb_preferred_${userId}`, JSON.stringify(keys));
}

export function MobileMeasurement() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [types, setTypes] = useState<IMeasurementTypeConfig[]>([]);
  const [preferredKeys, setPreferredKeys] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [units, setUnits] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getMeasurementTypes().then((t) => {
      setTypes(t);
      if (user?._id) setPreferredKeys(loadPreferred(user._id));
    }).catch(() => {});
  }, [user?._id]);

  const sortedTypes = types
    .filter((t) => t.active !== false)
    .sort((a, b) => {
      const aP = preferredKeys.includes(a.key) ? 0 : 1;
      const bP = preferredKeys.includes(b.key) ? 0 : 1;
      return aP - bP;
    });

  const currentType = sortedTypes[index];
  const total = sortedTypes.length;

  const togglePreferred = (key: string) => {
    setPreferredKeys((prev) => {
      const next = prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key];
      if (user?._id) savePreferred(user._id, next);
      return next;
    });
  };

  useEffect(() => {
    setValues({});
    setUnits({});
    setNotes('');
    setSaved(false);
    setError('');
  }, [index]);

  const handleSave = async () => {
    if (!currentType) return;
    const numValues: Record<string, number> = {};
    for (const f of currentType.fields) {
      const v = values[f.key]?.trim();
      if (!v) { setError('Compila tutti i campi'); return; }
      const n = parseFloat(v);
      if (isNaN(n)) { setError(`Valore non valido per "${f.name}"`); return; }
      numValues[f.key] = n;
    }
    setSaving(true);
    setError('');
    try {
      await createMeasurement({
        type: currentType.key,
        values: numValues,
        units: Object.fromEntries(currentType.fields.map(f => [f.key, units[f.key] || f.unit])),
        notes: notes || undefined,
      } as any);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setValues({});
      setUnits({});
      setNotes('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">Benvenuto</p>
          <p className="text-sm font-semibold text-gray-800">{user?.name || 'Paziente'}</p>
        </div>
        <button onClick={logout} className="text-xs text-red-500 border border-red-300 px-2 py-1 rounded hover:bg-red-50">
          Esci
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col px-4 pt-6 pb-4">
        {total === 0 ? (
          <p className="text-center text-gray-500 py-12 text-sm">Caricamento...</p>
        ) : currentType ? (
          <>
            {/* Type navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setIndex(i => Math.max(0, i - 1))}
                disabled={index === 0}
                className="text-sm px-3 py-1.5 border rounded-lg bg-white shadow-sm hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Prec
              </button>
              <span className="text-xs text-gray-400 font-medium">{index + 1} di {total}</span>
              <button
                onClick={() => setIndex(i => Math.min(total - 1, i + 1))}
                disabled={index === total - 1}
                className="text-sm px-3 py-1.5 border rounded-lg bg-white shadow-sm hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Succ
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            {/* Card */}
            <div className="bg-white rounded-2xl shadow-md border p-5 flex flex-col flex-1">
              {/* Type header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{getIcon(currentType.key)}</span>
                <div className="flex-1">
                  <p className="text-base font-bold text-gray-800">{currentType.name}</p>
                  {currentType.description && (
                    <p className="text-xs text-gray-400">{currentType.description}</p>
                  )}
                </div>
                <button
                  onClick={() => togglePreferred(currentType.key)}
                  className={`text-2xl transition-all ${preferredKeys.includes(currentType.key) ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}
                  aria-label={preferredKeys.includes(currentType.key) ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                >
                  {preferredKeys.includes(currentType.key) ? '★' : '☆'}
                </button>
              </div>

              {/* Fields */}
              <div className="space-y-4 flex-1">
                {currentType.fields.map((f) => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium text-gray-600 mb-1">{f.name}</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step={f.type === 'integer' ? 1 : 0.01}
                        min={f.min}
                        max={f.max}
                        value={values[f.key] || ''}
                        onChange={(e) => { setValues(v => ({ ...v, [f.key]: e.target.value })); setError(''); }}
                        placeholder="0"
                        inputMode="decimal"
                        className="flex-1 border rounded-xl px-4 py-3 text-lg text-center font-medium bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition-all"
                        required
                      />
                      <select
                        value={units[f.key] || f.unit}
                        onChange={(e) => setUnits(u => ({ ...u, [f.key]: e.target.value }))}
                        className="border rounded-xl px-2 py-1 text-sm bg-gray-50"
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
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Note (opzionale)"
                    maxLength={500}
                    className="w-full border rounded-xl px-4 py-2 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-red-600 mt-2 text-center">{error}</p>
              )}

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className={`mt-4 w-full py-3 rounded-xl text-base font-semibold flex items-center justify-center gap-2 transition-all ${
                  saved
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300'
                }`}
              >
                {saving ? (
                  <>
                    <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    Salvataggio...
                  </>
                ) : saved ? (
                  '✓ Salvato'
                ) : (
                  'Salva'
                )}
              </button>
            </div>
          </>
        ) : null}
      </div>

      {/* Footer */}
      <div className="px-4 pb-6">
        <Link
          to="/measurements"
          className="block w-full text-center text-sm text-gray-500 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          Vai alla Dashboard
        </Link>
      </div>
    </div>
  );
}
