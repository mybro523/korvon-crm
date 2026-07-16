export const DISPLAY_TZ = 'Asia/Dushanbe';

/** валидирует часовой пояс из query; при мусоре — дефолт */
export function safeTz(tz?: string): string {
  if (!tz) return DISPLAY_TZ;
  try {
    return (Intl as any).supportedValuesOf('timeZone').includes(tz) ? tz : DISPLAY_TZ;
  } catch {
    return DISPLAY_TZ;
  }
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** смещение зоны вида «+05:00» — чтобы date-only границы не зависели от TZ сессии БД */
function tzOffset(tz: string, date: Date): string {
  try {
    const part = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'longOffset',
    })
      .formatToParts(date)
      .find((p) => p.type === 'timeZoneName')?.value;
    const m = part?.match(/GMT([+-]\d{2}:\d{2})/);
    return m?.[1] ?? '+00:00';
  } catch {
    return '+00:00';
  }
}

/** date-only «from» → начало дня в бизнес-таймзоне */
export function normalizeFrom(from?: string): string | undefined {
  if (!from || !DATE_ONLY.test(from)) return from;
  return `${from}T00:00:00.000${tzOffset(DISPLAY_TZ, new Date(from))}`;
}

/** date-only «to» → конец дня в бизнес-таймзоне (иначе отсекается почти весь последний день) */
export function normalizeTo(to?: string): string | undefined {
  if (!to || !DATE_ONLY.test(to)) return to;
  return `${to}T23:59:59.999${tzOffset(DISPLAY_TZ, new Date(to))}`;
}
