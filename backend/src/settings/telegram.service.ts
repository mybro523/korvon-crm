import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { SETTING_KEYS, SettingsService } from './settings.service';

export interface TelegramResult {
  ok: boolean;
  error?: string;
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(private readonly settingsService: SettingsService) {}

  /** секрет вебхука — детерминированный, из JWT_SECRET */
  webhookSecret(): string {
    return createHash('sha256')
      .update(`${process.env.JWT_SECRET ?? ''}:tg-webhook`)
      .digest('hex')
      .slice(0, 40);
  }

  /** публичный адрес backend (Railway даёт RAILWAY_PUBLIC_DOMAIN автоматически) */
  publicUrl(): string {
    if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '');
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
      return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
    }
    return '';
  }

  /** вызов Bot API; по контракту не бросает исключений */
  private async callApi(
    method: string,
    payload: Record<string, unknown>,
  ): Promise<{ ok: boolean; result?: any; error?: string }> {
    const token = (await this.settingsService.get(SETTING_KEYS.TELEGRAM_BOT_TOKEN)).trim();
    if (!token) return { ok: false, error: 'Токени бот танзим нашудааст' };
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        const error = data.description || `HTTP ${res.status}`;
        this.logger.warn(`Telegram ${method} failed: ${error}`);
        return { ok: false, error };
      }
      return { ok: true, result: data.result };
    } catch (e: any) {
      const error =
        e?.name === 'AbortError' ? 'Вақти интизорӣ гузашт' : e?.message || 'Хатои номаълум';
      this.logger.warn(`Telegram ${method} error: ${error}`);
      return { ok: false, error };
    }
  }

  /** отправка в конкретный чат */
  async sendToChat(chatId: string, text: string): Promise<TelegramResult> {
    const r = await this.callApi('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    });
    return { ok: r.ok, error: r.error };
  }

  /** legacy: отправка в chat id из настроек (если задан) */
  async sendMessage(text: string): Promise<TelegramResult> {
    try {
      const chatId = (await this.settingsService.get(SETTING_KEYS.TELEGRAM_CHAT_ID)).trim();
      if (!chatId) return { ok: false, error: 'Токени бот ё Chat ID танзим нашудааст' };
      return await this.sendToChat(chatId, text);
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Хатои номаълум' };
    }
  }

  /**
   * После сохранения токена: узнаём username бота и регистрируем webhook.
   * ok=true только если токен валиден (getMe прошёл). webhookRegistered=false,
   * если нет публичного адреса (локальный запуск) — это не ошибка токена.
   */
  async configureBot(): Promise<{
    ok: boolean;
    botUsername?: string;
    webhookRegistered: boolean;
    error?: string;
  }> {
    const me = await this.callApi('getMe', {});
    if (!me.ok) return { ok: false, webhookRegistered: false, error: me.error };

    const username: string = me.result?.username ?? '';
    await this.settingsService.set(SETTING_KEYS.TELEGRAM_BOT_USERNAME, username);

    const base = this.publicUrl();
    if (!base) {
      this.logger.warn(
        'PUBLIC_URL/RAILWAY_PUBLIC_DOMAIN нет — webhook не зарегистрирован (локальный запуск)',
      );
      return { ok: true, botUsername: username, webhookRegistered: false };
    }

    const hook = await this.callApi('setWebhook', {
      url: `${base}/api/telegram/webhook`,
      secret_token: this.webhookSecret(),
      allowed_updates: ['message'],
      drop_pending_updates: true,
    });
    if (!hook.ok) {
      return { ok: true, botUsername: username, webhookRegistered: false, error: hook.error };
    }
    return { ok: true, botUsername: username, webhookRegistered: true };
  }
}
