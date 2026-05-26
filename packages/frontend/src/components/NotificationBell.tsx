import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUnreadCount, markAsRead } from '../api/notifications';
import type { INotification } from '@healthbridge/shared';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchCount = async () => {
    try {
      const res = await getUnreadCount();
      setCount(res.count);
    } catch {}
  };

  const openDropdown = async () => {
    setOpen((prev) => !prev);
    if (!open) {
      setLoading(true);
      try {
        const { default: apiClient } = await import('../api/client');
        const res = await apiClient.get('/notifications', { params: { limit: 5, read: 'false' } });
        setNotifications(res.data.data);
      } catch {}
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id: string) => {
    await markAsRead(id);
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    setCount((prev) => Math.max(0, prev - 1));
  };

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

  return (
    <div ref={dropdownRef} className="relative">
      <button onClick={openDropdown} className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <span className="text-sm font-medium">Notifications</span>
            <button onClick={() => { setOpen(false); navigate('/notifications'); }}
              className="text-xs text-blue-600 hover:underline">
              View all
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-gray-500 text-center py-6">Loading...</p>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No new notifications</p>
            ) : (
              notifications.map((n) => (
                <div key={n._id}
                  className="px-4 py-3 border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleMarkRead(n._id)}>
                  <div className="flex items-start gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${categoryColor(n.category)}`}>
                      {n.category}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
