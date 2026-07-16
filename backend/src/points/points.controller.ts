import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { User } from '../entities';
import { CreatePointDto, TransferDto, UpdatePointDto } from './dto/point.dto';
import { PointsService } from './points.service';

@Controller('points')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.pointsService.findAll(user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.pointsService.findOne(user, id);
  }

  @Post()
  @Roles('OWNER')
  create(@Body() dto: CreatePointDto) {
    return this.pointsService.create(dto);
  }

  @Patch(':id')
  @Roles('OWNER')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePointDto) {
    return this.pointsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('OWNER')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.pointsService.remove(id);
  }

  @Get(':id/stock')
  stock(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.pointsService.stock(user, id);
  }

  @Post(':id/transfer')
  @Roles('OWNER')
  transfer(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferDto,
  ) {
    return this.pointsService.transferToPoint(user, id, dto);
  }

  @Post(':id/return')
  @Roles('OWNER')
  returnToWarehouse(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferDto,
  ) {
    return this.pointsService.returnToWarehouse(user, id, dto);
  }

  @Get(':id/transfers')
  @Roles('OWNER')
  transfers(@Param('id', ParseUUIDPipe) id: string) {
    return this.pointsService.transfers(id);
  }
}
