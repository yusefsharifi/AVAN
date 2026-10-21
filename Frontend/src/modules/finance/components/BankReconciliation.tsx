// src/modules/finance/components/BankReconciliation.tsx — Phase 8
import { useMemo, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { JalaliDatePicker } from './JalaliDatePicker';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { isValidJalaliDateString, jalaliToday, toPersianDigits } from '../utils/persianUtils';
import { CheckCircle, AlertCircle, Plus, Link, Unlink, Download, Printer, X, RefreshCw } from 'lucide-react';

const fa = (n: number) => Math.round(n || 0).toLocaleString('fa-IR');

// ── Types ────────────────────────────────────────────────────────────────────
type MatchStatus = 'unmatched' | 'matched' | 'reconciled';

interface BankStatementLine {
  id: string;
  date: string;
  description: string;
  referenceNumber: string;
  debit: number;
  credit: number;
  balance: number;
  matchStatus: MatchStatus;
  matchedGLId?: string;
  source: 'manual' | 'import';
}

interface GLLine {
  id: string;
  date: string;
  voucherNumber: string;
  description: string;
  debit: number;
  credit: number;
  matchStatus: MatchStatus;
  matchedBankId?: string;
}

// ── Seed bank statement lines ─────────────────────────────────────────────────
const SEED_BANK_LINES: BankStatementLine[] = [
  { id: 'BSL-001', date: '1403/04/01', description: 'واریز از شرکت پلاستیک ایران', referenceNumber: 'TRX-88100', debit: 0, credit: 52_800_000, balance: 2_552_800_000, matchStatus: 'unmatched', source: 'manual' },
  { id: 'BSL-002', date: '1403/04/05', description: 'پرداخت حقوق پرسنل اردیبهشت', referenceNumber: 'TRX-88120', debit: 1_800_000_000, credit: 0, balance: 752_800_000, matchStatus: 'unmatched', source: 'manual' },
  { id: 'BSL-003', date: '1403/04/08', description: 'کارمزد بانکی فروردین', referenceNumber: 'TRX-88130', debit: 1_500_000, credit: 0, balance: 751_300_000, matchStatus: 'unmatched', source: 'manual' },
  { id: 'BSL-004', date: '1403/04/10', description: 'واریز چک شماره ۱۰۰۰۰۳ از لوله‌سازی البرز', referenceNumber: 'TRX-88140', debit: 0, credit: 300_000_000, balance: 1_051_300_000, matchStatus: 'unmatched', source: 'manual' },
  { id: 'BSL-005', date: '1403/04/13', description: 'پرداخت اجاره ساختمان', referenceNumber: 'TRX-88155', debit: 40_000_000, credit: 0, balance: 1_011_300_000, matchStatus: 'unmatched', source: 'manual' },
];

// ── Bank statement entry schema ───────────────────────────────────────────────
const bankLineSchema = z.object({
  date:            z.string().refine(isValidJalaliDateString, 'تاریخ نامعتبر است'),
  description:     z.string().min(3, 'شرح الزامی است'),
  referenceNumber: z.string().min(1, 'شماره مرجع الزامی است'),
  type:            z.enum(['debit', 'credit']),
  amount:          z.coerce.number().positive('مبلغ باید بزرگ‌تر از صفر باشد'),
});
type BankLineForm = z.infer<typeof bankLineSchema>;

// ── CSV export ────────────────────────────────────────────────────────────────
function exportReconciliation(bank: BankStatementLine[], gl: GLLine[], bankName: string) {
  const lines = [
    ['نوع', 'تاریخ', 'شرح', 'مرجع', 'بدهکار', 'بستانکار', 'وضعیت'],
    ...bank.map(b => ['صورت‌بانک', b.date, b.description, b.referenceNumber, b.debit, b.credit,
      b.matchStatus === 'matched' ? 'تطبیق‌شده' : b.matchStatus === 'reconciled' ? 'تسویه‌شده' : 'تطبیق‌نشده']),
    ...gl.map(g => ['دفاتر', g.date, g.description, g.voucherNumber, g.debit, g.credit,
      g.matchStatus === 'matched' ? 'تطبیق‌شده' : g.matchStatus === 'reconciled' ? 'تسویه‌شده' : 'تطبیق‌نشده']),
  ];
  const csv = '\ufeff' + lines.map(r => r.map(x => `"${x}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `تطبیق-${bankName}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Main Component ────────────────────────────────────────────────────────────
export function BankReconciliation() {
  const { vouchers, bankAccountRecords, accounts, fiscalYears, activeFiscalYear } = useFinanceStore();

  const [selectedBankId, setSelectedBankId] = useState<string>(bankAccountRecords[0]?.id ?? '');
  const [fromDate, setFromDate] = useState('1403/04/01');
  const [toDate, setToDate]     = useState(jalaliToday());
  const [bankLines, setBankLines]     = useState<BankStatementLine[]>(SEED_BANK_LINES);
  const [selectedBankLineId, setSelectedBankLineId] = useState<string|null>(null);
  const [selectedGLId, setSelectedGLId]             = useState<string|null>(null);
  const [showAddForm, setShowAddForm]               = useState(false);
  const [reconciledIds, setReconciledIds]           = useState<Set<string>>(new Set());

  const bank = bankAccountRecords.find(b => b.id === selectedBankId);

  // ── Build GL lines from posted vouchers that touch this bank account ─────
  const fiscalYearId = fiscalYears.find(f => f.year === activeFiscalYear)?.id ?? fiscalYears[0]?.id ?? '';
  const glLines = useMemo((): GLLine[] => {
    if (!bank) return [];
    const bankGLAccId = bank.glAccountId;
    return vouchers
      .filter(v => v.status === 'posted' && v.fiscalYearId === fiscalYearId &&
        v.date >= fromDate && v.date <= toDate &&
        v.entries.some(e => e.accountId === bankGLAccId))
      .flatMap(v =>
        v.entries
          .filter(e => e.accountId === bankGLAccId)
          .map(e => ({
            id: `${v.id}-${e.id}`,
            date: v.date,
            voucherNumber: v.voucherNumber,
            description: [v.description, e.description].filter(Boolean).join(' — '),
            debit: e.debit,
            credit: e.credit,
            matchStatus: 'unmatched' as MatchStatus,
            matchedBankId: undefined,
          }))
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [vouchers, bank, fiscalYearId, fromDate, toDate]);

  // Track GL match state locally
  const [glMatchMap, setGLMatchMap] = useState<Record<string, { status: MatchStatus; matchedBankId?: string }>>({});
  const effectiveGLLines = glLines.map(g => ({
    ...g,
    matchStatus: glMatchMap[g.id]?.status ?? 'unmatched',
    matchedBankId: glMatchMap[g.id]?.matchedBankId,
  }));

  // ── Match / Unmatch ───────────────────────────────────────────────────────
  const handleMatch = () => {
    if (!selectedBankLineId || !selectedGLId) return;
    const bankLine = bankLines.find(b => b.id === selectedBankLineId);
    const glLine   = effectiveGLLines.find(g => g.id === selectedGLId);
    if (!bankLine || !glLine) return;

    // Validate amounts match (debit on one = credit on other)
    const bankNet = bankLine.credit - bankLine.debit;
    const glNet   = glLine.credit  - glLine.debit;
    if (Math.abs(bankNet - glNet) > 100) { // 100 rial tolerance
      toast.error(`مغایرت مبلغ: صورت‌حساب ${fa(Math.abs(bankNet))} — دفاتر ${fa(Math.abs(glNet))}`);
    }

    setBankLines(prev => prev.map(b => b.id === selectedBankLineId
      ? { ...b, matchStatus: 'matched', matchedGLId: selectedGLId } : b));
    setGLMatchMap(prev => ({ ...prev, [selectedGLId]: { status: 'matched', matchedBankId: selectedBankLineId } }));
    toast.success('تطبیق انجام شد');
    setSelectedBankLineId(null);
    setSelectedGLId(null);
  };

  const handleUnmatch = (bankId: string, glId: string) => {
    setBankLines(prev => prev.map(b => b.id === bankId ? { ...b, matchStatus: 'unmatched', matchedGLId: undefined } : b));
    setGLMatchMap(prev => { const n = { ...prev }; delete n[glId]; return n; });
    toast.success('تطبیق لغو شد');
  };

  const handleReconcileAll = () => {
    const matchedBankIds = new Set(bankLines.filter(b => b.matchStatus === 'matched').map(b => b.id));
    const matchedGLIds   = new Set(Object.keys(glMatchMap).filter(k => glMatchMap[k].status === 'matched'));
    setBankLines(prev => prev.map(b => matchedBankIds.has(b.id) ? { ...b, matchStatus: 'reconciled' } : b));
    setGLMatchMap(prev => {
      const n = { ...prev };
      matchedGLIds.forEach(k => { if (n[k]) n[k] = { ...n[k], status: 'reconciled' }; });
      return n;
    });
    setReconciledIds(prev => new Set([...prev, ...matchedBankIds, ...matchedGLIds]));
    toast.success('همه موارد تطبیق‌شده تسویه شدند');
  };

  // ── Add bank statement line ───────────────────────────────────────────────
  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isValid } } = useForm<BankLineForm>({
    resolver: zodResolver(bankLineSchema),
    mode: 'onChange',
    defaultValues: { date: jalaliToday(), description: '', referenceNumber: '', type: 'credit', amount: 0 },
  });

  const handleAddBankLine = (data: BankLineForm) => {
    const lastBalance = bankLines.at(-1)?.balance ?? (bank?.currentBalance ?? 0);
    const net = data.type === 'credit' ? data.amount : -data.amount;
    const newLine: BankStatementLine = {
      id: `BSL-${Date.now()}`,
      date: data.date, description: data.description, referenceNumber: data.referenceNumber,
      debit: data.type === 'debit' ? data.amount : 0,
      credit: data.type === 'credit' ? data.amount : 0,
      balance: lastBalance + net,
      matchStatus: 'unmatched', source: 'manual',
    };
    setBankLines(prev => [...prev, newLine].sort((a, b) => a.date.localeCompare(b.date)));
    toast.success('ردیف صورت‌حساب بانکی افزوده شد');
    reset(); setShowAddForm(false);
  };

  // ── Summary metrics ───────────────────────────────────────────────────────
  const unmatchedBank = bankLines.filter(b => b.matchStatus === 'unmatched');
  const unmatchedGL   = effectiveGLLines.filter(g => g.matchStatus === 'unmatched');
  const matchedCount  = bankLines.filter(b => b.matchStatus === 'matched' || b.matchStatus === 'reconciled').length;
  const bankBalance   = bankLines.at(-1)?.balance ?? (bank?.currentBalance ?? 0);
  const glBalance     = effectiveGLLines.reduce((s, g) => s + g.credit - g.debit, bank?.currentBalance ?? 0);
  const difference    = bankBalance - glBalance;
  const isFullyReconciled = unmatchedBank.length === 0 && unmatchedGL.length === 0 && bankLines.length > 0;

  const statusBadge = (s: MatchStatus) => (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
      s === 'reconciled' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
      s === 'matched'    ? 'bg-blue-50    text-blue-700    border-blue-200'    :
                           'bg-amber-50   text-amber-700   border-amber-200'
    }`}>
      {s === 'reconciled' ? 'تسویه‌شده' : s === 'matched' ? 'تطبیق‌شده' : 'تطبیق‌نشده'}
    </span>
  );

  const inputCls = 'w-full border border-border rounded-lg py-2 px-3 text-xs bg-secondary focus:outline-none focus:border-accent';
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1';

  return (
    <div dir="rtl" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">تطبیق حساب بانکی</h1>
          <p className="text-xs text-muted-foreground mt-0.5">مقایسه دفاتر GL با صورت‌حساب بانکی</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportReconciliation(bankLines, effectiveGLLines, bank?.name ?? '')}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-xs hover:bg-secondary">
            <Download size={13} />خروجی CSV
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-xs hover:bg-secondary">
            <Printer size={13} />چاپ
          </button>
          <button onClick={handleReconcileAll} disabled={matchedCount === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-500 disabled:opacity-40">
            <CheckCircle size={13} />تسویه موارد تطبیق‌شده
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-card rounded-xl border border-border p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className={labelCls}>حساب بانکی</label>
          <select value={selectedBankId} onChange={e => setSelectedBankId(e.target.value)} className={inputCls}>
            {bankAccountRecords.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <JalaliDatePicker label="از تاریخ" value={fromDate} onChange={setFromDate} />
        <JalaliDatePicker label="تا تاریخ" value={toDate} onChange={setToDate} minDate={fromDate} />
        <div className="flex items-end">
          <button onClick={() => setShowAddForm(f => !f)}
            className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-accent text-accent rounded-lg text-xs font-medium hover:bg-accent/5">
            <Plus size={13} />افزودن ردیف بانکی
          </button>
        </div>
      </div>

      {/* Add bank line form */}
      {showAddForm && (
        <div className="bg-card rounded-xl border border-blue-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-foreground">ردیف جدید صورت‌حساب بانکی</p>
            <button onClick={() => setShowAddForm(false)}><X size={16} className="text-muted-foreground" /></button>
          </div>
          <form onSubmit={handleSubmit(handleAddBankLine)} className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <JalaliDatePicker label="تاریخ *" value={watch('date')} onChange={v => setValue('date', v, { shouldValidate: true })} error={errors.date?.message} />
              <div>
                <label className={labelCls}>شماره مرجع *</label>
                <input {...register('referenceNumber')} placeholder="TRX-88200" className={inputCls} />
                {errors.referenceNumber && <p className="text-[10px] text-red-500 mt-0.5">{errors.referenceNumber.message}</p>}
              </div>
              <div>
                <label className={labelCls}>نوع تراکنش *</label>
                <select {...register('type')} className={inputCls}>
                  <option value="credit">واریز (Credit)</option>
                  <option value="debit">برداشت (Debit)</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>مبلغ (ریال) *</label>
                <input type="number" min={1} {...register('amount')} className={`${inputCls} text-left`} dir="ltr" />
                {errors.amount && <p className="text-[10px] text-red-500 mt-0.5">{errors.amount.message}</p>}
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>شرح *</label>
                <input {...register('description')} placeholder="شرح تراکنش بانکی" className={inputCls} />
                {errors.description && <p className="text-[10px] text-red-500 mt-0.5">{errors.description.message}</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={!isValid} className="px-5 py-2 bg-accent text-white rounded-lg text-xs font-semibold disabled:opacity-40">افزودن</button>
              <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 border border-border rounded-lg text-xs text-muted-foreground">انصراف</button>
            </div>
          </form>
        </div>
      )}

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'موجودی بانک', value: fa(bankBalance), color: 'text-foreground' },
          { label: 'موجودی دفاتر GL', value: fa(glBalance), color: 'text-foreground' },
          { label: 'مغایرت', value: fa(Math.abs(difference)), color: Math.abs(difference) < 1000 ? 'text-emerald-600' : 'text-red-600' },
          { label: 'وضعیت', value: isFullyReconciled ? 'تسویه‌شده ✓' : `${toPersianDigits(unmatchedBank.length)} ردیف باقی`, color: isFullyReconciled ? 'text-emerald-600' : 'text-amber-600' },
        ].map(k => (
          <div key={k.label} className="bg-card rounded-xl border border-border p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
            <p className={`text-sm font-bold ${k.color}`} dir="ltr">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Match selection hint */}
      {(selectedBankLineId || selectedGLId) && (
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${
          selectedBankLineId && selectedGLId ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'
        }`}>
          <Link size={16} className={selectedBankLineId && selectedGLId ? 'text-emerald-600' : 'text-blue-500'} />
          <div className="flex-1 text-xs">
            {selectedBankLineId && selectedGLId
              ? <span className="text-emerald-700 font-semibold">آماده برای تطبیق — دکمه «تطبیق» را بزنید</span>
              : <span className="text-blue-700">
                  {selectedBankLineId ? 'یک ردیف GL انتخاب کنید' : 'یک ردیف صورت‌حساب بانکی انتخاب کنید'}
                </span>
            }
          </div>
          {selectedBankLineId && selectedGLId && (
            <button onClick={handleMatch}
              className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500">
              تطبیق
            </button>
          )}
          <button onClick={() => { setSelectedBankLineId(null); setSelectedGLId(null); }}>
            <X size={14} className="text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      )}

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Bank Statement Panel */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-3 border-b border-border bg-blue-50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-blue-800">صورت‌حساب بانکی</h3>
              <p className="text-[10px] text-blue-600 mt-0.5">{bank?.name} — {bank?.accountNumber}</p>
            </div>
            <span className="text-xs text-blue-700 font-semibold">
              {toPersianDigits(bankLines.filter(b => b.matchStatus === 'unmatched').length)} تطبیق‌نشده
            </span>
          </div>
          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {bankLines.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">ردیفی وارد نشده</p>
            ) : bankLines.map(line => (
              <div key={line.id}
                onClick={() => line.matchStatus === 'unmatched' && setSelectedBankLineId(id => id === line.id ? null : line.id)}
                className={`p-3 transition-colors ${
                  line.matchStatus !== 'unmatched' ? 'opacity-60' :
                  selectedBankLineId === line.id ? 'bg-blue-50 border-r-2 border-blue-500 cursor-pointer' : 'hover:bg-secondary/30 cursor-pointer'
                }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground">{line.date}</span>
                      <span className="text-[10px] font-mono text-muted-foreground" dir="ltr">{line.referenceNumber}</span>
                      {statusBadge(line.matchStatus)}
                    </div>
                    <p className="text-xs font-medium text-foreground truncate">{line.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {line.credit > 0 && <p className="text-xs font-mono text-emerald-600 font-semibold" dir="ltr">+{fa(line.credit)}</p>}
                    {line.debit  > 0 && <p className="text-xs font-mono text-red-600    font-semibold" dir="ltr">-{fa(line.debit)}</p>}
                    <p className="text-[10px] font-mono text-muted-foreground" dir="ltr">موجودی: {fa(line.balance)}</p>
                  </div>
                </div>
                {line.matchStatus !== 'unmatched' && line.matchedGLId && (
                  <div className="flex items-center gap-1 mt-1">
                    <Link size={10} className="text-blue-400" />
                    <span className="text-[10px] text-blue-600">تطبیق با GL</span>
                    <button onClick={e => { e.stopPropagation(); handleUnmatch(line.id, line.matchedGLId!); }}
                      className="mr-auto text-[10px] text-red-500 hover:text-red-700 flex items-center gap-0.5">
                      <Unlink size={9} />لغو
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* GL Panel */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-3 border-b border-border bg-amber-50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-amber-800">ردیف‌های دفاتر (GL)</h3>
              <p className="text-[10px] text-amber-600 mt-0.5">تراکنش‌های ثبت‌نهایی‌شده</p>
            </div>
            <span className="text-xs text-amber-700 font-semibold">
              {toPersianDigits(effectiveGLLines.filter(g => g.matchStatus === 'unmatched').length)} تطبیق‌نشده
            </span>
          </div>
          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {effectiveGLLines.length === 0 ? (
              <div className="py-10 text-center">
                <RefreshCw size={24} className="mx-auto mb-2 text-muted-foreground opacity-40" />
                <p className="text-xs text-muted-foreground">سندی برای این حساب بانکی در دوره انتخابی یافت نشد</p>
                <p className="text-[10px] text-muted-foreground mt-1">اطمینان حاصل کنید که glAccountId حساب بانکی درست تنظیم شده</p>
              </div>
            ) : effectiveGLLines.map(line => (
              <div key={line.id}
                onClick={() => line.matchStatus === 'unmatched' && setSelectedGLId(id => id === line.id ? null : line.id)}
                className={`p-3 transition-colors ${
                  line.matchStatus !== 'unmatched' ? 'opacity-60' :
                  selectedGLId === line.id ? 'bg-amber-50 border-r-2 border-amber-500 cursor-pointer' : 'hover:bg-secondary/30 cursor-pointer'
                }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground">{line.date}</span>
                      <span className="text-[10px] font-mono text-primary" dir="ltr">{line.voucherNumber}</span>
                      {statusBadge(line.matchStatus)}
                    </div>
                    <p className="text-xs font-medium text-foreground truncate">{line.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {line.credit > 0 && <p className="text-xs font-mono text-emerald-600 font-semibold" dir="ltr">+{fa(line.credit)}</p>}
                    {line.debit  > 0 && <p className="text-xs font-mono text-red-600    font-semibold" dir="ltr">-{fa(line.debit)}</p>}
                  </div>
                </div>
                {line.matchStatus !== 'unmatched' && line.matchedBankId && (
                  <div className="flex items-center gap-1 mt-1">
                    <Link size={10} className="text-amber-400" />
                    <span className="text-[10px] text-amber-600">تطبیق با صورت‌بانک</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Unmatched summary */}
      {(unmatchedBank.length > 0 || unmatchedGL.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={16} className="text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">موارد تطبیق‌نشده</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {unmatchedBank.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-2">
                  صورت‌حساب بانکی ({toPersianDigits(unmatchedBank.length)} ردیف):
                </p>
                <div className="space-y-1">
                  {unmatchedBank.map(b => (
                    <div key={b.id} className="flex justify-between text-xs">
                      <span className="text-amber-700 truncate">{b.description}</span>
                      <span className="font-mono text-amber-800 shrink-0 mr-2" dir="ltr">
                        {b.credit > 0 ? `+${fa(b.credit)}` : `-${fa(b.debit)}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {unmatchedGL.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-2">
                  دفاتر GL ({toPersianDigits(unmatchedGL.length)} ردیف):
                </p>
                <div className="space-y-1">
                  {unmatchedGL.map(g => (
                    <div key={g.id} className="flex justify-between text-xs">
                      <span className="text-amber-700 truncate">{g.description}</span>
                      <span className="font-mono text-amber-800 shrink-0 mr-2 font-mono" dir="ltr">
                        {g.credit > 0 ? `+${fa(g.credit)}` : `-${fa(g.debit)}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fully reconciled banner */}
      {isFullyReconciled && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-800">حساب کاملاً تسویه شد</p>
            <p className="text-xs text-emerald-600 mt-0.5">همه ردیف‌های صورت‌حساب بانکی با دفاتر تطبیق داده شده‌اند.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default BankReconciliation;
