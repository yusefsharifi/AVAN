import { useEffect, useState } from 'react';
import { useCollectionStore } from '@/modules/commercial/store/useCollectionStore';
import type { InstallmentPlan } from '@/modules/commercial/types';
import { formatCurrency } from '@/modules/portal/utils';

const formatDueDate = (iso: string): string => {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('fa-IR');
};

export function InstallmentManager() {
  const { cases, isLoaded, setInstallmentPlan, loadFromApi } = useCollectionStore();
  const [caseId, setCaseId] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [numInstallments, setNumInstallments] = useState(0);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!isLoaded) void loadFromApi();
  }, [isLoaded, loadFromApi]);

  // The schedule is derived from the two inputs — previously `plan` was state
  // that nothing ever assigned, so the preview never rendered and the save
  // button was permanently inert.
  const plan: Omit<InstallmentPlan, 'id'> | null =
    totalAmount > 0 && numInstallments > 0
      ? {
          agreedAt: new Date().toISOString(),
          installments: Array.from({ length: numInstallments }, (_, index) => {
            const due = new Date();
            due.setMonth(due.getMonth() + index + 1);
            return {
              dueDate: due.toISOString(),
              amount: totalAmount / numInstallments,
              status: 'pending' as const,
            };
          }),
          totalAmount,
          notes: '',
        }
      : null;

  const handleOpen = (id: string) => {
    if (!id) return;
    setCaseId(id);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setCaseId('');
    setTotalAmount(0);
    setNumInstallments(0);
  };

  const handleSave = () => {
    if (caseId && plan) {
      setInstallmentPlan(caseId, plan);
      handleClose();
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-medium mb-3">مدیریت اقساط</h2>

      <div className="mt-4">
        <div className="text-sm text-muted-foreground">انتخاب پرونده:</div>
        <input
          type="text"
          placeholder="شماره پرونده یا شماره کارت"
          value={caseId}
          onChange={(e) => setCaseId(e.target.value)}
          className="w-full rounded border border-border px-3 py-2 text-sm mb-2"
        />
        <button
          type="button"
          onClick={() => handleOpen(caseId)}
          disabled={!caseId}
          className="rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          باز کردن
        </button>
        {cases.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            تعداد پرونده‌های بارگذاری شده: {cases.length}
          </div>
        )}
      </div>

      {showModal && (
        <div className="mt-4 space-y-4">
          <h3 className="text-lg font-medium mb-3">تنظیمات اقساط</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">مبلغ کل:</label>
              <input
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(Number.parseFloat(e.target.value) || 0)}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">تعداد اقساط:</label>
              <input
                type="number"
                value={numInstallments}
                min="1"
                onChange={(e) => setNumInstallments(Number.parseInt(e.target.value, 10) || 0)}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
          </div>

          {plan && (
            <div className="space-y-3">
              <h4 className="text-xs font-medium mb-1">برنامه اقساط</h4>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left">تاریخ</th>
                    <th className="text-left">مبلغ</th>
                    <th className="text-left">وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.installments.map((installment, index) => (
                    <tr key={index} className="border-t border-gray-200">
                      <td className="p-2">{formatDueDate(installment.dueDate)}</td>
                      <td className="p-2 text-right">{formatCurrency(installment.amount, 'IRR')}</td>
                      <td className="p-2 text-sm text-gray-600">
                        {installment.status === 'paid'
                          ? 'پرداخت شده'
                          : installment.status === 'overdue'
                            ? 'معوق'
                            : installment.status === 'bounced'
                              ? 'برگشتی'
                              : 'در انتظار'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={!plan}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              ذخیره برنامه
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded border border-gray-300 px-3 py-2 text-xs hover:bg-gray-300 transition-colors ml-2"
            >
              لغو
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
