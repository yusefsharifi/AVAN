import { useState } from 'react';
import { useCommercialStore } from '@/modules/commercial/store/useCommercialStore';
import { formatJalaliDateTime } from '@/modules/dashboard/zone-manager/utils/formatters';
import { formatCurrency } from '@/modules/finance/utils/persianUtils';
import { ApprovalChainBadge } from '@/modules/commercial/components/shared/ApprovalChainBadge';

export function ProformaDetail() {
  const { proformas, markAsSentToParty, reviseProforma, convertToOrder, cancelProforma } = useCommercialStore();
  const [proforma, setProforma] = useState<any>(null);
  const [selectedId, setSelectedId] = useState('');
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseType, setResponseType] = useState(''); // 'accepted' | 'rejected'
  const [responseNote, setResponseNote] = useState('');
  const [stepId, setStepId] = useState('');

  const handleOpenResponseModal = (id: string, stepId: string) => {
    setSelectedId(id);
    setStepId(stepId);
    setShowResponseModal(true);
    setResponseType('');
    setResponseNote('');
  };

  const handleSubmitResponse = () => {
    if (stepId === '') return;
    
    const updatedProformas = proformas.map(p => 
      p.id === selectedId 
        ? { ...p, status: stepId === 'pending' ? 'party_accepted' : 'party_rejected', 
            partyResponse: {
              accepted: stepId === 'pending',
              note: responseNote
            }
          }
        : p
    );
    
    setProforma(updatedProformas);
    setShowResponseModal(false);
    
    if (responseType === 'accepted') {
      markAsSentToParty(selectedId);
    } else if (responseType === 'rejected') {
      reviseProforma(selectedId, 'پاسخ رد شد');
    }
  };

  const handleConvertToOrder = () => {
    if (proforma) {
      convertToOrder(proforma.id);
      alert('سفارش با موفقیت ایجاد شد');
    }
  };

  const handleCancel = () => {
    if (window.confirm('آیا می‌خواهید پیش‌فاکتور را لغو کنید؟')) {
      cancelProforma(selectedId, 'کاربر لغو کرد');
    }
  };

  if (!selectedId || !proforma) return null;

  const currentProforma = proformas.find(p => p.id === selectedId);
  if (!currentProforma) return null;

  // Store's local Proforma interface omits optional display-only fields.
  const currentNotes = (currentProforma as { notes?: string }).notes;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm" dir="rtl">
      <div className="flex justify-between items-center mb-4">
        <span className="text-xl font-bold">پیش‌فاکتور ${currentProforma.proformaNumber}</span>
        <span className="text-sm text-muted-foreground">{currentProforma.status.replace(/_/g, ' ')}</span>
      </div>
      
      <div className="flex justify-between mb-4">
        <div className="w-1/3">
          <div className="text-sm text-muted-foreground">وضعیت:</div>
          <span className="text-lg font-medium text-emerald-600">
            {currentProforma.status.replace(/_/g, ' ')}
          </span>
        </div>
        
        <div className="w-2/3 flex justify-end">
          <button
            onClick={() => handleOpenResponseModal(selectedId, 'pending')}
            className="rounded border border-emerald-600 px-3 py-2 text-sm hover:bg-emerald-500 transition-colors"
            disabled={currentProforma.status !== 'internally_approved'}
          >
            {currentProforma.status === 'sent_to_party' ? 'ثبت پاسخ طرف مقابل' : 'ارسال به طرف مقابل'}
          </button>
          
          <button
            onClick={handleConvertToOrder}
            className="ml-2 rounded border border-emerald-600 px-3 py-2 text-sm hover:bg-emerald-500 transition-colors"
            disabled={currentProforma.status !== 'party_accepted'}
          >
            تبدیل به سفارش
          </button>
          
          <button
            onClick={handleCancel}
            className="ml-2 rounded border border-red-600 px-3 py-2 text-sm hover:bg-red-500 transition-colors"
          >
            لغو
          </button>
        </div>
      </div>

      <div className="space-y-4 mb-4">
        <div className="text-sm text-muted-foreground">اطلاعات کلی</div>
        <div className="p-3 bg-gray-50 rounded border border-gray-200">
          <div className="flex justify-between">
            <span>تاریخ صدور:</span>
            <div>{formatJalaliDateTime(currentProforma.issueDate)}</div>
          </div>
          <div className="flex justify-between">
            <span>تاریخ اعتبار:</span>
            <div>{formatJalaliDateTime(currentProforma.validUntil) || '—'}</div>
          </div>
          <div className="flex justify-between">
            <span>تعداد آیتم:</span>
            <div>{currentProforma.lines.length}</div>
          </div>
          <div className="flex justify-between">
            <span>مبلغ کل:</span>
            <div className="text-lg font-bold text-red-600">
              {formatCurrency(currentProforma.grandTotal, currentProforma.currencyCode)}
            </div>
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground">یادداشت‌ها</div>
        <div className="p-3 bg-gray-50 rounded border border-gray-200">
          {currentNotes ? (
            <div className="p-2">{currentNotes}</div>
          ) : (
            <div className="p-2 text-gray-400 italic">هیچ یادداشتی وجود ندارد</div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">آیتم‌های پیش‌فاکتور</div>
        <div className="p-3 bg-gray-50 rounded border border-gray-200">
          {currentProforma.lines.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary text-right">
                    <th className="p-2">کد آیتم</th>
                    <th className="p-2">نام آیتم</th>
                    <th className="p-2">تعداد</th>
                    <th className="p-2">قیمت واحد</th>
                    <th className="p-2">جمع</th>
                  </tr>
                </thead>
                <tbody>
                  {currentProforma.lines.map((line) => (
                    <tr key={line.id} className="border-b border-gray-200">
                      <td className="p-2">{line.itemCode}</td>
                      <td className="p-2">{line.itemName}</td>
                      <td className="p-2">{line.quantity}</td>
                      <td className="p-2">{formatCurrency(line.unitPrice, currentProforma.currencyCode)}</td>
                      <td className="p-2 text-right">{formatCurrency(line.lineTotal, currentProforma.currencyCode)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
        
        <div className="text-sm text-muted-foreground">تاریخ و وضعیت</div>
        <div className="p-3 bg-gray-50 rounded border border-gray-200">
          <div className="flex justify-between">
            <span>تاریخ صدور:</span>
            <div>{formatJalaliDateTime(currentProforma.issueDate)}</div>
          </div>
          <div className="flex justify-between">
            <span>تاریخ اعتبار:</span>
            <div>{formatJalaliDateTime(currentProforma.validUntil) || '—'}</div>
          </div>
          <div className="flex justify-between">
            <span>وضعیت اخیر:</span>
            <span className="text-lg font-medium">
              {currentProforma.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">Approval chain</div>
      <ApprovalChainBadge
        steps={[
          { id: 'step-1', order: 1, roleFa: 'مدیر فروش', status: currentProforma.status === 'internally_approved' ? 'approved' : 'pending' },
          { id: 'step-2', order: 2, roleFa: 'مدیر مالی', status: currentProforma.status === 'internally_approved' ? 'approved' : 'pending' },
          { id: 'step-3', order: 3, roleFa: 'مدیرعامل', status: currentProforma.status === 'internally_approved' ? 'approved' : 'pending' }
        ]}
      />
      
      <div className="mt-4">
            <div className="text-sm text-muted-foreground">پاسخ طرف مقابل</div>
            {showResponseModal && (
              <div className="rounded border border-emerald-600 p-3 bg-emerald-50">
                <div className="flex justify-between">
                  <span>نوع پاسخ:</span>
                  <span className="text-lg font-medium">{responseType === 'accepted' ? 'پذیرش' : 'رد'}</span>
                </div>
                <div className="mt-2">
                  <label className="block">
                    <input
                      type="radio"
                      name="responseType"
                      value="accepted"
                      checked={responseType === 'accepted'}
                      onChange={() => setResponseType('accepted')}
                    />
                    پذیرش
                  </label>
                  <label className="block mt-1">
                    <input
                      type="radio"
                      name="responseType"
                      value="rejected"
                      checked={responseType === 'rejected'}
                      onChange={() => setResponseType('rejected')}
                    />
                    رد
                  </label>
                </div>
                <div className="mt-3">
                  <label className="block">
                    <span className="text-sm font-medium">یادداشت:</span>
                    <textarea
                      value={responseNote}
                      onChange={(e) => setResponseNote(e.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm h-16"
                      placeholder="توضیح پاسخ..."
                    />
                  </label>
                </div>
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handleSubmitResponse}
                    className="rounded bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 transition-colors"
                  >
                    ارسال پاسخ
                  </button>
                </div>
              </div>
            )}
          </div>
    </div>
  );
}