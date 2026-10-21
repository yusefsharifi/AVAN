import { useEffect, useState } from 'react';
import {
  useCollectionStore,
  type CollectionAction,
} from '@/modules/commercial/store/useCollectionStore';
import type { CollectionActionType } from '@/modules/commercial/types';

type CollectionOutcome = CollectionAction['outcome'];

const OUTCOME_OPTIONS: { value: CollectionOutcome; label: string }[] = [
  { value: 'no_response', label: 'بدون پاسخ' },
  { value: 'promised_payment', label: 'پرداخت وعده داده شد' },
  { value: 'partial_payment', label: 'پرداخت جزئی' },
  { value: 'dispute', label: 'اعتراض' },
  { value: 'escalated', label: 'ارتقا یافته' },
];

const ACTION_TYPE_OPTIONS: { value: CollectionActionType; label: string }[] = [
  { value: 'reminder_call', label: 'یادآوری تماس' },
  { value: 'reminder_sms', label: 'یادآوری SMS' },
  { value: 'reminder_letter', label: 'یادآوری نامه' },
  { value: 'demand_letter', label: 'یادآوری رسمی' },
  { value: 'installment_agreement', label: 'توافق قسط' },
  { value: 'legal_notice', label: 'نشان قانونی' },
  { value: 'collection_agency', label: 'استخدام نهاد جمع‌آوری' },
  { value: 'write_off', label: 'نوشتن واگذاری' },
];

export function CollectionWorkflow() {
  const { cases, isLoaded, addAction, loadFromApi } = useCollectionStore();
  const [caseId, setCaseId] = useState('');
  const [actionType, setActionType] = useState<CollectionActionType | ''>('');
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState<CollectionOutcome | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [actionLog, setActionLog] = useState<CollectionAction[]>([]);

  useEffect(() => {
    if (!isLoaded) void loadFromApi();
  }, [isLoaded, loadFromApi]);

  const handleOpenCase = (id: string) => {
    if (!id) return;
    setCaseId(id);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCaseId('');
  };

  const handleAddAction = () => {
    if (!caseId || !actionType || !notes || !outcome) return;

    const newAction: Omit<CollectionAction, 'id'> = {
      type: actionType,
      performedAt: new Date().toISOString(),
      performedBy: 'کاربر',
      notes,
      outcome,
    };

    addAction(caseId, newAction);
    setActionLog((prev) => [
      ...prev,
      { ...newAction, id: `action-${Date.now()}` },
    ]);
    setNotes('');
    setOutcome('');
    setActionType('');
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-medium mb-3">Workflow جمع‌آوری</h2>

      <div className="mb-4">
        <div className="text-sm text-muted-foreground">انتخاب پرونده:</div>
        <input
          type="text"
          placeholder="شماره پرونده یا شماره کارت"
          value={caseId}
          onChange={(e) => setCaseId(e.target.value)}
          className="w-full rounded border border-border px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => handleOpenCase(caseId)}
          disabled={!caseId}
          className="mt-2 rounded bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          ثبت اقدام وصول
        </button>
        {cases.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            تعداد پرونده‌های بارگذاری شده: {cases.length}
          </div>
        )}
      </div>

      <div className="mb-4">
        <div className="text-sm text-muted-foreground">نوع اقدام:</div>
        <select
          value={actionType}
          onChange={(e) => setActionType(e.target.value as CollectionActionType)}
          className="w-full rounded border border-border px-3 py-2 text-sm"
        >
          <option value="">Select Action Type</option>
          {ACTION_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {showModal && (
        <div className="space-y-4">
          <div className="mb-4">
            <div className="text-sm text-muted-foreground">یادداشت:</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm h-16"
            ></textarea>
          </div>

          <div className="flex items-center mb-4">
            <span className="text-sm text-muted-foreground mr-2">نتیجه:</span>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as CollectionOutcome)}
              className="ml-2 rounded border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="">Select Outcome</option>
              {OUTCOME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.value}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <button
              type="button"
              onClick={handleAddAction}
              className="rounded bg-green-600 px-3 py-2 text-white hover:bg-green-700 transition-colors"
              disabled={!caseId || !actionType || !notes || !outcome}
            >
              افزودن اقدام
            </button>
            <button
              type="button"
              onClick={handleCloseModal}
              className="rounded border border-gray-300 px-3 py-2 text-xs hover:bg-gray-300 transition-colors ml-2"
            >
              لغو
            </button>
          </div>
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-base font-medium mb-2">لاگ اقدامات</h3>
        <div className="max-h-60 overflow-y-auto border border-gray-200 p-2">
          {actionLog.length > 0 ? (
            <div className="space-y-2">
              {actionLog.map((action) => (
                <div key={action.id} className="flex justify-between items-center p-2 border-b border-gray-200">
                  <span className="text-sm text-gray-700">{new Date(action.performedAt).toLocaleString('fa-IR')}</span>
                  <span className="text-sm font-medium">{action.type}</span>
                  <span className="ml-2 text-xs text-gray-600">{action.notes}</span>
                  <span className="ml-2 text-xs text-gray-500">{action.outcome}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">هیچ اقدامی ثبت نشده است</div>
          )}
        </div>
      </div>
    </div>
  );
}
