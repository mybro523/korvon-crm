import { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AnalyticsPage } from '@/pages/analytics/AnalyticsPage';
import { LoginPage } from '@/pages/login/LoginPage';
import { NotificationsPage } from '@/pages/notifications/NotificationsPage';
import { SaleNewPage } from '@/pages/sale-new/SaleNewPage';
import { SalesPage } from '@/pages/sales/SalesPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { UsersPage } from '@/pages/users/UsersPage';
import { WarehousePage } from '@/pages/warehouse/WarehousePage';
import { Spinner } from '@/shared/ui/misc';
import { AppLayout } from '@/widgets/layout/AppLayout';
import { useAuth } from './providers/AuthProvider';

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
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/sales/new" element={<SaleNewPage />} />
          <Route
            path="/analytics"
            element={
              <RequireOwner>
                <AnalyticsPage />
              </RequireOwner>
            }
          />
          <Route
            path="/warehouse"
            element={
              <RequireOwner>
                <WarehousePage />
              </RequireOwner>
            }
          />
          <Route
            path="/users"
            element={
              <RequireOwner>
                <UsersPage />
              </RequireOwner>
            }
          />
          <Route
            path="/notifications"
            element={
              <RequireOwner>
                <NotificationsPage />
              </RequireOwner>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireOwner>
                <SettingsPage />
              </RequireOwner>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
