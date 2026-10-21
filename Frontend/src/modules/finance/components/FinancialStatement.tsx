import { useFinanceStore } from '../store';
import { formatAmount } from '../utils';

interface FinancialStatementProps {
  type: 'trial_balance' | 'balance_sheet' | 'income_statement';
}

export function FinancialStatement({ type }: FinancialStatementProps) {
  const { getTrialBalance, getFinancialStats } = useFinanceStore();
  const stats = getFinancialStats();
  
  if (type === 'trial_balance') {
    const data = getTrialBalance();
    return (
      <div className="bg-card rounded-xl border border-border">
        <div className="p-4 border-b border-border"><h3 className="text-sm font-bold text-foreground text-right">تراز آزمایشی</h3></div>
        <table className="w-full">
          <thead><tr className="border-b border-border bg-secondary/30">
            {['مانده پایان', 'بستانکار', 'بدهکار', 'مانده اول دوره', 'نام حساب', 'کد حساب'].map(h => <th key={h} className="text-right py-3 px-3 text-[10px] font-semibold text-foreground">{h}</th>)}
          </tr></thead>
          <tbody>
            {data.map(row => (
              <tr key={row.accountCode} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                <td className="py-3 px-3 text-xs font-mono font-semibold text-foreground" dir="ltr">{formatAmount(row.closingBalance)}</td>
                <td className="py-3 px-3 text-xs font-mono text-foreground" dir="ltr">{formatAmount(row.creditMovement)}</td>
                <td className="py-3 px-3 text-xs font-mono text-foreground" dir="ltr">{formatAmount(row.debitMovement)}</td>
                <td className="py-3 px-3 text-xs font-mono text-muted-foreground" dir="ltr">{formatAmount(row.openingBalance)}</td>
                <td className="py-3 px-3 text-xs text-foreground">{row.accountName}</td>
                <td className="py-3 px-3 text-xs font-mono text-primary" dir="ltr">{row.accountCode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-sm font-bold text-foreground text-right mb-4">خلاصه مالی</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between p-2 rounded bg-secondary/30"><span className="text-xs text-muted-foreground">دارایی‌ها</span><span className="text-xs font-mono font-semibold" dir="ltr">{formatAmount(stats.totalAssets)}</span></div>
          <div className="flex justify-between p-2 rounded bg-secondary/30"><span className="text-xs text-muted-foreground">بدهی‌ها</span><span className="text-xs font-mono font-semibold" dir="ltr">{formatAmount(stats.totalLiabilities)}</span></div>
          <div className="flex justify-between p-2 rounded bg-secondary/30"><span className="text-xs text-muted-foreground">حقوق صاحبان سهام</span><span className="text-xs font-mono font-semibold" dir="ltr">{formatAmount(stats.totalEquity)}</span></div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between p-2 rounded bg-secondary/30"><span className="text-xs text-muted-foreground">درآمدها</span><span className="text-xs font-mono font-semibold" dir="ltr">{formatAmount(stats.totalRevenue)}</span></div>
          <div className="flex justify-between p-2 rounded bg-secondary/30"><span className="text-xs text-muted-foreground">هزینه‌ها</span><span className="text-xs font-mono font-semibold" dir="ltr">{formatAmount(stats.totalExpenses)}</span></div>
          <div className="flex justify-between p-2 rounded bg-emerald-50"><span className="text-xs font-semibold text-emerald-700">سود خالص</span><span className="text-xs font-mono font-bold text-emerald-700" dir="ltr">{formatAmount(stats.netIncome)}</span></div>
        </div>
      </div>
    </div>
  );
}
