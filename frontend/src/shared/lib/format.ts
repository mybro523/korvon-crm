import dayjs from 'dayjs';

const moneyFmt = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1250.5 → «1 250.50 с.» */
export const fmtMoney = (n: number): string => `${moneyFmt.format(n)} с.`;

/** количество без хвостовых нулей: 2.500 → «2.5» */
export const fmtQty = (n: number): string => String(parseFloat(n.toFixed(3)));

export const fmtDateTime = (iso: string | Date): string =>
  dayjs(iso).format('DD.MM.YYYY HH:mm');

export const fmtDate = (iso: string | Date): string => dayjs(iso).format('DD.MM.YYYY');
