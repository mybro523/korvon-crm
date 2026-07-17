import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification, PointStock, Product, Sale, SalesPoint, User } from '../entities';
import { SettingsModule } from '../settings/settings.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, Product, PointStock, SalesPoint, Notification, User]),
    SettingsModule,
  ],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
