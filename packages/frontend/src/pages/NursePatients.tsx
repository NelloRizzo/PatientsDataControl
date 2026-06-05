import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../api/client';
import { getMeasurementTypes } from '../api/measurementTypes';
import type { IMeasurementTypeConfig, IMeasurement } from '@healthbridge/shared';

export function NursePatients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [addEmail, setAddEmail] = useState('');
  const [addMsg, setAddMsg] = useState('');
  const [addError, setAddError] = useState('');

  // Latest measurements per type
  const [latestByType, setLatestByType] = useState<Record<string, any>>({});
  const [types, setTypes] = useState<IMeasurementTypeConfig[]>([]);
  const [typesMap, setTypesMap] = useState<Record<string, IMeasurementTypeConfig>>({});

  // New measurement form
  const [newType, setNewType] = useState('');
  const [newValues, setNewValues] = useState<Record<string, string>>({});
  const [newUnits, setNewUnits] = useState<Record<string, string>>({});
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // History
  const [historyType, setHistoryType] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyMonth, setHistoryMonth] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });

  // Medications (read-only)
  const [medications, setMedications] = useState<any[]>([]);

  useEffect(() => {
    getMeasurementTypes().then((t) => { setTypes(t); setTypesMap(Object.fromEntries(t.map((x: IMeasurementTypeConfig) => [x.key, x]))); }).catch(() => {});
  }, []);

  const loadPatients = () => {
    apiClient.get('/nurse/patients').then((res) => setPatients(res.data.data || [])).catch(() => {});
  };

  useEffect(() => { loadPatients(); }, []);

  useEffect(() => {
    const pId = searchParams.get('patientId');
    if (pId && !selectedPatient) setSelectedPatient(pId);
  }, [searchParams, selectedPatient]);

  const handleAdd = async () => {
    setAddMsg(''); setAddError('');
    try {
      await apiClient.post('/nurse/patients', { email: addEmail });
      setAddMsg('Paziente aggiunto con successo. In attesa di conferma.');
      setAddEmail('');
      loadPatients();
    } catch (err: any) {
      setAddError(err.response?.data?.error || 'Errore');
    }
  };

  useEffect(() => {
    if (!selectedPatient) return;
    apiClient.get(`/nurse/patients/${selectedPatient}/latest-measurements`)
      .then((res) => setLatestByType(res.data.data || {}))
      .catch(() => setLatestByType({}));
    apiClient.get(`/nurse/patients/${selectedPatient}/medications`)
      .then((res) => setMedications(res.data.data || []))
      .catch(() => setMedications([]));
  }, [selectedPatient]);

  const selectedPatientData = patients.find((p) => p._id === selectedPatient || p.patientId === selectedPatient);

  const handleNewTypeChange = (key: string) => {
    setNewType(key);
    setNewValues({});
    setNewUnits({});
    const t = typesMap[key];
    if (t) {
      const defaultUnits: Record<string, string> = {};
      t.fields.forEach((f) => { defaultUnits[f.key] = f.unit || (f.units?.[0] || ''); });
      setNewUnits(defaultUnits);
    }
  };

  const handleSave = async () => {
    if (!selectedPatient || !newType) return;
    setSaving(true); setSaveMsg('');
    try {
      const parsed: Record<string, number> = {};
      const units: Record<string, string> = {};
      for (const key of Object.keys(newValues)) {
        parsed[key] = parseFloat(newValues[key]);
        units[key] = newUnits[key] || '';
      }
      await apiClient.post(`/nurse/patients/${selectedPatient}/measurements`, {
        type: newType, values: parsed, units,
        date: newDate ? new Date(newDate).toISOString() : new Date().toISOString(),
        notes: newNotes || undefined,
      });
      setSaveMsg('Misurazione salvata!');
      setNewValues({}); setNewNotes('');
      // Refresh latest
      const res = await apiClient.get(`/nurse/patients/${selectedPatient}/latest-measurements`);
      setLatestByType(res.data.data || {});
    } catch (err: any) {
      setSaveMsg(err.response?.data?.error || 'Errore durante il salvataggio');
    }
    setSaving(false);
  };

  const loadHistory = async (typeKey: string, pageNum = 1) => {
    setHistoryType(typeKey);
    setHistoryLoading(true);
    setHistoryPage(pageNum);
    try {
      const from = new Date(historyMonth);
      const to = new Date(historyMonth);
      to.setMonth(to.getMonth() + 1);
      const res = await apiClient.get(`/nurse/patients/${selectedPatient}/measurements`, {
        params: { type: typeKey, page: pageNum, limit: 20, from: from.toISOString(), to: to.toISOString() },
      });
      setHistoryData(res.data.data || []);
      setHistoryTotal(res.data.pagination?.total || 0);
    } catch { setHistoryData([]); }
    setHistoryLoading(false);
  };

  const formatVal = (m: any, key: string) => {
    const t = typesMap[m.type];
    const field = t?.fields?.find((f: any) => f.key === key);
    const unit = m.units?.[key] || field?.unit || '';
    return `${m.values?.[key] ?? '-'} ${unit}`;
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0">
      {/* Sidebar */}
      <aside id="sidebar-patients" className="w-72 bg-white border-r overflow-y-auto flex-shrink-0">
        <div className="p-3 border-b">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">I Miei Pazienti</h2>
          <div className="flex gap-2">
            <input value={addEmail} onChange={(e) => setAddEmail(e.target.value)}
              placeholder="Email paziente..."
              className="flex-1 border rounded px-2 py-1 text-xs" />
            <button onClick={handleAdd} className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700">Aggiungi</button>
          </div>
          {addMsg && <p className="text-xs text-green-600 mt-1">{addMsg}</p>}
          {addError && <p className="text-xs text-red-600 mt-1">{addError}</p>}
        </div>
        {patients.map((p: any) => {
          const pid = p.patientId || p._id;
          const isActive = p.status === 'active';
          return (
            <button key={pid}
              onClick={() => setSelectedPatient(pid)}
              className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 transition-colors ${selectedPatient === pid ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}>
              <p className="text-sm font-medium truncate">{p.patientName || p.name || pid}</p>
              <p className="text-xs text-gray-500 truncate">{p.patientEmail || p.email || ''}</p>
              <span className={`inline-block text-xs px-1.5 py-0.5 rounded mt-1 ${
                isActive ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>{isActive ? 'Attivo' : 'In attesa'}</span>
            </button>
          );
        })}
        {patients.length === 0 && <p className="text-xs text-gray-400 text-center py-8">Nessun paziente.</p>}
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {!selectedPatient ? (
          <p className="text-gray-500 text-center py-20">Seleziona un paziente per visualizzare i dati.</p>
        ) : (
          <>
            {/* Patient header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">{selectedPatientData?.patientName || 'Paziente'}</h1>
                <p className="text-sm text-gray-500">{selectedPatientData?.patientEmail || ''}</p>
              </div>
            </div>

            {/* Latest measurements grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.entries(latestByType).map(([typeKey, data]: [string, any]) => {
                const t = typesMap[typeKey];
                if (!t) return null;
                return (
                  <button key={typeKey} onClick={() => loadHistory(typeKey)}
                    className="bg-white rounded-lg shadow-sm border p-4 text-left hover:shadow-md transition-shadow">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.name}</p>
                    {t.fields.map((f: any) => (
                      <p key={f.key} className="text-lg font-bold text-gray-800 mt-1">
                        {data.values?.[f.key] ?? '-'} <span className="text-sm font-normal text-gray-500">{data.units?.[f.key] || f.unit || ''}</span>
                      </p>
                    ))}
                    {data._id && <p className="text-xs text-gray-400 mt-1">{new Date(data.date || data.createdAt).toLocaleString()}</p>}
                  </button>
                );
              })}
            </div>

            {/* New measurement form */}
            <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Nuova Misurazione</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Tipo</label>
                  <select value={newType} onChange={(e) => handleNewTypeChange(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm">
                    <option value="">Seleziona...</option>
                    {types.map((t) => (
                      <optgroup key={t.macrogroup || 'other'} label={t.macrogroup || 'Altro'}>
                        <option value={t.key}>{t.name}</option>
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Data/Ora</label>
                  <input type="datetime-local" value={newDate} onChange={(e) => setNewDate(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm" />
                </div>
              </div>
              {newType && typesMap[newType] && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {typesMap[newType].fields.map((f) => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium mb-1">{f.name}</label>
                      <div className="flex gap-1">
                        <input type="number" step="any"
                          value={newValues[f.key] ?? ''}
                          onChange={(e) => setNewValues((v) => ({ ...v, [f.key]: e.target.value }))}
                          placeholder="Valore"
                          className="flex-1 border rounded px-2 py-1 text-sm" />
                        <select value={newUnits[f.key] || f.unit || ''}
                          onChange={(e) => setNewUnits((u) => ({ ...u, [f.key]: e.target.value }))}
                          className="border rounded px-1 py-1 text-xs bg-white max-w-[80px]">
                          {(f.units && f.units.length ? f.units : [f.unit || '']).map((u: string) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium mb-1">Note</label>
                <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm" rows={2} />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleSave} disabled={saving || !newType}
                  className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Salvataggio...' : 'Salva Misurazione'}
                </button>
                {saveMsg && <span className={`text-xs ${saveMsg.includes('Errore') ? 'text-red-600' : 'text-green-600'}`}>{saveMsg}</span>}
              </div>
            </div>

            {/* Medications (read-only) */}
            {medications.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-4 py-3 border-b font-medium text-sm">Farmaci in corso</div>
                <div className="divide-y">
                  {medications.map((m: any) => (
                    <div key={m._id} className="px-4 py-3">
                      <p className="text-sm font-semibold">{m.drugName} <span className="font-normal text-gray-500">{m.dosage}</span></p>
                      <p className="text-xs text-gray-500">{m.frequency} — {m.route}</p>
                      {m.notes && <p className="text-xs text-gray-400 mt-0.5">{m.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Measurement history */}
            {historyType && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-4 py-3 border-b font-medium text-sm flex items-center justify-between">
                  <span>Storico: {typesMap[historyType]?.name || historyType}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { const d = new Date(historyMonth); d.setMonth(d.getMonth() - 1); setHistoryMonth(d); }}
                      className="text-xs text-blue-600 hover:underline">Prec</button>
                    <span className="text-xs text-gray-500">{historyMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
                    <button onClick={() => { const d = new Date(historyMonth); d.setMonth(d.getMonth() + 1); setHistoryMonth(d); }}
                      className="text-xs text-blue-600 hover:underline">Succ</button>
                  </div>
                </div>
                <div className="p-4">
                  {historyLoading ? (
                    <p className="text-xs text-gray-400">Caricamento...</p>
                  ) : historyData.length === 0 ? (
                    <p className="text-xs text-gray-400">Nessuna misurazione in questo mese.</p>
                  ) : (
                    <div className="space-y-2">
                      {historyData.map((m: any) => (
                        <div key={m._id} className="flex items-center justify-between border-b pb-1 last:border-0">
                          <div className="text-sm">
                            {typesMap[m.type]?.fields.map((f: any) => (
                              <span key={f.key} className="mr-3">
                                <span className="font-medium">{f.name}:</span> {formatVal(m, f.key)}
                              </span>
                            ))}
                          </div>
                          <span className="text-xs text-gray-400">{new Date(m.date || m.createdAt).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reset password */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Strumenti</h3>
              <button disabled={!selectedPatient}
                onClick={async () => {
                  if (!selectedPatient || !confirm('Resettare la password di questo paziente?')) return;
                  try {
                    await apiClient.post(`/nurse/patients/${selectedPatient}/reset-password`);
                    alert('Password resettata. Il paziente riceverà la nuova password al prossimo accesso.');
                  } catch { alert('Errore durante il reset.'); }
                }}
                className="bg-orange-600 text-white px-3 py-1.5 rounded text-sm hover:bg-orange-700">
                Reset Password
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
