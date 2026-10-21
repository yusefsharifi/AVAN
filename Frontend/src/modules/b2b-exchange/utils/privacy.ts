import type { Bid, RFQ } from '../types';

const toNumber = (date: string) => Number(date.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/\D/g, ''));

/** Prices remain confidential while an RFQ is in its sealed-bid period. */
export function canRevealBidPrice(rfq: RFQ, today = '۱۴۰۳/۰۴/۲۰'): boolean {
  if (rfq.type !== 'sealed_bid') return true;
  return ['evaluation', 'awarded', 'expired', 'cancelled'].includes(rfq.status) || toNumber(today) > toNumber(rfq.deadlineDate);
}

export function visibleBidPrice(rfq: RFQ, bid: Bid): string {
  return canRevealBidPrice(rfq)
    ? `${bid.totalPrice.toLocaleString('fa-IR')} ریال`
    : 'مخفی — استعلام بسته';
}
