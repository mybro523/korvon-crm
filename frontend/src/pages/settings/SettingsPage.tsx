import { FormEvent, useEffect, useState } from 'react';
import { settingsApi } from '@/entities/settings/api';
import { TelegramConnect } from '@/features/telegram/TelegramConnect';
import { extractError } from '@/shared/api/http';
import { useT } from '@/shared/i18n';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { Input } from '@/shared/ui/Input';
import { Spinner } from '@/shared/ui/misc';
import { useToast } from '@/shared/ui/Toast';

export function SettingsPage() {
  const t = useT();
  const toast = useToast();
  const [botToken, setBotToken] = useState('');
  const [tokenSet, setTokenSet] = useState(false);
  const [botUsername, setBotUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [tgKey, setTgKey] = useState(0);

  const applyStatus = (s: { telegramBotTokenSet: boolean; telegramBotUsername: string }) => {
    setTokenSet(s.telegramBotTokenSet);
    setBotUsername(s.telegramBotUsername);
  };

  useEffect(() => {
    settingsApi
      .get()
      .then(applyStatus)
      .catch((e) => toast.error(extractError(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!botToken.trim()) return;
    setSaving(true);
    try {
      const res = await settingsApi.update({ telegramBotToken: botToken.trim() });
      applyStatus(res);
      if (res.telegram && !res.telegram.ok) {
        toast.error(res.telegram.error ?? t.settings.tokenInvalid);
      } else if (res.telegram && res.telegram.webhookRegistered === false) {
        toast.success(t.settings.savedNoWebhook);
      } else {
        toast.success(t.common.saved);
      }
      setBotToken(''); // токен не храним в форме — только статус
      setTgKey((k) => k + 1);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const onTest = async () => {
    setTesting(true);
    try {
      const res = await settingsApi.telegramTest();
      if (res.ok) toast.success(t.settings.testOk);
      else toast.error(res.error ?? t.common.error);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">{t.settings.title}</h1>
            <p className="page-subtitle">{t.settings.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="settings-grid">
        <div className="card card-pad">
          <h3 className="card-title">
            <Icon name="telegram" size={16} /> {t.settings.telegramTitle}
          </h3>
          <p className="hint-text" style={{ marginTop: -8, marginBottom: 14 }}>
            {t.settings.telegramDesc}
          </p>
          <form onSubmit={onSave}>
            <Input
              label={t.settings.botToken}
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder={
                tokenSet
                  ? `${t.settings.tokenSaved}${botUsername ? ` · @${botUsername}` : ''}`
                  : '123456789:AAE...'
              }
              autoComplete="off"
            />
            <div className="btn-row" style={{ marginBottom: 14 }}>
              <Button type="submit" loading={saving} disabled={!botToken.trim()}>
                {tokenSet ? t.settings.tokenReplace : t.common.save}
              </Button>
              {tokenSet && (
                <Button type="button" variant="secondary" onClick={onTest} loading={testing}>
                  <Icon name="send" size={15} /> {t.settings.test}
                </Button>
              )}
            </div>
          </form>
          <TelegramConnect key={tgKey} variant="card" />
        </div>

        <div className="card card-pad">
          <h3 className="card-title">
            <Icon name="info" size={16} /> {t.settings.howTitle}
          </h3>
          <ol className="howto-list">
            <li>{t.settings.how1}</li>
            <li>{t.settings.how2}</li>
            <li>{t.settings.how3}</li>
            <li>{t.settings.how4}</li>
          </ol>
        </div>
      </div>
    </>
  );
}
