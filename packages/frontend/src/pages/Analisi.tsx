import { useState, useEffect, useCallback } from 'react';
import { getMeasurementTypes } from '../api/measurementTypes';
import { getChartConfigs, createChartConfig, deleteChartConfig } from '../api/chartConfigs';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { MultiTypeChart, type SeriesDefinition, type KpiBand } from '../components/MultiTypeChart';
import type {
  IMeasurementTypeConfig, IChartConfig, CreateChartConfigRequest, TimeGroupBy, ChartType,
  AggregationFunction, ScopeMode, CompareView, TrendMethod, TimeSeriesPoint,
} from '@healthbridge/shared';

const TYPE_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#0891b2', '#f97316', '#ec4899', '#14b8a6', '#8b5cf6'];
const PATIENT_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#0891b2'];

const labels: Record<string, string> = {
  generalhealth: 'Salute Generale',
  cardiac: 'Cardiaco',
  blood_gas: 'Sangue / Gas',
  lipidemia: 'Profilo Lipidico',
  renal: 'Funzione Renale',
};

function formatDate(value: string) {
  try {
    const hasTime = value.includes('T');
    if (!hasTime) {
      return new Date(value + 'T12:00:00Z').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return value; }
}

function toInputDate(iso: string) {
  try { return new Date(iso).toISOString().split('T')[0]; } catch { return ''; }
}

export function Analisi() {
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';
  const isAnalyst = user?.role === 'analyst';

  // Types
  const [types, setTypes] = useState<IMeasurementTypeConfig[]>([]);

  // Patients (doctor only)
  const [patients, setPatients] = useState<any[]>([]);

  // Scope
  const [scopeMode, setScopeMode] = useState<ScopeMode>(isDoctor ? 'single' : 'aggregated');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [compareView, setCompareView] = useState<CompareView>('overlaid');

  // Selected types with per-type aggregation
  const [selectedTypes, setSelectedTypes] = useState<Record<string, boolean>>({});
  const [typeAggregations, setTypeAggregations] = useState<Record<string, AggregationFunction>>({});

  // Controls
  const [groupBy, setGroupBy] = useState<TimeGroupBy>('day');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [showKpi, setShowKpi] = useState(true);
  const [showTrend, setShowTrend] = useState(false);
  const [trendMethod, setTrendMethod] = useState<TrendMethod>('sma');
  const [trendWindow, setTrendWindow] = useState(5);
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  // Chart data
  const [chartData, setChartData] = useState<Record<string, any>[]>([]);
  const [series, setSeries] = useState<SeriesDefinition[]>([]);
  const [kpiBands, setKpiBands] = useState<KpiBand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Saved configs
  const [savedConfigs, setSavedConfigs] = useState<IChartConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState('');
  const [configName, setConfigName] = useState('');
  const [configMsg, setConfigMsg] = useState('');
  const [configErr, setConfigErr] = useState('');

  // Load initial data
  useEffect(() => {
    getMeasurementTypes().then(setTypes).catch(() => {});
    if (isDoctor) {
      apiClient.get('/doctor/patients').then((res) => {
        const pts = res.data.data || [];
        setPatients(pts);
        // Set default type aggregations
        const aggs: Record<string, AggregationFunction> = {};
        types.forEach((t) => { aggs[t.key] = 'avg'; });
        setTypeAggregations(aggs);
      }).catch(() => {});
      getChartConfigs().then((cfgs) => {
        setSavedConfigs(cfgs);
        const aggs: Record<string, AggregationFunction> = {};
        cfgs.forEach((cfg) => {
          if (cfg.typeAggregations) Object.assign(aggs, cfg.typeAggregations);
        });
        if (Object.keys(aggs).length) setTypeAggregations((prev) => ({ ...prev, ...aggs }));
      }).catch(() => {});
    }
    if (isAnalyst) {
      getChartConfigs().then(setSavedConfigs).catch(() => {});
      const aggs: Record<string, AggregationFunction> = {};
      types.forEach((t) => { aggs[t.key] = 'avg'; });
      setTypeAggregations(aggs);
    }
  }, [isDoctor, isAnalyst]);

  // Apply saved config
  const applyConfig = useCallback((cfg: IChartConfig) => {
    if (cfg.scopeMode && isDoctor) setScopeMode(cfg.scopeMode);
    if (cfg.patientIds && isDoctor) {
      if (cfg.scopeMode === 'single') setSelectedPatient(cfg.patientIds[0] || '');
      if (cfg.scopeMode === 'compare') setSelectedPatients(cfg.patientIds);
    }
    if (cfg.types) {
      const sel: Record<string, boolean> = {};
      cfg.types.forEach((t) => { sel[t] = true; });
      setSelectedTypes(sel);
    }
    if (cfg.typeAggregations) setTypeAggregations(cfg.typeAggregations);
    if (cfg.groupBy) setGroupBy(cfg.groupBy);
    if (cfg.chartType) setChartType(cfg.chartType);
    if (cfg.showKpi != null) setShowKpi(cfg.showKpi);
    if (cfg.showTrend != null) setShowTrend(cfg.showTrend);
    if (cfg.trendMethod) setTrendMethod(cfg.trendMethod);
    if (cfg.trendWindow) setTrendWindow(cfg.trendWindow);
    if (cfg.compareView) setCompareView(cfg.compareView);
    if (cfg.dateRange?.from) setDateFrom(toInputDate(cfg.dateRange.from));
    if (cfg.dateRange?.to) setDateTo(toInputDate(cfg.dateRange.to));
  }, [isDoctor]);

  // Load chart data
  const loadData = useCallback(async () => {
    const activeTypes = types.filter((t) => selectedTypes[t.key]);
    if (!activeTypes.length) { setError('Seleziona almeno un tipo misurazione'); return; }
    setError('');
    setLoading(true);

    try {
      const from = dateFrom ? new Date(dateFrom).toISOString() : undefined;
      const to = dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : undefined;

      interface FetchItem { type: string; data: TimeSeriesPoint[]; prefix: string; }
      const fetches: Promise<FetchItem>[] = [];

      if (scopeMode === 'single' && selectedPatient) {
        for (const t of activeTypes) {
          const agg = typeAggregations[t.key] || 'avg';
          const fields = t.fields.map((f) => f.key);
          const params: Record<string, string> = { type: t.key, groupBy, aggregation: agg, fields: fields.join(',') };
          if (from) params.from = from;
          if (to) params.to = to;
          fetches.push(
            apiClient.get(`/doctor/patients/${selectedPatient}/timeseries`, { params })
              .then((res) => ({ type: t.key, data: res.data.data || [], prefix: t.key }))
          );
        }
      } else if (scopeMode === 'compare' && selectedPatients.length >= 2) {
        for (const pid of selectedPatients) {
          const p = patients.find((pt) => pt._id === pid);
          const name = p?.name?.replace(/\s+/g, '_') || pid;
          for (const t of activeTypes) {
            const agg = typeAggregations[t.key] || 'avg';
            const fields = t.fields.map((f) => f.key);
            const params: Record<string, string> = { type: t.key, groupBy, aggregation: agg, fields: fields.join(',') };
            if (from) params.from = from;
            if (to) params.to = to;
            fetches.push(
              apiClient.get(`/doctor/patients/${pid}/timeseries`, { params })
                .then((res) => ({ type: t.key, data: res.data.data || [], prefix: `${name}__${t.key}` }))
            );
          }
        }
      } else if (scopeMode === 'aggregated') {
        const endpoint = isDoctor ? '/doctor/timeseries' : '/analyst/timeseries';
        for (const t of activeTypes) {
          const agg = typeAggregations[t.key] || 'avg';
          const fields = t.fields.map((f) => f.key);
          const params: Record<string, string> = { type: t.key, groupBy, aggregation: agg, fields: fields.join(',') };
          if (from) params.from = from;
          if (to) params.to = to;
          fetches.push(
            apiClient.get(endpoint, { params })
              .then((res) => ({ type: t.key, data: res.data.data || [], prefix: t.key }))
          );
        }
      } else {
        setError('Configura la selezione pazienti');
        setLoading(false);
        return;
      }

      const results = await Promise.all(fetches);

      // Merge by timestamp
      const byTs: Record<string, Record<string, any>> = {};
      for (const r of results) {
        for (const pt of r.data) {
          if (!byTs[pt.timestamp]) byTs[pt.timestamp] = { timestamp: pt.timestamp };
          for (const [k, v] of Object.entries(pt.values)) {
            byTs[pt.timestamp][`${r.prefix}__${k}`] = v;
          }
        }
      }
      const merged = Object.values(byTs).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      setChartData(merged);

      // Build series definitions
      const newSeries: SeriesDefinition[] = [];
      const newKpiBands: KpiBand[] = [];
      let colorIdx = 0;

      if (scopeMode === 'single') {
        for (const t of activeTypes) {
          const agg = typeAggregations[t.key] || 'avg';
          for (const f of t.fields) {
            const key = `${t.key}__${f.key}`;
            const color = TYPE_COLORS[colorIdx % TYPE_COLORS.length];
            newSeries.push({ key, label: `${t.name} — ${f.name} (${agg})`, color, unit: f.unit });
            // KPI bands
            const dMin = f.dangerMin ?? null;
            const aMin = f.alertMin ?? null;
            const aMax = f.alertMax ?? null;
            const dMax = f.dangerMax ?? null;
            if (dMin != null && aMin != null && dMin < aMin) {
              newKpiBands.push({ y1: dMin, y2: aMin, fill: '#eab308', fillOpacity: 0.12 });
            }
            if (aMin != null && aMax != null) {
              newKpiBands.push({ y1: aMin, y2: aMax, fill: '#22c55e', fillOpacity: 0.08 });
            }
            if (aMax != null && dMax != null && aMax < dMax) {
              newKpiBands.push({ y1: aMax, y2: dMax, fill: '#eab308', fillOpacity: 0.12 });
            }
            colorIdx++;
          }
        }
      } else {
        for (const r of results) {
          const typeCfg = types.find((t) => t.key === r.type);
          if (!typeCfg) continue;
          const agg = typeAggregations[r.type] || 'avg';
          for (const f of typeCfg.fields) {
            const key = `${r.prefix}__${f.key}`;
            const color = PATIENT_COLORS[colorIdx % PATIENT_COLORS.length];
            newSeries.push({ key, label: `${r.prefix} — ${f.name} (${agg})`, color, unit: f.unit });
            // KPI bands (same thresholds per type, regardless of patient)
            const dMin = f.dangerMin ?? null;
            const aMin = f.alertMin ?? null;
            const aMax = f.alertMax ?? null;
            const dMax = f.dangerMax ?? null;
            if (dMin != null && aMin != null && dMin < aMin) {
              newKpiBands.push({ y1: dMin, y2: aMin, fill: '#eab308', fillOpacity: 0.12 });
            }
            if (aMin != null && aMax != null) {
              newKpiBands.push({ y1: aMin, y2: aMax, fill: '#22c55e', fillOpacity: 0.08 });
            }
            if (aMax != null && dMax != null && aMax < dMax) {
              newKpiBands.push({ y1: aMax, y2: dMax, fill: '#eab308', fillOpacity: 0.12 });
            }
            colorIdx++;
          }
        }
      }
      setSeries(newSeries);
      setKpiBands(newKpiBands);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore caricamento dati');
    } finally {
      setLoading(false);
    }
  }, [types, selectedTypes, typeAggregations, scopeMode, selectedPatient, selectedPatients, groupBy, chartType, dateFrom, dateTo, patients, isDoctor]);

  // Toggle a measurement type
  const toggleType = (key: string) => {
    setSelectedTypes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Toggle patient selection (compare mode)
  const togglePatientCompare = (pid: string) => {
    setSelectedPatients((prev) =>
      prev.includes(pid) ? prev.filter((p) => p !== pid) : [...prev, pid]
    );
  };

  // Save config
  const handleSave = async () => {
    if (!configName.trim()) { setConfigErr('Inserisci un nome'); return; }
    setConfigMsg(''); setConfigErr('');
    try {
      const cfg: CreateChartConfigRequest = {
        name: configName.trim(),
        measurementType: types.find((t) => selectedTypes[t.key])?.key || types[0]?.key || '',
        groupBy,
        aggregation: 'avg' as AggregationFunction,
        fields: ['value'],
        chartType,
        dateRange: { from: dateFrom ? new Date(dateFrom).toISOString() : undefined, to: dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : undefined },
        types: Object.keys(selectedTypes).filter((k) => selectedTypes[k]),
        typeAggregations,
        showKpi,
        showTrend,
        trendMethod,
        trendWindow,
        scopeMode,
        compareView,
        patientIds: scopeMode === 'single' ? [selectedPatient] : scopeMode === 'compare' ? selectedPatients : undefined,
      };
      const created = await createChartConfig(cfg);
      setSavedConfigs((prev) => [...prev, created]);
      setConfigMsg('Configurazione salvata');
      setConfigName('');
    } catch (err: any) {
      setConfigErr(err.response?.data?.error || 'Errore salvataggio');
    }
  };

  const handleDeleteConfig = async () => {
    if (!selectedConfigId) return;
    try {
      await deleteChartConfig(selectedConfigId);
      setSavedConfigs((prev) => prev.filter((c) => c._id !== selectedConfigId));
      setSelectedConfigId('');
      setConfigMsg('Configurazione eliminata');
    } catch { setConfigErr('Errore eliminazione'); }
  };

  const handleLoadConfig = (id: string) => {
    const cfg = savedConfigs.find((c) => c._id === id);
    if (cfg) { applyConfig(cfg); setSelectedConfigId(id); }
  };

  // Get active types as array
  const activeTypes = types.filter((t) => selectedTypes[t.key]);
  const hasTypes = activeTypes.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      <h1 className="text-xl font-bold">Analisi</h1>

      {/* Scope selector (doctor only) */}
      {isDoctor && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <label className="text-sm font-medium text-gray-700 block mb-2">Modalità</label>
          <div className="flex gap-2 flex-wrap">
            {(['single', 'compare', 'aggregated'] as ScopeMode[]).map((mode) => (
              <button key={mode}
                onClick={() => { setScopeMode(mode); setError(''); }}
                className={`px-3 py-1.5 text-sm rounded border transition-colors ${scopeMode === mode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                {mode === 'single' ? 'Paziente Singolo' : mode === 'compare' ? 'Confronto Pazienti' : 'Aggregato'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Patient selection */}
      {isDoctor && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          {scopeMode === 'single' && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Seleziona Paziente</label>
              <select value={selectedPatient} onChange={(e) => { setSelectedPatient(e.target.value); setError(''); }}
                className="border rounded px-3 py-1.5 text-sm w-full max-w-md">
                <option value="">— Seleziona —</option>
                {patients.map((p) => (
                  <option key={p._id} value={p._id}>{p.name} ({p.email})</option>
                ))}
              </select>
            </div>
          )}
          {scopeMode === 'compare' && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Seleziona Pazienti da Confrontare (almeno 2)</label>
              <div className="flex flex-wrap gap-3">
                {patients.map((p, i) => (
                  <label key={p._id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="checkbox"
                      checked={selectedPatients.includes(p._id)}
                      onChange={() => togglePatientCompare(p._id)}
                      className="accent-blue-600" />
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: PATIENT_COLORS[i % PATIENT_COLORS.length] }} />
                    {p.name}
                  </label>
                ))}
              </div>
              {selectedPatients.length > 0 && (
                <div className="flex gap-2 mt-2">
                  <label className="text-xs text-gray-500">Visualizzazione:</label>
                  <select value={compareView} onChange={(e) => setCompareView(e.target.value as CompareView)}
                    className="text-xs border rounded px-2 py-1">
                    <option value="overlaid">Sovrapposto (stesso grafico)</option>
                    <option value="separate">Separato (un grafico per paziente)</option>
                  </select>
                </div>
              )}
            </div>
          )}
          {scopeMode === 'aggregated' && (
            <p className="text-sm text-gray-500">Vista aggregata di tutti i tuoi pazienti</p>
          )}
        </div>
      )}

      {isAnalyst && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-sm text-gray-500">Vista aggregata cross-pazienti</p>
        </div>
      )}

      {/* Measurement type selection */}
      <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
        <h2 className="text-sm font-medium text-gray-700">Tipi Misurazione</h2>
        {(() => {
          const groups = new Map<string, IMeasurementTypeConfig[]>();
          types.forEach((t) => {
            if (!groups.has(t.macrogroup)) groups.set(t.macrogroup, []);
            groups.get(t.macrogroup)!.push(t);
          });
          return Array.from(groups.entries()).map(([mg, groupTypes]) => (
            <details key={mg} className="text-sm" open>
              <summary className="cursor-pointer text-gray-600 hover:text-gray-800 font-medium mb-1">
                {labels[mg] || mg}
              </summary>
              <div className="flex flex-wrap gap-x-4 gap-y-2 pl-2">
                {groupTypes.map((t, i) => {
                  const color = TYPE_COLORS[i % TYPE_COLORS.length];
                  return (
                    <div key={t.key} className="flex items-center gap-2">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={!!selectedTypes[t.key]}
                          onChange={() => toggleType(t.key)} className="accent-blue-600" />
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
                        <span>{t.name}</span>
                      </label>
                      <select value={typeAggregations[t.key] || 'avg'}
                        onChange={(e) => setTypeAggregations((prev) => ({ ...prev, [t.key]: e.target.value as AggregationFunction }))}
                        className="text-xs border rounded px-1 py-0.5"
                        onClick={(e) => e.stopPropagation()}>
                        <option value="avg">Media</option>
                        <option value="min">Minimo</option>
                        <option value="max">Massimo</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </details>
          ));
        })()}
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Da</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="border rounded px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">A</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="border rounded px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Raggruppamento</label>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as TimeGroupBy)}
              className="border rounded px-2 py-1 text-sm">
              <option value="hour">Ora</option>
              <option value="day">Giorno</option>
              <option value="week">Settimana</option>
              <option value="month">Mese</option>
              <option value="year">Anno</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo Grafico</label>
            <select value={chartType} onChange={(e) => setChartType(e.target.value as ChartType)}
              className="border rounded px-2 py-1 text-sm">
              <option value="line">Linea</option>
              <option value="area">Area</option>
              <option value="bar">Barre</option>
            </select>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={showKpi} onChange={(e) => setShowKpi(e.target.checked)} className="accent-blue-600" />
              Mostra KPI
            </label>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={showTrend} onChange={(e) => setShowTrend(e.target.checked)} className="accent-blue-600" />
              Mostra Trend
            </label>
          </div>
          {showTrend && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Metodo</label>
                <select value={trendMethod} onChange={(e) => setTrendMethod(e.target.value as TrendMethod)}
                  className="border rounded px-2 py-1 text-sm">
                  <option value="sma">Media Mobile (SMA)</option>
                  <option value="linear">Regressione Lineare</option>
                </select>
              </div>
              {trendMethod === 'sma' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Finestra (punti)</label>
                  <input type="number" min={2} max={30} value={trendWindow}
                    onChange={(e) => setTrendWindow(Number(e.target.value))}
                    className="border rounded px-2 py-1 text-sm w-16" />
                </div>
              )}
            </>
          )}
          <button onClick={loadData}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Caricamento...' : 'Carica Dati'}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {/* Chart - overlaid */}
      {hasTypes && chartData.length > 0 && (scopeMode !== 'compare' || compareView === 'overlaid') && (
        <div id="chart-section" className="bg-white p-4 rounded-lg shadow-sm border">
          <MultiTypeChart
            data={chartData}
            series={series}
            chartType={chartType}
            showKpi={showKpi}
            kpiBands={kpiBands}
            showTrend={showTrend}
            trendMethod={trendMethod}
            trendWindow={trendWindow}
            loading={loading}
          />
        </div>
      )}

      {/* Charts - separate (one per patient in compare mode) */}
      {hasTypes && chartData.length > 0 && scopeMode === 'compare' && compareView === 'separate' && (
        <div className="space-y-6">
          {selectedPatients.map((pid) => {
            const p = patients.find((pt) => pt._id === pid);
            const name = p?.name?.replace(/\s+/g, '_') || pid;
            const prefix = `${name}__`;
            const patientSeries = series.filter((s) => s.key.startsWith(prefix));
            const patientData = chartData.filter((d) => patientSeries.some((s) => d[s.key] != null));
            if (!patientData.length) return null;
            return (
              <div key={pid} className="bg-white p-4 rounded-lg shadow-sm border">
                <h3 className="text-sm font-medium mb-2">{p?.name || pid}</h3>
                <MultiTypeChart
                  data={patientData}
                  series={patientSeries}
                  chartType={chartType}
                  showKpi={showKpi}
                  kpiBands={kpiBands}
                  showTrend={showTrend}
                  trendMethod={trendMethod}
                  trendWindow={trendWindow}
                  loading={false}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* No data placeholder */}
      {hasTypes && !loading && !chartData.length && !error && (
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-gray-500 text-center py-12">Nessun dato disponibile. Premi "Carica Dati" per generare il grafico.</p>
        </div>
      )}

      {/* Save/Load config */}
      <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
        <h2 className="text-sm font-medium text-gray-700">Configurazioni</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Carica</label>
            <select value={selectedConfigId} onChange={(e) => { handleLoadConfig(e.target.value); }}
              className="border rounded px-2 py-1 text-sm min-w-[200px]">
              <option value="">— Seleziona —</option>
              {savedConfigs.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          {selectedConfigId && (
            <button onClick={handleDeleteConfig} className="text-xs text-red-600 border border-red-300 px-2 py-1 rounded hover:bg-red-50 mt-4">
              Elimina
            </button>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Salva come</label>
            <div className="flex gap-1">
              <input type="text" value={configName} onChange={(e) => setConfigName(e.target.value)}
                placeholder="Nome configurazione..."
                className="border rounded px-2 py-1 text-sm w-48" />
              <button onClick={handleSave} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                Salva
              </button>
            </div>
          </div>
        </div>
        {configMsg && <p className="text-xs text-green-600">{configMsg}</p>}
        {configErr && <p className="text-xs text-red-600">{configErr}</p>}
      </div>
    </div>
  );
}
