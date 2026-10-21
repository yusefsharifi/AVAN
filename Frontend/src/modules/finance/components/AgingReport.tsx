import { useAgingReport } from '../hooks';
import { formatAmount } from '../utils';

export function AgingReport() {
  const { report, totals } = useAgingReport([
    { customerId: 'C-001', customerName: 'شرکت پلاستیک ایران', totalAmount: 48000000, daysOverdue: 0 },
    { customerId: 'C-002', customerName: 'صنایع فولاد البرز', totalAmount: 68000000, daysOverdue: 15 },
    { customerId: 'C-003', customerName: 'پتروشیمی پارس', totalAmount: 32000000, daysOverdue: 45 },
    { customerId: 'C-004', customerName: 'فرآوری غذایی تهران', totalAmount: 18000000, daysOverdue: 75 },
    { customerId: 'C-005', customerName: 'سرامیک شیراز', totalAmount: 25000000, daysOverdue: 95 },
  ]);
  
  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="p-4 border-b border-border"><h3 className="text-sm font-bold text-foreground text-right">گزارش سنی بدهکاران</h3></div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {['مشتری', 'جاری', '۱-۳۰', '۳۱-۶۰', '۶۱-۹۰', '۹۰+', 'مجموع'].map(h => <th key={h} className="text-right py-3 px-3 text-[10px] font-semibold text-foreground">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {report.map(row => (
              <tr key={row.customerId} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                <td className="py-3 px-3 text-xs font-medium text-foreground">{row.customerName}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{formatAmount(row.current)}</td>
                <td className="py-3 px-3 text-xs font-mono" dir="ltr"><span className="text-amber-600">{formatAmount(row.d1to30)}</span></td>
                <td className="py-3 px-3 text-xs font-mono" dir="ltr"><span className="text-orange-600">{formatAmount(row.d31to60)}</span></td>
                <td className="py-3 px-3 text-xs font-mono" dir="ltr"><span className="text-red-600">{formatAmount(row.d61to90)}</span></td>
                <td className="py-3 px-3 text-xs font-mono" dir="ltr"><span className="text-red-700 font-semibold">{formatAmount(row.d90plus)}</span></td>
                <td className="py-3 px-3 text-xs font-mono font-semibold text-foreground" dir="ltr">{formatAmount(row.total)}</td>
              </tr>
            ))}
            <tr className="bg-secondary/30 font-semibold">
              <td className="py-3 px-3 text-xs text-foreground">مجموع</td>
              {['current', 'd1to30', 'd31to60', 'd61to90', 'd90plus', 'total'].map(key => (
                <td key={key} className="py-3 px-3 text-xs font-mono text-foreground" dir="ltr">{formatAmount((totals as any)[key])}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
