import { http } from '@/shared/api/http';

export interface AppNotification {
  id: string;
  message: string;
  saleId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  items: AppNotification[];
  total: number;
  page: number;
  limit: number;
  unreadCount: number;
}

export const notificationsApi = {
  list: (page = 1, limit = 20) =>
    http
      .get<NotificationsResponse>('/notifications', { params: { page, limit } })
      .then((r) => r.data),
  unreadCount: () =>
    http.get<{ count: number }>('/notifications/unread-count').then((r) => r.data),
  markRead: (id: string) => http.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => http.post('/notifications/read-all').then((r) => r.data),
};
