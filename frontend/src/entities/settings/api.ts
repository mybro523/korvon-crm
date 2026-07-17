import { http } from '@/shared/api/http';

export interface SystemSettings {
  telegramBotTokenSet: boolean;
  telegramBotUsername: string;
  telegram?: { ok: boolean; webhookRegistered?: boolean; error?: string };
}

export const settingsApi = {
  get: () => http.get<SystemSettings>('/settings').then((r) => r.data),
  update: (payload: { telegramBotToken?: string; telegramChatId?: string }) =>
    http.put<SystemSettings>('/settings', payload).then((r) => r.data),
  telegramTest: () =>
    http.post<{ ok: boolean; error?: string }>('/settings/telegram-test').then((r) => r.data),
};
