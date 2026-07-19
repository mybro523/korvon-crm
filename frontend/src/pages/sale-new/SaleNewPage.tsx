import { useEffect, useState } from 'react';
import { salesApi } from '@/entities/sale/api';
import { AvailableProduct } from '@/entities/sale/types';
import { SaleModal } from '@/features/sale-form/SaleModal';
import { useT } from '@/shared/i18n';
import { invalidateByPrefix, useCachedQuery } from '@/shared/lib/cache';
import { mergeCategories } from '@/shared/lib/categories';
import { fmtMoney, fmtQty } from '@/shared/lib/format';
import { productPhotoUrl } from '@/shared/lib/image';
import { Icon } from '@/shared/ui/Icon';
import { Badge, EmptyState, TableSkeleton } from '@/shared/ui/misc';

/** Витрина: карточки товаров как в интернет-магазине; клик — форма продажи */
export function SaleNewPage() {
  const t = useT();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const tm = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(tm);
  }, [search]);

  const { data, loading, mutate, refetch } = useCachedQuery<AvailableProduct[]>(
    'sale:available',
    () => salesApi.availableProducts(),
  );

  // витрина открыта долго — обновляем остатки каждые 30с и при возврате на вкладку
  useEffect(() => {
    const timer = setInterval(refetch, 30_000);
    const onFocus = () => document.visibilityState === 'visible' && refetch();
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const all = data ?? [];
  // модалка видит ЖИВОЙ товар из кэша (валидация по актуальному остатку)
  const selected = all.find((p) => p.productId === selectedId) ?? null;
  const categories = mergeCategories(
    Array.from(new Set(all.map((p) => p.category).filter(Boolean) as string[])),
  );
  const q = debounced.trim().toLowerCase();
  const list = all.filter(
    (p) =>
      (!q || p.name.toLowerCase().includes(q)) && (!category || p.category === category),
  );

  /** оптимистичное списание остатка на карточке после продажи */
  const applySold = (productId: string, qty: number) => {
    mutate((ls) =>
      (ls ?? []).map((p) =>
        p.productId === productId ? { ...p, available: p.available - qty } : p,
      ),
    );
    // цифры аналитики устарели — при следующем открытии страницы перезагрузятся
    invalidateByPrefix('analytics:');
  };
  /** ошибка сервера: дельта-откат + рефетч для сходимости с серверной правдой */
  const rollback = (productId: string, qty: number) => {
    mutate((ls) =>
      (ls ?? []).map((p) =>
        p.productId === productId ? { ...p, available: p.available + qty } : p,
      ),
    );
    refetch();
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">{t.sales.newSale}</h1>
            <p className="page-subtitle">{t.sales.pickProduct}</p>
          </div>
        </div>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <Icon name="search" size={16} />
          <input
            className="field-input"
            placeholder={t.common.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filters-selects">
          <select
            className="field-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">{t.warehouse.allCategories}</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : list.length === 0 ? (
        <div className="card">
          <EmptyState icon="cart" />
        </div>
      ) : (
        <div className="shop-grid">
          {list.map((p) => {
            const out = p.available <= 0;
            return (
              <button
                key={p.productId}
                className={`card shop-card ${out ? 'out' : ''}`}
                onClick={() => !out && setSelectedId(p.productId)}
                disabled={out}
              >
                <div className="shop-card-img">
                  {p.hasPhoto ? (
                    <img
                      src={productPhotoUrl(p.productId, p.photoRev)}
                      alt={p.name}
                      loading="lazy"
                    />
                  ) : (
                    <Icon name="box" size={38} />
                  )}
                  {out && (
                    <span className="shop-card-out">
                      <Badge variant="danger">{t.warehouse.outOfStock}</Badge>
                    </span>
                  )}
                </div>
                <div className="shop-card-body">
                  {/* рендерим всегда — иначе карточки без категории ниже соседей в ряду */}
                  <span className="shop-card-cat">{p.category ?? ' '}</span>
                  <span className="shop-card-name">{p.name}</span>
                  <div className="shop-card-row">
                    <span className="shop-card-price">
                      {p.sellPrice > 0 ? fmtMoney(p.sellPrice) : '—'}
                    </span>
                    <span className="shop-card-stock">
                      {fmtQty(p.available)} {p.unit}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <SaleModal
          product={selected}
          onClose={() => setSelectedId(null)}
          onSold={applySold}
          onError={rollback}
        />
      )}
    </>
  );
}
