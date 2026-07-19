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
        COALESCE(SUM(s."totalAmount" - s."costAtSale" * s.quantity), 0) AS profit,
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
      profit: num(r.profit),
      count: r.count,
    }));
  }

  /** аналитика склада: текущее состояние запасов (не зависит от периода) */
  async inventory() {
    const [row] = await this.dataSource.query(
      `SELECT
        COUNT(*)::int AS "productsCount",
        COALESCE(SUM(p.quantity), 0) AS "warehouseUnits",
        COALESCE(SUM(p."shopQty"), 0) AS "shopUnits",
        COALESCE(SUM(p."costPrice" * (p.quantity + p."shopQty")), 0) AS "inventoryCost",
        COALESCE(SUM(p."costPrice" * p.quantity), 0) AS "warehouseCost",
        COALESCE(SUM(p."costPrice" * p."shopQty"), 0) AS "shopCost",
        COUNT(*) FILTER (WHERE p."shopQty" <= p."lowStockThreshold" AND p.quantity + p."shopQty" > 0)::int AS "lowStockCount",
        COUNT(*) FILTER (WHERE p.quantity + p."shopQty" <= 0)::int AS "outOfStockCount"
      FROM products p`,
    );

    const topByValue = await this.dataSource.query(
      `SELECT
        p.name, p.unit,
        (p.quantity + p."shopQty") AS units,
        p."costPrice" * (p.quantity + p."shopQty") AS value
      FROM products p
      WHERE p.quantity + p."shopQty" > 0
      ORDER BY value DESC
      LIMIT 10`,
    );

    const lowStockItems = await this.dataSource.query(
      `SELECT p.id, p.name, p.unit, p."shopQty", p.quantity, p."lowStockThreshold"
      FROM products p
      WHERE p."shopQty" <= p."lowStockThreshold" AND p.quantity + p."shopQty" > 0
      ORDER BY p."shopQty" ASC
      LIMIT 50`,
    );

    const outOfStockItems = await this.dataSource.query(
      `SELECT p.id, p.name, p.unit
      FROM products p
      WHERE p.quantity + p."shopQty" <= 0
      ORDER BY p.name ASC
      LIMIT 50`,
    );

    // штучные остатки нельзя складывать между разными единицами (кг + дона) — отдаём разбивку
    const unitsBreakdown = await this.dataSource.query(
      `SELECT p.unit,
        COALESCE(SUM(p.quantity), 0) AS warehouse,
        COALESCE(SUM(p."shopQty"), 0) AS shop
      FROM products p
      GROUP BY p.unit
      ORDER BY SUM(p.quantity + p."shopQty") DESC`,
    );

    // полная разбивка по товарам — для кликабельных тайлов (позиции/склад/точка/стоимость)
    const items = await this.dataSource.query(
      `SELECT p.id, p.name, p.unit, p.category,
        p.quantity AS "warehouseQty",
        p."shopQty",
        p."costPrice" * p.quantity AS "warehouseValue",
        p."costPrice" * p."shopQty" AS "shopValue",
        p."costPrice" * (p.quantity + p."shopQty") AS "totalValue"
      FROM products p
      ORDER BY p."costPrice" * (p.quantity + p."shopQty") DESC, p.name ASC
      LIMIT 1000`,
    );

    return {
      productsCount: row.productsCount,
      warehouseUnits: num(row.warehouseUnits),
      shopUnits: num(row.shopUnits),
      totalUnits: num(row.warehouseUnits) + num(row.shopUnits),
      inventoryCost: num(row.inventoryCost),
      warehouseCost: num(row.warehouseCost),
      shopCost: num(row.shopCost),
      lowStockCount: row.lowStockCount,
      outOfStockCount: row.outOfStockCount,
      items: items.map((r: any) => ({
        id: r.id,
        name: r.name,
        unit: r.unit,
        category: r.category,
        warehouseQty: num(r.warehouseQty),
        shopQty: num(r.shopQty),
        warehouseValue: num(r.warehouseValue),
        shopValue: num(r.shopValue),
        totalValue: num(r.totalValue),
      })),
      unitsBreakdown: unitsBreakdown.map((r: any) => ({
        unit: r.unit,
        warehouse: num(r.warehouse),
        shop: num(r.shop),
      })),
      topByValue: topByValue.map((r: any) => ({
        name: r.name,
        unit: r.unit,
        units: num(r.units),
        value: num(r.value),
      })),
      lowStockItems: lowStockItems.map((r: any) => ({
        id: r.id,
        name: r.name,
        unit: r.unit,
        shopQty: num(r.shopQty),
        warehouseQty: num(r.quantity),
        threshold: num(r.lowStockThreshold),
      })),
      outOfStockItems: outOfStockItems.map((r: any) => ({ id: r.id, name: r.name, unit: r.unit })),
    };
  }

  /** топ продавцов по сумме продаж */
  async bySellers(q: AnalyticsQueryDto) {
    const { where, params } = this.buildWhere(q);
    const rows = await this.dataSource.query(
      `SELECT
        s."sellerId" AS "sellerId",
        MAX(s."sellerName") AS name,
        COUNT(*)::int AS count,
        COALESCE(SUM(s."totalAmount"), 0) AS amount,
        COALESCE(SUM(s."totalAmount" - s."costAtSale" * s.quantity), 0) AS profit
      FROM sales s
      WHERE ${where}
      GROUP BY s."sellerId"
      ORDER BY amount DESC`,
      params,
    );
    return rows.map((r: any) => ({
      sellerId: r.sellerId,
      name: r.name,
      count: r.count,
      amount: num(r.amount),
      profit: num(r.profit),
    }));
  }
}
