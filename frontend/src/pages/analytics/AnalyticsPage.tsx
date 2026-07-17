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
  PointStat,
  TopProduct,
} from '@/entities/analytics/api';
import { extractError } from '@/shared/api/http';
import { CHART } from '@/shared/config';
import { t } from '@/shared/i18n/tj';
import { fmtMoney, fmtQty } from '@/shared/lib/format';
import { PeriodKey, periodRange, userTimeZone } from '@/shared/lib/periods';
import { Icon } from '@/shared/ui/Icon';
import { EmptyState, Spinner } from '@/shared/ui/misc';
import { useToast } from '@/shared/ui/Toast';

/* тултип в стиле дизайн-системы */
function ChartTooltip({
  active,
  payload,
  label,
  money,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; payload?: Record<string, unknown> }[];
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
}: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
}) {
  return (
    <div className="card stat-tile">
      <div className="stat-head">
        <Icon name={icon} size={15} />
        <div className="stat-label">{label}</div>
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
  return out.length ? out : data;
}

export function AnalyticsPage() {
  const toast = useToast();
  const [period, setPeriod] = useState<PeriodKey>('today');
  const [customFrom, setCustomFrom] = useState(dayjs().format('YYYY-MM-DD'));
  const [customTo, setCustomTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [top, setTop] = useState<TopProduct[]>([]);
  const [byPoints, setByPoints] = useState<PointStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { from, to } = periodRange(period, customFrom, customTo);
    const params = { from, to, tz: userTimeZone() };
    setLoading(true);
    let stale = false; // защита от гонки при быстрой смене периода
    Promise.all([
      analyticsApi.summary(params),
      analyticsApi.daily(params),
      analyticsApi.topProducts({ ...params, limit: 10 }),
      analyticsApi.byPoints(params),
    ])
      .then(([s, d, tp, bp]) => {
        if (stale) return;
        setSummary(s);
        setDaily(fillDailyGaps(d, from, to));
        setTop(tp);
        setByPoints(bp);
      })
      .catch((e) => {
        if (!stale) toast.error(extractError(e));
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customFrom, customTo]);

  const periods: { key: PeriodKey; label: string }[] = [
    { key: 'today', label: t.sales.today },
    { key: 'week', label: t.sales.week },
    { key: 'month', label: t.sales.month },
    { key: 'custom', label: t.sales.custom },
  ];

  const hasData = (summary?.salesCount ?? 0) > 0;
  const paymentData = summary
    ? [{ name: t.sales.payment, cash: summary.cashAmount, card: summary.cardAmount }]
    : [];

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
        <Spinner />
      ) : !summary ? (
        <EmptyState />
      ) : (
        <>
          <div className="stat-grid">
            <StatTile
              icon="cart"
              label={t.analytics.salesCount}
              value={String(summary.salesCount)}
              sub={`${t.analytics.wholesale}: ${summary.wholesaleCount} · ${t.analytics.retail}: ${summary.retailCount}`}
            />
            <StatTile
              icon="chart"
              label={t.analytics.totalAmount}
              value={fmtMoney(summary.totalAmount)}
              sub={`${t.analytics.profit}: ${fmtMoney(summary.totalProfit)}`}
            />
            <StatTile
              icon="cash"
              label={t.analytics.cashSales}
              value={fmtMoney(summary.cashAmount)}
              sub={`${summary.cashCount} ${t.sales.salesCount}`}
            />
            <StatTile
              icon="card"
              label={t.analytics.cardSales}
              value={fmtMoney(summary.cardAmount)}
              sub={`${summary.cardCount} ${t.sales.salesCount}`}
            />
            <StatTile icon="box" label={t.analytics.itemsSold} value={fmtQty(summary.itemsSold)} />
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

              {/* продажи по точкам */}
              <div className="card chart-card">
                <h3 className="card-title">{t.analytics.byPointsChart}</h3>
                <ResponsiveContainer width="100%" height={Math.max(200, byPoints.length * 46 + 40)}>
                  <BarChart
                    data={byPoints}
                    layout="vertical"
                    margin={{ top: 4, right: 78, left: 4, bottom: 4 }}
                  >
                    <CartesianGrid stroke={CHART.grid} horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={92}
                      tick={{ fill: CHART.ink, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip money />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                    <Bar
                      dataKey="amount"
                      name={t.analytics.totalAmount}
                      fill={CHART.series1}
                      barSize={18}
                      radius={[0, 4, 4, 0]}
                    >
                      <LabelList
                        dataKey="amount"
                        position="right"
                        formatter={(v: unknown) => fmtMoney(Number(v))}
                        style={{ fill: CHART.ink, fontSize: 11.5 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* топ товаров */}
              <div className="card chart-card">
                <h3 className="card-title">{t.analytics.topProducts}</h3>
                {top.length === 0 ? (
                  <EmptyState text={t.analytics.noData} />
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(200, top.length * 40 + 40)}>
                    <BarChart
                      data={top}
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
    </>
  );
}
