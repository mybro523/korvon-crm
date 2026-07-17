import { useEffect, useState } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { pointsApi } from '@/entities/point/api';
import { PointStockRow } from '@/entities/point/types';
import { extractError } from '@/shared/api/http';
import { useT } from '@/shared/i18n';
import { fmtQty } from '@/shared/lib/format';
import { Badge, EmptyState, Spinner } from '@/shared/ui/misc';
import { Thumb } from '@/shared/ui/Thumb';
import { useToast } from '@/shared/ui/Toast';

/** товары точки продавца */
export function MyStockPage() {
  const t = useT();
  const { user } = useAuth();
  const toast = useToast();
  const [stock, setStock] = useState<PointStockRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.pointId) {
      setLoading(false);
      return;
    }
    pointsApi
      .stock(user.pointId)
      .then(setStock)
      .catch((e) => toast.error(extractError(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.pointId]);

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">{t.nav.myStock}</h1>
            <p className="page-subtitle">{user?.point?.name ?? ''}</p>
          </div>
        </div>
      </div>
      <div className="card">
        {loading ? (
          <Spinner />
        ) : !user?.pointId ? (
          <EmptyState text={t.sales.noPointAssigned} icon="alert" />
        ) : stock.length === 0 ? (
          <EmptyState text={t.points.noStock} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t.warehouse.name}</th>
                  <th>{t.warehouse.category}</th>
                  <th className="num">{t.warehouse.quantity}</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((row) => (
                  <tr key={row.productId}>
                    <td className="td-main">
                      <span className="td-title-row">
                        <Thumb
                          productId={row.productId}
                          hasPhoto={row.hasPhoto}
                          photoRev={row.photoRev}
                        />
                        {row.name}
                      </span>
                    </td>
                    <td data-label={t.warehouse.category}>{row.category ?? '—'}</td>
                    <td className="num" data-label={t.warehouse.quantity}>
                      {row.quantity <= 0 ? (
                        <Badge variant="danger">{t.warehouse.outOfStock}</Badge>
                      ) : (
                        `${fmtQty(row.quantity)} ${row.unit}`
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
