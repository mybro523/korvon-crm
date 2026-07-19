import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EPS, round2, round3 } from '../common/numbers';
import { Product } from '../entities';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
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
      sellPrice: round2(dto.sellPrice),
      // новый товар поступает на СКЛАД; в точку привозят переносом
      quantity: round3(dto.quantity),
      shopQty: 0,
      lowStockThreshold: dto.lowStockThreshold !== undefined ? round3(dto.lowStockThreshold) : 15,
      description: dto.description?.trim() || null,
      arrivalDate: dto.arrivalDate.slice(0, 10),
    });
    this.applyPhoto(product, dto.photo);
    const saved = await this.productsRepo.save(product);
    return this.stripPhoto(saved);
  }

  async update(id: string, dto: UpdateProductDto) {
    // транзакция + блокировка: PATCH не должен затирать конкурентные продажи/переносы
    // (без лока save() записал бы устаревшие shopQty/quantity/lowStockNotified)
    return this.dataSource.transaction(async (em) => {
      const product = await em.findOne(Product, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product) throw new NotFoundException('Мол ёфт нашуд');

      if (dto.name !== undefined) product.name = dto.name.trim();
      if (dto.category !== undefined) product.category = dto.category?.trim() || null;
      if (dto.unit !== undefined) product.unit = dto.unit.trim();
      if (dto.costPrice !== undefined) product.costPrice = round2(dto.costPrice);
      if (dto.sellPrice !== undefined) product.sellPrice = round2(dto.sellPrice);
      if (dto.quantity !== undefined) product.quantity = round3(dto.quantity);
      if (dto.lowStockThreshold !== undefined) {
        product.lowStockThreshold = round3(dto.lowStockThreshold);
        // порог изменился — переоцениваем флаг оповещения (shopQty здесь свежий, под локом)
        if (product.shopQty > product.lowStockThreshold) product.lowStockNotified = false;
      }
      if (dto.description !== undefined) product.description = dto.description?.trim() || null;
      if (dto.arrivalDate !== undefined) product.arrivalDate = dto.arrivalDate.slice(0, 10);
      this.applyPhoto(product, dto.photo);

      const saved = await em.save(product);
      return this.stripPhoto(saved);
    });
  }

  /** dto.photo: undefined — не трогать; '' — удалить; data:image/...;base64,... — заменить */
  private applyPhoto(product: Product, photo?: string) {
    if (photo === undefined) return;
    if (photo === '') {
      product.photo = null;
      product.photoMime = null;
      product.hasPhoto = false;
      product.photoRev = (product.photoRev ?? 0) + 1;
      return;
    }
    const m = photo.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!m) throw new BadRequestException('Формати сурат нодуруст аст');
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 2 * 1024 * 1024) {
      throw new BadRequestException('Сурат хеле калон аст');
    }
    product.photo = buf;
    product.photoMime = m[1];
    product.hasPhoto = true;
    product.photoRev = (product.photoRev ?? 0) + 1;
  }

  /** байты фото не возвращаем в JSON-ответах */
  private stripPhoto(product: Product): Omit<Product, 'photo'> {
    const { photo: _photo, ...rest } = product;
    return rest as Omit<Product, 'photo'>;
  }

  /** для публичного эндпоинта отдачи картинки */
  async getPhoto(id: string): Promise<{ buf: Buffer; mime: string }> {
    const row = await this.productsRepo
      .createQueryBuilder('p')
      .select(['p.id'])
      .addSelect('p.photo')
      .addSelect('p.photoMime')
      .where('p.id = :id', { id })
      .getOne();
    if (!row || !row.photo) throw new NotFoundException('Сурат ёфт нашуд');
    return { buf: row.photo, mime: row.photoMime ?? 'image/jpeg' };
  }

  async remove(id: string) {
    const product = await this.productsRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Мол ёфт нашуд');
    await this.productsRepo.remove(product);
    return { success: true };
  }

  /** перенос со склада в точку продажи: склад списывается автоматически, точка пополняется */
  async transferToShop(id: string, qty: number) {
    const q = round3(qty);
    if (q <= 0) throw new BadRequestException('Миқдор бояд аз сифр зиёд бошад');

    return this.dataSource.transaction(async (em) => {
      const product = await em.findOne(Product, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product) throw new NotFoundException('Мол ёфт нашуд');
      if (product.quantity + EPS < q) {
        throw new BadRequestException(
          `Дар анбор танҳо ${product.quantity} ${product.unit} мавҷуд аст`,
        );
      }

      product.quantity = round3(product.quantity - q);
      product.shopQty = round3(product.shopQty + q);
      // точка пополнена выше порога — оповещение снова активно
      if (product.shopQty > product.lowStockThreshold) product.lowStockNotified = false;

      const saved = await em.save(product);
      return this.stripPhoto(saved);
    });
  }
}
