import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { User } from '../entities';
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
    let telegram:
      | { ok: boolean; webhookRegistered?: boolean; error?: string }
      | undefined;

    if (dto.telegramBotToken !== undefined) {
      const newToken = dto.telegramBotToken.trim();
      if (newToken) {
        // сохраняем прежний токен, чтобы откатиться при невалидном новом
        const prev = await this.settingsService.get(SETTING_KEYS.TELEGRAM_BOT_TOKEN);
        await this.settingsService.set(SETTING_KEYS.TELEGRAM_BOT_TOKEN, newToken);
        const conf = await this.telegramService.configureBot();
        if (!conf.ok) {
          // токен нерабочий — возвращаем предыдущую конфигурацию
          await this.settingsService.set(SETTING_KEYS.TELEGRAM_BOT_TOKEN, prev);
        }
        telegram = {
          ok: conf.ok,
          webhookRegistered: conf.webhookRegistered,
          error: conf.error,
        };
      } else {
        await this.settingsService.set(SETTING_KEYS.TELEGRAM_BOT_TOKEN, '');
        await this.settingsService.set(SETTING_KEYS.TELEGRAM_BOT_USERNAME, '');
      }
    }
    if (dto.telegramChatId !== undefined) {
      await this.settingsService.set(SETTING_KEYS.TELEGRAM_CHAT_ID, dto.telegramChatId.trim());
    }

    return { ...(await this.settingsService.getAll()), telegram };
  }

  /** тест: шлём сообщение текущему владельцу (его подключённый чат) или в legacy chat id */
  @Post('telegram-test')
  async telegramTest(@CurrentUser() user: User) {
    const text = '✅ <b>Корвон</b>: пайвастшавӣ бо Telegram бомуваффақият танзим шуд!';
    if (user.telegramChatId) {
      return this.telegramService.sendToChat(user.telegramChatId, text);
    }
    const legacy = await this.telegramService.sendMessage(text);
    if (!legacy.ok) {
      return { ok: false, error: 'Аввал ботро пайваст кунед' };
    }
    return legacy;
  }
}
