import { useState, useEffect } from 'react';
import apiClient from '../api/client';

interface Association {
  _id: string;
  patientName: string;
  patientId: string;
  doctorName: string;
  doctorId: string;
  status: string;
  assignedAt: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export function AdminAssociations() {
  const [associations, setAssociations] = useState<Association[]>([]);
  const [doctors, setDoctors] = useState<User[]>([]);
  const [patients, setPatients] = useState<User[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedPatient, setSelectedPatient] = useState('');

  const load = async () => {
    const [assocRes, usersRes] = await Promise.all([
      apiClient.get('/admin/associations'),
      apiClient.get('/admin/users'),
    ]);
    setAssociations(assocRes.data.data);
    const users: User[] = usersRes.data.data;
    setDoctors(users.filter((u) => u.role === 'doctor'));
    setPatients(users.filter((u) => u.role === 'patient'));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedPatient) return;
    await apiClient.post('/admin/associations', { doctorId: selectedDoctor, patientId: selectedPatient });
    setShowCreate(false);
    setSelectedDoctor('');
    setSelectedPatient('');
    load();
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this association?')) return;
    await apiClient.patch(`/admin/associations/${id}/remove`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Patient-Doctor Associations</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
        >
          {showCreate ? 'Cancel' : 'New Association'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">Select doctor...</option>
                {doctors.map((d) => <option key={d._id} value={d._id}>{d.name} ({d.email})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
              <select
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">Select patient...</option>
                {patients.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.email})</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
            Create Association
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Doctor</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Patient</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Created</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {associations.map((a) => (
              <tr key={a._id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="text-sm font-medium">{a.doctorName || '-'}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium">{a.patientName || '-'}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${a.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{a.status}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{a.assignedAt ? new Date(a.assignedAt).toLocaleDateString() : '-'}</td>
                <td className="px-4 py-3 text-right">
                  {a.status === 'active' && (
                    <button onClick={() => handleRemove(a._id)} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded hover:bg-red-200">Remove</button>
                  )}
                </td>
              </tr>
            ))}
            {associations.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">No associations found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
