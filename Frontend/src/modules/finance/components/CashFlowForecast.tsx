// src/modules/finance/components/CashFlowForecast.tsx — Phase 4: Live GL + forecast
import { useMemo, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Download, Printer, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

const fa = (n: number) => Math.round(n).toLocaleString('fa-IR');

const CONF_CFG = {
  high:   { label: 'بالا',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  medium: { label: 'متوسط',  cls: 'bg-amber-50   text-amber-700   border-amber-200'   },
  low:    { label: 'پایین',   cls: 'bg-red-50     text-red-700     border-red-200'     },
} as const;

function exportCSV(rows: any[]) {
  const header = ['تاریخ','ورودی','خروجی','خالص','مانده تجمعی','اطمینان'];
  const lines = [header, ...rows.map(r => [r.date, r.inflows, r.outflows, r.netCashFlow, r.cumulativeBalance, CONF_CFG[r.confidence as keyof typeof CONF_CFG]?.label ?? r.confidence])];
  const csv = '\ufeff' + lines.map(r => r.map((x: any) => `"${x}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'جریان-وجوه-نقد.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

export function CashFlowForecast() {
  const { vouchers, bankAccountRecords, checks, fiscalYears, activeFiscalYear, receiptPaymentDocs } = useFinanceStore();
  const [selectedBank, setSelectedBank] = useState<string>('all');
  const [showForecast, setShowForecast] = useState(true);

  const fiscalYearId = fiscalYears.find(f => f.year === activeFiscalYear)?.id ?? fiscalYears[0]?.id ?? '';

  // ── Actuals from posted GL vouchers ──────────────────────────────────────
  const actualRows = useMemo(() => {
    const byDate: Record<string, { inflows: number; outflows: number }> = {};
    const posted = vouchers.filter(v => v.status === 'posted' && v.fiscalYearId === fiscalYearId);
    posted.forEach(v => {
      const d = v.date?.slice(0, 10) ?? '';
      if (!byDate[d]) byDate[d] = { inflows: 0, outflows: 0 };
      v.entries.forEach(e => {
        byDate[d].inflows  += e.credit;
        byDate[d].outflows += e.debit;
      });
    });
    let cum = bankAccountRecords.reduce((s, b) => s + (b.currentBalance ?? 0), 0);
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { inflows, outflows }]) => {
        const netCashFlow = inflows - outflows;
        cum += netCashFlow;
        return { date, inflows, outflows, netCashFlow, cumulativeBalance: cum, confidence: 'high' as const, isActual: true };
      });
  }, [vouchers, bankAccountRecords, fiscalYearId]);

  // ── Forecast: simple 30-day extrapolation from last 7 days avg ───────────
  const forecastRows = useMemo(() => {
    if (!showForecast || actualRows.length === 0) return [];
    const last7 = actualRows.slice(-7);
    const avgIn  = last7.reduce((s, r) => s + r.inflows, 0)  / last7.length;
    const avgOut = last7.reduce((s, r) => s + r.outflows, 0) / last7.length;
    const lastCum = actualRows.at(-1)?.cumulativeBalance ?? 0;
    const lastDate = actualRows.at(-1)?.date ?? '';

    // Parse last jalali date
    const [ly, lm, ld] = lastDate.split('/').map(Number);
    let cum = lastCum;
    return Array.from({ length: 30 }, (_, i) => {
      const d = ld + i + 1;
      const month = lm + Math.floor((d - 1) / 30);
      const day   = ((d - 1) % 30) + 1;
      const date  = `${ly}/${String(month > 12 ? month - 12 : month).padStart(2,'0')}/${String(day).padStart(2,'0')}`;
      const variance  = 0.15 * (i / 30); // confidence drops over time
      const inflows   = avgIn  * (1 + (Math.random() - 0.5) * variance);
      const outflows  = avgOut * (1 + (Math.random() - 0.5) * variance);
      const netCashFlow = inflows - outflows;
      cum += netCashFlow;
      const confidence: 'high'|'medium'|'low' = i < 7 ? 'high' : i < 20 ? 'medium' : 'low';
      return { date, inflows, outflows, netCashFlow, cumulativeBalance: cum, confidence, isActual: false };
    });
  }, [actualRows, showForecast]);

  const allRows = [...actualRows, ...forecastRows];

  // ── Summary metrics ───────────────────────────────────────────────────────
  const totalIn   = actualRows.reduce((s, r) => s + r.inflows,  0);
  const totalOut  = actualRows.reduce((s, r) => s + r.outflows, 0);
  const netFlow   = totalIn - totalOut;
  const endBalance = actualRows.at(-1)?.cumulativeBalance ?? 0;

  // Pending checks
  const pendingChecksIn  = checks.filter(c => c.direction === 'incoming' && c.status === 'issued').reduce((s,c) => s + c.amount, 0);
  const pendingChecksOut = checks.filter(c => c.direction === 'outgoing' && c.status === 'pending_clearance').reduce((s,c) => s + c.amount, 0);

  return (
    <div className="bg-card rounded-xl border border-border" dir="rtl">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">جریان وجوه نقد</h3>
        <div className="flex items-center gap-2">
          <select value={selectedBank} onChange={e => setSelectedBank(e.target.value)}
            className="border border-border rounded-lg px-2 py-1 text-xs bg-secondary">
            <option value="all">همه حساب‌ها</option>
            {bankAccountRecords.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={showForecast} onChange={e => setShowForecast(e.target.checked)} className="rounded" />
            پیش‌بینی ۳۰ روزه
          </label>
          <button onClick={() => exportCSV(allRows)} className="flex items-center gap-1 border border-border rounded px-2 py-1 text-xs hover:bg-secondary">
            <Download size={12} />CSV
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-1 border border-border rounded px-2 py-1 text-xs hover:bg-secondary">
            <Printer size={12} />چاپ
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border border-b border-border">
        {[
          { label: 'جمع ورودی',      value: fa(totalIn),         icon: TrendingUp,   color: 'text-emerald-600' },
          { label: 'جمع خروجی',      value: fa(totalOut),        icon: TrendingDown, color: 'text-red-600' },
          { label: 'خالص جریان',     value: fa(Math.abs(netFlow)), icon: Wallet,      color: netFlow >= 0 ? 'text-emerald-600' : 'text-red-600' },
          { label: 'مانده نقدی',      value: fa(endBalance),      icon: Wallet,       color: 'text-foreground' },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="p-3 text-center">
              <Icon size={16} className={`mx-auto mb-1 ${k.color}`} />
              <p className="text-[10px] text-muted-foreground">{k.label}</p>
              <p className={`text-sm font-bold ${k.color}`} dir="ltr">{k.value}</p>
            </div>
          );
        })}
      </div>

      {/* Pending checks banner */}
      {(pendingChecksIn > 0 || pendingChecksOut > 0) && (
        <div className="flex gap-4 px-4 py-2 bg-amber-50 border-b border-amber-100 text-xs">
          {pendingChecksIn  > 0 && <span className="text-emerald-700">چک‌های دریافتنی در راه: <b>{fa(pendingChecksIn)}</b> ریال</span>}
          {pendingChecksOut > 0 && <span className="text-red-700">چک‌های پرداختنی در راه: <b>{fa(pendingChecksOut)}</b> ریال</span>}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        {allRows.length === 0 ? (
          <p className="text-center py-10 text-sm text-muted-foreground">سندی ثبت نشده است.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-secondary/80 backdrop-blur">
              <tr className="border-b border-border">
                {['تاریخ','ورودی','خروجی','خالص','مانده تجمعی','منبع','اطمینان'].map(h => (
                  <th key={h} className="text-right py-2.5 px-3 font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allRows.map((row, i) => {
                const conf = CONF_CFG[row.confidence];
                return (
                  <tr key={`${row.date}-${i}`}
                    className={`border-b border-border/30 hover:bg-secondary/20 transition-colors ${!row.isActual ? 'opacity-70 italic' : ''}`}>
                    <td className="py-2 px-3 font-medium text-foreground">{row.date}</td>
                    <td className="py-2 px-3 text-emerald-600 font-mono" dir="ltr">+{fa(row.inflows)}</td>
                    <td className="py-2 px-3 text-red-600 font-mono" dir="ltr">-{fa(row.outflows)}</td>
                    <td className={`py-2 px-3 font-mono font-semibold ${row.netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`} dir="ltr">
                      {row.netCashFlow >= 0 ? '+' : ''}{fa(row.netCashFlow)}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-foreground" dir="ltr">{fa(row.cumulativeBalance)}</td>
                    <td className="py-2 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${row.isActual ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        {row.isActual ? 'واقعی' : 'پیش‌بینی'}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${conf.cls}`}>{conf.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default CashFlowForecast;
