import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import type { IUser } from '../../../shared/dist/index.js';

const emptyAddress = { full: '', city: '', province: '', region: '', country: '', zip: '' };

export function AdminUsers() {
  const [users, setUsers] = useState<IUser[]>([]);
  const [roleFilter, setRoleFilter] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('patient');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newSex, setNewSex] = useState('');
  const [newHome, setNewHome] = useState({ ...emptyAddress });
  const [newLegal, setNewLegal] = useState({ ...emptyAddress });
  const [createMsg, setCreateMsg] = useState('');
  const [createErr, setCreateErr] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editSex, setEditSex] = useState('');
  const [editHome, setEditHome] = useState({ ...emptyAddress });
  const [editLegal, setEditLegal] = useState({ ...emptyAddress });
  const [editMsg, setEditMsg] = useState('');
  const [editErr, setEditErr] = useState('');

  const loadUsers = () => {
    const params: any = {};
    if (roleFilter) params.role = roleFilter;
    apiClient.get('/admin/users', { params }).then((res) => setUsers(res.data.data));
  };

  useEffect(() => { loadUsers(); }, [roleFilter]);

  const resetForm = () => {
    setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('patient');
    setNewBirthDate(''); setNewSex('');
    setNewHome({ ...emptyAddress }); setNewLegal({ ...emptyAddress });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMsg(''); setCreateErr('');
    try {
      const body: Record<string, any> = { email: newEmail, password: newPassword, name: newName, role: newRole };
      if (newBirthDate) body.birthDate = newBirthDate;
      if (newSex) body.sex = newSex;
      if (Object.values(newHome).some(Boolean)) body.homeAddress = newHome;
      if (Object.values(newLegal).some(Boolean)) body.legalAddress = newLegal;

      await apiClient.post('/admin/users', body);
      resetForm();
      setShowCreate(false);
      setCreateMsg('User created');
      loadUsers();
    } catch (err: any) {
      setCreateErr(err.response?.data?.error || 'Failed to create user');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this user permanently?')) return;
    try { await apiClient.delete(`/admin/users/${id}`); loadUsers(); } catch {}
  };

  const normAddr = (a: any) => a ? { ...emptyAddress, ...a } : { ...emptyAddress };

  const startEdit = (u: IUser) => {
    setEditingId(u._id);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditPassword('');
    setEditRole(u.role);
    setEditBirthDate(u.birthDate?.split('T')[0] || '');
    setEditSex(u.sex || '');
    setEditHome(normAddr(u.homeAddress));
    setEditLegal(normAddr(u.legalAddress));
    setEditMsg(''); setEditErr('');
  };

  const handleEditSave = async (id: string, orig: IUser) => {
    setEditMsg(''); setEditErr('');
    try {
      const body: Record<string, any> = {};
      if (editName !== orig.name) body.name = editName;
      if (editEmail !== orig.email) body.email = editEmail;
      if (editPassword) body.password = editPassword;
      if (editRole !== orig.role) body.role = editRole;
      if (editBirthDate !== (orig.birthDate?.split('T')[0] || '')) body.birthDate = editBirthDate || null;
      if (editSex !== (orig.sex || '')) body.sex = editSex || null;
      if (JSON.stringify(editHome) !== JSON.stringify(orig.homeAddress)) {
        body.homeAddress = Object.values(editHome).some(Boolean) ? editHome : null;
      }
      if (JSON.stringify(editLegal) !== JSON.stringify(orig.legalAddress)) {
        body.legalAddress = Object.values(editLegal).some(Boolean) ? editLegal : null;
      }
      if (Object.keys(body).length === 0) { setEditingId(null); return; }
      await apiClient.put(`/admin/users/${id}`, body);
      setEditMsg('User updated');
      loadUsers();
    } catch (err: any) { setEditErr(err.response?.data?.error || 'Update failed'); }
  };

  const addrInput = (label: string, fields: any, setter: any) => (
    <div className="border rounded p-3">
      <p className="text-xs font-medium text-gray-600 mb-2">{label}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className="block text-xs text-gray-400">Full address</label>
          <input value={fields.full} onChange={(e) => setter({ ...fields, full: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-400">City</label>
          <input value={fields.city} onChange={(e) => setter({ ...fields, city: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-400">Province</label>
          <input value={fields.province} onChange={(e) => setter({ ...fields, province: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-400">Region</label>
          <input value={fields.region} onChange={(e) => setter({ ...fields, region: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-400">Country</label>
          <input value={fields.country} onChange={(e) => setter({ ...fields, country: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-400">ZIP</label>
          <input value={fields.zip} onChange={(e) => setter({ ...fields, zip: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <button onClick={() => { setShowCreate(!showCreate); if (!showCreate) resetForm(); }} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700">
          {showCreate ? 'Cancel' : 'Create User'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name *</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} required className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email *</label>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Password *</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Role *</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="analyst">Analyst</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Birth date</label>
              <input type="date" value={newBirthDate} onChange={(e) => setNewBirthDate(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Sex</label>
              <select value={newSex} onChange={(e) => setNewSex(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                <option value="">Not specified</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {addrInput('Home Address', newHome, setNewHome)}
          {addrInput('Legal Address', newLegal, setNewLegal)}

          <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700">Create</button>
          {createMsg && <p className="text-xs text-green-600">{createMsg}</p>}
          {createErr && <p className="text-xs text-red-600">{createErr}</p>}
        </form>
      )}

      <div className="flex gap-2">
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="border rounded px-3 py-2">
          <option value="">All roles</option>
          <option value="patient">Patient</option>
          <option value="doctor">Doctor</option>
          <option value="analyst">Analyst</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Role</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Area</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u._id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">{u.role}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {u.homeAddress?.city || u.legalAddress?.city || '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(u)} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-200">Edit</button>
                    <button onClick={() => handleDelete(u._id)} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded hover:bg-red-200">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {editingId && (() => {
          const orig = users.find((u) => u._id === editingId);
          if (!orig) return null;
          return (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-blue-800">Editing — {orig.name}</p>
                <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-gray-700">Close</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Name</label>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full border rounded px-2 py-1 text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email</label>
                  <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full border rounded px-2 py-1 text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">New Password</label>
                  <input type="password" value={editPassword} placeholder="Leave empty to keep" onChange={(e) => setEditPassword(e.target.value)} minLength={8} className="w-full border rounded px-2 py-1 text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Role</label>
                  <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="w-full border rounded px-2 py-1 text-sm bg-white">
                    <option value="patient">Patient</option>
                    <option value="doctor">Doctor</option>
                    <option value="analyst">Analyst</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Sex</label>
                  <select value={editSex} onChange={(e) => setEditSex(e.target.value)} className="w-full border rounded px-2 py-1 text-sm bg-white">
                    <option value="">Not specified</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Birth Date</label>
                  <input type="date" value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} className="w-full border rounded px-2 py-1 text-sm bg-white" />
                </div>
              </div>
              {addrInput('Home Address', editHome, setEditHome)}
              {addrInput('Legal Address', editLegal, setEditLegal)}
              <div className="flex gap-2 items-center">
                <button onClick={() => handleEditSave(editingId, orig)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700">Save Changes</button>
                <button onClick={() => setEditingId(null)} className="bg-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-400">Cancel</button>
              </div>
              {editMsg && <p className="text-xs text-green-600">{editMsg}</p>}
              {editErr && <p className="text-xs text-red-600">{editErr}</p>}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
