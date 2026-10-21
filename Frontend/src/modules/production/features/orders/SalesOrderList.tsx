import { useState, Fragment } from 'react';
import { toast } from 'sonner';
import { useProductionStore } from '../../store/useProductionStore';
import { useInventoryStore } from '@/modules/inventory';
import { ORDER_STATUS_CONFIG, PRIORITY_CONFIG } from '../../constants';
import { Plus, Search, ChevronLeft, Check, Factory, X } from 'lucide-react';
import type { OrderPriority, OrderStatus } from '../../types';

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

export default function SalesOrderList() {
  const { salesOrders, productionLines, createSalesOrder, confirmSalesOrder, createWorkOrder } = useProductionStore();
  const { items } = useInventoryStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<OrderPriority | ''>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [woModalOrder, setWoModalOrder] = useState<string | null>(null);

  const [form, setForm] = useState({
    customerName: '', requiredDate: '', priority: 'normal' as OrderPriority,
    lines: [{ itemId: items[0]?.id ?? '', quantity: '', unitPrice: '' }],
  });
  const [woForm, setWoForm] = useState({ lineId: productionLines[0]?.id ?? '', scheduledStart: '', scheduledEnd: '' });

  const filtered = salesOrders.filter((o) => {
    if (statusFilter && o.status !== statusFilter) return false;
    if (priorityFilter && o.priority !== priorityFilter) return false;
    if (search) return o.orderNumber.includes(search) || o.customerName.includes(search);
    return true;
  });

  const stats = {
    total: salesOrders.length,
    pending: salesOrders.filter((o) => o.status === 'confirmed').length,
    inProduction: salesOrders.filter((o) => o.status === 'in_production').length,
    completed: salesOrders.filter((o) => o.status === 'completed').length,
  };

  const submitOrder = () => {
    if (!form.customerName.trim() || form.lines.some((l) => !l.itemId || !l.quantity)) { toast.error('نام مشتری و حداقل یک قلم سفارش الزامی است'); return; }
    const lines = form.lines.map((l) => {
      const item = items.find((i) => i.id === l.itemId);
      return { id: `ol-${Date.now()}-${Math.random()}`, itemId: l.itemId, itemNameFa: item?.nameFa ?? '—', itemSku: item?.sku ?? '', quantity: Number(l.quantity), uom: item?.uom ?? 'piece', unitPrice: Number(l.unitPrice || 0), totalPrice: 0, deliveredQuantity: 0, status: 'pending' as const };
    });
    createSalesOrder({ customerName: form.customerName, requiredDate: form.requiredDate, priority: form.priority, lines });
    toast.success('سفارش فروش جدید ثبت شد');
    setModalOpen(false);
    setForm({ customerName: '', requiredDate: '', priority: 'normal', lines: [{ itemId: items[0]?.id ?? '', quantity: '', unitPrice: '' }] });
  };

  const submitWorkOrder = () => {
    const order = salesOrders.find((o) => o.id === woModalOrder);
    if (!order) return;
    createWorkOrder({
      salesOrderId: order.id, itemId: order.lines[0]?.itemId, itemNameFa: order.lines[0]?.itemNameFa,
      itemSku: order.lines[0]?.itemSku, plannedQuantity: order.lines[0]?.quantity, uom: order.lines[0]?.uom,
      lineId: woForm.lineId, scheduledStart: woForm.scheduledStart, scheduledEnd: woForm.scheduledEnd, priority: order.priority,
    });
    toast.success('دستور کار جدید ایجاد شد');
    setWoModalOrder(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90"><Plus className="w-3.5 h-3.5" /><span>سفارش جدید</span></button>
        <h1 className="text-lg font-bold text-foreground">سفارشات فروش</h1>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">کل سفارشات</p><p className="text-lg font-bold text-foreground" dir="ltr">{stats.total}</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">در انتظار تأیید</p><p className="text-lg font-bold text-blue-600" dir="ltr">{stats.pending}</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">در تولید</p><p className="text-lg font-bold text-amber-600" dir="ltr">{stats.inProduction}</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">تکمیل‌شده</p><p className="text-lg font-bold text-emerald-600" dir="ltr">{stats.completed}</p></div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی شماره سفارش، مشتری..." className="w-full pr-9 pl-3 py-2 rounded-lg border border-border bg-background text-xs focus:outline-none" dir="rtl" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')} className="px-3 py-2 rounded-lg border border-border bg-background text-xs">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(ORDER_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.fa}</option>)}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as OrderPriority | '')} className="px-3 py-2 rounded-lg border border-border bg-background text-xs">
            <option value="">همه اولویت‌ها</option>
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.fa}</option>)}
          </select>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {['عملیات', 'اولویت', 'وضعیت', 'ارزش کل', 'اقلام', 'تاریخ تحویل', 'تاریخ سفارش', 'مشتری', 'شماره سفارش'].map((h) => (
                <th key={h} className="text-right py-2.5 px-3 text-[10px] font-semibold text-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => {
              const statusCfg = ORDER_STATUS_CONFIG[o.status];
              const priorityCfg = PRIORITY_CONFIG[o.priority];
              const isExpanded = expandedId === o.id;
              return (
                <Fragment key={o.id}>
                  <tr className="border-b border-border/50 last:border-0 hover:bg-secondary/20 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : o.id)}>
                    <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {o.status === 'confirmed' && (
                          <button onClick={() => setWoModalOrder(o.id)} className="flex items-center gap-1 text-[10px] text-purple-700 hover:underline"><Factory className="w-3 h-3" />ایجاد دستور کار</button>
                        )}
                        {o.status === 'draft' && (
                          <button onClick={() => { confirmSalesOrder(o.id); toast.success('سفارش تأیید شد'); }} className="flex items-center gap-1 text-[10px] text-blue-700 hover:underline"><Check className="w-3 h-3" />تأیید</button>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${priorityCfg.color} ${priorityCfg.bg}`}>{priorityCfg.fa}</span></td>
                    <td className="py-2.5 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusCfg.color} ${statusCfg.bg}`}>{statusCfg.fa}</span></td>
                    <td className="py-2.5 px-3 text-xs font-mono text-foreground" dir="ltr">{o.totalValue.toLocaleString('fa-IR')}</td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground" dir="ltr">{o.lines.length}</td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground" dir="ltr">{o.requiredDate}</td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground" dir="ltr">{o.orderDate}</td>
                    <td className="py-2.5 px-3 text-xs text-foreground">{o.customerName}</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-primary flex items-center gap-1" dir="ltr"><ChevronLeft className={`w-3 h-3 transition-transform ${isExpanded ? '-rotate-90' : ''}`} />{o.orderNumber}</td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={9} className="bg-secondary/20 p-3">
                        <table className="w-full">
                          <thead><tr className="border-b border-border">{['وضعیت', 'تحویل‌شده', 'مقدار', 'کالا'].map((h) => <th key={h} className="text-right py-1.5 px-2 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
                          <tbody>
                            {o.lines.map((l) => (
                              <tr key={l.id} className="border-b border-border/30 last:border-0">
                                <td className="py-1.5 px-2 text-[10px] text-muted-foreground">{l.status}</td>
                                <td className="py-1.5 px-2 text-[10px] font-mono" dir="ltr">{l.deliveredQuantity}/{l.quantity}</td>
                                <td className="py-1.5 px-2 text-[10px] font-mono" dir="ltr">{l.quantity} {l.uom}</td>
                                <td className="py-1.5 px-2 text-[10px] text-foreground">{l.itemNameFa}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-10 text-sm text-muted-foreground">سفارشی یافت نشد</div>}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-[32rem] max-h-[85vh] overflow-y-auto" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">سفارش فروش جدید</p>
            </div>
            <div className="space-y-3">
              <div><label className={labelCls}>نام مشتری</label><input value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} className={inputCls} dir="rtl" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>تاریخ تحویل</label><input value={form.requiredDate} onChange={(e) => setForm((f) => ({ ...f, requiredDate: e.target.value }))} placeholder="۱۴۰۳/۰۵/۱۵" className={inputCls} dir="rtl" /></div>
                <div>
                  <label className={labelCls}>اولویت</label>
                  <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as OrderPriority }))} className={inputCls} dir="rtl">
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.fa}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <button onClick={() => setForm((f) => ({ ...f, lines: [...f.lines, { itemId: items[0]?.id ?? '', quantity: '', unitPrice: '' }] }))} className="text-[10px] text-accent hover:underline">+ افزودن قلم</button>
                  <label className={labelCls}>اقلام سفارش</label>
                </div>
                {form.lines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2 mb-2">
                    <select value={line.itemId} onChange={(e) => setForm((f) => ({ ...f, lines: f.lines.map((l, i) => i === idx ? { ...l, itemId: e.target.value } : l) }))} className={inputCls} dir="rtl">
                      {items.map((i) => <option key={i.id} value={i.id}>{i.nameFa}</option>)}
                    </select>
                    <input type="number" placeholder="مقدار" value={line.quantity} onChange={(e) => setForm((f) => ({ ...f, lines: f.lines.map((l, i) => i === idx ? { ...l, quantity: e.target.value } : l) }))} className={inputCls} dir="ltr" />
                    <input type="number" placeholder="قیمت واحد" value={line.unitPrice} onChange={(e) => setForm((f) => ({ ...f, lines: f.lines.map((l, i) => i === idx ? { ...l, unitPrice: e.target.value } : l) }))} className={inputCls} dir="ltr" />
                  </div>
                ))}
              </div>
              <button onClick={submitOrder} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 mt-1">ثبت سفارش</button>
            </div>
          </div>
        </div>
      )}

      {woModalOrder && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setWoModalOrder(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-[26rem]" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setWoModalOrder(null)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">ایجاد دستور کار</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>خط تولید</label>
                <select value={woForm.lineId} onChange={(e) => setWoForm((f) => ({ ...f, lineId: e.target.value }))} className={inputCls} dir="rtl">
                  {productionLines.map((l) => <option key={l.id} value={l.id}>{l.nameFa}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>شروع برنامه‌ریزی‌شده</label><input value={woForm.scheduledStart} onChange={(e) => setWoForm((f) => ({ ...f, scheduledStart: e.target.value }))} placeholder="۱۴۰۳/۰۵/۰۱" className={inputCls} dir="rtl" /></div>
                <div><label className={labelCls}>پایان برنامه‌ریزی‌شده</label><input value={woForm.scheduledEnd} onChange={(e) => setWoForm((f) => ({ ...f, scheduledEnd: e.target.value }))} placeholder="۱۴۰۳/۰۵/۱۰" className={inputCls} dir="rtl" /></div>
              </div>
              <button onClick={submitWorkOrder} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 mt-1">ایجاد دستور کار</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
