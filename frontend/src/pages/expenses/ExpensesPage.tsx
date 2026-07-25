import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useAuth } from '@/app/providers/AuthProvider';
import { expensesApi } from '@/entities/expense/api';
import { Expense, ExpensesFilter, ExpensesListResponse } from '@/entities/expense/types';
import { ExpenseModal } from '@/features/expense-form/ExpenseModal';
import { extractError } from '@/shared/api/http';
import { useT } from '@/shared/i18n';
import { invalidateByPrefix, useCachedQuery } from '@/shared/lib/cache';
import { fmtDateTime, fmtMoney } from '@/shared/lib/format';
import { PeriodKey, periodRange } from '@/shared/lib/periods';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Icon } from '@/shared/ui/Icon';
import { Badge, EmptyState, Pagination, TableSkeleton } from '@/shared/ui/misc';
import { useToast } from '@/shared/ui/Toast';

type PeriodOrAll = PeriodKey | 'all';
const LIMIT = 20;

export function ExpensesPage() {
  const t = useT();
  const { user } = useAuth();
  const toast = useToast();
  const isOwner = user?.role === 'OWNER';

  const [period, setPeriod] = useState<PeriodOrAll>('all');
  const [customFrom, setCustomFrom] = useState(dayjs().format('YYYY-MM-DD'));
  const [customTo, setCustomTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  useEffect(() => {
    const tm = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(tm);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [period, customFrom, customTo, debounced]);

  const filter = useMemo((): ExpensesFilter => {
    const f: ExpensesFilter = { page, limit: LIMIT };
    if (period !== 'all') {
      const range = periodRange(period, customFrom, customTo);
      f.from = range.from;
      f.to = range.to;
    }
    if (debounced.trim()) f.search = debounced.trim();
    return f;
  }, [page, period, customFrom, customTo, debounced]);

  const { data, loading, mutate, refetch } = useCachedQuery<ExpensesListResponse>(
    `expenses:${JSON.stringify(filter)}`,
    () => expensesApi.list(filter),
  );

  const empty = (): ExpensesListResponse => ({
    items: [],
    total: 0,
    page: 1,
    limit: LIMIT,
    totalAmount: 0,
  });

  /** новая запись видна в ТЕКУЩЕМ виде, только если реально в него попадает:
      первая страница, без несовпадающего поиска и внутри выбранного периода */
  const matchesView = (e: Expense): boolean => {
    if (page !== 1) return false;
    const q = debounced.trim().toLowerCase();
    if (q && !e.comment.toLowerCase().includes(q)) return false;
    if (period !== 'all') {
      const { from, to } = periodRange(period, customFrom, customTo);
      const ts = new Date(e.createdAt).getTime();
      if (ts < new Date(from).getTime() || ts > new Date(to).getTime()) return false;
    }
    return true;
  };

  /** оптимистично: если запись видна в текущем фильтре — показываем сверху сразу */
  const addOptimistic = (temp: Expense) => {
    if (matchesView(temp)) {
      mutate((prev) => {
        const base = prev ?? empty();
        return {
          ...base,
          items: [temp, ...base.items],
          total: base.total + 1,
          totalAmount: base.totalAmount + temp.amount,
        };
      });
    }
    invalidateByPrefix('analytics:'); // карточка «Расходы» в аналитике устарела
  };
  /** сервер подтвердил — сходимся к его правде (верная сортировка/страница/фильтр) */
  const afterSaved = () => refetch();
  const removeTemp = (tempId: string) => {
    mutate((prev) => {
      if (!prev) return empty();
      const gone = prev.items.find((e) => e.id === tempId);
      if (!gone) return prev; // temp не показывался (не в этом виде) — откатывать нечего
      return {
        ...prev,
        items: prev.items.filter((e) => e.id !== tempId),
        total: Math.max(0, prev.total - 1),
        totalAmount: prev.totalAmount - gone.amount,
      };
    });
  };

  const onDelete = () => {
    if (!deleting) return;
    const removed = deleting;
    setDeleting(null);
    // удалили последнюю запись на не-первой странице — уходим на предыдущую
    const wasLastOnPage = (data?.items.length ?? 0) <= 1 && page > 1;
    mutate((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.filter((e) => e.id !== removed.id),
            total: Math.max(0, prev.total - 1),
            totalAmount: prev.totalAmount - removed.amount,
          }
        : empty(),
    );
    invalidateByPrefix('analytics:');
    if (wasLastOnPage) setPage((p) => Math.max(1, p - 1)); // сменит ключ → подгрузит стр.
    expensesApi
      .remove(removed.id)
      .then(() => {
        toast.success(t.common.deleted);
        if (!wasLastOnPage) refetch(); // сходимся с сервером (total/пагинация)
      })
      .catch((e) => {
        refetch(); // откат к серверной правде
        toast.error(extractError(e));
      });
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
            <h1 className="page-title">{t.expenses.title}</h1>
            <p className="page-subtitle">{t.expenses.subtitle}</p>
          </div>
          <div className="page-actions">
            <Button onClick={() => setFormOpen(true)}>
              <Icon name="plus" size={17} /> {t.expenses.add}
            </Button>
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
          <TableSkeleton rows={6} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState icon="expense" text={t.expenses.empty} />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t.expenses.comment}</th>
                    <th>{t.sales.dateTime}</th>
                    <th>{t.expenses.author}</th>
                    <th className="num">{t.expenses.amount}</th>
                    {isOwner && <th />}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((e) => (
                    <tr key={e.id}>
                      <td className="td-main">{e.comment}</td>
                      <td data-label={t.sales.dateTime}>{fmtDateTime(e.createdAt)}</td>
                      <td data-label={t.expenses.author}>
                        <Badge variant="gray">{e.createdByName}</Badge>
                      </td>
                      <td className="num" data-label={t.expenses.amount} style={{ fontWeight: 700 }}>
                        {fmtMoney(e.amount)}
                      </td>
                      {isOwner && (
                        <td>
                          <div className="row-actions">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="btn-icon"
                              title={t.common.delete}
                              disabled={e.id.startsWith('temp-')}
                              onClick={() => setDeleting(e)}
                            >
                              <Icon name="trash" size={15} />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} data-label={t.common.total}>
                      {data.total} {t.expenses.count}
                    </td>
                    <td className="num" data-label={t.expenses.amount}>
                      {fmtMoney(data.totalAmount)}
                    </td>
                    {isOwner && <td className="tfoot-filler" />}
                  </tr>
                </tfoot>
              </table>
            </div>
            <Pagination page={page} total={data.total} limit={LIMIT} onChange={setPage} />
          </>
        )}
      </div>

      {formOpen && (
        <ExpenseModal
          onClose={() => setFormOpen(false)}
          onAdd={addOptimistic}
          onSaved={afterSaved}
          onError={removeTemp}
          authorName={user?.fullName ?? ''}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={t.expenses.deleteTitle}
          message={t.expenses.deleteConfirm}
          onConfirm={onDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
