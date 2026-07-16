import { useEffect, useState } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { pointsApi } from '@/entities/point/api';
import { PointStockRow } from '@/entities/point/types';
import { extractError } from '@/shared/api/http';
import { t } from '@/shared/i18n/tj';
import { fmtQty } from '@/shared/lib/format';
import { Badge, EmptyState, Spinner } from '@/shared/ui/misc';
import { useToast } from '@/shared/ui/Toast';

/** товары точки продавца */
export function MyStockPage() {
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
        <div>
          <h1 className="page-title">{t.nav.myStock}</h1>
          <p className="page-subtitle">{user?.point?.name ?? ''}</p>
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
                    <td style={{ fontWeight: 600 }}>{row.name}</td>
                    <td>{row.category ?? '—'}</td>
                    <td className="num">
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
