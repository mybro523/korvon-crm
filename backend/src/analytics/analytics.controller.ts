import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  summary(@Query() q: AnalyticsQueryDto) {
    return this.analyticsService.summary(q);
  }

  @Get('daily')
  daily(@Query() q: AnalyticsQueryDto) {
    return this.analyticsService.daily(q);
  }

  @Get('top-products')
  topProducts(@Query() q: AnalyticsQueryDto) {
    return this.analyticsService.topProducts(q);
  }

  @Get('by-points')
  byPoints(@Query() q: AnalyticsQueryDto) {
    return this.analyticsService.byPoints(q);
  }
}
