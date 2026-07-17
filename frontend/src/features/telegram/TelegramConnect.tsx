import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { telegramApi, TelegramStatus } from '@/entities/telegram/api';
import { extractError } from '@/shared/api/http';
import { useT } from '@/shared/i18n';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { Badge } from '@/shared/ui/misc';
import { useToast } from '@/shared/ui/Toast';

/**
 * Подключение Telegram-бота текущим пользователем.
 * variant='sheet' — строка в мобильной шторке; variant='card' — блок на странице настроек.
 */
export function TelegramConnect({ variant }: { variant: 'sheet' | 'card' }) {
  const t = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(() => {
    telegramApi.status().then(setStatus).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  /** после открытия ссылки ждём, пока пользователь нажмёт Start в Telegram */
  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    let tries = 0;
    pollRef.current = setInterval(async () => {
      tries++;
      try {
        const s = await telegramApi.status();
        setStatus(s);
        if (s.connected || tries > 40) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch {
        /* ignore */
      }
    }, 3000);
  };

  const connect = async () => {
    if (!status?.botConfigured) {
      if (user?.role === 'OWNER') navigate('/settings');
      else toast.error(t.telegram.botNotConfigured);
      return;
    }
    setBusy(true);
    try {
      const { link } = await telegramApi.connectLink();
      window.open(link, '_blank', 'noopener');
      toast.success(t.telegram.openHint);
      startPolling();
    } catch (e) {
      toast.error(extractError(e));
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await telegramApi.disconnect();
      toast.success(t.telegram.disconnected);
      load();
    } catch (e) {
      toast.error(extractError(e));
    } finally {
      setBusy(false);
    }
  };

  const connected = !!status?.connected;

  if (variant === 'sheet') {
    return (
      <div className="sheet-link tg-row">
        <Icon name="telegram" size={20} />
        <span className="tg-label">
          {t.telegram.connectTitle}
          <span className={`tg-status ${connected ? 'ok' : ''}`}>
            {connected ? t.telegram.connected : t.telegram.notConnected}
          </span>
        </span>
        {connected ? (
          <Button variant="secondary" size="sm" onClick={disconnect} loading={busy}>
            {t.telegram.disconnect}
          </Button>
        ) : (
          <Button size="sm" onClick={connect} loading={busy}>
            {t.telegram.connectBtn}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="tg-card-block">
      <div className="tg-card-row">
        <Icon name="telegram" size={18} />
        <span className="tg-label">
          {status?.botUsername ? `@${status.botUsername}` : t.telegram.connectTitle}
        </span>
        {connected ? (
          <Badge variant="success">{t.telegram.connected}</Badge>
        ) : (
          <Badge variant="gray">{t.telegram.notConnected}</Badge>
        )}
      </div>
      <p className="hint-text">{t.telegram.openHint}</p>
      <div className="btn-row">
        {connected ? (
          <Button variant="secondary" onClick={disconnect} loading={busy}>
            {t.telegram.disconnect}
          </Button>
        ) : (
          <Button onClick={connect} loading={busy} disabled={!status?.botConfigured}>
            <Icon name="telegram" size={16} /> {t.telegram.connectBtn}
          </Button>
        )}
      </div>
    </div>
  );
}
