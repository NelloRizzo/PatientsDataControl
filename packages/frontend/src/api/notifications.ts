import apiClient from './client';
import type { INotification, PaginatedResponse } from '@healthbridge/shared';

export async function getNotifications(params?: {
  page?: number;
  limit?: number;
  category?: string;
  read?: string;
}): Promise<{ data: INotification[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const res = await apiClient.get('/notifications', { params });
  return res.data;
}

export async function getUnreadCount(): Promise<{ count: number }> {
  const res = await apiClient.get('/notifications/unread-count');
  return res.data;
}

export async function markAsRead(id: string): Promise<void> {
  await apiClient.put(`/notifications/${id}/read`);
}

export async function markAllAsRead(): Promise<void> {
  await apiClient.put('/notifications/read-all');
}
