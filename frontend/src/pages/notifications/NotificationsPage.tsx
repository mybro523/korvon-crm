import { useCallback, useEffect, useState } from 'react';
import {
  AppNotification,
  notificationsApi,
  NotificationsResponse,
} from '@/entities/notification/api';
import { extractError } from '@/shared/api/http';
import { t } from '@/shared/i18n/tj';
import { fmtDateTime } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { EmptyState, Pagination, Spinner } from '@/shared/ui/misc';
import { useToast } from '@/shared/ui/Toast';

const LIMIT = 20;

export function NotificationsPage() {
  const toast = useToast();
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    notificationsApi
      .list(page, LIMIT)
      .then(setData)
      .catch((e) => toast.error(extractError(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(load, [load]);

  const markAll = async () => {
    setMarking(true);
    try {
      await notificationsApi.markAllRead();
      load();
    } catch (e) {
      toast.error(extractError(e));
    } finally {
      setMarking(false);
    }
  };

  const markOne = async (n: AppNotification) => {
    if (n.isRead) return;
    try {
      await notificationsApi.markRead(n.id);
      load();
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t.notifications.title}</h1>
          <p className="page-subtitle">
            {t.notifications.subtitle}
            {data && data.unreadCount > 0 ? ` · ${data.unreadCount} ${t.notifications.unread}` : ''}
          </p>
        </div>
        {data && data.unreadCount > 0 && (
          <Button variant="secondary" onClick={markAll} loading={marking}>
            <Icon name="check" size={16} /> {t.notifications.markAllRead}
          </Button>
        )}
      </div>

      <div className="card">
        {loading ? (
          <Spinner />
        ) : !data || data.items.length === 0 ? (
          <EmptyState text={t.notifications.empty} icon="bell" />
        ) : (
          <>
            {data.items.map((n) => (
              <div
                key={n.id}
                className={`notif-item ${n.isRead ? '' : 'unread'}`}
                onClick={() => markOne(n)}
                style={{ cursor: n.isRead ? 'default' : 'pointer' }}
              >
                {!n.isRead && <div className="notif-dot" />}
                <div>
                  <div className="notif-message">{n.message}</div>
                  <div className="notif-date">{fmtDateTime(n.createdAt)}</div>
                </div>
              </div>
            ))}
            <Pagination page={page} total={data.total} limit={LIMIT} onChange={setPage} />
          </>
        )}
      </div>
    </>
  );
}
