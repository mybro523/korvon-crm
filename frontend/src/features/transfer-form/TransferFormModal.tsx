import { FormEvent, useEffect, useState } from 'react';
import { pointsApi } from '@/entities/point/api';
import { salesApi } from '@/entities/sale/api';
import { AvailableProduct } from '@/entities/sale/types';
import { extractError } from '@/shared/api/http';
import { t } from '@/shared/i18n/tj';
import { fmtQty } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { Input, Select } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { useToast } from '@/shared/ui/Toast';

interface Props {
  pointId: string;
  onClose: () => void;
  onDone: () => void;
}

/** передача товара со склада в точку */
export function TransferFormModal({ pointId, onClose, onDone }: Props) {
  const toast = useToast();
  const [products, setProducts] = useState<AvailableProduct[]>([]);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    salesApi
      .availableProducts('WAREHOUSE')
      .then(setProducts)
      .catch((e) => toast.error(extractError(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = products.find((p) => p.productId === productId);
  const qty = parseFloat(quantity) || 0;
  const tooMuch = selected !== undefined && qty > selected.available;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!productId || qty <= 0 || tooMuch) return;
    setSaving(true);
    try {
      await pointsApi.transfer(pointId, productId, qty);
      toast.success(t.common.saved);
      onDone();
      onClose();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={t.points.transferTitle} onClose={onClose} width={440}>
      <form onSubmit={onSubmit}>
        <Select
          label={t.sales.product}
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          required
        >
          <option value="">{t.points.selectProduct}</option>
          {products.map((p) => (
            <option key={p.productId} value={p.productId}>
              {p.name} — {t.points.available}: {fmtQty(p.available)} {p.unit}
            </option>
          ))}
        </Select>
        <Input
          label={t.warehouse.quantity}
          type="number"
          min="0.001"
          step="0.001"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          error={
            tooMuch && selected
              ? `${t.sales.notEnough} ${fmtQty(selected.available)} ${selected.unit}`
              : undefined
          }
          required
        />
        <div className="modal-footer">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" loading={saving} disabled={!productId || qty <= 0 || tooMuch}>
            {t.points.transferBtn}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
