import { FormEvent, useState } from 'react';
import { pointsApi } from '@/entities/point/api';
import { PointStockRow } from '@/entities/point/types';
import { extractError } from '@/shared/api/http';
import { useT } from '@/shared/i18n';
import { fmtQty } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { useToast } from '@/shared/ui/Toast';

interface Props {
  pointId: string;
  row: PointStockRow;
  onClose: () => void;
  onDone: () => void;
}

/** возврат товара из точки на склад */
export function ReturnFormModal({ pointId, row, onClose, onDone }: Props) {
  const t = useT();
  const toast = useToast();
  const [quantity, setQuantity] = useState(String(row.quantity));
  const [saving, setSaving] = useState(false);

  const qty = parseFloat(quantity) || 0;
  const tooMuch = qty > row.quantity;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (qty <= 0 || tooMuch) return;
    setSaving(true);
    try {
      await pointsApi.returnToWarehouse(pointId, row.productId, qty);
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
    <Modal title={`${t.points.returnTitle}: ${row.name}`} onClose={onClose} width={420}>
      <form onSubmit={onSubmit}>
        <p className="hint-text" style={{ marginTop: 0 }}>
          {t.points.stock}: {fmtQty(row.quantity)} {row.unit}
        </p>
        <Input
          label={t.warehouse.quantity}
          type="number"
          min="0.001"
          step="0.001"
          max={row.quantity}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          error={tooMuch ? `${t.sales.notEnough} ${fmtQty(row.quantity)} ${row.unit}` : undefined}
          required
          autoFocus
        />
        <div className="modal-footer">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" loading={saving} disabled={qty <= 0 || tooMuch}>
            {t.points.returnBtn}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
