import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { pointsApi } from '@/entities/point/api';
import { PointStockRow, SalesPoint, TransferRecord } from '@/entities/point/types';
import { ReturnFormModal } from '@/features/return-form/ReturnFormModal';
import { TransferFormModal } from '@/features/transfer-form/TransferFormModal';
import { extractError } from '@/shared/api/http';
import { t } from '@/shared/i18n/tj';
import { fmtDateTime, fmtMoney, fmtQty } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { Badge, EmptyState, Spinner } from '@/shared/ui/misc';
import { useToast } from '@/shared/ui/Toast';

export function PointDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [point, setPoint] = useState<SalesPoint | null>(null);
  const [stock, setStock] = useState<PointStockRow[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferOpen, setTransferOpen] = useState(false);
  const [returning, setReturning] = useState<PointStockRow | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    Promise.all([pointsApi.one(id), pointsApi.stock(id), pointsApi.transfers(id)])
      .then(([p, s, tr]) => {
        setPoint(p);
        setStock(s);
        setTransfers(tr);
      })
      .catch((e) => toast.error(extractError(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(load, [load]);

  if (loading) return <Spinner />;
  if (!point || !id) return <EmptyState />;

  return (
    <>
      <div className="page-header">
        <div>
          <Link to="/points" style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon name="left" size={14} /> {t.common.back}
          </Link>
          <h1 className="page-title" style={{ marginTop: 4 }}>
            {point.name}
          </h1>
          <p className="page-subtitle">{point.address ?? ''}</p>
        </div>
        <Button onClick={() => setTransferOpen(true)}>
          <Icon name="transfer" size={16} /> {t.points.transferTitle}
        </Button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-pad" style={{ paddingBottom: 0 }}>
          <h3 className="card-title">{t.points.stock}</h3>
        </div>
        {stock.length === 0 ? (
          <EmptyState text={t.points.noStock} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t.warehouse.name}</th>
                  <th>{t.warehouse.category}</th>
                  <th className="num">{t.warehouse.quantity}</th>
                  {stock[0]?.costPrice !== undefined && (
                    <th className="num">{t.warehouse.costPrice}</th>
                  )}
                  <th />
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
                    {row.costPrice !== undefined && (
                      <td className="num">{fmtMoney(row.costPrice)}</td>
                    )}
                    <td>
                      <div className="row-actions">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={row.quantity <= 0}
                          onClick={() => setReturning(row)}
                        >
                          {t.points.returnBtn}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-pad" style={{ paddingBottom: 0 }}>
          <h3 className="card-title">{t.points.history}</h3>
        </div>
        {transfers.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t.common.date}</th>
                  <th>{t.sales.product}</th>
                  <th>{t.sales.type}</th>
                  <th className="num">{t.warehouse.quantity}</th>
                  <th>{t.sales.seller}</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((tr) => (
                  <tr key={tr.id}>
                    <td>{fmtDateTime(tr.createdAt)}</td>
                    <td style={{ fontWeight: 600 }}>{tr.productName}</td>
                    <td>
                      {tr.direction === 'TO_POINT' ? (
                        <Badge variant="primary">→ {t.points.toPoint}</Badge>
                      ) : (
                        <Badge variant="warning">← {t.points.toWarehouse}</Badge>
                      )}
                    </td>
                    <td className="num">
                      {fmtQty(tr.quantity)} {tr.unit}
                    </td>
                    <td>{tr.userName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {transferOpen && (
        <TransferFormModal pointId={id} onClose={() => setTransferOpen(false)} onDone={load} />
      )}
      {returning && (
        <ReturnFormModal
          pointId={id}
          row={returning}
          onClose={() => setReturning(null)}
          onDone={load}
        />
      )}
    </>
  );
}
