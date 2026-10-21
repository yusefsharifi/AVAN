import { toast } from 'sonner';
import { useFinanceStore } from '../../store';
import { Bell, Eye } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

// Converts a "YYYY/MM/DD" Persian-digit date string into an approximate day
// count (treating every month as 30 days). This is a deliberate simplification
// since no real Jalali calendar library is available in this project — it's
// accurate enough for relative ordering/urgency buckets, not exact day counts.
function pseudoDayNumber(dateStr: string): number | null {
  const enDigits = dateStr.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  const parts = enDigits.split('/').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [y, m, d] = parts;
  return y * 360 + m * 30 + d;
}

const TODAY = '۱۴۰۳/۰۴/۲۰'; // fixed reference date consistent with the mock data window
const todayNum = pseudoDayNumber(TODAY)!;

export default function DueDateReport() {
  const { checks, receiptPaymentDocs } = useFinanceStore();

  const pendingChecks = checks.filter((c) => c.status === 'issued' || c.status === 'pending_clearance');
  const pendingRP = receiptPaymentDocs.filter((d) => d.instrumentType === 'check' && d.status !== 'posted' && d.status !== 'cancelled' && d.checkDate);

  const rows = [
    ...pendingChecks.map((c) => ({ id: c.id, docNumber: c.checkNumber, person: c.direction === 'outgoing' ? c.payeeName : c.payerName, amount: c.amount, dueDate: c.dueDate, type: 'چک', status: c.status })),
    ...pendingRP.map((d) => ({ id: d.id, docNumber: d.documentNumber, person: d.entityName, amount: d.totalAmount, dueDate: d.checkDate!, type: 'سند دریافت/پرداخت', status: d.status })),
  ].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const urgencyOf = (dueDate: string) => {
    const num = pseudoDayNumber(dueDate);
    if (num === null) return { label: 'نامشخص', cls: 'bg-gray-100 text-gray-600' };
    const daysLeft = num - todayNum;
    if (daysLeft < 0) return { label: 'سررسید گذشته', cls: 'bg-red-100 text-red-800 font-bold' };
    if (daysLeft <= 3) return { label: `${daysLeft} روز مانده`, cls: 'bg-red-50 text-red-700' };
    if (daysLeft <= 7) return { label: `${daysLeft} روز مانده`, cls: 'bg-amber-50 text-amber-700' };
    return { label: `${daysLeft} روز مانده`, cls: 'bg-emerald-50 text-emerald-700' };
  };

  return (
    <div className="space-y-3" dir="rtl">
      <h2 className="text-sm font-bold text-foreground">سررسید نامه</h2>
      <p className="text-[11px] text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg p-2">
        این گزارش چک‌ها و اسناد چکی در انتظار وصول/پرداخت را بر اساس تاریخ سررسید فهرست می‌کند.
      </p>

      <div className="bg-card border border-border rounded-lg overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-100">
            <tr>{['عملیات', 'وضعیت فوریت', 'وضعیت سند', 'نوع', 'تاریخ سررسید', 'مبلغ', 'شخص', 'شماره سند'].map((h) => <th key={h} className="text-right py-2 px-2 font-semibold text-gray-700 border-b border-border">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const u = urgencyOf(r.dueDate);
              return (
                <tr key={r.id + i} className={i % 2 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="py-1.5 px-2">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => toast.info(`یادآوری برای سند ${r.docNumber} ارسال شد`)} className="text-accent hover:underline flex items-center gap-0.5"><Bell className="w-3 h-3" />یادآوری</button>
                      <button onClick={() => toast.info(`مشاهده سند ${r.docNumber}`)} className="text-muted-foreground hover:underline flex items-center gap-0.5"><Eye className="w-3 h-3" />مشاهده</button>
                    </div>
                  </td>
                  <td className="py-1.5 px-2"><span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${u.cls}`}>{u.label}</span></td>
                  <td className="py-1.5 px-2 text-muted-foreground">{r.status}</td>
                  <td className="py-1.5 px-2">{r.type}</td>
                  <td className="py-1.5 px-2 font-mono" dir="ltr">{r.dueDate}</td>
                  <td className="py-1.5 px-2 font-mono" dir="ltr">{fmt(r.amount)}</td>
                  <td className="py-1.5 px-2">{r.person}</td>
                  <td className="py-1.5 px-2 font-mono" dir="ltr">{r.docNumber}</td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">سررسید فعالی یافت نشد</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
