import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SETTING_KEYS, SettingsService } from './settings.service';
import { TelegramService } from './telegram.service';

class UpdateSettingsDto {
  @IsOptional()
  @IsString({ message: 'Токени бот нодуруст аст' })
  telegramBotToken?: string;

  @IsOptional()
  @IsString({ message: 'Chat ID нодуруст аст' })
  telegramChatId?: string;
}

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly telegramService: TelegramService,
  ) {}

  @Get()
  getAll() {
    return this.settingsService.getAll();
  }

  @Put()
  async update(@Body() dto: UpdateSettingsDto) {
    if (dto.telegramBotToken !== undefined) {
      await this.settingsService.set(SETTING_KEYS.TELEGRAM_BOT_TOKEN, dto.telegramBotToken.trim());
    }
    if (dto.telegramChatId !== undefined) {
      await this.settingsService.set(SETTING_KEYS.TELEGRAM_CHAT_ID, dto.telegramChatId.trim());
    }
    return this.settingsService.getAll();
  }

  @Post('telegram-test')
  telegramTest() {
    return this.telegramService.sendMessage(
      '✅ <b>Корвон</b>: пайвастшавӣ бо Telegram бомуваффақият танзим шуд!',
    );
  }
}
