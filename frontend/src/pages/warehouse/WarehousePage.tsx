import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { productsApi } from '@/entities/product/api';
import { Product } from '@/entities/product/types';
import { ProductFormModal } from '@/features/product-form/ProductFormModal';
import { extractError } from '@/shared/api/http';
import { t } from '@/shared/i18n/tj';
import { downloadFile } from '@/shared/lib/download';
import { fmtDate, fmtMoney, fmtQty } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Icon } from '@/shared/ui/Icon';
import { Badge, EmptyState, Spinner } from '@/shared/ui/misc';
import { useToast } from '@/shared/ui/Toast';

export function WarehousePage() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    let stale = false; // защита от гонки при быстром вводе в поиск
    const timer = setTimeout(() => {
      productsApi
        .list(search, category)
        .then((p) => {
          if (!stale) setProducts(p);
        })
        .catch((e) => {
          if (!stale) toast.error(extractError(e));
        })
        .finally(() => {
          if (!stale) setLoading(false);
        });
    }, 300);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, reloadKey]);

  const loadCategories = useCallback(() => {
    productsApi.categories().then(setCategories).catch(() => {});
  }, []);

  useEffect(loadCategories, [loadCategories]);

  const onSaved = () => {
    setReloadKey((k) => k + 1);
    loadCategories();
  };

  const onDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await productsApi.remove(deleting.id);
      toast.success(t.common.deleted);
      setDeleting(null);
      onSaved();
    } catch (e) {
      toast.error(extractError(e));
    } finally {
      setDeleteBusy(false);
    }
  };

  const onExport = async () => {
    setExporting(true);
    try {
      await downloadFile('/export/warehouse', `anbor-${dayjs().format('YYYY-MM-DD')}.xlsx`);
    } catch (e) {
      toast.error(extractError(e));
    } finally {
      setExporting(false);
    }
  };

  const totalValue = products.reduce((acc, p) => acc + p.costPrice * p.quantity, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t.warehouse.title}</h1>
          <p className="page-subtitle">{t.warehouse.subtitle}</p>
        </div>
        <div className="page-actions">
          <Button variant="secondary" onClick={onExport} loading={exporting}>
            <Icon name="download" size={16} /> {t.common.exportExcel}
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Icon name="plus" size={16} /> {t.warehouse.addProduct}
          </Button>
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

      <div className="card">
        {loading ? (
          <Spinner />
        ) : products.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t.warehouse.name}</th>
                  <th>{t.warehouse.category}</th>
                  <th className="num">{t.warehouse.costPrice}</th>
                  <th className="num">{t.warehouse.quantity}</th>
                  <th className="num">{t.warehouse.totalValue}</th>
                  <th>{t.warehouse.arrivalDate}</th>
                  <th>{t.users.status}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.category ?? '—'}</td>
                    <td className="num">{fmtMoney(p.costPrice)}</td>
                    <td className="num">
                      {fmtQty(p.quantity)} {p.unit}
                    </td>
                    <td className="num">{fmtMoney(p.costPrice * p.quantity)}</td>
                    <td>{fmtDate(p.arrivalDate)}</td>
                    <td>
                      {p.quantity <= 0 ? (
                        <Badge variant="danger">{t.warehouse.outOfStock}</Badge>
                      ) : (
                        <Badge variant="success">{t.warehouse.inStock}</Badge>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="btn-icon"
                          title={t.common.edit}
                          onClick={() => {
                            setEditing(p);
                            setFormOpen(true);
                          }}
                        >
                          <Icon name="edit" size={15} />
                        </Button>
                        <Button
                          variant="ghost"
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
                  <td colSpan={4}>{t.warehouse.warehouseValue}</td>
                  <td className="num">{fmtMoney(totalValue)}</td>
                  <td colSpan={3} />
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
          onSaved={onSaved}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={t.common.delete}
          message={`${t.warehouse.deleteConfirm} (${deleting.name})`}
          onConfirm={onDelete}
          onCancel={() => setDeleting(null)}
          loading={deleteBusy}
        />
      )}
    </>
  );
}
