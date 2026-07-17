import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from '../entities';

export const SETTING_KEYS = {
  TELEGRAM_BOT_TOKEN: 'telegram_bot_token',
  TELEGRAM_CHAT_ID: 'telegram_chat_id',
  TELEGRAM_BOT_USERNAME: 'telegram_bot_username',
} as const;

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting) private readonly settingsRepo: Repository<Setting>,
  ) {}

  async get(key: string): Promise<string> {
    const row = await this.settingsRepo.findOne({ where: { key } });
    return row?.value ?? '';
  }

  async set(key: string, value: string): Promise<void> {
    await this.settingsRepo.save({ key, value });
  }

  /** токен наружу не отдаём (write-only) — только признак, что он задан */
  async getAll() {
    const token = await this.get(SETTING_KEYS.TELEGRAM_BOT_TOKEN);
    return {
      telegramBotTokenSet: !!token.trim(),
      telegramBotUsername: await this.get(SETTING_KEYS.TELEGRAM_BOT_USERNAME),
    };
  }
}
