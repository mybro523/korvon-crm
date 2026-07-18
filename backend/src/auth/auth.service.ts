import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { publicUser } from '../common/user.util';
import { User } from '../entities';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const username = dto.username.trim().toLowerCase();
    const user = await this.usersRepo.findOne({ where: { username } });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Номи корбар ё гузарвожа нодуруст аст');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Ҳисоби шумо ғайрифаъол карда шудааст');
    }

    const accessToken = await this.jwtService.signAsync({ sub: user.id, role: user.role });
    return { accessToken, user: publicUser(user) };
  }
}
