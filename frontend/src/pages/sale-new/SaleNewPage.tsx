import { SaleForm } from '@/features/sale-form/SaleForm';
import { t } from '@/shared/i18n/tj';

export function SaleNewPage() {
  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">{t.sales.newSale}</h1>
            <p className="page-subtitle">{t.tagline}</p>
          </div>
        </div>
      </div>
      <SaleForm />
    </>
  );
}
