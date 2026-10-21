import { KpiWidget } from '../../../components/KpiWidget';
import { TrendingUp, TrendingDown, CreditCard, AlertCircle } from 'lucide-react';

interface FinancialsTabProps {
  companyId: string;
}

export function FinancialsTab({ companyId }: FinancialsTabProps) {
  const mockInvoices = [
    { id: 'INV-001', amount: 48000000, status: 'paid' as const, date: '۱۴۰۳/۰۴/۰۱', desc: 'اجاره مرداد' },
    { id: 'INV-002', amount: 12500000, status: 'pending' as const, date: '۱۴۰۳/۰۴/۱۵', desc: 'هزینه آب و برق' },
    { id: 'INV-003', amount: 8200000, status: 'overdue' as const, date: '۱۴۰۳/۰۳/۱۰', desc: 'خدمات تأسیسات' },
  ];

  const totalPaid = mockInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const totalPending = mockInvoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0);
  const totalOverdue = mockInvoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiWidget label="Total Paid" labelFa="مجموع پرداختی" value={`${(totalPaid / 1000000).toFixed(0)}M`} unit="تومان" icon={TrendingUp} color="bg-emerald-50 text-emerald-600" />
        <KpiWidget label="Pending" labelFa="در انتظار" value={`${(totalPending / 1000000).toFixed(0)}M`} unit="تومان" icon={AlertCircle} color="bg-amber-50 text-amber-600" />
        <KpiWidget label="Overdue" labelFa="سررسید گذشته" value={`${(totalOverdue / 1000000).toFixed(0)}M`} unit="تومان" icon={TrendingDown} color="bg-red-50 text-red-600" />
        <KpiWidget label="Total Invoices" labelFa="تعداد فاکتورها" value={mockInvoices.length} icon={CreditCard} color="bg-blue-50 text-blue-600" />
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="p-4 border-b border-border"><h3 className="text-sm font-bold text-foreground text-right">فاکتورها</h3></div>
        <table className="w-full">
          <thead><tr className="border-b border-border bg-secondary/30">
            {['تاریخ', 'شرح', 'مبلغ', 'وضعیت', 'شناسه'].map(h => <th key={h} className="text-right py-3 px-4 text-xs font-semibold text-foreground">{h}</th>)}
          </tr></thead>
          <tbody>
            {mockInvoices.map(inv => (
              <tr key={inv.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                <td className="py-3 px-4 text-xs text-muted-foreground">{inv.date}</td>
                <td className="py-3 px-4 text-xs text-foreground">{inv.desc}</td>
                <td className="py-3 px-4 text-xs font-semibold font-mono text-foreground" dir="ltr">{inv.amount.toLocaleString()} ریال</td>
                <td className="py-3 px-4"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : inv.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{inv.status === 'paid' ? 'پرداخت شده' : inv.status === 'pending' ? 'در انتظار' : 'سررسید گذشته'}</span></td>
                <td className="py-3 px-4 text-xs font-mono text-primary" dir="ltr">{inv.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}