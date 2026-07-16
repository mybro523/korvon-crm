import { ToastProvider } from '@/shared/ui/Toast';
import { AuthProvider } from './providers/AuthProvider';
import { AppRouter } from './router';

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </AuthProvider>
  );
}
