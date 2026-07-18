import { mutateCache } from './cache';

/** общий ключ кэша счётчика непрочитанных уведомлений (бейдж-колокольчик) */
export const UNREAD_KEY = 'notifications:unread';

/** уменьшить счётчик на n (оптимистично, при отметке «прочитано») */
export function decUnread(n = 1): void {
  mutateCache<{ count: number }>(UNREAD_KEY, (prev) => ({
    count: Math.max(0, (prev?.count ?? 0) - n),
  }));
}

/** обнулить счётчик (при «отметить всё прочитанным») */
export function clearUnread(): void {
  mutateCache<{ count: number }>(UNREAD_KEY, () => ({ count: 0 }));
}
