import { useState } from 'react';
import { toast } from 'sonner';
import { useInventoryStore } from '../../store';
import { DO_STATUS_CONFIG } from '../../constants';
import { Truck, ChevronLeft, PackageCheck, Send, CheckCircle2 } from 'lucide-react';

export default function DispatchFulfillment() {
  const { dispatchOrders, pickDispatchOrder, packDispatchOrder, shipDispatchOrder, deliverDispatchOrder } = useInventoryStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [shipForm, setShipForm] = useState({ carrierName: '', vehiclePlate: '' });

  const pending = dispatchOrders.filter((d) => d.status === 'pending').length;
  const inProgress = dispatchOrders.filter((d) => ['picking', 'picked', 'packing', 'packed'].includes(d.status)).length;
  const shipped = dispatchOrders.filter((d) => d.status === 'shipped' || d.status === 'delivered').length;

  const handlePick = (id: string) => { pickDispatchOrder(id, 'اپراتور انبار'); toast.success('اقلام انتخاب (Pick) شدند'); };
  const handlePack = (id: string) => { packDispatchOrder(id, 'اپراتور انبار'); toast.success('بسته‌بندی انجام شد'); };
  const handleShip = (id: string) => {
    if (!shipForm.carrierName.trim()) { toast.error('نام حمل‌کننده را وارد کنید'); return; }
    shipDispatchOrder(id, shipForm.carrierName, shipForm.vehiclePlate);
    toast.success('محموله ارسال شد');
    setShipForm({ carrierName: '', vehiclePlate: '' });
  };
  const handleDeliver = (id: string) => { deliverDispatchOrder(id); toast.success('تحویل به مقصد ثبت شد'); };

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-foreground">حواله‌های خروج (Dispatch Orders)</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">در انتظار</p><p className="text-lg font-bold text-amber-600" dir="ltr">{pending}</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">در حال آماده‌سازی</p><p className="text-lg font-bold text-purple-600" dir="ltr">{inProgress}</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">ارسال‌شده</p><p className="text-lg font-bold text-emerald-600" dir="ltr">{shipped}</p></div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="divide-y divide-border">
          {dispatchOrders.map((d) => {
            const statusCfg = DO_STATUS_CONFIG[d.status];
            const isExpanded = expandedId === d.id;
            return (
              <div key={d.id}>
                <div className="p-4 hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : d.id)}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">{d.doNumber}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusCfg.color} ${statusCfg.bg}`}>{statusCfg.fa}</span>
                    </div>
                    <ChevronLeft className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-[-90deg]' : ''}`} />
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-[10px] text-muted-foreground">اقلام: <span className="font-semibold text-foreground" dir="ltr">{d.lineItems.length}</span></span>
                    <span className="text-[10px] text-muted-foreground">بهای تمام‌شده: <span className="font-semibold text-foreground" dir="ltr">{new Intl.NumberFormat('fa-IR').format(d.cogsImpact)} ریال</span></span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-secondary/20 p-4 border-t border-border space-y-3">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          {['بسته‌بندی', 'انتخاب', 'سفارش', 'کالا'].map(h => <th key={h} className="text-right py-2 px-2 text-[10px] font-semibold text-foreground">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {d.lineItems.map((li) => (
                          <tr key={li.id} className="border-b border-border/50 last:border-0">
                            <td className="py-2 px-2 text-[10px] font-mono text-foreground" dir="ltr">{li.packedQuantity}</td>
                            <td className="py-2 px-2 text-[10px] font-mono text-foreground" dir="ltr">{li.pickedQuantity}</td>
                            <td className="py-2 px-2 text-[10px] font-mono text-foreground" dir="ltr">{li.orderedQuantity}</td>
                            <td className="py-2 px-2 text-[10px] text-foreground">{li.itemName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="flex flex-wrap items-center gap-2">
                      {d.status === 'pending' && (
                        <button onClick={() => handlePick(d.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[10px] font-semibold hover:bg-blue-500">
                          <PackageCheck className="w-3 h-3" />انتخاب کالا (Pick)
                        </button>
                      )}
                      {d.status === 'picked' && (
                        <button onClick={() => handlePack(d.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-[10px] font-semibold hover:bg-purple-500">
                          <PackageCheck className="w-3 h-3" />بسته‌بندی
                        </button>
                      )}
                      {d.status === 'packed' && (
                        <div className="flex items-center gap-2">
                          <input placeholder="نام حمل‌کننده" value={shipForm.carrierName} onChange={e => setShipForm(f => ({ ...f, carrierName: e.target.value }))}
                            className="bg-background border border-border rounded-lg py-1.5 px-2 text-[10px] w-28" dir="rtl" />
                          <input placeholder="پلاک خودرو" value={shipForm.vehiclePlate} onChange={e => setShipForm(f => ({ ...f, vehiclePlate: e.target.value }))}
                            className="bg-background border border-border rounded-lg py-1.5 px-2 text-[10px] w-28" dir="ltr" />
                          <button onClick={() => handleShip(d.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-[10px] font-semibold hover:bg-amber-500">
                            <Send className="w-3 h-3" />ارسال محموله
                          </button>
                        </div>
                      )}
                      {d.status === 'shipped' && (
                        <button onClick={() => handleDeliver(d.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-semibold hover:bg-emerald-500">
                          <CheckCircle2 className="w-3 h-3" />ثبت تحویل نهایی
                        </button>
                      )}
                      {d.status === 'delivered' && <span className="text-[10px] text-emerald-700">✓ تحویل داده شد در {d.deliveredAt?.slice(0, 10)}</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {dispatchOrders.length === 0 && <div className="text-center py-10 text-sm text-muted-foreground">حواله خروجی ثبت نشده</div>}
      </div>
    </div>
  );
}
