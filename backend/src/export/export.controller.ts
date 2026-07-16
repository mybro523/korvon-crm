import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { QuerySalesDto } from '../sales/dto/query-sales.dto';
import { ExportService } from './export.service';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Controller('export')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('sales')
  async sales(
    @Query() q: QuerySalesDto,
    @Res() res: Response,
    @Query('tz') tz?: string,
  ) {
    const buf = await this.exportService.sales(q, tz);
    const date = new Date().toISOString().slice(0, 10);
    res.set({
      'Content-Type': XLSX_MIME,
      'Content-Disposition': `attachment; filename="korvon-sales-${date}.xlsx"`,
    });
    res.send(buf);
  }

  @Get('warehouse')
  async warehouse(@Res() res: Response) {
    const buf = await this.exportService.warehouse();
    const date = new Date().toISOString().slice(0, 10);
    res.set({
      'Content-Type': XLSX_MIME,
      'Content-Disposition': `attachment; filename="korvon-warehouse-${date}.xlsx"`,
    });
    res.send(buf);
  }
}
