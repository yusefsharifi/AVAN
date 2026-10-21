import { useState } from 'react';
import { toast } from 'sonner';
import { useFinanceStore } from '../../store';
import { Plus, X, FileCheck2, Ban, RotateCcw, Search } from 'lucide-react';
import type { RPDocType, InstrumentType, ReceiptPaymentDoc } from '../../types';

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";
const fmt = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

const DOCTYPE_LABELS: Record<RPDocType, string> = {
  cash_receipt: 'دریافت نقدی', check_receipt: 'دریافت چکی', transfer_receipt: 'دریافت حواله‌ای',
  cash_payment: 'پرداخت نقدی', check_payment: 'پرداخت چکی', transfer_payment: 'پرداخت حواله‌ای',
};
const STATUS_LABELS: Record<ReceiptPaymentDoc['status'], { fa: string; color: string; bg: string }> = {
  draft: { fa: 'پیش‌نویس', color: 'text-slate-600', bg: 'bg-slate-100' },
  prepared: { fa: 'تنظیم‌شده', color: 'text-blue-700', bg: 'bg-blue-50' },
  approved: { fa: 'تأیید شده', color: 'text-amber-700', bg: 'bg-amber-50' },
  posted: { fa: 'ثبت حسابداری', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  bounced: { fa: 'برگشت‌خورده', color: 'text-red-700', bg: 'bg-red-50' },
  cancelled: { fa: 'ابطال‌شده', color: 'text-gray-500', bg: 'bg-gray-100' },
};

const instrumentOf = (t: RPDocType): InstrumentType => (t.startsWith('cash') ? 'cash' : t.startsWith('check') ? 'check' : 'bank_transfer');

export default function DocumentRegistrationTab() {
  const { receiptPaymentDocs, buyers, bankAccountRecords, parentDocuments, createReceiptPaymentDoc, postReceiptPaymentToGL, cancelReceiptPaymentDoc, bounceReceiptPaymentDoc } = useFinanceStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [cancelModalId, setCancelModalId] = useState<string | null>(null);
  const [bounceModalId, setBounceModalId] = useState<string | null>(null);
  const [reasonText, setReasonText] = useState('');

  const [form, setForm] = useState<{
    docType: RPDocType; date: string; entityId: string; amount: string; checkNumber: string; checkDate: string;
    bankAccountId: string; transactionRef: string; parentDocumentId: string; description: string; notes: string;
  }>({ docType: 'cash_receipt', date: '', entityId: '', amount: '', checkNumber: '', checkDate: '', bankAccountId: '', transactionRef: '', parentDocumentId: '', description: '', notes: '' });

  const visible = receiptPaymentDocs.filter((d) => !search || d.entityName.includes(search) || d.documentNumber.includes(search));
  const instrument = instrumentOf(form.docType);
  const openParents = parentDocuments.filter((p) => p.remainingAmount > 0);
  const selectedParent = openParents.find((p) => p.id === form.parentDocumentId);

  const submit = () => {
    if (!form.entityId || !form.amount || Number(form.amount) <= 0) { toast.error('طرف حساب و مبلغ معتبر الزامی است'); return; }
    if (instrument === 'check' && form.checkDate && form.date && form.checkDate < form.date) { toast.error('تاریخ سررسید چک نمی‌تواند قبل از تاریخ سند باشد'); return; }
    if (selectedParent && Number(form.amount) > selectedParent.remainingAmount) {
      if (!confirm(`مبلغ وارد شده (${fmt(Number(form.amount))}) بیشتر از مانده سند والد (${fmt(selectedParent.remainingAmount)}) است. ادامه می‌دهید؟`)) return;
    }
    const entity = buyers.find((b) => b.id === form.entityId);
    createReceiptPaymentDoc({
      docType: form.docType, date: form.date || 'امروز', entityId: form.entityId, entityName: entity?.name || '—',
      entityType: entity?.type === 'seller' ? 'seller' : 'buyer', instrumentType: instrument,
      totalAmount: Number(form.amount), checkNumber: instrument === 'check' ? form.checkNumber : undefined,
      checkDate: instrument === 'check' ? form.checkDate : undefined,
      bankAccountId: instrument === 'bank_transfer' ? form.bankAccountId : undefined,
      transactionRef: instrument === 'bank_transfer' ? form.transactionRef : undefined,
      parentDocumentId: form.parentDocumentId || undefined, description: form.description, notes: form.notes,
    });
    toast.success('سند دریافت/پرداخت جدید ثبت شد');
    setModalOpen(false);
    setForm({ docType: 'cash_receipt', date: '', entityId: '', amount: '', checkNumber: '', checkDate: '', bankAccountId: '', transactionRef: '', parentDocumentId: '', description: '', notes: '' });
  };

  const handlePost = (id: string) => {
    const doc = receiptPaymentDocs.find((d) => d.id === id);
    if (!doc || doc.status === 'posted') return;
    if (!confirm(`سند حسابداری برای ${DOCTYPE_LABELS[doc.docType]} به مبلغ ${fmt(doc.totalAmount)} ریال صادر می‌شود. ادامه می‌دهید؟`)) return;
    const voucher = postReceiptPaymentToGL(id);
    toast.success(`سند حسابداری ${voucher.voucherNumber} ثبت شد`);
  };

  const handleCancel = () => {
    if (!cancelModalId) return;
    cancelReceiptPaymentDoc(cancelModalId, reasonText || 'بدون دلیل');
    toast.success('سند ابطال شد');
    setCancelModalId(null); setReasonText('');
  };
  const handleBounce = () => {
    if (!bounceModalId) return;
    bounceReceiptPaymentDoc(bounceModalId, reasonText || 'بدون دلیل');
    toast.success('برگشت سند ثبت شد و سند اصلاحی صادر شد');
    setBounceModalId(null); setReasonText('');
  };

  const selected = receiptPaymentDocs.find((d) => d.id === selectedId);

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی شخص، شماره سند..." className="w-full pr-9 pl-3 py-1.5 rounded-lg border border-border bg-background text-xs" dir="rtl" />
        </div>
        <h2 className="text-sm font-bold text-foreground">ثبت اسناد دریافت و پرداخت</h2>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-auto max-h-[420px]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-100 z-10">
            <tr>
              {['تایید', 'تنظیم', 'اسناد حسابداری', 'شماره سند والد', 'تاریخ سررسید', 'شماره چک', 'وضعیت', 'مبلغ', 'شخص', 'نوع سند', 'ملاحظات', 'تاریخ', 'شماره', '▲'].map((h) => (
                <th key={h} className="text-right py-2 px-2 font-semibold text-gray-700 border-b border-border whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((d, i) => {
              const cfg = STATUS_LABELS[d.status];
              const isSel = d.id === selectedId;
              return (
                <tr key={d.id} onClick={() => setSelectedId(d.id)} className={`cursor-pointer border-b border-border/30 ${isSel ? 'bg-blue-600 text-white' : i % 2 ? 'bg-gray-50' : 'bg-white'}`}>
                  <td className="py-1.5 px-2">{d.approvedBy ?? ''}</td>
                  <td className="py-1.5 px-2">{d.preparedBy}</td>
                  <td className={`py-1.5 px-2 font-mono ${!isSel && d.glVoucherId ? 'text-emerald-700' : ''}`} dir="ltr">{d.glVoucherId ?? '—'}</td>
                  <td className="py-1.5 px-2 font-mono" dir="ltr">{d.parentDocNumber ?? '—'}</td>
                  <td className="py-1.5 px-2 font-mono" dir="ltr">{d.checkDate ?? '—'}</td>
                  <td className="py-1.5 px-2 font-mono" dir="ltr">{d.checkNumber ?? '—'}</td>
                  <td className="py-1.5 px-2"><span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${isSel ? 'bg-white/20' : `${cfg.color} ${cfg.bg}`}`}>{cfg.fa}</span></td>
                  <td className="py-1.5 px-2 font-mono" dir="ltr">{fmt(d.totalAmount)}</td>
                  <td className="py-1.5 px-2">{d.entityName}</td>
                  <td className="py-1.5 px-2">{DOCTYPE_LABELS[d.docType]}</td>
                  <td className="py-1.5 px-2">{d.description}</td>
                  <td className="py-1.5 px-2 font-mono" dir="ltr">{d.date}</td>
                  <td className="py-1.5 px-2 font-mono" dir="ltr">{d.documentNumber}</td>
                  <td className="py-1.5 px-2 font-mono" dir="ltr">{i + 1}</td>
                </tr>
              );
            })}
            {visible.length === 0 && <tr><td colSpan={14} className="text-center py-8 text-muted-foreground">رکوردی یافت نشد</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap bg-gray-50 border border-border rounded-lg p-2">
        <button onClick={() => setModalOpen(true)} className="flex flex-col items-center gap-0.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-[10px] text-gray-700 min-w-[64px]">
          <Plus className="w-4 h-4" /><span>جدید</span>
        </button>
        <button disabled={!selected || selected.status === 'posted'} onClick={() => selected && handlePost(selected.id)} className="flex flex-col items-center gap-0.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-[10px] text-gray-700 min-w-[64px] disabled:opacity-40">
          <FileCheck2 className="w-4 h-4" /><span>ثبت حسابداری</span>
        </button>
        <button disabled={!selected || selected.status === 'cancelled'} onClick={() => selected && setCancelModalId(selected.id)} className="flex flex-col items-center gap-0.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-[10px] text-gray-700 min-w-[64px] disabled:opacity-40">
          <Ban className="w-4 h-4" /><span>ابطال</span>
        </button>
        <button disabled={!selected || selected.instrumentType !== 'check' || selected.status !== 'posted'} onClick={() => selected && setBounceModalId(selected.id)} className="flex flex-col items-center gap-0.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-[10px] text-gray-700 min-w-[64px] disabled:opacity-40">
          <RotateCcw className="w-4 h-4" /><span>برگشت</span>
        </button>
        <span className="mr-auto text-[11px] text-muted-foreground">تعداد = {visible.length}</span>
      </div>

      {/* Create modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-[30rem] max-h-[88vh] overflow-y-auto" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">سند دریافت/پرداخت جدید</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>نوع سند</label>
                <select value={form.docType} onChange={(e) => setForm((f) => ({ ...f, docType: e.target.value as RPDocType }))} className={inputCls} dir="rtl">
                  {Object.entries(DOCTYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>تاریخ</label><input value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} placeholder="۱۴۰۳/۰۴/۱۶" className={inputCls} dir="rtl" /></div>
                <div><label className={labelCls}>مبلغ</label><input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className={inputCls} dir="ltr" /></div>
              </div>
              <div>
                <label className={labelCls}>شخص (طرف حساب)</label>
                <select value={form.entityId} onChange={(e) => setForm((f) => ({ ...f, entityId: e.target.value }))} className={inputCls} dir="rtl">
                  <option value="">انتخاب کنید</option>
                  {buyers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              {instrument === 'check' && (
                <div className="grid grid-cols-2 gap-2 bg-secondary/30 rounded-lg p-2">
                  <div><label className={labelCls}>شماره چک</label><input value={form.checkNumber} onChange={(e) => setForm((f) => ({ ...f, checkNumber: e.target.value }))} className={inputCls} dir="ltr" /></div>
                  <div><label className={labelCls}>تاریخ سررسید</label><input value={form.checkDate} onChange={(e) => setForm((f) => ({ ...f, checkDate: e.target.value }))} placeholder="۱۴۰۳/۰۵/۰۱" className={inputCls} dir="rtl" /></div>
                </div>
              )}
              {instrument === 'bank_transfer' && (
                <div className="grid grid-cols-2 gap-2 bg-secondary/30 rounded-lg p-2">
                  <div>
                    <label className={labelCls}>حساب بانکی</label>
                    <select value={form.bankAccountId} onChange={(e) => setForm((f) => ({ ...f, bankAccountId: e.target.value }))} className={inputCls} dir="rtl">
                      <option value="">انتخاب کنید</option>
                      {bankAccountRecords.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div><label className={labelCls}>شماره پیگیری</label><input value={form.transactionRef} onChange={(e) => setForm((f) => ({ ...f, transactionRef: e.target.value }))} className={inputCls} dir="ltr" /></div>
                </div>
              )}

              <div>
                <label className={labelCls}>سند والد (تسویه فاکتور)</label>
                <select value={form.parentDocumentId} onChange={(e) => setForm((f) => ({ ...f, parentDocumentId: e.target.value }))} className={inputCls} dir="rtl">
                  <option value="">بدون سند والد</option>
                  {openParents.map((p) => <option key={p.id} value={p.id}>{p.documentNumber} — {p.entityName} — مانده: {fmt(p.remainingAmount)}</option>)}
                </select>
                {selectedParent && <p className="text-[10px] text-muted-foreground mt-1">مانده سند والد: <span dir="ltr">{fmt(selectedParent.remainingAmount)}</span> ریال</p>}
              </div>

              <div><label className={labelCls}>شرح</label><input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} dir="rtl" /></div>
              <div><label className={labelCls}>ملاحظات</label><textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={inputCls} rows={2} dir="rtl" /></div>

              <div className="flex items-center gap-2 justify-end pt-2">
                <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-secondary">انصراف</button>
                <button onClick={submit} className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90">ذخیره</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {cancelModalId && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setCancelModalId(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-80" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold text-foreground mb-3">ابطال سند</p>
            <textarea value={reasonText} onChange={(e) => setReasonText(e.target.value)} placeholder="دلیل ابطال" className={inputCls} rows={2} dir="rtl" />
            <div className="flex gap-2 justify-end mt-3">
              <button onClick={() => setCancelModalId(null)} className="px-3 py-1.5 rounded-lg border border-border text-xs">انصراف</button>
              <button onClick={handleCancel} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs">ابطال سند</button>
            </div>
          </div>
        </div>
      )}

      {/* Bounce modal */}
      {bounceModalId && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setBounceModalId(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-80" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold text-foreground mb-3">برگشت سند</p>
            <textarea value={reasonText} onChange={(e) => setReasonText(e.target.value)} placeholder="دلیل برگشت" className={inputCls} rows={2} dir="rtl" />
            <p className="text-[10px] text-muted-foreground mt-2">سند حسابداری اصلی واگردانی می‌شود.</p>
            <div className="flex gap-2 justify-end mt-3">
              <button onClick={() => setBounceModalId(null)} className="px-3 py-1.5 rounded-lg border border-border text-xs">انصراف</button>
              <button onClick={handleBounce} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs">ثبت برگشت</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
