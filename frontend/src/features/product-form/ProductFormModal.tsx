import { ChangeEvent, FormEvent, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { productsApi } from '@/entities/product/api';
import { Product } from '@/entities/product/types';
import { extractError } from '@/shared/api/http';
import { useT } from '@/shared/i18n';
import { compressImage, productPhotoUrl } from '@/shared/lib/image';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
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
  const t = useT();
  const toast = useToast();
  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState(product?.category ?? '');
  const [unit, setUnit] = useState(product?.unit ?? t.warehouse.unitPlaceholder);
  const [costPrice, setCostPrice] = useState(product ? String(product.costPrice) : '');
  const [quantity, setQuantity] = useState(product ? String(product.quantity) : '');
  const [arrivalDate, setArrivalDate] = useState(
    product?.arrivalDate ?? dayjs().format('YYYY-MM-DD'),
  );
  const [saving, setSaving] = useState(false);

  /** undefined — фото не меняли; dataURL — новое; '' — удалить */
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);

  const existingPhotoUrl =
    product?.hasPhoto && photo === undefined
      ? productPhotoUrl(product.id, product.photoRev)
      : null;
  const previewUrl = photo && photo !== '' ? photo : existingPhotoUrl;

  const onPickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      if (dataUrl.length > 2_800_000) {
        toast.error(t.warehouse.photoTooBig);
        return;
      }
      setPhoto(dataUrl);
    } catch {
      toast.error(t.common.error);
    }
  };

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
        ...(photo !== undefined ? { photo } : {}),
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

          {/* фото товара */}
          <div className="full field">
            <span className="field-label">{t.warehouse.photo}</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={onPickFile}
            />
            {previewUrl ? (
              <div className="photo-picker">
                <img src={previewUrl} alt="" className="photo-preview" />
                <div className="photo-picker-actions">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Icon name="edit" size={14} /> {t.warehouse.changePhoto}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setPhoto(product?.hasPhoto ? '' : undefined)}
                  >
                    <Icon name="trash" size={14} /> {t.warehouse.removePhoto}
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="photo-drop"
                onClick={() => fileRef.current?.click()}
              >
                <Icon name="download" size={20} />
                <span>{t.warehouse.uploadPhoto}</span>
              </button>
            )}
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
