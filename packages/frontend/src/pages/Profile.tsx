import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import type { IDeviceConnection } from '@healthbridge/shared';

const emptyAddr = { full: '', city: '', province: '', region: '', country: '', zip: '' };

export function Profile() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [birthDate, setBirthDate] = useState(user?.birthDate?.split('T')[0] || '');
  const [sex, setSex] = useState(user?.sex || '');
  const [home, setHome] = useState(user?.homeAddress || { ...emptyAddr });
  const [legal, setLegal] = useState(user?.legalAddress || { ...emptyAddr });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const [cpOld, setCpOld] = useState('');
  const [cpNew, setCpNew] = useState('');
  const [cpMsg, setCpMsg] = useState('');
  const [cpErr, setCpErr] = useState('');

  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const [gdprHistory, setGdprHistory] = useState<any[]>([]);
  const [gdprMsg, setGdprMsg] = useState('');

  // Device connections
  const [connections, setConnections] = useState<IDeviceConnection[]>([]);
  const [connLoading, setConnLoading] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [connMsg, setConnMsg] = useState('');
  const [deviceToast, setDeviceToast] = useState('');

  useEffect(() => {
    apiClient.get('/patient/privacy-consent').then((res) => setGdprHistory(res.data.data)).catch(() => {});
  }, [user]);

  // Detects OAuth callback redirect
  useEffect(() => {
    if (searchParams.get('device') === 'connected') {
      const provider = searchParams.get('provider') || 'google_health';
      setDeviceToast(`Dispositivo ${provider === 'google_health' ? 'Google Health' : provider} collegato con successo!`);
      setSearchParams({}, { replace: true });
      fetchConnections();
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (user?.role === 'patient') fetchConnections();
  }, [user]);

  const fetchConnections = async () => {
    setConnLoading(true);
    try {
      const res = await apiClient.get('/devices/connections');
      setConnections(res.data.data || []);
    } catch {}
    setConnLoading(false);
  };

  const handleConnect = async (provider: string) => {
    setConnMsg('');
    try {
      const res = await apiClient.get('/devices/oauth-url', { params: { provider } });
      window.location.href = res.data.url;
    } catch (err: any) {
      setConnMsg(err.response?.data?.error || 'Errore OAuth');
    }
  };

  const handleUpgrade = async () => {
    setConnMsg('');
    try {
      const res = await apiClient.post('/devices/upgrade-to-google');
      window.location.href = res.data.url;
    } catch (err: any) {
      setConnMsg(err.response?.data?.error || 'Errore upgrade');
    }
  };

  const handleSync = async (provider: string) => {
    setSyncingId(provider);
    setConnMsg('');
    try {
      const res = await apiClient.post(`/devices/sync/${provider}`);
      const { synced, errors } = res.data;
      if (errors?.length) {
        setConnMsg(`Sincronizzato ${synced} valori. Errori: ${errors.slice(0, 3).join(', ')}`);
      } else {
        setConnMsg(`Sincronizzati ${synced} nuovi valori!`);
      }
    } catch (err: any) {
      setConnMsg(err.response?.data?.error || 'Errore sincronizzazione');
    }
    setSyncingId(null);
    fetchConnections();
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm('Rimuovere questa connessione?')) return;
    setConnMsg('');
    try {
      await apiClient.delete(`/devices/connections/${id}`);
      setConnMsg('Connessione rimossa');
      fetchConnections();
    } catch (err: any) {
      setConnMsg(err.response?.data?.error || 'Errore rimozione');
    }
  };

  const handleGdprAccept = async () => {
    setGdprMsg('');
    try {
      await apiClient.post('/patient/privacy-consent', { action: 'accept' });
      setGdprMsg('Consent recorded');
      apiClient.get('/patient/privacy-consent').then((res) => setGdprHistory(res.data.data)).catch(() => {});
    } catch { setGdprMsg('Failed to record consent'); }
  };

  const handleGdprRevoke = async () => {
    if (!confirm('La revoca del consenso limiterà il trattamento dei tuoi dati. Continuare?')) return;
    setGdprMsg('');
    try {
      await apiClient.post('/patient/privacy-consent', { action: 'revoke' });
      setGdprMsg('Consent revoked');
      apiClient.get('/patient/privacy-consent').then((res) => setGdprHistory(res.data.data)).catch(() => {});
    } catch { setGdprMsg('Failed to revoke consent'); }
  };

  if (!user) return null;

  const handleResend = async () => {
    setResending(true);
    setResendMsg('');
    try {
      await apiClient.post('/auth/resend-verification', { email: user.email });
      setResendMsg('Verification email sent!');
    } catch {
      setResendMsg('Failed to resend.');
    }
    setResending(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setCpMsg(''); setCpErr('');
    try {
      await apiClient.post('/auth/change-password', { oldPassword: cpOld, newPassword: cpNew });
      setCpMsg('Password changed successfully');
      setCpOld('');
      setCpNew('');
      setSearchParams({});
    } catch (err: any) {
      setCpErr(err.response?.data?.error || 'Failed to change password');
    }
  };

  const addrInput = (label: string, fields: any, setter: any) => (
    <div className="border rounded p-3">
      <p className="text-xs font-medium text-gray-600 mb-2">{label}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className="block text-xs text-gray-400">Full address</label>
          <input autoComplete="off" value={fields.full} onChange={(e) => setter({ ...fields, full: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" disabled={!editing} />
        </div>
        <div>
          <label className="block text-xs text-gray-400">City</label>
          <input autoComplete="off" value={fields.city} onChange={(e) => setter({ ...fields, city: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" disabled={!editing} />
        </div>
        <div>
          <label className="block text-xs text-gray-400">Province</label>
          <input autoComplete="off" value={fields.province} onChange={(e) => setter({ ...fields, province: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" disabled={!editing} />
        </div>
        <div>
          <label className="block text-xs text-gray-400">Region</label>
          <input autoComplete="off" value={fields.region} onChange={(e) => setter({ ...fields, region: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" disabled={!editing} />
        </div>
        <div>
          <label className="block text-xs text-gray-400">Country</label>
          <input autoComplete="off" value={fields.country} onChange={(e) => setter({ ...fields, country: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" disabled={!editing} />
        </div>
        <div>
          <label className="block text-xs text-gray-400">ZIP</label>
          <input autoComplete="off" value={fields.zip} onChange={(e) => setter({ ...fields, zip: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" disabled={!editing} />
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
      setMsg('Profilo aggiornato');
      setEditing(false);
      window.location.reload();
    } catch (err: any) {
      setErr(err.response?.data?.error || 'Aggiornamento fallito');
    }
  };

  const activeConnections = connections.filter((c) => c.active);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Profilo</h1>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700">Modifica</button>
        ) : (
          <button onClick={() => setEditing(false)} className="bg-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-400">Annulla</button>
        )}
      </div>

      {/* Device connected toast */}
      {deviceToast && (
        <div className="mb-4 p-3 rounded-lg border text-sm bg-green-50 border-green-200 text-green-700">
          {deviceToast}
          <button onClick={() => setDeviceToast('')} className="ml-2 underline text-xs">Chiudi</button>
        </div>
      )}

      {/* Email verification status */}
      {user.role !== 'admin' && (
        <div className={`mb-4 p-3 rounded-lg border text-sm flex items-center justify-between ${
          user.emailVerified ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
        }`}>
          <span className={user.emailVerified ? 'text-green-700' : 'text-yellow-800'}>
            Email: {user.email} — {user.emailVerified ? 'Verificata' : 'Non verificata'}
          </span>
          {!user.emailVerified && (
            <button onClick={handleResend} disabled={resending}
              className="text-yellow-700 underline hover:text-yellow-900 disabled:opacity-50 text-xs">
              {resending ? 'Invio...' : 'Invia email di verifica'}
            </button>
          )}
          {resendMsg && <span className="text-xs text-green-700">{resendMsg}</span>}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full border rounded px-2 py-1.5 text-sm" disabled={!editing} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border rounded px-2 py-1.5 text-sm" disabled={!editing} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Data di Nascita</label>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" disabled={!editing} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sesso</label>
            <select value={sex} onChange={(e) => setSex(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" disabled={!editing}>
              <option value="">Non specificato</option>
              <option value="male">Maschio</option>
              <option value="female">Femmina</option>
              <option value="other">Altro</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ruolo</label>
            <input value={user.role === 'patient' ? 'Paziente' : user.role === 'doctor' ? 'Medico' : user.role === 'analyst' ? 'Analista' : 'Admin'} disabled className="w-full border rounded px-2 py-1.5 text-sm bg-gray-50" />
          </div>
        </div>

        {addrInput('Indirizzo di Casa', home, setHome)}
        {addrInput('Indirizzo Legale', legal, setLegal)}

        {editing && (
          <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700">Salva Modifiche</button>
        )}
        {msg && <p className="text-xs text-green-600">{msg}</p>}
        {err && <p className="text-xs text-red-600">{err}</p>}
      </form>

      {/* Must change password banner */}
      {searchParams.get('mustChangePassword') === '1' && (
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-lg text-sm mt-4">
          <strong>Password temporanea.</strong> Devi cambiare la password prima di proseguire.
        </div>
      )}

      {/* Change Password Section */}
      <div className="mt-6 bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <h2 className="text-lg font-semibold">Cambia Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Password Attuale</label>
              <input type="password" value={cpOld} onChange={(e) => setCpOld(e.target.value)} required
                className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nuova Password</label>
              <input type="password" value={cpNew} onChange={(e) => setCpNew(e.target.value)} required minLength={8}
                className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700">
            Cambia Password
          </button>
          {cpMsg && <p className="text-xs text-green-600">{cpMsg}</p>}
          {cpErr && <p className="text-xs text-red-600">{cpErr}</p>}
        </form>
      </div>

      {/* Device Connections — visible only for patients */}
      {user.role === 'patient' && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow-sm border space-y-4">
          <h2 className="text-lg font-semibold">Dispositivi Connessi</h2>
          <p className="text-xs text-gray-500">
            Collega il tuo account Fitbit per importare automaticamente le misurazioni.
          </p>

          {deviceToast && (
            <div className="p-3 rounded-lg border text-sm bg-green-50 border-green-200 text-green-700">
              {deviceToast}
              <button onClick={() => setDeviceToast('')} className="ml-2 underline text-xs">Chiudi</button>
            </div>
          )}

          {connLoading ? (
            <p className="text-sm text-gray-400">Caricamento...</p>
          ) : (
            <div className="space-y-3">
              {activeConnections.length === 0 && !connLoading && (
                <p className="text-sm text-gray-500 italic">Nessun dispositivo connesso.</p>
              )}

              {activeConnections.map((conn) => (
                <div key={conn._id} className="border rounded p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{conn.provider === 'google_health' ? '🔵' : '💚'}</span>
                    <div>
                      <p className="text-sm font-medium">{conn.name}</p>
                      <p className="text-xs text-gray-400">
                        {conn.oauthType === 'google' ? 'Google OAuth' : 'Fitbit OAuth'}
                        {conn.lastSync && ` — Ultimo sync: ${new Date(conn.lastSync).toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSync(conn.provider)}
                      disabled={syncingId === conn.provider}
                      className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50"
                    >
                      {syncingId === conn.provider ? 'Sync...' : 'Sincronizza'}
                    </button>
                    <button
                      onClick={() => handleDisconnect(conn._id)}
                      className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      Rimuovi
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleConnect('google_health')}
              className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700"
            >
              Collega con Google
            </button>
            {connections.some((c) => c.provider === 'fitbit' && c.active) && (
              <button
                onClick={handleUpgrade}
                className="bg-yellow-500 text-white px-4 py-1.5 rounded text-sm hover:bg-yellow-600"
              >
                Aggiorna a Google
              </button>
            )}
          </div>

          {connMsg && <p className="text-xs text-green-600">{connMsg}</p>}
        </div>
      )}

      {/* GDPR Privacy Consent */}
      <div className="mt-6 bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <h2 className="text-lg font-semibold">Consenso GDPR</h2>
        <p className="text-xs text-gray-500">
          Il consenso GDPR autorizza la piattaforma a trattare i tuoi dati personali.
          Puoi revocarlo in qualsiasi momento — il trattamento verrà sospeso fino a una nuova accettazione.
        </p>
          <div className="flex gap-2">
            <button onClick={handleGdprAccept} className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700">
              Accetta / Riaccetta
            </button>
            <button onClick={handleGdprRevoke} className="bg-red-600 text-white px-4 py-1.5 rounded text-sm hover:bg-red-700">
              Revoca Consenso
            </button>
          </div>
          {gdprMsg && <p className="text-xs text-green-600">{gdprMsg}</p>}
          {gdprHistory.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Storico Consenso</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {gdprHistory.map((h: any) => (
                  <div key={h._id} className="flex items-center justify-between text-xs border-b pb-1">
                    <span className={h.granted ? 'text-green-600' : 'text-red-600'}>
                      {h.granted ? 'Concesso' : 'Revocato'}
                    </span>
                    <span className="text-gray-400">
                      {new Date(h.grantedAt || h.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
