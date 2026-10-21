import { formatCurrency } from '@/modules/finance/utils/persianUtils';

export interface AmountSummaryProps {
  totalBeforeDiscount?: number;
  totalDiscount?: number;
  totalTax?: number;
  grandTotal?: number;
  showBaseCurrency?: boolean;
  currencyCode?: 'IRR' | 'USD' | 'EUR';
}

export function AmountSummary({
  totalBeforeDiscount,
  totalDiscount,
  totalTax,
  grandTotal,
  showBaseCurrency = false,
  currencyCode = 'IRR',
}: AmountSummaryProps) {
  const before = totalBeforeDiscount || 0;
  const discount = totalDiscount || 0;
  const tax = totalTax || 0;
  const grand = grandTotal || 0;
  const baseGrand = grand / (1 + (tax / 100)) || 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-xs text-muted-foreground">مبلغ بدون impost</span>
          <span className="text-lg font-bold">
            {formatCurrency(before, currencyCode)}
          </span>
        </div>
        {discount > 0 && (
          <div>
            <span className="text-xs text-muted-foreground">تخفیف</span>
            <span className="text-lg font-medium text-red-600">
              -{formatCurrency(discount, currencyCode)}
            </span>
          </div>
        )}
        <div>
          <span className="text-xs text-muted-foreground">میزان مالی</span>
          <span className="text-lg font-bold">
            {formatCurrency(tax, currencyCode)}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-border)' }}>
        <div>
          <span className="text-xs text-muted-foreground">مبلغ کل</span>
          <span className="text-2xl font-extrabold">
            {formatCurrency(grand, currencyCode)}
          </span>
        </div>
        {showBaseCurrency && (
          <div>
            <span className="text-xs text-muted-foreground">مبلغ پایه</span>
            <span className="text-base font-medium">
              {formatCurrency(baseGrand, currencyCode)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}