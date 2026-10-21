import { useState } from 'react';
import { useCommercialStore } from '@/modules/commercial/store/useCommercialStore';
import { formatJalaliDateTime } from '@/modules/dashboard/zone-manager/utils/formatters';
import { DocumentLineEditor } from '@/modules/commercial/components/shared/DocumentLineEditor';
import { PartySelector } from '@/modules/commercial/components/shared/PartySelector';
import { AmountSummary } from '@/modules/commercial/components/shared/AmountSummary';
import { ApprovalChainBadge } from '@/modules/commercial/components/shared/ApprovalChainBadge';
import { ProformaDirection, ProformaAttachment } from '@/modules/commercial/types';
import type { DocumentLine, BuyerSeller } from '@/modules/finance/types/purchaseSales.types';

interface ProformaDraft {
  id: string;
  direction: ProformaDirection;
  partyId: string;
  partyName: string;
  partyCode: string;
  contactName: string;
  contactPhone: string;
  issueDate: string;
  validUntil: string;
  deliveryDate?: string;
  deliveryLocation?: string;
  paymentTerms: string;
  incoterm: string;
  internalNotes: string;
  customerNotes: string;
  lines: DocumentLine[];
  attachments: ProformaAttachment[];
}

export function ProformaWizard() {
  const { submitForApproval } = useCommercialStore();
  const [step, setStep] = useState(1);
  const [proforma, setProforma] = useState<ProformaDraft>({
    id: '',
    direction: 'sales',
    partyId: '',
    partyName: '',
    partyCode: '',
    contactName: '',
    contactPhone: '',
    issueDate: formatJalaliDateTime(new Date().toISOString()),
    validUntil: '',
    paymentTerms: 'نقدی',
    incoterm: 'EXW',
    internalNotes: '',
    customerNotes: '',
    lines: [],
    attachments: [],
  });

  const handleStepChange = (newStep: number) => setStep(newStep);

  const handlePartySelect = (party: BuyerSeller) => {
    setProforma(prev => ({
      ...prev,
      partyId: party.id,
      partyName: party.name,
      partyCode: party.code,
      contactName: party.title || '',
      contactPhone: party.phone || '',
    }));
  };

  const handleStep2 = () => {
    if (proforma.lines.length === 0) {
      alert('لطفاً حداقل یک آیتم اضافه کنید');
      return;
    }
    setStep(3);
  };

  const handleSubmit = () => {
    if (step === 5) {
      submitForApproval(proforma.id);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-xl font-bold mb-4">پیش‌فاکتور - مرحله {step}</h2>
      
      {step === 1 && (
        <>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-muted-foreground">اطلاعات پایه</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <input
                  type="radio"
                  name="direction"
                  value="sales"
                  checked={proforma.direction === 'sales'}
                  onChange={(e) => setProforma(prev => ({ ...prev, direction: e.target.value as ProformaDirection }))}
                />
                <span>فروش</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="radio"
                  name="direction"
                  value="purchase"
                  checked={proforma.direction === 'purchase'}
                  onChange={(e) => setProforma(prev => ({ ...prev, direction: e.target.value as ProformaDirection }))}
                />
                <span>خرید</span>
              </div>
            </div>
          </div>
          
          <PartySelector
            initialValue={proforma.partyId}
            onSelect={handlePartySelect}
            onSearch={() => {
              // This would be implemented with actual search logic
              return [];
            }}
            disabled={false}
          />
          
          <div className="mt-4">
            <div className="text-sm text-muted-foreground">تاریخ صدور</div>
            <input
              type="text"
              value={proforma.issueDate}
              onChange={(e) => setProforma(prev => ({ ...prev, issueDate: e.target.value }))}
              className="w-full rounded border border-border px-3 py-2 text-sm"
            />
            
            <div className="mt-2 text-sm text-muted-foreground">تاریخ اعتبار</div>
            <input
              type="date"
              value={proforma.validUntil}
              onChange={(e) => setProforma(prev => ({ ...prev, validUntil: e.target.value }))}
              className="w-full rounded border border-border px-3 py-2 text-sm"
            />
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h3 className="text-lg font-medium mb-3">آیتم‌های پیش‌فاکتور</h3>
          <DocumentLineEditor
            initialLines={proforma.lines}
            onLineChange={(lines) => setProforma(prev => ({ ...prev, lines }))}
            onAddLine={handleStep2}
            onRemoveLine={handleStep2}
            disabled={false}
          />
          <AmountSummary
            totalBeforeDiscount={proforma.lines.reduce((sum, l) => sum + (l.lineTotal || 0), 0)}
            totalDiscount={proforma.lines.reduce((sum, l) => sum + (l.quantity * l.discount), 0)}
            totalTax={proforma.lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice * l.taxRate), 0)}
            grandTotal={proforma.lines.reduce((sum, l) => sum + (l.lineTotal || 0), 0)}
          />
        </>
      )}

      {step === 3 && (
        <>
          <h3 className="text-lg font-medium mb-3">شرایط تجاری</h3>
          <div className="mt-4">
            <div className="text-sm text-muted-foreground">شروط پرداخت</div>
            <select
              value={proforma.paymentTerms}
              onChange={(e) => setProforma(prev => ({ ...prev, paymentTerms: e.target.value }))}
              className="w-full rounded border border-border px-3 py-2 text-sm"
            >
              <option value="نقدی">نقدی</option>
              <option value="چک ۳۰ روزه">چک ۳۰ روزه</option>
              <option value="چک ۶۰ روزه">چک ۶۰ روزه</option>
              <option value="اعتبار اسنادی">اعتبار اسنادی</option>
              <option value="اقساط">اقساط</option>
            </select>
            
            <div className="mt-2">
              <div className="text-sm text-muted-foreground">تاریخ تحویل</div>
              <input
                type="date"
                value={proforma.deliveryDate || ''}
                onChange={(e) => setProforma(prev => ({ ...prev, deliveryDate: e.target.value }))}
                className="w-full rounded border border-border px-3 py-2 text-sm"
              />
            </div>
            
            <div className="mt-2">
              <div className="text-sm text-muted-foreground">مکان تحویل</div>
              <input
                type="text"
                value={proforma.deliveryLocation || ''}
                onChange={(e) => setProforma(prev => ({ ...prev, deliveryLocation: e.target.value }))}
                className="w-full rounded border border-border px-3 py-2 text-sm"
              />
            </div>
            
            <div className="mt-2">
              <div className="text-sm text-muted-foreground">اینکترم</div>
              <select
                value={proforma.incoterm || 'EXW'}
                onChange={(e) => setProforma(prev => ({ ...prev, incoterm: e.target.value }))}
                className="w-full rounded border border-border px-3 py-2 text-sm"
              >
                <option value="EXW">EXW</option>
                <option value="FOB">FOB</option>
                <option value="CIF">CIF</option>
                <option value="DAP">DAP</option>
                <option value="DDP">DDP</option>
              </select>
            </div>
            
            <div className="mt-2">
              <div className="text-sm text-muted-foreground">یادداشت داخلی</div>
              <textarea
                value={proforma.internalNotes || ''}
                onChange={(e) => setProforma(prev => ({ ...prev, internalNotes: e.target.value }))}
                className="w-full rounded border border-border px-3 py-2 text-sm h-20"
                disabled={false}
              ></textarea>
            </div>
            
            <div className="mt-2">
              <div className="text-sm text-muted-foreground">یادداشت طرف مقابل</div>
              <textarea
                value={proforma.customerNotes || ''}
                onChange={(e) => setProforma(prev => ({ ...prev, customerNotes: e.target.value }))}
                className="w-full rounded border border-border px-3 py-2 text-sm h-20"
                disabled={false}
              ></textarea>
            </div>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <h3 className="text-lg font-medium mb-3">پیوست‌ها</h3>
          <div className="mt-4">
            <div className="text-sm text-muted-foreground">فایل‌های پیوست</div>
            <div className="flex items-center gap-2">
              <div className="rounded border border-dashed px-4 py-3 text-center text-gray-400">
                اسقاط فایل
              </div>
              <div className="ml-2 text-sm text-muted-foreground">حداکثر 5 فایل، هر فایل حداکثر 10MB</div>
            </div>
          </div>
        </>
      )}

      {step === 5 && (
        <>
          <h3 className="text-lg font-medium mb-3">تایید و ارسال</h3>
          <div className="mt-4">
            <div className="text-sm text-muted-foreground">خلاصه درخواست</div>
            <DocumentLineEditor
              initialLines={proforma.lines}
              onLineChange={() => {}}
              onAddLine={() => {}}
              onRemoveLine={() => {}}
              disabled={true}
            />
            <AmountSummary
              totalBeforeDiscount={proforma.lines.reduce((sum, l) => sum + (l.lineTotal || 0), 0)}
              totalDiscount={proforma.lines.reduce((sum, l) => sum + (l.quantity * l.discount), 0)}
              totalTax={proforma.lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice * l.taxRate), 0)}
              grandTotal={proforma.lines.reduce((sum, l) => sum + (l.lineTotal || 0), 0)}
            />
          </div>
          
          <div className="mt-4">
            <div className="text-sm text-muted-foreground">راهنمای approval chain</div>
            <ApprovalChainBadge
              steps={[
                { id: 'pf-step-1', order: 1, roleFa: 'مدیر فروش', status: 'pending' },
                { id: 'pf-step-2', order: 2, roleFa: 'مدیر مالی', status: 'pending' },
                { id: 'pf-step-3', order: 3, roleFa: 'مدیرعامل', status: 'pending' }
              ]}
            />
          </div>
          
          <div className="flex justify-end mt-6 gap-2">
            <button
              onClick={() => handleStepChange(4)}
              className="rounded border border-border px-3 py-2 text-sm hover:bg-accent/10 transition-colors"
            >
              ذخیره پیش‌نویس
            </button>
            <button
              onClick={() => handleSubmit()}
              className="rounded bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700 transition-colors"
            >
              ارسال برای تأیید
            </button>
          </div>
        </>
      )}
    </div>
  );
}