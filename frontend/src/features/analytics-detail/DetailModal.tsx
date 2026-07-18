import { useEffect, useState } from 'react';
import { TopProduct } from '@/entities/analytics/api';
import { salesApi } from '@/entities/sale/api';
import { Sale } from '@/entities/sale/types';
import { extractError } from '@/shared/api/http';
import { useT } from '@/shared/i18n';
import { fmtDateTime, fmtMoney, fmtQty } from '@/shared/lib/format';
import { Icon } from '@/shared/ui/Icon';
import { Modal } from '@/shared/ui/Modal';
import { EmptyState, TableSkeleton } from '@/shared/ui/misc';

/** тип детализации — либо список продаж, либо товарная разбивка */
export type Detail =
  | {
      kind: 'sales';
      title: string;
      paymentMethod?: 'CASH' | 'CARD';
      sellerId?: string;
      productName?: string;
    }
  | { kind: 'products'; title: string; mode: 'quantity' | 'profit' };

interface Props {
  detail: Detail;
  from: string;
  to: string;
  top: TopProduct[];
  onClose: () => void;
}

export function DetailModal({ detail, from, to, top, onClose }: Props) {
  const t = useT();
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [total, setTotal] = useState(0);
  const [sum, setSum] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (detail.kind !== 'sales') return;
    let ignore = false;
    salesApi
      .list({
        from,
        to,
        limit: 100,
        paymentMethod: detail.paymentMethod,
        sellerId: detail.sellerId,
        productName: detail.productName,
      })
      .then((r) => {
        if (ignore) return;
        setSales(r.items);
        setTotal(r.total);
        setSum(r.totalAmount);
      })
      .catch((e) => !ignore && setError(extractError(e)));
    return () => {
      ignore = true;
    };
  }, [detail, from, to]);

  return (
    <Modal title={detail.title} onClose={onClose} width={560}>
      {detail.kind === 'products' ? (
        <ProductsDetail top={top} mode={detail.mode} />
      ) : error ? (
        <EmptyState text={error} icon="alert" />
      ) : sales === null ? (
        <TableSkeleton rows={5} />
      ) : sales.length === 0 ? (
        <EmptyState text={t.analytics.noData} icon="cart" />
      ) : (
        <>
          <div className="detail-summary">
            <div className="detail-stat">
              <div className="detail-stat-label">{t.analytics.salesCount}</div>
              <div className="detail-stat-value">{total}</div>
            </div>
            <div className="detail-stat good">
              <div className="detail-stat-label">{t.analytics.totalAmount}</div>
              <div className="detail-stat-value">{fmtMoney(sum)}</div>
            </div>
          </div>
          <div className="detail-list">
            {sales.map((s) => (
              <div key={s.id} className="detail-row">
                <div className="detail-row-main">
                  <div className="detail-row-title">{s.productName}</div>
                  <div className="detail-row-sub">
                    {fmtQty(s.quantity)} {s.unit} · {fmtDateTime(s.createdAt)} ·{' '}
                    {s.paymentMethod === 'CASH' ? t.sales.cash : t.sales.card} · {s.sellerName}
                  </div>
                </div>
                <div className="detail-row-amount">{fmtMoney(s.totalAmount)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}

function ProductsDetail({ top, mode }: { top: TopProduct[]; mode: 'quantity' | 'profit' }) {
  const t = useT();
  if (top.length === 0) return <EmptyState text={t.analytics.noData} icon="box" />;
  const rows = [...top].sort((a, b) => (mode === 'profit' ? b.profit - a.profit : b.quantity - a.quantity));
  return (
    <div className="detail-list">
      {rows.map((p) => (
        <div key={`${p.name}__${p.unit}`} className="detail-row">
          <div className="detail-row-main">
            <div className="detail-row-title">{p.name}</div>
            <div className="detail-row-sub">
              {fmtQty(p.quantity)} {p.unit} · {p.count} {t.sales.salesCount} · {fmtMoney(p.amount)}
            </div>
          </div>
          <div className="detail-row-amount" style={mode === 'profit' ? { color: 'var(--primary)' } : undefined}>
            {mode === 'profit' ? (
              <>
                <Icon name="chart" size={13} /> {fmtMoney(p.profit)}
              </>
            ) : (
              `${fmtQty(p.quantity)} ${p.unit}`
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
