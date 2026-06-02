import { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { getMeasurementTypes } from '../api/measurementTypes';
import { getTimeSeries } from '../api/measurements';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import type { IMeasurementTypeConfig, TimeSeriesPoint, TimeGroupBy, ChartType, AggregationFunction, IPatientNote, IAnamnesis, IPrescription, UserRole } from '@healthbridge/shared';

function formatDate(value: string) {
  try {
    const hasTime = value.includes('T');
    if (!hasTime) {
      return new Date(value + 'T12:00:00Z').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return value; }
}

export function Dashboard() {
  const { user } = useAuth();
  const [types, setTypes] = useState<IMeasurementTypeConfig[]>([]);
  const [selectedType, setSelectedType] = useState('');
  const [groupBy, setGroupBy] = useState<TimeGroupBy>('day');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [aggregation, setAggregation] = useState<AggregationFunction>('avg');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [data, setData] = useState<TimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<IPatientNote[]>([]);
  const [anamnesis, setAnamnesis] = useState<IAnamnesis[]>([]);

  // My Medications
  const [medications, setMedications] = useState<IPrescription[]>([]);
  const [dueMeds, setDueMeds] = useState<any[]>([]);
  const [takingId, setTakingId] = useState<string | null>(null);
  const [medMsg, setMedMsg] = useState('');

  // My doctors
  const [myDoctors, setMyDoctors] = useState<any[]>([]);
  const [sharingDoctorId, setSharingDoctorId] = useState<string | null>(null);
  const [sharingTypes, setSharingTypes] = useState<string[]>([]);
  const [sharingMsg, setSharingMsg] = useState('');

  useEffect(() => {
    getMeasurementTypes().then(setTypes).catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.role === 'patient') {
      import('../api/note').then((mod) => mod.getMyNotes().then(setNotes).catch(() => {}));
      import('../api/anamnesis').then((mod) => mod.getMyAnamnesis().then(setAnamnesis).catch(() => {}));
      apiClient.get('/patient/doctors').then((res) => setMyDoctors(res.data.data)).catch(() => {});
      apiClient.get('/patient/medications').then((res) => setMedications(res.data.data)).catch(() => {});
      apiClient.get('/patient/medications/due').then((res) => setDueMeds(res.data.data)).catch(() => {});
    }
  }, [user?.role]);

  useEffect(() => {
    if (user?.role !== 'patient') return;
    const interval = setInterval(() => {
      apiClient.get('/patient/medications/due').then((res) => setDueMeds(res.data.data)).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [user?.role]);

  const handleTake = async (id: string, scheduledTime: string) => {
    setTakingId(id); setMedMsg('');
    try {
      await apiClient.post(`/patient/medications/${id}/take`, { scheduledTime });
      setMedMsg('Assunzione registrata');
      setDueMeds((prev) => prev.filter((d) => d.prescriptionId !== id || d.scheduledTime !== scheduledTime));
    } catch { setMedMsg('Errore registrazione'); }
    setTakingId(null);
  };

  const handleConfirmDoctor = async (doctorId: string) => {
    try {
      await apiClient.post(`/patient/doctors/${doctorId}/confirm`);
      setMyDoctors((prev) =>
        prev.map((d) => (d._id === doctorId ? { ...d, status: 'active' } : d))
      );
    } catch {}
  };

  const handleRejectDoctor = async (doctorId: string) => {
    try {
      await apiClient.delete(`/patient/doctors/${doctorId}/reject`);
      setMyDoctors((prev) => prev.filter((d) => d._id !== doctorId));
    } catch {}
  };

  const openSharing = async (doctorId: string) => {
    setSharingMsg('');
    try {
      const res = await apiClient.get(`/patient/doctors/${doctorId}/sharing`);
      setSharingTypes(res.data.data?.types || ['*']);
      setSharingDoctorId(doctorId);
    } catch { setSharingDoctorId(doctorId); setSharingTypes(['*']); }
  };

  const toggleSharingType = (key: string) => {
    setSharingTypes((prev) => {
      if (prev.includes('*')) return [key];
      if (prev.includes(key)) return prev.filter((t) => t !== key);
      return [...prev, key];
    });
  };

  const saveSharing = async () => {
    if (!sharingDoctorId) return;
    setSharingMsg('');
    try {
      await apiClient.put(`/patient/doctors/${sharingDoctorId}/sharing`, { types: sharingTypes });
      setSharingMsg('Sharing updated');
    } catch (err: any) {
      setSharingMsg(err.response?.data?.error || 'Failed to update');
    }
  };

  useEffect(() => {
    if (!selectedType) return;
    setLoading(true);
    getTimeSeries({ type: selectedType, groupBy, aggregation, fields: selectedFields.join(',') })
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedType, groupBy, selectedFields]);

  const currentType = types.find((t) => t.key === selectedType);

  const toggleField = (key: string) => {
    setSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  };

  const renderChart = () => {
    if (!data.length) {
      return <p className="text-gray-500 text-center py-12">No data available</p>;
    }

    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

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
            const lineProps = {
              key: field,
              type: 'monotone' as const,
              dataKey: `values.${field}`,
              name: currentType?.fields.find((f) => f.key === field)?.name || field,
              stroke: colors[i % colors.length],
              fill: colors[i % colors.length],
            };
            if (chartType === 'area') return <Area {...lineProps} />;
            if (chartType === 'bar') return <Bar {...lineProps} />;
            return <Line {...lineProps} />;
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
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Measurement Type</label>
            <select
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value); setSelectedFields([]); }}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Select type...</option>
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
            <label className="block text-sm font-medium mb-1">Time Grouping</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as TimeGroupBy)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="hour">Hour</option>
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Aggregation</label>
            <select
              value={aggregation}
              onChange={(e) => setAggregation(e.target.value as AggregationFunction)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="avg">Average</option>
              <option value="min">Minimum</option>
              <option value="max">Maximum</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Chart Type</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as ChartType)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="line">Line</option>
              <option value="area">Area</option>
              <option value="bar">Bar</option>
            </select>
          </div>
        </div>

        {currentType && (
          <div>
            <label className="block text-sm font-medium mb-2">Fields (Y-axis)</label>
            <div className="flex flex-wrap gap-2">
              {currentType.fields.map((field) => (
                <label key={field.key} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(field.key)}
                    onChange={() => toggleField(field.key)}
                  />
                  {field.name} ({field.unit})
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div id="patient-chart-section" className="bg-white p-6 rounded-lg shadow-sm border">
        {loading ? (
          <p className="text-gray-500 text-center py-12">Caricamento grafico...</p>
        ) : selectedType ? (
          renderChart()
        ) : (
          <p className="text-gray-500 text-center py-12">
            Seleziona un tipo per visualizzare il grafico
          </p>
        )}
      </div>

      {myDoctors.length > 0 && (
        <div id="patient-my-doctors" className="bg-white rounded-lg shadow-sm border">
          <div className="px-4 py-3 border-b font-medium text-sm">I Miei Dottori</div>
          <div className="divide-y">
            {myDoctors.map((d: any) => (
              <div key={d._id}>
                <div className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-gray-500">{d.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      d.status === 'active' ? 'bg-green-100 text-green-700' :
                      d.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>{d.status}</span>
                    {d.status === 'active' && (
                      <button onClick={() => openSharing(d._id)}
                        className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded hover:bg-purple-700">
                        Sharing
                      </button>
                    )}
                    {d.status === 'pending' && (
                      <>
                        <button onClick={() => handleConfirmDoctor(d._id)}
                          className="text-xs bg-green-600 text-white px-2 py-0.5 rounded hover:bg-green-700">
                          Confirm
                        </button>
                        <button onClick={() => handleRejectDoctor(d._id)}
                          className="text-xs bg-red-600 text-white px-2 py-0.5 rounded hover:bg-red-700">
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {/* Sharing modal inline */}
                {sharingDoctorId === d._id && (
                  <div className="px-4 pb-3 border-t pt-2 space-y-2">
                    <p className="text-xs font-medium text-gray-600">
                      Measurement types shared with {d.name}:
                    </p>
                    {sharingTypes.includes('*') ? (
                      <p className="text-xs text-green-600">All types currently visible</p>
                    ) : (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {sharingTypes.map((t: string) => (
                          <span key={t} className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{t}</span>
                        ))}
                      </div>
                    )}
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-500 hover:text-gray-700">Toggle types</summary>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {types.map((t) => (
                          <label key={t.key} className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sharingTypes.includes('*') || sharingTypes.includes(t.key)}
                              disabled={sharingTypes.includes('*')}
                              onChange={() => toggleSharingType(t.key)}
                            />
                            <span>{t.name}</span>
                          </label>
                        ))}
                      </div>
                    </details>
                    <div className="flex gap-2 items-center">
                      <button onClick={saveSharing}
                        className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs hover:bg-blue-700">
                        Save
                      </button>
                      <button onClick={() => setSharingDoctorId(null)}
                        className="bg-gray-300 text-gray-700 px-2 py-0.5 rounded text-xs hover:bg-gray-400">
                        Close
                      </button>
                      {sharingMsg && <span className="text-xs text-green-600">{sharingMsg}</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {medications.length > 0 && (
        <div id="patient-medications-section" className="bg-white rounded-lg shadow-sm border">
          <div className="px-4 py-3 border-b font-medium text-sm">I Miei Farmaci</div>
          <div className="p-4">
            {dueMeds.length > 0 && (
              <div className="mb-3 space-y-2">
                <p className="text-xs font-medium text-orange-600">Da assumere ora:</p>
                {dueMeds.map((d, i) => (
                  <div key={i} className="bg-orange-50 border border-orange-200 rounded p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{d.drugName} {d.dosage}</p>
                      <p className="text-xs text-gray-500">{d.frequency} — Via: {d.route}</p>
                    </div>
                    <button onClick={() => handleTake(d.prescriptionId, d.scheduledTime)}
                      disabled={takingId === d.prescriptionId}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50">
                      {takingId === d.prescriptionId ? '...' : 'Preso'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {medMsg && <p className="text-xs text-green-600 mb-2">{medMsg}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {medications.map((m) => (
                <div key={m._id} className="border rounded p-3 bg-gray-50">
                  <p className="text-sm font-semibold">{m.drugName} <span className="font-normal text-gray-500">{m.dosage}</span></p>
                  <p className="text-xs text-gray-500">{m.frequency} — {m.route}</p>
                  {m.schedule.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">Orari: {m.schedule.map((s) => s.time).join(', ')}</p>
                  )}
                  {m.notes && <p className="text-xs text-gray-400 mt-1">{m.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {anamnesis.length > 0 && (
        <div id="patient-anamnesis-section" className="bg-white rounded-lg shadow-sm border">
          <div className="px-4 py-3 border-b font-medium text-sm">La Mia Anamnesi</div>
          <div className="divide-y">
              {anamnesis.map((a) => {
                const sections = [
                  { key: 'fisiologica', label: 'Fisiologica', color: 'border-blue-300' },
                  { key: 'familiare', label: 'Familiare', color: 'border-green-300' },
                  { key: 'farmacologica', label: 'Farmacologica', color: 'border-purple-300' },
                  { key: 'patologicaRemota', label: 'Patologica Remota', color: 'border-orange-300' },
                  { key: 'patologicaProssima', label: 'Patologica Prossima', color: 'border-red-300' },
                  { key: 'sociale', label: 'Sociale', color: 'border-teal-300' },
                ];
                return (
                <div key={a._id} className="px-4 py-3 border-l-2 border-purple-300 ml-4 mr-4 my-2">
                  <p className="text-xs text-gray-400">Registrata: {new Date(a.recordedAt).toLocaleString()}</p>
                    {sections.map((s) => {
                      const section = (a as any)[s.key];
                      if (!section?.entries?.length) return null;
                      return (
                        <div key={s.key} className={`mt-2 border-l-2 ${s.color} pl-2`}>
                          <p className="text-xs font-semibold text-gray-600">{s.label}</p>
                          {section.entries.map((entry: any, i: number) => {
                            if (typeof entry === 'object' && entry.text !== undefined) {
                              return (
                                <p key={i} className="text-sm whitespace-pre-wrap flex items-center gap-1">
                                  <span>• {entry.text}</span>
                                  <span className={`text-xs px-1 py-0.5 rounded font-medium ${
                                    entry.isCurrent
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {entry.isCurrent ? 'Attuale' : 'Precedente'}
                                  </span>
                                </p>
                              );
                            }
                            return <p key={i} className="text-sm whitespace-pre-wrap">• {entry}</p>;
                          })}
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
        </div>
      )}

      {notes.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-4 py-3 border-b font-medium text-sm">Note dal tuo medico</div>
          <div className="divide-y">
            {notes.map((n) => (
              <div key={n._id} className="px-4 py-3 border-l-2 border-green-300 ml-4 mr-4 my-2">
                <p className="text-sm">{n.content}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {n.doctorName || 'Doctor'} · {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
