import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from '../entities';

/** при первом запуске создаёт владельца системы */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(@InjectRepository(User) private readonly usersRepo: Repository<User>) {}

  async onApplicationBootstrap() {
    const count = await this.usersRepo.count();
    if (count > 0) return;

    const password = process.env.ADMIN_INITIAL_PASSWORD || 'admin123';
    const owner = this.usersRepo.create({
      fullName: 'Соҳиби система',
      username: 'admin',
      passwordHash: await bcrypt.hash(password, 10),
      role: 'OWNER',
    });
    await this.usersRepo.save(owner);
    this.logger.log(`Создан владелец по умолчанию: admin / ${password}`);
    if (!process.env.ADMIN_INITIAL_PASSWORD) {
      this.logger.warn(
        '⚠️  Используется стандартный пароль admin123 — ОБЯЗАТЕЛЬНО смените его в разделе «Корбарон» или задайте ADMIN_INITIAL_PASSWORD!',
      );
    }
  }
}
