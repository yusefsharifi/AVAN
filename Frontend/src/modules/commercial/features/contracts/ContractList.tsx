import { useState } from 'react';
import { useCommercialStore } from '@/modules/commercial/store/useCommercialStore';

export function ContractList() {
  const { contracts, createContract, updateContract, addAddendum, renewContract } = useCommercialStore();
  const [filter, setFilter] = useState({
    status: '' as string,
    partyId: '',
    searchQuery: '',
  });

  const filtered = contracts.filter((contract) => {
    if (filter.status && contract.status !== filter.status) return false;
    if (filter.partyId && contract.partyId !== filter.partyId) return false;
    if (filter.searchQuery && !contract.title.toLowerCase().includes(filter.searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="جستجو قراردادها..."
            value={filter.searchQuery}
            onChange={(e) => setFilter({ ...filter, searchQuery: e.target.value })}
            className="w-full rounded border border-border px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter.status || 'all'}
            onChange={(e) => setFilter({ ...filter, status: e.target.value as any })}
            className="rounded border border-border px-3 py-2 text-sm"
          >
            <option value="">همه</option>
            <option value="draft">درآمد</option>
            <option value="under_review">در بررسی</option>
            <option value="active">فعال</option>
            <option value="suspended">معلق</option>
            <option value="expiring_soon">در حال انقضا</option>
            <option value="expired">منقضی</option>
            <option value="terminated">فسخ شده</option>
            <option value="renewed">بازدید شده</option>
          </select>
          <select
            value={filter.partyId || ''}
            onChange={(e) => setFilter({ ...filter, partyId: e.target.value as any })}
            className="ml-2 rounded border border-border px-3 py-2 text-sm"
          >
            <option value="">همه طرفین</option>
            <option value="">مثال: شرکت لوله‌سازی</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="text-right border-b border-border bg-secondary">
            <tr>
              <th className="p-2">شماره قرارداد</th>
              <th className="p-2">عنوان</th>
              <th className="p-2">طرف</th>
              <th className="p-2">وضعیت</th>
              <th className="p-2">تاریخ شروع</th>
              <th className="p-2">تاریخ پایان</th>
              <th className="p-2">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((contract) => (
              <tr key={contract.id} className="border-b border-gray-200">
                <td className="p-2">{contract.contractNumber}</td>
                <td className="p-2">{contract.title}</td>
                <td className="p-2">
                  {contract.partyName || '—'}
                </td>
                <td className="p-2">
                  <span className="px-2 py-1 rounded text-xs font-medium">
                    {contract.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="p-2">
                  {formatJalaliDateTime(contract.startDate)}
                </td>
                <td className="p-2">
                  {formatJalaliDateTime(contract.endDate)}
                </td>
                <td className="p-2">
                  <div className="flex justify-between">
                    <button
                      onClick={() => updateContract(contract.id, { status: 'active' as any })}
                      className="rounded border border-green-300 px-2 py-1 text-xs text-green-600 hover:bg-green-500 transition-colors"
                      disabled={contract.status === 'active'}
                    >
                      فعال‌سازی
                    </button>
                    <button
                      onClick={() => updateContract(contract.id, { status: 'under_review' as any })}
                      className="rounded border border-yellow-300 px-2 py-1 text-xs hover:bg-yellow-500 transition-colors"
                      disabled={contract.status === 'under_review'}
                    >
                      در بررسی
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
        
      <div className="mt-4">
        <button
          onClick={() => {}}
          className="rounded bg-green-600 px-3 py-2 text-sm text-white hover:bg-emerald-600 transition-colors"
        >
          ایجاد قرارداد جدید
        </button>
      </div>
    </div>
  );
}