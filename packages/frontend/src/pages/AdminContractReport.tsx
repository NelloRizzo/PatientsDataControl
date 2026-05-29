import { useState } from 'react';
import { getContractReport } from '../api/contracts';
import type { ContractReportRow } from '../api/contracts';

export function AdminContractReport() {
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  const fromStr = firstOfMonth.toISOString().split('T')[0];

  const [from, setFrom] = useState(fromStr);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<ContractReportRow[]>([]);
  const [period, setPeriod] = useState<{ from: string; to: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleSearch = async () => {
    if (!from || !to) { setErr('Select a date range'); return; }
    setLoading(true); setErr('');
    try {
      const res = await getContractReport(from, to);
      setData(res.data);
      setPeriod(res.period);
    } catch (err: any) {
      setErr(err.response?.data?.error || 'Failed to load report');
    }
    setLoading(false);
  };

  const totalFee = data.reduce((s, r) => s + r.totalFeeOwed, 0);
  const currency = data[0]?.currency || 'EUR';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Contract Usage Report</h1>

      <div className="bg-white p-4 rounded-lg shadow-sm border flex gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded px-3 py-1.5 text-sm" />
        </div>
        <button onClick={handleSearch} disabled={loading} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Loading...' : 'Generate Report'}
        </button>
        {data.length > 0 && (
          <button onClick={() => {
            const csv = [
              ['Doctor', 'Email', 'Contracts', 'Peak Patients', 'Avg Patients', 'Total Fee'].join(','),
              ...data.map(r => [r.doctorName, r.doctorEmail, r.contracts.length, r.actualPeakPatients, r.actualAvgPatients, r.totalFeeOwed].join(',')),
            ].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `contract-report-${from}-${to}.csv`;
            a.click();
          }} className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700">
            Export CSV
          </button>
        )}
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      {period && (
        <p className="text-sm text-gray-500">
          Report period: <strong>{period.from}</strong> → <strong>{period.to}</strong>
        </p>
      )}

      {data.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Doctor</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Active Contracts</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Max (Contract)</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Peak Patients</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Avg Patients</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Fee Due</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((r) => (
                <tr key={r.doctorId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{r.doctorName}</p>
                    <p className="text-xs text-gray-500">{r.doctorEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {r.contracts.length === 0 ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <div className="space-y-1">
                        {r.contracts.map((c) => (
                          <div key={c._id} className="text-xs">
                            {c.startDate} → {c.endDate} ({c.maxPatients} pts)
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {r.contracts.length > 0 ? Math.max(...r.contracts.map(c => c.maxPatients)) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${
                      r.actualPeakPatients > (r.contracts[0]?.maxPatients || 0)
                        ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {r.actualPeakPatients}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{r.actualAvgPatients}</td>
                  <td className="px-4 py-3 text-sm font-medium">{r.totalFeeOwed} {r.currency}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-medium">
              <tr>
                <td colSpan={5} className="text-right px-4 py-3 text-sm">Total</td>
                <td className="px-4 py-3 text-sm">{totalFee} {currency}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {!loading && data.length === 0 && period && (
        <p className="text-gray-500 text-center py-8">No data for this period</p>
      )}
    </div>
  );
}
