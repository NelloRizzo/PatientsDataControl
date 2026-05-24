import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMeasurementTypes } from '../api/measurementTypes';
import { createMeasurement } from '../api/measurements';
import type { IMeasurementTypeConfig } from '../../../shared/dist/index.js';

export function NewMeasurement() {
  const navigate = useNavigate();
  const [types, setTypes] = useState<IMeasurementTypeConfig[]>([]);
  const [selectedType, setSelectedType] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [unitSelections, setUnitSelections] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getMeasurementTypes().then(setTypes).catch(() => {});
  }, []);

  const currentType = types.find((t) => t.key === selectedType);

  const handleTypeChange = (key: string) => {
    setSelectedType(key);
    const t = types.find((t) => t.key === key);
    if (t) {
      const initial: Record<string, string> = {};
      const units: Record<string, string> = {};
      for (const f of t.fields) {
        initial[f.key] = '';
        units[f.key] = f.unit;
      }
      setValues(initial);
      setUnitSelections(units);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || !currentType) return;

    setError('');
    try {
      const numValues: Record<string, number> = {};
      for (const [k, v] of Object.entries(values)) {
        numValues[k] = parseFloat(v);
        if (isNaN(numValues[k])) {
          setError(`Invalid value for field "${k}"`);
          return;
        }
      }

      await createMeasurement({
        type: selectedType,
        values: numValues,
        units: unitSelections,
        notes: notes || undefined,
      });
      navigate('/measurements');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create measurement');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">New Measurement</h1>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            value={selectedType}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="">Select type...</option>
            {types.map((t) => (
              <option key={t.key} value={t.key}>{t.name}</option>
            ))}
          </select>
        </div>

        {currentType?.fields.map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-medium mb-1">
              {field.name}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step={field.type === 'integer' ? 1 : 0.01}
                value={values[field.key] || ''}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                className="flex-1 border rounded px-3 py-2"
                min={field.min}
                max={field.max}
                required
              />
              <select
                value={unitSelections[field.key] || field.unit}
                onChange={(e) => setUnitSelections((u) => ({ ...u, [field.key]: e.target.value }))}
                className="border rounded px-3 py-2"
              >
                {field.units.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border rounded px-3 py-2"
            rows={3}
            maxLength={500}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Save Measurement
        </button>
      </form>
    </div>
  );
}
