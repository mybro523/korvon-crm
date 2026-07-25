import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { normalizeFrom, normalizeTo } from '../common/tz';
import { Expense, User } from '../entities';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense) private readonly expensesRepo: Repository<Expense>,
  ) {}

  async create(user: User, dto: CreateExpenseDto) {
    // дата/время фиксируется автоматически (CreateDateColumn timestamptz)
    const expense = this.expensesRepo.create({
      amount: round2(dto.amount),
      comment: dto.comment.trim(),
      createdById: user.id,
      createdByName: user.fullName,
    });
    return this.expensesRepo.save(expense);
  }

  async findAll(q: QueryExpensesDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 50;

    const items = await this.buildQb(q)
      .orderBy('e.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    const total = await this.buildQb(q).getCount();
    const sumRow = await this.buildQb(q)
      .select('COALESCE(SUM(e.amount), 0)', 'sum')
      .getRawOne<{ sum: string }>();

    return {
      items,
      total,
      page,
      limit,
      totalAmount: parseFloat(sumRow?.sum ?? '0'),
    };
  }

  async remove(id: string) {
    const expense = await this.expensesRepo.findOne({ where: { id } });
    if (!expense) throw new NotFoundException('Хароҷот ёфт нашуд');
    await this.expensesRepo.remove(expense);
    return { success: true };
  }

  private buildQb(q: QueryExpensesDto): SelectQueryBuilder<Expense> {
    const qb = this.expensesRepo.createQueryBuilder('e');
    if (q.from) qb.andWhere('e.createdAt >= :from', { from: normalizeFrom(q.from) });
    if (q.to) qb.andWhere('e.createdAt <= :to', { to: normalizeTo(q.to) });
    if (q.search) qb.andWhere('e.comment ILIKE :search', { search: `%${q.search.trim()}%` });
    return qb;
  }
}
