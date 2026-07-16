import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('unread', new DefaultValuePipe(false), ParseBoolPipe) unread: boolean,
  ) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    return this.notificationsService.findAll(safePage, safeLimit, unread);
  }

  @Get('unread-count')
  unreadCount() {
    return this.notificationsService.unreadCount();
  }

  @Patch(':id/read')
  markRead(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.markRead(id);
  }

  @Post('read-all')
  markAllRead() {
    return this.notificationsService.markAllRead();
  }
}
