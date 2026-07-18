import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import { Repository } from 'typeorm';
import { round2, round3 } from '../common/numbers';
import {
  fmtDateTime,
  PAYMENT_LABEL,
  SALE_TYPE_LABEL,
} from '../common/sale-message';
import { normalizeFrom, normalizeTo, safeTz } from '../common/tz';
import { Product, Sale } from '../entities';
import { QuerySalesDto } from '../sales/dto/query-sales.dto';

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF4F46E5' },
};

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(Sale) private readonly salesRepo: Repository<Sale>,
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
  ) {}

  private styleHeader(ws: ExcelJS.Worksheet) {
    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = HEADER_FILL;
    header.height = 22;
    header.alignment = { vertical: 'middle' };
  }

  /** экспорт продаж (весь список или за период, фильтры как в списке) */
  async sales(q: QuerySalesDto, tz?: string): Promise<Buffer> {
    const displayTz = safeTz(tz);
    const qb = this.salesRepo.createQueryBuilder('s').orderBy('s.createdAt', 'ASC');
    if (q.from) qb.andWhere('s.createdAt >= :from', { from: normalizeFrom(q.from) });
    if (q.to) qb.andWhere('s.createdAt <= :to', { to: normalizeTo(q.to) });
    if (q.sellerId) qb.andWhere('s.sellerId = :sellerId', { sellerId: q.sellerId });
    if (q.paymentMethod) qb.andWhere('s.paymentMethod = :pm', { pm: q.paymentMethod });
    if (q.saleType) qb.andWhere('s.saleType = :st', { st: q.saleType });
    if (q.search) {
      qb.andWhere('s.productName ILIKE :search', { search: `%${q.search.trim()}%` });
    }
    const sales = await qb.take(100_000).getMany();

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Фурӯшҳо');
    ws.columns = [
      { header: '№', key: 'n', width: 6 },
      { header: 'Сана ва вақт', key: 'date', width: 18 },
      { header: 'Мол', key: 'product', width: 28 },
      { header: 'Миқдор', key: 'quantity', width: 10 },
      { header: 'Воҳид', key: 'unit', width: 10 },
      { header: 'Нархи воҳид (сомонӣ)', key: 'unitPrice', width: 18 },
      { header: 'Маблағи умумӣ (сомонӣ)', key: 'total', width: 20 },
      { header: 'Намуди фурӯш', key: 'type', width: 14 },
      { header: 'Тарзи пардохт', key: 'payment', width: 14 },
      { header: 'Фурӯшанда', key: 'seller', width: 22 },
    ];

    sales.forEach((s, i) => {
      ws.addRow({
        n: i + 1,
        date: fmtDateTime(s.createdAt, displayTz),
        product: s.productName,
        quantity: s.quantity,
        unit: s.unit,
        unitPrice: s.unitPrice,
        total: s.totalAmount,
        type: SALE_TYPE_LABEL[s.saleType],
        payment: PAYMENT_LABEL[s.paymentMethod],
        seller: s.sellerName,
      });
    });

    // итоговая строка
    const totalRow = ws.addRow({
      product: 'ҲАМАГӢ:',
      quantity: round3(sales.reduce((acc, s) => acc + s.quantity, 0)),
      total: round2(sales.reduce((acc, s) => acc + s.totalAmount, 0)),
    });
    totalRow.font = { bold: true };

    this.styleHeader(ws);
    ws.getColumn('unitPrice').numFmt = '#,##0.00';
    ws.getColumn('total').numFmt = '#,##0.00';

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf as ArrayBuffer);
  }

  /** экспорт склада */
  async warehouse(): Promise<Buffer> {
    const products = await this.productsRepo.find({ order: { name: 'ASC' } });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Анбор');
    ws.columns = [
      { header: '№', key: 'n', width: 6 },
      { header: 'Номи мол', key: 'name', width: 30 },
      { header: 'Категория', key: 'category', width: 18 },
      { header: 'Воҳид', key: 'unit', width: 10 },
      { header: 'Арзиши аслӣ (сомонӣ)', key: 'cost', width: 18 },
      { header: 'Миқдор', key: 'quantity', width: 12 },
      { header: 'Арзиши умумӣ (сомонӣ)', key: 'totalCost', width: 20 },
      { header: 'Санаи воридот', key: 'arrival', width: 15 },
    ];

    products.forEach((p, i) => {
      const [y, m, d] = p.arrivalDate.split('-');
      ws.addRow({
        n: i + 1,
        name: p.name,
        category: p.category ?? '—',
        unit: p.unit,
        cost: p.costPrice,
        quantity: p.quantity,
        totalCost: round2(p.costPrice * p.quantity),
        arrival: `${d}.${m}.${y}`,
      });
    });

    const totalRow = ws.addRow({
      name: 'ҲАМАГӢ:',
      totalCost: round2(products.reduce((acc, p) => acc + p.costPrice * p.quantity, 0)),
    });
    totalRow.font = { bold: true };

    this.styleHeader(ws);
    ws.getColumn('cost').numFmt = '#,##0.00';
    ws.getColumn('totalCost').numFmt = '#,##0.00';

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf as ArrayBuffer);
  }
}
