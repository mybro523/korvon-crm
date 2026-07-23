import { ChangeEvent, FormEvent, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { productsApi } from '@/entities/product/api';
import { Product } from '@/entities/product/types';
import { extractError } from '@/shared/api/http';
import { useT } from '@/shared/i18n';
import { mergeCategories } from '@/shared/lib/categories';
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
  /** вызывается после фонового сохранения — родитель обновляет список */
  onDone: () => void;
  /** мгновенная правка товара в списке (до ответа сервера) — только при редактировании */
  onOptimistic?: (id: string, patch: (prev: Product) => Partial<Product>) => void;
}

export function ProductFormModal({
  product,
  categories,
  onClose,
  onDone,
  onOptimistic,
}: Props) {
  const t = useT();
  const toast = useToast();
  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState(product?.category ?? '');
  const [unit, setUnit] = useState(product?.unit ?? t.warehouse.unitPlaceholder);
  const [costPrice, setCostPrice] = useState(product ? String(product.costPrice) : '');
  const [quantity, setQuantity] = useState(product ? String(product.quantity) : '');
  const [shopQty, setShopQty] = useState(product ? String(product.shopQty) : '0');
  const [lowThreshold, setLowThreshold] = useState(
    product ? String(product.lowStockThreshold) : '15',
  );
  const [description, setDescription] = useState(product?.description ?? '');
  const [arrivalDate, setArrivalDate] = useState(
    product?.arrivalDate ?? dayjs().format('YYYY-MM-DD'),
  );

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

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const qtyNum = parseFloat(quantity) || 0;
    const shopNum = parseFloat(shopQty) || 0;
    const payload = {
      name: name.trim(),
      category: category.trim(),
      unit: unit.trim(),
      costPrice: parseFloat(costPrice) || 0,
      lowStockThreshold: parseFloat(lowThreshold) || 0,
      description: description.trim(),
      arrivalDate,
      ...(photo !== undefined ? { photo } : {}),
    };
    // остатки отправляем только если реально изменили — иначе затрём параллельные продажи;
    // expected* — то, что видели в форме: сервер отклонит правку, если остаток уже изменился
    const qtyChanged = product ? qtyNum !== product.quantity : true;
    const shopChanged = product ? shopNum !== product.shopQty : true;
    const qtyPatch = product
      ? {
          ...(qtyChanged ? { quantity: qtyNum, expectedQuantity: product.quantity } : {}),
          ...(shopChanged ? { shopQty: shopNum, expectedShopQty: product.shopQty } : {}),
        }
      : { quantity: qtyNum, shopQty: shopNum };

    // оптимистично: закрываем модалку сразу, запрос уходит в фоне
    onClose();
    let rollback: (() => void) | undefined;
    if (product) {
      // список и суммы («стоимость запасов», аналитика) обновляются мгновенно
      const before = product;
      const dQty = qtyChanged ? qtyNum - before.quantity : 0;
      const dShop = shopChanged ? shopNum - before.shopQty : 0;
      onOptimistic?.(product.id, () => ({
        name: payload.name,
        category: payload.category || null,
        unit: payload.unit,
        costPrice: payload.costPrice,
        lowStockThreshold: payload.lowStockThreshold,
        description: payload.description || null,
        arrivalDate: payload.arrivalDate,
        ...(qtyChanged ? { quantity: qtyNum } : {}),
        ...(shopChanged ? { shopQty: shopNum } : {}),
      }));
      // правка не сохранилась — возвращаем как было: остатки по дельте (не затирая
      // параллельные продажи), остальные поля — прежними значениями
      rollback = () =>
        onOptimistic?.(before.id, (prev) => ({
          name: before.name,
          category: before.category,
          unit: before.unit,
          costPrice: before.costPrice,
          lowStockThreshold: before.lowStockThreshold,
          description: before.description,
          arrivalDate: before.arrivalDate,
          ...(dQty ? { quantity: prev.quantity - dQty } : {}),
          ...(dShop ? { shopQty: prev.shopQty - dShop } : {}),
        }));
    }
    const req = product
      ? productsApi.update(product.id, { ...payload, ...qtyPatch })
      : productsApi.create({ ...payload, ...qtyPatch });
    req
      .then(() => {
        toast.success(t.common.saved);
        onDone();
      })
      .catch((err) => {
        rollback?.(); // иначе на экране остались бы несохранённые остатки и суммы
        toast.error(extractError(err));
        onDone(); // и синхронизируемся с сервером
      });
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
              {mergeCategories(categories).map((c) => (
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
            label={t.stock.lowThreshold}
            type="number"
            min="0"
            step="0.001"
            value={lowThreshold}
            onChange={(e) => setLowThreshold(e.target.value)}
            required
          />
          {/* остатки — парой в одной строке; правка «в точке» исправляет учёт, склад не трогает */}
          <Input
            label={`${t.warehouse.quantity} (${t.stock.inWarehouse})`}
            type="number"
            min="0"
            step="0.001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
          <Input
            label={`${t.warehouse.quantity} (${t.stock.inShop})`}
            type="number"
            min="0"
            step="0.001"
            value={shopQty}
            onChange={(e) => setShopQty(e.target.value)}
            required
          />
          {/* на всю ширину: полуширинных полей чётное число, иначе в сетке останется дырка */}
          <div className="full">
            <Input
              label={t.warehouse.arrivalDate}
              type="date"
              value={arrivalDate}
              onChange={(e) => setArrivalDate(e.target.value)}
              required
            />
          </div>
          <div className="full field">
            <label className="field-label">{t.warehouse.description}</label>
            <textarea
              className="field-input"
              style={{ height: 'auto', minHeight: 70, padding: '10px 12px', resize: 'vertical' }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.warehouse.descriptionPlaceholder}
              maxLength={2000}
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
          <Button type="submit">{t.common.save}</Button>
        </div>
      </form>
    </Modal>
  );
}
