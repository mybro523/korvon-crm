import { Injectable, Logger } from '@nestjs/common';
import { SETTING_KEYS, SettingsService } from './settings.service';

export interface TelegramResult {
  ok: boolean;
  error?: string;
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(private readonly settingsService: SettingsService) {}

  /** по контракту НИКОГДА не реджектится — всегда возвращает { ok, error? } */
  async sendMessage(text: string): Promise<TelegramResult> {
    try {
      const token = (await this.settingsService.get(SETTING_KEYS.TELEGRAM_BOT_TOKEN)).trim();
      const chatId = (await this.settingsService.get(SETTING_KEYS.TELEGRAM_CHAT_ID)).trim();
      if (!token || !chatId) {
        return { ok: false, error: 'Токени бот ё Chat ID танзим нашудааст' };
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const data: any = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        const error = data.description || `HTTP ${res.status}`;
        this.logger.warn(`Telegram sendMessage failed: ${error}`);
        return { ok: false, error };
      }
      return { ok: true };
    } catch (e: any) {
      const error = e?.name === 'AbortError' ? 'Вақти интизорӣ гузашт' : e?.message || 'Хатои номаълум';
      this.logger.warn(`Telegram sendMessage error: ${error}`);
      return { ok: false, error };
    }
  }
}
