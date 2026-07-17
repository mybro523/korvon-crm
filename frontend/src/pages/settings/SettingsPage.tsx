import { FormEvent, useEffect, useState } from 'react';
import { settingsApi } from '@/entities/settings/api';
import { extractError } from '@/shared/api/http';
import { t } from '@/shared/i18n/tj';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { Input } from '@/shared/ui/Input';
import { Spinner } from '@/shared/ui/misc';
import { useToast } from '@/shared/ui/Toast';

export function SettingsPage() {
  const toast = useToast();
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    settingsApi
      .get()
      .then((s) => {
        setBotToken(s.telegramBotToken);
        setChatId(s.telegramChatId);
      })
      .catch((e) => toast.error(extractError(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsApi.update({
        telegramBotToken: botToken.trim(),
        telegramChatId: chatId.trim(),
      });
      toast.success(t.common.saved);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const onTest = async () => {
    setTesting(true);
    try {
      // сохраняем перед проверкой, чтобы тест шёл с текущими значениями
      await settingsApi.update({
        telegramBotToken: botToken.trim(),
        telegramChatId: chatId.trim(),
      });
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
        <form className="card card-pad" onSubmit={onSave}>
          <h3 className="card-title">
            <Icon name="telegram" size={16} /> {t.settings.telegramTitle}
          </h3>
          <p className="hint-text" style={{ marginTop: -8, marginBottom: 14 }}>
            {t.settings.telegramDesc}
          </p>
          <Input
            label={t.settings.botToken}
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="123456789:AAE..."
            autoComplete="off"
          />
          <Input
            label={t.settings.chatId}
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder="123456789"
            autoComplete="off"
          />
          <div className="btn-row">
            <Button type="submit" loading={saving}>
              {t.common.save}
            </Button>
            <Button type="button" variant="secondary" onClick={onTest} loading={testing}>
              <Icon name="send" size={15} /> {t.settings.test}
            </Button>
          </div>
        </form>

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
