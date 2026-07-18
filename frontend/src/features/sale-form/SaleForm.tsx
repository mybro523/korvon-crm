import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { salesApi } from '@/entities/sale/api';
import { AvailableProduct, PaymentMethod, SaleType } from '@/entities/sale/types';
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

  const [products, setProducts] = useState<AvailableProduct[]>([]);
  const [productId, setProductId] = useState('');
  const [saleType, setSaleType] = useState<SaleType>('RETAIL');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [priceTouched, setPriceTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    salesApi
      .availableProducts()
      .then((d) => {
        if (!ignore) setProducts(d);
      })
      .catch(() => {
        if (!ignore) setProducts([]);
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const selected = products.find((p) => p.productId === productId);

  // при выборе товара подставляем его цену продажи (если пользователь не менял вручную)
  useEffect(() => {
    if (selected && saleType === 'RETAIL' && !priceTouched) {
      setUnitPrice(selected.sellPrice > 0 ? String(selected.sellPrice) : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, saleType]);

  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;
  const total = parseFloat(totalAmount) || 0;

  const tooMuch = selected !== undefined && qty > selected.available;
  const computedTotal = saleType === 'RETAIL' ? round2(qty * price) : 0;
  const computedUnit = saleType === 'WHOLESALE' && qty > 0 ? round2(total / qty) : 0;

  const valid =
    !!productId && qty > 0 && !tooMuch && (saleType === 'RETAIL' ? price > 0 : total > 0);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
      const sale = await salesApi.create({
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
      setPriceTouched(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  // продавец без доступа: если товаров нет — покажем пустое состояние ниже
  if (!user) return null;

  return (
    <form onSubmit={onSubmit} className="card card-pad sale-form" style={{ maxWidth: 680 }}>
      <Select
        label={t.sales.product}
        value={productId}
        onChange={(e) => {
          setProductId(e.target.value);
          setPriceTouched(false);
        }}
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
              {selected.sellPrice > 0 ? ` · ${fmtMoney(selected.sellPrice)}` : ''}
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
            onChange={(e) => {
              setUnitPrice(e.target.value);
              setPriceTouched(true);
            }}
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
