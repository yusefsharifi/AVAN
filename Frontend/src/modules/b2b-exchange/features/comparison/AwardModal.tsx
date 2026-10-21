import { useState } from 'react';
import { useCommercialStore } from '@/modules/commercial/store/useCommercialStore';

type RFQ = { id: string; autoConvertToPO: boolean; maxBudget?: number };
type Bid = { id: string; supplierCompanyName: string; totalPrice: number; deliveryDays: number; paymentTerms: string; warrantyMonths?: number; technicalCompliance: boolean };

export function AwardModal({rfq, bid, onClose, onAward}: {rfq: RFQ; bid: Bid; onClose: () => void; onAward: (reason: string, autoPO: boolean) => void}) {
  const [reason, setReason] = useState('');
  const [autoPO, setAutoPO] = useState(rfq.autoConvertToPO);
  const commercialStore = useCommercialStore();
  const selectedRFQ = commercialStore.getRFQById(rfq.id);
  const saving = rfq.maxBudget ? rfq.maxBudget - bid.totalPrice : 0;

  return (
    <div dir="rtl" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <section className="w-full max-w-lg space-y-4 rounded-xl bg-card p-5">
        <div className="flex justify-between">
          <h2 className="font-bold">انتخاب برنده</h2>
          <button onClick={onClose}>×</button>
        </div>
        <div className="rounded bg-secondary/50 p-3 text-sm">
          <p>تأمین‌کننده: {bid.supplierCompanyName}</p>
          <p>قیمت نهایی: {bid.totalPrice.toLocaleString('fa-IR')} ریال</p>
          <p>زمان تحویل: {bid.deliveryDays.toLocaleString('fa-IR')} روز</p>
          <p>شرایط پرداخت: {bid.paymentTerms}</p>
          <p>گارانتی: {bid.warrantyMonths ? `${bid.warrantyMonths} ماه` : '—'}</p>
          <p>انطباق فنی: {bid.technicalCompliance ? 'مطابق' : 'دارای انحراف'}</p>
          {rfq.maxBudget && <p>صرفه‌جویی نسبت به بودجه: {saving.toLocaleString('fa-IR')} ریال</p>}
        </div>
        <textarea
          className="w-full border p-2 text-xs"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="دلیل انتخاب"
        />
        <label className="text-xs">
          <input checked={autoPO} type="checkbox" onChange={(e) => setAutoPO(e.target.checked)} /> تبدیل خودکار به سفارش خرید
        </label>
        <p className="rounded bg-amber-50 p-3 text-xs text-amber-800">پس از تأیید، سایر پیشنهادات رد شده تلقی می‌شوند.</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded border px-3 py-2 text-xs">انصراف</button>
          <button
            onClick={() => {
              const store = commercialStore.getState();
              if (autoPO) {
                const rfqData = store.getRFQById(rfq.id);
                if (rfqData) {
                  store.updateRFQPoId(rfqData.id, bid.id);
                }
              }
              onAward(reason, autoPO);
            }}
            className="rounded bg-emerald-600 px-3 py-2 text-xs text-white"
          >
            تأیید و اعلام برنده
          </button>
        </div>
      </section>
    </div>
  );
}
export default AwardModal;
