import { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { getMeasurementTypes } from '../api/measurementTypes';
import { getTimeSeries } from '../api/measurements';
import { useAuth } from '../context/AuthContext';
import type { IMeasurementTypeConfig, TimeSeriesPoint, TimeGroupBy, ChartType, AggregationFunction, IPatientNote, IAnamnesis } from '@healthbridge/shared';

function formatDate(value: string) {
  try {
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

  useEffect(() => {
    getMeasurementTypes().then(setTypes).catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.role === 'patient') {
      import('../api/note').then((mod) => mod.getMyNotes().then(setNotes).catch(() => {}));
      import('../api/anamnesis').then((mod) => mod.getMyAnamnesis().then(setAnamnesis).catch(() => {}));
    }
  }, [user?.role]);

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
                  generalhealth: 'General Health',
                  cardiac: 'Cardiac',
                  blood_gas: 'Blood / Gas',
                  lipidemia: 'Lipid Profile',
                  renal: 'Renal Function',
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

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        {loading ? (
          <p className="text-gray-500 text-center py-12">Loading chart...</p>
        ) : selectedType ? (
          renderChart()
        ) : (
          <p className="text-gray-500 text-center py-12">
            Select a measurement type to view chart
          </p>
        )}
      </div>

      {anamnesis.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-4 py-3 border-b font-medium text-sm">Your Anamnesis (Medical History)</div>
          <div className="divide-y">
            {anamnesis.map((a) => (
              <div key={a._id} className="px-4 py-3 border-l-2 border-purple-300 ml-4 mr-4 my-2">
                <p className="text-xs text-gray-400">Recorded: {new Date(a.recordedAt).toLocaleString()}</p>
                <div className="mt-1">
                  <p className="text-xs font-medium text-gray-600">Pathologies</p>
                  <p className="text-sm whitespace-pre-wrap">{a.pathologies}</p>
                </div>
                <div className="mt-1">
                  <p className="text-xs font-medium text-gray-600">Therapies</p>
                  <p className="text-sm whitespace-pre-wrap">{a.therapies}</p>
                </div>
                {a.notes && (
                  <div className="mt-1">
                    <p className="text-xs font-medium text-gray-600">Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{a.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {notes.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-4 py-3 border-b font-medium text-sm">Notes from your doctor</div>
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
