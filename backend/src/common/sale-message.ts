import { Sale } from '../entities';
import { DISPLAY_TZ } from './tz';

export { DISPLAY_TZ };

export const fmtMoney = (n: number): string => n.toFixed(2);
export const fmtQty = (n: number): string => parseFloat(n.toFixed(3)).toString();

export function fmtDateTime(d: Date, tz: string = DISPLAY_TZ): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: tz,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const PAYMENT_LABEL: Record<string, string> = {
  CASH: 'Нақд',
  CARD: 'Корти бонкӣ',
};

export const SALE_TYPE_LABEL: Record<string, string> = {
  WHOLESALE: 'Яклухт',
  RETAIL: 'Чакана',
};

/** текст уведомления о продаже (таджикский); html=true — для Telegram (с эмодзи) */
export function buildSaleMessage(sale: Sale, html: boolean): string {
  const esc = html ? escapeHtml : (s: string) => s;
  const b = html ? (s: string) => `<b>${s}</b>` : (s: string) => s;
  // эмодзи — только в Telegram; интерфейс системы без стикеров
  const e = (emoji: string) => (html ? `${emoji} ` : '');

  return [
    `${e('🛒')}${b('Фурӯши нав!')}`,
    `${e('📅')}Сана ва вақт: ${fmtDateTime(sale.createdAt)}`,
    `${e('👤')}Фурӯшанда: ${esc(sale.sellerName)}`,
    `${e('📦')}Мол: ${esc(sale.productName)}`,
    `${e('🔢')}Миқдор: ${fmtQty(sale.quantity)} ${esc(sale.unit)}`,
    `${e('💵')}Нархи воҳид: ${fmtMoney(sale.unitPrice)} сомонӣ`,
    `${e('💰')}Маблағи умумӣ: ${b(fmtMoney(sale.totalAmount) + ' сомонӣ')}`,
    `${e('💳')}Пардохт: ${PAYMENT_LABEL[sale.paymentMethod]}`,
    `${e('📊')}Намуди фурӯш: ${SALE_TYPE_LABEL[sale.saleType]}`,
  ].join('\n');
}
