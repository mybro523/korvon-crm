import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { User } from '../entities';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QuerySalesDto } from './dto/query-sales.dto';
import { SalesService } from './sales.service';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get('available-products')
  availableProducts(
    @CurrentUser() user: User,
    @Query('source') source?: string,
    @Query('pointId') pointId?: string,
  ) {
    return this.salesService.availableProducts(user, source, pointId);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateSaleDto) {
    return this.salesService.create(user, dto);
  }

  @Get()
  findAll(@CurrentUser() user: User, @Query() q: QuerySalesDto) {
    return this.salesService.findAll(user, q);
  }
}
