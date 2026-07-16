import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { publicUser } from '../common/user.util';
import { SalesPoint, User } from '../entities';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(SalesPoint) private readonly pointsRepo: Repository<SalesPoint>,
  ) {}

  async findAll() {
    const users = await this.usersRepo.find({
      relations: { point: true },
      order: { createdAt: 'ASC' },
    });
    return users.map(publicUser);
  }

  async create(dto: CreateUserDto) {
    const username = dto.username.trim().toLowerCase();
    const exists = await this.usersRepo.findOne({ where: { username } });
    if (exists) throw new ConflictException('Ин номи корбар банд аст');

    const pointId = await this.resolvePointId(dto.role, dto.pointId ?? null);

    const user = this.usersRepo.create({
      fullName: dto.fullName.trim(),
      username,
      passwordHash: await bcrypt.hash(dto.password, 10),
      role: dto.role,
      pointId,
    });
    const saved = await this.usersRepo.save(user);
    return publicUser((await this.usersRepo.findOne({
      where: { id: saved.id },
      relations: { point: true },
    }))!);
  }

  async update(id: string, dto: UpdateUserDto, actor: User) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Корбар ёфт нашуд');

    if (dto.username !== undefined) {
      const username = dto.username.trim().toLowerCase();
      if (username !== user.username) {
        const exists = await this.usersRepo.findOne({ where: { username } });
        if (exists) throw new ConflictException('Ин номи корбар банд аст');
        user.username = username;
      }
    }

    if (dto.fullName !== undefined) user.fullName = dto.fullName.trim();
    if (dto.password !== undefined && dto.password !== '') {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const newRole = dto.role ?? user.role;
    const newActive = dto.isActive ?? user.isActive;

    // нельзя лишить систему последнего активного владельца
    if (user.role === 'OWNER' && (newRole !== 'OWNER' || !newActive)) {
      await this.ensureNotLastOwner(user.id);
    }
    if (actor.id === user.id && (newRole !== 'OWNER' || !newActive)) {
      throw new BadRequestException('Худро тағйир додан мумкин нест');
    }

    user.role = newRole;
    user.isActive = newActive;

    if (dto.pointId !== undefined) {
      user.pointId = await this.resolvePointId(user.role, dto.pointId);
    } else if (user.role === 'OWNER') {
      user.pointId = null;
    }

    await this.usersRepo.save(user);
    return publicUser((await this.usersRepo.findOne({
      where: { id: user.id },
      relations: { point: true },
    }))!);
  }

  async remove(id: string, actor: User) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Корбар ёфт нашуд');
    if (user.id === actor.id) {
      throw new BadRequestException('Худро нест кардан мумкин нест');
    }
    if (user.role === 'OWNER') {
      await this.ensureNotLastOwner(user.id);
    }
    await this.usersRepo.remove(user);
    return { success: true };
  }

  private async ensureNotLastOwner(exceptId: string) {
    const owners = await this.usersRepo
      .createQueryBuilder('u')
      .where('u.role = :role AND u.isActive = true AND u.id != :id', {
        role: 'OWNER',
        id: exceptId,
      })
      .getCount();
    if (owners === 0) {
      throw new BadRequestException('Соҳиби охирини системаро тағйир додан мумкин нест');
    }
  }

  private async resolvePointId(role: string, pointId: string | null): Promise<string | null> {
    if (role === 'OWNER' || !pointId) return null;
    const point = await this.pointsRepo.findOne({ where: { id: pointId } });
    if (!point) throw new BadRequestException('Нуқтаи фурӯш ёфт нашуд');
    return point.id;
  }
}
