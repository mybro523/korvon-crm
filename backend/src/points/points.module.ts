import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointStock, Product, SalesPoint, Transfer } from '../entities';
import { PointsController } from './points.controller';
import { PointsService } from './points.service';

@Module({
  imports: [TypeOrmModule.forFeature([SalesPoint, PointStock, Product, Transfer])],
  controllers: [PointsController],
  providers: [PointsService],
})
export class PointsModule {}
