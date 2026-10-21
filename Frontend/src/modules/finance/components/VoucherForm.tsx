import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle, ChevronDown, Search, X } from 'lucide-react';
import { useJournalEntry } from '../hooks';
import { useFinanceStore } from '../store';
import type { JournalEntry, Account } from '../types';
import { toast } from 'sonner';

const genId = () => `JE-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// ── AccountPicker: dropdown that searches accounts by code/name ──────────────
function AccountPicker({
  value,
  accounts,
  onChange,
}: {
  value: string;
  accounts: Account[];
  onChange: (account: Account) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = accounts.find(a => a.id === value);
  const filtered = accounts
    .filter(a =>
      !query ||
      a.code.includes(query) ||
      a.nameFa.includes(query)
    )
    .slice(0, 20);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setQuery(''); }}
        className="w-full flex items-center gap-1 bg-secondary border border-border rounded py-1.5 px-2 text-xs text-foreground focus:outline-none focus:border-accent text-right"
      >
        {selected ? (
          <span className="flex-1 truncate">{selected.code} — {selected.nameFa}</span>
        ) : (
          <span className="flex-1 text-muted-foreground">انتخاب حساب...</span>
        )}
        <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 top-full right-0 mt-1 w-72 bg-white border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border flex items-center gap-2">
            <Search className="w-3 h-3 text-muted-foreground" />
            <input
              autoFocus
              dir="rtl"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="جستجو با کد یا نام..."
              className="flex-1 text-xs outline-none bg-transparent"
            />
            {query && <button onClick={() => setQuery('')}><X className="w-3 h-3 text-muted-foreground" /></button>}
          </div>
          <div className="max-h-52 overflow-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3 text-center">حسابی یافت نشد</p>
            ) : filtered.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => { onChange(a); setOpen(false); setQuery(''); }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary/50 text-right"
              >
                <span className="text-[10px] font-mono text-muted-foreground w-14 shrink-0" dir="ltr">{a.code}</span>
                <span className="text-xs text-foreground flex-1 truncate">{a.nameFa}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Persian date validation ──────────────────────────────────────────────────
function isPersianDateValid(d: string): boolean {
  return /^\d{4}\/\d{2}\/\d{2}$/.test(d.replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))));
}

// ── Main VoucherForm ─────────────────────────────────────────────────────────
interface VoucherFormProps {
  onSuccess?: () => void;
}

export function VoucherForm({ onSuccess }: VoucherFormProps) {
  const { create, validateBalance } = useJournalEntry();
  const { accounts, vouchers } = useFinanceStore();

  const nextNumber = `JV-1403-${String(vouchers.length + 1).padStart(6, '0')}`;

  const [voucherNumber, setVoucherNumber] = useState(nextNumber);
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [entries, setEntries] = useState<JournalEntry[]>([
    { id: genId(), voucherId: '', accountId: '', accountCode: '', description: '', debit: 0, credit: 0, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: 0, creditBaseCurrency: 0, sourceModule: 'manual' },
    { id: genId(), voucherId: '', accountId: '', accountCode: '', description: '', debit: 0, credit: 0, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: 0, creditBaseCurrency: 0, sourceModule: 'manual' },
  ]);
  const [submitted, setSubmitted] = useState(false);

  const validation = validateBalance(entries);

  const inputCls = 'w-full bg-secondary border border-border rounded py-1.5 px-2 text-xs text-foreground focus:outline-none focus:border-accent';

  const addRow = () => setEntries(prev => [
    ...prev,
    { id: genId(), voucherId: '', accountId: '', accountCode: '', description: '', debit: 0, credit: 0, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: 0, creditBaseCurrency: 0, sourceModule: 'manual' },
  ]);

  const removeRow = (id: string) => {
    if (entries.length <= 2) { toast.error('حداقل دو ردیف الزامی است'); return; }
    setEntries(entries.filter(e => e.id !== id));
  };

  const updateEntry = (id: string, field: string, value: any) =>
    setEntries(entries.map(e => e.id === id ? { ...e, [field]: value } : e));

  const handleAccountSelect = (entryId: string, account: Account) => {
    updateEntry(entryId, 'accountId', account.id);
    updateEntry(entryId, 'accountCode', account.code);
  };

  // ── Validation errors ──────────────────────────────────────────────────────
  const errors: string[] = [];
  if (submitted) {
    if (!voucherNumber.trim()) errors.push('شماره سند الزامی است');
    if (!date.trim()) errors.push('تاریخ سند الزامی است');
    else if (!isPersianDateValid(date)) errors.push('فرمت تاریخ باید ۱۴۰۳/۰۴/۰۱ باشد');
    if (!description.trim()) errors.push('شرح سند الزامی است');
    entries.forEach((e, i) => {
      if (!e.accountId) errors.push(`ردیف ${i + 1}: حساب انتخاب نشده`);
      if (e.debit === 0 && e.credit === 0) errors.push(`ردیف ${i + 1}: مبلغ بدهکار یا بستانکار الزامی است`);
      if (e.debit > 0 && e.credit > 0) errors.push(`ردیف ${i + 1}: یک ردیف نمی‌تواند هم بدهکار هم بستانکار داشته باشد`);
    });
    if (!validation.isBalanced) errors.push(`سند تراز نیست — مغایرت: ${validation.difference.toLocaleString('fa-IR')} ریال`);
  }

  const handleSubmit = () => {
    setSubmitted(true);
    const localErrors: string[] = [];
    if (!voucherNumber.trim()) localErrors.push('شماره سند');
    if (!date.trim() || !isPersianDateValid(date)) localErrors.push('تاریخ');
    if (!description.trim()) localErrors.push('شرح سند');
    entries.forEach((e, i) => {
      if (!e.accountId) localErrors.push(`حساب ردیف ${i + 1}`);
    });
    if (!validation.isBalanced) localErrors.push('تراز سند');

    if (localErrors.length > 0) {
      toast.error(`موارد زیر را تکمیل کنید: ${localErrors.join('، ')}`);
      return;
    }

    try {
      const voucher = create(entries, description);
      toast.success(`سند ${voucher.voucherNumber} با موفقیت ثبت شد`);
      // Reset form
      setSubmitted(false);
      setDescription('');
      setDate('');
      setEntries([
        { id: genId(), voucherId: '', accountId: '', accountCode: '', description: '', debit: 0, credit: 0, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: 0, creditBaseCurrency: 0, sourceModule: 'manual' },
        { id: genId(), voucherId: '', accountId: '', accountCode: '', description: '', debit: 0, credit: 0, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: 0, creditBaseCurrency: 0, sourceModule: 'manual' },
      ]);
      setVoucherNumber(`JV-1403-${String(vouchers.length + 2).padStart(6, '0')}`);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'خطا در ثبت سند');
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header fields */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">شماره سند <span className="text-red-500">*</span></label>
          <input
            dir="ltr"
            value={voucherNumber}
            onChange={e => setVoucherNumber(e.target.value)}
            className={`${inputCls} ${submitted && !voucherNumber.trim() ? 'border-red-400' : ''}`}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">تاریخ سند <span className="text-red-500">*</span></label>
          <input
            dir="ltr"
            value={date}
            onChange={e => setDate(e.target.value)}
            placeholder="۱۴۰۳/۰۴/۰۱"
            className={`${inputCls} ${submitted && !date.trim() ? 'border-red-400' : ''}`}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">نوع سند</label>
          <select className={inputCls}>
            <option>سند عمومی</option>
            <option>سند تعدیلی</option>
            <option>سند اختتامیه</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">شرح سند <span className="text-red-500">*</span></label>
        <input
          dir="rtl"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className={`w-full bg-secondary border border-border rounded-lg py-2 px-3 text-sm text-foreground focus:outline-none focus:border-accent ${submitted && !description.trim() ? 'border-red-400' : ''}`}
          placeholder="شرح سند حسابداری..."
        />
      </div>

      {/* Entries table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="text-right py-2 px-2 text-[10px] font-semibold text-foreground w-8">ردیف</th>
              <th className="text-right py-2 px-2 text-[10px] font-semibold text-foreground w-52">حساب <span className="text-red-500">*</span></th>
              <th className="text-right py-2 px-2 text-[10px] font-semibold text-foreground">شرح ردیف</th>
              <th className="text-right py-2 px-2 text-[10px] font-semibold text-foreground w-28">بدهکار</th>
              <th className="text-right py-2 px-2 text-[10px] font-semibold text-foreground w-28">بستانکار</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr key={entry.id} className="border-b border-border/50">
                <td className="py-1.5 px-2 text-xs text-muted-foreground text-center">{idx + 1}</td>
                <td className="py-1.5 px-2">
                  <div className={submitted && !entry.accountId ? 'ring-1 ring-red-400 rounded' : ''}>
                    <AccountPicker
                      value={entry.accountId}
                      accounts={accounts}
                      onChange={acc => handleAccountSelect(entry.id, acc)}
                    />
                  </div>
                </td>
                <td className="py-1.5 px-2">
                  <input
                    dir="rtl"
                    value={entry.description}
                    onChange={e => updateEntry(entry.id, 'description', e.target.value)}
                    className={inputCls}
                    placeholder="شرح ردیف"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    dir="ltr"
                    type="number"
                    min="0"
                    value={entry.debit || ''}
                    onChange={e => {
                      const v = Number(e.target.value);
                      updateEntry(entry.id, 'debit', v);
                      if (v > 0) updateEntry(entry.id, 'credit', 0);
                    }}
                    className={`${inputCls} text-left`}
                    placeholder="۰"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    dir="ltr"
                    type="number"
                    min="0"
                    value={entry.credit || ''}
                    onChange={e => {
                      const v = Number(e.target.value);
                      updateEntry(entry.id, 'credit', v);
                      if (v > 0) updateEntry(entry.id, 'debit', 0);
                    }}
                    className={`${inputCls} text-left`}
                    placeholder="۰"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <button
                    type="button"
                    onClick={() => removeRow(entry.id)}
                    className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-accent text-accent text-xs font-medium hover:bg-accent/5 transition-colors"
      >
        <Plus className="w-3 h-3" /><span>افزودن ردیف</span>
      </button>

      {/* Balance indicator */}
      <div className={`flex items-center justify-between p-3 rounded-lg ${validation.isBalanced ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">
            بدهکار: <span className="font-mono font-semibold text-foreground" dir="ltr">
              {validation.totalDebit.toLocaleString('fa-IR')}
            </span>
          </span>
          <span className="text-muted-foreground">
            بستانکار: <span className="font-mono font-semibold text-foreground" dir="ltr">
              {validation.totalCredit.toLocaleString('fa-IR')}
            </span>
          </span>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-medium ${validation.isBalanced ? 'text-emerald-600' : 'text-red-600'}`}>
          {validation.isBalanced
            ? <><CheckCircle className="w-4 h-4" /><span>تراز</span></>
            : <><AlertCircle className="w-4 h-4" /><span>مغایرت: {validation.difference.toLocaleString('fa-IR')}</span></>
          }
        </div>
      </div>

      {/* Validation errors */}
      {submitted && errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-red-700 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" /> {err}
            </p>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
        >
          ثبت سند
        </button>
        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setDescription('');
            setDate('');
            setEntries([
              { id: genId(), voucherId: '', accountId: '', accountCode: '', description: '', debit: 0, credit: 0, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: 0, creditBaseCurrency: 0, sourceModule: 'manual' },
              { id: genId(), voucherId: '', accountId: '', accountCode: '', description: '', debit: 0, credit: 0, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: 0, creditBaseCurrency: 0, sourceModule: 'manual' },
            ]);
          }}
          className="px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors"
        >
          پاک‌کردن
        </button>
      </div>
    </div>
  );
}

export default VoucherForm;
