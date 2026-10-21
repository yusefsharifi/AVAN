// src/modules/finance/components/BudgetVsActual.tsx — Phase 4: Live data
import { useState } from 'react';
import { useBudgetVariance } from '../hooks/useBudgetVariance';
import { formatAmount } from '../utils';
import { TrendingUp, TrendingDown, Minus, Filter } from 'lucide-react';

const PERIODS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];

export function BudgetVsActual() {
  const [from, setFrom] = useState(1);
  const [to, setTo]     = useState(12);
  const [filter, setFilter] = useState<'all'|'over'|'under'|'on_track'>('all');
  const { data, summary } = useBudgetVariance(from, to);

  const rows = data.filter(r => filter === 'all' || r.status === filter);

  const StatusIcon = ({ status }: { status: string }) =>
    status === 'over'     ? <TrendingUp  size={12} className="text-red-500"   /> :
    status === 'under'    ? <TrendingDown size={12} className="text-amber-500" /> :
                            <Minus        size={12} className="text-blue-500"  />;

  return (
    <div className="bg-card rounded-xl border border-border" dir="rtl">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">بودجه در مقابل واقعیت</h3>
        <div className="flex items-center gap-2">
          <select value={from} onChange={e => setFrom(+e.target.value)} className="border border-border rounded px-2 py-1 text-xs bg-secondary">
            {PERIODS.map((p,i) => <option key={i} value={i+1}>از {p}</option>)}
          </select>
          <select value={to} onChange={e => setTo(+e.target.value)} className="border border-border rounded px-2 py-1 text-xs bg-secondary">
            {PERIODS.map((p,i) => <option key={i} value={i+1}>تا {p}</option>)}
          </select>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        {[
          { label: 'جمع بودجه',    value: formatAmount(summary.totalBudget),  color: 'text-foreground' },
          { label: 'جمع واقعی',    value: formatAmount(summary.totalActual),   color: 'text-foreground' },
          { label: 'انحراف کل',    value: formatAmount(Math.abs(summary.totalVariance)),
            color: summary.totalVariance > 0 ? 'text-red-600' : 'text-emerald-600' },
        ].map(k => (
          <div key={k.label} className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">{k.label}</p>
            <p className={`text-sm font-bold ${k.color}`} dir="ltr">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 p-3 border-b border-border">
        <Filter size={13} className="text-muted-foreground mt-0.5" />
        {([['all','همه'],['over','بالای بودجه'],['under','زیر بودجه'],['on_track','در مسیر']] as const).map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
              filter === v ? 'bg-accent text-white' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            }`}>{l}</button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/20">
              {['حساب','بودجه','واقعی','انحراف','درصد','وضعیت'].map(h => (
                <th key={h} className="text-right py-2 px-3 text-[10px] font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">ردیفی یافت نشد</td></tr>
            ) : rows.map(row => (
              <tr key={row.accountCode} className="border-b border-border/40 last:border-0 hover:bg-secondary/20">
                <td className="py-2.5 px-3">
                  <div className="text-xs font-medium text-foreground">{row.accountName}</div>
                  <div className="text-[10px] text-muted-foreground font-mono" dir="ltr">{row.accountCode}</div>
                </td>
                <td className="py-2.5 px-3 text-xs font-mono text-muted-foreground" dir="ltr">{formatAmount(row.budgetAmount)}</td>
                <td className="py-2.5 px-3 text-xs font-mono text-foreground" dir="ltr">{formatAmount(row.actualAmount)}</td>
                <td className={`py-2.5 px-3 text-xs font-mono ${row.variance > 0 ? 'text-red-600' : row.variance < 0 ? 'text-emerald-600' : 'text-muted-foreground'}`} dir="ltr">
                  {row.variance > 0 ? '+' : ''}{formatAmount(row.variance)}
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-1">
                    <StatusIcon status={row.status} />
                    <span className={`text-xs font-semibold ${row.variancePercent > 10 ? 'text-red-600' : row.variancePercent < -10 ? 'text-amber-600' : 'text-blue-600'}`}>
                      {Math.abs(row.variancePercent).toFixed(1)}٪
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-1 mt-1">
                    <div className={`h-1 rounded-full ${row.status === 'over' ? 'bg-red-500' : row.status === 'under' ? 'bg-amber-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(row.budgetAmount > 0 ? (row.actualAmount/row.budgetAmount)*100 : 0, 100)}%` }} />
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    row.status === 'over'     ? 'bg-red-50    text-red-700   border border-red-200' :
                    row.status === 'under'    ? 'bg-amber-50  text-amber-700 border border-amber-200' :
                                              'bg-blue-50   text-blue-700  border border-blue-200'
                  }`}>
                    {row.status === 'over' ? 'بالای بودجه' : row.status === 'under' ? 'زیر بودجه' : 'در مسیر'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BudgetVsActual;
