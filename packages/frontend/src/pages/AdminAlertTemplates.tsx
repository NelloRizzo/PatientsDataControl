import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import type { IAlertTemplate } from '../../../shared/dist/index.js';

export function AdminAlertTemplates() {
  const [templates, setTemplates] = useState<IAlertTemplate[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = () => {
    apiClient.get('/alerts/templates').then((res) => setTemplates(res.data.data));
  };

  useEffect(() => { load(); }, []);

  const startEdit = (t: IAlertTemplate) => {
    setEditingId(t._id);
    setEditSubject(t.subject);
    setEditBody(t.body);
    setEditActive(t.active);
    setMsg(''); setErr('');
  };

  const handleSave = async (id: string) => {
    setMsg(''); setErr('');
    try {
      await apiClient.put(`/alerts/templates/${id}`, { subject: editSubject, body: editBody, active: editActive });
      setEditingId(null);
      setMsg('Template updated');
      load();
    } catch (e: any) { setErr(e.response?.data?.error || 'Update failed'); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Alert Templates</h1>
      <p className="text-sm text-gray-500">
        Configure email templates sent to doctors when patient measurements exceed thresholds.
        Available placeholders: <code className="bg-gray-100 px-1 rounded">{'{patientName}'}</code>,{' '}
        <code className="bg-gray-100 px-1 rounded">{'{fieldName}'}</code>,{' '}
        <code className="bg-gray-100 px-1 rounded">{'{value}'}</code>,{' '}
        <code className="bg-gray-100 px-1 rounded">{'{unit}'}</code>,{' '}
        <code className="bg-gray-100 px-1 rounded">{'{thresholdMin}'}</code>,{' '}
        <code className="bg-gray-100 px-1 rounded">{'{thresholdMax}'}</code>,{' '}
        <code className="bg-gray-100 px-1 rounded">{'{measurementType}'}</code>
      </p>

      {msg && <p className="text-sm text-green-600">{msg}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="grid gap-4">
        {templates.map((t) => (
          <div key={t._id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-gray-200 px-2 py-0.5 rounded">{t.measurementType}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${t.status === 'danger' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {t.status}
                </span>
                <span className={`text-xs ${t.active ? 'text-green-600' : 'text-gray-400'}`}>
                  {t.active ? 'active' : 'inactive'}
                </span>
              </div>
              <button onClick={() => startEdit(t)} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-200">Edit</button>
            </div>

            {editingId === t._id ? (
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Subject</label>
                  <input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Body</label>
                  <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={4} className="w-full border rounded px-2 py-1.5 text-sm font-mono" />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                  Active
                </label>
                <div className="flex gap-2">
                  <button onClick={() => handleSave(t._id)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700">Save</button>
                  <button onClick={() => setEditingId(null)} className="bg-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-400">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-1 text-sm">
                <p><span className="text-gray-500">Subject:</span> {t.subject}</p>
                <p><span className="text-gray-500">Body:</span> {t.body}</p>
                <p className="text-xs text-gray-400">
                  Channels: {t.channels?.filter((c) => c.enabled).map((c) => c.type).join(', ') || 'none'}
                </p>
              </div>
            )}
          </div>
        ))}
        {templates.length === 0 && (
          <p className="text-center text-gray-500 py-8">No alert templates configured</p>
        )}
      </div>
    </div>
  );
}
