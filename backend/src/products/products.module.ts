import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointStock, Product } from '../entities';
import { ProductPhotoController } from './product-photo.controller';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product, PointStock])],
  controllers: [ProductsController, ProductPhotoController],
  providers: [ProductsService],
})
export class ProductsModule {}
