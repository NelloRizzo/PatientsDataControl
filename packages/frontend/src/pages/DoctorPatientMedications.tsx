import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import type { IPrescription, IMedicationLog } from '@healthbridge/shared';

const routeOptions = ['orale', 'topica', 'intramuscolare', 'endovenosa', 'sottocutanea', 'inalatoria', 'rettale', 'altra'];

const daysLabels = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

interface FormState {
  drugName: string;
  dosage: string;
  frequency: string;
  route: string;
  schedule: { time: string; daysOfWeek: number[] }[];
  startDate: string;
  endDate: string;
  notes: string;
}

const emptyForm = (): FormState => ({
  drugName: '',
  dosage: '',
  frequency: '',
  route: 'orale',
  schedule: [{ time: '08:00', daysOfWeek: [] }],
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  notes: '',
});

export function DoctorPatientMedications() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();

  const [prescriptions, setPrescriptions] = useState<IPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedLog, setSelectedLog] = useState<{ id: string; name: string; logs: IMedicationLog[] } | null>(null);
  const [logLoading, setLogLoading] = useState(false);

  const load = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/doctor/patients/${patientId}/medications`);
      setPrescriptions(res.data.data);
    } catch { setMsg('Errore caricamento farmaci'); }
    setLoading(false);
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;
    setSaving(true); setMsg('');
    const body = {
      ...form,
      schedule: form.schedule.filter((s) => s.time),
      endDate: form.endDate || undefined,
    };
    try {
      if (editId) {
        await apiClient.put(`/doctor/patients/${patientId}/medications/${editId}`, body);
        setMsg('Farmaco aggiornato');
      } else {
        await apiClient.post(`/doctor/patients/${patientId}/medications`, body);
        setMsg('Farmaco aggiunto');
      }
      setShowForm(false); setEditId(null); setForm(emptyForm());
      await load();
    } catch (err: any) {
      setMsg(err.response?.data?.error || 'Errore salvataggio');
    }
    setSaving(false);
  };

  const handleEdit = (p: IPrescription) => {
    setEditId(p._id);
    setForm({
      drugName: p.drugName,
      dosage: p.dosage,
      frequency: p.frequency,
      route: p.route,
      schedule: p.schedule.map((s) => ({ time: s.time, daysOfWeek: s.daysOfWeek ?? [] })),
      startDate: p.startDate.slice(0, 10),
      endDate: p.endDate ? p.endDate.slice(0, 10) : '',
      notes: p.notes || '',
    });
    setShowForm(true); setMsg('');
  };

  const handleDelete = async (id: string) => {
    if (!patientId || !confirm('Eliminare questo farmaco?')) return;
    try {
      await apiClient.delete(`/doctor/patients/${patientId}/medications/${id}`);
      await load();
    } catch { setMsg('Errore eliminazione'); }
  };

  const toggleActive = async (p: IPrescription) => {
    if (!patientId) return;
    try {
      await apiClient.put(`/doctor/patients/${patientId}/medications/${p._id}`, { active: !p.active });
      await load();
    } catch { setMsg('Errore aggiornamento'); }
  };

  const viewLog = async (p: IPrescription) => {
    setLogLoading(true);
    try {
      const res = await apiClient.get(`/patient/medications/${p._id}/log`);
      setSelectedLog({ id: p._id, name: p.drugName, logs: res.data.data });
    } catch { setMsg('Errore caricamento storico'); }
    setLogLoading(false);
  };

  const addScheduleTime = () => {
    setForm((prev) => ({ ...prev, schedule: [...prev.schedule, { time: '12:00', daysOfWeek: [] }] }));
  };

  const removeScheduleTime = (idx: number) => {
    setForm((prev) => ({ ...prev, schedule: prev.schedule.filter((_, i) => i !== idx) }));
  };

  const toggleDay = (sIdx: number, day: number) => {
    setForm((prev) => {
      const schedule = [...prev.schedule];
      const days = schedule[sIdx].daysOfWeek;
      const idx = days.indexOf(day);
      if (idx === -1) schedule[sIdx] = { ...schedule[sIdx], daysOfWeek: [...days, day] };
      else schedule[sIdx] = { ...schedule[sIdx], daysOfWeek: days.filter((d) => d !== day) };
      return { ...prev, schedule };
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(`/doctor/patients`)}
            className="text-sm text-blue-600 hover:underline">← Torna ai pazienti</button>
          <h2 className="text-lg font-semibold">Farmaci del Paziente</h2>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm()); setMsg(''); }}
          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700">
          + Nuovo Farmaco
        </button>
      </div>

      {msg && <p className={`text-sm ${msg.includes('Errore') ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Nome Farmaco</label>
              <input value={form.drugName} onChange={(e) => setForm((p) => ({ ...p, drugName: e.target.value }))}
                required className="w-full border rounded px-3 py-2 text-sm" placeholder="es. Aspirina" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Dosaggio</label>
              <input value={form.dosage} onChange={(e) => setForm((p) => ({ ...p, dosage: e.target.value }))}
                required className="w-full border rounded px-3 py-2 text-sm" placeholder="es. 100mg" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Frequenza</label>
              <input value={form.frequency} onChange={(e) => setForm((p) => ({ ...p, frequency: e.target.value }))}
                required className="w-full border rounded px-3 py-2 text-sm" placeholder="es. 2 volte al giorno" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Via di Somministrazione</label>
              <select value={form.route} onChange={(e) => setForm((p) => ({ ...p, route: e.target.value }))}
                className="w-full border rounded px-3 py-2 text-sm">
                {routeOptions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Data Inizio</label>
              <input type="date" value={form.startDate}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                required className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Data Fine (opzionale)</label>
              <input type="date" value={form.endDate}
                onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-500">Orari di Assunzione</label>
              <button type="button" onClick={addScheduleTime}
                className="text-xs text-blue-600 hover:underline">+ Aggiungi Orario</button>
            </div>
            <div className="space-y-2">
              {form.schedule.map((s, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-gray-50 p-2 rounded flex-wrap">
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-gray-400">Ora</label>
                    <input type="time" value={s.time}
                      onChange={(e) => {
                        const schedule = [...form.schedule];
                        schedule[idx] = { ...schedule[idx], time: e.target.value };
                        setForm((p) => ({ ...p, schedule }));
                      }}
                      className="border rounded px-2 py-1 text-sm" />
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-gray-400">Giorni</label>
                    <div className="flex gap-0.5">
                      {daysLabels.map((dl, di) => (
                        <button key={di} type="button" onClick={() => toggleDay(idx, di)}
                          className={`w-6 h-6 text-xs rounded ${
                            s.daysOfWeek.includes(di) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                          }`} title={dl}>{dl[0]}</button>
                      ))}
                    </div>
                  </div>
                  {form.schedule.length > 1 && (
                    <button type="button" onClick={() => removeScheduleTime(idx)}
                      className="text-xs text-red-500 hover:underline mt-1">Rimuovi</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Note (opzionale)</label>
            <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={2} className="w-full border rounded px-3 py-2 text-sm" />
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Salvataggio...' : editId ? 'Aggiorna' : 'Salva'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm()); }}
              className="text-gray-600 px-3 py-1.5 rounded text-sm hover:bg-gray-100">Annulla</button>
          </div>
        </form>
      )}

      {selectedLog && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Storico Assunzioni — {selectedLog.name}</h3>
            <button onClick={() => setSelectedLog(null)}
              className="text-xs text-blue-600 hover:underline">Chiudi</button>
          </div>
          {logLoading ? (
            <p className="text-xs text-gray-500">Caricamento...</p>
          ) : selectedLog.logs.length === 0 ? (
            <p className="text-xs text-gray-500">Nessuna assunzione registrata</p>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-1">
              {selectedLog.logs.map((l) => (
                <div key={l._id} className="flex items-center justify-between text-sm border-b py-1">
                  <span>{new Date(l.takenAt).toLocaleString()}</span>
                  <span className="text-xs text-gray-400">{l.scheduledTime !== 'now' ? `Previsto: ${l.scheduledTime}` : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Caricamento farmaci...</p>
      ) : prescriptions.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">Nessun farmaco prescritto</p>
      ) : (
        <div className="space-y-2">
          {prescriptions.map((p) => (
            <div key={p._id} className={`bg-white rounded-lg shadow-sm border p-4 ${!p.active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">{p.drugName}</h3>
                    <span className="text-xs text-gray-500">{p.dosage}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>{p.active ? 'Attivo' : 'Inattivo'}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {p.frequency} — Via: {p.route}
                    {p.schedule.length > 0 && ` — Orari: ${p.schedule.map((s) => s.time).join(', ')}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Dal {new Date(p.startDate).toLocaleDateString()}
                    {p.endDate ? ` al ${new Date(p.endDate).toLocaleDateString()}` : ''}
                  </p>
                  {p.notes && <p className="text-xs text-gray-500 mt-1">{p.notes}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => viewLog(p)}
                    className="text-xs text-blue-600 hover:underline px-1">Storico</button>
                  <button onClick={() => handleEdit(p)}
                    className="text-xs text-blue-600 hover:underline px-1">Modifica</button>
                  <button onClick={() => toggleActive(p)}
                    className={`text-xs px-1 hover:underline ${p.active ? 'text-yellow-600' : 'text-green-600'}`}>
                    {p.active ? 'Disattiva' : 'Attiva'}
                  </button>
                  <button onClick={() => handleDelete(p._id)}
                    className="text-xs text-red-600 hover:underline px-1">Elimina</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
