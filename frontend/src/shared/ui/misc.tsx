import { ReactNode } from 'react';
import { useT } from '../i18n';
import { Button } from './Button';
import { Icon } from './Icon';

export function Spinner() {
  return (
    <div className="loading-block">
      <div className="spinner" />
    </div>
  );
}

export function EmptyState({ text, icon = 'box' }: { text?: string; icon?: string }) {
  const t = useT();
  return (
    <div className="empty-state">
      <Icon name={icon} size={34} />
      <span>{text ?? t.common.empty}</span>
    </div>
  );
}

/** скелетон таблицы — показывается, пока нет кэша */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ padding: '6px 0' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton skel-row" />
      ))}
    </div>
  );
}

/** скелетон дашборда аналитики */
export function AnalyticsSkeleton() {
  return (
    <>
      <div className="stat-grid">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton skel-tile" />
        ))}
      </div>
      <div className="skeleton skel-chart" style={{ marginBottom: 14 }} />
      <div className="charts-grid">
        <div className="skeleton skel-chart" />
        <div className="skeleton skel-chart" />
      </div>
    </>
  );
}

export function Badge({
  children,
  variant = 'gray',
}: {
  children: ReactNode;
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'gray';
}) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}

interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, total, limit, onChange }: PaginationProps) {
  const t = useT();
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  return (
    <div className="pagination">
      <span className="pagination-info">
        {t.common.total}: {total} · {page}/{pages}
      </span>
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <Icon name="left" size={15} /> {t.common.prev}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        {t.common.next} <Icon name="right" size={15} />
      </Button>
    </div>
  );
}
