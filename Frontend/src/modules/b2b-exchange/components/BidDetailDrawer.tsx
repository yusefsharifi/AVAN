import type { Bid } from '../types';
import StatusBadge from './StatusBadge';

export function BidDetailDrawer({ bid, onClose, showPrice = true }: { bid: Bid; onClose: () => void; showPrice?: boolean }) {
  return (
    <div className="fixed inset-0 z-50" dir="rtl">
      <button
        className="absolute inset-0 bg-black/40"
        aria-label="بستن جزئیات پیشنهاد"
        onClick={onClose}
      />
      <aside className="absolute bottom-0 left-0 top-0 w-full max-w-md overflow-y-auto bg-card p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-3">
          <button onClick={onClose}>×</button>
          <h2 className="font-bold">جزئیات پیشنهاد {bid.bidNumber}</h2>
        </div>
        <div className="space-y-4 pt-4 text-sm">
          <StatusBadge status={bid.status} />
          <p>تأمین‌کننده: {bid.supplierCompanyName}</p>
          <p>قیمت کل: {showPrice ? `${bid.totalPrice.toLocaleString('fa-IR')} ریال` : 'مخفی — استعلام بسته'}</p>
          <p>زمان تحویل: {bid.deliveryDays.toLocaleString('fa-IR')} روز</p>
          <p>شرایط پرداخت: {bid.paymentTerms}</p>
          <p>پاسخ فنی: {bid.technicalResponse || '—'}</p>
          <div className="rounded bg-secondary/50 p-3 text-xs">
            {showPrice ? <>
              <p>مواد: {bid.priceBreakdown.materialCost.toLocaleString('fa-IR')}</p>
              <p>نیروی کار: {bid.priceBreakdown.laborCost.toLocaleString('fa-IR')}</p>
              <p>سربار: {bid.priceBreakdown.overheadCost.toLocaleString('fa-IR')}</p>
              <p>حمل: {bid.priceBreakdown.shippingCost.toLocaleString('fa-IR')}</p>
            </> : <p>جزئیات قیمت تا پایان مهلت محرمانه است.</p>}
          </div>
        </div>
      </aside>
    </div>
  );
}
export default BidDetailDrawer;
