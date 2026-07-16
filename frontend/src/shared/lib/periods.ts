import dayjs from 'dayjs';

export type PeriodKey = 'today' | 'week' | 'month' | 'custom';

export interface PeriodRange {
  from: string;
  to: string;
}

/** границы периода в ISO (локальный часовой пояс пользователя) */
export function periodRange(key: PeriodKey, customFrom?: string, customTo?: string): PeriodRange {
  const now = dayjs();
  switch (key) {
    case 'today':
      return { from: now.startOf('day').toISOString(), to: now.endOf('day').toISOString() };
    case 'week':
      return {
        from: now.subtract(6, 'day').startOf('day').toISOString(),
        to: now.endOf('day').toISOString(),
      };
    case 'month':
      return { from: now.startOf('month').toISOString(), to: now.endOf('day').toISOString() };
    case 'custom': {
      const from = customFrom ? dayjs(customFrom).startOf('day') : now.startOf('day');
      const to = customTo ? dayjs(customTo).endOf('day') : now.endOf('day');
      return { from: from.toISOString(), to: to.toISOString() };
    }
  }
}

export const userTimeZone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Dushanbe';
