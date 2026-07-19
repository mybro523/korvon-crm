import { lazy, ReactNode, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '@/pages/login/LoginPage';
import { Spinner } from '@/shared/ui/misc';
import { AppLayout } from '@/widgets/layout/AppLayout';
import { useAuth } from './providers/AuthProvider';

// ленивая загрузка страниц — код каждой грузится по мере перехода (code splitting)
const AnalyticsPage = lazy(() =>
  import('@/pages/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
);
const SalesPage = lazy(() => import('@/pages/sales/SalesPage').then((m) => ({ default: m.SalesPage })));
const SaleNewPage = lazy(() =>
  import('@/pages/sale-new/SaleNewPage').then((m) => ({ default: m.SaleNewPage })),
);
const WarehousePage = lazy(() =>
  import('@/pages/warehouse/WarehousePage').then((m) => ({ default: m.WarehousePage })),
);
const StockPage = lazy(() => import('@/pages/stock/StockPage').then((m) => ({ default: m.StockPage })));
const UsersPage = lazy(() => import('@/pages/users/UsersPage').then((m) => ({ default: m.UsersPage })));
const NotificationsPage = lazy(() =>
  import('@/pages/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
);
const SettingsPage = lazy(() =>
  import('@/pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireOwner({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'OWNER') return <Navigate to="/sales/new" replace />;
  return <>{children}</>;
}

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'OWNER' ? '/analytics' : '/sales/new'} replace />;
}

/** обёртка ленивой страницы со скелетоном-заглушкой на время загрузки чанка */
function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Spinner />}>{children}</Suspense>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/sales" element={<Lazy><SalesPage /></Lazy>} />
          <Route path="/sales/new" element={<Lazy><SaleNewPage /></Lazy>} />
          <Route
            path="/analytics"
            element={
              <RequireOwner>
                <Lazy><AnalyticsPage /></Lazy>
              </RequireOwner>
            }
          />
          <Route
            path="/warehouse"
            element={
              <RequireOwner>
                <Lazy><WarehousePage /></Lazy>
              </RequireOwner>
            }
          />
          <Route
            path="/stock"
            element={
              <RequireOwner>
                <Lazy><StockPage /></Lazy>
              </RequireOwner>
            }
          />
          <Route
            path="/users"
            element={
              <RequireOwner>
                <Lazy><UsersPage /></Lazy>
              </RequireOwner>
            }
          />
          <Route
            path="/notifications"
            element={
              <RequireOwner>
                <Lazy><NotificationsPage /></Lazy>
              </RequireOwner>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireOwner>
                <Lazy><SettingsPage /></Lazy>
              </RequireOwner>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
