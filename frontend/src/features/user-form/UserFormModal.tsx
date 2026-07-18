import { FormEvent, useState } from 'react';
import { usersApi } from '@/entities/user/api';
import { PublicUser, UserRole } from '@/entities/user/types';
import { extractError } from '@/shared/api/http';
import { useT } from '@/shared/i18n';
import { Button } from '@/shared/ui/Button';
import { Input, PasswordInput, Select } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { useToast } from '@/shared/ui/Toast';

interface Props {
  user: PublicUser | null;
  onClose: () => void;
  onDone: () => void;
}

export function UserFormModal({ user, onClose, onDone }: Props) {
  const t = useT();
  const toast = useToast();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'SELLER');
  const [isActive, setIsActive] = useState(user?.isActive ?? true);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    // оптимистично: модалка закрывается сразу, запрос в фоне
    onClose();
    const req = user
      ? usersApi.update(user.id, {
          fullName: fullName.trim(),
          username: username.trim(),
          ...(password ? { password } : {}),
          role,
          isActive,
        })
      : usersApi.create({
          fullName: fullName.trim(),
          username: username.trim(),
          password,
          role,
        });
    req
      .then(() => {
        toast.success(t.common.saved);
        onDone();
      })
      .catch((err) => {
        toast.error(extractError(err));
        onDone();
      });
  };

  return (
    <Modal title={user ? t.users.editUser : t.users.addUser} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="form-grid">
          <Input
            label={t.users.fullName}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label={t.users.username}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
          />
          <PasswordInput
            label={t.users.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={user ? t.users.passwordHint : ''}
            required={!user}
            minLength={password ? 6 : undefined}
            autoComplete="new-password"
          />
          <Select
            label={t.users.role}
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            <option value="SELLER">{t.roles.SELLER}</option>
            <option value="OWNER">{t.roles.OWNER}</option>
          </Select>
          {user && (
            <div className="full field">
              <label className="field-label" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                {t.users.active}
              </label>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit">{t.common.save}</Button>
        </div>
      </form>
    </Modal>
  );
}
