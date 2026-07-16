import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product, Sale } from '../entities';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, Product])],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
