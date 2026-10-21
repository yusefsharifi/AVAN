import { useNavigate } from 'react-router';
import type { RFQ } from '../types';
import StatusBadge from './StatusBadge';
import CountdownTimer from './CountdownTimer';
export function RFQCard({rfq,variant}:{rfq:RFQ;variant:'buyer'|'supplier'}){const nav=useNavigate();return <article dir="rtl" className="rounded-xl border p-4"><div className="flex justify-between"><StatusBadge status={rfq.status}/><CountdownTimer deadline={rfq.deadlineDate}/></div><h3 className="mt-3 font-bold">{rfq.title}</h3><p className="mt-2 text-xs text-muted-foreground">{rfq.categoryPath.join(' / ')}</p><p className="mt-2 text-xs">{rfq.quantity.toLocaleString('fa-IR')} {rfq.uom}</p><button onClick={()=>nav(variant==='supplier'?`/portal/marketplace/bids/create/${rfq.id}`:`/portal/marketplace/rfqs/${rfq.id}`)} className="mt-4 rounded bg-teal-600 px-3 py-2 text-xs text-white">{variant==='supplier'?'ارسال پیشنهاد':'مشاهده استعلام'}</button></article>}
export default RFQCard;
