import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceArea, ReferenceLine,
} from 'recharts';
import type { ChartType, TrendMethod } from '@healthbridge/shared';

export interface SeriesDefinition {
  key: string;
  label: string;
  color: string;
  unit?: string;
}

export interface KpiBand {
  y1: number;
  y2: number;
  fill: string;
  fillOpacity: number;
}

export interface KpiThresholdLine {
  value: number;
  label: string;
  color: string;
}

export interface MultiTypeChartProps {
  data: Record<string, any>[];
  series: SeriesDefinition[];
  chartType: ChartType;
  showKpi: boolean;
  kpiBands: KpiBand[];
  kpiThresholdLines?: KpiThresholdLine[];
  showTrend: boolean;
  trendMethod: TrendMethod;
  trendWindow: number;
  loading?: boolean;
}

function formatDate(value: string) {
  try {
    const hasTime = value.includes('T');
    if (!hasTime) {
      return new Date(value + 'T12:00:00Z').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return value; }
}

function calculateSma(data: Record<string, any>[], key: string, window: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < window - 1) return null;
    let sum = 0;
    let count = 0;
    for (let j = i - window + 1; j <= i; j++) {
      const v = data[j]?.[key];
      if (v != null) { sum += v; count++; }
    }
    return count > 0 ? Math.round((sum / count) * 100) / 100 : null;
  });
}

function calculateLinearRegression(data: Record<string, any>[], key: string): (number | null)[] {
  const points: number[] = [];
  const indices: number[] = [];
  data.forEach((d, i) => {
    const v = d[key];
    if (v != null) { points.push(v); indices.push(i); }
  });
  const n = points.length;
  if (n < 2) return data.map(() => null);
  const sumX = indices.reduce((a, b) => a + b, 0);
  const sumY = points.reduce((a, b) => a + b, 0);
  const sumXY = indices.reduce((a, _, i) => a + indices[i] * points[i], 0);
  const sumX2 = indices.reduce((a, b) => a + b * b, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return data.map((_, i) => Math.round((slope * i + intercept) * 100) / 100);
}

export function MultiTypeChart({ data, series, chartType, showKpi, kpiBands, kpiThresholdLines, showTrend, trendMethod, trendWindow, loading }: MultiTypeChartProps) {
  if (loading) {
    return <p className="text-gray-500 text-center py-12">Caricamento grafico...</p>;
  }
  if (!data.length) {
    return <p className="text-gray-500 text-center py-12">Nessun dato disponibile</p>;
  }

  const trendData = showTrend ? data.map((d) => ({ ...d })) : null;
  if (trendData && showTrend) {
    for (const s of series) {
      const trendKey = `${s.key}__trend`;
      const values = trendMethod === 'sma'
        ? calculateSma(data, s.key, trendWindow)
        : calculateLinearRegression(data, s.key);
      values.forEach((v, i) => {
        (trendData[i] as any)[trendKey] = v;
      });
    }
  }

  const chartData = trendData || data;

  const commonProps = {
    data: chartData,
    margin: { top: 20, right: 30, left: 20, bottom: 5 },
  };

  const chartChildren: React.ReactNode[] = [];

  chartChildren.push(<CartesianGrid key="grid" strokeDasharray="3 3" />);
  chartChildren.push(<XAxis key="x" dataKey="timestamp" tickFormatter={formatDate} />);
  chartChildren.push(<YAxis key="y" />);
  chartChildren.push(<Tooltip key="tooltip" labelFormatter={formatDate} />);
  chartChildren.push(<Legend key="legend" />);

  if (showKpi) {
    for (let i = 0; i < kpiBands.length; i++) {
      const b = kpiBands[i];
      chartChildren.push(
        <ReferenceArea key={`kpi-${i}`} y1={b.y1} y2={b.y2} fill={b.fill} fillOpacity={b.fillOpacity} />
      );
    }
    if (kpiThresholdLines) {
      for (let i = 0; i < kpiThresholdLines.length; i++) {
        const tl = kpiThresholdLines[i];
        chartChildren.push(
          <ReferenceLine
            key={`kpi-line-${i}`}
            y={tl.value}
            stroke={tl.color}
            strokeDasharray="3 3"
            strokeWidth={1}
            label={{ value: tl.label, position: 'left', fill: tl.color, fontSize: 10 }}
          />
        );
      }
    }
  }

  for (const s of series) {
    const dataProps = {
      type: 'monotone' as const,
      dataKey: s.key,
      name: s.label,
      stroke: s.color,
      fill: s.color,
    };
    if (chartType === 'area') {
      chartChildren.push(<Area key={`line-${s.key}`} {...dataProps} />);
    } else if (chartType === 'bar') {
      chartChildren.push(<Bar key={`line-${s.key}`} {...dataProps} />);
    } else {
      chartChildren.push(<Line key={`line-${s.key}`} {...dataProps} />);
    }
  }

  if (showTrend && trendData) {
    for (const s of series) {
      const trendKey = `${s.key}__trend`;
      chartChildren.push(
        <Line
          key={`trend-${s.key}`}
          type="monotone"
          dataKey={trendKey}
          name={`${s.label} (${trendMethod === 'sma' ? `SMA-${trendWindow}` : 'trend lineare'})`}
          stroke={s.color}
          strokeDasharray="4 4"
          strokeWidth={1.5}
          dot={false}
          opacity={0.6}
        />
      );
    }
  }

  const chartProps = {
    ...commonProps,
    children: <>{chartChildren}</>,
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      {chartType === 'line' ? <LineChart {...chartProps} /> :
       chartType === 'area' ? <AreaChart {...chartProps} /> :
       <BarChart {...chartProps} />}
    </ResponsiveContainer>
  );
}
