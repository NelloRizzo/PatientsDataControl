import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import type { IUser } from '@healthbridge/shared';

const ROLE_LABELS: Record<string, string> = {
  patient: 'Paziente',
  doctor: 'Medico',
  analyst: 'Analista',
  admin: 'Admin',
  nurse: 'Infermiere',
};

const emptyAddress = { full: '', city: '', province: '', region: '', country: '', zip: '' };

export function AdminUsers() {
  const [users, setUsers] = useState<IUser[]>([]);
  const [roleFilter, setRoleFilter] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('doctor');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newSex, setNewSex] = useState('');
  const [newMaxPatients, setNewMaxPatients] = useState('');
  const [newHome, setNewHome] = useState({ ...emptyAddress });
  const [newLegal, setNewLegal] = useState({ ...emptyAddress });
  const [createMsg, setCreateMsg] = useState('');
  const [createErr, setCreateErr] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editSex, setEditSex] = useState('');
  const [editMaxPatients, setEditMaxPatients] = useState('');
  const [editHome, setEditHome] = useState({ ...emptyAddress });
  const [editLegal, setEditLegal] = useState({ ...emptyAddress });
  const [editMsg, setEditMsg] = useState('');
  const [editErr, setEditErr] = useState('');

  const [resetPwdUserId, setResetPwdUserId] = useState<string | null>(null);
  const [resetPwdUserName, setResetPwdUserName] = useState('');
  const [resetPwdPassword, setResetPwdPassword] = useState('');
  const [resetPwdMsg, setResetPwdMsg] = useState('');
  const [resetPwdErr, setResetPwdErr] = useState('');

  const handleResetPassword = async () => {
    if (!resetPwdUserId || !resetPwdPassword) return;
    setResetPwdMsg('');
    setResetPwdErr('');
    try {
      await apiClient.post(`/admin/users/${resetPwdUserId}/reset-password`, { password: resetPwdPassword });
      setResetPwdMsg('Password reimpostata con successo');
      setResetPwdPassword('');
      setTimeout(() => { setResetPwdUserId(null); setResetPwdMsg(''); }, 2000);
    } catch (err: any) {
      setResetPwdErr(err.response?.data?.error || 'Errore durante il reset');
    }
  };

  const loadUsers = () => {
    const params: any = {};
    if (roleFilter) params.role = roleFilter;
    apiClient.get('/admin/users', { params }).then((res) => setUsers(res.data.data));
  };

  useEffect(() => { loadUsers(); }, [roleFilter]);

  const resetForm = () => {
    setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('doctor');
    setNewBirthDate(''); setNewSex(''); setNewMaxPatients('');
    setNewHome({ ...emptyAddress }); setNewLegal({ ...emptyAddress });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMsg(''); setCreateErr('');
    try {
      const body: Record<string, any> = { email: newEmail, password: newPassword, name: newName, role: newRole };
      if (newBirthDate) body.birthDate = newBirthDate;
      if (newSex) body.sex = newSex;
      if (newMaxPatients) body.maxPatients = parseInt(newMaxPatients);
      if (Object.values(newHome).some(Boolean)) body.homeAddress = newHome;
      if (Object.values(newLegal).some(Boolean)) body.legalAddress = newLegal;

      await apiClient.post('/admin/users', body);
      setCreateMsg('Utente creato con successo');
      resetForm();
      setShowCreate(false);
      loadUsers();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setCreateErr('Email già registrata');
      } else {
        setCreateErr(err.response?.data?.error || err.message || 'Errore durante la creazione');
      }
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
    setEditMaxPatients(u.maxPatients != null ? String(u.maxPatients) : '');
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
      if (editMaxPatients !== (orig.maxPatients != null ? String(orig.maxPatients) : '')) body.maxPatients = editMaxPatients ? parseInt(editMaxPatients) : null;
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
          <input autoComplete="off" value={fields.full} onChange={(e) => setter({ ...fields, full: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-400">City</label>
          <input autoComplete="off" value={fields.city} onChange={(e) => setter({ ...fields, city: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-400">Province</label>
          <input autoComplete="off" value={fields.province} onChange={(e) => setter({ ...fields, province: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-400">Region</label>
          <input autoComplete="off" value={fields.region} onChange={(e) => setter({ ...fields, region: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-400">Country</label>
          <input autoComplete="off" value={fields.country} onChange={(e) => setter({ ...fields, country: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-400">ZIP</label>
          <input autoComplete="off" value={fields.zip} onChange={(e) => setter({ ...fields, zip: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
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
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} className="w-full border rounded px-2 py-1.5 text-sm pr-8" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                  {showPwd ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Role *</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                <option value="doctor">Medico</option>
                <option value="analyst">Analista</option>
                <option value="admin">Admin</option>
                <option value="nurse">Infermiere</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Max Patients</label>
              <input
                type="number"
                min={1}
                value={newMaxPatients}
                onChange={(e) => setNewMaxPatients(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm"
                disabled={newRole !== 'doctor'}
              />
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
          {createErr && <p className="text-xs text-red-600">{createErr}</p>}
        </form>
      )}
      {createMsg && <p className="text-xs text-green-600 mt-2">{createMsg}</p>}

      <div className="flex gap-2">
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="border rounded px-3 py-2">
          <option value="">Tutti</option>
          <option value="patient">Paziente</option>
          <option value="doctor">Medico</option>
          <option value="analyst">Analista</option>
          <option value="admin">Admin</option>
          <option value="nurse">Infermiere</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Role</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Max Patients</th>
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
                <td className="px-4 py-3 text-sm">
                  {u.role === 'doctor' ? (u.maxPatients ?? '-') : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {u.homeAddress?.city || u.legalAddress?.city || '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(u)} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-200">Modifica</button>
                    <button onClick={() => { setResetPwdUserId(u._id); setResetPwdUserName(u.name); setResetPwdPassword(''); setResetPwdMsg(''); setResetPwdErr(''); }} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded hover:bg-orange-200">Reset Pwd</button>
                    <button onClick={() => handleDelete(u._id)} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded hover:bg-red-200">Elimina</button>
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
                    <option value="patient">Paziente</option>
                    <option value="doctor">Medico</option>
                    <option value="analyst">Analista</option>
                    <option value="admin">Admin</option>
                    <option value="nurse">Infermiere</option>
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
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Patients</label>
                  <input
                    type="number"
                    min={1}
                    value={editMaxPatients}
                    onChange={(e) => setEditMaxPatients(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm bg-white"
                    disabled={editRole !== 'doctor'}
                  />
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

      {/* Reset Password Modal */}
      {resetPwdUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold mb-1">Reset Password</h3>
            <p className="text-sm text-gray-500 mb-4">Reimposta la password per <strong>{resetPwdUserName}</strong></p>
            <input
              type="password"
              minLength={8}
              value={resetPwdPassword}
              onChange={(e) => setResetPwdPassword(e.target.value)}
              placeholder="Nuova password (min 8 caratteri)"
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
            />
            {resetPwdMsg && <p className="text-xs text-green-600 mb-2">{resetPwdMsg}</p>}
            {resetPwdErr && <p className="text-xs text-red-600 mb-2">{resetPwdErr}</p>}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setResetPwdUserId(null); setResetPwdMsg(''); setResetPwdErr(''); }}
                className="bg-gray-200 text-gray-700 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-300"
              >
                Annulla
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetPwdPassword.length < 8}
                className="bg-orange-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-orange-700 disabled:bg-orange-300"
              >
                Reimposta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
