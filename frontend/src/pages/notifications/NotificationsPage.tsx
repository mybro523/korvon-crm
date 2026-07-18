import { useState } from 'react';
import {
  AppNotification,
  notificationsApi,
  NotificationsResponse,
} from '@/entities/notification/api';
import { localizeNotification, useT } from '@/shared/i18n';
import { useCachedQuery } from '@/shared/lib/cache';
import { clearUnread, decUnread } from '@/shared/lib/notifications';
import { fmtDateTime } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { EmptyState, Pagination, TableSkeleton } from '@/shared/ui/misc';

const LIMIT = 20;

/** чистим уведомление к показу: убираем эмодзи и строку даты (она показана отдельно),
 * затем переводим текст на язык интерфейса */
const cleanMessage = (s: string) =>
  localizeNotification(
    s
      .replace(/[\p{Extended_Pictographic}️]/gu, '')
      .replace(/^ +/gm, '')
      .split('\n')
      .filter((line) => !line.startsWith('Сана ва вақт'))
      .join('\n'),
  );

export function NotificationsPage() {
  const t = useT();
  const [page, setPage] = useState(1);
  const { data, loading, refetch, mutate } = useCachedQuery<NotificationsResponse>(
    `notifications:${page}`,
    () => notificationsApi.list(page, LIMIT),
  );

  const markAll = () => {
    // оптимистично помечаем всё прочитанным (+ бейдж-колокольчик)
    mutate((d) =>
      d
        ? { ...d, unreadCount: 0, items: d.items.map((i) => ({ ...i, isRead: true })) }
        : (d as any),
    );
    clearUnread();
    notificationsApi.markAllRead().then(refetch).catch(refetch);
  };

  const markOne = (n: AppNotification) => {
    if (n.isRead) return;
    mutate((d) =>
      d
        ? {
            ...d,
            unreadCount: Math.max(0, d.unreadCount - 1),
            items: d.items.map((i) => (i.id === n.id ? { ...i, isRead: true } : i)),
          }
        : (d as any),
    );
    decUnread();
    notificationsApi.markRead(n.id).catch(refetch);
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">{t.notifications.title}</h1>
            <p className="page-subtitle">
              {t.notifications.subtitle}
              {data && data.unreadCount > 0
                ? ` · ${data.unreadCount} ${t.notifications.unread}`
                : ''}
            </p>
          </div>
          {data && data.unreadCount > 0 && (
            <div className="page-actions">
              <Button variant="secondary" onClick={markAll}>
                <Icon name="check" size={16} /> {t.notifications.markAllRead}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <TableSkeleton rows={5} />
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
                  <div className="notif-message">{cleanMessage(n.message)}</div>
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
