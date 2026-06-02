import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import type { ITicket } from '@healthbridge/shared';

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_review: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
};

const statusLabels: Record<string, string> = {
  open: 'Aperto',
  in_review: 'In Revisione',
  in_progress: 'In Elaborazione',
  resolved: 'Risolto',
  closed: 'Chiuso',
};

export function DoctorTickets() {
  const [tickets, setTickets] = useState<ITicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<'suggestion' | 'bug_report'>('suggestion');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ITicket | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const res = await apiClient.get('/tickets', { params });
      setTickets(res.data.data);
    } catch {}
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSaving(true); setMsg('');
    try {
      await apiClient.post('/tickets', {
        type,
        title: title.trim(),
        description: description.trim(),
        severity: type === 'bug_report' ? severity : undefined,
        page: window.location.pathname,
      });
      setMsg('Ticket creato con successo');
      setShowForm(false); setTitle(''); setDescription(''); setType('suggestion');
      await load();
    } catch (err: any) {
      setMsg(err.response?.data?.error || 'Errore creazione ticket');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ticket e Segnalazioni</h2>
        <button onClick={() => { setShowForm(!showForm); setMsg(''); }}
          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700">
          {showForm ? 'Annulla' : '+ Nuovo Ticket'}
        </button>
      </div>

      {msg && <p className={`text-sm ${msg.includes('Errore') ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
          <div className="flex gap-3">
            <button type="button" onClick={() => setType('suggestion')}
              className={`px-3 py-1.5 rounded text-sm ${type === 'suggestion' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              Suggerimento
            </button>
            <button type="button" onClick={() => setType('bug_report')}
              className={`px-3 py-1.5 rounded text-sm ${type === 'bug_report' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              Segnalazione Bug
            </button>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Titolo</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              required className="w-full border rounded px-3 py-2 text-sm" placeholder="Sintesi del ticket..." />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Descrizione</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              required rows={5} className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Descrivi nel dettaglio..." />
          </div>
          {type === 'bug_report' && (
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Severità</label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setSeverity(s)}
                    className={`px-3 py-1 rounded text-xs ${
                      severity === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {s === 'low' ? 'Bassa' : s === 'medium' ? 'Media' : 'Alta'}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button type="submit" disabled={saving}
            className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Invio...' : 'Invia'}
          </button>
        </form>
      )}

      <div className="flex gap-2 flex-wrap">
        {['', 'open', 'in_review', 'in_progress', 'resolved', 'closed'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`text-xs px-2 py-1 rounded ${statusFilter === s ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s ? statusLabels[s] : 'Tutti'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Caricamento...</p>
      ) : tickets.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">Nessun ticket</p>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <div key={t._id}
              className="bg-white rounded-lg shadow-sm border p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedTicket(selectedTicket?._id === t._id ? null : t)}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-gray-400">{t.ticketNumber}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusColors[t.status] || ''}`}>
                      {statusLabels[t.status]}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      {t.type === 'suggestion' ? 'Suggerimento' : 'Bug'}
                    </span>
                    {t.severity && t.type === 'bug_report' && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        t.severity === 'high' ? 'bg-red-100 text-red-700' :
                        t.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {t.severity === 'high' ? 'Alta' : t.severity === 'medium' ? 'Media' : 'Bassa'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium mt-1">{t.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{t.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(t.createdAt).toLocaleString()}</p>
                </div>
              </div>
              {selectedTicket?._id === t._id && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  <p className="text-sm whitespace-pre-wrap">{t.description}</p>
                  {t.adminNotes && (
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-xs font-medium text-gray-600">Nota admin:</p>
                      <p className="text-sm whitespace-pre-wrap">{t.adminNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
