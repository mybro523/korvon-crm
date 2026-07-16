import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { pointsApi } from '@/entities/point/api';
import { SalesPoint } from '@/entities/point/types';
import { usersApi } from '@/entities/user/api';
import { PublicUser } from '@/entities/user/types';
import { UserFormModal } from '@/features/user-form/UserFormModal';
import { extractError } from '@/shared/api/http';
import { t } from '@/shared/i18n/tj';
import { fmtDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Icon } from '@/shared/ui/Icon';
import { Badge, EmptyState, Spinner } from '@/shared/ui/misc';
import { useToast } from '@/shared/ui/Toast';

export function UsersPage() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [points, setPoints] = useState<SalesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PublicUser | null>(null);
  const [deleting, setDeleting] = useState<PublicUser | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(() => {
    Promise.all([usersApi.list(), pointsApi.list()])
      .then(([u, p]) => {
        setUsers(u);
        setPoints(p);
      })
      .catch((e) => toast.error(extractError(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(load, [load]);

  const onDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await usersApi.remove(deleting.id);
      toast.success(t.common.deleted);
      setDeleting(null);
      load();
    } catch (e) {
      toast.error(extractError(e));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t.users.title}</h1>
          <p className="page-subtitle">{t.users.subtitle}</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Icon name="plus" size={16} /> {t.users.addUser}
        </Button>
      </div>

      <div className="card">
        {loading ? (
          <Spinner />
        ) : users.length === 0 ? (
          <EmptyState icon="users" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t.users.fullName}</th>
                  <th>{t.users.username}</th>
                  <th>{t.users.role}</th>
                  <th>{t.users.point}</th>
                  <th>{t.users.status}</th>
                  <th>{t.users.createdAt}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.fullName}</td>
                    <td>@{u.username}</td>
                    <td>
                      {u.role === 'OWNER' ? (
                        <Badge variant="primary">{t.roles.OWNER}</Badge>
                      ) : (
                        <Badge variant="gray">{t.roles.SELLER}</Badge>
                      )}
                    </td>
                    <td>{u.point?.name ?? '—'}</td>
                    <td>
                      {u.isActive ? (
                        <Badge variant="success">{t.users.active}</Badge>
                      ) : (
                        <Badge variant="danger">{t.users.inactive}</Badge>
                      )}
                    </td>
                    <td>{fmtDate(u.createdAt)}</td>
                    <td>
                      <div className="row-actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="btn-icon"
                          title={t.common.edit}
                          onClick={() => {
                            setEditing(u);
                            setFormOpen(true);
                          }}
                        >
                          <Icon name="edit" size={15} />
                        </Button>
                        {u.id !== me?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="btn-icon"
                            title={t.common.delete}
                            onClick={() => setDeleting(u)}
                          >
                            <Icon name="trash" size={15} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <UserFormModal
          user={editing}
          points={points}
          onClose={() => setFormOpen(false)}
          onSaved={load}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={t.common.delete}
          message={`${t.users.deleteConfirm} (${deleting.fullName})`}
          onConfirm={onDelete}
          onCancel={() => setDeleting(null)}
          loading={deleteBusy}
        />
      )}
    </>
  );
}
