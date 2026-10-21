import React, { useMemo, useState } from 'react';
import { Download, Printer, RefreshCw } from 'lucide-react';
import { useFinanceStore } from '../store';
import { calculateTrialBalance, calculateBalanceSheet, calculateIncomeStatement } from '../utils/reportCalculators';
import TrialBalanceGrid from './TrialBalanceGrid';
import { BalanceSheetGrid, IncomeStatementGrid } from './reports/ReportGrids';
import { AccountCardGrid } from './AccountCardGrid';

const periods = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const tabs = [
  ['trial', 'تراز آزمایشی'],
  ['card', 'کارتکس حساب'],
  ['balance', 'ترازنامه'],
  ['income', 'سود و زیان'],
  ['analytical', 'ترازهای تحلیلی'],
  ['cashflow', 'جریان وجوه نقد'],
];

function csv(name: string, rows: any[][]) {
  const content = '\ufeff' + rows.map(r => r.map((x: any) => `"${String(x ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  a.download = name + '.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

export function ReportsHub() {
  const { accounts, vouchers, fiscalYears, activeFiscalYear } = useFinanceStore();
  const [tab, setTab] = useState('trial');
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(12);
  const [level, setLevel] = useState(4);
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [dimension, setDimension] = useState<'costCenterId' | 'projectId'>('costCenterId');
  const [entity, setEntity] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const fiscalYearId = fiscalYears.find((f: any) => f.year === activeFiscalYear || f.id === activeFiscalYear)?.id
    || fiscalYears[0]?.id || '';

  const trial = useMemo(() =>
    calculateTrialBalance(accounts, vouchers, fiscalYearId, from, to, level),
    [accounts, vouchers, fiscalYearId, from, to, level, refreshKey]
  );
  const balance = useMemo(() => calculateBalanceSheet(trial), [trial]);
  const income = useMemo(() => calculateIncomeStatement(trial), [trial]);
  const analytical = useMemo(() => {
    if (!entity) return trial;
    const filtered = vouchers
      .map(v => ({ ...v, entries: v.entries.filter((e: any) => e[dimension] === entity) }))
      .filter(v => v.entries.length);
    return calculateTrialBalance(accounts, filtered, fiscalYearId, from, to, level);
  }, [entity, dimension, vouchers, accounts, fiscalYearId, from, to, level]);

  const posteds = vouchers.filter(v => v.status === 'posted' && v.fiscalYearId === fiscalYearId);

  // Cash flow computed from GL
  const cashFlowRows = useMemo(() => {
    const byDate: Record<string, { inflows: number; outflows: number }> = {};
    posteds.forEach(v => {
      const d = v.date?.slice(0, 10) || '';
      if (!byDate[d]) byDate[d] = { inflows: 0, outflows: 0 };
      v.entries.forEach(e => {
        byDate[d].inflows += e.credit;
        byDate[d].outflows += e.debit;
      });
    });
    let cum = 0;
    return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, { inflows, outflows }]) => {
      const net = inflows - outflows;
      cum += net;
      return { date, inflows, outflows, net, cum };
    });
  }, [posteds]);

  const exportCurrent = () => {
    if (tab === 'trial' || tab === 'analytical') {
      const src = tab === 'trial' ? trial : analytical;
      csv('تراز-آزمایشی', [['کد', 'شرح', 'بدهکار', 'بستانکار'], ...src.map(r => [r.accountCode, r.accountName, r.closingDebit, r.closingCredit])]);
    } else if (tab === 'balance') {
      csv('ترازنامه', [['ردیف', 'مبلغ'], ...balance.map(r => [r.label, r.amount])]);
    } else if (tab === 'income') {
      csv('سود-زیان', [['ردیف', 'مبلغ'], ...income.map(r => [r.label, r.amount])]);
    } else if (tab === 'cashflow') {
      csv('جریان-وجوه-نقد', [['تاریخ', 'ورودی', 'خروجی', 'خالص', 'تجمعی'], ...cashFlowRows.map(r => [r.date, r.inflows, r.outflows, r.net, r.cum])]);
    }
  };

  return (
    <div className="flex min-h-[600px] bg-card border border-border rounded-xl overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-secondary/40 border-l border-border p-3 print:hidden">
        <p className="font-bold text-sm px-2 py-3">گزارشات حسابداری</p>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`w-full text-right px-3 py-2.5 rounded-lg text-xs mb-0.5 transition-colors ${tab === id ? 'bg-accent text-white font-semibold' : 'hover:bg-secondary text-muted-foreground'}`}
          >
            {label}
          </button>
        ))}
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 p-5">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 justify-between items-center mb-5 print:hidden">
          <div className="flex flex-wrap gap-2 items-center">
            <select value={from} onChange={e => setFrom(+e.target.value)} className="border border-border rounded-lg p-2 text-xs bg-secondary">
              {periods.map((x, i) => <option value={i + 1} key={x}>از {x}</option>)}
            </select>
            <select value={to} onChange={e => setTo(+e.target.value)} className="border border-border rounded-lg p-2 text-xs bg-secondary">
              {periods.map((x, i) => <option value={i + 1} key={x}>تا {x}</option>)}
            </select>
            {(tab === 'trial' || tab === 'analytical') && (
              <select value={level} onChange={e => setLevel(+e.target.value)} className="border border-border rounded-lg p-2 text-xs bg-secondary">
                <option value={1}>سطح ۱</option>
                <option value={2}>تا سطح ۲</option>
                <option value={3}>تا سطح ۳</option>
                <option value={4}>همه سطوح</option>
              </select>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-1 border border-border rounded-lg p-2 text-xs hover:bg-secondary">
              <Printer size={14} /> چاپ
            </button>
            <button onClick={exportCurrent} className="flex items-center gap-1 border border-border rounded-lg p-2 text-xs hover:bg-secondary">
              <Download size={14} /> خروجی CSV
            </button>
            <button onClick={() => setRefreshKey(k => k + 1)} className="flex items-center gap-1 border border-border rounded-lg p-2 text-xs hover:bg-secondary">
              <RefreshCw size={14} /> بروزرسانی
            </button>
          </div>
        </div>

        <header className="mb-4">
          <h1 className="font-bold text-lg">{tabs.find(x => x[0] === tab)?.[1]}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            سال مالی {activeFiscalYear} — از {periods[from - 1]} تا {periods[to - 1]} | ارقام به ریال
          </p>
        </header>

        {posteds.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground text-sm">هیچ سند ثبت‌نهایی‌شده‌ای موجود نیست.</div>
        ) : (
          <>
            {tab === 'trial' && (
              <TrialBalanceGrid rows={trial} onAccount={id => { setAccountId(id); setTab('card'); }} />
            )}
            {tab === 'card' && (
              <>
                <select
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  className="border border-border rounded-lg p-2 mb-3 text-xs w-full bg-secondary"
                >
                  {accounts.map(a => <option value={a.id} key={a.id}>{a.code} — {a.nameFa}</option>)}
                </select>
                <AccountCardGrid />
              </>
            )}
            {tab === 'balance' && (
              <>
                <BalanceSheetGrid rows={balance} />
                <p className="mt-3 text-xs text-amber-600">کنترل تراز: دارایی‌ها باید با بدهی‌ها و حقوق صاحبان سهام برابر باشد.</p>
              </>
            )}
            {tab === 'income' && <IncomeStatementGrid rows={income} />}
            {tab === 'analytical' && (
              <>
                <div className="flex gap-2 mb-3 print:hidden">
                  <select value={dimension} onChange={e => setDimension(e.target.value as any)}
                    className="border border-border rounded-lg p-2 text-xs bg-secondary">
                    <option value="costCenterId">مرکز هزینه</option>
                    <option value="projectId">پروژه</option>
                  </select>
                  <input value={entity} onChange={e => setEntity(e.target.value)}
                    placeholder="شناسه (مثلاً CC-001)"
                    className="border border-border rounded-lg p-2 text-xs bg-secondary flex-1" />
                </div>
                <TrialBalanceGrid rows={analytical} onAccount={id => { setAccountId(id); setTab('card'); }} />
              </>
            )}
            {tab === 'cashflow' && (
              <div>
                {cashFlowRows.length === 0 ? (
                  <p className="text-center py-10 text-muted-foreground">داده‌ای برای نمایش وجود ندارد.</p>
                ) : (
                  <div className="overflow-auto rounded-xl border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-secondary">
                        <tr>
                          {['تاریخ', 'ورودی', 'خروجی', 'خالص', 'مانده تجمعی'].map(h => (
                            <th key={h} className="text-right p-3 font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {cashFlowRows.map((r, i) => (
                          <tr key={i} className="border-t border-border/30 hover:bg-secondary/20">
                            <td className="p-3">{r.date}</td>
                            <td className="p-3 text-emerald-700 font-mono" dir="ltr">+{r.inflows.toLocaleString('fa-IR')}</td>
                            <td className="p-3 text-red-700 font-mono" dir="ltr">-{r.outflows.toLocaleString('fa-IR')}</td>
                            <td className={`p-3 font-mono font-semibold ${r.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`} dir="ltr">
                              {r.net >= 0 ? '+' : ''}{r.net.toLocaleString('fa-IR')}
                            </td>
                            <td className="p-3 font-mono font-bold" dir="ltr">{r.cum.toLocaleString('fa-IR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default ReportsHub;
