import { ValueTransformer } from 'typeorm';

/** numeric-колонки Postgres приходят строками — преобразуем в number */
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? (value as unknown as number) : parseFloat(value),
};

/* относительная добавка EPSILON: корректный half-up и для значений > 1 (например 4.35 * 0.5 → 2.18) */
export const round2 = (n: number): number =>
  Math.round(n * 100 * (1 + Number.EPSILON * 2)) / 100;
export const round3 = (n: number): number =>
  Math.round(n * 1000 * (1 + Number.EPSILON * 2)) / 1000;

/** допуск для сравнения дробных остатков */
export const EPS = 1e-9;
