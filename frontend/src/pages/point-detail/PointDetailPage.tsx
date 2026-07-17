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
        <div className="page-header-row">
          <div>
            <Link to="/points" className="back-link">
              <Icon name="left" size={15} /> {t.common.back}
            </Link>
            <h1 className="page-title">{point.name}</h1>
            <p className="page-subtitle">{point.address ?? ''}</p>
          </div>
          <div className="page-actions">
            <Button onClick={() => setTransferOpen(true)}>
              <Icon name="transfer" size={17} /> {t.points.transferTitle}
            </Button>
          </div>
        </div>
      </div>

      <div className="card section-gap">
        <div className="card-pad" style={{ paddingBottom: 0 }}>
          <h3 className="card-title">
            <Icon name="box" size={15} /> {t.points.stock}
          </h3>
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
                    <td className="td-main">{row.name}</td>
                    <td data-label={t.warehouse.category}>{row.category ?? '—'}</td>
                    <td className="num" data-label={t.warehouse.quantity}>
                      {row.quantity <= 0 ? (
                        <Badge variant="danger">{t.warehouse.outOfStock}</Badge>
                      ) : (
                        `${fmtQty(row.quantity)} ${row.unit}`
                      )}
                    </td>
                    {row.costPrice !== undefined && (
                      <td className="num" data-label={t.warehouse.costPrice}>
                        {fmtMoney(row.costPrice)}
                      </td>
                    )}
                    <td>
                      <div className="row-actions">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={row.quantity <= 0}
                          onClick={() => setReturning(row)}
                        >
                          <Icon name="transfer" size={14} /> {t.points.returnBtn}
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
          <h3 className="card-title">
            <Icon name="transfer" size={15} /> {t.points.history}
          </h3>
        </div>
        {transfers.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t.sales.product}</th>
                  <th>{t.common.date}</th>
                  <th>{t.sales.type}</th>
                  <th className="num">{t.warehouse.quantity}</th>
                  <th>{t.sales.seller}</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((tr) => (
                  <tr key={tr.id}>
                    <td className="td-main">{tr.productName}</td>
                    <td data-label={t.common.date}>{fmtDateTime(tr.createdAt)}</td>
                    <td data-label={t.sales.type}>
                      {tr.direction === 'TO_POINT' ? (
                        <Badge variant="primary">→ {t.points.toPoint}</Badge>
                      ) : (
                        <Badge variant="warning">← {t.points.toWarehouse}</Badge>
                      )}
                    </td>
                    <td className="num" data-label={t.warehouse.quantity}>
                      {fmtQty(tr.quantity)} {tr.unit}
                    </td>
                    <td data-label={t.sales.seller}>{tr.userName}</td>
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
