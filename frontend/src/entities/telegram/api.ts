import { http } from '@/shared/api/http';

export interface TelegramStatus {
  botConfigured: boolean;
  botUsername: string;
  connected: boolean;
}

export const telegramApi = {
  status: () => http.get<TelegramStatus>('/telegram/status').then((r) => r.data),
  connectLink: () => http.post<{ link: string }>('/telegram/connect-link').then((r) => r.data),
  disconnect: () => http.post('/telegram/disconnect').then((r) => r.data),
};
