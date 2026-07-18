import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { productsApi } from '@/entities/product/api';
import { Product } from '@/entities/product/types';
import { ProductFormModal } from '@/features/product-form/ProductFormModal';
import { extractError } from '@/shared/api/http';
import { useT } from '@/shared/i18n';
import { useCachedQuery } from '@/shared/lib/cache';
import { mergeCategories } from '@/shared/lib/categories';
import { downloadFile } from '@/shared/lib/download';
import { fmtMoney, fmtQty } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Icon } from '@/shared/ui/Icon';
import { Thumb } from '@/shared/ui/Thumb';
import { Badge, EmptyState, TableSkeleton } from '@/shared/ui/misc';
import { useToast } from '@/shared/ui/Toast';

export function WarehousePage() {
  const t = useT();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [exporting, setExporting] = useState(false);

  // дебаунс поиска
  useEffect(() => {
    const tm = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(tm);
  }, [search]);

  const key = `products:${debounced}:${category}`;
  const { data: products, loading, refetch, mutate } = useCachedQuery<Product[]>(key, () =>
    productsApi.list(debounced, category),
  );

  const cats = useCachedQuery<string[]>('categories', () => productsApi.categories());
  const categories = cats.data ?? [];

  const onDelete = () => {
    if (!deleting) return;
    const id = deleting.id;
    const prev = mutate((list) => (list ?? []).filter((p) => p.id !== id)); // оптимистично убираем
    setDeleting(null);
    productsApi
      .remove(id)
      .then(() => toast.success(t.common.deleted))
      // другие фильтры/поиски ревалидируются сами при следующем заходе (SWR)
      .catch((e) => {
        mutate(() => prev ?? []); // откат
        toast.error(extractError(e));
      });
  };

  const onExport = async () => {
    setExporting(true);
    try {
      await downloadFile('/export/warehouse', `tovar-${dayjs().format('YYYY-MM-DD')}.xlsx`);
    } catch (e) {
      toast.error(extractError(e));
    } finally {
      setExporting(false);
    }
  };

  const list = products ?? [];
  const totalValue = list.reduce((acc, p) => acc + p.costPrice * p.quantity, 0);

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">{t.warehouse.title}</h1>
            <p className="page-subtitle">{t.warehouse.subtitle}</p>
          </div>
          <div className="page-actions">
            <Button variant="secondary" onClick={onExport} loading={exporting}>
              <Icon name="download" size={17} /> Excel
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Icon name="plus" size={17} /> {t.warehouse.addProduct}
            </Button>
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
            {mergeCategories(categories).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <TableSkeleton rows={5} />
        ) : list.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t.warehouse.name}</th>
                  <th>{t.warehouse.category}</th>
                  <th className="num">{t.warehouse.costPrice}</th>
                  <th className="num">{t.warehouse.sellPrice}</th>
                  <th className="num">{t.warehouse.quantity}</th>
                  <th className="num">{t.warehouse.totalValue}</th>
                  <th>{t.users.status}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id}>
                    <td className="td-main">
                      <span className="td-title-row">
                        <Thumb productId={p.id} hasPhoto={p.hasPhoto} photoRev={p.photoRev} />
                        {p.name}
                      </span>
                    </td>
                    <td data-label={t.warehouse.category}>{p.category ?? '—'}</td>
                    <td className="num" data-label={t.warehouse.costPrice}>
                      {fmtMoney(p.costPrice)}
                    </td>
                    <td className="num" data-label={t.warehouse.sellPrice}>
                      {fmtMoney(p.sellPrice)}
                    </td>
                    <td className="num" data-label={t.warehouse.quantity}>
                      {fmtQty(p.quantity)} {p.unit}
                    </td>
                    <td className="num" data-label={t.warehouse.totalValue}>
                      {fmtMoney(p.costPrice * p.quantity)}
                    </td>
                    <td data-label={t.users.status}>
                      {p.quantity <= 0 ? (
                        <Badge variant="danger">{t.warehouse.outOfStock}</Badge>
                      ) : (
                        <Badge variant="success">{t.warehouse.inStock}</Badge>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <Button
                          variant="secondary"
                          size="sm"
                          title={t.common.edit}
                          onClick={() => {
                            setEditing(p);
                            setFormOpen(true);
                          }}
                        >
                          <Icon name="edit" size={15} /> {t.common.edit}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="btn-icon"
                          title={t.common.delete}
                          onClick={() => setDeleting(p)}
                        >
                          <Icon name="trash" size={15} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} data-label={t.common.total}>
                    {list.length} {t.warehouse.productsCount}
                  </td>
                  <td className="num" data-label={t.warehouse.warehouseValue}>
                    {fmtMoney(totalValue)}
                  </td>
                  <td colSpan={3} className="tfoot-filler" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <ProductFormModal
          product={editing}
          categories={categories}
          onClose={() => setFormOpen(false)}
          onDone={() => {
            refetch(); // текущий список; другие фильтры ревалидируются при заходе (SWR)
            cats.refetch();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={t.common.delete}
          message={`${t.warehouse.deleteConfirm} (${deleting.name})`}
          onConfirm={onDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
