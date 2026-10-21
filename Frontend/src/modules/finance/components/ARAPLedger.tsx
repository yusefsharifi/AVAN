// src/modules/finance/components/ARAPLedger.tsx — Phase 7: Full AR/AP with matching
import { useMemo, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useAgingReport } from '../hooks/useAgingReport';
import { JalaliDatePicker } from './JalaliDatePicker';
import { Download, Plus, X, CheckCircle, AlertCircle, Link, Unlink, Printer } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { isValidJalaliDateString, toPersianDigits, formatPersianNumber, jalaliToday } from '../utils/persianUtils';

const fa = (n: number) => Math.round(n || 0).toLocaleString('fa-IR');

// ── Types ─────────────────────────────────────────────────────────────────────
type DocType = 'invoice' | 'payment';
type Party   = { id: string; name: string; type: 'customer' | 'vendor' };

interface ARAPDoc {
  id: string;
  type: DocType;
  number: string;
  party: Party;
  date: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  remaining: number;
  status: 'open' | 'partial' | 'closed';
  matchedPaymentIds: string[];
  description: string;
}

// ── Seed data ────────────────────────────────────────────────────────────────
const SEED_DOCS: ARAPDoc[] = [
  { id:'INV-001', type:'invoice', number:'INV-1403-001', party:{ id:'C-001', name:'شرکت پلاستیک ایران', type:'customer' }, date:'1403/02/01', dueDate:'1403/03/01', amount:48_000_000,  paidAmount:0,          remaining:48_000_000,  status:'open',    matchedPaymentIds:[], description:'فاکتور فروش کالا' },
  { id:'INV-002', type:'invoice', number:'INV-1403-002', party:{ id:'C-002', name:'صنایع فولاد البرز',  type:'customer' }, date:'1403/03/15', dueDate:'1403/04/15', amount:68_000_000,  paidAmount:20_000_000, remaining:48_000_000,  status:'partial', matchedPaymentIds:['PAY-001'], description:'فاکتور خدمات مهندسی' },
  { id:'INV-003', type:'invoice', number:'INV-1403-003', party:{ id:'C-003', name:'پتروشیمی پارس',      type:'customer' }, date:'1403/01/20', dueDate:'1403/02/20', amount:32_000_000,  paidAmount:32_000_000, remaining:0,           status:'closed',  matchedPaymentIds:['PAY-002'], description:'فاکتور مشاوره' },
  { id:'INV-004', type:'invoice', number:'INV-1403-004', party:{ id:'C-004', name:'فرآوری غذایی تهران', type:'customer' }, date:'1403/01/01', dueDate:'1403/02/01', amount:18_000_000,  paidAmount:0,          remaining:18_000_000,  status:'open',    matchedPaymentIds:[], description:'فاکتور فروش قطعات' },
  { id:'INV-005', type:'invoice', number:'PINV-1403-001', party:{ id:'V-001', name:'پتروپلیمر خاورمیانه', type:'vendor' }, date:'1403/03/01', dueDate:'1403/04/01', amount:500_000_000, paidAmount:0,          remaining:500_000_000, status:'open',    matchedPaymentIds:[], description:'خرید مواد اولیه پلیمر' },
  { id:'INV-006', type:'invoice', number:'PINV-1403-002', party:{ id:'V-002', name:'بسته‌بندی نوین ایران', type:'vendor' }, date:'1403/03/10', dueDate:'1403/03/25', amount:120_000_000, paidAmount:120_000_000, remaining:0,          status:'closed',  matchedPaymentIds:['PAY-003'], description:'خرید مواد بسته‌بندی' },
  { id:'PAY-001', type:'payment', number:'PAY-1403-001', party:{ id:'C-002', name:'صنایع فولاد البرز', type:'customer' }, date:'1403/03/20', dueDate:'1403/03/20', amount:20_000_000,  paidAmount:20_000_000, remaining:0,           status:'closed',  matchedPaymentIds:['INV-002'], description:'دریافت بخشی از فاکتور ۰۰۲' },
  { id:'PAY-002', type:'payment', number:'PAY-1403-002', party:{ id:'C-003', name:'پتروشیمی پارس', type:'customer' },     date:'1403/02/25', dueDate:'1403/02/25', amount:32_000_000,  paidAmount:32_000_000, remaining:0,           status:'closed',  matchedPaymentIds:['INV-003'], description:'تسویه کامل فاکتور ۰۰۳' },
  { id:'PAY-003', type:'payment', number:'PAY-1403-003', party:{ id:'V-002', name:'بسته‌بندی نوین ایران', type:'vendor' }, date:'1403/03/25', dueDate:'1403/03/25', amount:120_000_000, paidAmount:120_000_000, remaining:0,          status:'closed',  matchedPaymentIds:['INV-006'], description:'پرداخت کامل فاکتور PINV-002' },
];

// ── New invoice schema ────────────────────────────────────────────────────────
const invoiceSchema = z.object({
  number:      z.string().min(1, 'شماره فاکتور الزامی است'),
  partyName:   z.string().min(2, 'نام طرف حساب الزامی است'),
  partyType:   z.enum(['customer','vendor']),
  date:        z.string().refine(isValidJalaliDateString, 'تاریخ فاکتور نامعتبر است'),
  dueDate:     z.string().refine(isValidJalaliDateString, 'سررسید نامعتبر است'),
  amount:      z.coerce.number().positive('مبلغ باید بزرگ‌تر از صفر باشد'),
  description: z.string().optional(),
});
type InvoiceForm = z.infer<typeof invoiceSchema>;

// ── Export CSV ───────────────────────────────────────────────────────────────
function exportDocs(docs: ARAPDoc[], title: string) {
  const header = ['شماره','طرف حساب','تاریخ','سررسید','مبلغ','پرداخت‌شده','مانده','وضعیت'];
  const rows   = docs.map(d => [d.number, d.party.name, d.date, d.dueDate, d.amount, d.paidAmount, d.remaining,
    d.status === 'open' ? 'باز' : d.status === 'partial' ? 'جزئی' : 'بسته']);
  const csv = '\ufeff' + [header, ...rows].map(r => r.map(x => `"${x}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `${title}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Main component ────────────────────────────────────────────────────────────
export function ARAPLedger() {
  const [activeTab, setActiveTab] = useState<'ar'|'ap'>('ar');
  const [docs, setDocs] = useState<ARAPDoc[]>(SEED_DOCS);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string|null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string|null>(null);
  const [matchAmount, setMatchAmount] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [detailPartyId, setDetailPartyId] = useState<string|null>(null);

  const partyType = activeTab === 'ar' ? 'customer' : 'vendor';

  const invoices = docs.filter(d => d.type === 'invoice' && d.party.type === partyType);
  const payments = docs.filter(d => d.type === 'payment' && d.party.type === partyType);
  const openInvoices = invoices.filter(d => d.status !== 'closed');
  const unallocatedPayments = payments.filter(d => d.remaining > 0);

  // Aging for AR
  const agingInput = useMemo(() => invoices.map(inv => ({
    customerId: inv.party.id, customerName: inv.party.name,
    totalAmount: inv.remaining,
    daysOverdue: Math.max(0, Math.floor((Date.now() - new Date(inv.dueDate.replace(/\//g,'-')).getTime()) / 86400000)),
  })), [invoices]);
  const { report: agingReport, totals: agingTotals } = useAgingReport(agingInput);

  // Summary
  const totalOpen    = invoices.filter(d => d.status !== 'closed').reduce((s,d) => s + d.remaining, 0);
  const totalClosed  = invoices.filter(d => d.status === 'closed').reduce((s,d) => s + d.amount, 0);
  const totalPartial = invoices.filter(d => d.status === 'partial').reduce((s,d) => s + d.remaining, 0);

  // Form
  const { register, handleSubmit, watch, setValue, reset, formState:{ errors, isValid } } = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema),
    mode: 'onChange',
    defaultValues: { number:'', partyName:'', partyType: activeTab === 'ar' ? 'customer' : 'vendor', date:'', dueDate:'', amount:0, description:'' },
  });

  const handleAddDoc = (data: InvoiceForm) => {
    const id = `INV-${Date.now()}`;
    const newDoc: ARAPDoc = {
      id, type: 'invoice', number: data.number,
      party: { id: `PARTY-${Date.now()}`, name: data.partyName, type: data.partyType },
      date: data.date, dueDate: data.dueDate, amount: data.amount,
      paidAmount: 0, remaining: data.amount, status: 'open',
      matchedPaymentIds: [], description: data.description ?? '',
    };
    setDocs(prev => [newDoc, ...prev]);
    toast.success(`${activeTab === 'ar' ? 'فاکتور فروش' : 'فاکتور خرید'} ثبت شد`);
    reset();
    setShowAddForm(false);
  };

  const handleMatch = () => {
    if (!selectedInvoiceId || !selectedPaymentId) return;
    const inv = docs.find(d => d.id === selectedInvoiceId);
    const pay = docs.find(d => d.id === selectedPaymentId);
    if (!inv || !pay) return;
    const amount = parseFloat(matchAmount) || Math.min(inv.remaining, pay.remaining);
    if (amount <= 0 || amount > inv.remaining || amount > pay.remaining) {
      toast.error('مبلغ تطبیق نامعتبر است');
      return;
    }
    setDocs(prev => prev.map(d => {
      if (d.id === selectedInvoiceId) {
        const newPaid = d.paidAmount + amount;
        const newRem  = d.amount - newPaid;
        return { ...d, paidAmount: newPaid, remaining: newRem, status: newRem <= 0 ? 'closed' : 'partial', matchedPaymentIds: [...d.matchedPaymentIds, selectedPaymentId] };
      }
      if (d.id === selectedPaymentId) {
        const newRem = d.remaining - amount;
        return { ...d, paidAmount: d.paidAmount + amount, remaining: newRem, status: newRem <= 0 ? 'closed' : 'partial', matchedPaymentIds: [...d.matchedPaymentIds, selectedInvoiceId] };
      }
      return d;
    }));
    toast.success(`مبلغ ${fa(amount)} ریال تطبیق داده شد`);
    setSelectedInvoiceId(null); setSelectedPaymentId(null); setMatchAmount('');
  };

  const handleUnmatch = (docId: string, linkedId: string) => {
    setDocs(prev => prev.map(d => {
      if (d.id !== docId && d.id !== linkedId) return d;
      const newMatched = d.matchedPaymentIds.filter(x => x !== linkedId && x !== docId);
      return { ...d, matchedPaymentIds: newMatched, status: newMatched.length === 0 ? 'open' : 'partial', remaining: d.amount, paidAmount: 0 };
    }));
    toast.success('تطبیق لغو شد');
  };

  const inputCls = 'w-full border border-border rounded-lg py-2 px-3 text-xs bg-secondary focus:outline-none focus:border-accent';
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1';

  const statusBadge = (s: string) => (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
      s === 'open'    ? 'bg-amber-50 text-amber-700 border-amber-200' :
      s === 'partial' ? 'bg-blue-50  text-blue-700  border-blue-200' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200'
    }`}>
      {s === 'open' ? 'باز' : s === 'partial' ? 'جزئی' : 'بسته'}
    </span>
  );

  return (
    <div dir="rtl" className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {([['ar','بدهکاران (AR)'],['ap','بستانکاران (AP)']] as const).map(([t,l]) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === t ? 'bg-accent text-white' : 'border border-border text-muted-foreground hover:bg-secondary'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportDocs(invoices, activeTab === 'ar' ? 'بدهکاران' : 'بستانکاران')}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-xs hover:bg-secondary">
            <Download size={13} />خروجی CSV
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-xs hover:bg-secondary">
            <Printer size={13} />چاپ
          </button>
          <button onClick={() => setShowAddForm(f => !f)}
            className="flex items-center gap-1.5 px-3 py-2 bg-accent text-white rounded-lg text-xs font-semibold hover:bg-accent/90">
            <Plus size={13} />{activeTab === 'ar' ? 'فاکتور فروش' : 'فاکتور خرید'} جدید
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'باز', value: fa(totalOpen), color: 'text-amber-600' },
          { label: 'جزئی', value: fa(totalPartial), color: 'text-blue-600' },
          { label: 'تسویه‌شده', value: fa(totalClosed), color: 'text-emerald-600' },
        ].map(k => (
          <div key={k.label} className="bg-card rounded-xl border border-border p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
            <p className={`text-base font-bold ${k.color}`} dir="ltr">{k.value} ریال</p>
          </div>
        ))}
      </div>

      {/* Add invoice form */}
      {showAddForm && (
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-foreground">{activeTab === 'ar' ? 'ثبت فاکتور فروش جدید' : 'ثبت فاکتور خرید جدید'}</p>
            <button onClick={() => setShowAddForm(false)}><X size={16} className="text-muted-foreground" /></button>
          </div>
          <form onSubmit={handleSubmit(handleAddDoc)} className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>شماره فاکتور <span className="text-red-500">*</span></label>
                <input {...register('number')} placeholder={activeTab === 'ar' ? 'INV-1403-010' : 'PINV-1403-010'} className={inputCls} />
                {errors.number && <p className="text-[10px] text-red-500 mt-0.5">{errors.number.message}</p>}
              </div>
              <div>
                <label className={labelCls}>{activeTab === 'ar' ? 'نام مشتری' : 'نام تأمین‌کننده'} <span className="text-red-500">*</span></label>
                <input {...register('partyName')} placeholder="نام طرف حساب" className={inputCls} />
                {errors.partyName && <p className="text-[10px] text-red-500 mt-0.5">{errors.partyName.message}</p>}
              </div>
              <div>
                <label className={labelCls}>مبلغ (ریال) <span className="text-red-500">*</span></label>
                <input type="number" min={1} {...register('amount')} className={`${inputCls} text-left`} dir="ltr" />
                {errors.amount && <p className="text-[10px] text-red-500 mt-0.5">{errors.amount.message}</p>}
              </div>
              <JalaliDatePicker label="تاریخ فاکتور *" value={watch('date')} onChange={v => setValue('date', v, {shouldValidate:true})} error={errors.date?.message} />
              <JalaliDatePicker label="سررسید *" value={watch('dueDate')} onChange={v => setValue('dueDate', v, {shouldValidate:true})} error={errors.dueDate?.message} minDate={watch('date')} />
              <div>
                <label className={labelCls}>توضیحات</label>
                <input {...register('description')} placeholder="اختیاری" className={inputCls} />
              </div>
            </div>
            <input type="hidden" {...register('partyType')} value={activeTab === 'ar' ? 'customer' : 'vendor'} />
            <div className="flex gap-2">
              <button type="submit" disabled={!isValid} className="px-5 py-2 bg-accent text-white rounded-lg text-xs font-semibold disabled:opacity-40">ثبت</button>
              <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 border border-border rounded-lg text-xs text-muted-foreground">انصراف</button>
            </div>
          </form>
        </div>
      )}

      {/* Two-panel matching */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Invoices */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-3 border-b border-border bg-amber-50">
            <h3 className="text-sm font-bold text-amber-800">فاکتورهای باز ({openInvoices.length})</h3>
            <p className="text-[10px] text-amber-600 mt-0.5">برای تطبیق، یک فاکتور را انتخاب کنید</p>
          </div>
          <div className="divide-y divide-border max-h-72 overflow-y-auto">
            {openInvoices.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">فاکتور باز وجود ندارد</p>
            ) : openInvoices.map(inv => (
              <div key={inv.id} onClick={() => setSelectedInvoiceId(id => id === inv.id ? null : inv.id)}
                className={`p-3 cursor-pointer transition-colors hover:bg-secondary/30 ${selectedInvoiceId === inv.id ? 'bg-amber-50 border-r-2 border-amber-500' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-foreground" dir="ltr">{inv.number}</span>
                  {statusBadge(inv.status)}
                </div>
                <p className="text-[11px] text-muted-foreground">{inv.party.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">سررسید: {inv.dueDate}</span>
                  <span className="text-xs font-mono font-bold text-amber-700" dir="ltr">{fa(inv.remaining)} ریال</span>
                </div>
                {inv.remaining < inv.amount && (
                  <div className="mt-1 h-1 bg-secondary rounded-full overflow-hidden">
                    <div className="h-1 bg-amber-400 rounded-full" style={{ width: `${(inv.paidAmount/inv.amount)*100}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Payments */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-3 border-b border-border bg-blue-50">
            <h3 className="text-sm font-bold text-blue-800">پرداخت‌های تخصیص‌نیافته ({unallocatedPayments.length})</h3>
            <p className="text-[10px] text-blue-600 mt-0.5">سپس یک پرداخت را انتخاب کنید</p>
          </div>
          <div className="divide-y divide-border max-h-72 overflow-y-auto">
            {unallocatedPayments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">پرداخت تخصیص‌نیافته‌ای وجود ندارد</p>
            ) : unallocatedPayments.map(pay => (
              <div key={pay.id} onClick={() => setSelectedPaymentId(id => id === pay.id ? null : pay.id)}
                className={`p-3 cursor-pointer transition-colors hover:bg-secondary/30 ${selectedPaymentId === pay.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-foreground" dir="ltr">{pay.number}</span>
                  <CheckCircle size={13} className="text-blue-500" />
                </div>
                <p className="text-[11px] text-muted-foreground">{pay.party.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">تاریخ: {pay.date}</span>
                  <span className="text-xs font-mono font-bold text-blue-700" dir="ltr">{fa(pay.remaining)} ریال</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Match panel */}
      {selectedInvoiceId && selectedPaymentId && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-4">
          <Link size={20} className="text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-800">تطبیق انتخاب‌شده</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              {docs.find(d => d.id === selectedInvoiceId)?.number} ← {docs.find(d => d.id === selectedPaymentId)?.number}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div>
              <label className="text-[10px] text-emerald-700 block mb-0.5">مبلغ تطبیق (ریال)</label>
              <input type="number" value={matchAmount} onChange={e => setMatchAmount(e.target.value)}
                placeholder={String(Math.min(docs.find(d=>d.id===selectedInvoiceId)?.remaining??0, docs.find(d=>d.id===selectedPaymentId)?.remaining??0))}
                className="border border-emerald-300 rounded-lg px-3 py-1.5 text-xs w-36" dir="ltr" />
            </div>
            <button onClick={handleMatch} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500">
              تطبیق
            </button>
            <button onClick={() => { setSelectedInvoiceId(null); setSelectedPaymentId(null); setMatchAmount(''); }}
              className="p-2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* All invoices table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">همه {activeTab === 'ar' ? 'فاکتورهای فروش' : 'فاکتورهای خرید'}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-secondary/30">
              <tr className="border-b border-border">
                {['شماره','طرف حساب','تاریخ','سررسید','مبلغ کل','پرداخت‌شده','مانده','وضعیت','عملیات'].map(h => (
                  <th key={h} className="text-right py-2.5 px-3 font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/20">
                  <td className="py-2.5 px-3 font-mono text-primary" dir="ltr">{inv.number}</td>
                  <td className="py-2.5 px-3 font-medium">{inv.party.name}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{inv.date}</td>
                  <td className={`py-2.5 px-3 ${inv.status !== 'closed' && inv.dueDate < jalaliToday() ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                    {inv.dueDate}
                    {inv.status !== 'closed' && inv.dueDate < jalaliToday() && <AlertCircle size={10} className="inline mr-1" />}
                  </td>
                  <td className="py-2.5 px-3 font-mono" dir="ltr">{fa(inv.amount)}</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-600" dir="ltr">{fa(inv.paidAmount)}</td>
                  <td className="py-2.5 px-3 font-mono font-bold" dir="ltr">{fa(inv.remaining)}</td>
                  <td className="py-2.5 px-3">{statusBadge(inv.status)}</td>
                  <td className="py-2.5 px-3">
                    {inv.matchedPaymentIds.length > 0 && (
                      <button onClick={() => handleUnmatch(inv.id, inv.matchedPaymentIds[0])}
                        className="flex items-center gap-1 text-[10px] text-red-600 hover:text-red-700">
                        <Unlink size={10} />لغو تطبیق
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Aging Report */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-3 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">گزارش سنی {activeTab === 'ar' ? 'بدهکاران' : 'بستانکاران'}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-secondary/30">
              <tr className="border-b border-border">
                {['طرف حساب','جاری (۰)','۱-۳۰ روز','۳۱-۶۰ روز','۶۱-۹۰ روز','۹۰+ روز','مجموع'].map(h => (
                  <th key={h} className="text-right py-2.5 px-3 font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agingReport.map(row => (
                <tr key={row.customerId} className="border-b border-border/40 last:border-0 hover:bg-secondary/20">
                  <td className="py-2.5 px-3 font-medium">{row.customerName}</td>
                  <td className="py-2.5 px-3 font-mono text-muted-foreground" dir="ltr">{fa(row.current)}</td>
                  <td className="py-2.5 px-3 font-mono text-amber-600"  dir="ltr">{fa(row.d1to30)}</td>
                  <td className="py-2.5 px-3 font-mono text-orange-600" dir="ltr">{fa(row.d31to60)}</td>
                  <td className="py-2.5 px-3 font-mono text-red-600"    dir="ltr">{fa(row.d61to90)}</td>
                  <td className="py-2.5 px-3 font-mono text-red-700 font-bold" dir="ltr">{fa(row.d90plus)}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-foreground" dir="ltr">{fa(row.total)}</td>
                </tr>
              ))}
              <tr className="bg-secondary/30 font-bold border-t border-border">
                <td className="py-2.5 px-3 text-foreground">مجموع</td>
                {(['current','d1to30','d31to60','d61to90','d90plus','total'] as const).map(k => (
                  <td key={k} className="py-2.5 px-3 font-mono" dir="ltr">{fa(agingTotals[k])}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ARAPLedger;
