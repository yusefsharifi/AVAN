import { useState } from 'react';
import { useProcurementStore } from '../../store/useProcurementStore';
import { useHRStore } from '@/modules/hr';
import { SHIPMENTS } from '@/entities/document';
import { Truck, Check, ChevronLeft, ChevronRight, Landmark, Package } from 'lucide-react';

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

interface LineDraft {
  poLineId: string; itemId: string; itemNameFa: string; receivedQuantity: string; acceptedQuantity: string;
  rejectedQuantity: number; rejectionReason: string; batchNumber: string; expiryDate: string;
}

export default function POReceiving() {
  const { purchaseOrders, receivePOGoods } = useProcurementStore();
  const { employees } = useHRStore();
  const [step, setStep] = useState(1);
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [receiptInfo, setReceiptInfo] = useState({ vehiclePlate: '', driverName: '', receivedBy: employees[0]?.name ?? '' });
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [done, setDone] = useState(false);

  const pendingPOs = purchaseOrders.filter((po) => ['sent', 'partially_received'].includes(po.status));
  const selectedPO = purchaseOrders.find((po) => po.id === selectedPoId);
  const recentPlates = Array.from(new Set(SHIPMENTS.filter((s) => s.direction === 'in').map((s) => s.plate)));

  const selectPO = (poId: string) => {
    const po = purchaseOrders.find((p) => p.id === poId);
    setSelectedPoId(poId);
    setLines((po?.lines ?? []).filter((l) => l.pendingQuantity > 0).map((l) => ({
      poLineId: l.id, itemId: l.itemId, itemNameFa: l.itemNameFa, receivedQuantity: String(l.pendingQuantity),
      acceptedQuantity: String(l.pendingQuantity), rejectedQuantity: 0, rejectionReason: '', batchNumber: '', expiryDate: '',
    })));
    setStep(2);
  };

  const updateLine = (idx: number, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, ...patch };
      const received = Number(updated.receivedQuantity || 0);
      const accepted = Math.min(Number(updated.acceptedQuantity || 0), received);
      return { ...updated, acceptedQuantity: String(accepted), rejectedQuantity: Math.max(0, received - accepted) };
    }));
  };

  const totalAccepted = lines.reduce((s, l) => {
    const poLine = selectedPO?.lines.find((pl) => pl.id === l.poLineId);
    return s + Number(l.acceptedQuantity || 0) * (poLine?.unitPrice ?? 0);
  }, 0);
  const vatAmount = Math.round(totalAccepted * 0.1);

  const submitReceiving = () => {
    if (!selectedPoId) return;
    receivePOGoods(selectedPoId, {
      receivedBy: receiptInfo.receivedBy, vehiclePlate: receiptInfo.vehiclePlate, driverName: receiptInfo.driverName,
      lines: lines.map((l) => ({
        poLineId: l.poLineId, itemId: l.itemId, itemNameFa: l.itemNameFa,
        receivedQuantity: Number(l.receivedQuantity || 0), acceptedQuantity: Number(l.acceptedQuantity || 0),
        rejectedQuantity: l.rejectedQuantity, rejectionReason: l.rejectionReason || undefined,
        batchNumber: l.batchNumber || undefined, expiryDate: l.expiryDate || undefined,
      })),
    });
    setDone(true);
  };

  const reset = () => { setStep(1); setSelectedPoId(null); setLines([]); setDone(false); };

  if (done) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 py-10">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto"><Check className="w-7 h-7 text-emerald-600" /></div>
        <h2 className="text-lg font-bold text-foreground">دریافت کالا با موفقیت ثبت شد</h2>
        <p className="text-sm text-muted-foreground">GRN در ماژول انبار و سند حسابداری در ماژول مالی به‌طور خودکار ایجاد شدند.</p>
        <div className="flex items-center justify-center gap-3">
          <span className="flex items-center gap-1 text-xs text-accent"><Package className="w-3.5 h-3.5" />مشاهده GRN در انبار</span>
          <span className="flex items-center gap-1 text-xs text-accent"><Landmark className="w-3.5 h-3.5" />مشاهده سند مالی در حسابداری</span>
        </div>
        <button onClick={reset} className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90">ثبت دریافت جدید</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-foreground">دریافت کالا</h1>

      <div className="flex items-center justify-center gap-2">
        {['انتخاب PO', 'اطلاعات دریافت', 'تأیید اقلام', 'تأیید نهایی'].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step === i + 1 ? 'bg-accent text-white' : step > i + 1 ? 'bg-emerald-500 text-white' : 'bg-secondary text-muted-foreground'}`}>{i + 1}</div>
            <span className={`text-xs ${step === i + 1 ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>{label}</span>
            {i < 3 && <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-border bg-secondary/30">{['انتخاب', 'تاریخ تحویل مورد انتظار', 'تعداد اقلام', 'تأمین‌کننده', 'شماره PO'].map((h) => <th key={h} className="text-right py-2.5 px-3 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
            <tbody>
              {pendingPOs.map((po) => (
                <tr key={po.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 cursor-pointer" onClick={() => selectPO(po.id)}>
                  <td className="py-2.5 px-3"><button className="text-[10px] text-accent hover:underline">انتخاب</button></td>
                  <td className="py-2.5 px-3 text-xs text-muted-foreground" dir="ltr">{po.requiredDeliveryDate}</td>
                  <td className="py-2.5 px-3 text-xs font-mono text-muted-foreground" dir="ltr">{po.lines.length}</td>
                  <td className="py-2.5 px-3 text-xs text-foreground">{po.vendorName}</td>
                  <td className="py-2.5 px-3 text-xs font-mono text-primary" dir="ltr">{po.poNumber}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {pendingPOs.length === 0 && <div className="text-center py-10 text-sm text-muted-foreground">PO در انتظار دریافتی نیست</div>}
        </div>
      )}

      {step === 2 && selectedPO && (
        <div className="bg-card rounded-xl border border-border p-5 max-w-md mx-auto space-y-3">
          <div>
            <label className={labelCls}>پلاک خودرو</label>
            <input list="recent-plates" value={receiptInfo.vehiclePlate} onChange={(e) => setReceiptInfo((f) => ({ ...f, vehiclePlate: e.target.value }))} className={inputCls} dir="ltr" />
            <datalist id="recent-plates">{recentPlates.map((p) => <option key={p} value={p} />)}</datalist>
          </div>
          <div><label className={labelCls}>نام راننده</label><input value={receiptInfo.driverName} onChange={(e) => setReceiptInfo((f) => ({ ...f, driverName: e.target.value }))} className={inputCls} dir="rtl" /></div>
          <div>
            <label className={labelCls}>تحویل‌گیرنده</label>
            <select value={receiptInfo.receivedBy} onChange={(e) => setReceiptInfo((f) => ({ ...f, receivedBy: e.target.value }))} className={inputCls} dir="rtl">
              {employees.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setStep(3)} className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 flex items-center justify-center gap-1">ادامه<ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-secondary flex items-center justify-center gap-1"><ChevronRight className="w-4 h-4" />بازگشت</button>
          </div>
        </div>
      )}

      {step === 3 && selectedPO && (
        <div className="space-y-3">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-border bg-secondary/30">{['تاریخ انقضا', 'شماره بچ', 'رد شده', 'پذیرفته‌شده', 'دریافت‌شده', 'کالا'].map((h) => <th key={h} className="text-right py-2 px-2 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {lines.map((l, idx) => (
                  <tr key={l.poLineId} className="border-b border-border/30 last:border-0">
                    <td className="py-2 px-2"><input value={l.expiryDate} onChange={(e) => updateLine(idx, { expiryDate: e.target.value })} placeholder="۱۴۰۴/۰۱/۰۱" className="w-24 bg-secondary border border-border rounded py-1 px-1.5 text-[10px]" dir="rtl" /></td>
                    <td className="py-2 px-2"><input value={l.batchNumber} onChange={(e) => updateLine(idx, { batchNumber: e.target.value })} className="w-20 bg-secondary border border-border rounded py-1 px-1.5 text-[10px]" dir="ltr" /></td>
                    <td className="py-2 px-2 text-[10px] font-mono text-red-600" dir="ltr">{l.rejectedQuantity}</td>
                    <td className="py-2 px-2"><input type="number" value={l.acceptedQuantity} onChange={(e) => updateLine(idx, { acceptedQuantity: e.target.value })} className="w-20 bg-secondary border border-border rounded py-1 px-1.5 text-[10px]" dir="ltr" /></td>
                    <td className="py-2 px-2"><input type="number" value={l.receivedQuantity} onChange={(e) => updateLine(idx, { receivedQuantity: e.target.value })} className="w-20 bg-secondary border border-border rounded py-1 px-1.5 text-[10px]" dir="ltr" /></td>
                    <td className="py-2 px-2 text-[10px] text-foreground">{l.itemNameFa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 max-w-md mx-auto">
            <button onClick={() => setStep(4)} className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 flex items-center justify-center gap-1">ادامه<ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setStep(2)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-secondary flex items-center justify-center gap-1"><ChevronRight className="w-4 h-4" />بازگشت</button>
          </div>
        </div>
      )}

      {step === 4 && selectedPO && (
        <div className="bg-card rounded-xl border border-border p-5 max-w-md mx-auto space-y-3">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="font-mono text-foreground" dir="ltr">{totalAccepted.toLocaleString('fa-IR')}</span><span className="text-muted-foreground">ارزش کالای پذیرفته‌شده</span></div>
            <div className="flex justify-between"><span className="font-mono text-foreground" dir="ltr">{vatAmount.toLocaleString('fa-IR')}</span><span className="text-muted-foreground">مالیات بر ارزش افزوده</span></div>
            <div className="flex justify-between border-t border-border pt-1"><span className="font-mono font-bold text-foreground" dir="ltr">{(totalAccepted + vatAmount).toLocaleString('fa-IR')}</span><span className="text-muted-foreground font-semibold">جمع کل</span></div>
          </div>
          <div className="bg-secondary/30 rounded-lg p-3 text-[11px] space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1"><Package className="w-3.5 h-3.5" />GRN در انبار ایجاد می‌شود</p>
            <p className="font-semibold text-foreground flex items-center gap-1"><Landmark className="w-3.5 h-3.5" />سند زیر در حسابداری صادر می‌شود:</p>
            <p className="text-muted-foreground pr-4">بدهکار: موجودی کالا (۱۱۰۴) + مالیات خرید (۱۳۰۱)</p>
            <p className="text-muted-foreground pr-4">بستانکار: حساب‌های پرداختنی (۲۱۰۱)</p>
          </div>
          <div className="flex gap-2">
            <button onClick={submitReceiving} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500"><Truck className="w-4 h-4" />ثبت دریافت</button>
            <button onClick={() => setStep(3)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-secondary">بازگشت</button>
          </div>
        </div>
      )}
    </div>
  );
}
