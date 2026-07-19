import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  analyticsApi,
  AnalyticsSummary,
  DailyPoint,
  InventoryStats,
  TopProduct,
} from '@/entities/analytics/api';
import { Detail, DetailModal } from '@/features/analytics-detail/DetailModal';
import { extractError } from '@/shared/api/http';
import { CHART } from '@/shared/config';
import { useT } from '@/shared/i18n';
import { useCachedQuery } from '@/shared/lib/cache';
import { fmtMoney, fmtQty } from '@/shared/lib/format';
import { PeriodKey, periodRange, userTimeZone } from '@/shared/lib/periods';
import { Icon } from '@/shared/ui/Icon';
import { Modal } from '@/shared/ui/Modal';
import { AnalyticsSkeleton, EmptyState } from '@/shared/ui/misc';

interface Bundle {
  summary: AnalyticsSummary;
  daily: DailyPoint[];
  top: TopProduct[];
}

function ChartTooltip({
  active,
  payload,
  label,
  money,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string }[];
  label?: string;
  money?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const niceLabel =
    label && /^\d{4}-\d{2}-\d{2}$/.test(label) ? dayjs(label).format('DD.MM.YYYY') : label;
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 8,
        boxShadow: 'var(--shadow-pop)',
        padding: '8px 12px',
        fontSize: 12.5,
      }}
    >
      {niceLabel && <div style={{ fontWeight: 700, marginBottom: 4 }}>{niceLabel}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: 'var(--ink-2)' }}>
          {p.name}:{' '}
          <b style={{ color: 'var(--ink)' }}>
            {money ? fmtMoney(Number(p.value)) : fmtQty(Number(p.value))}
          </b>
        </div>
      ))}
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  icon,
  onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  onClick?: () => void;
}) {
  return (
    <div className={`card stat-tile ${onClick ? 'clickable' : ''}`} onClick={onClick}>
      <div className="stat-head">
        <Icon name={icon} size={15} />
        <div className="stat-label">{label}</div>
        {onClick && <Icon name="right" size={15} className="stat-arrow" />}
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

/** дни без продаж должны отображаться нулями, иначе график искажает динамику */
function fillDailyGaps(data: DailyPoint[], fromIso: string, toIso: string): DailyPoint[] {
  const byDate = new Map(data.map((x) => [x.date, x]));
  const out: DailyPoint[] = [];
  let d = dayjs(fromIso).startOf('day');
  const end = dayjs(toIso);
  let guard = 0;
  while (d.isBefore(end) && guard < 400) {
    const key = d.format('YYYY-MM-DD');
    out.push(byDate.get(key) ?? { date: key, count: 0, amount: 0 });
    d = d.add(1, 'day');
    guard++;
  }
  // диапазон длиннее лимита: НЕ обрезаем реальные продажи хвоста — показываем как есть
  if (d.isBefore(end)) return data;
  return out.length ? out : data;
}

export function AnalyticsPage() {
  const t = useT();
  const [period, setPeriod] = useState<PeriodKey>('today');
  const [customFrom, setCustomFrom] = useState(dayjs().format('YYYY-MM-DD'));
  const [customTo, setCustomTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [detail, setDetail] = useState<Detail | null>(null);

  const { from, to } = periodRange(period, customFrom, customTo);
  const cacheKey = `analytics:${from}:${to}`;

  const { data, loading, error, refetch } = useCachedQuery<Bundle>(cacheKey, async () => {
    const params = { from, to, tz: userTimeZone() };
    const [summary, daily, top] = await Promise.all([
      analyticsApi.summary(params),
      analyticsApi.daily(params),
      // берём до 50 для полноты «прибыли по товарам»; график покажет топ-10
      analyticsApi.topProducts({ ...params, limit: 50 }),
    ]);
    return { summary, daily: fillDailyGaps(daily, from, to), top };
  });

  // аналитика склада — от периода не зависит, отдельный кэш
  const { data: inv, refetch: refetchInv } = useCachedQuery<InventoryStats>(
    'analytics:inventory',
    () => analyticsApi.inventory(),
  );
  const [invList, setInvList] = useState<'low' | 'out' | null>(null);

  // цифры могли устареть после продаж/трансферов на других страницах — обновляем при возврате
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState !== 'visible') return;
      refetch();
      refetchInv();
    };
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // закрываем модалку детализации при смене периода
  useEffect(() => {
    setDetail(null);
  }, [period, customFrom, customTo]);

  const periods: { key: PeriodKey; label: string }[] = [
    { key: 'today', label: t.sales.today },
    { key: 'week', label: t.sales.week },
    { key: 'month', label: t.sales.month },
    { key: 'custom', label: t.sales.custom },
  ];

  const summary = data?.summary;
  const daily = data?.daily ?? [];
  const top = data?.top ?? [];
  const topChart = top.slice(0, 10); // график — топ-10; в модалку прибыли идёт весь top
  const hasData = (summary?.salesCount ?? 0) > 0;
  const paymentData = summary
    ? [{ name: t.sales.payment, cash: summary.cashAmount, card: summary.cardAmount }]
    : [];

  const avgCheck = summary && summary.salesCount > 0 ? summary.totalAmount / summary.salesCount : 0;
  const marginPct =
    summary && summary.totalAmount > 0 ? (summary.totalProfit / summary.totalAmount) * 100 : 0;

  /** штучные остатки: одна единица — просто число, разные (кг + дона) — разбивка */
  const unitsStr = (sel: (u: { warehouse: number; shop: number }) => number) => {
    const parts = (inv?.unitsBreakdown ?? [])
      .map((u) => ({ unit: u.unit, qty: sel(u) }))
      .filter((p) => p.qty > 0);
    if (parts.length === 0) return '0';
    if (parts.length === 1) return fmtQty(parts[0].qty);
    return parts.map((p) => `${fmtQty(p.qty)} ${p.unit}`).join(' · ');
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">{t.analytics.title}</h1>
            <p className="page-subtitle">{t.analytics.subtitle}</p>
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
      </div>

      {loading ? (
        <AnalyticsSkeleton />
      ) : !summary ? (
        <div className="card">
          <EmptyState text={error ? extractError(error) : undefined} icon={error ? 'alert' : undefined} />
        </div>
      ) : (
        <>
          <div className="stat-grid">
            <StatTile
              icon="cart"
              label={t.analytics.salesCount}
              value={String(summary.salesCount)}
              sub={`${t.analytics.wholesale}: ${summary.wholesaleCount} · ${t.analytics.retail}: ${summary.retailCount}`}
              onClick={
                hasData
                  ? () => setDetail({ kind: 'sales', title: t.analytics.allSales })
                  : undefined
              }
            />
            <StatTile
              icon="chart"
              label={t.analytics.totalAmount}
              value={fmtMoney(summary.totalAmount)}
              sub={`${t.analytics.avgCheck}: ${fmtMoney(avgCheck)}`}
              onClick={
                hasData
                  ? () => setDetail({ kind: 'sales', title: t.analytics.totalAmount })
                  : undefined
              }
            />
            <StatTile
              icon="box"
              label={t.analytics.profit}
              value={fmtMoney(summary.totalProfit)}
              sub={`${t.analytics.margin}: ${marginPct.toFixed(1)}%`}
              onClick={
                hasData
                  ? () =>
                      setDetail({ kind: 'products', title: t.analytics.profitByProduct, mode: 'profit' })
                  : undefined
              }
            />
            <StatTile
              icon="cash"
              label={t.analytics.cashSales}
              value={fmtMoney(summary.cashAmount)}
              sub={`${summary.cashCount} ${t.sales.salesCount}`}
              onClick={
                summary.cashCount > 0
                  ? () => setDetail({ kind: 'sales', title: t.analytics.cashSales, paymentMethod: 'CASH' })
                  : undefined
              }
            />
            <StatTile
              icon="card"
              label={t.analytics.cardSales}
              value={fmtMoney(summary.cardAmount)}
              sub={`${summary.cardCount} ${t.sales.salesCount}`}
              onClick={
                summary.cardCount > 0
                  ? () => setDetail({ kind: 'sales', title: t.analytics.cardSales, paymentMethod: 'CARD' })
                  : undefined
              }
            />
            <StatTile
              icon="box"
              label={t.analytics.itemsSold}
              value={fmtQty(summary.itemsSold)}
              onClick={
                hasData
                  ? () =>
                      setDetail({ kind: 'products', title: t.analytics.topProducts, mode: 'quantity' })
                  : undefined
              }
            />
          </div>

          {!hasData ? (
            <div className="card">
              <EmptyState text={t.analytics.noData} icon="chart" />
            </div>
          ) : (
            <div className="charts-grid">
              {/* динамика продаж по дням */}
              <div className="card chart-card wide">
                <h3 className="card-title">{t.analytics.dailyChart}</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={daily} margin={{ top: 6, right: 12, left: 6, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART.series1} stopOpacity={0.22} />
                        <stop offset="100%" stopColor={CHART.series1} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d: string) => dayjs(d).format('DD.MM')}
                      tick={{ fill: CHART.muted, fontSize: 11 }}
                      axisLine={{ stroke: CHART.grid }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: CHART.muted, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={54}
                    />
                    <Tooltip
                      content={<ChartTooltip money />}
                      labelFormatter={(d: string) => dayjs(d).format('DD.MM.YYYY')}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      name={t.analytics.totalAmount}
                      stroke={CHART.series1}
                      strokeWidth={2}
                      fill="url(#gradAmount)"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* топ товаров — клик по бару открывает продажи этого товара */}
              <div className="card chart-card">
                <h3 className="card-title">{t.analytics.topProducts}</h3>
                {topChart.length === 0 ? (
                  <EmptyState text={t.analytics.noData} />
                ) : (
                  <>
                    <p className="hint-text" style={{ marginTop: -6, marginBottom: 6 }}>
                      {t.analytics.clickHint}
                    </p>
                    <ResponsiveContainer width="100%" height={Math.max(200, topChart.length * 40 + 40)}>
                      <BarChart
                        data={topChart}
                        layout="vertical"
                        margin={{ top: 4, right: 56, left: 4, bottom: 4 }}
                      >
                        <CartesianGrid stroke={CHART.grid} horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={104}
                          tick={{ fill: CHART.ink, fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                        <Bar
                          dataKey="quantity"
                          name={t.analytics.itemsSold}
                          fill={CHART.series2}
                          barSize={16}
                          radius={[0, 4, 4, 0]}
                          cursor="pointer"
                          onClick={(d: any) => {
                            if (!d?.name) return;
                            setDetail({ kind: 'sales', title: d.name, productName: d.name });
                          }}
                        >
                          <LabelList
                            dataKey="quantity"
                            position="right"
                            formatter={(v: unknown) => fmtQty(Number(v))}
                            style={{ fill: CHART.ink, fontSize: 11.5 }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </>
                )}
              </div>

              {/* наличные vs карта */}
              <div className="card chart-card wide">
                <h3 className="card-title">{t.analytics.paymentSplit}</h3>
                <ResponsiveContainer width="100%" height={90}>
                  <BarChart data={paymentData} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" hide />
                    <Tooltip content={<ChartTooltip money />} cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="cash" name={t.sales.cash} stackId="p" fill={CHART.series1} barSize={26} radius={[4, 0, 0, 4]}>
                      <Cell stroke="#fff" strokeWidth={2} />
                    </Bar>
                    <Bar dataKey="card" name={t.sales.card} stackId="p" fill={CHART.series2} barSize={26} radius={[0, 4, 4, 0]}>
                      <Cell stroke="#fff" strokeWidth={2} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div
                  style={{
                    display: 'flex',
                    gap: 18,
                    flexWrap: 'wrap',
                    padding: '2px 12px 10px',
                    fontSize: 12.5,
                    color: 'var(--ink-2)',
                  }}
                >
                  <span>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: CHART.series1, marginRight: 6 }} />
                    {t.sales.cash}: <b style={{ color: 'var(--ink)' }}>{fmtMoney(summary.cashAmount)}</b>
                  </span>
                  <span>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: CHART.series2, marginRight: 6 }} />
                    {t.sales.card}: <b style={{ color: 'var(--ink)' }}>{fmtMoney(summary.cardAmount)}</b>
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* аналитика склада — текущие запасы, не зависит от периода (и от его loading) */}
      {inv && (
        <section>
          <div className="page-header" style={{ marginTop: 22 }}>
            <h2 className="page-title" style={{ fontSize: 17 }}>
              {t.analytics.inventoryTitle}
            </h2>
            <p className="page-subtitle">{t.analytics.inventorySubtitle}</p>
          </div>

          <div className="stat-grid">
            <StatTile
              icon="box"
              label={t.analytics.positions}
              value={String(inv.productsCount)}
              sub={`${t.analytics.unitsTotal}: ${unitsStr((u) => u.warehouse + u.shop)}`}
            />
            <StatTile
              icon="store"
              label={t.stock.inWarehouse}
              value={unitsStr((u) => u.warehouse)}
              sub={fmtMoney(inv.warehouseCost)}
            />
            <StatTile
              icon="cart"
              label={t.stock.inShop}
              value={unitsStr((u) => u.shop)}
              sub={fmtMoney(inv.shopCost)}
            />
            <StatTile
              icon="cash"
              label={t.analytics.inventoryCost}
              value={fmtMoney(inv.inventoryCost)}
            />
            <StatTile
              icon="chart"
              label={t.analytics.potentialRevenue}
              value={fmtMoney(inv.potentialRevenue)}
              sub={`${t.analytics.potentialProfit}: ${fmtMoney(inv.potentialProfit)}`}
            />
            <StatTile
              icon="alert"
              label={t.analytics.lowStockCount}
              value={String(inv.lowStockCount)}
              sub={inv.lowStockCount > 0 ? t.analytics.clickHint : t.analytics.noProblems}
              onClick={inv.lowStockCount > 0 ? () => setInvList('low') : undefined}
            />
            <StatTile
              icon="alert"
              label={t.analytics.outOfStockCount}
              value={String(inv.outOfStockCount)}
              sub={inv.outOfStockCount > 0 ? t.analytics.clickHint : undefined}
              onClick={inv.outOfStockCount > 0 ? () => setInvList('out') : undefined}
            />
          </div>

          {inv.topByValue.length > 0 && (
            <div className="charts-grid">
              <div className="card chart-card wide">
                <h3 className="card-title">{t.analytics.topByValue}</h3>
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(160, inv.topByValue.length * 40 + 40)}
                >
                  <BarChart
                    data={inv.topByValue}
                    layout="vertical"
                    margin={{ top: 4, right: 84, left: 4, bottom: 4 }}
                  >
                    <CartesianGrid stroke={CHART.grid} horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={104}
                      tick={{ fill: CHART.ink, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip money />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                    <Bar
                      dataKey="value"
                      name={t.analytics.inventoryCost}
                      fill={CHART.series1}
                      barSize={16}
                      radius={[0, 4, 4, 0]}
                    >
                      <LabelList
                        dataKey="value"
                        position="right"
                        formatter={(v: unknown) => fmtMoney(Number(v))}
                        style={{ fill: CHART.ink, fontSize: 11.5 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </section>
      )}

      {detail && (
        <DetailModal detail={detail} from={from} to={to} top={top} onClose={() => setDetail(null)} />
      )}

      {invList && inv && (
        <Modal
          title={invList === 'low' ? t.analytics.lowStockCount : t.analytics.outOfStockCount}
          onClose={() => setInvList(null)}
          width={480}
        >
          {invList === 'low' ? (
            inv.lowStockItems.length === 0 ? (
              <EmptyState text={t.analytics.noProblems} icon="box" />
            ) : (
              <>
                <div className="detail-list">
                  {inv.lowStockItems.map((p) => (
                    <div key={p.id} className="detail-row">
                      <div className="detail-row-main">
                        <div className="detail-row-title">{p.name}</div>
                        <div className="detail-row-sub">
                          {t.stock.inWarehouse}: {fmtQty(p.warehouseQty)} {p.unit}
                        </div>
                      </div>
                      <div className="detail-row-amount" style={{ color: 'var(--warn, #b45309)' }}>
                        {t.stock.inShop}: {fmtQty(p.shopQty)}
                      </div>
                    </div>
                  ))}
                </div>
                {inv.lowStockCount > inv.lowStockItems.length && (
                  <p className="hint-text">
                    {t.analytics.shownFirst}: {inv.lowStockItems.length} / {inv.lowStockCount}
                  </p>
                )}
              </>
            )
          ) : inv.outOfStockItems.length === 0 ? (
            <EmptyState text={t.analytics.noProblems} icon="box" />
          ) : (
            <>
              <div className="detail-list">
                {inv.outOfStockItems.map((p) => (
                  <div key={p.id} className="detail-row">
                    <div className="detail-row-main">
                      <div className="detail-row-title">{p.name}</div>
                    </div>
                    <div className="detail-row-amount" style={{ color: 'var(--danger, #b91c1c)' }}>
                      {t.warehouse.outOfStock}
                    </div>
                  </div>
                ))}
              </div>
              {inv.outOfStockCount > inv.outOfStockItems.length && (
                <p className="hint-text">
                  {t.analytics.shownFirst}: {inv.outOfStockItems.length} / {inv.outOfStockCount}
                </p>
              )}
            </>
          )}
        </Modal>
      )}
    </>
  );
}
