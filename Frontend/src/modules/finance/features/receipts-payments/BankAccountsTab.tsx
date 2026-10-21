import { useState } from 'react';
import { toast } from 'sonner';
import { useFinanceStore } from '../../store';
import { Plus, X } from 'lucide-react';

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";
const fmt = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

export default function BankAccountsTab() {
  const { bankAccountRecords, accounts, createBankAccountRecord } = useFinanceStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', notes: '', bankName: '', branch: '', accountNumber: '', iban: '', glAccountId: '' });

  const selected = bankAccountRecords.find((b) => b.id === selectedId);

  const submit = () => {
    if (!form.name.trim() || !form.accountNumber.trim()) { toast.error('نام و شماره حساب الزامی است'); return; }
    createBankAccountRecord(form);
    toast.success('حساب بانکی جدید ثبت شد');
    setModalOpen(false);
    setForm({ code: '', name: '', notes: '', bankName: '', branch: '', accountNumber: '', iban: '', glAccountId: '' });
  };

  return (
    <div className="space-y-3" dir="rtl">
      <h2 className="text-sm font-bold text-foreground">حساب‌های بانک</h2>

      <div className="bg-card border border-border rounded-lg overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-100">
            <tr>{['ملاحظات', 'نام', 'کد', '▲'].map((h) => <th key={h} className="text-right py-2 px-2 font-semibold text-gray-700 border-b border-border">{h}</th>)}</tr>
          </thead>
          <tbody>
            {bankAccountRecords.map((b, i) => {
              const isSel = b.id === selectedId;
              return (
                <tr key={b.id} onClick={() => setSelectedId(b.id)} className={`cursor-pointer border-b border-border/30 ${isSel ? 'bg-blue-600 text-white' : i % 2 ? 'bg-gray-50' : 'bg-white'}`}>
                  <td className="py-1.5 px-2">{b.notes}</td>
                  <td className="py-1.5 px-2" dir="rtl">{b.name}</td>
                  <td className="py-1.5 px-2 font-mono" dir="ltr">{b.code}</td>
                  <td className="py-1.5 px-2 font-mono" dir="ltr">{i + 1}</td>
                </tr>
              );
            })}
            {bankAccountRecords.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">رکوردی یافت نشد</td></tr>}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="bg-card border border-border rounded-lg p-3 grid grid-cols-3 gap-3 text-xs">
          <div><p className="text-muted-foreground">بانک</p><p className="font-semibold text-foreground">{selected.bankName || '—'}</p></div>
          <div><p className="text-muted-foreground">شماره حساب</p><p className="font-mono font-semibold text-foreground" dir="ltr">{selected.accountNumber}</p></div>
          <div><p className="text-muted-foreground">مانده فعلی</p><p className="font-mono font-semibold text-foreground" dir="ltr">{fmt(selected.currentBalance)} ریال</p></div>
        </div>
      )}

      <div className="flex items-center gap-1.5 bg-gray-50 border border-border rounded-lg p-2">
        <button onClick={() => setModalOpen(true)} className="flex flex-col items-center gap-0.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-[10px] text-gray-700 min-w-[64px]">
          <Plus className="w-4 h-4" /><span>جدید</span>
        </button>
        <span className="mr-auto text-[11px] text-muted-foreground">تعداد = {bankAccountRecords.length}</span>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-[26rem]" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">حساب بانکی جدید</p>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>کد</label><input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} className={inputCls} dir="ltr" /></div>
                <div><label className={labelCls}>نام بانک</label><input value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} className={inputCls} dir="rtl" /></div>
              </div>
              <div><label className={labelCls}>نام (نمایشی)</label><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="بانک ملت-۵۳۳۷۴۹۹۶۴۸" className={inputCls} dir="rtl" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>شماره حساب</label><input value={form.accountNumber} onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))} className={inputCls} dir="ltr" /></div>
                <div><label className={labelCls}>شعبه</label><input value={form.branch} onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))} className={inputCls} dir="rtl" /></div>
              </div>
              <div>
                <label className={labelCls}>حساب دفتر کل مرتبط</label>
                <select value={form.glAccountId} onChange={(e) => setForm((f) => ({ ...f, glAccountId: e.target.value }))} className={inputCls} dir="rtl">
                  <option value="">انتخاب نشده</option>
                  {accounts.filter((a) => a.isBankAccount).map((a) => <option key={a.id} value={a.id}>{a.nameFa}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>ملاحظات</label><input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={inputCls} dir="rtl" /></div>
              <button onClick={submit} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90">ذخیره</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
