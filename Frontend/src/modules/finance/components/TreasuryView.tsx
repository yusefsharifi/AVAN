// src/modules/finance/components/TreasuryView.tsx — Phase 2: Real treasury data
import { useMemo, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Building2, Wallet, CreditCard, TrendingUp, TrendingDown,
  ArrowLeftRight, Download, Printer, Plus, X, CheckCircle, Clock, AlertCircle,
} from 'lucide-react';
import { formatPersianNumber, toPersianDigits, isValidJalaliDateString, jalaliToday } from '../utils/persianUtils';
import { JalaliDatePicker } from './JalaliDatePicker';

const fa = (n: number) => Math.round(n || 0).toLocaleString('fa-IR');

// ── Transfer schema ─────────────────────────────────────────────────────────
const transferSchema = z.object({
  fromAccountId: z.string().min(1, 'حساب مبدأ الزامی است'),
  toAccountId:   z.string().min(1, 'حساب مقصد الزامی است'),
  amount:        z.coerce.number().positive('مبلغ باید بزرگ‌تر از صفر باشد'),
  date:          z.string().refine(isValidJalaliDateString, 'تاریخ نامعتبر است'),
  description:   z.string().min(3, 'شرح الزامی است'),
  referenceNo:   z.string().optional(),
}).refine(d => d.fromAccountId !== d.toAccountId, {
  message: 'حساب مبدأ و مقصد نمی‌توانند یکی باشند',
  path: ['toAccountId'],
});
type TransferForm = z.infer<typeof transferSchema>;

interface InternalTransfer {
  id: string;
  fromAccountName: string;
  toAccountName: string;
  amount: number;
  date: string;
  description: string;
  referenceNo: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
}

function exportCSV(rows: any[], name: string) {
  const csv = '\ufeff' + rows.map(r => Object.values(r).map(v => `"${v}"`).join(',')).join('\n');
  const a   = document.createElement('a');
  a.href    = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function TreasuryView() {
  const { bankAccountRecords, checks, receiptPaymentDocs, vouchers, accounts, fiscalYears, activeFiscalYear } = useFinanceStore();

  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transfers, setTransfers]               = useState<InternalTransfer[]>([]);
  const [activeTab, setActiveTab]               = useState<'overview' | 'checks' | 'transfers' | 'recent'>('overview');

  const fiscalYearId = fiscalYears.find(f => f.year === activeFiscalYear)?.id ?? fiscalYears[0]?.id ?? '';

  // ── Cash position from accounts ──────────────────────────────────────────
  const cashAccounts  = accounts.filter(a => a.isCashAccount);
  const bankGLAccounts = accounts.filter(a => a.isBankAccount);
  const totalCash     = cashAccounts.reduce((s, a)  => s + (a.currentBalance ?? 0), 0);
  const totalBank     = bankGLAccounts.reduce((s, a) => s + (a.currentBalance ?? 0), 0);

  // Checks
  const checksReceivable = checks.filter(c => c.direction === 'incoming'  && c.status === 'issued').reduce((s, c) => s + c.amount, 0);
  const checksPayable    = checks.filter(c => c.direction === 'outgoing'  && c.status === 'pending_clearance').reduce((s, c) => s + c.amount, 0);
  const bouncedChecks    = checks.filter(c => c.status === 'bounced');
  const totalPosition    = totalCash + totalBank + checksReceivable - checksPayable;

  // ── Recent transactions (last 30 days from RP docs) ──────────────────────
  const recentDocs = useMemo(() => {
    const today    = jalaliToday();
    const cutoff30 = `1403/03/15`; // approx 30 days ago in Jalali
    return receiptPaymentDocs
      .filter(d => d.date >= cutoff30 && d.status !== 'cancelled')
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20);
  }, [receiptPaymentDocs]);

  // Monthly inflow/outflow from RP docs
  const thisMonthDocs = receiptPaymentDocs.filter(d => d.date?.startsWith('1403/04') && d.status !== 'cancelled');
  const monthInflows  = thisMonthDocs.filter(d => d.type === 'receipt').reduce((s, d) => s + d.totalAmount, 0);
  const monthOutflows = thisMonthDocs.filter(d => d.type === 'payment').reduce((s, d) => s + d.totalAmount, 0);

  // ── Transfer form ──────────────────────────────────────────────────────────
  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isValid } } = useForm<TransferForm>({
    resolver: zodResolver(transferSchema), mode: 'onChange',
    defaultValues: { fromAccountId: '', toAccountId: '', amount: 0, date: jalaliToday(), description: '', referenceNo: '' },
  });

  const handleTransfer = (data: TransferForm) => {
    const fromAcc = bankAccountRecords.find(b => b.id === data.fromAccountId);
    const toAcc   = bankAccountRecords.find(b => b.id === data.toAccountId);
    const transfer: InternalTransfer = {
      id:              `TRF-${Date.now()}`,
      fromAccountName: fromAcc?.name ?? data.fromAccountId,
      toAccountName:   toAcc?.name   ?? data.toAccountId,
      amount:          data.amount,
      date:            data.date,
      description:     data.description,
      referenceNo:     data.referenceNo ?? '',
      status:          'completed',
      createdAt:       jalaliToday(),
    };
    setTransfers(prev => [transfer, ...prev]);
    toast.success(`انتقال ${fa(data.amount)} ریال انجام شد`);
    reset();
    setShowTransferForm(false);
  };

  const inputCls = 'w-full border border-border rounded-lg py-2 px-3 text-xs bg-secondary focus:outline-none focus:border-accent';
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1';

  const checkStatusBadge = (status: string) => (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
      status === 'issued'             ? 'bg-blue-50    text-blue-700    border-blue-200'    :
      status === 'cleared'            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
      status === 'pending_clearance'  ? 'bg-amber-50   text-amber-700   border-amber-200'   :
      status === 'bounced'            ? 'bg-red-50     text-red-700     border-red-200'      :
                                       'bg-slate-50   text-slate-600   border-slate-200'
    }`}>
      {status === 'issued' ? 'صادر شده' : status === 'cleared' ? 'وصول شده' :
       status === 'pending_clearance' ? 'در انتظار وصول' : status === 'bounced' ? 'برگشت خورده' : status}
    </span>
  );

  return (
    <div dir="rtl" className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">خزانه و مدیریت وجوه</h1>
          <p className="text-xs text-muted-foreground mt-0.5">موقعیت نقدی، چک‌ها و انتقال داخلی</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportCSV(recentDocs.map(d => ({ date: d.date, number: d.documentNumber, type: d.type === 'receipt' ? 'دریافت' : 'پرداخت', entity: d.entityName, amount: d.totalAmount, status: d.status })), 'تراکنش‌های-خزانه')}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-xs hover:bg-secondary">
            <Download size={13} />خروجی CSV
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-xs hover:bg-secondary">
            <Printer size={13} />چاپ
          </button>
          <button onClick={() => setShowTransferForm(f => !f)}
            className="flex items-center gap-1.5 px-3 py-2 bg-accent text-white rounded-lg text-xs font-semibold hover:bg-accent/90">
            <ArrowLeftRight size={13} />انتقال بین حساب‌ها
          </button>
        </div>
      </div>

      {/* Cash Position KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'موجودی صندوق',        value: fa(totalCash),        icon: Wallet,      color: 'text-foreground' },
          { label: 'موجودی بانک‌ها',       value: fa(totalBank),        icon: Building2,   color: 'text-blue-600' },
          { label: 'چک‌های دریافتنی',     value: fa(checksReceivable), icon: CreditCard,  color: 'text-emerald-600' },
          { label: 'موقعیت نقدی کل',      value: fa(totalPosition),    icon: TrendingUp,  color: 'text-accent' },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
              <div className="p-2.5 bg-secondary rounded-xl shrink-0"><Icon size={18} className={k.color} /></div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground truncate">{k.label}</p>
                <p className={`text-sm font-bold ${k.color}`} dir="ltr">{k.value} ریال</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Monthly flow summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-emerald-200 p-4 flex items-center gap-3">
          <TrendingUp size={18} className="text-emerald-600 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">ورودی این ماه</p>
            <p className="text-base font-bold text-emerald-600" dir="ltr">+{fa(monthInflows)} ریال</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-red-200 p-4 flex items-center gap-3">
          <TrendingDown size={18} className="text-red-600 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">خروجی این ماه</p>
            <p className="text-base font-bold text-red-600" dir="ltr">-{fa(monthOutflows)} ریال</p>
          </div>
        </div>
        <div className={`bg-card rounded-xl border p-4 flex items-center gap-3 ${monthInflows - monthOutflows >= 0 ? 'border-emerald-200' : 'border-red-200'}`}>
          <ArrowLeftRight size={18} className={monthInflows - monthOutflows >= 0 ? 'text-emerald-600' : 'text-red-600'} />
          <div>
            <p className="text-xs text-muted-foreground">جریان خالص این ماه</p>
            <p className={`text-base font-bold ${monthInflows - monthOutflows >= 0 ? 'text-emerald-600' : 'text-red-600'}`} dir="ltr">
              {monthInflows - monthOutflows >= 0 ? '+' : ''}{fa(monthInflows - monthOutflows)} ریال
            </p>
          </div>
        </div>
      </div>

      {/* Bounced checks warning */}
      {bouncedChecks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700">
              {toPersianDigits(bouncedChecks.length)} چک برگشتی وجود دارد
            </p>
            <div className="mt-1 space-y-0.5">
              {bouncedChecks.map(c => (
                <p key={c.id} className="text-xs text-red-600">
                  چک {c.checkNumber} — {c.direction === 'incoming' ? c.payerName : c.payeeName} — {formatPersianNumber(c.amount)} ریال
                  {c.bounceReason && ` — ${c.bounceReason}`}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Transfer form */}
      {showTransferForm && (
        <div className="bg-card rounded-xl border border-accent/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ArrowLeftRight size={16} className="text-accent" />
              <p className="text-sm font-bold text-foreground">انتقال داخلی بین حساب‌های بانکی</p>
            </div>
            <button onClick={() => setShowTransferForm(false)}><X size={16} className="text-muted-foreground" /></button>
          </div>
          <form onSubmit={handleSubmit(handleTransfer)} className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>از حساب <span className="text-red-500">*</span></label>
                <select {...register('fromAccountId')} className={inputCls}>
                  <option value="">انتخاب کنید...</option>
                  {bankAccountRecords.map(b => (
                    <option key={b.id} value={b.id}>{b.name} — {fa(b.currentBalance)} ریال</option>
                  ))}
                </select>
                {errors.fromAccountId && <p className="text-[10px] text-red-500 mt-0.5">{errors.fromAccountId.message}</p>}
              </div>
              <div>
                <label className={labelCls}>به حساب <span className="text-red-500">*</span></label>
                <select {...register('toAccountId')} className={inputCls}>
                  <option value="">انتخاب کنید...</option>
                  {bankAccountRecords.filter(b => b.id !== watch('fromAccountId')).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                {errors.toAccountId && <p className="text-[10px] text-red-500 mt-0.5">{errors.toAccountId.message}</p>}
              </div>
              <div>
                <label className={labelCls}>مبلغ (ریال) <span className="text-red-500">*</span></label>
                <input type="number" min={1} {...register('amount')} className={`${inputCls} text-left`} dir="ltr" />
                {errors.amount && <p className="text-[10px] text-red-500 mt-0.5">{errors.amount.message}</p>}
              </div>
              <JalaliDatePicker label="تاریخ انتقال *" value={watch('date')} onChange={v => setValue('date', v, { shouldValidate: true })} error={errors.date?.message} />
              <div>
                <label className={labelCls}>شماره مرجع</label>
                <input {...register('referenceNo')} placeholder="TRX-12345 (اختیاری)" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>شرح <span className="text-red-500">*</span></label>
                <input {...register('description')} placeholder="انتقال بین حساب‌های بانکی" className={inputCls} />
                {errors.description && <p className="text-[10px] text-red-500 mt-0.5">{errors.description.message}</p>}
              </div>
            </div>

            {watch('fromAccountId') && watch('toAccountId') && watch('amount') > 0 && (
              <div className="flex items-center gap-3 bg-accent/5 border border-accent/20 rounded-lg px-4 py-2.5 text-xs">
                <span className="font-medium text-foreground">
                  {bankAccountRecords.find(b => b.id === watch('fromAccountId'))?.name}
                </span>
                <ArrowLeftRight size={14} className="text-accent shrink-0" />
                <span className="font-medium text-foreground">
                  {bankAccountRecords.find(b => b.id === watch('toAccountId'))?.name}
                </span>
                <span className="text-accent font-bold mr-auto" dir="ltr">{fa(watch('amount'))} ریال</span>
              </div>
            )}

            <div className="flex gap-2">
              <button type="submit" disabled={!isValid}
                className="px-5 py-2.5 bg-accent text-white rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-accent/90">
                ثبت انتقال
              </button>
              <button type="button" onClick={() => setShowTransferForm(false)}
                className="px-4 py-2.5 border border-border rounded-lg text-xs text-muted-foreground hover:bg-secondary">
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {([
          ['overview',  'حساب‌های بانکی'],
          ['checks',    'مدیریت چک'],
          ['transfers', 'انتقال‌های داخلی'],
          ['recent',    'تراکنش‌های اخیر'],
        ] as const).map(([t, l]) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === t ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>{l}</button>
        ))}
      </div>

      {/* ── Bank Accounts Tab ────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bankAccountRecords.map(bank => {
            const glAcc = accounts.find(a => a.id === bank.glAccountId);
            const recentTx = receiptPaymentDocs.filter(d => d.bankAccountId === bank.id && d.status !== 'cancelled').slice(0, 3);
            return (
              <div key={bank.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{bank.name}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{bank.bankName} — {bank.accountNumber}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                    bank.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    {bank.status === 'active' ? 'فعال' : 'غیرفعال'}
                  </span>
                </div>
                <div className="text-center py-3 bg-secondary/30 rounded-xl mb-4">
                  <p className="text-[10px] text-muted-foreground mb-1">موجودی فعلی</p>
                  <p className="text-xl font-bold text-foreground" dir="ltr">{fa(bank.currentBalance)}</p>
                  <p className="text-[10px] text-muted-foreground">ریال</p>
                </div>
                {glAcc && (
                  <div className="flex justify-between text-xs text-muted-foreground mb-3 pb-3 border-b border-border">
                    <span>حساب GL:</span>
                    <span className="font-mono font-medium text-foreground">{glAcc.code} — {glAcc.nameFa}</span>
                  </div>
                )}
                {recentTx.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground mb-1.5">آخرین تراکنش‌ها:</p>
                    {recentTx.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate">{tx.entityName}</span>
                        <span className={`font-mono font-semibold ${tx.type === 'receipt' ? 'text-emerald-600' : 'text-red-600'}`} dir="ltr">
                          {tx.type === 'receipt' ? '+' : '-'}{fa(tx.totalAmount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Checks Tab ───────────────────────────────────────────────────────── */}
      {activeTab === 'checks' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'چک‌های دریافتنی',    value: fa(checksReceivable), color: 'text-emerald-600',  count: checks.filter(c => c.direction === 'incoming' && c.status === 'issued').length },
              { label: 'چک‌های پرداختنی',    value: fa(checksPayable),    color: 'text-red-600',      count: checks.filter(c => c.direction === 'outgoing' && c.status === 'pending_clearance').length },
              { label: 'وصول‌شده',           value: '',                   color: 'text-slate-600',    count: checks.filter(c => c.status === 'cleared').length },
              { label: 'برگشت خورده',         value: '',                   color: 'text-red-700',      count: checks.filter(c => c.status === 'bounced').length },
            ].map(k => (
              <div key={k.label} className="bg-card rounded-xl border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
                <p className={`text-xl font-bold ${k.color}`}>{toPersianDigits(k.count)}</p>
                {k.value && <p className="text-[10px] text-muted-foreground mt-0.5" dir="ltr">{k.value} ریال</p>}
              </div>
            ))}
          </div>

          {/* Checks table */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-secondary/30 border-b border-border">
                <tr>
                  {['شماره چک','جهت','طرف حساب','بانک','مبلغ','تاریخ صدور','سررسید','وضعیت'].map(h => (
                    <th key={h} className="text-right py-3 px-3 font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {checks.length === 0 ? (
                  <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">چکی ثبت نشده</td></tr>
                ) : checks.map(c => (
                  <tr key={c.id} className={`border-b border-border/40 last:border-0 hover:bg-secondary/20 ${c.status === 'bounced' ? 'bg-red-50/30' : ''}`}>
                    <td className="py-2.5 px-3 font-mono font-semibold text-primary" dir="ltr">{c.checkNumber}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${c.direction === 'incoming' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {c.direction === 'incoming' ? '← دریافتی' : '→ پرداختی'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium">{c.direction === 'incoming' ? c.payerName : c.payeeName}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{c.bankName}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold" dir="ltr">{fa(c.amount)}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{c.issueDate}</td>
                    <td className={`py-2.5 px-3 ${c.dueDate < jalaliToday() && c.status !== 'cleared' ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                      {c.dueDate}
                    </td>
                    <td className="py-2.5 px-3">{checkStatusBadge(c.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Transfers Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'transfers' && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-secondary/30 border-b border-border">
              <tr>
                {['از حساب','به حساب','مبلغ','تاریخ','شرح','مرجع','وضعیت'].map(h => (
                  <th key={h} className="text-right py-3 px-3 font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <ArrowLeftRight size={32} className="mx-auto mb-2 text-muted-foreground opacity-30" />
                    <p className="text-sm text-muted-foreground">انتقال داخلی‌ای ثبت نشده است</p>
                    <button onClick={() => setShowTransferForm(true)}
                      className="mt-3 text-xs text-accent hover:underline">
                      اولین انتقال را ثبت کنید
                    </button>
                  </td>
                </tr>
              ) : transfers.map(t => (
                <tr key={t.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/20">
                  <td className="py-2.5 px-3 font-medium text-foreground">{t.fromAccountName}</td>
                  <td className="py-2.5 px-3 font-medium text-foreground">{t.toAccountName}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-accent" dir="ltr">{fa(t.amount)}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{t.date}</td>
                  <td className="py-2.5 px-3 text-muted-foreground max-w-[160px] truncate">{t.description}</td>
                  <td className="py-2.5 px-3 font-mono text-muted-foreground" dir="ltr">{t.referenceNo || '—'}</td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 w-fit ${
                      t.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      t.status === 'pending'   ? 'bg-amber-50   text-amber-700   border-amber-200'   :
                                                 'bg-red-50     text-red-700     border-red-200'
                    }`}>
                      {t.status === 'completed' ? <><CheckCircle size={9} />انجام شد</> : t.status === 'pending' ? <><Clock size={9} />در انتظار</> : 'لغو شد'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Recent Transactions Tab ───────────────────────────────────────────── */}
      {activeTab === 'recent' && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-secondary/30 border-b border-border">
              <tr>
                {['تاریخ','شماره سند','نوع','طرف حساب','ابزار','مبلغ','وضعیت'].map(h => (
                  <th key={h} className="text-right py-3 px-3 font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentDocs.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">تراکنشی یافت نشد</td></tr>
              ) : recentDocs.map(doc => (
                <tr key={doc.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/20">
                  <td className="py-2.5 px-3 text-muted-foreground">{doc.date}</td>
                  <td className="py-2.5 px-3 font-mono text-primary" dir="ltr">{doc.documentNumber}</td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${doc.type === 'receipt' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : doc.type === 'payment' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                      {doc.type === 'receipt' ? 'دریافت' : doc.type === 'payment' ? 'پرداخت' : 'انتقال'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-medium max-w-[140px] truncate">{doc.entityName}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">
                    {{ cash: 'نقد', check: 'چک', bank_transfer: 'حواله', promissory_note: 'سفته', online: 'آنلاین', lc: 'LC' }[doc.instrumentType] ?? doc.instrumentType}
                  </td>
                  <td className={`py-2.5 px-3 font-mono font-semibold ${doc.type === 'receipt' ? 'text-emerald-600' : doc.type === 'payment' ? 'text-red-600' : 'text-foreground'}`} dir="ltr">
                    {doc.type === 'receipt' ? '+' : doc.type === 'payment' ? '-' : ''}{fa(doc.totalAmount)}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                      doc.status === 'posted'    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      doc.status === 'approved'  ? 'bg-blue-50    text-blue-700    border-blue-200'    :
                      doc.status === 'bounced'   ? 'bg-red-50     text-red-700     border-red-200'      :
                      doc.status === 'cancelled' ? 'bg-slate-50   text-slate-600   border-slate-200'   :
                                                   'bg-amber-50   text-amber-700   border-amber-200'
                    }`}>
                      {{ draft: 'پیش‌نویس', prepared: 'آماده', approved: 'تأیید', posted: 'ثبت‌شده', bounced: 'برگشتی', cancelled: 'لغو' }[doc.status] ?? doc.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TreasuryView;
