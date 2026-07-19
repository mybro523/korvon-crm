import { FormEvent, useState } from 'react';
import { salesApi } from '@/entities/sale/api';
import { AvailableProduct, PaymentMethod, SaleType } from '@/entities/sale/types';
import { extractError } from '@/shared/api/http';
import { useT } from '@/shared/i18n';
import { fmtMoney, fmtQty } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { Thumb } from '@/shared/ui/Thumb';
import { useToast } from '@/shared/ui/Toast';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

interface Props {
  product: AvailableProduct;
  onClose: () => void;
  /** оптимистичное списание остатка на витрине */
  onSold: (productId: string, qty: number) => void;
  /** откат при ошибке сервера */
  onError: (productId: string, qty: number) => void;
}

/** форма продажи выбранного товара: тип, количество, цена/сумма, оплата */
export function SaleModal({ product, onClose, onSold, onError }: Props) {
  const t = useT();
  const toast = useToast();
  const [saleType, setSaleType] = useState<SaleType>('RETAIL');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [quantity, setQuantity] = useState('');
  // цена гибкая — назначается при каждой продаже, ничего не подставляем
  const [unitPrice, setUnitPrice] = useState('');
  const [totalAmount, setTotalAmount] = useState('');

  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;
  const total = parseFloat(totalAmount) || 0;

  const tooMuch = qty > product.available;
  const computedTotal = saleType === 'RETAIL' ? round2(qty * price) : 0;
  const computedUnit = saleType === 'WHOLESALE' && qty > 0 ? round2(total / qty) : 0;
  const valid = qty > 0 && !tooMuch && (saleType === 'RETAIL' ? price > 0 : total > 0);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    // оптимистично: модалка закрывается сразу, остаток на витрине списывается мгновенно
    onClose();
    onSold(product.productId, qty);
    salesApi
      .create({
        productId: product.productId,
        saleType,
        paymentMethod,
        quantity: qty,
        ...(saleType === 'WHOLESALE' ? { totalAmount: total } : { unitPrice: price }),
      })
      .then((sale) => {
        toast.success(
          `${t.sales.success} ${sale.productName}: ${fmtQty(sale.quantity)} ${sale.unit} = ${fmtMoney(sale.totalAmount)}`,
        );
      })
      .catch((err) => {
        onError(product.productId, qty); // откат остатка
        toast.error(extractError(err));
      });
  };

  return (
    <Modal title={t.sales.newSale} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="sale-product-preview">
          <Thumb
            productId={product.productId}
            hasPhoto={product.hasPhoto}
            photoRev={product.photoRev}
            size={52}
          />
          <div>
            <div className="sale-product-name">{product.name}</div>
            <div className="hint-text">
              {fmtQty(product.available)} {product.unit} {t.sales.available}
            </div>
          </div>
        </div>

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
            label={`${t.sales.quantity} (${product.unit})`}
            type="number"
            min="0.001"
            step="0.001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            error={
              tooMuch
                ? `${t.sales.notEnough} ${fmtQty(product.available)} ${product.unit}`
                : undefined
            }
            required
            autoFocus
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

        <Button type="submit" disabled={!valid} style={{ width: '100%', height: 44 }}>
          {t.sales.submit}
        </Button>
      </form>
    </Modal>
  );
}
