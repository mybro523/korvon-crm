import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { notificationsApi } from '@/entities/notification/api';
import { t } from '@/shared/i18n/tj';
import { Icon } from '@/shared/ui/Icon';

interface NavEntry {
  to: string;
  label: string;
  icon: string;
  badge?: number;
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const isOwner = user?.role === 'OWNER';

  useEffect(() => {
    if (!isOwner) return;
    let alive = true;
    const load = () =>
      notificationsApi
        .unreadCount()
        .then((r) => alive && setUnread(r.count))
        .catch(() => {});
    load();
    const timer = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
    // перезапрашиваем при смене страницы (после продажи/прочтения)
  }, [isOwner, location.pathname]);

  const nav: NavEntry[] = isOwner
    ? [
        { to: '/analytics', label: t.nav.analytics, icon: 'chart' },
        { to: '/sales', label: t.nav.sales, icon: 'cart' },
        { to: '/sales/new', label: t.nav.newSale, icon: 'plus' },
        { to: '/warehouse', label: t.nav.warehouse, icon: 'box' },
        { to: '/points', label: t.nav.points, icon: 'store' },
        { to: '/users', label: t.nav.users, icon: 'users' },
        { to: '/notifications', label: t.nav.notifications, icon: 'bell', badge: unread },
        { to: '/settings', label: t.nav.settings, icon: 'settings' },
      ]
    : [
        { to: '/sales/new', label: t.nav.newSale, icon: 'plus' },
        { to: '/sales', label: t.nav.sales, icon: 'cart' },
        { to: '/my-stock', label: t.nav.myStock, icon: 'box' },
      ];

  const initials = (user?.fullName ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">К</div>
          <div>
            <div className="sidebar-logo-name">{t.appName}</div>
            <div className="sidebar-logo-sub">{user?.point?.name ?? t.tagline}</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/sales'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.fullName}</div>
            <div className="sidebar-user-role">{user ? t.roles[user.role] : ''}</div>
          </div>
          <button className="sidebar-logout" onClick={logout} title={t.nav.logout}>
            <Icon name="logout" size={19} />
          </button>
        </div>
      </aside>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
