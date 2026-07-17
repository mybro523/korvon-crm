import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EPS, round3 } from '../common/numbers';
import { PointStock, Product, SalesPoint, Transfer, User } from '../entities';
import { CreatePointDto, TransferDto, UpdatePointDto } from './dto/point.dto';

@Injectable()
export class PointsService {
  constructor(
    @InjectRepository(SalesPoint) private readonly pointsRepo: Repository<SalesPoint>,
    @InjectRepository(PointStock) private readonly stockRepo: Repository<PointStock>,
    @InjectRepository(Transfer) private readonly transfersRepo: Repository<Transfer>,
    private readonly dataSource: DataSource,
  ) {}

  /** продавец видит только свою точку */
  private assertAccess(user: User, pointId: string) {
    if (user.role !== 'OWNER' && user.pointId !== pointId) {
      throw new ForbiddenException('Шумо ба ин нуқтаи фурӯш дастрасӣ надоред');
    }
  }

  async findAll(user: User) {
    const qb = this.pointsRepo.createQueryBuilder('p').orderBy('p.createdAt', 'ASC');
    if (user.role !== 'OWNER') {
      qb.where('p.id = :id', { id: user.pointId ?? '00000000-0000-0000-0000-000000000000' });
    }
    const points = await qb.getMany();

    // количество позиций с ненулевым остатком в каждой точке
    const counts: { pointId: string; items: string }[] = await this.stockRepo
      .createQueryBuilder('s')
      .select('s.pointId', 'pointId')
      .addSelect('COUNT(*) FILTER (WHERE s.quantity > 0)', 'items')
      .groupBy('s.pointId')
      .getRawMany();
    const byPoint = new Map(counts.map((c) => [c.pointId, parseInt(c.items, 10) || 0]));

    return points.map((p) => ({ ...p, stockItems: byPoint.get(p.id) ?? 0 }));
  }

  async findOne(user: User, id: string) {
    this.assertAccess(user, id);
    const point = await this.pointsRepo.findOne({ where: { id } });
    if (!point) throw new NotFoundException('Нуқтаи фурӯш ёфт нашуд');
    return point;
  }

  async create(dto: CreatePointDto) {
    const point = this.pointsRepo.create({
      name: dto.name.trim(),
      address: dto.address?.trim() || null,
    });
    return this.pointsRepo.save(point);
  }

  async update(id: string, dto: UpdatePointDto) {
    const point = await this.pointsRepo.findOne({ where: { id } });
    if (!point) throw new NotFoundException('Нуқтаи фурӯш ёфт нашуд');
    if (dto.name !== undefined) point.name = dto.name.trim();
    if (dto.address !== undefined) point.address = dto.address?.trim() || null;
    return this.pointsRepo.save(point);
  }

  async remove(id: string) {
    // транзакция + блокировка защищают от гонки с одновременным transferToPoint
    return this.dataSource.transaction(async (em) => {
      const point = await em.findOne(SalesPoint, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!point) throw new NotFoundException('Нуқтаи фурӯш ёфт нашуд');

      const withStock = await em
        .createQueryBuilder(PointStock, 's')
        .where('s.pointId = :id AND s.quantity > :eps', { id, eps: EPS })
        .getCount();
      if (withStock > 0) {
        throw new BadRequestException(
          'Дар ин нуқта мол мавҷуд аст. Аввал молҳоро ба анбор баргардонед',
        );
      }

      await em.remove(point);
      return { success: true };
    });
  }

  /** остатки точки; себестоимость видит только владелец */
  async stock(user: User, pointId: string) {
    this.assertAccess(user, pointId);
    const point = await this.pointsRepo.findOne({ where: { id: pointId } });
    if (!point) throw new NotFoundException('Нуқтаи фурӯш ёфт нашуд');

    const rows = await this.stockRepo.find({
      where: { pointId },
      relations: { product: true },
    });

    return rows
      .filter((r) => r.product)
      .map((r) => ({
        productId: r.productId,
        name: r.product.name,
        category: r.product.category,
        unit: r.product.unit,
        quantity: r.quantity,
        hasPhoto: r.product.hasPhoto,
        photoRev: r.product.photoRev,
        ...(user.role === 'OWNER' ? { costPrice: r.product.costPrice } : {}),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'tg'));
  }

  /** передача товара: склад → точка */
  async transferToPoint(user: User, pointId: string, dto: TransferDto) {
    const qty = round3(dto.quantity);
    return this.dataSource.transaction(async (em) => {
      const point = await em.findOne(SalesPoint, { where: { id: pointId } });
      if (!point) throw new NotFoundException('Нуқтаи фурӯш ёфт нашуд');

      const product = await em.findOne(Product, {
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

      // upsert без гонок: сперва INSERT ... ON CONFLICT DO NOTHING, потом лочим строку
      await em
        .createQueryBuilder()
        .insert()
        .into(PointStock)
        .values({ pointId, productId: dto.productId, quantity: 0 })
        .orIgnore()
        .execute();
      const stock = (await em.findOne(PointStock, {
        where: { pointId, productId: dto.productId },
        lock: { mode: 'pessimistic_write' },
      }))!;
      stock.quantity = round3(stock.quantity + qty);
      await em.save(stock);

      await em.save(
        em.create(Transfer, {
          productId: product.id,
          productName: product.name,
          unit: product.unit,
          pointId,
          direction: 'TO_POINT',
          quantity: qty,
          userName: user.fullName,
        }),
      );

      return { success: true, warehouseQuantity: product.quantity, pointQuantity: stock.quantity };
    });
  }

  /** возврат товара: точка → склад */
  async returnToWarehouse(user: User, pointId: string, dto: TransferDto) {
    const qty = round3(dto.quantity);
    return this.dataSource.transaction(async (em) => {
      const point = await em.findOne(SalesPoint, { where: { id: pointId } });
      if (!point) throw new NotFoundException('Нуқтаи фурӯш ёфт нашуд');

      // порядок блокировок всегда: Product → PointStock (защита от deadlock)
      const product = await em.findOne(Product, {
        where: { id: dto.productId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product) throw new NotFoundException('Мол ёфт нашуд');

      const stock = await em.findOne(PointStock, {
        where: { pointId, productId: dto.productId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!stock || stock.quantity + EPS < qty) {
        throw new BadRequestException(
          `Дар нуқта танҳо ${stock?.quantity ?? 0} ${product.unit} мавҷуд аст`,
        );
      }

      stock.quantity = round3(stock.quantity - qty);
      if (stock.quantity <= EPS) {
        await em.remove(stock);
      } else {
        await em.save(stock);
      }

      product.quantity = round3(product.quantity + qty);
      await em.save(product);

      await em.save(
        em.create(Transfer, {
          productId: product.id,
          productName: product.name,
          unit: product.unit,
          pointId,
          direction: 'TO_WAREHOUSE',
          quantity: qty,
          userName: user.fullName,
        }),
      );

      return { success: true, warehouseQuantity: product.quantity };
    });
  }

  async transfers(pointId: string) {
    const point = await this.pointsRepo.findOne({ where: { id: pointId } });
    if (!point) throw new NotFoundException('Нуқтаи фурӯш ёфт нашуд');
    return this.transfersRepo.find({
      where: { pointId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
}
