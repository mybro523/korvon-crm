import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from '../entities';

export const SETTING_KEYS = {
  TELEGRAM_BOT_TOKEN: 'telegram_bot_token',
  TELEGRAM_CHAT_ID: 'telegram_chat_id',
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

  async getAll() {
    return {
      telegramBotToken: await this.get(SETTING_KEYS.TELEGRAM_BOT_TOKEN),
      telegramChatId: await this.get(SETTING_KEYS.TELEGRAM_CHAT_ID),
    };
  }
}
