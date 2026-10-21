import { useState } from 'react';
import { toast } from 'sonner';
import { useInventoryStore } from '../../store';
import { GRN_STATUS_CONFIG } from '../../constants';
import { Plus, Truck, Search, ChevronLeft, Package, X } from 'lucide-react';

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

export default function GRNList() {
  const { grns, items, warehouses, createGrn, acceptGrn, rejectGrn } = useInventoryStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    supplierName: '', warehouseId: warehouses[0]?.id ?? '', receivedBy: '',
    itemId: items[0]?.id ?? '', orderedQuantity: '', receivedQuantity: '', unitCost: '',
  });

  const filteredGRNs = grns.filter(g => {
    if (statusFilter && g.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return g.grnNumber.toLowerCase().includes(s) || g.supplierName.includes(s) || (g.poNumber ?? '').toLowerCase().includes(s);
    }
    return true;
  });

  const pendingInspection = grns.filter(g => g.status === 'pending_inspection').length;
  const acceptedToday = grns.filter(g => g.status === 'accepted').length;
  const valueReceivedToday = grns
    .filter(g => g.status === 'accepted')
    .reduce((s, g) => s + (g.inventoryValueImpact || g.lineItems.reduce((ls, li) => ls + (li.acceptedQuantity || li.receivedQuantity) * li.unitCost, 0)), 0);

  const submitGrn = () => {
    const item = items.find(i => i.id === form.itemId);
    const wh = warehouses.find(w => w.id === form.warehouseId);
    if (!form.supplierName.trim() || !item) { toast.error('تأمین‌کننده و کالا الزامی است'); return; }
    const receivedQty = Number(form.receivedQuantity || 0);
    const unitCost = Number(form.unitCost || item.movingAverageCost || 0);
    createGrn({
      supplierId: 'SUP-NEW', supplierName: form.supplierName,
      warehouseId: form.warehouseId, warehouseName: wh?.nameFa ?? wh?.name ?? '—',
      receivedBy: form.receivedBy || '—',
      inventoryValueImpact: receivedQty * unitCost,
      lineItems: [{
        id: `gli-${Date.now()}`, itemId: item.id, itemName: item.nameFa,
        orderedQuantity: Number(form.orderedQuantity || receivedQty), receivedQuantity: receivedQty,
        acceptedQuantity: receivedQty, rejectedQuantity: 0, unitOfMeasure: item.uom,
        unitCost, totalCost: receivedQty * unitCost, qcStatus: 'pending',
      }],
    });
    toast.success('رسید کالای جدید ثبت شد — در انتظار بازرسی');
    setModalOpen(false);
  };

  const handleAccept = (id: string) => {
    acceptGrn(id);
    toast.success('رسید تأیید شد — موجودی به‌روزرسانی و سند مالی ثبت شد');
  };
  const handleReject = (id: string) => {
    const reason = prompt('دلیل مرجوع کردن کالا را وارد کنید:');
    if (reason === null) return;
    rejectGrn(id, reason || 'نامشخص');
    toast.success('رسید مرجوع شد');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90"><Plus className="w-3.5 h-3.5" /><span>GRN جدید</span></button>
        <h1 className="text-lg font-bold text-foreground">رسید دریافت کالا (GRN)</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">در انتظار بازرسی</p>
          <p className="text-lg font-bold text-amber-600" dir="ltr">{pendingInspection}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">پذیرش شده</p>
          <p className="text-lg font-bold text-emerald-600" dir="ltr">{acceptedToday}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">ارزش دریافتی</p>
          <p className="text-lg font-bold text-foreground" dir="ltr">{new Intl.NumberFormat('fa-IR').format(valueReceivedToday)}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="جستجوی شماره GRN، تأمین‌کننده، PO..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" dir="rtl" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(GRN_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.fa}</option>)}
          </select>
        </div>

        <div className="divide-y divide-border">
          {filteredGRNs.map(grn => {
            const statusCfg = GRN_STATUS_CONFIG[grn.status];
            const isExpanded = expandedId === grn.id;
            const totalValue = grn.inventoryValueImpact || grn.lineItems.reduce((s, li) => s + (li.acceptedQuantity || li.receivedQuantity) * li.unitCost, 0);
            return (
              <div key={grn.id}>
                <div className="p-4 hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : grn.id)}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">{grn.grnNumber}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusCfg.color} ${statusCfg.bg}`}>{statusCfg.fa}</span>
                    </div>
                    <ChevronLeft className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-[-90deg]' : ''}`} />
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-[10px] text-muted-foreground">{grn.supplierName}</span>
                    {grn.poNumber && <span className="text-[10px] text-muted-foreground" dir="ltr">PO: {grn.poNumber}</span>}
                    <span className="text-[10px] text-muted-foreground">{grn.warehouseName}</span>
                    <span className="text-[10px] text-muted-foreground" dir="ltr">{grn.receivedDate}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-muted-foreground">اقلام: <span className="font-semibold text-foreground" dir="ltr">{grn.lineItems.length}</span></span>
                    <span className="text-[10px] text-muted-foreground">ارزش: <span className="font-semibold text-foreground" dir="ltr">{new Intl.NumberFormat('fa-IR').format(totalValue)} ریال</span></span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-secondary/20 p-4 border-t border-border">
                    <p className="text-xs font-bold text-foreground text-right mb-2">اقلام رسید</p>
                    <table className="w-full mb-3">
                      <thead>
                        <tr className="border-b border-border">
                          {['وضعیت بازرسی', 'مبلغ', 'قیمت', 'دریافت', 'سفارش', 'نام کالا'].map(h => (
                            <th key={h} className="text-right py-2 px-2 text-[10px] font-semibold text-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {grn.lineItems.map(li => (
                          <tr key={li.id} className="border-b border-border/50 last:border-0">
                            <td className="py-2 px-2">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${li.qcStatus === 'pass' ? 'text-emerald-700 bg-emerald-50' : li.qcStatus === 'fail' ? 'text-red-700 bg-red-50' : 'text-amber-700 bg-amber-50'}`}>
                                {li.qcStatus === 'pass' ? 'تأیید' : li.qcStatus === 'fail' ? 'مردود' : 'در انتظار'}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-[10px] font-mono text-foreground" dir="ltr">{new Intl.NumberFormat('fa-IR').format(li.receivedQuantity * li.unitCost)}</td>
                            <td className="py-2 px-2 text-[10px] font-mono text-foreground" dir="ltr">{li.unitCost.toLocaleString('fa-IR')}</td>
                            <td className="py-2 px-2 text-[10px] font-mono text-foreground" dir="ltr">{li.receivedQuantity}</td>
                            <td className="py-2 px-2 text-[10px] font-mono text-foreground" dir="ltr">{li.orderedQuantity}</td>
                            <td className="py-2 px-2 text-[10px] text-foreground">{li.itemName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {grn.status === 'pending_inspection' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleAccept(grn.id)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-semibold hover:bg-emerald-500">تأیید بازرسی</button>
                        <button onClick={() => handleReject(grn.id)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-[10px] font-semibold hover:bg-red-500">مرجوع کالا</button>
                      </div>
                    )}
                    {grn.status === 'accepted' && grn.journalVoucherId && (
                      <p className="text-[10px] text-emerald-700">✓ سند حسابداری در ماژول مالی ثبت شد (شناسه: {grn.journalVoucherId})</p>
                    )}
                    {grn.status === 'rejected' && grn.rejectionReason && (
                      <p className="text-[10px] text-red-600">دلیل مرجوعی: {grn.rejectionReason}</p>
                    )}
                    {grn.receivedBy && <p className="text-[10px] text-muted-foreground mt-2">تحویل‌گیرنده: {grn.receivedBy} · تاریخ: {grn.receivedDate}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredGRNs.length === 0 && (
          <div className="text-center py-10">
            <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">موردی یافت نشد</p>
          </div>
        )}
      </div>

      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setModalOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl shadow-2xl p-5 w-[28rem] z-50" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">ثبت رسید کالای جدید (GRN)</p>
            </div>
            <div className="space-y-3">
              <div><label className={labelCls}>تأمین‌کننده</label><input dir="rtl" value={form.supplierName} onChange={e => setForm(f => ({ ...f, supplierName: e.target.value }))} className={inputCls} /></div>
              <div>
                <label className={labelCls}>انبار</label>
                <select dir="rtl" value={form.warehouseId} onChange={e => setForm(f => ({ ...f, warehouseId: e.target.value }))} className={inputCls}>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.nameFa}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>کالا</label>
                <select dir="rtl" value={form.itemId} onChange={e => setForm(f => ({ ...f, itemId: e.target.value }))} className={inputCls}>
                  {items.map(i => <option key={i.id} value={i.id}>{i.nameFa}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>مقدار سفارش</label><input dir="ltr" type="number" value={form.orderedQuantity} onChange={e => setForm(f => ({ ...f, orderedQuantity: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>مقدار دریافتی</label><input dir="ltr" type="number" value={form.receivedQuantity} onChange={e => setForm(f => ({ ...f, receivedQuantity: e.target.value }))} className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>بهای واحد (خالی = بهای میانگین فعلی کالا)</label><input dir="ltr" type="number" value={form.unitCost} onChange={e => setForm(f => ({ ...f, unitCost: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>تحویل‌گیرنده</label><input dir="rtl" value={form.receivedBy} onChange={e => setForm(f => ({ ...f, receivedBy: e.target.value }))} className={inputCls} /></div>
              <button onClick={submitGrn} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors mt-1">ثبت رسید</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
