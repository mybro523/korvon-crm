import { http } from '@/shared/api/http';

export interface SystemSettings {
  telegramBotToken: string;
  telegramChatId: string;
}

export const settingsApi = {
  get: () => http.get<SystemSettings>('/settings').then((r) => r.data),
  update: (payload: Partial<SystemSettings>) =>
    http.put<SystemSettings>('/settings', payload).then((r) => r.data),
  telegramTest: () =>
    http.post<{ ok: boolean; error?: string }>('/settings/telegram-test').then((r) => r.data),
};
