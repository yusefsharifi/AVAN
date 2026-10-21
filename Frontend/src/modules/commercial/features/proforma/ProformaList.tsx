import { useState } from 'react';
import { useCommercialStore } from '@/modules/commercial/store/useCommercialStore';
import { formatJalaliDateTime } from '@/modules/dashboard/zone-manager/utils/formatters';
import { DocumentLine } from '@/modules/finance/types/purchaseSales.types';
import { AmountSummary } from '@/modules/commercial/components/shared/AmountSummary';

export interface ProformaFilter {
  status?: string;
  direction?: 'sales' | 'purchase';
  partyId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function ProformaList() {
  const { proformas, createProforma, updateProforma, submitForApproval } = useCommercialStore();
  const [filter, setFilter] = useState<ProformaFilter>({});
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = proformas.filter((p) => {
    if (filter.status && p.status !== filter.status) return false;
    if (filter.direction && p.direction !== filter.direction) return false;
    if (filter.partyId && p.partyId !== filter.partyId) return false;
    if (searchQuery && !p.proformaNumber.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filter.dateFrom && p.issueDate < filter.dateFrom) return false;
    if (filter.dateTo && p.issueDate > filter.dateTo) return false;
    return true;
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="جستجو شماره پیش‌فاکتور یاطرف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded border border-border px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filter.direction || ''}
            onChange={(e) => setFilter({ ...filter, direction: e.target.value as any })}
            className="rounded border border-border px-3 py-2 text-sm"
          >
            <option value="">همه</option>
            <option value="sales">فروش</option>
            <option value="purchase">خرید</option>
          </select>
          <select
            value={filter.status || ''}
            onChange={(e) => setFilter({ ...filter, status: e.target.value as any })}
            className="rounded border border-border px-3 py-2 text-sm"
          >
            <option value="">همه وضعیت‌ها</option>
            {['draft', 'pending_internal_approval', 'internally_approved', 'sent_to_party', 'party_accepted', 'party_rejected', 'expired', 'converted', 'cancelled'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-right border-b border-border bg-secondary">
              <th className="p-2 text-sm font-medium">شماره پیش‌فاکتور</th>
              <th className="p-2 text-sm font-medium">طرف</th>
              <th className="p-2 text-sm font-medium">جهت</th>
              <th className="p-2 text-sm font-medium">وضعیت</th>
              <th className="p-2 text-sm font-medium">مبلغ کل</th>
              <th className="p-2 text-sm font-medium">تاریخ صدور</th>
              <th className="p-2 text-sm font-medium">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-border">
                <td className="p-2">{p.proformaNumber}</td>
                <td className="p-2">
                  {p.partyName || '—'}
                </td>
                <td className="p-2">
                  {p.direction === 'sales' ? 'فروش' : 'خرید'}
                </td>
                <td className="p-2">
                  <span className="px-2 py-1 rounded text-xs font-medium">
                    {p.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="p-2">
                  {formatCurrency(p.grandTotal, p.currencyCode)}
                </td>
                <td className="p-2">
                  {formatJalaliDateTime(p.issueDate)}
                </td>
                <td className="p-2">
                  <button
                    onClick={() => {}}
                    className="text-primary hover:underline text-sm"
                  >
                    مشاهده
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={() => {}}
          className="flex items-center gap-1 px-3 py-2 rounded border border-border text-sm hover:bg-accent/10 transition-colors"
        >
          ساخت پیش‌فاکتور جدید
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <span className="text-sm text-muted-foreground">
          {filtered.length} از {proformas.length} پیش‌فاکتور
        </span>
      </div>
    </div>
  );
}