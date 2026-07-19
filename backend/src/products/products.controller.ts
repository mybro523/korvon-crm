import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { MAX_QTY, MSG_TOO_BIG } from '../sales/dto/create-sale.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

class TransferDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Миқдор нодуруст аст' })
  @Min(0.001, { message: 'Миқдор бояд аз сифр зиёд бошад' })
  @Max(MAX_QTY, { message: MSG_TOO_BIG })
  quantity: number;
}

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query('search') search?: string, @Query('category') category?: string) {
    return this.productsService.findAll(search, category);
  }

  @Get('categories')
  categories() {
    return this.productsService.categories();
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }

  /** перенос со склада в точку продажи */
  @Post(':id/transfer')
  transfer(@Param('id', ParseUUIDPipe) id: string, @Body() dto: TransferDto) {
    return this.productsService.transferToShop(id, dto.quantity);
  }
}
