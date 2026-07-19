import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { notificationsApi } from '@/entities/notification/api';
import { TelegramConnect } from '@/features/telegram/TelegramConnect';
import { useT } from '@/shared/i18n';
import { UNREAD_KEY } from '@/shared/lib/notifications';
import { useCachedQuery } from '@/shared/lib/cache';
import { Icon } from '@/shared/ui/Icon';
import { LangSwitch } from '@/shared/ui/LangSwitch';

interface NavEntry {
  to: string;
  label: string;
  icon: string;
  badge?: number;
}

export function AppLayout() {
  const t = useT();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const isOwner = user?.role === 'OWNER';

  // счётчик непрочитанных живёт в общем кэше — отметка «прочитано» обновляет бейдж сразу
  const { data: unreadData, refetch: refetchUnread } = useCachedQuery(
    UNREAD_KEY,
    () => notificationsApi.unreadCount(),
    { enabled: isOwner },
  );
  const unread = isOwner ? unreadData?.count ?? 0 : 0;

  // фоновое обновление счётчика (новые продажи) + при переходах
  useEffect(() => {
    if (!isOwner) return;
    refetchUnread();
    const timer = setInterval(refetchUnread, 30_000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, location.pathname]);

  // закрываем шторку при переходе
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  const allNav: NavEntry[] = isOwner
    ? [
        { to: '/analytics', label: t.nav.analytics, icon: 'chart' },
        { to: '/sales', label: t.nav.sales, icon: 'cart' },
        { to: '/sales/new', label: t.nav.newSale, icon: 'plus' },
        { to: '/warehouse', label: t.nav.warehouse, icon: 'box' },
        { to: '/stock', label: t.nav.stock, icon: 'store' },
        { to: '/users', label: t.nav.users, icon: 'users' },
        { to: '/notifications', label: t.nav.notifications, icon: 'bell', badge: unread },
        { to: '/settings', label: t.nav.settings, icon: 'settings' },
      ]
    : [
        { to: '/sales/new', label: t.nav.newSale, icon: 'plus' },
        { to: '/sales', label: t.nav.sales, icon: 'cart' },
      ];

  // нижняя навигация (мобильная): вкладки + FAB по центру
  const tabsLeft: NavEntry[] = isOwner
    ? [
        { to: '/analytics', label: t.nav.analytics, icon: 'chart' },
        { to: '/sales', label: t.nav.sales, icon: 'cart' },
      ]
    : [{ to: '/sales', label: t.nav.sales, icon: 'cart' }];
  const tabsRight: NavEntry[] = isOwner
    ? [{ to: '/warehouse', label: t.nav.warehouse, icon: 'box' }]
    : [];

  const moreItems: NavEntry[] = isOwner
    ? [
        { to: '/stock', label: t.nav.stock, icon: 'store' },
        { to: '/users', label: t.nav.users, icon: 'users' },
        { to: '/notifications', label: t.nav.notifications, icon: 'bell', badge: unread },
        { to: '/settings', label: t.nav.settings, icon: 'settings' },
      ]
    : [];

  const initials = (user?.fullName ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const isActive = (to: string) =>
    to === '/sales' ? location.pathname === '/sales' : location.pathname.startsWith(to);
  const moreActive = moreItems.some((m) => isActive(m.to));

  return (
    <div className="app-shell">
      {/* ── десктоп: сайдбар ── */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">К</div>
          <div>
            <div className="brand-name">{t.appName}</div>
            <div className="brand-sub">{t.tagline}</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {allNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/sales'}
              className={({ isActive: a }) => `nav-item ${a ? 'active' : ''}`}
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
              {item.badge ? <span className="count-badge">{item.badge}</span> : null}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-extra">
          <TelegramConnect variant="sheet" />
          <div className="sheet-lang">
            <span className="sheet-lang-label">{t.common.language}</span>
            <LangSwitch />
          </div>
        </div>
        <div className="sidebar-user">
          <div className="avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.fullName}</div>
            <div className="sidebar-user-role">{user ? t.roles[user.role] : ''}</div>
          </div>
          <button className="sidebar-logout" onClick={logout} title={t.nav.logout}>
            <Icon name="logout" size={19} />
          </button>
        </div>
      </aside>

      {/* ── телефон: верхняя панель ── */}
      <header className="appbar">
        <div className="brand">
          <div className="brand-mark">К</div>
          <div>
            <div className="brand-name">{t.appName}</div>
          </div>
        </div>
        {isOwner ? (
          <button
            className="appbar-btn"
            onClick={() => navigate('/notifications')}
            aria-label={t.nav.notifications}
          >
            <Icon name="bell" size={22} />
            {unread > 0 && <span className="count-badge">{unread > 99 ? '99' : unread}</span>}
          </button>
        ) : (
          <button
            className="appbar-btn appbar-avatar"
            onClick={() => setMoreOpen(true)}
            aria-label={t.nav.more}
          >
            <span className="avatar">{initials}</span>
          </button>
        )}
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      {/* ── телефон: нижняя навигация ── */}
      <nav className="bottomnav">
        {tabsLeft.map((item) => (
          <button
            key={item.to}
            className={`bottomnav-item ${isActive(item.to) ? 'active' : ''}`}
            onClick={() => navigate(item.to)}
          >
            <Icon name={item.icon} size={22} />
            <span>{item.label}</span>
          </button>
        ))}
        <div className="bottomnav-fab-wrap">
          {/* на самой странице продажи FAB не нужен — не перекрываем кнопку «Фурӯхтан» */}
          {location.pathname !== '/sales/new' && (
            <button
              className="bottomnav-fab"
              onClick={() => navigate('/sales/new')}
              aria-label={t.nav.newSale}
            >
              <Icon name="plus" size={26} />
            </button>
          )}
        </div>
        {tabsRight.map((item) => (
          <button
            key={item.to}
            className={`bottomnav-item ${isActive(item.to) ? 'active' : ''}`}
            onClick={() => navigate(item.to)}
          >
            <Icon name={item.icon} size={22} />
            <span>{item.label}</span>
          </button>
        ))}
        {isOwner && (
          <button
            className={`bottomnav-item ${moreOpen || moreActive ? 'active' : ''}`}
            onClick={() => setMoreOpen(true)}
          >
            <Icon name="menu" size={22} />
            <span>{t.nav.more}</span>
          </button>
        )}
      </nav>

      {/* ── шторка «Ещё» ── */}
      {moreOpen && (
        <div
          className="sheet-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setMoreOpen(false);
          }}
        >
          <div className="sheet">
            <div className="sheet-grip" />
            <div className="sheet-user">
              <div className="avatar">{initials}</div>
              <div>
                <div className="sheet-user-name">{user?.fullName}</div>
                <div className="sheet-user-role">{user ? t.roles[user.role] : ''}</div>
              </div>
            </div>
            {moreItems.map((item) => (
              <button key={item.to} className="sheet-link" onClick={() => navigate(item.to)}>
                <Icon name={item.icon} size={20} />
                <span>{item.label}</span>
                {item.badge ? <span className="count-badge">{item.badge}</span> : null}
              </button>
            ))}
            <TelegramConnect variant="sheet" />
            <div className="sheet-lang">
              <span className="sheet-lang-label">{t.common.language}</span>
              <LangSwitch />
            </div>
            <button className="sheet-link danger" onClick={logout}>
              <Icon name="logout" size={20} />
              <span>{t.nav.logout}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
