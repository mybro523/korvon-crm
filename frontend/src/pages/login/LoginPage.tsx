import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { extractError } from '@/shared/api/http';
import { t } from '@/shared/i18n/tj';
import { Button } from '@/shared/ui/Button';
import { Input, PasswordInput } from '@/shared/ui/Input';

export function LoginPage() {
  const { user, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="brand-mark">К</div>
          <h1 className="login-title">{t.appName}</h1>
          <p className="login-sub">{t.tagline}</p>
        </div>
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={onSubmit}>
          <Input
            label={t.login.username}
            placeholder={t.login.usernamePlaceholder}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            autoComplete="username"
          />
          <PasswordInput
            label={t.login.password}
            placeholder={t.login.passwordPlaceholder}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Button type="submit" loading={loading} style={{ width: '100%', marginTop: 6 }}>
            {t.login.submit}
          </Button>
        </form>
      </div>
    </div>
  );
}
