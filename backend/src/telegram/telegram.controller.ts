import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { MoreThan, Repository } from 'typeorm';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { escapeHtml } from '../common/sale-message';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TelegramLinkCode, User } from '../entities';
import { SETTING_KEYS, SettingsService } from '../settings/settings.service';
import { TelegramService } from '../settings/telegram.service';

const CODE_TTL_MS = 15 * 60 * 1000;

interface TelegramUpdate {
  message?: {
    text?: string;
    chat?: { id?: number | string };
  };
}

@Controller('telegram')
export class TelegramController {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(TelegramLinkCode)
    private readonly codesRepo: Repository<TelegramLinkCode>,
    private readonly settingsService: SettingsService,
    private readonly telegramService: TelegramService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('status')
  async status(@CurrentUser() user: User) {
    const token = await this.settingsService.get(SETTING_KEYS.TELEGRAM_BOT_TOKEN);
    const botUsername = await this.settingsService.get(SETTING_KEYS.TELEGRAM_BOT_USERNAME);
    return {
      botConfigured: !!token.trim() && !!botUsername,
      botUsername,
      connected: !!user.telegramChatId,
    };
  }

  /** одноразовая ссылка t.me/<bot>?start=<code> для текущего пользователя */
  @UseGuards(JwtAuthGuard)
  @Post('connect-link')
  async connectLink(@CurrentUser() user: User) {
    const botUsername = await this.settingsService.get(SETTING_KEYS.TELEGRAM_BOT_USERNAME);
    const token = await this.settingsService.get(SETTING_KEYS.TELEGRAM_BOT_TOKEN);
    if (!token.trim() || !botUsername) {
      throw new BadRequestException('Аввал токени ботро дар танзимот сабт кунед');
    }

    await this.codesRepo.delete({ userId: user.id });
    const code = randomBytes(8).toString('hex');
    await this.codesRepo.save(
      this.codesRepo.create({
        code,
        userId: user.id,
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      }),
    );

    return { link: `https://t.me/${botUsername}?start=${code}` };
  }

  @UseGuards(JwtAuthGuard)
  @Post('disconnect')
  async disconnect(@CurrentUser() user: User) {
    await this.usersRepo.update({ id: user.id }, { telegramChatId: null });
    return { success: true };
  }

  /** webhook от Telegram: ловим /start <code> и привязываем чат к пользователю */
  @Post('webhook')
  async webhook(
    @Body() update: TelegramUpdate,
    @Headers('x-telegram-bot-api-secret-token') secret?: string,
  ) {
    if (secret !== this.telegramService.webhookSecret()) {
      throw new UnauthorizedException();
    }

    const chatId = update?.message?.chat?.id;
    const text = update?.message?.text ?? '';
    if (!chatId || !text.startsWith('/start')) return { ok: true };

    const code = text.split(/\s+/)[1]?.trim();
    if (!code) {
      await this.telegramService.sendToChat(
        String(chatId),
        'Барои пайвастшавӣ тугмаи «Пайваст кардан»-ро дар системаи Корвон пахш кунед.\nДля подключения нажмите «Подключить» в системе Корвон.',
      );
      return { ok: true };
    }

    const row = await this.codesRepo.findOne({
      where: { code, expiresAt: MoreThan(new Date()) },
      relations: { user: true },
    });
    if (!row || !row.user) {
      await this.telegramService.sendToChat(
        String(chatId),
        'Пайванд кӯҳна шудааст. Аз система бори дигар кӯшиш кунед.\nСсылка устарела. Попробуйте ещё раз из системы.',
      );
      return { ok: true };
    }

    await this.usersRepo.update({ id: row.user.id }, { telegramChatId: String(chatId) });
    await this.codesRepo.delete({ userId: row.user.id });

    const roleTj = row.user.role === 'OWNER' ? 'Соҳиб' : 'Фурӯшанда';
    const roleRu = row.user.role === 'OWNER' ? 'Владелец' : 'Продавец';
    const whatTj =
      row.user.role === 'OWNER'
        ? 'Акнун дар бораи ҳар фурӯш огоҳинома мегиред.'
        : 'Акнун чеки фурӯшҳои худро мегиред.';
    const whatRu =
      row.user.role === 'OWNER'
        ? 'Теперь вы будете получать уведомление о каждой продаже.'
        : 'Теперь вы будете получать чеки своих продаж.';
    // parse_mode:HTML — имя пользователя экранируем (может содержать < > &)
    const name = escapeHtml(row.user.fullName);
    await this.telegramService.sendToChat(
      String(chatId),
      `✅ <b>Корвон</b>\nСалом, ${name}! Шумо ҳамчун <b>${roleTj}</b> пайваст шудед. ${whatTj}\n\nЗдравствуйте, ${name}! Вы подключены как <b>${roleRu}</b>. ${whatRu}`,
    );

    return { ok: true };
  }
}
