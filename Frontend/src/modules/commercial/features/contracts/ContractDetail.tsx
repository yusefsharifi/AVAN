import { useState } from 'react';
import { useCommercialStore } from '@/modules/commercial/store/useCommercialStore';
import { formatJalaliDateTime } from '@/modules/dashboard/zone-manager/utils/formatters';
import { formatCurrency } from '@/modules/finance/utils/persianUtils';

export function ContractDetail() {
  const { contracts } = useCommercialStore();
  const [selectedContractId] = useState('');
  const [showDetail, setShowDetail] = useState(false);

  const handleCloseDetail = () => {
    setShowDetail(false);
  };

  const selectedContract = contracts.find((c) => c.id === selectedContractId);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm" style={{ display: showDetail ? 'block' : 'none' }}>
      <div className="flex justify-between mb-4">
        <span className="text-xl font-bold">قرارداد {selectedContract?.contractNumber || '—'}</span>
        <button
          onClick={handleCloseDetail}
          className="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
        >
          بازگشت
        </button>
      </div>

      {showDetail && selectedContract && (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">شناسنامه قرارداد:</div>
          <div className="p-3 bg-gray-50 rounded border border-gray-200">
            <div className="flex justify-between">
              <span>شماره قرارداد:</span>
              <div>{selectedContract.contractNumber}</div>
            </div>
            <div className="flex justify-between">
              <span>عنوان:</span>
              <div className="text-lg">{selectedContract.title}</div>
            </div>
            <div className="flex justify-between">
              <span>طرف:</span>
              <div>{selectedContract.partyName || '—'}</div>
            </div>
            <div className="flex justify-between">
              <span>تاریخ شروع:</span>
              <div>{formatJalaliDateTime(selectedContract.startDate)}</div>
            </div>
            <div className="flex justify-between">
              <span>تاریخ پایان:</span>
              <div>{formatJalaliDateTime(selectedContract.endDate)}</div>
            </div>
            <div className="flex justify-between">
              <span>مبلغ:</span>
              <span className="text-lg font-bold">
                {formatCurrency(selectedContract.value, selectedContract.currencyCode)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>وضعیت:</span>
              <span className="text-lg font-medium">
                {selectedContract.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContractDetail;