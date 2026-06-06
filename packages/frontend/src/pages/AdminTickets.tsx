import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import type { ITicket } from '@healthbridge/shared';

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_review: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
};

const statusLabels: Record<string, string> = {
  open: 'Aperto',
  in_review: 'In Revisione',
  in_progress: 'In Elaborazione',
  resolved: 'Risolto',
  closed: 'Chiuso',
};

const roleLabels: Record<string, string> = {
  doctor: 'Dottore',
  nurse: 'Infermiere',
  patient: 'Paziente',
};

export function AdminTickets() {
  const [tickets, setTickets] = useState<ITicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Record<string, string | undefined>>({});
  const [selected, setSelected] = useState<ITicket | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [admins, setAdmins] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Create user from registration request
  const [createModal, setCreateModal] = useState<ITicket | null>(null);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState('patient');
  const [createMsg, setCreateMsg] = useState('');
  const [createErr, setCreateErr] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/tickets/admin/all', { params: filter });
      setTickets(res.data.data);
    } catch {}
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    apiClient.get('/tickets/admin/stats').then((res) => setStats(res.data.data)).catch(() => {});
    apiClient.get('/admin/users', { params: { role: 'admin' } })
      .then((res) => setAdmins(res.data.data || []))
      .catch(() => {});
  }, []);

  const handleSelect = (t: ITicket) => {
    setSelected(t);
    setEditStatus(t.status);
    setEditNotes(t.adminNotes || '');
    setEditAssignee(t.assigneeId || '');
    setMsg('');
  };

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      await apiClient.put(`/tickets/admin/${selected!._id}`, {
        status: editStatus,
        adminNotes: editNotes || null,
        assigneeId: editAssignee || null,
      });
      setMsg('Ticket aggiornato');
      await load();
      setSelected(null);
    } catch (err: any) {
      setMsg(err.response?.data?.error || 'Errore');
    }
    setSaving(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateErr(''); setCreateMsg('');
    setCreating(true);
    try {
      // 1. Create user
      const userRes = await apiClient.post('/admin/users', {
        name: createName.trim(),
        email: createEmail.trim(),
        password: createPassword,
        role: createRole,
      });
      const userId = userRes.data.data?._id || userRes.data._id;

      // 2. If doctor, create 1-week test contract
      if (createRole === 'doctor') {
        const now = new Date();
        const weekLater = new Date(now.getTime() + 7 * 86400_000);
        await apiClient.post('/admin/contracts', {
          doctorId: userId,
          startDate: now.toISOString(),
          endDate: weekLater.toISOString(),
          maxPatients: 5,
          fee: 0,
          feeType: 'fixed',
          currency: 'EUR',
          notes: 'Contratto di prova — creazione automatica da richiesta registrazione',
          status: 'active',
        });
      }

      // 3. Mark ticket as resolved
      await apiClient.put(`/tickets/admin/${createModal!._id}`, {
        status: 'resolved',
        adminNotes: 'Utente creato e contratto attivato.',
      });

      setCreateMsg(`Utente ${createName} creato con successo come ${roleLabels[createRole] || createRole}${createRole === 'doctor' ? ' con contratto di prova (7 giorni)' : ''}.`);
      setTimeout(() => {
        setCreateModal(null);
        setCreatePassword('');
        load();
      }, 2000);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setCreateErr('Email già registrata');
      } else {
        setCreateErr(err.response?.data?.error || err.message || 'Errore durante la creazione');
      }
    }
    setCreating(false);
  };

  const openCreateModal = (t: ITicket) => {
    setCreateModal(t);
    setCreateName(t.title);
    setCreateEmail(t.requesterEmail || '');
    setCreateRole(t.requestedRole || 'patient');
    setCreatePassword('');
    setCreateMsg('');
    setCreateErr('');
  };

  const setF = (key: string, val: string) => setFilter((prev) => ({ ...prev, [key]: val || undefined }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Gestione Ticket</h2>
        {stats && (
          <div className="flex gap-3 text-xs">
            {stats.byStatus?.map((s: any) => (
              <span key={s._id} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${statusColors[s._id]?.split(' ')[0] || 'bg-gray-300'}`} />
                {statusLabels[s._id] || s._id}: {s.count}
              </span>
            ))}
          </div>
        )}
      </div>

      {msg && <p className={`text-sm ${msg.includes('Errore') ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>}

      <div className="flex gap-2 flex-wrap">
        {['', 'open', 'in_review', 'in_progress', 'resolved', 'closed'].map((s) => (
          <button key={s} onClick={() => setF('status', s)}
            className={`text-xs px-2 py-1 rounded ${filter.status === s ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s ? statusLabels[s] : 'Tutti'}
          </button>
        ))}
        <span className="text-xs text-gray-300 mx-1">|</span>
        {['', 'suggestion', 'bug_report', 'registration_request'].map((t) => (
          <button key={t} onClick={() => setF('type', t)}
            className={`text-xs px-2 py-1 rounded ${filter.type === t ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t ? (t === 'suggestion' ? 'Suggerimenti' : t === 'bug_report' ? 'Bug' : 'Registrazioni') : 'Tutti i tipi'}
          </button>
        ))}
      </div>

      {/* Create User Modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setCreateModal(null)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Crea Utente da Richiesta</h3>
              <button onClick={() => setCreateModal(null)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>
            {createMsg ? (
              <p className="text-sm text-green-600">{createMsg}</p>
            ) : (
              <form onSubmit={handleCreateUser} className="space-y-3">
                {createErr && <p className="text-sm text-red-600">{createErr}</p>}
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Nome</label>
                  <input value={createName} onChange={(e) => setCreateName(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm bg-gray-50" readOnly />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Email</label>
                  <input value={createEmail} onChange={(e) => setCreateEmail(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm bg-gray-50" readOnly />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Password *</label>
                  <input type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm" required minLength={8} placeholder="Minimo 8 caratteri" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Ruolo</label>
                  <select value={createRole} onChange={(e) => setCreateRole(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm">
                    <option value="patient">Paziente</option>
                    <option value="nurse">Infermiere</option>
                    <option value="doctor">Dottore</option>
                  </select>
                </div>
                {createRole === 'doctor' && (
                  <p className="text-xs text-blue-600">Verrà creato automaticamente un contratto di prova di 7 giorni.</p>
                )}
                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={creating}
                    className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700 disabled:opacity-50">
                    {creating ? 'Creazione...' : 'Crea Utente'}
                  </button>
                  <button type="button" onClick={() => setCreateModal(null)}
                    className="text-gray-600 px-3 py-1.5 rounded text-sm hover:bg-gray-100">
                    Annulla
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Caricamento...</p>
      ) : tickets.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">Nessun ticket</p>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <div key={t._id}
              className="bg-white rounded-lg shadow-sm border p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleSelect(t)}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-gray-400">{t.ticketNumber}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusColors[t.status] || ''}`}>
                      {statusLabels[t.status]}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      {t.type === 'suggestion' ? 'Suggerimento' : t.type === 'bug_report' ? 'Bug' : 'Richiesta Registrazione'}
                    </span>
                    {t.requestedRole && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                        {roleLabels[t.requestedRole] || t.requestedRole}
                      </span>
                    )}
                    {t.severity && t.type === 'bug_report' && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        t.severity === 'high' ? 'bg-red-100 text-red-700' :
                        t.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {t.severity === 'high' ? 'Alta' : t.severity === 'medium' ? 'Media' : 'Bassa'}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {t.type === 'registration_request'
                        ? (t.requesterEmail || '?')
                        : `da ${(t as any).userId?.name || '?'}`}
                    </span>
                  </div>
                  <p className="text-sm font-medium mt-1">{t.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{t.description}</p>
                  {t.annotation && <p className="text-xs text-gray-500 mt-0.5 italic">📌 {t.annotation}</p>}
                  {t.adminNotes && <p className="text-xs text-blue-600 mt-0.5">📝 Note admin presenti</p>}
                </div>
                {t.type === 'registration_request' && t.status !== 'resolved' && t.status !== 'closed' && (
                  <button onClick={(e) => { e.stopPropagation(); openCreateModal(t); }}
                    className="shrink-0 ml-2 bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700">
                    Crea Utente
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{selected.ticketNumber} — {selected.title}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Descrizione</p>
                <p className="whitespace-pre-wrap bg-gray-50 rounded p-2">{selected.description}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Da</p>
                <p>
                  {selected.type === 'registration_request'
                    ? (selected.requesterEmail || '?')
                    : `${(selected as any).userId?.name || '?'} (${(selected as any).userId?.email || ''})`}
                </p>
              </div>
              {selected.type === 'registration_request' && selected.requestedRole && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Ruolo richiesto</p>
                  <p className="text-purple-700 font-medium">{roleLabels[selected.requestedRole]}</p>
                </div>
              )}
              {selected.annotation && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Annotazioni</p>
                  <p className="whitespace-pre-wrap bg-gray-50 rounded p-2 text-gray-700">{selected.annotation}</p>
                </div>
              )}
              {selected.page && <div><p className="text-xs text-gray-500 mb-0.5">Pagina</p><p className="text-blue-600">{selected.page}</p></div>}
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">Stato</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm">
                  {Object.entries(statusLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">Assegnato a</label>
                <select value={editAssignee} onChange={(e) => setEditAssignee(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm">
                  <option value="">Non assegnato</option>
                  {admins.map((a: any) => (
                    <option key={a._id} value={a._id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">Note admin</label>
                <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)}
                  rows={4} className="w-full border rounded px-3 py-2 text-sm" placeholder="Aggiungi note..." />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleSave} disabled={saving}
                  className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Salvataggio...' : 'Salva'}
                </button>
                <button onClick={() => setSelected(null)}
                  className="text-gray-600 px-3 py-1.5 rounded text-sm hover:bg-gray-100">
                  Annulla
                </button>
                {selected.type === 'registration_request' && selected.status !== 'resolved' && selected.status !== 'closed' && (
                  <button onClick={() => { setSelected(null); openCreateModal(selected); }}
                    className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700">
                    Crea Utente
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
