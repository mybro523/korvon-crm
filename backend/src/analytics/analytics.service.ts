import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { normalizeFrom, normalizeTo, safeTz } from '../common/tz';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

const num = (v: unknown): number => parseFloat(String(v ?? 0)) || 0;

@Injectable()
export class AnalyticsService {
  constructor(private readonly dataSource: DataSource) {}

  private buildWhere(q: AnalyticsQueryDto): { where: string; params: unknown[] } {
    const conds = ['s."createdAt" >= $1', 's."createdAt" <= $2'];
    const params: unknown[] = [normalizeFrom(q.from), normalizeTo(q.to)];
    return { where: conds.join(' AND '), params };
  }

  async summary(q: AnalyticsQueryDto) {
    const { where, params } = this.buildWhere(q);
    const [row] = await this.dataSource.query(
      `SELECT
        COUNT(*)::int AS "salesCount",
        COALESCE(SUM(s."totalAmount"), 0) AS "totalAmount",
        COALESCE(SUM(s."totalAmount") FILTER (WHERE s."paymentMethod" = 'CASH'), 0) AS "cashAmount",
        COALESCE(SUM(s."totalAmount") FILTER (WHERE s."paymentMethod" = 'CARD'), 0) AS "cardAmount",
        COUNT(*) FILTER (WHERE s."paymentMethod" = 'CASH') ::int AS "cashCount",
        COUNT(*) FILTER (WHERE s."paymentMethod" = 'CARD') ::int AS "cardCount",
        COALESCE(SUM(s.quantity), 0) AS "itemsSold",
        COALESCE(SUM(s."totalAmount") FILTER (WHERE s."saleType" = 'WHOLESALE'), 0) AS "wholesaleAmount",
        COALESCE(SUM(s."totalAmount") FILTER (WHERE s."saleType" = 'RETAIL'), 0) AS "retailAmount",
        COUNT(*) FILTER (WHERE s."saleType" = 'WHOLESALE') ::int AS "wholesaleCount",
        COUNT(*) FILTER (WHERE s."saleType" = 'RETAIL') ::int AS "retailCount",
        COALESCE(SUM(s."totalAmount" - s."costAtSale" * s.quantity), 0) AS "totalProfit"
      FROM sales s
      WHERE ${where}`,
      params,
    );
    return {
      salesCount: row.salesCount,
      totalAmount: num(row.totalAmount),
      cashAmount: num(row.cashAmount),
      cardAmount: num(row.cardAmount),
      cashCount: row.cashCount,
      cardCount: row.cardCount,
      itemsSold: num(row.itemsSold),
      wholesaleAmount: num(row.wholesaleAmount),
      retailAmount: num(row.retailAmount),
      wholesaleCount: row.wholesaleCount,
      retailCount: row.retailCount,
      totalProfit: num(row.totalProfit),
    };
  }

  /** продажи по дням (для графика), в часовом поясе пользователя */
  async daily(q: AnalyticsQueryDto) {
    const { where, params } = this.buildWhere(q);
    params.push(safeTz(q.tz));
    const rows = await this.dataSource.query(
      `SELECT
        to_char(s."createdAt" AT TIME ZONE $${params.length}, 'YYYY-MM-DD') AS date,
        COUNT(*)::int AS count,
        COALESCE(SUM(s."totalAmount"), 0) AS amount
      FROM sales s
      WHERE ${where}
      GROUP BY 1
      ORDER BY 1`,
      params,
    );
    return rows.map((r: any) => ({ date: r.date, count: r.count, amount: num(r.amount) }));
  }

  async topProducts(q: AnalyticsQueryDto) {
    const { where, params } = this.buildWhere(q);
    params.push(q.limit ?? 10);
    const rows = await this.dataSource.query(
      `SELECT
        s."productName" AS name,
        s.unit,
        COALESCE(SUM(s.quantity), 0) AS quantity,
        COALESCE(SUM(s."totalAmount"), 0) AS amount,
        COUNT(*)::int AS count
      FROM sales s
      WHERE ${where}
      GROUP BY s."productName", s.unit
      ORDER BY quantity DESC
      LIMIT $${params.length}`,
      params,
    );
    return rows.map((r: any) => ({
      name: r.name,
      unit: r.unit,
      quantity: num(r.quantity),
      amount: num(r.amount),
      count: r.count,
    }));
  }

  /** топ продавцов по сумме продаж */
  async bySellers(q: AnalyticsQueryDto) {
    const { where, params } = this.buildWhere(q);
    const rows = await this.dataSource.query(
      `SELECT
        s."sellerName" AS name,
        COUNT(*)::int AS count,
        COALESCE(SUM(s."totalAmount"), 0) AS amount
      FROM sales s
      WHERE ${where}
      GROUP BY s."sellerName"
      ORDER BY amount DESC`,
      params,
    );
    return rows.map((r: any) => ({
      name: r.name,
      count: r.count,
      amount: num(r.amount),
    }));
  }
}
