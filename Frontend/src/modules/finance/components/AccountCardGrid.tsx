import { useMemo, useState } from 'react';
import { useFinanceStore } from '../store';
import { useOptionalReportContext } from '../context/ReportContext';
import { Download, Printer } from 'lucide-react';

const fa = (n: number) => Math.round(n || 0).toLocaleString('fa-IR');
const latin = (v: string) =>
  v.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
   .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
const dateNo = (v: string) => Number(latin(v || '').replace(/\D/g, '')) || 0;
const labels: Record<string, string> = {
  opening: 'افتتاحیه', general: 'عادی', closing: 'اختتامیه',
  adjusting: 'تعدیلی', depreciation: 'استهلاک',
};

function exportCSV(rows: any[], accountName: string) {
  const header = ['ردیف', 'تاریخ', 'شماره سند', 'شرح', 'بدهکار', 'بستانکار', 'مانده', 'نوع سند'];
  const lines = [header, ...rows.map((r, i) => [
    i + 1, r.date, r.voucherNumber, r.description,
    r.debit || 0, r.credit || 0, r.balance, labels[r.type] || r.type,
  ])];
  const content = '\ufeff' + lines.map(r => r.map((x: any) => `"${String(x ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  a.download = `کارتکس-${accountName}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function AccountCardGrid() {
  const { accounts, vouchers, fiscalYears, activeFiscalYear } = useFinanceStore();
  const report = useOptionalReportContext();
  const fiscal = fiscalYears.find(y => y.id === report?.fiscalYearId)
    || fiscalYears.find(y => y.year === activeFiscalYear)
    || fiscalYears[0];
  const initial = accounts.find(a => a.fiscalYearId === fiscal?.id && a.type === 'asset') || accounts[0];
  const [accountId, setAccountId] = useState(initial?.id || '');
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState(fiscal?.startDate || '');
  const [to, setTo] = useState(fiscal?.endDate || '');
  const [type, setType] = useState('all');
  const [voucherId, setVoucherId] = useState<string | null>(null);

  const account = accounts.find(a => a.id === accountId);
  const debitNature = account?.type === 'asset' || account?.type === 'expense';
  const options = accounts.filter(a =>
    a.fiscalYearId === fiscal?.id && (`${a.code} ${a.nameFa}`).includes(query)
  );

  const rows = useMemo(() => {
    if (!account) return [];
    let run = account.openingBalance || 0;
    const body = vouchers
      .filter(v =>
        v.status === 'posted' &&
        v.fiscalYearId === fiscal?.id &&
        (!report || (
          Number(latin(v.periodId).match(/(\d{1,2})$/)?.[1] || 0) >= report.fromPeriod &&
          Number(latin(v.periodId).match(/(\d{1,2})$/)?.[1] || 0) <= report.toPeriod
        )) &&
        v.entries.some(e => e.accountId === account.id) &&
        (!from || dateNo(v.date) >= dateNo(from)) &&
        (!to || dateNo(v.date) <= dateNo(to)) &&
        (type === 'all' || v.type === type)
      )
      .sort((a, b) => dateNo(a.date) - dateNo(b.date) || a.voucherNumber.localeCompare(b.voucherNumber))
      .flatMap(v =>
        v.entries.filter(e => e.accountId === account.id).map(e => {
          run += debitNature ? (e.debit - e.credit) : (e.credit - e.debit);
          return {
            date: v.date, voucherId: v.id, voucherNumber: v.voucherNumber,
            description: [v.description, e.description].filter(Boolean).join(' — '),
            debit: e.debit, credit: e.credit, balance: run, type: v.type,
          };
        })
      );
    const open = { date: fiscal?.startDate || '', voucherId: '', voucherNumber: '', description: 'سند افتتاحیه', debit: debitNature ? account.openingBalance : 0, credit: debitNature ? 0 : account.openingBalance, balance: account.openingBalance, type: 'opening' };
    const last = body.at(-1)?.balance ?? open.balance;
    return [open, ...body, { date: to || fiscal?.endDate || '', voucherId: '', voucherNumber: '', description: 'مانده کل', debit: debitNature && last > 0 ? last : 0, credit: !debitNature && last > 0 ? last : 0, balance: last, type: 'closing' }];
  }, [account, vouchers, from, to, type, debitNature, fiscal]);

  const voucher = vouchers.find(v => v.id === voucherId);

  return (
    <div dir="rtl" className="space-y-3">
      {/* Filters */}
      <div className="print:hidden grid grid-cols-1 gap-2 md:grid-cols-4">
        <div>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="جست‌وجوی کد یا نام حساب"
            className="w-full rounded border border-border p-2 text-xs mb-1 bg-secondary focus:outline-none"
          />
          <select
            value={accountId}
            onChange={e => { setAccountId(e.target.value); setQuery(''); }}
            className="w-full rounded border border-border p-2 text-xs bg-secondary"
          >
            {options.map(a => <option value={a.id} key={a.id}>{a.code} — {a.nameFa}</option>)}
          </select>
        </div>
        <input
          value={from}
          onChange={e => setFrom(e.target.value)}
          placeholder="از تاریخ ۱۴۰۳/۰۱/۰۱"
          className="rounded border border-border p-2 text-xs bg-secondary"
        />
        <input
          value={to}
          onChange={e => setTo(e.target.value)}
          placeholder="تا تاریخ ۱۴۰۳/۱۲/۲۹"
          className="rounded border border-border p-2 text-xs bg-secondary"
        />
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="rounded border border-border p-2 text-xs bg-secondary"
        >
          <option value="all">همه اسناد</option>
          {Object.entries(labels).map(([k, v]) => <option value={k} key={k}>{v}</option>)}
        </select>
      </div>

      {/* Export buttons */}
      <div className="print:hidden flex items-center gap-2 justify-end">
        <span className="text-xs text-muted-foreground ml-2">
          {account?.nameFa} — {rows.length - 2} ردیف
        </span>
        <button
          onClick={() => exportCSV(rows, account?.nameFa || '')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors"
        >
          <Download className="w-3.5 h-3.5" />خروجی CSV
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />چاپ
        </button>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-xl border border-border">
        <table className="w-full whitespace-nowrap text-xs">
          <thead className="bg-secondary">
            <tr>
              {['ردیف', 'تاریخ', 'شماره سند', 'شرح', 'بدهکار', 'بستانکار', 'مانده', 'نوع سند'].map(x => (
                <th key={x} className="p-3 text-right font-semibold">{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={`${r.voucherId}-${i}`}
                className={i === 0 || i === rows.length - 1 ? 'bg-secondary/50 font-bold' : 'border-t border-border/30 hover:bg-secondary/20'}
              >
                <td className="p-3">{fa(i + 1)}</td>
                <td className="p-3">{r.date}</td>
                <td className="p-3">
                  {r.voucherId ? (
                    <button onClick={() => setVoucherId(r.voucherId)} className="text-amber-600 hover:underline">
                      {r.voucherNumber}
                    </button>
                  ) : '—'}
                </td>
                <td className="p-3 max-w-xs truncate">{r.description}</td>
                <td className="p-3 text-emerald-700 font-mono" dir="ltr">{r.debit ? fa(r.debit) : '—'}</td>
                <td className="p-3 text-red-700 font-mono" dir="ltr">{r.credit ? fa(r.credit) : '—'}</td>
                <td className="p-3 font-mono font-semibold" dir="ltr">{fa(r.balance)}</td>
                <td className="p-3 text-muted-foreground">{labels[r.type] || r.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Voucher detail modal */}
      {voucher && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setVoucherId(null)}>
          <section
            className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-3 flex justify-between items-center">
              <h2 className="font-bold">جزئیات سند {voucher.voucherNumber}</h2>
              <button onClick={() => setVoucherId(null)} className="text-xl text-muted-foreground hover:text-foreground">×</button>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">{voucher.description} · {voucher.date}</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-secondary">
                  <th className="text-right p-2">کد حساب</th>
                  <th className="text-right p-2">بدهکار</th>
                  <th className="text-right p-2">بستانکار</th>
                  <th className="text-right p-2">شرح</th>
                </tr>
              </thead>
              <tbody>
                {voucher.entries.map(e => (
                  <tr key={e.id} className="border-t border-border/30">
                    <td className="p-2 font-mono" dir="ltr">{e.accountCode}</td>
                    <td className="p-2 text-emerald-700 font-mono" dir="ltr">{fa(e.debit)}</td>
                    <td className="p-2 text-red-700 font-mono" dir="ltr">{fa(e.credit)}</td>
                    <td className="p-2">{e.description}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-secondary font-bold">
                  <td className="p-2">جمع</td>
                  <td className="p-2 font-mono text-emerald-700" dir="ltr">{fa(voucher.totalDebit)}</td>
                  <td className="p-2 font-mono text-red-700" dir="ltr">{fa(voucher.totalCredit)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </section>
        </div>
      )}
    </div>
  );
}

export default AccountCardGrid;
