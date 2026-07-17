import { LanguageProvider } from '@/shared/i18n';
import { ToastProvider } from '@/shared/ui/Toast';
import { AuthProvider } from './providers/AuthProvider';
import { AppRouter } from './router';

export function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
