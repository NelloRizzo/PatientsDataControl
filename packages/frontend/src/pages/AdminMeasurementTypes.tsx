import { useState, useEffect } from 'react';
import {
  getAllMeasurementTypes, getMeasurementTypes, createMeasurementType, updateMeasurementType, deleteMeasurementType,
} from '../api/measurementTypes';
import type { IMeasurementTypeConfig } from '@healthbridge/shared';

const emptyType = {
  key: '', name: '', description: '', category: '',
  fields: [{ key: '', name: '', unit: '', units: [''], type: 'decimal' as const }],
};

export function AdminMeasurementTypes() {
  const [types, setTypes] = useState<IMeasurementTypeConfig[]>([]);
  const [editing, setEditing] = useState<Partial<IMeasurementTypeConfig> & { fields: any[] } | null>(null);

  const load = async () => {
    const data = await getAllMeasurementTypes();
    setTypes(data);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editing) return;
    try {
      if ((editing as any)._id) {
        await updateMeasurementType(editing.key!, editing);
      } else {
        await createMeasurementType(editing as any);
      }
      setEditing(null);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error saving type');
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm('Delete this measurement type?')) return;
    await deleteMeasurementType(key);
    load();
  };

  const addField = () => {
    if (!editing) return;
    setEditing({
      ...editing,
      fields: [...editing.fields, { key: '', name: '', unit: '', units: [''], type: 'decimal' }],
    });
  };

  const updateField = (index: number, data: Partial<any>) => {
    if (!editing) return;
    const fields = [...editing.fields];
    fields[index] = { ...fields[index], ...data };
    setEditing({ ...editing, fields });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Measurement Types</h1>
        <button
          onClick={() => setEditing({ ...emptyType })}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          New Type
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Key</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Category</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Fields</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Active</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {types.map((t) => (
              <tr key={t._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{t.key}</td>
                <td className="px-4 py-3">{t.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{t.category}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {t.fields.map((f) => f.name).join(', ')}
                </td>
                <td className="px-4 py-3">{t.active ? '✓' : '✗'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setEditing({ ...t, fields: t.fields.map((f) => ({ ...f })) })}
                    className="text-blue-600 hover:underline text-sm mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(t.key)}
                    className="text-red-600 hover:underline text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">
              {(editing as any)._id ? 'Edit Type' : 'New Type'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium">Key</label>
                <input
                  value={editing.key || ''}
                  onChange={(e) => setEditing({ ...editing, key: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g. blood_pressure"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input
                  value={editing.name || ''}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Category</label>
                <input
                  value={editing.category || ''}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Description</label>
                <input
                  value={editing.description || ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium">Fields</label>
                  <button
                    type="button"
                    onClick={addField}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    + Add field
                  </button>
                </div>
                <div className="space-y-3 mt-2">
                  {editing.fields?.map((field, i) => (
                    <div key={i} className="border rounded p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={field.key}
                          onChange={(e) => updateField(i, { key: e.target.value })}
                          className="border rounded px-2 py-1 text-sm"
                          placeholder="Field key"
                        />
                        <input
                          value={field.name}
                          onChange={(e) => updateField(i, { name: e.target.value })}
                          className="border rounded px-2 py-1 text-sm"
                          placeholder="Field name"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={field.unit}
                          onChange={(e) => updateField(i, { unit: e.target.value })}
                          className="flex-1 border rounded px-2 py-1 text-sm"
                          placeholder="Default unit"
                        />
                        <input
                          value={field.units?.join(',') || ''}
                          onChange={(e) => updateField(i, { units: e.target.value.split(',').map((s: string) => s.trim()) })}
                          className="flex-1 border rounded px-2 py-1 text-sm"
                          placeholder="Units (comma-separated)"
                        />
                      </div>
                      <details className="text-xs">
                        <summary className="cursor-pointer text-gray-500 hover:text-gray-700">Thresholds (alert / danger)</summary>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-gray-500">Alert Min</label>
                            <input type="number" value={field.alertMin ?? ''} onChange={(e) => updateField(i, { alertMin: e.target.value ? parseFloat(e.target.value) : undefined })}
                              className="w-full border rounded px-2 py-1 text-sm" />
                          </div>
                          <div>
                            <label className="block text-gray-500">Alert Max</label>
                            <input type="number" value={field.alertMax ?? ''} onChange={(e) => updateField(i, { alertMax: e.target.value ? parseFloat(e.target.value) : undefined })}
                              className="w-full border rounded px-2 py-1 text-sm" />
                          </div>
                          <div>
                            <label className="block text-gray-500">Danger Min</label>
                            <input type="number" value={field.dangerMin ?? ''} onChange={(e) => updateField(i, { dangerMin: e.target.value ? parseFloat(e.target.value) : undefined })}
                              className="w-full border rounded px-2 py-1 text-sm" />
                          </div>
                          <div>
                            <label className="block text-gray-500">Danger Max</label>
                            <input type="number" value={field.dangerMax ?? ''} onChange={(e) => updateField(i, { dangerMax: e.target.value ? parseFloat(e.target.value) : undefined })}
                              className="w-full border rounded px-2 py-1 text-sm" />
                          </div>
                        </div>
                      </details>
                      <button
                        type="button"
                        onClick={() => {
                          const fields = editing.fields?.filter((_: any, j: number) => j !== i);
                          setEditing({ ...editing, fields });
                        }}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 border py-2 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
