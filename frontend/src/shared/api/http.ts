import axios, { AxiosError } from 'axios';
import { API_URL, TOKEN_KEY } from '../config';

export const http = axios.create({ baseURL: API_URL });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem(TOKEN_KEY);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

import { localizeServerMessage } from '../i18n';

/** извлекает сообщение об ошибке; при русском интерфейсе переводит известные тексты бэка */
export function extractError(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const msg = (e.response?.data as { message?: string | string[] } | undefined)?.message;
    if (Array.isArray(msg)) return localizeServerMessage(msg[0]);
    if (typeof msg === 'string') return localizeServerMessage(msg);
    if (!e.response) return localizeServerMessage('Сервер дастнорас аст. Пайвастшавиро тафтиш кунед');
  }
  return localizeServerMessage('Хатои номаълум рух дод');
}
