import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/**
 * Глобальный модуль: экспортирует репозиторий User,
 * чтобы JwtAuthGuard работал в любом модуле без лишних импортов.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [TypeOrmModule],
})
export class AuthModule {}
