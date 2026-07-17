import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { pointsApi } from '@/entities/point/api';
import { SalesPoint } from '@/entities/point/types';
import { salesApi } from '@/entities/sale/api';
import {
  AvailableProduct,
  PaymentMethod,
  SaleSource,
  SaleType,
} from '@/entities/sale/types';
import { extractError } from '@/shared/api/http';
import { useT } from '@/shared/i18n';
import { fmtMoney, fmtQty } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { Input, Select } from '@/shared/ui/Input';
import { Thumb } from '@/shared/ui/Thumb';
import { useToast } from '@/shared/ui/Toast';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function SaleForm() {
  const t = useT();
  const { user } = useAuth();
  const toast = useToast();
  const isOwner = user?.role === 'OWNER';

  const [source, setSource] = useState<SaleSource>(isOwner ? 'WAREHOUSE' : 'POINT');
  const [points, setPoints] = useState<SalesPoint[]>([]);
  const [pointId, setPointId] = useState(isOwner ? '' : user?.pointId ?? '');
  const [products, setProducts] = useState<AvailableProduct[]>([]);
  const [productId, setProductId] = useState('');
  const [saleType, setSaleType] = useState<SaleType>('RETAIL');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (isOwner) {
      pointsApi.list().then(setPoints).catch(() => {});
    }
  }, [isOwner]);

  useEffect(() => {
    setProductId('');
    const needPoint = source === 'POINT';
    if (needPoint && !pointId) {
      setProducts([]);
      return;
    }
    let ignore = false; // защита от гонки при быстрой смене источника/точки
    salesApi
      .availableProducts(source, needPoint ? pointId : undefined)
      .then((d) => {
        if (!ignore) setProducts(d);
      })
      .catch(() => {
        if (!ignore) setProducts([]);
      });
    return () => {
      ignore = true;
    };
  }, [source, pointId, reloadKey]);

  const selected = products.find((p) => p.productId === productId);
  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;
  const total = parseFloat(totalAmount) || 0;

  const tooMuch = selected !== undefined && qty > selected.available;
  const computedTotal = saleType === 'RETAIL' ? round2(qty * price) : 0;
  const computedUnit = saleType === 'WHOLESALE' && qty > 0 ? round2(total / qty) : 0;

  const valid =
    !!productId &&
    qty > 0 &&
    !tooMuch &&
    (saleType === 'RETAIL' ? price > 0 : total > 0) &&
    (source === 'WAREHOUSE' || !!pointId);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
      const sale = await salesApi.create({
        source,
        ...(source === 'POINT' ? { pointId } : {}),
        productId,
        saleType,
        paymentMethod,
        quantity: qty,
        ...(saleType === 'WHOLESALE' ? { totalAmount: total } : { unitPrice: price }),
      });
      toast.success(
        `${t.sales.success} ${sale.productName}: ${fmtQty(sale.quantity)} ${sale.unit} = ${fmtMoney(sale.totalAmount)}`,
      );
      setQuantity('');
      setUnitPrice('');
      setTotalAmount('');
      setProductId('');
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  // продавец без привязанной точки — понятное сообщение вместо пустой формы
  if (!isOwner && !user?.pointId) {
    return (
      <div className="card card-pad" style={{ maxWidth: 680 }}>
        <p
          style={{
            margin: 0,
            color: 'var(--ink-2)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 9,
          }}
        >
          <Icon name="alert" size={19} /> {t.sales.noPointAssigned}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card card-pad sale-form" style={{ maxWidth: 680 }}>
      {/* источник: склад или точка (только владелец) */}
      {isOwner && (
        <div className="field">
          <span className="field-label">{t.sales.source}</span>
          <div className="seg-group">
            <button
              type="button"
              className={`seg-option ${source === 'WAREHOUSE' ? 'active' : ''}`}
              onClick={() => setSource('WAREHOUSE')}
            >
              {t.sales.fromWarehouse}
            </button>
            <button
              type="button"
              className={`seg-option ${source === 'POINT' ? 'active' : ''}`}
              onClick={() => setSource('POINT')}
            >
              {t.sales.fromPoint}
            </button>
          </div>
        </div>
      )}

      {isOwner && source === 'POINT' && (
        <Select
          label={t.users.point}
          value={pointId}
          onChange={(e) => setPointId(e.target.value)}
          required
        >
          <option value="">{t.sales.selectPoint}</option>
          {points.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      )}

      <Select
        label={t.sales.product}
        value={productId}
        onChange={(e) => setProductId(e.target.value)}
        required
      >
        <option value="">{t.sales.selectProduct}</option>
        {products.map((p) => (
          <option key={p.productId} value={p.productId}>
            {p.name} — {fmtQty(p.available)} {p.unit} {t.sales.available}
          </option>
        ))}
      </Select>

      {selected && (
        <div className="sale-product-preview">
          <Thumb
            productId={selected.productId}
            hasPhoto={selected.hasPhoto}
            photoRev={selected.photoRev}
            size={52}
          />
          <div>
            <div className="sale-product-name">{selected.name}</div>
            <div className="hint-text">
              {fmtQty(selected.available)} {selected.unit} {t.sales.available}
            </div>
          </div>
        </div>
      )}

      {/* тип продажи */}
      <div className="field">
        <span className="field-label">{t.sales.saleType}</span>
        <div className="seg-group">
          <button
            type="button"
            className={`seg-option ${saleType === 'RETAIL' ? 'active' : ''}`}
            onClick={() => setSaleType('RETAIL')}
          >
            {t.sales.retail}
            <span className="seg-option-sub">{t.sales.retailHint}</span>
          </button>
          <button
            type="button"
            className={`seg-option ${saleType === 'WHOLESALE' ? 'active' : ''}`}
            onClick={() => setSaleType('WHOLESALE')}
          >
            {t.sales.wholesale}
            <span className="seg-option-sub">{t.sales.wholesaleHint}</span>
          </button>
        </div>
      </div>

      <div className="form-grid">
        <Input
          label={`${t.sales.quantity}${selected ? ` (${selected.unit})` : ''}`}
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
        {saleType === 'RETAIL' ? (
          <Input
            label={`${t.sales.unitPrice} (${t.common.somoni})`}
            type="number"
            min="0.01"
            step="0.01"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            required
          />
        ) : (
          <Input
            label={`${t.sales.totalAmount} (${t.common.somoni})`}
            type="number"
            min="0.01"
            step="0.01"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            required
          />
        )}
      </div>

      {/* автоматический расчёт */}
      <div className="calc-box">
        <span className="calc-box-label">
          {saleType === 'RETAIL' ? t.sales.calculatedTotal : t.sales.calculatedUnitPrice}
        </span>
        <span className="calc-box-value">
          {saleType === 'RETAIL' ? fmtMoney(computedTotal) : fmtMoney(computedUnit)}
        </span>
      </div>

      {/* способ оплаты */}
      <div className="field">
        <span className="field-label">{t.sales.paymentMethod}</span>
        <div className="seg-group">
          <button
            type="button"
            className={`seg-option ${paymentMethod === 'CASH' ? 'active' : ''}`}
            onClick={() => setPaymentMethod('CASH')}
          >
            <Icon name="cash" size={21} />
            {t.sales.cash}
          </button>
          <button
            type="button"
            className={`seg-option ${paymentMethod === 'CARD' ? 'active' : ''}`}
            onClick={() => setPaymentMethod('CARD')}
          >
            <Icon name="card" size={21} />
            {t.sales.card}
          </button>
        </div>
      </div>

      <Button type="submit" loading={saving} disabled={!valid} style={{ width: '100%', height: 44 }}>
        {t.sales.submit}
      </Button>
    </form>
  );
}
