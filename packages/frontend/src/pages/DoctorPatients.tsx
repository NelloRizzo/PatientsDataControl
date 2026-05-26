import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import apiClient from '../api/client';
import { getMeasurementTypes } from '../api/measurementTypes';
import { getChartConfigs, createChartConfig, deleteChartConfig } from '../api/chartConfigs';
import type { IChartConfig, IMeasurementTypeConfig, IMeasurement, TimeGroupBy, ChartType, AggregationFunction, TimeSeriesPoint } from '@healthbridge/shared';

type ViewMode = 'individual' | 'aggregated';

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return value; }
}

export function DoctorPatients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('individual');
  const [measurements, setMeasurements] = useState<IMeasurement[]>([]);
  const [types, setTypes] = useState<IMeasurementTypeConfig[]>([]);
  const [selectedType, setSelectedType] = useState('');
  const [groupBy, setGroupBy] = useState<TimeGroupBy>('day');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [aggregation, setAggregation] = useState<AggregationFunction>('avg');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [chartData, setChartData] = useState<TimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState(false);

  // Add patient
  const [addEmail, setAddEmail] = useState('');
  const [addMsg, setAddMsg] = useState('');
  const [addError, setAddError] = useState('');

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

  // Saved chart configs
  const [savedConfigs, setSavedConfigs] = useState<IChartConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState('');
  const [configName, setConfigName] = useState('');
  const [configMsg, setConfigMsg] = useState('');
  const [configErr, setConfigErr] = useState('');

  // Aggregated filters
  const [filterSex, setFilterSex] = useState('');
  const [filterAgeFrom, setFilterAgeFrom] = useState('');
  const [filterAgeTo, setFilterAgeTo] = useState('');
  const [filterHomeCity, setFilterHomeCity] = useState('');
  const [filterHomeRegion, setFilterHomeRegion] = useState('');
  const [filterHomeCountry, setFilterHomeCountry] = useState('');

  const loadPatients = useCallback(() => {
    apiClient.get('/doctor/patients').then((res) => setPatients(res.data.data));
  }, []);

  useEffect(() => {
    loadPatients();
    getMeasurementTypes().then(setTypes).catch(() => {});
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

  useEffect(() => { loadSavedConfigs(); }, [loadSavedConfigs]);

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
      setConfigErr(err.response?.data?.error || 'Failed to save');
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
    } catch { setChartData([]); }
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

  useEffect(() => {
    if (!selectedPatient || viewMode !== 'individual') return;
    apiClient.get(`/doctor/patients/${selectedPatient}/measurements`, { params: { limit: '10' } })
      .then((res) => setMeasurements(res.data.data))
      .catch(() => setMeasurements([]));
    loadNotes();
  }, [selectedPatient, viewMode, loadNotes]);

  const toggleField = (key: string) => {
    setSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  };

  const renderChart = () => {
    if (loading) return <p className="text-gray-500 text-center py-12">Loading chart...</p>;
    if (!chartData.length) return <p className="text-gray-500 text-center py-12">No data available</p>;

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
      <h1 className="text-2xl font-bold">Doctor Dashboard</h1>

      <div className="flex gap-4">
        <div className="w-64 shrink-0 space-y-1">
          {patients.length === 0 && <p className="text-sm text-gray-500">No patients assigned</p>}

          {/* Add patient */}
          <div className="bg-white border rounded p-2 mb-2">
            <p className="text-xs font-medium text-gray-600 mb-1">Add Patient</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              setAddMsg(''); setAddError('');
              apiClient.post('/doctor/patients', { email: addEmail })
                .then(() => { setAddEmail(''); setAddMsg('Patient added'); loadPatients(); })
                .catch((err) => setAddError(err.response?.data?.error || 'Failed to add patient'));
            }} className="flex gap-1">
              <input
                type="email" value={addEmail} placeholder="patient@email.com"
                onChange={(e) => setAddEmail(e.target.value)} required
                className="flex-1 border rounded px-2 py-1 text-xs"
              />
              <button type="submit" className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700">Add</button>
            </form>
            {addMsg && <p className="text-xs text-green-600 mt-1">{addMsg}</p>}
            {addError && <p className="text-xs text-red-600 mt-1">{addError}</p>}
          </div>

          <button
            onClick={() => { setViewMode('aggregated'); setSelectedPatient(null); setSelectedFields([]); setChartData([]); }}
            className={`w-full text-left px-3 py-2 rounded text-sm ${
              viewMode === 'aggregated' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100'
            }`}
          >
            All Patients (Aggregated)
          </button>
          <div className="border-t pt-1 mt-1">
            <p className="text-xs text-gray-400 px-3 mb-1">Individual Patients</p>
            {patients.map((p) => (
              <div key={p._id} className={`flex items-center px-3 py-1.5 rounded text-sm ${
                selectedPatient === p._id && viewMode === 'individual'
                  ? 'bg-blue-50 text-blue-700 font-medium' : ''
              }`}>
                <div className="flex-1 truncate cursor-pointer" onClick={() => { setSelectedPatient(p._id); setViewMode('individual'); setSelectedFields([]); setChartData([]); }}>
                  <span className="font-medium">{p.name}</span>
                  {p.sex && <span className="text-xs text-gray-400 ml-1">({p.sex})</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleNotify(p._id, p.notifyOnNewMeasurement); }}
                    className={`text-xs px-1.5 py-0.5 rounded ${p.notifyOnNewMeasurement ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    title={p.notifyOnNewMeasurement ? 'Notifications on' : 'Notifications off'}
                  >
                    {p.notifyOnNewMeasurement ? 'ON' : 'OFF'}
                  </button>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {p.status === 'active' ? 'active' : 'inactive'}
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
              <span>Recent Activity (last 24h)</span>
              <button onClick={(e) => { e.preventDefault(); loadRecentActivity(); }} className="text-xs text-blue-600 hover:underline">
                {activityLoading ? '...' : 'Refresh'}
              </button>
            </summary>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-gray-400 mt-2">No recent activity</p>
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

          {viewMode === 'aggregated' && (
            <details className="bg-white p-4 rounded-lg shadow-sm border">
              <summary className="cursor-pointer text-sm font-medium text-gray-700">Patient Filters</summary>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                <div>
                  <label className="block text-xs text-gray-500">Sex</label>
                  <select value={filterSex} onChange={(e) => setFilterSex(e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                    <option value="">All</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Age from</label>
                  <input type="number" value={filterAgeFrom} onChange={(e) => setFilterAgeFrom(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Age to</label>
                  <input type="number" value={filterAgeTo} onChange={(e) => setFilterAgeTo(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Home City</label>
                  <input value={filterHomeCity} onChange={(e) => setFilterHomeCity(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Home Region</label>
                  <input value={filterHomeRegion} onChange={(e) => setFilterHomeRegion(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Home Country</label>
                  <input value={filterHomeCountry} onChange={(e) => setFilterHomeCountry(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
                </div>
              </div>
            </details>
          )}

          {viewMode === 'individual' && !selectedPatient && (
            <p className="text-gray-500 text-center py-12 bg-white rounded-lg border">
              Select a patient from the left panel
            </p>
          )}

          {(selectedPatient || viewMode === 'aggregated') && (
            <>
              <div className="bg-white p-4 rounded-lg shadow-sm border space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500">Measurement Type</label>
                    <select value={selectedType} onChange={(e) => { setSelectedType(e.target.value); setSelectedFields([]); }}
                      className="w-full border rounded px-2 py-1.5 text-sm">
                      <option value="">Select...</option>
                      {types.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Time Grouping</label>
                    <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as TimeGroupBy)}
                      className="w-full border rounded px-2 py-1.5 text-sm">
                      <option value="hour">Hour</option>
                      <option value="day">Day</option>
                      <option value="week">Week</option>
                      <option value="month">Month</option>
                      <option value="year">Year</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Aggregation</label>
                    <select value={aggregation} onChange={(e) => setAggregation(e.target.value as AggregationFunction)}
                      className="w-full border rounded px-2 py-1.5 text-sm">
                      <option value="avg">Average</option>
                      <option value="min">Minimum</option>
                      <option value="max">Maximum</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Chart Type</label>
                    <select value={chartType} onChange={(e) => setChartType(e.target.value as ChartType)}
                      className="w-full border rounded px-2 py-1.5 text-sm">
                      <option value="line">Line</option>
                      <option value="area">Area</option>
                      <option value="bar">Bar</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button onClick={loadChart} className="w-full bg-blue-600 text-white py-1.5 rounded text-sm hover:bg-blue-700">
                      Refresh Chart
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
                    <span className="text-xs font-medium text-gray-600">Saved Configs:</span>
                    <select value={selectedConfigId} onChange={(e) => handleLoadConfig(e.target.value)}
                      className="border rounded px-2 py-1 text-xs min-w-[140px]">
                      <option value="">— Select —</option>
                      {savedConfigs.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1">
                      <input value={configName} placeholder="Save as..."
                        onChange={(e) => setConfigName(e.target.value)}
                        className="border rounded px-2 py-1 text-xs w-32"
                      />
                      <button onClick={handleSaveConfig} className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700">
                        Save
                      </button>
                    </div>
                    {selectedConfigId && (
                      <button onClick={(e) => handleDeleteConfig(e, selectedConfigId)}
                        className="text-red-600 border border-red-300 px-2 py-1 rounded text-xs hover:bg-red-50">
                        Delete
                      </button>
                    )}
                    {configMsg && <span className="text-xs text-green-600">{configMsg}</span>}
                    {configErr && <span className="text-xs text-red-600">{configErr}</span>}
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border">
                {renderChart()}
              </div>
            </>
          )}

          {viewMode === 'individual' && selectedPatient && (
            <>
              <div className="flex gap-2 items-center bg-white px-4 py-2 rounded-lg shadow-sm border flex-wrap">
                <span className="text-sm font-medium">{selectedPatientData?.name}</span>
                {selectedPatientData?.status === 'inactive' && (
                  <button onClick={() => apiClient.patch(`/doctor/patients/${selectedPatient}`, { status: 'active' }).then(loadPatients)} className="text-xs bg-green-600 text-white px-2 py-0.5 rounded hover:bg-green-700">Reactivate</button>
                )}
                {selectedPatientData?.status === 'active' && (
                  <button onClick={() => apiClient.patch(`/doctor/patients/${selectedPatient}`, { status: 'inactive' }).then(loadPatients)} className="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded hover:bg-yellow-700">Deactivate</button>
                )}
                <button onClick={() => {
                  setEditName(selectedPatientData?.name || '');
                  setEditEmail(selectedPatientData?.email || '');
                  setEditBirthDate(selectedPatientData?.birthDate?.split('T')[0] || '');
                  setEditSex(selectedPatientData?.sex || '');
                  setEditMsg(''); setEditErr('');
                  setShowEditPatient(true);
                }} className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700">Edit</button>
                <button onClick={async () => {
                  if (!window.confirm('Remove this patient from your list?')) return;
                  await apiClient.delete(`/doctor/patients/${selectedPatient}`);
                  setSelectedPatient(null);
                  loadPatients();
                }} className="text-xs bg-red-600 text-white px-2 py-0.5 rounded hover:bg-red-700 ml-auto">Remove</button>
              </div>

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
                      <label className="block text-xs text-gray-500">Birth Date</label>
                      <input type="date" value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Sex</label>
                      <select value={editSex} onChange={(e) => setEditSex(e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                        <option value="">Not specified</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">Save</button>
                    <button onClick={() => setShowEditPatient(false)} className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400">Cancel</button>
                  </div>
                  {editMsg && <p className="text-xs text-green-600">{editMsg}</p>}
                  {editErr && <p className="text-xs text-red-600">{editErr}</p>}
                </form>
              )}

              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-4 py-3 border-b font-medium text-sm flex items-center justify-between">
                  <span>Recent Measurements — {selectedPatientData?.name}</span>
                  <button onClick={handleDeletePatientMeasurements} className="text-xs text-red-600 border border-red-300 px-2 py-0.5 rounded hover:bg-red-50">
                    Delete All
                  </button>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs text-gray-500">Type</th>
                      <th className="text-left px-4 py-2 text-xs text-gray-500">Values</th>
                      <th className="text-left px-4 py-2 text-xs text-gray-500">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {measurements.map((m) => (
                      <tr key={m._id}>
                        <td className="px-4 py-2">{m.type}</td>
                        <td className="px-4 py-2 text-gray-600">{JSON.stringify(m.values)}</td>
                        <td className="px-4 py-2 text-gray-500">{new Date(m.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                    {measurements.length === 0 && <tr><td colSpan={3} className="text-center py-6 text-gray-500">No measurements</td></tr>}
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-4 py-3 border-b font-medium text-sm">Clinical Notes</div>
                <div className="p-4 space-y-3">
                  <form onSubmit={async (e) => {
                    e.preventDefault(); if (!newNote.trim()) return;
                    setNoteMsg('');
                    try {
                      await apiClient.post(`/doctor/patients/${selectedPatient}/notes`, {
                        content: newNote,
                        showToPatient: shareWithPatient,
                        notifyPatient: notifyViaEmail && shareWithPatient,
                      });
                      setNewNote(''); setShareWithPatient(false); setNotifyViaEmail(false);
                      setNoteMsg('Note added'); loadNotes();
                    } catch {}
                  }} className="space-y-2">
                    <div className="flex gap-2">
                      <input value={newNote} onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Write a note..." className="flex-1 border rounded px-3 py-2 text-sm" />
                      <button type="submit" className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700">Add</button>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={shareWithPatient}
                          onChange={(e) => { setShareWithPatient(e.target.checked); if (!e.target.checked) setNotifyViaEmail(false); }} />
                        Show to patient
                      </label>
                      <label className={`flex items-center gap-1 cursor-pointer ${!shareWithPatient ? 'opacity-50' : ''}`}>
                        <input type="checkbox" checked={notifyViaEmail}
                          disabled={!shareWithPatient}
                          onChange={(e) => setNotifyViaEmail(e.target.checked)} />
                        Send email notification
                      </label>
                    </div>
                  </form>
                  {noteMsg && <p className="text-xs text-green-600">{noteMsg}</p>}
                  {notes.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No notes yet</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {notes.map((n) => (
                        <div key={n._id} className="border-l-2 border-blue-300 pl-3 py-1">
                          <div className="flex items-start gap-2">
                            <p className="text-sm flex-1">{n.content}</p>
                            <div className="flex gap-1 shrink-0">
                              {n.showToPatient && <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Shared</span>}
                              {n.patientNotified && <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Emailed</span>}
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{n.doctorName || 'Doctor'} · {new Date(n.createdAt).toLocaleString()}</p>
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
