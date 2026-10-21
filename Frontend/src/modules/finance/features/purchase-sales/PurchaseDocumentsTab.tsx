import { useState } from 'react';
import { toast } from 'sonner';
import { useFinanceStore } from '../../store';
import { Plus, Search, Trash2, FileCheck2, X, Printer } from 'lucide-react';
import type { DocumentLine, DocumentStatus } from '../../types';

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";
const fmt = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

const STATUS_LABELS: Record<DocumentStatus, { fa: string; color: string; bg: string }> = {
  draft: { fa: 'پیش‌نویس', color: 'text-slate-600', bg: 'bg-slate-100' },
  prepared: { fa: 'تنظیم‌شده', color: 'text-blue-700', bg: 'bg-blue-50' },
  approved: { fa: 'تأیید شده', color: 'text-amber-700', bg: 'bg-amber-50' },
  authorized: { fa: 'تصویب شده', color: 'text-purple-700', bg: 'bg-purple-50' },
  posted: { fa: 'ثبت حسابداری', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  cancelled: { fa: 'حذف‌شده', color: 'text-red-700', bg: 'bg-red-50' },
};

const emptyLine = (): DocumentLine & { key: string } => ({
  key: `${Date.now()}-${Math.random()}`, id: '', itemCode: '', itemName: '', quantity: 0, unitPrice: 0, discount: 0, taxRate: 10, lineTotal: 0, notes: '',
});

export default function PurchaseDocumentsTab() {
  const { purchaseDocuments, createPurchaseDocument, updatePurchaseDocumentStatus, postPurchaseToGL, deletePurchaseDocument } = useFinanceStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [printId, setPrintId] = useState<string | null>(null);

  const [form, setForm] = useState({
    date: '', notes: '', vendorName: '', vendorCode: '', visitorName: '', escrowRequired: false,
    lines: [emptyLine()],
  });

  const visible = purchaseDocuments.filter((d) => d.status !== 'cancelled' && (!search || d.vendorName.includes(search) || d.documentNumber.includes(search)));
  const selected = purchaseDocuments.find((d) => d.id === selectedId);
  const printDoc = purchaseDocuments.find((d) => d.id === printId);

  const updateLine = (idx: number, patch: Partial<DocumentLine>) => {
    setForm((f) => ({
      ...f,
      lines: f.lines.map((l, i) => {
        if (i !== idx) return l;
        const merged = { ...l, ...patch };
        merged.lineTotal = merged.quantity * merged.unitPrice * (1 - merged.discount / 100) * (1 + merged.taxRate / 100);
        return merged;
      }),
    }));
  };

  const totals = form.lines.reduce((acc, l) => {
    const before = l.quantity * l.unitPrice;
    const discount = before * (l.discount / 100);
    const tax = (before - discount) * (l.taxRate / 100);
    return { before: acc.before + before, discount: acc.discount + discount, tax: acc.tax + tax, grand: acc.grand + (before - discount + tax) };
  }, { before: 0, discount: 0, tax: 0, grand: 0 });

  const submit = () => {
    if (!form.vendorName.trim() || form.lines.every((l) => !l.itemName)) { toast.error('نام فروشنده و حداقل یک قلم کالا الزامی است'); return; }
    createPurchaseDocument({
      date: form.date || 'امروز', notes: form.notes, vendorName: form.vendorName, vendorCode: form.vendorCode,
      visitorName: form.visitorName, escrowRequired: form.escrowRequired,
      lines: form.lines.filter((l) => l.itemName).map((l) => ({ ...l, id: `dl-${Date.now()}-${Math.random()}` })),
    });
    toast.success('سند خرید جدید ثبت شد');
    setModalOpen(false);
    setForm({ date: '', notes: '', vendorName: '', vendorCode: '', visitorName: '', escrowRequired: false, lines: [emptyLine()] });
  };

  const handlePost = (id: string) => {
    const doc = purchaseDocuments.find((d) => d.id === id);
    if (!doc) return;
    if (doc.status === 'posted') { toast.error('این سند قبلاً ثبت حسابداری شده است'); return; }
    if (!confirm(`سند حسابداری زیر ایجاد می‌شود:\nبدهکار: موجودی کالا + مالیات خرید\nبستانکار: حساب‌های پرداختنی — مبلغ ${fmt(doc.grandTotal)} ریال\n\nادامه می‌دهید؟`)) return;
    const voucher = postPurchaseToGL(id);
    toast.success(`سند حسابداری ${voucher.voucherNumber} ثبت شد`);
  };

  const handleDelete = () => {
    if (!confirmDeleteId) return;
    deletePurchaseDocument(confirmDeleteId);
    toast.success('سند حذف شد');
    setConfirmDeleteId(null);
    setSelectedId(null);
  };

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی فروشنده، شماره سند..." className="w-full pr-9 pl-3 py-1.5 rounded-lg border border-border bg-background text-xs" dir="rtl" />
        </div>
        <h2 className="text-sm font-bold text-foreground">اسناد خرید</h2>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-auto max-h-[420px]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-100 z-10">
            <tr>
              {['نام ویزیتور', 'امانه محضر', 'اسناد حسابداری', 'قابل پرداخت', 'تاریخ تغییر وضعیت', 'وضعیت', 'تصویب', 'تایید', 'تنظیم', 'اقلام', 'کد فروشنده', 'نام فروشنده', 'شماره صنف', 'ملاحظات', 'تاریخ', 'شماره', '▲'].map((h) => (
                <th key={h} className="text-right py-2 px-2 font-semibold text-gray-700 border-b border-border whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((d, i) => {
              const cfg = STATUS_LABELS[d.status];
              const isSel = d.id === selectedId;
              return (
                <tr key={d.id} onClick={() => setSelectedId(d.id)} onDoubleClick={() => setSelectedId(d.id)}
                  className={`cursor-pointer border-b border-border/30 ${isSel ? 'bg-blue-600 text-white' : i % 2 ? 'bg-gray-50' : 'bg-white'}`}>
                  <td className="py-1.5 px-2">{d.visitorName}</td>
                  <td className="py-1.5 px-2">{d.escrowRequired ? 'بلی' : ''}</td>
                  <td className={`py-1.5 px-2 font-mono ${!isSel && d.accountingDocRef ? 'text-emerald-700' : ''}`} dir="ltr">{d.accountingDocRef ?? '—'}</td>
                  <td className="py-1.5 px-2 font-mono" dir="ltr">{fmt(d.payableAmount)}</td>
                  <td className="py-1.5 px-2 font-mono" dir="ltr">{d.statusChangeDate || '—'}</td>
                  <td className="py-1.5 px-2"><span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${isSel ? 'bg-white/20' : `${cfg.color} ${cfg.bg}`}`}>{cfg.fa}</span></td>
                  <td className="py-1.5 px-2">{d.authorizedBy}</td>
                  <td className="py-1.5 px-2">{d.approvedBy}</td>
                  <td className="py-1.5 px-2">{d.preparedBy}</td>
                  <td className="py-1.5 px-2 font-mono" dir="ltr">{d.lineCount}</td>
                  <td className="py-1.5 px-2 font-mono" dir="ltr">{d.vendorCode}</td>
                  <td className="py-1.5 px-2">{d.vendorName}</td>
                  <td className="py-1.5 px-2 font-mono" dir="ltr">{d.itemNumber}</td>
                  <td className="py-1.5 px-2">{d.notes}</td>
                  <td className="py-1.5 px-2 font-mono" dir="ltr">{d.date}</td>
                  <td className="py-1.5 px-2 font-mono" dir="ltr">{d.documentNumber}</td>
                  <td className="py-1.5 px-2 font-mono" dir="ltr">{i + 1}</td>
                </tr>
              );
            })}
            {visible.length === 0 && <tr><td colSpan={17} className="text-center py-8 text-muted-foreground">رکوردی یافت نشد</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Bottom action bar */}
      <div className="flex items-center gap-1.5 flex-wrap bg-gray-50 border border-border rounded-lg p-2">
        <button onClick={() => setModalOpen(true)} className="flex flex-col items-center gap-0.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-[10px] text-gray-700 min-w-[64px]">
          <Plus className="w-4 h-4" /><span>جدید</span>
        </button>
        <button disabled={!selected} onClick={() => selected && setConfirmDeleteId(selected.id)} className="flex flex-col items-center gap-0.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-[10px] text-gray-700 min-w-[64px] disabled:opacity-40 disabled:cursor-not-allowed">
          <Trash2 className="w-4 h-4" /><span>حذف</span>
        </button>
        <button disabled={!selected} onClick={() => selected && setPrintId(selected.id)} className="flex flex-col items-center gap-0.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-[10px] text-gray-700 min-w-[64px] disabled:opacity-40 disabled:cursor-not-allowed">
          <Printer className="w-4 h-4" /><span>چاپ</span>
        </button>
        <button disabled={!selected || selected.status === 'posted'} onClick={() => selected && handlePost(selected.id)} className="flex flex-col items-center gap-0.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-[10px] text-gray-700 min-w-[64px] disabled:opacity-40 disabled:cursor-not-allowed">
          <FileCheck2 className="w-4 h-4" /><span>ثبت حسابداری</span>
        </button>
        <span className="mr-auto text-[11px] text-muted-foreground">تعداد = {visible.length}</span>
      </div>

      {/* Create modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-[44rem] max-h-[88vh] overflow-y-auto" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">سند خرید جدید</p>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div><label className={labelCls}>تاریخ</label><input value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} placeholder="۱۴۰۴/۰۱/۰۱" className={inputCls} dir="rtl" /></div>
                <div><label className={labelCls}>نام فروشنده</label><input value={form.vendorName} onChange={(e) => setForm((f) => ({ ...f, vendorName: e.target.value }))} className={inputCls} dir="rtl" /></div>
                <div><label className={labelCls}>کد فروشنده</label><input value={form.vendorCode} onChange={(e) => setForm((f) => ({ ...f, vendorCode: e.target.value }))} className={inputCls} dir="ltr" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>نام ویزیتور</label><input value={form.visitorName} onChange={(e) => setForm((f) => ({ ...f, visitorName: e.target.value }))} className={inputCls} dir="rtl" /></div>
                <div><label className={labelCls}>ملاحظات</label><input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={inputCls} dir="rtl" /></div>
              </div>

              <div className="flex items-center justify-between">
                <button onClick={() => setForm((f) => ({ ...f, lines: [...f.lines, emptyLine()] }))} className="text-[10px] text-accent hover:underline">+ افزودن قلم کالا</button>
                <label className={labelCls}>اقلام کالا</label>
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-[10px]">
                  <thead className="bg-secondary/40"><tr>{['', 'جمع', 'مالیات٪', 'تخفیف٪', 'قیمت واحد', 'مقدار', 'نام کالا', 'کد کالا'].map((h) => <th key={h} className="py-1.5 px-1.5 text-right">{h}</th>)}</tr></thead>
                  <tbody>
                    {form.lines.map((l, idx) => (
                      <tr key={l.key} className="border-t border-border/40">
                        <td className="py-1 px-1"><button onClick={() => setForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }))} className="text-red-500 hover:text-red-700"><X className="w-3 h-3" /></button></td>
                        <td className="py-1 px-1 font-mono" dir="ltr">{fmt(Math.round(l.lineTotal))}</td>
                        <td className="py-1 px-1"><input type="number" value={l.taxRate} onChange={(e) => updateLine(idx, { taxRate: Number(e.target.value) })} className="w-12 bg-secondary border border-border rounded px-1 py-0.5" dir="ltr" /></td>
                        <td className="py-1 px-1"><input type="number" value={l.discount} onChange={(e) => updateLine(idx, { discount: Number(e.target.value) })} className="w-12 bg-secondary border border-border rounded px-1 py-0.5" dir="ltr" /></td>
                        <td className="py-1 px-1"><input type="number" value={l.unitPrice || ''} onChange={(e) => updateLine(idx, { unitPrice: Number(e.target.value) })} className="w-20 bg-secondary border border-border rounded px-1 py-0.5" dir="ltr" /></td>
                        <td className="py-1 px-1"><input type="number" value={l.quantity || ''} onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })} className="w-16 bg-secondary border border-border rounded px-1 py-0.5" dir="ltr" /></td>
                        <td className="py-1 px-1"><input value={l.itemName} onChange={(e) => updateLine(idx, { itemName: e.target.value })} className="w-28 bg-secondary border border-border rounded px-1 py-0.5" dir="rtl" /></td>
                        <td className="py-1 px-1"><input value={l.itemCode} onChange={(e) => updateLine(idx, { itemCode: e.target.value })} className="w-16 bg-secondary border border-border rounded px-1 py-0.5" dir="ltr" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-4 gap-2 bg-secondary/30 rounded-lg p-2 text-[11px]">
                <div><p className="text-muted-foreground">جمع قبل از تخفیف</p><p className="font-mono font-semibold text-foreground" dir="ltr">{fmt(Math.round(totals.before))}</p></div>
                <div><p className="text-muted-foreground">جمع تخفیف</p><p className="font-mono font-semibold text-foreground" dir="ltr">{fmt(Math.round(totals.discount))}</p></div>
                <div><p className="text-muted-foreground">جمع مالیات</p><p className="font-mono font-semibold text-foreground" dir="ltr">{fmt(Math.round(totals.tax))}</p></div>
                <div><p className="text-muted-foreground">قابل پرداخت</p><p className="font-mono font-bold text-accent" dir="ltr">{fmt(Math.round(totals.grand))}</p></div>
              </div>

              <div className="flex items-center gap-2 justify-end pt-2">
                <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-secondary">انصراف</button>
                <button onClick={submit} className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90">ذخیره</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-80" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-foreground mb-4">آیا از حذف سند شماره «{purchaseDocuments.find((d) => d.id === confirmDeleteId)?.documentNumber}» اطمینان دارید؟</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDeleteId(null)} className="px-3 py-1.5 rounded-lg border border-border text-xs">انصراف</button>
              <button onClick={handleDelete} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs">حذف</button>
            </div>
          </div>
        </div>
      )}

      {/* Print preview (simplified) */}
      {printDoc && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setPrintId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-[32rem] max-h-[85vh] overflow-y-auto" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center border-b border-gray-300 pb-3 mb-3">
              <p className="text-sm font-bold">فاکتور خرید شماره {printDoc.documentNumber}</p>
              <p className="text-xs text-muted-foreground" dir="ltr">{printDoc.date}</p>
            </div>
            <p className="text-xs mb-2">فروشنده: <span className="font-semibold">{printDoc.vendorName}</span></p>
            <table className="w-full text-xs mb-3">
              <thead><tr className="border-b"><th className="text-right py-1">کالا</th><th className="text-right py-1">مقدار</th><th className="text-right py-1">مبلغ</th></tr></thead>
              <tbody>{printDoc.lines.map((l) => <tr key={l.id} className="border-b border-gray-100"><td className="py-1">{l.itemName}</td><td className="py-1 font-mono" dir="ltr">{l.quantity}</td><td className="py-1 font-mono" dir="ltr">{fmt(Math.round(l.lineTotal))}</td></tr>)}</tbody>
            </table>
            <p className="text-sm font-bold text-left" dir="ltr">جمع کل: {fmt(printDoc.grandTotal)} ریال</p>
            <button onClick={() => window.print()} className="w-full mt-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold">چاپ</button>
          </div>
        </div>
      )}
    </div>
  );
}
