import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import apiClient from '../api/client';
import { Link } from 'react-router-dom';
import { getMeasurementTypes } from '../api/measurementTypes';
import { getChartConfigs, createChartConfig, deleteChartConfig } from '../api/chartConfigs';
import { getMyContractStatus } from '../api/contracts';
import type { IChartConfig, IMeasurementTypeConfig, IMeasurement, TimeGroupBy, ChartType, AggregationFunction, TimeSeriesPoint, IAnamnesis } from '@healthbridge/shared';
import type { ContractStatus } from '../api/contracts';

type ViewMode = 'individual' | 'aggregated';

function formatDate(value: string) {
  try {
    const hasTime = value.includes('T');
    if (!hasTime) {
      return new Date(value + 'T12:00:00Z').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return value; }
}

export function DoctorPatients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('individual');
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [types, setTypes] = useState<IMeasurementTypeConfig[]>([]);
  const [selectedType, setSelectedType] = useState('');
  const [groupBy, setGroupBy] = useState<TimeGroupBy>('day');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [aggregation, setAggregation] = useState<AggregationFunction>('avg');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [chartData, setChartData] = useState<TimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState(false);

  // Add patient — two modes
  const [addMode, setAddMode] = useState<'email' | 'create'>('email');
  const [addEmail, setAddEmail] = useState('');
  const [addMsg, setAddMsg] = useState('');
  const [addError, setAddError] = useState('');
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createBirthDate, setCreateBirthDate] = useState('');
  const [createSex, setCreateSex] = useState('');
  const [createBirthCity, setCreateBirthCity] = useState('');
  const [createHeight, setCreateHeight] = useState('');
  const [createWeight, setCreateWeight] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createHomeFull, setCreateHomeFull] = useState('');
  const [createHomeCity, setCreateHomeCity] = useState('');
  const [createHomeProvince, setCreateHomeProvince] = useState('');
  const [createHomeRegion, setCreateHomeRegion] = useState('');
  const [createHomeCountry, setCreateHomeCountry] = useState('');
  const [createHomeZip, setCreateHomeZip] = useState('');
  const [createMsg, setCreateMsg] = useState('');
  const [createErr, setCreateErr] = useState('');
  const [createSharedTypes, setCreateSharedTypes] = useState<string[]>([]);
  // Sharing request
  const [showRequestSharing, setShowRequestSharing] = useState(false);
  const [requestTypes, setRequestTypes] = useState<string[]>([]);
  const [patientSharing, setPatientSharing] = useState<string[]>([]);
  const [sharingMsg, setSharingMsg] = useState('');

  // GDPR consent blocked
  const [gdprBlocked, setGdprBlocked] = useState(false);

  // Recent activity
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [activitySince] = useState(() => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  const [activityLoading, setActivityLoading] = useState(false);

  // Edit patient
  const [showEditPatient, setShowEditPatient] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editSex, setEditSex] = useState('');
  const [editMsg, setEditMsg] = useState('');
  const [editErr, setEditErr] = useState('');

  // Notes
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [noteMsg, setNoteMsg] = useState('');
  const [shareWithPatient, setShareWithPatient] = useState(false);
  const [notifyViaEmail, setNotifyViaEmail] = useState(false);
  const [noteAnamnesisId, setNoteAnamnesisId] = useState('');

  // Anamnesis
  const [anamnesis, setAnamnesis] = useState<IAnamnesis[]>([]);
  const [showAnamnesisForm, setShowAnamnesisForm] = useState(false);
  const [anamTab, setAnamTab] = useState('fisiologica');
  const [anamEntries, setAnamEntries] = useState<Record<string, string>>({
    fisiologica: '',
    familiare: '',
    farmacologica: '',
    patologicaRemota: '',
    patologicaProssima: '',
    sociale: '',
  });
  const [newAnamnesisNotes, setNewAnamnesisNotes] = useState('');
  const [anamnesisMsg, setAnamnesisMsg] = useState('');
  const anamTabs = [
    { key: 'fisiologica', label: 'Fisiologica', color: 'border-blue-300' },
    { key: 'familiare', label: 'Familiare', color: 'border-green-300' },
    { key: 'farmacologica', label: 'Farmacologica', color: 'border-purple-300' },
    { key: 'patologicaRemota', label: 'Pat. Remota', color: 'border-orange-300' },
    { key: 'patologicaProssima', label: 'Pat. Prossima', color: 'border-red-300' },
    { key: 'sociale', label: 'Sociale', color: 'border-teal-300' },
  ];

  // BMI
  const [bmi, setBmi] = useState<any>(null);
  const [bmiLoading, setBmiLoading] = useState(false);

  // Saved chart configs
  const [savedConfigs, setSavedConfigs] = useState<IChartConfig[]>([]);
const [savedConfigsLoaded, setSavedConfigsLoaded] = useState(false);
  const [selectedConfigId, setSelectedConfigId] = useState('');
  const [configName, setConfigName] = useState('');
  const [configMsg, setConfigMsg] = useState('');
  const [configErr, setConfigErr] = useState('');

  // Contract status
  const [contractStatus, setContractStatus] = useState<ContractStatus | null | undefined>(undefined);

  // Aggregated filters
  const [filterSex, setFilterSex] = useState('');
  const [filterAgeFrom, setFilterAgeFrom] = useState('');
  const [filterAgeTo, setFilterAgeTo] = useState('');
  const [filterHomeCity, setFilterHomeCity] = useState('');
  const [filterHomeRegion, setFilterHomeRegion] = useState('');
  const [filterHomeCountry, setFilterHomeCountry] = useState('');

  const loadPatients = useCallback(async () => {
    try {
      const res = await apiClient.get('/doctor/patients');
      setPatients(res.data.data);
    } catch {}
  }, []);

  useEffect(() => {
    loadPatients();
    getMeasurementTypes().then(setTypes).catch(() => {});
    getMyContractStatus().then(setContractStatus).catch(() => setContractStatus(null));
  }, [loadPatients]);

  const loadRecentActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const res = await apiClient.get('/doctor/recent-activity', { params: { since: activitySince } });
      setRecentActivity(res.data.data);
    } catch {}
    setActivityLoading(false);
  }, [activitySince]);

  const handleToggleNotify = async (patientId: string, current: boolean) => {
    try {
      await apiClient.patch(`/doctor/patients/${patientId}/notify`, { notifyOnNewMeasurement: !current });
      loadPatients();
    } catch {}
  };

  const handleDeletePatientMeasurements = async () => {
    if (!selectedPatient) return;
    const msg = selectedType
      ? `Delete ALL measurements of type "${types.find(t => t.key === selectedType)?.name || selectedType}" for this patient?`
      : 'Delete ALL measurements for this patient? This cannot be undone.';
    if (!confirm(msg)) return;
    try {
      await apiClient.delete(`/doctor/patients/${selectedPatient}/measurements`, { params: selectedType ? { type: selectedType } : {} });
      setMeasurements([]);
      setChartData([]);
    } catch {}
  };

  const loadSavedConfigs = useCallback(() => {
    getChartConfigs().then(setSavedConfigs).catch(() => {});
  }, []);

  useEffect(() => { if (!savedConfigsLoaded) { loadSavedConfigs(); setSavedConfigsLoaded(true); } }, [loadSavedConfigs, savedConfigsLoaded]);

  const handleSaveConfig = async () => {
    if (!configName.trim() || !selectedType) {
      setConfigErr('Enter a name and select a measurement type');
      return;
    }
    setConfigMsg(''); setConfigErr('');
    try {
      await createChartConfig({
        name: configName.trim(),
        measurementType: selectedType,
        groupBy,
        aggregation,
        fields: selectedFields,
        chartType,
      });
      setConfigName('');
      setConfigMsg('Saved');
      loadSavedConfigs();
    } catch (err: any) {
      setConfigErr(err.response?.data?.error || 'Salvataggio fallito');
    }
  };

  const handleLoadConfig = (configId: string) => {
    const config = savedConfigs.find((c) => c._id === configId);
    if (!config) return;
    setSelectedType(config.measurementType);
    setGroupBy(config.groupBy);
    setAggregation(config.aggregation);
    setSelectedFields(config.fields);
    setChartType(config.chartType);
    setSelectedConfigId(configId);
  };

  const handleDeleteConfig = async (e: React.MouseEvent, configId: string) => {
    e.stopPropagation();
    if (!confirm('Delete this saved configuration?')) return;
    try {
      await deleteChartConfig(configId);
      if (selectedConfigId === configId) setSelectedConfigId('');
      loadSavedConfigs();
    } catch {}
  };

  const currentType = types.find((t) => t.key === selectedType);
  const selectedPatientData = patients.find((p) => p._id === selectedPatient);

  const loadChart = useCallback(async () => {
    if (!selectedType || (!selectedPatient && viewMode === 'individual')) return;
    setLoading(true);

    try {
      const params: Record<string, string> = {
        type: selectedType,
        groupBy,
        aggregation,
        fields: selectedFields.join(','),
      };

      if (viewMode === 'individual' && selectedPatient) {
        const res = await apiClient.get(`/doctor/patients/${selectedPatient}/timeseries`, { params });
        setChartData(res.data.data);
        setGdprBlocked(false);
      } else {
        const filterParams: Record<string, string> = { ...params };
        if (filterSex) filterParams.sex = filterSex;
        if (filterAgeFrom) filterParams.ageFrom = filterAgeFrom;
        if (filterAgeTo) filterParams.ageTo = filterAgeTo;
        if (filterHomeCity) filterParams.homeCity = filterHomeCity;
        if (filterHomeRegion) filterParams.homeRegion = filterHomeRegion;
        if (filterHomeCountry) filterParams.homeCountry = filterHomeCountry;
        const res = await apiClient.get('/doctor/timeseries', { params: filterParams });
        setChartData(res.data.data);
      }
    } catch (err: any) {
      if (err?.response?.status === 403 && err?.response?.data?.error?.includes('GDPR')) {
        setGdprBlocked(true);
      }
      setChartData([]);
    }
    finally { setLoading(false); }
  }, [selectedType, groupBy, aggregation, selectedFields, selectedPatient, viewMode,
      filterSex, filterAgeFrom, filterAgeTo, filterHomeCity, filterHomeRegion, filterHomeCountry]);

  useEffect(() => { loadChart(); }, [loadChart]);

  const loadNotes = useCallback(() => {
    if (!selectedPatient || viewMode !== 'individual') return;
    apiClient.get(`/doctor/patients/${selectedPatient}/notes`)
      .then((res) => setNotes(res.data.data))
      .catch(() => setNotes([]));
  }, [selectedPatient, viewMode]);

  const loadAnamnesis = useCallback(() => {
    if (!selectedPatient || viewMode !== 'individual') return;
    import('../api/anamnesis').then((mod) =>
      mod.getPatientAnamnesis(selectedPatient).then(setAnamnesis).catch(() => {})
    );
  }, [selectedPatient, viewMode]);

  const loadBmi = useCallback(() => {
    if (!selectedPatient || viewMode !== 'individual') return;
    setBmiLoading(true);
    apiClient.get(`/patient/bmi?userId=${selectedPatient}`)
      .then((res) => setBmi(res.data.data))
      .catch(() => setBmi(null))
      .finally(() => setBmiLoading(false));
  }, [selectedPatient, viewMode]);

  useEffect(() => {
    if (!selectedPatient || viewMode !== 'individual') return;
    apiClient.get(`/doctor/patients/${selectedPatient}/latest-measurements`)
      .then((res) => { setMeasurements(res.data.data); setGdprBlocked(false); })
      .catch((err) => { if (err?.response?.status === 403 && err?.response?.data?.error?.includes('GDPR')) setGdprBlocked(true); setMeasurements([]); });
    loadNotes();
    loadAnamnesis();
    loadBmi();
  }, [selectedPatient, viewMode, loadNotes, loadAnamnesis, loadBmi]);

  const toggleField = (key: string) => {
    setSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  };

  const renderChart = () => {
    if (loading) return <p className="text-gray-500 text-center py-12">Caricamento grafico...</p>;
    if (gdprBlocked) return <p className="text-red-600 text-center py-12">Consenso GDPR non concesso dal paziente. I dati non sono accessibili.</p>;
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Medico</h1>

      <div className="flex gap-4">
        <div className="w-64 shrink-0 space-y-1">
          {patients.length === 0 && <p className="text-sm text-gray-500">No patients assigned</p>}

          {/* Add Patient */}
          <div className="bg-white border rounded p-2 mb-2">
            <p className="text-xs font-medium text-gray-600 mb-1">Aggiungi Paziente</p>
            <div className="flex gap-1 mb-2">
              <button onClick={() => setAddMode('email')}
                className={`text-xs px-2 py-0.5 rounded ${addMode === 'email' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                Per Email
              </button>
              <button onClick={() => setAddMode('create')}
                className={`text-xs px-2 py-0.5 rounded ${addMode === 'create' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                Crea Account
              </button>
            </div>
            {addMode === 'email' ? (
              <form onSubmit={(e) => {
                e.preventDefault();
                setAddMsg(''); setAddError('');
                apiClient.post('/doctor/patients', { email: addEmail })
                  .then(() => { setAddEmail(''); setAddMsg('Paziente aggiunto (conferma in sospeso)'); loadPatients(); })
                  .catch((err) => setAddError(err.response?.data?.error || 'Impossibile aggiungere paziente'));
              }} className="flex gap-1">
                <input type="email" value={addEmail} placeholder="paziente@email.com"
                  onChange={(e) => setAddEmail(e.target.value)} required
                  className="flex-1 border rounded px-2 py-1 text-xs" />
                <button type="submit" className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700">Aggiungi</button>
              </form>
            ) : (
              <form onSubmit={async (e) => {
                e.preventDefault(); setCreateMsg(''); setCreateErr('');
                try {
                  const body: any = {
                    name: createName, email: createEmail, password: createPassword, birthDate: createBirthDate, sex: createSex,
                  };
                  if (createBirthCity) body.birthCity = createBirthCity;
                  if (createHeight) body.height = parseFloat(createHeight);
                  if (createWeight) body.weight = parseFloat(createWeight);
                  if (createSharedTypes.length > 0) body.sharedMeasurementTypes = createSharedTypes;
                  if (createHomeFull || createHomeCity) body.homeAddress = {
                    full: createHomeFull, city: createHomeCity, province: createHomeProvince,
                    region: createHomeRegion, country: createHomeCountry, zip: createHomeZip,
                  };
                  await apiClient.post('/doctor/patients', body);
                  setCreateName(''); setCreateEmail(''); setCreatePassword(''); setCreateBirthDate(''); setCreateSex('');
                  setCreateBirthCity(''); setCreateHeight(''); setCreateWeight(''); setCreateSharedTypes([]);
                  setCreateHomeFull(''); setCreateHomeCity(''); setCreateHomeProvince('');
                  setCreateHomeRegion(''); setCreateHomeCountry(''); setCreateHomeZip('');
                  setCreateMsg('Account paziente creato. Comunica la password temporanea al paziente — dovrà cambiarla al primo accesso.');
                  await loadPatients();
                } catch (err: any) {
                  setCreateErr(err.response?.data?.error || 'Impossibile creare paziente');
                }
              }} className="space-y-1.5">
                <input value={createName} placeholder="Nome completo" onChange={(e) => setCreateName(e.target.value)} required
                  className="w-full border rounded px-2 py-1 text-xs" />
                <input type="email" value={createEmail} placeholder="Email" onChange={(e) => setCreateEmail(e.target.value)} required
                  className="w-full border rounded px-2 py-1 text-xs" />
                <input type="password" value={createPassword} placeholder="Password temporanea" onChange={(e) => setCreatePassword(e.target.value)} required minLength={8}
                  className="w-full border rounded px-2 py-1 text-xs" />
                <div className="flex gap-1">
                  <input type="date" value={createBirthDate} onChange={(e) => setCreateBirthDate(e.target.value)} required
                    className="w-0 flex-1 min-w-0 border rounded px-1 py-1 text-xs" />
                  <select value={createSex} onChange={(e) => setCreateSex(e.target.value)} required
                    className="w-0 flex-1 min-w-0 border rounded px-1 py-1 text-xs">
                    <option value="">Sesso</option>
                    <option value="male">Maschio</option>
                    <option value="female">Femmina</option>
                    <option value="other">Altro</option>
                  </select>
                </div>
                <input value={createBirthCity} placeholder="Città di nascita (opzionale)" onChange={(e) => setCreateBirthCity(e.target.value)}
                  className="w-full border rounded px-2 py-1 text-xs" />
                <div className="flex gap-1">
                  <input type="number" step="0.1" value={createHeight} placeholder="Altezza (cm)" onChange={(e) => setCreateHeight(e.target.value)}
                    className="w-0 flex-1 min-w-0 border rounded px-1 py-1 text-xs" />
                  <input type="number" step="0.1" value={createWeight} placeholder="Peso (kg)" onChange={(e) => setCreateWeight(e.target.value)}
                    className="w-0 flex-1 min-w-0 border rounded px-1 py-1 text-xs" />
                </div>
                <details className="text-xs">
                  <summary className="cursor-pointer text-gray-500">Tipi misurazione da monitorare (opzionale, default tutti)</summary>
                  <div className="mt-1 flex flex-wrap gap-2 max-h-28 overflow-y-auto border rounded p-1">
                    {types.map((t) => (
                      <label key={t.key} className="flex items-center gap-1 text-xs cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                        <input type="checkbox" checked={createSharedTypes.includes(t.key)}
                          onChange={() => setCreateSharedTypes((prev) =>
                            prev.includes(t.key) ? prev.filter((k) => k !== t.key) : [...prev, t.key]
                          )} />
                        {t.name}
                      </label>
                    ))}
                  </div>
                </details>
                <details className="text-xs">
                  <summary className="cursor-pointer text-gray-500">Indirizzo di casa (opzionale)</summary>
                  <div className="mt-1 space-y-1">
                    <input autoComplete="off" value={createHomeFull} placeholder="Indirizzo completo" onChange={(e) => setCreateHomeFull(e.target.value)}
                      className="w-full border rounded px-2 py-1 text-xs" />
                    <input autoComplete="off" value={createHomeCity} placeholder="Città" onChange={(e) => setCreateHomeCity(e.target.value)}
                      className="w-full border rounded px-2 py-1 text-xs" />
                    <input autoComplete="off" value={createHomeProvince} placeholder="Provincia" onChange={(e) => setCreateHomeProvince(e.target.value)}
                      className="w-full border rounded px-2 py-1 text-xs" />
                    <input autoComplete="off" value={createHomeRegion} placeholder="Regione" onChange={(e) => setCreateHomeRegion(e.target.value)}
                      className="w-full border rounded px-2 py-1 text-xs" />
                    <input autoComplete="off" value={createHomeCountry} placeholder="Paese" onChange={(e) => setCreateHomeCountry(e.target.value)}
                      className="w-full border rounded px-2 py-1 text-xs" />
                    <input autoComplete="off" value={createHomeZip} placeholder="CAP" onChange={(e) => setCreateHomeZip(e.target.value)}
                      className="w-full border rounded px-2 py-1 text-xs" />
                  </div>
                </details>
                <button type="submit" className="w-full bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700">
                  Crea Account Paziente
                </button>
                {createMsg && <p className="text-xs text-green-600">{createMsg}</p>}
                {createErr && <p className="text-xs text-red-600">{createErr}</p>}
              </form>
            )}
            {addMsg && <p className="text-xs text-green-600 mt-1">{addMsg}</p>}
            {addError && <p className="text-xs text-red-600 mt-1">{addError}</p>}
          </div>

          <button
            onClick={() => { setViewMode('aggregated'); setSelectedPatient(null); setSelectedFields([]); setChartData([]); }}
            className={`w-full text-left px-3 py-2 rounded text-sm ${
              viewMode === 'aggregated' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100'
            }`}
          >
            Tutti i Pazienti (Aggregato)
          </button>
          <div className="border-t pt-1 mt-1">
            <p className="text-xs text-gray-400 px-3 mb-1">Pazienti Individuali</p>
            {patients.map((p) => (
              <div key={p._id} className={`flex items-center px-3 py-1.5 rounded text-sm ${
                selectedPatient === p._id && viewMode === 'individual'
                  ? 'bg-blue-50 text-blue-700 font-medium' : ''
              }`}>
                <div className="flex-1 truncate cursor-pointer flex items-center gap-1.5" onClick={() => { setSelectedPatient(p._id); setViewMode('individual'); setSelectedFields([]); setChartData([]); setGdprBlocked(false); }}>
                  {p.hasAlerts && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Has active alerts" />}
                  <span className="font-medium truncate">{p.name}</span>
                  {p.sex && <span className="text-xs text-gray-400 shrink-0">({p.sex})</span>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleNotify(p._id, p.notifyOnNewMeasurement); }}
                    className={`text-xs px-1.5 py-0.5 rounded ${p.notifyOnNewMeasurement ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    title={p.notifyOnNewMeasurement ? 'Notifications on' : 'Notifications off'}
                  >
                    {p.notifyOnNewMeasurement ? 'ON' : 'OFF'}
                  </button>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    p.status === 'active' ? 'bg-green-100 text-green-700' :
                    p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    p.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {p.status === 'active' ? 'Attivo' : p.status === 'pending' ? 'In attesa' : p.status === 'rejected' ? 'Rifiutato' : 'Inattivo'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-4">
          {/* Recent Activity */}
          <details className="bg-white p-4 rounded-lg shadow-sm border">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 flex items-center gap-2">
              <span>Attività Recente (ultime 24h)</span>
              <button onClick={(e) => { e.preventDefault(); loadRecentActivity(); }} className="text-xs text-blue-600 hover:underline">
                {activityLoading ? '...' : 'Aggiorna'}
              </button>
            </summary>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-gray-400 mt-2">Nessuna attività recente</p>
            ) : (
              <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
                {recentActivity.map((a: any) => (
                  <div key={a._id} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                    <div>
                      <span className="font-medium">{a.patientName}</span>
                      <span className="text-gray-500 ml-1">{a.type}</span>
                    </div>
                    <div className="text-gray-400">
                      <span className="mr-2">{Object.entries(a.values).map(([k, v]) => `${k}: ${v}`).join(', ')}</span>
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
            </details>

          {contractStatus && (
            <div className="bg-white p-3 rounded-lg shadow-sm border flex items-center gap-4 text-sm">
              <span className="font-medium text-gray-700">Contratto:</span>
              <span className="capitalize text-gray-600">
                {contractStatus.feeType === 'fixed' ? 'Fisso' : contractStatus.feeType === 'monthly' ? 'Mensile' : 'Per paziente'}
              </span>
              <span className="text-gray-600">{contractStatus.fee} {contractStatus.currency}</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">Max {contractStatus.maxPatients} paz.</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">
                Dall'ultima fattura:{' '}
                <span className="font-medium text-blue-600">{contractStatus.consumedSinceInvoice} {contractStatus.currency}</span>
              </span>
            </div>
          )}

          {viewMode === 'aggregated' && (
            <details className="bg-white p-4 rounded-lg shadow-sm border">
              <summary className="cursor-pointer text-sm font-medium text-gray-700">Filtri Pazienti</summary>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                <div>
                  <label className="block text-xs text-gray-500">Sesso</label>
                  <select value={filterSex} onChange={(e) => setFilterSex(e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                    <option value="">Tutti</option>
                    <option value="male">Maschio</option>
                    <option value="female">Femmina</option>
                    <option value="other">Altro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Età da</label>
                  <input type="number" value={filterAgeFrom} onChange={(e) => setFilterAgeFrom(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Età a</label>
                  <input type="number" value={filterAgeTo} onChange={(e) => setFilterAgeTo(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Città</label>
                  <input value={filterHomeCity} onChange={(e) => setFilterHomeCity(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Regione</label>
                  <input value={filterHomeRegion} onChange={(e) => setFilterHomeRegion(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Paese</label>
                  <input value={filterHomeCountry} onChange={(e) => setFilterHomeCountry(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
                </div>
              </div>
            </details>
          )}

          {viewMode === 'individual' && !selectedPatient && (
              <p className="text-gray-500 text-center py-12 bg-white rounded-lg border">
                Seleziona un paziente dal pannello sinistro
              </p>
          )}

          {(selectedPatient || viewMode === 'aggregated') && (
            <>
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
                        const labels: Record<string, string> = {
                          generalhealth: 'Salute Generale',
                          cardiac: 'Cardiaco',
                          blood_gas: 'Sangue / Gas',
                          lipidemia: 'Profilo Lipidico',
                          renal: 'Funzione Renale',
                        };
                        return Object.entries(groups).map(([group, ts]) => (
                          <optgroup key={group} label={labels[group] || group}>
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

                {/* Saved configs */}
                <div className="border-t pt-3 mt-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-600">Configurazioni Salvate:</span>
                    <select value={selectedConfigId} onChange={(e) => handleLoadConfig(e.target.value)}
                      className="border rounded px-2 py-1 text-xs min-w-[140px]">
                      <option value="">— Seleziona —</option>
                      {savedConfigs.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1">
                      <input value={configName} placeholder="Salva come..."
                        onChange={(e) => setConfigName(e.target.value)}
                        className="border rounded px-2 py-1 text-xs w-32"
                      />
                      <button onClick={handleSaveConfig} className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700">
                        Salva
                      </button>
                    </div>
                    {selectedConfigId && (
                      <button onClick={(e) => handleDeleteConfig(e, selectedConfigId)}
                        className="text-red-600 border border-red-300 px-2 py-1 rounded text-xs hover:bg-red-50">
                        Elimina
                      </button>
                    )}
                    {configMsg && <span className="text-xs text-green-600">{configMsg}</span>}
                    {configErr && <span className="text-xs text-red-600">{configErr}</span>}
                  </div>
                </div>
              </div>

              <div id="chart-section" className="bg-white p-4 rounded-lg shadow-sm border">
                {renderChart()}
              </div>
            </>
          )}

          {viewMode === 'individual' && selectedPatient && (
            <>
              <div className="flex gap-2 items-center bg-white px-4 py-2 rounded-lg shadow-sm border flex-wrap">
                <span className="text-sm font-medium">{selectedPatientData?.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  selectedPatientData?.status === 'active' ? 'bg-green-100 text-green-700' :
                  selectedPatientData?.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  selectedPatientData?.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {selectedPatientData?.status === 'active' ? 'Attivo' : selectedPatientData?.status === 'pending' ? 'In attesa' : selectedPatientData?.status === 'rejected' ? 'Rifiutato' : 'Inattivo'}
                </span>
                {selectedPatientData?.status !== 'active' && selectedPatientData?.status !== 'rejected' && (
                  <button onClick={() => apiClient.patch(`/doctor/patients/${selectedPatient}`, { status: 'active' }).then(loadPatients)} className="text-xs bg-green-600 text-white px-2 py-0.5 rounded hover:bg-green-700">Attiva</button>
                )}
                {selectedPatientData?.status === 'active' && (
                  <button onClick={() => apiClient.patch(`/doctor/patients/${selectedPatient}`, { status: 'inactive' }).then(loadPatients)} className="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded hover:bg-yellow-700">Disattiva</button>
                )}
                <button onClick={() => {
                  setEditName(selectedPatientData?.name || '');
                  setEditEmail(selectedPatientData?.email || '');
                  setEditBirthDate(selectedPatientData?.birthDate?.split('T')[0] || '');
                  setEditSex(selectedPatientData?.sex || '');
                  setEditMsg(''); setEditErr('');
                  setShowEditPatient(true);
                }} className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700">Modifica</button>
                <Link to={`/measurements/new?forPatient=${selectedPatient}`}
                  className="text-xs bg-green-600 text-white px-2 py-0.5 rounded hover:bg-green-700">
                  Nuova Misurazione
                </Link>
                <button onClick={async () => {
                  setSharingMsg('');
                  try {
                    const res = await apiClient.get(`/doctor/patients/${selectedPatient}/sharing`);
                    setPatientSharing(res.data.data?.types || []);
                    setShowRequestSharing(true);
                  } catch { setPatientSharing([]); setShowRequestSharing(true); }
                }} className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded hover:bg-purple-700">Condivisione</button>
                <button onClick={async () => {
                    if (!window.confirm('Rimuovere questo paziente dalla lista?')) return;
                  await apiClient.delete(`/doctor/patients/${selectedPatient}`);
                  setSelectedPatient(null);
                  loadPatients();
                }} className="text-xs bg-red-600 text-white px-2 py-0.5 rounded hover:bg-red-700 ml-auto">Rimuovi</button>
              </div>

              {/* BMI Card */}
              {!bmiLoading && bmi && (
                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">BMI</p>
                      <p className={`text-2xl font-bold ${bmi.color || 'text-gray-900'}`}>
                        {bmi.bmi}
                      </p>
                      <p className={`text-xs font-medium ${bmi.color || 'text-gray-500'}`}>
                        {bmi.level}
                      </p>
                    </div>
                    <div className="text-right text-xs text-gray-400">
                      <p>{bmi.heightCm} cm</p>
                      <p>{bmi.weightKg} kg</p>
                      <p>{bmi.measuredAt ? new Date(bmi.measuredAt).toLocaleDateString() : ''}</p>
                    </div>
                  </div>
                </div>
              )}
              {bmiLoading && <p className="text-xs text-gray-400">Loading BMI...</p>}

              {/* Request Sharing Modal */}
              {showRequestSharing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 space-y-4">
                    <h3 className="text-sm font-semibold">Sharing Settings — {selectedPatientData?.name}</h3>
                    {patientSharing.length === 0 ? (
                      <p className="text-xs text-gray-500">Loading sharing info...</p>
                    ) : patientSharing.includes('*') ? (
                      <p className="text-xs text-green-600">All measurement types are currently shared.</p>
                    ) : (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Currently shared types:</p>
                        <div className="flex flex-wrap gap-1">
                          {patientSharing.map((t: string) => (
                            <span key={t} className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="border-t pt-3">
                      <p className="text-xs font-medium mb-1">Request access to specific types:</p>
                      <div className="flex flex-wrap gap-2 mb-3 max-h-32 overflow-y-auto">
                        {types.filter((t) => !patientSharing.includes('*') && !patientSharing.includes(t.key)).map((t) => (
                          <label key={t.key} className="flex items-center gap-1 text-xs">
                            <input type="checkbox" checked={requestTypes.includes(t.key)}
                              onChange={() => setRequestTypes((prev) =>
                                prev.includes(t.key) ? prev.filter((k) => k !== t.key) : [...prev, t.key]
                              )} />
                            {t.name}
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={async () => {
                          if (requestTypes.length === 0) return;
                          try {
                            await apiClient.post(`/doctor/patients/${selectedPatient}/request-sharing`, { types: requestTypes });
                            setSharingMsg('Request sent to patient');
                            setRequestTypes([]);
                          } catch (err: any) {
                            setSharingMsg(err.response?.data?.error || 'Failed to request');
                          }
                        }} disabled={requestTypes.length === 0}
                          className="bg-purple-600 text-white px-3 py-1 rounded text-xs hover:bg-purple-700 disabled:opacity-50">
                          Request Selected
                        </button>
                        <button onClick={() => { setShowRequestSharing(false); setSharingMsg(''); }}
                          className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-400">
                          Close
                        </button>
                      </div>
                      {sharingMsg && <p className="text-xs text-green-600 mt-1">{sharingMsg}</p>}
                    </div>
                  </div>
                </div>
              )}

              {showEditPatient && (
                <form onSubmit={async (e) => {
                  e.preventDefault(); setEditMsg(''); setEditErr('');
                  try {
                    const body: Record<string, any> = {};
                    if (editName !== selectedPatientData?.name) body.name = editName;
                    if (editEmail !== selectedPatientData?.email) body.email = editEmail;
                    if (editBirthDate !== selectedPatientData?.birthDate?.split('T')[0]) body.birthDate = editBirthDate || null;
                    if (editSex !== (selectedPatientData?.sex || '')) body.sex = editSex || null;
                    if (Object.keys(body).length === 0) { setShowEditPatient(false); return; }
                    await apiClient.put(`/doctor/patients/${selectedPatient}/profile`, body);
                    setEditMsg('Patient updated');
                    loadPatients();
                  } catch (err: any) { setEditErr(err.response?.data?.error || 'Update failed'); }
                }} className="bg-white p-4 rounded-lg shadow-sm border space-y-3">
                  <p className="text-sm font-medium">Edit Patient — {selectedPatientData?.name}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500">Name</label>
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Email</label>
                      <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Data di Nascita</label>
                      <input type="date" value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Sesso</label>
                      <select value={editSex} onChange={(e) => setEditSex(e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                        <option value="">Non specificato</option>
                        <option value="male">Maschio</option>
                        <option value="female">Femmina</option>
                        <option value="other">Altro</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">Salva</button>
                    <button onClick={() => setShowEditPatient(false)} className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400">Annulla</button>
                  </div>
                  {editMsg && <p className="text-xs text-green-600">{editMsg}</p>}
                  {editErr && <p className="text-xs text-red-600">{editErr}</p>}
                </form>
              )}

              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-4 py-3 border-b font-medium text-sm flex items-center justify-between">
                  <span>Ultime Misurazioni — {selectedPatientData?.name}</span>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-gray-400">(per tipo)</span>
                    <button onClick={handleDeletePatientMeasurements} className="text-xs text-red-600 border border-red-300 px-2 py-0.5 rounded hover:bg-red-50">
                      Delete All
                    </button>
                  </div>
                </div>
                {measurements.length === 0 ? (
                  <p className={`text-center py-6 text-sm ${gdprBlocked ? 'text-red-600' : 'text-gray-500'}`}>
                    {gdprBlocked ? 'Consenso GDPR non concesso dal paziente. I dati non sono accessibili.' : 'Nessuna misurazione ancora'}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
                    {measurements.map((m) => {
                      const typeCfg = types.find((t) => t.key === m.type);
                      const trends = m.trends as Record<string, 'up' | 'down' | 'stable'> | undefined;
                      return (
                        <div
                          key={m._id}
                          onClick={() => {
                            setSelectedType(m.type);
                            const cfg = types.find((t) => t.key === m.type);
                            if (cfg) setSelectedFields(cfg.fields.map((f) => f.key));
                            document.getElementById('chart-section')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow"
                        >
                          <p className="text-xs font-medium text-blue-600 mb-1">{typeCfg?.name || m.type}</p>
                          <div className="space-y-0.5">
                            {Object.entries(m.values as Record<string, number>).map(([k, v]) => {
                              const field = typeCfg?.fields.find((f) => f.key === k);
                              const unit = (m.units as Record<string, string>)?.[k] || field?.unit || '';
                              const trend = trends?.[k];
                              const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : trend === 'stable' ? '→' : '';
                              const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-400';
                              return (
                                <p key={k} className="text-sm">
                                  <span className="text-gray-500">{field?.name || k}: </span>
                                  <span className="font-medium">{v}</span>
                                  {unit && <span className="text-gray-400 text-xs ml-0.5">{unit}</span>}
                                  {trendIcon && <span className={`ml-1 text-xs ${trendColor}`}>{trendIcon}</span>}
                                </p>
                              );
                            })}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{new Date(m.timestamp).toLocaleString()}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-4 py-3 border-b font-medium text-sm flex items-center justify-between">
                  <span>Anamnesi</span>
                  <button onClick={() => { setShowAnamnesisForm(!showAnamnesisForm); setAnamnesisMsg(''); setAnamTab('fisiologica'); }}
                    className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700">
                    {showAnamnesisForm ? 'Annulla' : 'Nuova Voce'}
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  {showAnamnesisForm && (
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const hasAnyEntry = Object.values(anamEntries).some((v) => v.trim());
                      if (!hasAnyEntry) return;
                      setAnamnesisMsg('');
                      try {
                        const { createPatientAnamnesis } = await import('../api/anamnesis');
                        const body: any = {};
                        for (const [key, val] of Object.entries(anamEntries)) {
                          if (val.trim()) {
                            body[key] = { entries: val.split('\n').map((l) => l.trim()).filter(Boolean) };
                          }
                        }
                        if (newAnamnesisNotes.trim()) body.notes = newAnamnesisNotes.trim();
                        await apiClient.post(`/doctor/patients/${selectedPatient}/anamnesis`, body);
                        setAnamEntries({ fisiologica: '', familiare: '', farmacologica: '', patologicaRemota: '', patologicaProssima: '', sociale: '' });
                        setNewAnamnesisNotes('');
                        setShowAnamnesisForm(false);
                        setAnamnesisMsg('Anamnesi salvata');
                        loadAnamnesis();
                      } catch (err: any) {
                        setAnamnesisMsg(err.response?.data?.error || 'Salvataggio fallito');
                      }
                    }} className="space-y-2 border-b pb-4">
                      <div className="flex gap-1 flex-wrap">
                        {anamTabs.map((t) => (
                          <button key={t.key} type="button" onClick={() => setAnamTab(t.key)}
                            className={`text-xs px-2 py-0.5 rounded ${anamTab === t.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">
                          {anamTabs.find((t) => t.key === anamTab)?.label} — una voce per riga
                        </label>
                        <textarea value={anamEntries[anamTab]} onChange={(e) => setAnamEntries((prev) => ({ ...prev, [anamTab]: e.target.value }))}
                          rows={4} className="w-full border rounded px-3 py-2 text-sm"
                          placeholder={`Inserisci voci per ${anamTabs.find((t) => t.key === anamTab)?.label.toLowerCase()}, una per riga...`} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Note aggiuntive (opzionale)</label>
                        <textarea value={newAnamnesisNotes} onChange={(e) => setNewAnamnesisNotes(e.target.value)}
                          rows={2} className="w-full border rounded px-3 py-2 text-sm" />
                      </div>
                      <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700">Salva Anamnesi</button>
                    </form>
                  )}
                  {anamnesisMsg && <p className="text-xs text-green-600">{anamnesisMsg}</p>}
                  {anamnesis.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Nessuna anamnesi ancora</p>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {anamnesis.map((a) => {
                        return (
                        <div key={a._id} className="border-l-2 border-purple-300 pl-3 py-1">
                          <p className="text-xs text-gray-400">
                            Registrata: {new Date(a.recordedAt).toLocaleString()}
                          </p>
                          {anamTabs.map((s) => {
                            const section = (a as any)[s.key];
                            if (!section?.entries?.length) return null;
                            return (
                              <div key={s.key} className={`mt-1 border-l-2 ${s.color} pl-2`}>
                                <p className="text-xs font-semibold text-gray-600">{s.label}</p>
                                {section.entries.map((entry: string, i: number) => (
                                  <p key={i} className="text-sm whitespace-pre-wrap">• {entry}</p>
                                ))}
                              </div>
                            );
                          })}
                          {a.notes && (
                            <div className="mt-1">
                              <p className="text-xs font-medium text-gray-600">Note</p>
                              <p className="text-sm whitespace-pre-wrap">{a.notes}</p>
                            </div>
                          )}
                        </div>
                      );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-4 py-3 border-b font-medium text-sm">Note Cliniche</div>
                <div className="p-4 space-y-3">
                  <form onSubmit={async (e) => {
                    e.preventDefault(); if (!newNote.trim()) return;
                    setNoteMsg('');
                    try {
                      await apiClient.post(`/doctor/patients/${selectedPatient}/notes`, {
                        content: newNote,
                        showToPatient: shareWithPatient,
                        notifyPatient: notifyViaEmail && shareWithPatient,
                        anamnesisId: noteAnamnesisId || undefined,
                      });
                      setNewNote(''); setShareWithPatient(false); setNotifyViaEmail(false); setNoteAnamnesisId('');
                      setNoteMsg('Nota aggiunta'); loadNotes();
                    } catch {}
                  }} className="space-y-2">
                    <div className="flex gap-2">
                      <input value={newNote} onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Scrivi una nota..." className="flex-1 border rounded px-3 py-2 text-sm" />
                      <button type="submit" className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700">Aggiungi</button>
                    </div>
                    <div className="flex items-center gap-4 text-xs flex-wrap">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={shareWithPatient}
                          onChange={(e) => { setShareWithPatient(e.target.checked); if (!e.target.checked) setNotifyViaEmail(false); }} />
                        Mostra al paziente
                      </label>
                      <label className={`flex items-center gap-1 cursor-pointer ${!shareWithPatient ? 'opacity-50' : ''}`}>
                        <input type="checkbox" checked={notifyViaEmail}
                          disabled={!shareWithPatient}
                          onChange={(e) => setNotifyViaEmail(e.target.checked)} />
                        Invia notifica email
                      </label>
                      {anamnesis.length > 0 && (
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" checked={!!noteAnamnesisId}
                            onChange={(e) => setNoteAnamnesisId(e.target.checked ? anamnesis[0]._id : '')} />
                          Associa all'ultima anamnesi
                        </label>
                      )}
                    </div>
                  </form>
                  {noteMsg && <p className="text-xs text-green-600">{noteMsg}</p>}
                  {notes.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Nessuna nota ancora</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {notes.map((n) => (
                        <div key={n._id} className="border-l-2 border-blue-300 pl-3 py-1">
                          <div className="flex items-start gap-2">
                            <p className="text-sm flex-1">{n.content}</p>
                            <div className="flex gap-1 shrink-0">
                              {n.showToPatient && <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Condivisa</span>}
                              {n.patientNotified && <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Notificata</span>}
                              {n.anamnesisId && <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">Anamnesi</span>}
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{n.doctorName || 'Medico'} · {new Date(n.createdAt).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
