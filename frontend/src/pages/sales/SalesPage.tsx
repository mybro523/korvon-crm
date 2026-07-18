import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuth } from '@/app/providers/AuthProvider';
import { salesApi } from '@/entities/sale/api';
import {
  PaymentMethod,
  SalesFilter,
  SalesListResponse,
  SaleType,
} from '@/entities/sale/types';
import { extractError } from '@/shared/api/http';
import { useT } from '@/shared/i18n';
import { downloadFile } from '@/shared/lib/download';
import { fmtDateTime, fmtMoney, fmtQty } from '@/shared/lib/format';
import { PeriodKey, periodRange, userTimeZone } from '@/shared/lib/periods';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { Badge, EmptyState, Pagination, Spinner } from '@/shared/ui/misc';
import { useToast } from '@/shared/ui/Toast';

type PeriodOrAll = PeriodKey | 'all';

const LIMIT = 20;

export function SalesPage() {
  const t = useT();
  const { user } = useAuth();
  const toast = useToast();
  const isOwner = user?.role === 'OWNER';

  const [period, setPeriod] = useState<PeriodOrAll>('all');
  const [customFrom, setCustomFrom] = useState(dayjs().format('YYYY-MM-DD'));
  const [customTo, setCustomTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [payment, setPayment] = useState('');
  const [saleType, setSaleType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SalesListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const buildFilter = useCallback((): SalesFilter => {
    const filter: SalesFilter = { page, limit: LIMIT };
    if (period !== 'all') {
      const range = periodRange(period, customFrom, customTo);
      filter.from = range.from;
      filter.to = range.to;
    }
    if (payment) filter.paymentMethod = payment as PaymentMethod;
    if (saleType) filter.saleType = saleType as SaleType;
    if (search.trim()) filter.search = search.trim();
    return filter;
  }, [page, period, customFrom, customTo, payment, saleType, search]);

  useEffect(() => {
    setLoading(true);
    let stale = false; // защита от гонки: устаревший ответ не перезапишет актуальный
    const timer = setTimeout(() => {
      salesApi
        .list(buildFilter())
        .then((d) => {
          if (!stale) setData(d);
        })
        .catch((e) => {
          if (!stale) toast.error(extractError(e));
        })
        .finally(() => {
          if (!stale) setLoading(false);
        });
    }, 250);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildFilter]);

  // при смене фильтров возвращаемся на первую страницу
  useEffect(() => {
    setPage(1);
  }, [period, customFrom, customTo, payment, saleType, search]);

  const onExport = async () => {
    setExporting(true);
    try {
      const f = buildFilter();
      const params = new URLSearchParams();
      if (f.from) params.set('from', f.from);
      if (f.to) params.set('to', f.to);
      if (f.paymentMethod) params.set('paymentMethod', f.paymentMethod);
      if (f.saleType) params.set('saleType', f.saleType);
      if (f.search) params.set('search', f.search);
      params.set('tz', userTimeZone());
      await downloadFile(
        `/export/sales?${params.toString()}`,
        `furush-${dayjs().format('YYYY-MM-DD')}.xlsx`,
      );
    } catch (e) {
      toast.error(extractError(e));
    } finally {
      setExporting(false);
    }
  };

  const periods: { key: PeriodOrAll; label: string }[] = [
    { key: 'all', label: t.common.all },
    { key: 'today', label: t.sales.today },
    { key: 'week', label: t.sales.week },
    { key: 'month', label: t.sales.month },
    { key: 'custom', label: t.sales.custom },
  ];

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">{t.sales.title}</h1>
            <p className="page-subtitle">{t.sales.subtitle}</p>
          </div>
          <div className="page-actions">
            {isOwner && (
              <Button variant="secondary" onClick={onExport} loading={exporting}>
                <Icon name="download" size={17} /> {t.common.exportExcel}
              </Button>
            )}
            <Link to="/sales/new" style={{ display: 'contents' }}>
              <Button>
                <Icon name="plus" size={17} /> {t.sales.newSale}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="filters-bar">
        <div className="chip-row">
          {periods.map((p) => (
            <button
              key={p.key}
              className={`chip ${period === p.key ? 'active' : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="filters-dates">
            <input
              type="date"
              className="field-input"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
            <span style={{ color: 'var(--muted)' }}>—</span>
            <input
              type="date"
              className="field-input"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
        )}
        <div className="filters-selects">
          <select
            className="field-select"
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
          >
            <option value="">
              {t.sales.payment}: {t.common.all}
            </option>
            <option value="CASH">{t.sales.cash}</option>
            <option value="CARD">{t.sales.card}</option>
          </select>
          <select
            className="field-select"
            value={saleType}
            onChange={(e) => setSaleType(e.target.value)}
          >
            <option value="">
              {t.sales.type}: {t.common.all}
            </option>
            <option value="RETAIL">{t.sales.retail}</option>
            <option value="WHOLESALE">{t.sales.wholesale}</option>
          </select>
        </div>
        <div className="search-box">
          <Icon name="search" size={16} />
          <input
            className="field-input"
            placeholder={t.common.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        {loading ? (
          <Spinner />
        ) : !data || data.items.length === 0 ? (
          <EmptyState icon="cart" />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t.sales.product}</th>
                    <th>{t.sales.dateTime}</th>
                    <th className="num">{t.sales.quantity}</th>
                    <th className="num">{t.sales.unitPrice}</th>
                    <th className="num">{t.sales.totalAmount}</th>
                    <th>{t.sales.type}</th>
                    <th>{t.sales.payment}</th>
                    <th>{t.sales.seller}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((s) => (
                    <tr key={s.id}>
                      <td className="td-main">{s.productName}</td>
                      <td data-label={t.sales.dateTime}>{fmtDateTime(s.createdAt)}</td>
                      <td className="num" data-label={t.sales.quantity}>
                        {fmtQty(s.quantity)} {s.unit}
                      </td>
                      <td className="num" data-label={t.sales.unitPrice}>
                        {fmtMoney(s.unitPrice)}
                      </td>
                      <td className="num" data-label={t.sales.totalAmount} style={{ fontWeight: 700 }}>
                        {fmtMoney(s.totalAmount)}
                      </td>
                      <td data-label={t.sales.type}>
                        {s.saleType === 'WHOLESALE' ? (
                          <Badge variant="primary">{t.sales.wholesale}</Badge>
                        ) : (
                          <Badge variant="gray">{t.sales.retail}</Badge>
                        )}
                      </td>
                      <td data-label={t.sales.payment}>
                        {s.paymentMethod === 'CASH' ? (
                          <Badge variant="success">
                            <Icon name="cash" size={13} /> {t.sales.cash}
                          </Badge>
                        ) : (
                          <Badge variant="primary">
                            <Icon name="card" size={13} /> {t.sales.card}
                          </Badge>
                        )}
                      </td>
                      <td data-label={t.sales.seller}>{s.sellerName}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} data-label={t.common.total}>
                      {data.total} {t.sales.salesCount}
                    </td>
                    <td className="num" data-label={t.sales.totalAmount}>
                      {fmtMoney(data.totalAmount)}
                    </td>
                    <td colSpan={3} className="tfoot-filler" />
                  </tr>
                </tfoot>
              </table>
            </div>
            <Pagination page={page} total={data.total} limit={LIMIT} onChange={setPage} />
          </>
        )}
      </div>
    </>
  );
}
