import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import apiClient from '../api/client';
import { getMeasurementTypes } from '../api/measurementTypes';
import type { IMeasurementTypeConfig, IMeasurement, TimeGroupBy, ChartType, AggregationFunction, TimeSeriesPoint } from '@healthbridge/shared';

function formatDate(value: string) {
  try {
    if (/^\d{4}-W\d{2}$/.test(value)) {
      const week = value.slice(6);
      return `${value.slice(0, 4)} — Sett. ${week}`;
    }
    if (/^\d{4}-\d{2}$/.test(value)) {
      return new Date(value + '-01T12:00:00Z').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }
    if (/^\d{4}$/.test(value)) {
      return value;
    }
    const hasTime = value.includes('T');
    if (!hasTime) {
      return new Date(value + 'T12:00:00Z').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return value; }
}

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

  // Chart
  const [selectedType, setSelectedType] = useState('');
  const [groupBy, setGroupBy] = useState<TimeGroupBy>('day');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [aggregation, setAggregation] = useState<AggregationFunction>('avg');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [chartData, setChartData] = useState<TimeSeriesPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  // BMI
  const [bmi, setBmi] = useState<any>(null);
  const [bmiLoading, setBmiLoading] = useState(false);
  const [bmiHistory, setBmiHistory] = useState<any[]>([]);
  const [bmiHistoryLoading, setBmiHistoryLoading] = useState(false);

  // History
  const [historyType, setHistoryType] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyMonth, setHistoryMonth] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });

  // Medications (read-only)
  const [medications, setMedications] = useState<any[]>([]);

  // Notes (read-only)
  const [notes, setNotes] = useState<any[]>([]);

  // Anamnesis (current therapy only)
  const [anamnesis, setAnamnesis] = useState<any[]>([]);

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

  const currentType = types.find((t) => t.key === selectedType);

  const loadChart = useCallback(async () => {
    if (!selectedPatient || !selectedType) return;
    setChartLoading(true);
    try {
      const res = await apiClient.get(`/nurse/patients/${selectedPatient}/timeseries`, {
        params: { type: selectedType, groupBy, aggregation, fields: selectedFields.join(',') },
      });
      setChartData(res.data.data || []);
    } catch { setChartData([]); }
    setChartLoading(false);
  }, [selectedPatient, selectedType, groupBy, aggregation, selectedFields]);

  useEffect(() => { loadChart(); }, [loadChart]);

  useEffect(() => {
    if (!selectedPatient) return;
    apiClient.get(`/nurse/patients/${selectedPatient}/latest-measurements`)
      .then((res) => setLatestByType(res.data.data || {}))
      .catch(() => setLatestByType({}));
    apiClient.get(`/nurse/patients/${selectedPatient}/medications`)
      .then((res) => setMedications(res.data.data || []))
      .catch(() => setMedications([]));
    setBmiLoading(true);
    apiClient.get('/patient/bmi', { params: { userId: selectedPatient } })
      .then((res) => setBmi(res.data.data))
      .catch(() => setBmi(null))
      .finally(() => setBmiLoading(false));
    setBmiHistoryLoading(true);
    apiClient.get('/patient/bmi/timeseries', { params: { userId: selectedPatient } })
      .then((res) => setBmiHistory(res.data.data || []))
      .catch(() => setBmiHistory([]))
      .finally(() => setBmiHistoryLoading(false));
    apiClient.get(`/nurse/patients/${selectedPatient}/notes`)
      .then((res) => setNotes(res.data.data || []))
      .catch(() => setNotes([]));
    apiClient.get(`/nurse/patients/${selectedPatient}/anamnesis`)
      .then((res) => setAnamnesis(res.data.data || []))
      .catch(() => setAnamnesis([]));
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

  const toggleField = (key: string) => {
    setSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  };

  const renderChart = () => {
    if (chartLoading) return <p className="text-gray-500 text-center py-12">Caricamento grafico...</p>;
    if (!chartData.length) return <p className="text-gray-500 text-center py-12">Nessun dato disponibile</p>;

    const commonProps = { data: chartData, margin: { top: 5, right: 30, left: 20, bottom: 5 } };
    const colors = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#0891b2'];

    const chartProps = {
      ...commonProps,
      children: (
        <>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" tickFormatter={formatDate} />
          <YAxis />
          <Tooltip labelFormatter={formatDate} />
          <Legend />
          {selectedFields.map((field, i) => {
            const lp = {
              key: field,
              type: 'monotone' as const,
              dataKey: `values.${field}`,
              name: currentType?.fields.find((f) => f.key === field)?.name || field,
              stroke: colors[i % colors.length],
              fill: colors[i % colors.length],
            };
            if (chartType === 'area') return <Area {...lp} />;
            if (chartType === 'bar') return <Bar {...lp} />;
            return <Line {...lp} />;
          })}
        </>
      ),
    };

    return (
      <ResponsiveContainer width="100%" height={400}>
        {chartType === 'line' ? <LineChart {...chartProps} /> :
         chartType === 'area' ? <AreaChart {...chartProps} /> :
         <BarChart {...chartProps} />}
      </ResponsiveContainer>
    );
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

            {/* BMI Card */}
            <div id="patient-bmi-section" className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">BMI</h3>
                {bmi && (
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>{bmi.heightCm} cm</span>
                    <span>{bmi.weightKg} kg</span>
                    <span>{bmi.measuredAt ? new Date(bmi.measuredAt).toLocaleDateString() : ''}</span>
                  </div>
                )}
              </div>
              {bmiLoading ? (
                <p className="text-xs text-gray-400">Caricamento...</p>
              ) : bmi ? (
                <div className="flex items-center gap-6">
                  <div className="flex-shrink-0">
                    <p className={`text-3xl font-bold ${bmi.color || 'text-gray-900'}`}>{bmi.bmi}</p>
                    <p className={`text-sm font-medium ${bmi.color || 'text-gray-500'}`}>{bmi.level}</p>
                  </div>
                  {bmiHistory.length > 1 && (
                    <div className="flex-1 min-w-0">
                      <ResponsiveContainer width="100%" height={120}>
                        <LineChart data={bmiHistory}>
                          <XAxis dataKey="timestamp" tick={false} axisLine={false} />
                          <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={false} axisLine={false} />
                          <Tooltip
                            labelFormatter={(v) => new Date(v).toLocaleDateString()}
                            formatter={(val: any) => [Number(val).toFixed(1), 'BMI']}
                          />
                          <Line type="monotone" dataKey="bmi" stroke="#2563eb" dot={false} strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500">Servono misurazioni di peso e altezza</p>
              )}
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

            {/* Chart controls */}
            <div className="bg-white p-4 rounded-lg shadow-sm border space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs text-gray-500">Tipo Misurazione</label>
                  <select value={selectedType} onChange={(e) => { setSelectedType(e.target.value); setSelectedFields([]); }}
                    className="w-full border rounded px-2 py-1.5 text-sm">
                    <option value="">Seleziona...</option>
                    {(() => {
                      const groups: Record<string, typeof types> = {};
                      for (const t of types) {
                        const g = t.macrogroup || 'other';
                        if (!groups[g]) groups[g] = [];
                        groups[g].push(t);
                      }
                      return Object.entries(groups).map(([group, ts]) => (
                        <optgroup key={group} label={group}>
                          {ts.map((t) => (
                            <option key={t.key} value={t.key}>{t.name}</option>
                          ))}
                        </optgroup>
                      ));
                    })()}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Raggruppamento Temporale</label>
                  <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as TimeGroupBy)}
                    className="w-full border rounded px-2 py-1.5 text-sm">
                    <option value="hour">Ora</option>
                    <option value="day">Giorno</option>
                    <option value="week">Settimana</option>
                    <option value="month">Mese</option>
                    <option value="year">Anno</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Aggregazione</label>
                  <select value={aggregation} onChange={(e) => setAggregation(e.target.value as AggregationFunction)}
                    className="w-full border rounded px-2 py-1.5 text-sm">
                    <option value="avg">Media</option>
                    <option value="min">Minimo</option>
                    <option value="max">Massimo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Tipo Grafico</label>
                  <select value={chartType} onChange={(e) => setChartType(e.target.value as ChartType)}
                    className="w-full border rounded px-2 py-1.5 text-sm">
                    <option value="line">Linea</option>
                    <option value="area">Area</option>
                    <option value="bar">Barre</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={loadChart} className="w-full bg-blue-600 text-white py-1.5 rounded text-sm hover:bg-blue-700">
                    Aggiorna Grafico
                  </button>
                </div>
              </div>
              {currentType && (
                <div className="flex flex-wrap gap-3">
                  {currentType.fields.map((f) => (
                    <label key={f.key} className="flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={selectedFields.includes(f.key)}
                        onChange={() => toggleField(f.key)} />
                      {f.name} ({f.unit})
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Chart */}
            <div id="chart-section" className="bg-white p-4 rounded-lg shadow-sm border">
              {renderChart()}
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

            {/* Notes (read-only) */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-4 py-3 border-b font-medium text-sm">Note Cliniche</div>
              <div className="p-4 space-y-3">
                {notes.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Nessuna nota ancora</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {notes.map((n: any) => (
                      <div key={n._id} className="border-l-2 border-blue-300 pl-3 py-1">
                        <p className="text-sm">{n.content}</p>
                        <p className="text-xs text-gray-400 mt-1">{n.doctorName || 'Medico'} · {new Date(n.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Anamnesis (current therapy only) */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-4 py-3 border-b font-medium text-sm">Anamnesi — Terapia in Corso</div>
              <div className="p-4 space-y-3">
                {anamnesis.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Nessuna terapia in corso</p>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {anamnesis.map((a: any) => (
                      <div key={a._id} className="border-l-2 border-purple-300 pl-3 py-1">
                        <p className="text-xs text-gray-400">
                          Registrata: {new Date(a.recordedAt).toLocaleString()}
                        </p>
                        <div className="mt-1 border-l-2 border-green-300 pl-2">
                          <p className="text-xs font-semibold text-gray-600">Farmacologica</p>
                          {a.farmacologica?.entries?.map((entry: any, i: number) => (
                            <p key={i} className="text-sm whitespace-pre-wrap flex items-center gap-1">
                              <span>• {entry.text}</span>
                              <span className="text-xs bg-green-100 text-green-700 px-1 py-0.5 rounded font-medium">
                                Attuale
                              </span>
                            </p>
                          ))}
                        </div>
                        {a.notes && (
                          <div className="mt-1">
                            <p className="text-xs font-medium text-gray-600">Note</p>
                            <p className="text-sm whitespace-pre-wrap">{a.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

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