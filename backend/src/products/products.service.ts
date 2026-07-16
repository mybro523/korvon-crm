import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EPS, round2, round3 } from '../common/numbers';
import { PointStock, Product } from '../entities';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
    @InjectRepository(PointStock) private readonly stockRepo: Repository<PointStock>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(search?: string, category?: string) {
    const qb = this.productsRepo.createQueryBuilder('p').orderBy('p.name', 'ASC');
    if (search) {
      qb.andWhere('p.name ILIKE :search', { search: `%${search.trim()}%` });
    }
    if (category) {
      qb.andWhere('p.category = :category', { category });
    }
    return qb.getMany();
  }

  async categories(): Promise<string[]> {
    const rows: { category: string }[] = await this.productsRepo
      .createQueryBuilder('p')
      .select('DISTINCT p.category', 'category')
      .where('p.category IS NOT NULL AND p.category != :empty', { empty: '' })
      .orderBy('category', 'ASC')
      .getRawMany();
    return rows.map((r) => r.category);
  }

  async create(dto: CreateProductDto) {
    const product = this.productsRepo.create({
      name: dto.name.trim(),
      category: dto.category?.trim() || null,
      unit: dto.unit.trim(),
      costPrice: round2(dto.costPrice),
      quantity: round3(dto.quantity),
      arrivalDate: dto.arrivalDate.slice(0, 10),
    });
    return this.productsRepo.save(product);
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.productsRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Мол ёфт нашуд');

    if (dto.name !== undefined) product.name = dto.name.trim();
    if (dto.category !== undefined) product.category = dto.category?.trim() || null;
    if (dto.unit !== undefined) product.unit = dto.unit.trim();
    if (dto.costPrice !== undefined) product.costPrice = round2(dto.costPrice);
    if (dto.quantity !== undefined) product.quantity = round3(dto.quantity);
    if (dto.arrivalDate !== undefined) product.arrivalDate = dto.arrivalDate.slice(0, 10);

    return this.productsRepo.save(product);
  }

  async remove(id: string) {
    // транзакция + блокировка защищают от гонки с одновременным transferToPoint
    return this.dataSource.transaction(async (em) => {
      const product = await em.findOne(Product, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product) throw new NotFoundException('Мол ёфт нашуд');

      const inPoints = await em
        .createQueryBuilder(PointStock, 's')
        .where('s.productId = :id AND s.quantity > :eps', { id, eps: EPS })
        .getCount();
      if (inPoints > 0) {
        throw new BadRequestException(
          'Ин мол дар нуқтаҳои фурӯш мавҷуд аст. Аввал онро ба анбор баргардонед',
        );
      }

      await em.remove(product);
      return { success: true };
    });
  }
}
