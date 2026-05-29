import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { getContracts, createContract, updateContract, deleteContract } from '../api/contracts';
import type { ContractData } from '../api/contracts';
import type { IUser } from '@healthbridge/shared';

export function AdminContracts() {
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [doctors, setDoctors] = useState<IUser[]>([]);

  // Create / Edit state
  const [editing, setEditing] = useState<Partial<ContractData> & { doctorId?: string } | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = async () => {
    const res = await getContracts();
    setContracts(res.data);
    const u = await apiClient.get('/admin/users', { params: { role: 'doctor' } });
    setDoctors(u.data.data);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editing) return;
    setMsg(''); setErr('');
    try {
      if ((editing as any)._id) {
        await updateContract((editing as any)._id, editing);
      } else {
        await createContract(editing);
      }
      setEditing(null);
      setMsg('Contract saved');
      load();
    } catch (err: any) {
      setErr(err.response?.data?.error || 'Failed to save contract');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Doctor Contracts</h1>
        <div className="flex gap-2">
          <Link to="/admin/contracts/report" className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700">
            Report
          </Link>
          <button onClick={() => { setEditing({ doctorId: '', startDate: '', endDate: '', maxPatients: 1, fee: 0, currency: 'EUR', status: 'active' }); setMsg(''); setErr(''); }} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700">
            New Contract
          </button>
        </div>
      </div>

      {msg && <p className="text-sm text-green-600">{msg}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{(editing as any)._id ? 'Edit Contract' : 'New Contract'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium">Doctor</label>
                <select
                  value={editing.doctorId || ''}
                  onChange={(e) => setEditing({ ...editing, doctorId: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Select doctor...</option>
                  {doctors.map((d) => (
                    <option key={d._id} value={d._id}>{d.name} ({d.email})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium">Start Date</label>
                  <input
                    type="date"
                    value={editing.startDate || ''}
                    onChange={(e) => setEditing({ ...editing, startDate: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">End Date</label>
                  <input
                    type="date"
                    value={editing.endDate || ''}
                    onChange={(e) => setEditing({ ...editing, endDate: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium">Max Patients</label>
                  <input
                    type="number"
                    min={1}
                    value={editing.maxPatients || ''}
                    onChange={(e) => setEditing({ ...editing, maxPatients: parseInt(e.target.value) || 1 })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Fee</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={editing.fee ?? ''}
                    onChange={(e) => setEditing({ ...editing, fee: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Currency</label>
                  <select
                    value={editing.currency || 'EUR'}
                    onChange={(e) => setEditing({ ...editing, currency: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium">Status</label>
                <select
                  value={editing.status || 'active'}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value as any })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Notes</label>
                <textarea
                  value={editing.notes || ''}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                  Save
                </button>
                <button onClick={() => setEditing(null)} className="bg-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-400">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Doctor</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Period</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Max Patients</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Fee</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {contracts.map((c) => (
              <tr key={c._id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium">{c.doctorName}</p>
                  <p className="text-xs text-gray-500">{c.doctorEmail}</p>
                </td>
                <td className="px-4 py-3 text-sm">
                  {c.startDate} → {c.endDate}
                </td>
                <td className="px-4 py-3 text-sm">{c.maxPatients}</td>
                <td className="px-4 py-3 text-sm">{c.fee} {c.currency}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded ${
                    c.status === 'active' ? 'bg-green-100 text-green-700' :
                    c.status === 'expired' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { setEditing({ ...c, doctorId: c.doctorId }); setMsg(''); setErr(''); }} className="text-blue-600 hover:underline text-sm mr-2">Edit</button>
                  <button onClick={async () => { if (confirm('Delete this contract?')) { await deleteContract(c._id); load(); } }} className="text-red-600 hover:underline text-sm">Delete</button>
                </td>
              </tr>
            ))}
            {contracts.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-500 text-sm">No contracts yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
