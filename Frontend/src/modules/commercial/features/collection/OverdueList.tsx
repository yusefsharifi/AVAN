import { useEffect } from 'react';
import { useCollectionStore } from '@/modules/commercial/store/useCollectionStore';
import { formatCurrency } from '@/modules/portal/utils';

const STATUS_LABELS: Record<string, string> = {
  normal: 'عادی',
  reminder_sent: 'یادآوری ارسال شده',
  demand_letter: 'درخواست رسمی',
  legal: 'حقوقی',
  collection_agency: 'واگذاری به وصول',
  installment_agreed: 'توافق اقساطی',
  written_off: 'اسکناسی شده',
};

const BUCKET_LABELS: Record<string, string> = {
  current: 'جاری',
  '1-30': '۱ تا ۳۰ روز',
  '31-60': '۳۱ تا ۶۰ روز',
  '61-90': '۶۱ تا ۹۰ روز',
  '90+': 'بیش از ۹۰ روز',
};

const formatDate = (iso: string): string => {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('fa-IR');
};

export function OverdueList() {
  const { cases, isLoaded, loadFromApi } = useCollectionStore();

  const overdueCases = cases.filter(
    (caseItem) => caseItem.daysOverdue > 0 && caseItem.collectionStatus !== 'written_off',
  );

  useEffect(() => {
    if (!isLoaded) void loadFromApi();
  }, [isLoaded, loadFromApi]);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-medium mb-3">فهرست مطالبات معوق</h2>

      {overdueCases.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          هیچ مطلبی معوق ثبت نشده است
        </div>
      ) : (
        <div className="space-y-4">
          {overdueCases.map((caseItem) => (
            <div key={caseItem.id} className="p-4 border-b border-gray-200">
              <div className="flex justify-between">
                <div>
                  <span className="text-lg font-medium">{caseItem.partyName}</span>
                  <span className="text-xs text-gray-500 mr-2">
                    #{caseItem.id.slice(0, 8)} · {caseItem.invoiceId.slice(-4)}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  {caseItem.daysOverdue} روز گذشته
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-500">
                  {STATUS_LABELS[caseItem.collectionStatus] ?? 'وضعیت خاص'}
                </span>
              </div>
              <div className="mt-2">
                <span className="text-sm text-gray-600">مبلغ بدهکار:</span>
                <span className="text-lg font-bold text-red-600 mr-2">
                  {formatCurrency(caseItem.remainingAmount, 'IRR')}
                </span>
              </div>
              <div className="mt-2">
                <span className="text-sm text-gray-600">وضعیت:</span>
                <span className="text-lg font-medium mr-2">
                  {STATUS_LABELS[caseItem.collectionStatus] ?? 'وضعیت خاص'}
                </span>
              </div>
              <div className="mt-2">
                <span className="text-sm text-gray-600">رده سنی:</span>
                <span className="text-sm text-gray-700 mr-2">
                  {BUCKET_LABELS[caseItem.agingBucket] ?? caseItem.agingBucket}
                </span>
              </div>
              <div className="mt-2">
                <span className="text-sm text-gray-600">اقدام:</span>
                <span className="ml-2 text-gray-500">
                  {caseItem.actions.length > 0
                    ? caseItem.actions
                        .map(
                          (action) =>
                            `${action.type} (${formatDate(action.performedAt)})`,
                        )
                        .join('، ')
                    : 'هیچ اقدامی ثبت نشده'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
