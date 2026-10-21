import type { Bid } from '../types';
import StatusBadge from './StatusBadge';
export function BidCard({bid,showPrice=true}:{bid:Bid;showPrice?:boolean}){return <article dir="rtl" className="rounded-xl border p-4"><div className="flex justify-between"><StatusBadge status={bid.status}/><span className="text-xs">{bid.deliveryDays.toLocaleString('fa-IR')} روز تحویل</span></div><h3 className="mt-3 font-bold">{bid.supplierCompanyName}</h3><p className="mt-2 text-xs">قیمت کل: {showPrice?`${bid.totalPrice.toLocaleString('fa-IR')} ریال`:'مخفی — استعلام بسته'}</p><p className="mt-2 text-xs text-muted-foreground">{bid.technicalCompliance?'مطابق مشخصات فنی':'دارای انحراف فنی'}</p></article>}
export default BidCard;
