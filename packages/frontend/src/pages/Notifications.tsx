import { useState, useEffect, useCallback } from 'react';
import { getNotifications, markAsRead, markAllAsRead } from '../api/notifications';
import type { INotification, NotificationCategory } from '@healthbridge/shared';

const TABS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Info', value: 'info' },
  { label: 'Alert', value: 'alert' },
  { label: 'Danger', value: 'danger' },
  { label: 'Warning', value: 'warning' },
  { label: 'Medical Note', value: 'medicalnote' },
];

const categoryColor = (cat: string) => {
  const colors: Record<string, string> = {
    info: 'bg-blue-100 text-blue-700',
    alert: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    warning: 'bg-orange-100 text-orange-700',
    medicalnote: 'bg-green-100 text-green-700',
  };
  return colors[cat] || 'bg-gray-100 text-gray-700';
};

export function Notifications() {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNotifications({
        page,
        limit: 20,
        ...(category ? { category } : {}),
      });
      setNotifications(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch {}
    setLoading(false);
  }, [page, category]);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (id: string) => {
    await markAsRead(id);
    setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n));
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button onClick={handleMarkAll}
          className="text-sm text-blue-600 hover:underline">
          Mark all as read
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button key={t.value}
            onClick={() => { setCategory(t.value); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              category === t.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border divide-y">
        {loading ? (
          <p className="text-gray-500 text-center py-12">Loading...</p>
        ) : notifications.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No notifications</p>
        ) : (
          notifications.map((n) => (
            <div key={n._id}
              className={`px-4 py-3 flex items-start gap-3 ${n.read ? 'opacity-60' : ''}`}>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium mt-0.5 ${categoryColor(n.category)}`}>
                {n.category}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              {!n.read && (
                <button onClick={() => handleMarkRead(n._id)}
                  className="text-xs text-blue-600 hover:underline shrink-0">
                  Mark read
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50">
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
