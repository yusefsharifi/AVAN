import { useState } from 'react';
import { toast } from 'sonner';
import { useFinanceStore } from '../../store';
import { Plus, Trash2, Import, X } from 'lucide-react';
import type { BuyerSeller } from '../../types';

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

const TYPE_LABELS: Record<BuyerSeller['type'], string> = { buyer: 'خریدار', seller: 'فروشنده', both: 'هر دو' };
const PAYMENT_LABELS: Record<BuyerSeller['paymentMethod'], string> = { cash: 'نقدی', check: 'چک', credit: 'اعتباری', online: 'آنلاین', lc: 'اعتبار اسنادی', bank_transfer: 'انتقال بانکی' };

export default function BuyerSellersTab() {
  const { buyers, accounts, createBuyerSeller, deleteBuyerSeller, importBuyerSellerFromAccounting } = useFinanceStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedImportIds, setSelectedImportIds] = useState<string[]>([]);

  const [form, setForm] = useState<{ code: string; name: string; title: string; type: BuyerSeller['type']; paymentMethod: BuyerSeller['paymentMethod']; notes: string }>({
    code: '', name: '', title: '', type: 'buyer', paymentMethod: 'cash', notes: '',
  });

  const linkedAccountIds = new Set(buyers.map((b) => b.subAccountId));
  const importableAccounts = accounts.filter((a) => (a.type === 'asset' || a.type === 'liability') && !linkedAccountIds.has(a.id));

  const submit = () => {
    if (!form.name.trim()) { toast.error('نام الزامی است'); return; }
    createBuyerSeller(form);
    toast.success('خریدار/فروشنده جدید ثبت شد');
    setModalOpen(false);
    setForm({ code: '', name: '', title: '', type: 'buyer', paymentMethod: 'cash', notes: '' });
  };

  const submitImport = () => {
    selectedImportIds.forEach((id) => importBuyerSellerFromAccounting(id));
    toast.success(`${selectedImportIds.length} حساب از حسابداری منتقل شد`);
    setImportModalOpen(false);
    setSelectedImportIds([]);
  };

  const handleDelete = () => {
    if (!confirmDeleteId) return;
    deleteBuyerSeller(confirmDeleteId);
    toast.success('رکورد حذف شد');
    setConfirmDeleteId(null);
    setSelectedId(null);
  };

  return (
    <div className="space-y-3" dir="rtl">
      <h2 className="text-sm font-bold text-foreground">خریداران/فروشندگان</h2>

      <div className="bg-card border border-border rounded-lg overflow-auto max-h-[420px]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-100 z-10">
            <tr>
              {['انتقال از حسابداری', 'زیر حساب', 'ویزیتور', 'ملاحظات', 'نام گروه', 'نحوه پرداخت', 'نوع', 'عنوان', 'نام', 'کد', '▲'].map((h) => (
                <th key={h} className="text-right py-2 px-2 font-semibold text-gray-700 border-b border-border whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {buyers.map((b, i) => {
              const isSel = b.id === selectedId;
              return (
                <tr key={b.id} onClick={() => setSelectedId(b.id)} className={`cursor-pointer border-b border-border/30 ${isSel ? 'bg-blue-600 text-white' : i % 2 ? 'bg-gray-50' : 'bg-white'}`}>
                  <td className="py-1.5 px-2">{b.transferredFromAccounting ? 'بلی' : ''}</td>
                  <td className="py-1.5 px-2 font-mono" dir="ltr">{b.subAccountId}</td>
                  <td className="py-1.5 px-2">{b.visitorId ?? ''}</td>
                  <td className="py-1.5 px-2">{b.notes}</td>
                  <td className="py-1.5 px-2">{b.groupName}</td>
                  <td className="py-1.5 px-2">{PAYMENT_LABELS[b.paymentMethod]}</td>
                  <td className="py-1.5 px-2">{TYPE_LABELS[b.type]}</td>
                  <td className="py-1.5 px-2">{b.title}</td>
                  <td className="py-1.5 px-2">{b.name}</td>
                  <td className="py-1.5 px-2 font-mono" dir="ltr">{b.code}</td>
                  <td className="py-1.5 px-2 font-mono" dir="ltr">{i + 1}</td>
                </tr>
              );
            })}
            {buyers.length === 0 && <tr><td colSpan={11} className="text-center py-8 text-muted-foreground">رکوردی یافت نشد</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-1.5 bg-gray-50 border border-border rounded-lg p-2">
        <button onClick={() => setModalOpen(true)} className="flex flex-col items-center gap-0.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-[10px] text-gray-700 min-w-[64px]">
          <Plus className="w-4 h-4" /><span>جدید</span>
        </button>
        <button disabled={!selectedId} onClick={() => selectedId && setConfirmDeleteId(selectedId)} className="flex flex-col items-center gap-0.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-[10px] text-gray-700 min-w-[64px] disabled:opacity-40">
          <Trash2 className="w-4 h-4" /><span>حذف</span>
        </button>
        <button onClick={() => setImportModalOpen(true)} className="flex flex-col items-center gap-0.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-[10px] text-gray-700 min-w-[80px]">
          <Import className="w-4 h-4" /><span>انتقال از حسابداری</span>
        </button>
        <span className="mr-auto text-[11px] text-muted-foreground">تعداد = {buyers.length}</span>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-[26rem]" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">خریدار/فروشنده جدید</p>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>کد</label><input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} className={inputCls} dir="ltr" /></div>
                <div><label className={labelCls}>نام</label><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} dir="rtl" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>نوع</label>
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as BuyerSeller['type'] }))} className={inputCls} dir="rtl">
                    <option value="buyer">خریدار</option><option value="seller">فروشنده</option><option value="both">هر دو</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>نحوه پرداخت</label>
                  <select value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value as BuyerSeller['paymentMethod'] }))} className={inputCls} dir="rtl">
                    <option value="cash">نقدی</option><option value="check">چک</option><option value="credit">اعتباری</option><option value="online">آنلاین</option><option value="lc">اعتبار اسنادی</option>
                  </select>
                </div>
              </div>
              <div><label className={labelCls}>ملاحظات</label><textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={inputCls} rows={2} dir="rtl" /></div>
              <button onClick={submit} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90">ذخیره</button>
            </div>
          </div>
        </div>
      )}

      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setImportModalOpen(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-[26rem] max-h-[70vh] overflow-y-auto" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setImportModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">انتقال از حسابداری</p>
            </div>
            <div className="space-y-1 mb-3">
              {importableAccounts.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-xs text-foreground p-1.5 rounded hover:bg-secondary/30">
                  <input type="checkbox" checked={selectedImportIds.includes(a.id)} onChange={(e) => setSelectedImportIds((prev) => e.target.checked ? [...prev, a.id] : prev.filter((id) => id !== a.id))} />
                  {a.nameFa} <span className="text-muted-foreground font-mono" dir="ltr">({a.code})</span>
                </label>
              ))}
              {importableAccounts.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-4">همه حساب‌ها قبلاً منتقل شده‌اند</p>}
            </div>
            <button onClick={submitImport} disabled={selectedImportIds.length === 0} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-40">انتقال {selectedImportIds.length > 0 ? `(${selectedImportIds.length})` : ''}</button>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-80" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-foreground mb-4">آیا از حذف این رکورد اطمینان دارید؟</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDeleteId(null)} className="px-3 py-1.5 rounded-lg border border-border text-xs">انصراف</button>
              <button onClick={handleDelete} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs">حذف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
