import { SaleForm } from '@/features/sale-form/SaleForm';
import { useT } from '@/shared/i18n';

export function SaleNewPage() {
  const t = useT();
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
