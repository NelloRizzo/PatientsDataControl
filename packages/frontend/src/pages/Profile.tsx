import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

const emptyAddr = { full: '', city: '', province: '', region: '', country: '', zip: '' };

export function Profile() {
  const { user, login } = useAuth();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState(user?.birthDate?.split('T')[0] || '');
  const [sex, setSex] = useState(user?.sex || '');
  const [home, setHome] = useState(user?.homeAddress || { ...emptyAddr });
  const [legal, setLegal] = useState(user?.legalAddress || { ...emptyAddr });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  if (!user) return null;

  const addrInput = (label: string, fields: any, setter: any) => (
    <div className="border rounded p-3">
      <p className="text-xs font-medium text-gray-600 mb-2">{label}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className="block text-xs text-gray-400">Full address</label>
          <input value={fields.full} onChange={(e) => setter({ ...fields, full: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" disabled={!editing} />
        </div>
        <div>
          <label className="block text-xs text-gray-400">City</label>
          <input value={fields.city} onChange={(e) => setter({ ...fields, city: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" disabled={!editing} />
        </div>
        <div>
          <label className="block text-xs text-gray-400">Province</label>
          <input value={fields.province} onChange={(e) => setter({ ...fields, province: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" disabled={!editing} />
        </div>
        <div>
          <label className="block text-xs text-gray-400">Region</label>
          <input value={fields.region} onChange={(e) => setter({ ...fields, region: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" disabled={!editing} />
        </div>
        <div>
          <label className="block text-xs text-gray-400">Country</label>
          <input value={fields.country} onChange={(e) => setter({ ...fields, country: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" disabled={!editing} />
        </div>
        <div>
          <label className="block text-xs text-gray-400">ZIP</label>
          <input value={fields.zip} onChange={(e) => setter({ ...fields, zip: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" disabled={!editing} />
        </div>
      </div>
    </div>
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      const body: Record<string, any> = {};
      if (name !== user.name) body.name = name;
      if (email !== user.email) body.email = email;
      if (password) body.password = password;
      if (birthDate !== user.birthDate?.split('T')[0]) body.birthDate = birthDate || null;
      if (sex !== user.sex) body.sex = sex || null;
      if (JSON.stringify(home) !== JSON.stringify(user.homeAddress)) {
        body.homeAddress = Object.values(home).some(Boolean) ? home : null;
      }
      if (JSON.stringify(legal) !== JSON.stringify(user.legalAddress)) {
        body.legalAddress = Object.values(legal).some(Boolean) ? legal : null;
      }

      if (Object.keys(body).length === 0) { setEditing(false); return; }

      await apiClient.put('/auth/profile', body);
      const me = await apiClient.get('/auth/me');
      setMsg('Profile updated');
      setEditing(false);

      // refresh user in AuthContext
      const token = localStorage.getItem('accessToken');
      if (token) {
        const loginRes = await apiClient.post('/auth/login', { email, password: password || undefined }).catch(() => null);
        if (loginRes) {
          localStorage.setItem('accessToken', loginRes.data.tokens.accessToken);
          localStorage.setItem('refreshToken', loginRes.data.tokens.refreshToken);
        }
      }
      window.location.reload();
    } catch (err: any) {
      setErr(err.response?.data?.error || 'Update failed');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Profile</h1>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700">Edit</button>
        ) : (
          <button onClick={() => setEditing(false)} className="bg-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-400">Cancel</button>
        )}
      </div>

      <form onSubmit={handleSave} className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full border rounded px-2 py-1.5 text-sm" disabled={!editing} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border rounded px-2 py-1.5 text-sm" disabled={!editing} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">New Password (leave empty to keep)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} className="w-full border rounded px-2 py-1.5 text-sm" disabled={!editing} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Birth Date</label>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" disabled={!editing} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sex</label>
            <select value={sex} onChange={(e) => setSex(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" disabled={!editing}>
              <option value="">Not specified</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Role</label>
            <input value={user.role} disabled className="w-full border rounded px-2 py-1.5 text-sm bg-gray-50" />
          </div>
        </div>

        {addrInput('Home Address', home, setHome)}
        {addrInput('Legal Address', legal, setLegal)}

        {editing && (
          <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700">Save Changes</button>
        )}
        {msg && <p className="text-xs text-green-600">{msg}</p>}
        {err && <p className="text-xs text-red-600">{err}</p>}
      </form>
    </div>
  );
}
