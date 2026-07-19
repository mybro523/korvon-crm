import { FormEvent, useEffect, useState } from 'react';
import { productsApi } from '@/entities/product/api';
import { Product } from '@/entities/product/types';
import { extractError } from '@/shared/api/http';
import { useT } from '@/shared/i18n';
import { useCachedQuery } from '@/shared/lib/cache';
import { fmtMoney, fmtQty } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { Thumb } from '@/shared/ui/Thumb';
import { Badge, EmptyState, TableSkeleton } from '@/shared/ui/misc';
import { useToast } from '@/shared/ui/Toast';

/** Склад — основной запас. Отсюда товар «привозится» в точку продажи. */
export function StockPage() {
  const t = useT();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [transferring, setTransferring] = useState<Product | null>(null);

  useEffect(() => {
    const tm = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(tm);
  }, [search]);

  const key = `products:${debounced}:`;
  const { data: products, loading, mutate, refetch } = useCachedQuery<Product[]>(key, () =>
    productsApi.list(debounced, ''),
  );
  const list = products ?? [];

  /** оптимистичный перенос: модалка закрывается сразу, остатки меняются мгновенно */
  const doTransfer = (product: Product, qty: number) => {
    setTransferring(null);
    mutate((ls) =>
      (ls ?? []).map((p) =>
        p.id === product.id
          ? { ...p, quantity: p.quantity - qty, shopQty: p.shopQty + qty }
          : p,
      ),
    );
    productsApi
      .transfer(product.id, qty)
      .then(() => toast.success(t.common.saved))
      .catch((e) => {
        // дельта-откат только этого товара (не затираем другие оптимистичные изменения)
        mutate((ls) =>
          (ls ?? []).map((p) =>
            p.id === product.id
              ? { ...p, quantity: p.quantity + qty, shopQty: p.shopQty - qty }
              : p,
          ),
        );
        refetch(); // сходимся к серверной правде
        toast.error(extractError(e));
      });
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">{t.stock.title}</h1>
            <p className="page-subtitle">{t.stock.subtitle}</p>
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
      </div>

      <div className="card">
        {loading ? (
          <TableSkeleton rows={5} />
        ) : list.length === 0 ? (
          <EmptyState text={t.stock.emptyWarehouse} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t.warehouse.name}</th>
                  <th>{t.warehouse.category}</th>
                  <th className="num">{t.stock.inWarehouse}</th>
                  <th className="num">{t.stock.inShop}</th>
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
                    <td className="num" data-label={t.stock.inWarehouse}>
                      {fmtQty(p.quantity)} {p.unit}
                    </td>
                    <td className="num" data-label={t.stock.inShop}>
                      {fmtQty(p.shopQty)} {p.unit}
                    </td>
                    <td data-label={t.users.status}>
                      {p.shopQty <= p.lowStockThreshold ? (
                        <Badge variant="warning">
                          <Icon name="alert" size={12} /> {t.stock.lowStock}
                        </Badge>
                      ) : (
                        <Badge variant="success">{t.warehouse.inStock}</Badge>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <Button
                          size="sm"
                          disabled={p.quantity <= 0}
                          onClick={() => setTransferring(p)}
                        >
                          <Icon name="transfer" size={15} /> {t.stock.bringToShop}
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

      {transferring && (
        <TransferModal
          product={transferring}
          onClose={() => setTransferring(null)}
          onSubmit={doTransfer}
        />
      )}
    </>
  );
}

function TransferModal({
  product,
  onClose,
  onSubmit,
}: {
  product: Product;
  onClose: () => void;
  onSubmit: (product: Product, qty: number) => void;
}) {
  const t = useT();
  const [qty, setQty] = useState('');
  const n = parseFloat(qty) || 0;
  const tooMuch = n > product.quantity;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (n <= 0 || tooMuch) return;
    onSubmit(product, n);
  };

  return (
    <Modal title={`${t.stock.bringTitle}: ${product.name}`} onClose={onClose} width={420}>
      <form onSubmit={submit}>
        <p className="hint-text" style={{ marginTop: 0 }}>
          {t.stock.inWarehouse}: {fmtQty(product.quantity)} {product.unit} · {t.stock.inShop}:{' '}
          {fmtQty(product.shopQty)} {product.unit} · {fmtMoney(product.sellPrice)}
        </p>
        <Input
          label={`${t.warehouse.quantity} (${product.unit})`}
          type="number"
          min="0.001"
          step="0.001"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          error={tooMuch ? `${t.stock.notEnoughWarehouse} ${fmtQty(product.quantity)}` : undefined}
          required
          autoFocus
        />
        <div className="modal-footer">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" disabled={n <= 0 || tooMuch}>
            <Icon name="transfer" size={15} /> {t.stock.bringToShop}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
