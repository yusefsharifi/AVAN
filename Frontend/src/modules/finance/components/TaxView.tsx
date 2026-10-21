// src/modules/finance/components/TaxView.tsx — Phase 2: Real VAT from store
import { useMemo, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Download, Printer, Calculator, CheckCircle, AlertCircle,
  Clock, FileText, TrendingUp, TrendingDown, Plus, X,
} from 'lucide-react';
import { formatPersianNumber, toPersianDigits, isValidJalaliDateString, jalaliToday } from '../utils/persianUtils';
import type { VATReturn, WithholdingTaxEntry, TaxReturnStatus } from '../types';

const fa  = (n: number) => Math.round(n || 0).toLocaleString('fa-IR');
const MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];

// ── Config ─────────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<TaxReturnStatus, { label: string; cls: string; icon: React.ElementType }> = {
  draft:           { label: 'پیش‌نویس',      cls: 'bg-slate-50   text-slate-600   border-slate-200',   icon: FileText     },
  pending_filing:  { label: 'در انتظار ارسال', cls: 'bg-amber-50   text-amber-700   border-amber-200',   icon: Clock        },
  filed:           { label: 'ارسال‌شده',      cls: 'bg-blue-50    text-blue-700    border-blue-200',    icon: CheckCircle  },
  accepted:        { label: 'پذیرفته‌شده',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle  },
  rejected:        { label: 'رد‌شده',         cls: 'bg-red-50     text-red-700     border-red-200',     icon: AlertCircle  },
  amended:         { label: 'اصلاح‌شده',      cls: 'bg-purple-50  text-purple-700  border-purple-200',  icon: FileText     },
};

// ── WHT schema ─────────────────────────────────────────────────────────────────
const whtSchema = z.object({
  vendorName:    z.string().min(2, 'نام تأمین‌کننده الزامی است'),
  invoiceNumber: z.string().min(1, 'شماره فاکتور الزامی است'),
  grossAmount:   z.coerce.number().positive('مبلغ باید بزرگ‌تر از صفر باشد'),
  whtRate:       z.coerce.number().min(0).max(100, 'نرخ باید بین ۰ تا ۱۰۰ باشد'),
  periodId:      z.string().min(1, 'دوره الزامی است'),
});
type WHTForm = z.infer<typeof whtSchema>;

// ── Tax Calendar seed ──────────────────────────────────────────────────────────
const TAX_CALENDAR = MONTHS.map((name, i) => ({
  id: `TC-${i + 1}`,
  month: i + 1,
  name,
  vatDue:  `1403/${String(i + 2 > 12 ? 1 : i + 2).padStart(2, '0')}/15`,
  whtDue:  `1403/${String(i + 2 > 12 ? 1 : i + 2).padStart(2, '0')}/25`,
  status:  i < 3 ? 'filed' : i === 3 ? 'due_today' : 'upcoming',
}));

function exportCSV(rows: any[], name: string) {
  const csv = '\ufeff' + rows.map(r => Object.values(r).map(v => `"${v}"`).join(',')).join('\n');
  const a   = document.createElement('a');
  a.href    = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Main Component ──────────────────────────────────────────────────────────────
export function TaxView() {
  const { purchaseDocuments, salesDocuments, activeFiscalYear } = useFinanceStore();

  const [activeTab, setActiveTab] = useState<'vat' | 'wht' | 'calendar'>('vat');
  const [vatRate,   setVatRate]   = useState(10);
  const [whtRate,   setWhtRate]   = useState(3);
  const [vatReturns, setVatReturns] = useState<VATReturn[]>([]);
  const [whtEntries, setWhtEntries] = useState<WithholdingTaxEntry[]>([]);
  const [showWHTForm, setShowWHTForm] = useState(false);
  const [filing, setFiling] = useState<string | null>(null);

  // ── Build monthly VAT from purchase/sales documents ────────────────────────
  const monthlyVAT = useMemo(() => {
    return MONTHS.map((name, idx) => {
      const month     = String(idx + 1).padStart(2, '0');
      const prefix    = `1403/${month}`;
      const salesDocs = salesDocuments.filter(d => d.date?.startsWith(prefix) && d.status !== 'cancelled');
      const pursDocs  = purchaseDocuments.filter(d => d.date?.startsWith(prefix) && d.status !== 'cancelled');

      const totalSales = salesDocs.reduce((s, d) => s + (d.grandTotal || d.receivableAmount || 0), 0);
      const totalPurch = pursDocs.reduce((s, d) => s + (d.grandTotal || d.payableAmount || 0), 0);

      // Tax from stored totalTax field, or compute from totals
      const outputVAT = salesDocs.reduce((s, d) => s + (d.totalTax || (d.receivableAmount * vatRate / 100)), 0);
      const inputVAT  = pursDocs.reduce((s, d) => s + (d.totalTax || (d.payableAmount  * vatRate / 100)), 0);
      const netPayable = outputVAT - inputVAT;

      const existing = vatReturns.find(r => r.periodId === `1403-${month}`);
      const status: TaxReturnStatus = existing?.status ?? (idx < 3 ? 'filed' : idx === 3 ? 'pending_filing' : 'draft');

      return {
        periodId: `1403-${month}`, periodName: name, month: idx + 1,
        totalTaxableSales: totalSales, totalTaxablePurchases: totalPurch,
        outputVAT, inputVAT, netPayable, status,
        invoiceCount: salesDocs.length + pursDocs.length,
      };
    });
  }, [salesDocuments, purchaseDocuments, vatRate, vatReturns]);

  const totalOutputVAT  = monthlyVAT.reduce((s, m) => s + m.outputVAT, 0);
  const totalInputVAT   = monthlyVAT.reduce((s, m) => s + m.inputVAT,  0);
  const totalNetPayable = monthlyVAT.reduce((s, m) => s + m.netPayable, 0);

  // ── WHT ────────────────────────────────────────────────────────────────────
  const { register, handleSubmit, reset, watch, formState: { errors, isValid } } = useForm<WHTForm>({
    resolver: zodResolver(whtSchema), mode: 'onChange',
    defaultValues: { vendorName: '', invoiceNumber: '', grossAmount: 0, whtRate, periodId: '1403-04' },
  });

  const addWHT = (data: WHTForm) => {
    const whtAmount = Math.round(data.grossAmount * data.whtRate / 100);
    const entry: WithholdingTaxEntry = {
      id: `WHT-${Date.now()}`,
      vendorId: `V-${Date.now()}`,
      vendorName: data.vendorName,
      invoiceId: `INV-${Date.now()}`,
      invoiceNumber: data.invoiceNumber,
      grossAmount: data.grossAmount,
      whtRate: data.whtRate,
      whtAmount,
      netPayment: data.grossAmount - whtAmount,
      periodId: data.periodId,
      status: 'pending',
      createdAt: jalaliToday(),
    };
    setWhtEntries(prev => [entry, ...prev]);
    toast.success('ورود مالیات تکلیفی ثبت شد');
    reset();
    setShowWHTForm(false);
  };

  const fileVATReturn = (periodId: string) => {
    const row = monthlyVAT.find(m => m.periodId === periodId);
    if (!row) return;
    const vatReturn: VATReturn = {
      id: `VAT-${Date.now()}`,
      periodId, periodName: row.periodName,
      companyId: 'C-001',
      totalTaxableSales: row.totalTaxableSales,
      totalTaxablePurchases: row.totalTaxablePurchases,
      outputVAT: row.outputVAT,
      inputVAT: row.inputVAT,
      netPayable: row.netPayable,
      status: 'filed',
      filedDate: jalaliToday(),
      createdAt: jalaliToday(),
    };
    setVatReturns(prev => [vatReturn, ...prev.filter(r => r.periodId !== periodId)]);
    toast.success(`اظهارنامه ${row.periodName} ارسال شد`);
    setFiling(null);
  };

  const remitWHT = (id: string) => {
    setWhtEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'remitted' as const, remittanceDate: jalaliToday() } : e));
    toast.success('مالیات تکلیفی پرداخت شد');
  };

  const inputCls = 'w-full border border-border rounded-lg py-2 px-3 text-xs bg-secondary focus:outline-none focus:border-accent';
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1';

  return (
    <div dir="rtl" className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">مدیریت مالیات</h1>
          <p className="text-xs text-muted-foreground mt-0.5">مالیات ارزش افزوده و مالیات تکلیفی</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportCSV(monthlyVAT, 'اظهارنامه-مالیات')}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-xs hover:bg-secondary">
            <Download size={13} />خروجی CSV
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-xs hover:bg-secondary">
            <Printer size={13} />چاپ
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'مالیات خروجی (فروش)', value: fa(totalOutputVAT),  icon: TrendingUp,   color: 'text-emerald-600' },
          { label: 'مالیات ورودی (خرید)', value: fa(totalInputVAT),   icon: TrendingDown, color: 'text-blue-600' },
          { label: 'خالص مالیات پرداختنی', value: fa(totalNetPayable), icon: Calculator,   color: totalNetPayable > 0 ? 'text-red-600' : 'text-emerald-600' },
          { label: 'نرخ مالیات',           value: `${vatRate}٪`,       icon: Calculator,   color: 'text-foreground' },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
              <div className="p-2 bg-secondary rounded-lg shrink-0"><Icon size={16} className={k.color} /></div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground truncate">{k.label}</p>
                <p className={`text-sm font-bold ${k.color}`} dir="ltr">{k.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rate controls */}
      <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap gap-5 items-center">
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-muted-foreground">نرخ ارزش افزوده:</label>
          <div className="flex items-center gap-1">
            <button onClick={() => setVatRate(r => Math.max(0, r - 1))} className="w-7 h-7 rounded border border-border text-foreground font-bold hover:bg-secondary">-</button>
            <span className="w-12 text-center text-sm font-bold">{toPersianDigits(vatRate)}٪</span>
            <button onClick={() => setVatRate(r => Math.min(25, r + 1))} className="w-7 h-7 rounded border border-border text-foreground font-bold hover:bg-secondary">+</button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-muted-foreground">نرخ مالیات تکلیفی:</label>
          <div className="flex items-center gap-1">
            <button onClick={() => setWhtRate(r => Math.max(0, r - 1))} className="w-7 h-7 rounded border border-border text-foreground font-bold hover:bg-secondary">-</button>
            <span className="w-12 text-center text-sm font-bold">{toPersianDigits(whtRate)}٪</span>
            <button onClick={() => setWhtRate(r => Math.min(25, r + 1))} className="w-7 h-7 rounded border border-border text-foreground font-bold hover:bg-secondary">+</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
        {([['vat','اظهارنامه ارزش افزوده'],['wht','مالیات تکلیفی'],['calendar','تقویم مالیاتی']] as const).map(([t, l]) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === t ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>{l}</button>
        ))}
      </div>

      {/* ── VAT Tab ───────────────────────────────────────────────────────────── */}
      {activeTab === 'vat' && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-secondary/30 border-b border-border">
              <tr>
                {['دوره','فاکتورها','فروش مشمول','مالیات خروجی','خرید مشمول','مالیات ورودی','خالص پرداختنی','وضعیت','عملیات'].map(h => (
                  <th key={h} className="text-right py-3 px-3 font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyVAT.map(row => {
                const cfg     = STATUS_CFG[row.status];
                const Icon    = cfg.icon;
                const canFile = row.status === 'draft' || row.status === 'pending_filing';
                return (
                  <tr key={row.periodId} className="border-b border-border/40 last:border-0 hover:bg-secondary/20">
                    <td className="py-3 px-3 font-semibold text-foreground">{row.periodName}</td>
                    <td className="py-3 px-3 text-center">{toPersianDigits(row.invoiceCount)}</td>
                    <td className="py-3 px-3 font-mono text-muted-foreground" dir="ltr">{fa(row.totalTaxableSales)}</td>
                    <td className="py-3 px-3 font-mono text-emerald-600 font-semibold" dir="ltr">{fa(row.outputVAT)}</td>
                    <td className="py-3 px-3 font-mono text-muted-foreground" dir="ltr">{fa(row.totalTaxablePurchases)}</td>
                    <td className="py-3 px-3 font-mono text-blue-600" dir="ltr">{fa(row.inputVAT)}</td>
                    <td className={`py-3 px-3 font-mono font-bold ${row.netPayable > 0 ? 'text-red-600' : 'text-emerald-600'}`} dir="ltr">
                      {row.netPayable > 0 ? '+' : ''}{fa(row.netPayable)}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border w-fit ${cfg.cls}`}>
                        <Icon size={9} />{cfg.label}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {canFile && (
                        <button
                          onClick={() => setFiling(row.periodId)}
                          className="text-[10px] px-2.5 py-1 rounded-lg bg-accent text-white hover:bg-accent/90 font-medium"
                        >
                          ارسال اظهارنامه
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-secondary/30 border-t border-border font-bold">
              <tr>
                <td className="py-3 px-3 text-foreground" colSpan={3}>جمع سال {activeFiscalYear}</td>
                <td className="py-3 px-3 font-mono text-emerald-600" dir="ltr">{fa(totalOutputVAT)}</td>
                <td className="py-3 px-3"></td>
                <td className="py-3 px-3 font-mono text-blue-600" dir="ltr">{fa(totalInputVAT)}</td>
                <td className={`py-3 px-3 font-mono ${totalNetPayable > 0 ? 'text-red-600' : 'text-emerald-600'}`} dir="ltr">{fa(totalNetPayable)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ── WHT Tab ───────────────────────────────────────────────────────────── */}
      {activeTab === 'wht' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowWHTForm(f => !f)}
              className="flex items-center gap-1.5 px-3 py-2 bg-accent text-white rounded-lg text-xs font-semibold hover:bg-accent/90">
              <Plus size={13} />ثبت مالیات تکلیفی
            </button>
          </div>

          {showWHTForm && (
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold">ورود مالیات تکلیفی جدید</p>
                <button onClick={() => setShowWHTForm(false)}><X size={16} className="text-muted-foreground" /></button>
              </div>
              <form onSubmit={handleSubmit(addWHT)} className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>نام تأمین‌کننده <span className="text-red-500">*</span></label>
                    <input {...register('vendorName')} placeholder="نام شرکت یا فرد" className={inputCls} />
                    {errors.vendorName && <p className="text-[10px] text-red-500 mt-0.5">{errors.vendorName.message}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>شماره فاکتور <span className="text-red-500">*</span></label>
                    <input {...register('invoiceNumber')} placeholder="PINV-1403-010" className={inputCls} />
                    {errors.invoiceNumber && <p className="text-[10px] text-red-500 mt-0.5">{errors.invoiceNumber.message}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>دوره <span className="text-red-500">*</span></label>
                    <select {...register('periodId')} className={inputCls}>
                      {MONTHS.map((m, i) => (
                        <option key={i} value={`1403-${String(i+1).padStart(2,'0')}`}>{m} ۱۴۰۳</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>مبلغ ناخالص (ریال) <span className="text-red-500">*</span></label>
                    <input type="number" min={1} {...register('grossAmount')} className={`${inputCls} text-left`} dir="ltr" />
                    {errors.grossAmount && <p className="text-[10px] text-red-500 mt-0.5">{errors.grossAmount.message}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>نرخ مالیات تکلیفی (٪) <span className="text-red-500">*</span></label>
                    <input type="number" min={0} max={100} step={0.5} {...register('whtRate')} className={`${inputCls} text-left`} dir="ltr" />
                    {errors.whtRate && <p className="text-[10px] text-red-500 mt-0.5">{errors.whtRate.message}</p>}
                  </div>
                  <div className="flex flex-col justify-end">
                    {watch('grossAmount') > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs">
                        <p>مالیات: <span className="font-bold text-amber-700">{fa(watch('grossAmount') * watch('whtRate') / 100)}</span> ریال</p>
                        <p>خالص پرداخت: <span className="font-bold">{fa(watch('grossAmount') * (1 - watch('whtRate') / 100))}</span> ریال</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={!isValid}
                    className="px-5 py-2 bg-accent text-white rounded-lg text-xs font-semibold disabled:opacity-40">ثبت</button>
                  <button type="button" onClick={() => setShowWHTForm(false)}
                    className="px-4 py-2 border border-border rounded-lg text-xs text-muted-foreground">انصراف</button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-secondary/30 border-b border-border">
                <tr>
                  {['تأمین‌کننده','شماره فاکتور','دوره','مبلغ ناخالص','نرخ','مالیات','خالص پرداخت','وضعیت','عملیات'].map(h => (
                    <th key={h} className="text-right py-3 px-3 font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {whtEntries.length === 0 ? (
                  <tr><td colSpan={9} className="py-10 text-center text-muted-foreground text-sm">ورودی مالیات تکلیفی وجود ندارد</td></tr>
                ) : whtEntries.map(e => (
                  <tr key={e.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/20">
                    <td className="py-2.5 px-3 font-medium">{e.vendorName}</td>
                    <td className="py-2.5 px-3 font-mono text-primary" dir="ltr">{e.invoiceNumber}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{MONTHS[parseInt(e.periodId.slice(-2)) - 1]}</td>
                    <td className="py-2.5 px-3 font-mono" dir="ltr">{fa(e.grossAmount)}</td>
                    <td className="py-2.5 px-3">{toPersianDigits(e.whtRate)}٪</td>
                    <td className="py-2.5 px-3 font-mono text-red-600 font-semibold" dir="ltr">{fa(e.whtAmount)}</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-600" dir="ltr">{fa(e.netPayment)}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                        e.status === 'remitted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        e.status === 'deducted' ? 'bg-blue-50    text-blue-700    border-blue-200'    :
                                                  'bg-amber-50   text-amber-700   border-amber-200'
                      }`}>
                        {e.status === 'remitted' ? 'پرداخت‌شده' : e.status === 'deducted' ? 'کسر شده' : 'در انتظار'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {e.status === 'pending' && (
                        <button onClick={() => remitWHT(e.id)}
                          className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 font-medium">
                          پرداخت
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Calendar Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {TAX_CALENDAR.map(item => (
            <div key={item.id} className={`bg-card rounded-xl border p-4 ${
              item.status === 'overdue'   ? 'border-red-300 bg-red-50/30'    :
              item.status === 'due_today' ? 'border-amber-300 bg-amber-50/30' :
              item.status === 'filed'     ? 'border-emerald-200'              : 'border-border'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground">{item.name} ۱۴۰۳</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                  item.status === 'filed'     ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  item.status === 'due_today' ? 'bg-amber-50   text-amber-700   border-amber-200'   :
                  item.status === 'overdue'   ? 'bg-red-50     text-red-700     border-red-200'      :
                                               'bg-slate-50   text-slate-600   border-slate-200'
                }`}>
                  {item.status === 'filed' ? '✓ ارسال‌شده' : item.status === 'due_today' ? '⚠ امروز سررسید' : item.status === 'overdue' ? '✕ معوقه' : 'پیش‌رو'}
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>سررسید ارزش افزوده:</span>
                  <span className="font-mono font-medium text-foreground">{item.vatDue}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>سررسید مالیات تکلیفی:</span>
                  <span className="font-mono font-medium text-foreground">{item.whtDue}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File confirmation modal */}
      {filing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="bg-card rounded-xl border border-border p-5 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <FileText size={20} className="text-accent" />
              <div>
                <p className="text-sm font-bold text-foreground">ارسال اظهارنامه مالیاتی</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  دوره: {MONTHS[parseInt(filing.slice(-2)) - 1]} ۱۴۰۳
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-4">آیا از ارسال اظهارنامه این دوره اطمینان دارید؟ این عمل قابل برگشت نیست.</p>
            <div className="flex gap-2">
              <button onClick={() => fileVATReturn(filing)}
                className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90">
                بله، ارسال شود
              </button>
              <button onClick={() => setFiling(null)}
                className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary">
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaxView;
