import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pointsApi } from '@/entities/point/api';
import { SalesPoint } from '@/entities/point/types';
import { PointFormModal } from '@/features/point-form/PointFormModal';
import { extractError } from '@/shared/api/http';
import { t } from '@/shared/i18n/tj';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Icon } from '@/shared/ui/Icon';
import { EmptyState, Spinner } from '@/shared/ui/misc';
import { useToast } from '@/shared/ui/Toast';

export function PointsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [points, setPoints] = useState<SalesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SalesPoint | null>(null);
  const [deleting, setDeleting] = useState<SalesPoint | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(() => {
    pointsApi
      .list()
      .then(setPoints)
      .catch((e) => toast.error(extractError(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(load, [load]);

  const onDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await pointsApi.remove(deleting.id);
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
          <h1 className="page-title">{t.points.title}</h1>
          <p className="page-subtitle">{t.points.subtitle}</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Icon name="plus" size={16} /> {t.points.addPoint}
        </Button>
      </div>

      {loading ? (
        <Spinner />
      ) : points.length === 0 ? (
        <div className="card">
          <EmptyState icon="store" />
        </div>
      ) : (
        <div className="points-grid">
          {points.map((p) => (
            <div key={p.id} className="card point-card">
              <div className="point-card-name">{p.name}</div>
              <div className="point-card-addr">{p.address ?? ''}</div>
              <div className="point-card-meta">
                📦 {p.stockItems ?? 0} {t.points.stockItems}
              </div>
              <div className="point-card-actions">
                <Button size="sm" onClick={() => navigate(`/points/${p.id}`)}>
                  <Icon name="eye" size={14} /> {t.common.open}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditing(p);
                    setFormOpen(true);
                  }}
                >
                  <Icon name="edit" size={14} />
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setDeleting(p)}>
                  <Icon name="trash" size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <PointFormModal point={editing} onClose={() => setFormOpen(false)} onSaved={load} />
      )}
      {deleting && (
        <ConfirmDialog
          title={t.common.delete}
          message={`${t.points.deleteConfirm} (${deleting.name})`}
          onConfirm={onDelete}
          onCancel={() => setDeleting(null)}
          loading={deleteBusy}
        />
      )}
    </>
  );
}
