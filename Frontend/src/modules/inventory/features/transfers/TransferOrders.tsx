import { useState } from 'react';
import { toast } from 'sonner';
import { useInventoryStore } from '../../store';
import { Plus, ArrowLeftRight, X, Info } from 'lucide-react';

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

export default function TransferOrders() {
  const { transactions, warehouses, items, createTransferOrder } = useInventoryStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    itemId: items[0]?.id ?? '', quantity: '', fromWarehouseId: warehouses[0]?.id ?? '',
    toWarehouseId: warehouses[1]?.id ?? warehouses[0]?.id ?? '', performedBy: '',
  });

  const transfers = transactions.filter((t) => t.type === 'transfer');

  const submitTransfer = () => {
    if (form.fromWarehouseId === form.toWarehouseId) { toast.error('انبار مبدأ و مقصد نمی‌توانند یکسان باشند'); return; }
    const qty = Number(form.quantity || 0);
    if (qty <= 0) { toast.error('مقدار انتقال را وارد کنید'); return; }
    createTransferOrder({
      itemId: form.itemId, quantity: qty, fromWarehouseId: form.fromWarehouseId,
      toWarehouseId: form.toWarehouseId, performedBy: form.performedBy || '—',
    });
    toast.success('حواله انتقال بین‌انباری ثبت شد');
    setModalOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90">
          <Plus className="w-3.5 h-3.5" /><span>انتقال جدید</span>
        </button>
        <h1 className="text-lg font-bold text-foreground">انتقال بین‌انباری</h1>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-blue-800">
          مدل داده فعلی موجودی را در سطح کل شرکت نگه می‌دارد، نه به‌تفکیک هر انبار. بنابراین این صفحه انتقال را به‌عنوان یک سند حسابرسی و ردیابی لجستیکی ثبت می‌کند، اما مقدار کل موجودی کالا را تغییر نمی‌دهد. برای کنترل واقعی موجودی هر انبار، مدل داده باید موجودی را به‌ازای هر انبار نگهداری کند.
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {['تاریخ', 'انجام‌دهنده', 'ارزش', 'مقدار', 'کالا', 'مقصد', 'مبدأ', 'شماره سند'].map(h => (
                <th key={h} className="text-right py-3 px-3 text-[10px] font-semibold text-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transfers.map((t) => (
              <tr key={t.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                <td className="py-3 px-3 text-xs text-muted-foreground" dir="ltr">{t.timestamp.slice(0, 10)}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground">{t.performedBy}</td>
                <td className="py-3 px-3 text-xs font-mono text-foreground" dir="ltr">{t.totalCost.toLocaleString('fa-IR')}</td>
                <td className="py-3 px-3 text-xs font-mono text-foreground" dir="ltr">{t.quantity} {t.uom}</td>
                <td className="py-3 px-3 text-xs text-foreground">{t.itemName}</td>
                <td className="py-3 px-3 text-xs text-emerald-700">{t.toLocationCode}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground">{t.fromLocationCode}</td>
                <td className="py-3 px-3 text-xs font-mono text-primary flex items-center gap-1" dir="ltr"><ArrowLeftRight className="w-3 h-3" />{t.transactionNumber}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {transfers.length === 0 && <div className="text-center py-10 text-sm text-muted-foreground">هنوز انتقالی ثبت نشده</div>}
      </div>

      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setModalOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl shadow-2xl p-5 w-[28rem] z-50" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">انتقال کالا بین انبارها</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>کالا</label>
                <select dir="rtl" value={form.itemId} onChange={e => setForm(f => ({ ...f, itemId: e.target.value }))} className={inputCls}>
                  {items.map(i => <option key={i.id} value={i.id}>{i.nameFa}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>مقدار</label><input dir="ltr" type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>از انبار</label>
                  <select dir="rtl" value={form.fromWarehouseId} onChange={e => setForm(f => ({ ...f, fromWarehouseId: e.target.value }))} className={inputCls}>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.nameFa}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>به انبار</label>
                  <select dir="rtl" value={form.toWarehouseId} onChange={e => setForm(f => ({ ...f, toWarehouseId: e.target.value }))} className={inputCls}>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.nameFa}</option>)}
                  </select>
                </div>
              </div>
              <div><label className={labelCls}>انجام‌دهنده</label><input dir="rtl" value={form.performedBy} onChange={e => setForm(f => ({ ...f, performedBy: e.target.value }))} className={inputCls} /></div>
              <button onClick={submitTransfer} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors mt-1">ثبت انتقال</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
