import { useState, Fragment } from 'react';
import { toast } from 'sonner';
import { useProcurementStore } from '../../store/useProcurementStore';
import { useFinanceStore } from '@/modules/finance';
import { ProcurementTimeline } from '../../components';
import { PO_STATUS_CONFIG } from '../../constants';
import { Search, ChevronLeft, X, Check, Send, PackageCheck, Wallet, Landmark } from 'lucide-react';
import type { POStatus } from '../../types';

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

const PIPELINE: POStatus[] = ['draft', 'approved', 'sent', 'partially_received', 'fully_received', 'invoiced', 'paid'];

export default function PurchaseOrderList() {
  const { purchaseOrders, vendors, approvePurchaseOrder, sendPurchaseOrder, recordPayment } = useProcurementStore();
  const { vouchers } = useFinanceStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<POStatus | ''>('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [payModalId, setPayModalId] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({ amount: '', paymentDate: '', referenceNumber: '' });

  const filtered = purchaseOrders.filter((po) => {
    if (statusFilter && po.status !== statusFilter) return false;
    if (vendorFilter && po.vendorId !== vendorFilter) return false;
    if (search) return po.poNumber.includes(search) || po.vendorName.includes(search);
    return true;
  });

  const drawerPO = purchaseOrders.find((p) => p.id === drawerId);
  const drawerVoucher = vouchers.find((v) => v.id === drawerPO?.glJournalVoucherId);

  const handlePay = () => {
    if (!payModalId) return;
    recordPayment(payModalId, Number(payForm.amount || 0), payForm.paymentDate, payForm.referenceNumber);
    setPayModalId(null);
    setPayForm({ amount: '', paymentDate: '', referenceNumber: '' });
  };

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-foreground">سفارشات خرید (PO)</h1>

      <div className="bg-card rounded-xl border border-border p-4 overflow-x-auto">
        <div className="flex items-center min-w-[700px]">
          {PIPELINE.map((status, i) => {
            const cfg = PO_STATUS_CONFIG[status];
            const count = purchaseOrders.filter((po) => po.status === status).length;
            return (
              <div key={status} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1"><span className={`text-base font-bold ${cfg.color}`} dir="ltr">{count}</span><span className="text-[9px] text-muted-foreground">{cfg.fa}</span></div>
                {i < PIPELINE.length - 1 && <div className="h-px flex-1 bg-border" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو..." className="w-full pr-9 pl-3 py-2 rounded-lg border border-border bg-background text-xs" dir="rtl" />
          </div>
          <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-background text-xs">
            <option value="">همه تأمین‌کنندگان</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.nameFa}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as POStatus | '')} className="px-3 py-2 rounded-lg border border-border bg-background text-xs">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(PO_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.fa}</option>)}
          </select>
        </div>

        <table className="w-full">
          <thead><tr className="border-b border-border bg-secondary/30">{['عملیات', 'وضعیت', 'مانده', 'پرداخت‌شده', 'مبلغ کل', 'تاریخ تحویل', 'تاریخ', 'شماره RFQ', 'تأمین‌کننده', 'شماره PO'].map((h) => <th key={h} className="text-right py-2.5 px-3 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((po) => {
              const cfg = PO_STATUS_CONFIG[po.status];
              const isExp = expandedId === po.id;
              return (
                <Fragment key={po.id}>
                  <tr className="border-b border-border/50 last:border-0 hover:bg-secondary/20 cursor-pointer" onClick={() => setExpandedId(isExp ? null : po.id)}>
                    <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {po.status === 'draft' && <button onClick={() => { approvePurchaseOrder(po.id, 'مدیر خرید'); toast.success('PO تأیید شد'); }} className="flex items-center gap-1 text-[10px] text-blue-700 hover:underline"><Check className="w-3 h-3" />تأیید</button>}
                        {po.status === 'approved' && <button onClick={() => sendPurchaseOrder(po.id)} className="flex items-center gap-1 text-[10px] text-purple-700 hover:underline"><Send className="w-3 h-3" />ارسال</button>}
                        {(po.status === 'sent' || po.status === 'partially_received') && <span className="flex items-center gap-1 text-[10px] text-amber-700"><PackageCheck className="w-3 h-3" />در «دریافت کالا» ثبت کنید</span>}
                        {(po.status === 'fully_received' || po.status === 'invoiced') && <button onClick={() => setPayModalId(po.id)} className="flex items-center gap-1 text-[10px] text-emerald-700 hover:underline"><Wallet className="w-3 h-3" />ثبت پرداخت</button>}
                        <button onClick={() => setDrawerId(po.id)} className="text-[10px] text-muted-foreground hover:underline">جزئیات</button>
                      </div>
                    </td>
                    <td className="py-2.5 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color} ${cfg.bg}`}>{cfg.fa}</span></td>
                    <td className="py-2.5 px-3 text-xs font-mono text-red-600" dir="ltr">{po.balanceDue.toLocaleString('fa-IR')}</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-emerald-600" dir="ltr">{po.paidAmount.toLocaleString('fa-IR')}</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-foreground" dir="ltr">{po.grandTotal.toLocaleString('fa-IR')}</td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground" dir="ltr">{po.requiredDeliveryDate}</td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground" dir="ltr">{po.orderDate}</td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground" dir="ltr">{po.rfqNumber ?? '—'}</td>
                    <td className="py-2.5 px-3 text-xs text-foreground">{po.vendorName}</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-primary flex items-center gap-1" dir="ltr"><ChevronLeft className={`w-3 h-3 transition-transform ${isExp ? '-rotate-90' : ''}`} />{po.poNumber}</td>
                  </tr>
                  {isExp && (
                    <tr><td colSpan={10} className="bg-secondary/20 p-3">
                      <table className="w-full">
                        <thead><tr className="border-b border-border">{['جمع با مالیات', 'قیمت واحد', 'در انتظار', 'دریافت‌شده', 'سفارش', 'کالا'].map((h) => <th key={h} className="text-right py-1.5 px-2 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
                        <tbody>
                          {po.lines.map((l) => (
                            <tr key={l.id} className="border-b border-border/30 last:border-0">
                              <td className="py-1.5 px-2 text-[10px] font-mono" dir="ltr">{l.lineTotalWithVat.toLocaleString('fa-IR')}</td>
                              <td className="py-1.5 px-2 text-[10px] font-mono" dir="ltr">{l.unitPrice.toLocaleString('fa-IR')}</td>
                              <td className="py-1.5 px-2 text-[10px] font-mono" dir="ltr">{l.pendingQuantity}</td>
                              <td className="py-1.5 px-2 text-[10px] font-mono" dir="ltr">{l.receivedQuantity}</td>
                              <td className="py-1.5 px-2 text-[10px] font-mono" dir="ltr">{l.orderedQuantity}</td>
                              <td className="py-1.5 px-2 text-[10px] text-foreground">{l.itemNameFa}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td></tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-10 text-sm text-muted-foreground">سفارشی یافت نشد</div>}
      </div>

      {/* Detail drawer */}
      {drawerPO && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setDrawerId(null)} />
          <div className="fixed top-0 left-0 bottom-0 w-[28rem] bg-card border-l border-border z-50 overflow-y-auto p-5" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setDrawerId(null)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">{drawerPO.poNumber}</p>
            </div>
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-secondary/30 rounded-lg p-2"><p className="text-muted-foreground">تأمین‌کننده</p><p className="font-semibold text-foreground">{drawerPO.vendorName}</p></div>
                <div className="bg-secondary/30 rounded-lg p-2"><p className="text-muted-foreground">مبلغ کل</p><p className="font-semibold text-foreground" dir="ltr">{drawerPO.grandTotal.toLocaleString('fa-IR')}</p></div>
              </div>

              {drawerVoucher ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                  <p className="flex items-center gap-1 text-emerald-800 font-semibold mb-1"><Landmark className="w-3.5 h-3.5" />ثبت شده در حسابداری</p>
                  <p className="text-emerald-700">سند {drawerVoucher.voucherNumber} — مبلغ <span dir="ltr">{drawerVoucher.totalDebit.toLocaleString('fa-IR')}</span> — {drawerVoucher.status}</p>
                </div>
              ) : <p className="text-muted-foreground">هنوز سند مالی صادر نشده</p>}

              <div>
                <p className="font-bold text-foreground mb-2">مسیر فرآیند</p>
                <ProcurementTimeline prId={drawerPO.prId} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Payment modal */}
      {payModalId && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setPayModalId(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-[26rem]" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setPayModalId(null)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">ثبت پرداخت</p>
            </div>
            <div className="space-y-3">
              <div><label className={labelCls}>مبلغ</label><input type="number" value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))} className={inputCls} dir="ltr" /></div>
              <div><label className={labelCls}>تاریخ پرداخت</label><input value={payForm.paymentDate} onChange={(e) => setPayForm((f) => ({ ...f, paymentDate: e.target.value }))} placeholder="۱۴۰۳/۰۵/۰۱" className={inputCls} dir="rtl" /></div>
              <div><label className={labelCls}>شماره سند بانکی</label><input value={payForm.referenceNumber} onChange={(e) => setPayForm((f) => ({ ...f, referenceNumber: e.target.value }))} className={inputCls} dir="ltr" /></div>
              <button onClick={handlePay} className="w-full py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 mt-1">ثبت پرداخت</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
