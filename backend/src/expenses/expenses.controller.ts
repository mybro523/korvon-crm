import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { User } from '../entities';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { ExpensesService } from './expenses.service';

@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  // добавлять и смотреть расходы могут владелец и продавцы
  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(user, dto);
  }

  @Get()
  findAll(@Query() q: QueryExpensesDto) {
    return this.expensesService.findAll(q);
  }

  // удаление — только владелец (защита финансовой записи)
  @Delete(':id')
  @Roles('OWNER')
  remove(@Param('id') id: string) {
    return this.expensesService.remove(id);
  }
}
