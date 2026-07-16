import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesPoint, User } from '../entities';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, SalesPoint])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
