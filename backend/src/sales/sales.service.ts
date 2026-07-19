import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { EPS, round2, round3 } from '../common/numbers';
import { buildLowStockMessage, buildSaleMessage } from '../common/sale-message';
import { normalizeFrom, normalizeTo } from '../common/tz';
import { Notification, Product, Sale, User } from '../entities';
import { SETTING_KEYS, SettingsService } from '../settings/settings.service';
import { TelegramService } from '../settings/telegram.service';
import { CreateSaleDto, MAX_MONEY, MSG_TOO_BIG } from './dto/create-sale.dto';
import { QuerySalesDto } from './dto/query-sales.dto';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    @InjectRepository(Sale) private readonly salesRepo: Repository<Sale>,
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly telegramService: TelegramService,
    private readonly settingsService: SettingsService,
  ) {}

  async create(user: User, dto: CreateSaleDto): Promise<Omit<Sale, 'costAtSale'>> {
    const qty = round3(dto.quantity);
    let unitPrice: number;
    let totalAmount: number;
    if (dto.saleType === 'WHOLESALE') {
      // опт: вводится общая сумма, цена единицы вычисляется
      totalAmount = round2(dto.totalAmount!);
      unitPrice = round2(totalAmount / qty);
    } else {
      // розница: вводится цена единицы, сумма вычисляется
      unitPrice = round2(dto.unitPrice!);
      totalAmount = round2(unitPrice * qty);
    }
    // вычисленные значения тоже не должны превышать предел numeric(14,2) — иначе 500 от БД
    if (unitPrice > MAX_MONEY || totalAmount > MAX_MONEY) {
      throw new BadRequestException(MSG_TOO_BIG);
    }

    let lowStockAlertHtml: string | null = null;

    const sale = await this.dataSource.transaction(async (em) => {
      // продажа идёт из ТОЧКИ ПРОДАЖИ; блокировка защищает от гонок при параллельных продажах
      const product = await em.findOne(Product, {
        where: { id: dto.productId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product) throw new NotFoundException('Мол ёфт нашуд');
      if (product.shopQty + EPS < qty) {
        throw new BadRequestException(
          `Дар нуқтаи фурӯш танҳо ${product.shopQty} ${product.unit} мавҷуд аст`,
        );
      }
      product.shopQty = round3(product.shopQty - qty);

      // порог «мало товара»: оповещаем один раз при пересечении
      if (
        product.shopQty <= product.lowStockThreshold + EPS &&
        !product.lowStockNotified
      ) {
        product.lowStockNotified = true;
        lowStockAlertHtml = buildLowStockMessage(product, true);
        await em.save(
          em.create(Notification, {
            message: buildLowStockMessage(product, false),
            saleId: null,
          }),
        );
      }
      await em.save(product);

      const saleEntity = em.create(Sale, {
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        sellerId: user.id,
        sellerName: user.fullName,
        saleType: dto.saleType,
        paymentMethod: dto.paymentMethod,
        quantity: qty,
        unitPrice,
        totalAmount,
        costAtSale: product.costPrice,
      });
      const saved = await em.save(saleEntity);

      // уведомление владельцу — в той же транзакции
      await em.save(
        em.create(Notification, {
          message: buildSaleMessage(saved, false),
          saleId: saved.id,
        }),
      );

      return saved;
    });

    // Telegram — после коммита, не блокирует ответ и не ломает продажу при сбое
    this.notifyTelegram(sale).catch((e) => {
      this.logger.warn(`Огоҳинома ба Telegram нарафт: ${e?.message ?? e}`);
    });
    if (lowStockAlertHtml) {
      // предупреждение о низком остатке — владельцам в Telegram
      this.notifyOwnersText(lowStockAlertHtml).catch((e) => {
        this.logger.warn(`Low-stock Telegram нарафт: ${e?.message ?? e}`);
      });
    }

    return this.stripCost(sale);
  }

  /** произвольный текст всем подключённым владельцам (+ legacy chat id) */
  private async notifyOwnersText(text: string): Promise<void> {
    const chatIds = new Set<string>();
    const owners = await this.usersRepo.find({ where: { role: 'OWNER', isActive: true } });
    for (const o of owners) if (o.telegramChatId) chatIds.add(o.telegramChatId);
    const legacy = (await this.settingsService.get(SETTING_KEYS.TELEGRAM_CHAT_ID)).trim();
    if (legacy) chatIds.add(legacy);
    for (const chatId of chatIds) {
      const r = await this.telegramService.sendToChat(chatId, text);
      if (!r.ok) this.logger.warn(`Telegram → ${chatId}: ${r.error}`);
    }
  }

  /** уведомления: всем подключённым владельцам, продавцу — чек, плюс legacy chat id */
  private async notifyTelegram(sale: Sale): Promise<void> {
    const text = buildSaleMessage(sale, true);
    const chatIds = new Set<string>();

    const owners = await this.usersRepo.find({ where: { role: 'OWNER', isActive: true } });
    for (const o of owners) {
      if (o.telegramChatId) chatIds.add(o.telegramChatId);
    }
    if (sale.sellerId) {
      const seller = await this.usersRepo.findOne({ where: { id: sale.sellerId } });
      if (seller?.telegramChatId) chatIds.add(seller.telegramChatId);
    }

    // legacy: chat id из настроек (если задан вручную)
    const legacy = (await this.settingsService.get(SETTING_KEYS.TELEGRAM_CHAT_ID)).trim();
    if (legacy) chatIds.add(legacy);

    for (const chatId of chatIds) {
      const r = await this.telegramService.sendToChat(chatId, text);
      if (!r.ok) this.logger.warn(`Telegram → ${chatId}: ${r.error}`);
    }
  }

  /** себестоимость — коммерческая тайна; наружу не отдаём (аналитика считает прибыль в SQL) */
  private stripCost(sale: Sale): Omit<Sale, 'costAtSale'> {
    const { costAtSale: _cost, ...rest } = sale;
    return rest as Omit<Sale, 'costAtSale'>;
  }

  async findAll(user: User, q: QuerySalesDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;

    const items = await this.buildFilteredQb(user, q)
      .orderBy('s.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    const total = await this.buildFilteredQb(user, q).getCount();
    const sumRow = await this.buildFilteredQb(user, q)
      .select('COALESCE(SUM(s.totalAmount), 0)', 'sum')
      .getRawOne<{ sum: string }>();

    return {
      items: items.map((s) => this.stripCost(s)),
      total,
      page,
      limit,
      totalAmount: parseFloat(sumRow?.sum ?? '0'),
    };
  }

  private buildFilteredQb(user: User, q: QuerySalesDto): SelectQueryBuilder<Sale> {
    const qb = this.salesRepo.createQueryBuilder('s');

    // продавец видит только свои продажи; владелец — все (+ фильтр по продавцу)
    if (user.role === 'SELLER') {
      qb.andWhere('s.sellerId = :uid', { uid: user.id });
    } else if (q.sellerId) {
      qb.andWhere('s.sellerId = :sellerId', { sellerId: q.sellerId });
    }
    if (q.from) qb.andWhere('s.createdAt >= :from', { from: normalizeFrom(q.from) });
    if (q.to) qb.andWhere('s.createdAt <= :to', { to: normalizeTo(q.to) });
    if (q.paymentMethod) qb.andWhere('s.paymentMethod = :pm', { pm: q.paymentMethod });
    if (q.saleType) qb.andWhere('s.saleType = :st', { st: q.saleType });
    if (q.search) {
      qb.andWhere('s.productName ILIKE :search', { search: `%${q.search.trim()}%` });
    }
    if (q.productName) qb.andWhere('s.productName = :pn', { pn: q.productName });
    return qb;
  }

  /** витрина: все товары; available = остаток в точке продажи */
  async availableProducts() {
    const products = await this.productsRepo
      .createQueryBuilder('p')
      .orderBy('p.name', 'ASC')
      .getMany();
    return products.map((p) => ({
      productId: p.id,
      name: p.name,
      category: p.category,
      unit: p.unit,
      available: p.shopQty,
      warehouseQty: p.quantity,
      hasPhoto: p.hasPhoto,
      photoRev: p.photoRev,
    }));
  }
}
