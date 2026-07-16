import { FormEvent, useState } from 'react';
import dayjs from 'dayjs';
import { productsApi } from '@/entities/product/api';
import { Product } from '@/entities/product/types';
import { extractError } from '@/shared/api/http';
import { t } from '@/shared/i18n/tj';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { useToast } from '@/shared/ui/Toast';

const UNIT_SUGGESTIONS = ['дона', 'кг', 'литр', 'метр', 'қуттӣ', 'ҷуфт', 'баста'];

interface Props {
  product: Product | null;
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}

export function ProductFormModal({ product, categories, onClose, onSaved }: Props) {
  const toast = useToast();
  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState(product?.category ?? '');
  const [unit, setUnit] = useState(product?.unit ?? 'дона');
  const [costPrice, setCostPrice] = useState(product ? String(product.costPrice) : '');
  const [quantity, setQuantity] = useState(product ? String(product.quantity) : '');
  const [arrivalDate, setArrivalDate] = useState(
    product?.arrivalDate ?? dayjs().format('YYYY-MM-DD'),
  );
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const qtyNum = parseFloat(quantity) || 0;
      const payload = {
        name: name.trim(),
        category: category.trim(),
        unit: unit.trim(),
        costPrice: parseFloat(costPrice) || 0,
        arrivalDate,
      };
      if (product) {
        // остаток отправляем только если его реально изменили —
        // иначе затрём актуальное значение, изменённое продажами/трансферами
        await productsApi.update(product.id, {
          ...payload,
          ...(qtyNum !== product.quantity ? { quantity: qtyNum } : {}),
        });
      } else {
        await productsApi.create({ ...payload, quantity: qtyNum });
      }
      toast.success(t.common.saved);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={product ? t.warehouse.editProduct : t.warehouse.addProduct} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="form-grid">
          <div className="full">
            <Input
              label={t.warehouse.name}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.warehouse.namePlaceholder}
              required
              autoFocus
            />
          </div>
          <div>
            <Input
              label={t.warehouse.category}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={t.warehouse.categoryPlaceholder}
              list="category-suggestions"
            />
            <datalist id="category-suggestions">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <Input
              label={t.warehouse.unit}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder={t.warehouse.unitPlaceholder}
              list="unit-suggestions"
              required
            />
            <datalist id="unit-suggestions">
              {UNIT_SUGGESTIONS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </div>
          <Input
            label={`${t.warehouse.costPrice} (${t.common.somoni})`}
            type="number"
            min="0"
            step="0.01"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            required
          />
          <Input
            label={t.warehouse.quantity}
            type="number"
            min="0"
            step="0.001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
          <div className="full">
            <Input
              label={t.warehouse.arrivalDate}
              type="date"
              value={arrivalDate}
              onChange={(e) => setArrivalDate(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="modal-footer">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" loading={saving}>
            {t.common.save}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
