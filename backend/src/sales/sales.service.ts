import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { EPS, round2, round3 } from '../common/numbers';
import { buildSaleMessage } from '../common/sale-message';
import { normalizeFrom, normalizeTo } from '../common/tz';
import {
  Notification,
  PointStock,
  Product,
  Sale,
  SalesPoint,
  User,
} from '../entities';
import { TelegramService } from '../settings/telegram.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QuerySalesDto } from './dto/query-sales.dto';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    @InjectRepository(Sale) private readonly salesRepo: Repository<Sale>,
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
    @InjectRepository(PointStock) private readonly stockRepo: Repository<PointStock>,
    private readonly dataSource: DataSource,
    private readonly telegramService: TelegramService,
  ) {}

  async create(user: User, dto: CreateSaleDto): Promise<Omit<Sale, 'costAtSale'>> {
    let source = dto.source;
    let pointId = dto.pointId ?? null;

    // продавец всегда продаёт только из своей точки
    if (user.role === 'SELLER') {
      if (!user.pointId) {
        throw new BadRequestException('Ба шумо нуқтаи фурӯш вобаста карда нашудааст');
      }
      source = 'POINT';
      pointId = user.pointId;
    }
    if (source === 'WAREHOUSE') pointId = null;
    if (source === 'POINT' && !pointId) {
      throw new BadRequestException('Нуқтаи фурӯшро интихоб кунед');
    }

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

    const sale = await this.dataSource.transaction(async (em) => {
      let pointName: string | null = null;
      let product: Product | null;

      if (source === 'WAREHOUSE') {
        product = await em.findOne(Product, {
          where: { id: dto.productId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!product) throw new NotFoundException('Мол ёфт нашуд');
        if (product.quantity + EPS < qty) {
          throw new BadRequestException(
            `Дар анбор танҳо ${product.quantity} ${product.unit} мавҷуд аст`,
          );
        }
        product.quantity = round3(product.quantity - qty);
        await em.save(product);
      } else {
        const point = await em.findOne(SalesPoint, { where: { id: pointId! } });
        if (!point) throw new NotFoundException('Нуқтаи фурӯш ёфт нашуд');
        pointName = point.name;

        product = await em.findOne(Product, { where: { id: dto.productId } });
        if (!product) throw new NotFoundException('Мол ёфт нашуд');

        const stock = await em.findOne(PointStock, {
          where: { pointId: pointId!, productId: dto.productId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!stock || stock.quantity + EPS < qty) {
          throw new BadRequestException(
            `Дар нуқтаи фурӯш танҳо ${stock?.quantity ?? 0} ${product.unit} мавҷуд аст`,
          );
        }
        stock.quantity = round3(stock.quantity - qty);
        await em.save(stock);
      }

      const saleEntity = em.create(Sale, {
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        source,
        pointId,
        pointName,
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
    this.telegramService
      .sendMessage(buildSaleMessage(sale, true))
      .then((r) => {
        if (!r.ok) this.logger.warn(`Огоҳинома ба Telegram нарафт: ${r.error}`);
      })
      .catch((e) => {
        this.logger.warn(`Огоҳинома ба Telegram нарафт: ${e?.message ?? e}`);
      });

    return this.stripCost(sale);
  }

  /** себестоимость — коммерческая тайна; наружу не отдаём (аналитика считает прибыль в SQL) */
  private stripCost(sale: Sale): Omit<Sale, 'costAtSale'> {
    const { costAtSale: _cost, ...rest } = sale;
    return rest as Omit<Sale, 'costAtSale'>;
  }

  async findAll(user: User, q: QuerySalesDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;

    if (user.role === 'SELLER' && !user.pointId) {
      return { items: [], total: 0, page, limit, totalAmount: 0 };
    }

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

    if (user.role === 'SELLER') {
      qb.andWhere('s.pointId = :userPointId', { userPointId: user.pointId });
    } else {
      if (q.pointId) qb.andWhere('s.pointId = :pointId', { pointId: q.pointId });
      if (q.source) qb.andWhere('s.source = :source', { source: q.source });
      if (q.sellerId) qb.andWhere('s.sellerId = :sellerId', { sellerId: q.sellerId });
    }
    if (q.from) qb.andWhere('s.createdAt >= :from', { from: normalizeFrom(q.from) });
    if (q.to) qb.andWhere('s.createdAt <= :to', { to: normalizeTo(q.to) });
    if (q.paymentMethod) qb.andWhere('s.paymentMethod = :pm', { pm: q.paymentMethod });
    if (q.saleType) qb.andWhere('s.saleType = :st', { st: q.saleType });
    if (q.search) {
      qb.andWhere('s.productName ILIKE :search', { search: `%${q.search.trim()}%` });
    }
    return qb;
  }

  /** товары, доступные для продажи из выбранного источника */
  async availableProducts(user: User, source?: string, pointId?: string) {
    let src: 'WAREHOUSE' | 'POINT' | null =
      source === 'WAREHOUSE' ? 'WAREHOUSE' : source === 'POINT' ? 'POINT' : null;
    let pid = pointId ?? null;

    if (user.role === 'SELLER') {
      if (!user.pointId) {
        throw new BadRequestException('Ба шумо нуқтаи фурӯш вобаста карда нашудааст');
      }
      src = 'POINT';
      pid = user.pointId;
    }

    if (src === 'WAREHOUSE') {
      const products = await this.productsRepo
        .createQueryBuilder('p')
        .where('p.quantity > 0')
        .orderBy('p.name', 'ASC')
        .getMany();
      return products.map((p) => ({
        productId: p.id,
        name: p.name,
        category: p.category,
        unit: p.unit,
        available: p.quantity,
      }));
    }

    if (!pid) throw new BadRequestException('Нуқтаи фурӯшро интихоб кунед');

    const rows = await this.stockRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.product', 'p')
      .where('s.pointId = :pid AND s.quantity > 0', { pid })
      .getMany();

    return rows
      .filter((r) => r.product)
      .map((r) => ({
        productId: r.productId,
        name: r.product.name,
        category: r.product.category,
        unit: r.product.unit,
        available: r.quantity,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'tg'));
  }
}
