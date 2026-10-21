import { Trophy } from 'lucide-react';
import type { RFQ, Vendor } from '../types';

export default function PriceComparisonTable({ rfq, vendors, onAward }: { rfq: RFQ; vendors: Vendor[]; onAward?: (quotationId: string) => void }) {
  const received = rfq.quotations.filter((q) => q.status === 'received' || q.status === 'awarded');
  if (received.length < 2) {
    return <p className="text-sm text-muted-foreground text-center py-6">حداقل ۲ پیشنهاد قیمت برای مقایسه لازم است</p>;
  }

  // All unique items across all quotations
  const allItemIds = Array.from(new Set(received.flatMap((q) => q.lines.map((l) => l.itemId))));
  const bestScore = Math.max(...received.map((q) => q.evaluationScore ?? 0));

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-secondary/30">
            <th className="text-right py-2 px-2 text-[10px] font-semibold text-foreground">کالا</th>
            {received.map((q) => (
              <th key={q.id} className="text-center py-2 px-2 text-[10px] font-semibold text-foreground">
                {q.vendorName}
                {(q.evaluationScore ?? 0) === bestScore && <Trophy className="w-3 h-3 inline text-amber-500 mr-1" />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allItemIds.map((itemId) => {
            const rowPrices = received.map((q) => q.lines.find((l) => l.itemId === itemId)?.unitPrice ?? Infinity);
            const minPrice = Math.min(...rowPrices);
            const itemName = received.flatMap((q) => q.lines).find((l) => l.itemId === itemId)?.itemNameFa ?? itemId;
            return (
              <tr key={itemId} className="border-b border-border/30 last:border-0">
                <td className="py-2 px-2 text-[10px] text-foreground">{itemName}</td>
                {received.map((q) => {
                  const line = q.lines.find((l) => l.itemId === itemId);
                  const isLowest = line?.unitPrice === minPrice;
                  return (
                    <td key={q.id} className={`py-2 px-2 text-center text-[10px] font-mono ${isLowest ? 'text-emerald-700 font-bold bg-emerald-50' : 'text-foreground'}`} dir="ltr">
                      {line ? line.unitPrice.toLocaleString('fa-IR') : '—'}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          <tr className="border-t-2 border-border bg-secondary/20">
            <td className="py-2 px-2 text-[10px] font-bold text-foreground">جمع کل</td>
            {received.map((q) => <td key={q.id} className="py-2 px-2 text-center text-[10px] font-mono font-bold text-foreground" dir="ltr">{q.grandTotal.toLocaleString('fa-IR')}</td>)}
          </tr>
          <tr>
            <td className="py-2 px-2 text-[10px] text-muted-foreground">مدت تحویل (روز)</td>
            {received.map((q) => <td key={q.id} className="py-2 px-2 text-center text-[10px] font-mono text-muted-foreground" dir="ltr">{Math.max(...q.lines.map((l) => l.deliveryDays), 0)}</td>)}
          </tr>
          <tr>
            <td className="py-2 px-2 text-[10px] text-muted-foreground">امتیاز تأمین‌کننده</td>
            {received.map((q) => {
              const v = vendors.find((vv) => vv.id === q.vendorId);
              return <td key={q.id} className="py-2 px-2 text-center text-[10px] font-mono text-muted-foreground" dir="ltr">{v?.overallScore ?? '—'}</td>;
            })}
          </tr>
          <tr className="bg-secondary/30">
            <td className="py-2 px-2 text-[10px] font-bold text-foreground">امتیاز ارزیابی</td>
            {received.map((q) => (
              <td key={q.id} className={`py-2 px-2 text-center text-xs font-mono font-bold ${(q.evaluationScore ?? 0) === bestScore ? 'text-emerald-700' : 'text-foreground'}`} dir="ltr">{q.evaluationScore ?? '—'}</td>
            ))}
          </tr>
          {onAward && rfq.status === 'responses_received' && (
            <tr>
              <td className="py-2 px-2" />
              {received.map((q) => (
                <td key={q.id} className="py-2 px-2 text-center">
                  <button onClick={() => onAward(q.id)} className="text-[10px] px-2 py-1 rounded-lg bg-accent text-white font-semibold hover:bg-accent/90">انتخاب برنده</button>
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
