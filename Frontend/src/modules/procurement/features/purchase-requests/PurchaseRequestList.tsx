import { useState, Fragment } from 'react';
import { toast } from 'sonner';
import { useProcurementStore } from '../../store/useProcurementStore';
import { useInventoryStore } from '@/modules/inventory';
import { useHRStore } from '@/modules/hr';
import { PR_STATUS_CONFIG, PRIORITY_LABELS, PR_SOURCE_CONFIG } from '../../constants';
import { Plus, Search, ChevronLeft, X, Check, Send, RefreshCw } from 'lucide-react';
import type { PRStatus } from '../../types';

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

const PIPELINE: PRStatus[] = ['draft', 'pending_approval', 'approved', 'rfq_sent', 'po_created'];

export default function PurchaseRequestList() {
  const { purchaseRequests, vendors, createPurchaseRequest, approvePurchaseRequest, createRFQ, createPRFromReorderSuggestions } = useProcurementStore();
  const { items } = useInventoryStore();
  const { employees } = useHRStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PRStatus | ''>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [approveModalId, setApproveModalId] = useState<string | null>(null);
  const [rfqModalId, setRfqModalId] = useState<string | null>(null);
  const [reorderPreviewOpen, setReorderPreviewOpen] = useState(false);

  const [form, setForm] = useState<{ requestedBy: string; requiredDate: string; priority: 'normal' | 'urgent' | 'critical'; justification: string; lines: { itemId: string; quantity: string }[] }>({
    requestedBy: employees[0]?.name ?? '', requiredDate: '', priority: 'normal', justification: '',
    lines: [{ itemId: items[0]?.id ?? '', quantity: '' }],
  });
  const [approveLines, setApproveLines] = useState<Record<string, string>>({});
  const [rfqForm, setRfqForm] = useState({ vendorIds: [] as string[], deadline: '' });

  const filtered = purchaseRequests.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (search) return p.prNumber.includes(search) || p.requestedBy.includes(search);
    return true;
  });

  const lowStockItems = items.filter((i) => i.availableQuantity <= i.reorderPoint);

  const submitPR = () => {
    if (!form.requestedBy || form.lines.some((l) => !l.itemId || !l.quantity)) { toast.error('اطلاعات را کامل کنید'); return; }
    const lines = form.lines.map((l) => {
      const item = items.find((i) => i.id === l.itemId);
      return { id: `prl-${Date.now()}-${Math.random()}`, itemId: l.itemId, itemNameFa: item?.nameFa ?? '—', itemSku: item?.sku ?? '', uom: item?.uom ?? 'kg', requestedQuantity: Number(l.quantity), estimatedUnitPrice: item?.lastPurchasePrice ?? 0, totalEstimated: Number(l.quantity) * (item?.lastPurchasePrice ?? 0), requiredDate: form.requiredDate, notes: '' };
    });
    createPurchaseRequest({ requestedBy: form.requestedBy, requestedByDept: employees.find((e) => e.name === form.requestedBy)?.department ?? '—', requiredDate: form.requiredDate, priority: form.priority, justification: form.justification, lines });
    toast.success('درخواست خرید ثبت شد');
    setModalOpen(false);
  };

  const handleApprove = (id: string) => {
    const pr = purchaseRequests.find((p) => p.id === id);
    if (!pr) return;
    const approvedLines = pr.lines.map((l) => ({ lineId: l.id, approvedQuantity: Number(approveLines[l.id] ?? l.requestedQuantity) }));
    approvePurchaseRequest(id, 'مدیر خرید', approvedLines);
    toast.success('درخواست خرید تأیید شد');
    setApproveModalId(null);
  };

  const handleCreateRFQ = () => {
    if (!rfqModalId || rfqForm.vendorIds.length === 0) { toast.error('حداقل یک تأمین‌کننده انتخاب کنید'); return; }
    createRFQ(rfqModalId, rfqForm.vendorIds, rfqForm.deadline);
    setRfqModalId(null);
    setRfqForm({ vendorIds: [], deadline: '' });
  };

  const handleAutoReorder = () => {
    createPRFromReorderSuggestions();
    setReorderPreviewOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90"><Plus className="w-3.5 h-3.5" />درخواست جدید</button>
          <button onClick={() => setReorderPreviewOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-secondary"><RefreshCw className="w-3.5 h-3.5" />بروز خودکار از موجودی</button>
        </div>
        <h1 className="text-lg font-bold text-foreground">درخواست‌های خرید</h1>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between">
          {PIPELINE.map((status, i) => {
            const cfg = PR_STATUS_CONFIG[status];
            const count = purchaseRequests.filter((p) => p.status === status).length;
            return (
              <div key={status} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1"><span className={`text-lg font-bold ${cfg.color}`} dir="ltr">{count}</span><span className="text-[10px] text-muted-foreground">{cfg.fa}</span></div>
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
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as PRStatus | '')} className="px-3 py-2 rounded-lg border border-border bg-background text-xs">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(PR_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.fa}</option>)}
          </select>
        </div>

        <table className="w-full">
          <thead><tr className="border-b border-border bg-secondary/30">{['عملیات', 'اولویت', 'وضعیت', 'مبلغ تخمینی', 'اقلام', 'تاریخ', 'دپارتمان', 'درخواست‌کننده', 'منبع', 'شماره'].map((h) => <th key={h} className="text-right py-2.5 px-3 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((pr) => {
              const statusCfg = PR_STATUS_CONFIG[pr.status];
              const sourceCfg = PR_SOURCE_CONFIG[pr.source];
              const isExp = expandedId === pr.id;
              return (
                <Fragment key={pr.id}>
                  <tr className="border-b border-border/50 last:border-0 hover:bg-secondary/20 cursor-pointer" onClick={() => setExpandedId(isExp ? null : pr.id)}>
                    <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {pr.status === 'pending_approval' && <button onClick={() => setApproveModalId(pr.id)} className="flex items-center gap-1 text-[10px] text-blue-700 hover:underline"><Check className="w-3 h-3" />تأیید</button>}
                        {pr.status === 'approved' && <button onClick={() => setRfqModalId(pr.id)} className="flex items-center gap-1 text-[10px] text-purple-700 hover:underline"><Send className="w-3 h-3" />ارسال استعلام</button>}
                        {pr.status === 'po_created' && <span className="text-[10px] text-emerald-700">مشاهده PO</span>}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[10px]">{PRIORITY_LABELS[pr.priority]}</td>
                    <td className="py-2.5 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusCfg.color} ${statusCfg.bg}`}>{statusCfg.fa}</span></td>
                    <td className="py-2.5 px-3 text-xs font-mono text-foreground" dir="ltr">{pr.totalEstimated.toLocaleString('fa-IR')}</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-muted-foreground" dir="ltr">{pr.lines.length}</td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground" dir="ltr">{pr.requiredDate}</td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground">{pr.requestedByDept}</td>
                    <td className="py-2.5 px-3 text-xs text-foreground">{pr.requestedBy}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-medium ${sourceCfg.color}`}>{sourceCfg.fa}</span>
                      {pr.sourceRef && <span className="text-[9px] text-muted-foreground block" dir="ltr">{pr.sourceRef}</span>}
                    </td>
                    <td className="py-2.5 px-3 text-xs font-mono text-primary flex items-center gap-1" dir="ltr"><ChevronLeft className={`w-3 h-3 transition-transform ${isExp ? '-rotate-90' : ''}`} />{pr.prNumber}</td>
                  </tr>
                  {isExp && (
                    <tr><td colSpan={10} className="bg-secondary/20 p-3">
                      <table className="w-full">
                        <thead><tr className="border-b border-border">{['تاریخ نیاز', 'مبلغ تخمینی', 'قیمت واحد', 'مقدار تأییدشده', 'مقدار', 'کالا'].map((h) => <th key={h} className="text-right py-1.5 px-2 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
                        <tbody>
                          {pr.lines.map((l) => (
                            <tr key={l.id} className="border-b border-border/30 last:border-0">
                              <td className="py-1.5 px-2 text-[10px] text-muted-foreground" dir="ltr">{l.requiredDate}</td>
                              <td className="py-1.5 px-2 text-[10px] font-mono" dir="ltr">{l.totalEstimated.toLocaleString('fa-IR')}</td>
                              <td className="py-1.5 px-2 text-[10px] font-mono" dir="ltr">{l.estimatedUnitPrice.toLocaleString('fa-IR')}</td>
                              <td className="py-1.5 px-2 text-[10px] font-mono" dir="ltr">{l.approvedQuantity ?? '—'}</td>
                              <td className="py-1.5 px-2 text-[10px] font-mono" dir="ltr">{l.requestedQuantity}</td>
                              <td className="py-1.5 px-2 text-[10px] text-foreground">{l.itemNameFa} <span className="text-muted-foreground" dir="ltr">({l.itemSku})</span></td>
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
        {filtered.length === 0 && <div className="text-center py-10 text-sm text-muted-foreground">درخواستی یافت نشد</div>}
      </div>

      {/* Create PR modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-[30rem] max-h-[85vh] overflow-y-auto" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">درخواست خرید جدید</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>درخواست‌کننده</label>
                <select value={form.requestedBy} onChange={(e) => setForm((f) => ({ ...f, requestedBy: e.target.value }))} className={inputCls} dir="rtl">
                  {employees.map((e) => <option key={e.id} value={e.name}>{e.name} — {e.department}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>تاریخ نیاز</label><input value={form.requiredDate} onChange={(e) => setForm((f) => ({ ...f, requiredDate: e.target.value }))} placeholder="۱۴۰۳/۰۵/۱۵" className={inputCls} dir="rtl" /></div>
                <div>
                  <label className={labelCls}>اولویت</label>
                  <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as 'normal' | 'urgent' | 'critical' }))} className={inputCls} dir="rtl">
                    <option value="normal">عادی</option><option value="urgent">فوری</option><option value="critical">بحرانی</option>
                  </select>
                </div>
              </div>
              <div><label className={labelCls}>توجیه</label><textarea value={form.justification} onChange={(e) => setForm((f) => ({ ...f, justification: e.target.value }))} className={inputCls} rows={2} dir="rtl" /></div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <button onClick={() => setForm((f) => ({ ...f, lines: [...f.lines, { itemId: items[0]?.id ?? '', quantity: '' }] }))} className="text-[10px] text-accent hover:underline">+ افزودن قلم</button>
                  <label className={labelCls}>اقلام</label>
                </div>
                {form.lines.map((line, idx) => {
                  const item = items.find((i) => i.id === line.itemId);
                  return (
                    <div key={idx} className="space-y-1 mb-2">
                      <div className="grid grid-cols-2 gap-2">
                        <select value={line.itemId} onChange={(e) => setForm((f) => ({ ...f, lines: f.lines.map((l, i) => i === idx ? { ...l, itemId: e.target.value } : l) }))} className={inputCls} dir="rtl">
                          {items.map((i) => <option key={i.id} value={i.id}>{i.nameFa}</option>)}
                        </select>
                        <input type="number" placeholder="مقدار" value={line.quantity} onChange={(e) => setForm((f) => ({ ...f, lines: f.lines.map((l, i) => i === idx ? { ...l, quantity: e.target.value } : l) }))} className={inputCls} dir="ltr" />
                      </div>
                      <p className="text-[10px] text-muted-foreground">موجودی فعلی: <span dir="ltr">{item?.availableQuantity ?? '—'}</span> — آخرین قیمت خرید: <span dir="ltr">{(item?.lastPurchasePrice ?? 0).toLocaleString('fa-IR')}</span></p>
                    </div>
                  );
                })}
              </div>
              <div className="bg-secondary/30 rounded-lg p-2 text-xs flex justify-between">
                <span className="font-mono font-bold text-foreground" dir="ltr">{form.lines.reduce((s, l) => { const item = items.find((i) => i.id === l.itemId); return s + Number(l.quantity || 0) * (item?.lastPurchasePrice ?? 0); }, 0).toLocaleString('fa-IR')}</span>
                <span className="text-muted-foreground">جمع تخمینی</span>
              </div>
              <button onClick={submitPR} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 mt-1">ثبت درخواست</button>
            </div>
          </div>
        </div>
      )}

      {/* Approve modal */}
      {approveModalId && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setApproveModalId(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-[28rem]" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setApproveModalId(null)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">تأیید درخواست خرید</p>
            </div>
            <div className="space-y-2">
              {purchaseRequests.find((p) => p.id === approveModalId)?.lines.map((l) => (
                <div key={l.id} className="flex items-center gap-2">
                  <input type="number" defaultValue={l.requestedQuantity} onChange={(e) => setApproveLines((v) => ({ ...v, [l.id]: e.target.value }))} className={`${inputCls} w-24`} dir="ltr" />
                  <span className="text-xs text-foreground flex-1">{l.itemNameFa} (درخواست: {l.requestedQuantity})</span>
                </div>
              ))}
              <button onClick={() => handleApprove(approveModalId)} className="w-full py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 mt-2">تأیید نهایی</button>
            </div>
          </div>
        </div>
      )}

      {/* RFQ creation modal */}
      {rfqModalId && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setRfqModalId(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-[26rem]" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setRfqModalId(null)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">ارسال استعلام قیمت</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>انتخاب تأمین‌کنندگان</label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {vendors.filter((v) => v.status === 'active').map((v) => (
                    <label key={v.id} className="flex items-center gap-2 text-xs text-foreground">
                      <input type="checkbox" checked={rfqForm.vendorIds.includes(v.id)} onChange={(e) => setRfqForm((f) => ({ ...f, vendorIds: e.target.checked ? [...f.vendorIds, v.id] : f.vendorIds.filter((id) => id !== v.id) }))} />
                      {v.nameFa} <span className="text-muted-foreground">({v.overallScore})</span>
                    </label>
                  ))}
                </div>
              </div>
              <div><label className={labelCls}>مهلت پاسخ</label><input value={rfqForm.deadline} onChange={(e) => setRfqForm((f) => ({ ...f, deadline: e.target.value }))} placeholder="۱۴۰۳/۰۵/۰۱" className={inputCls} dir="rtl" /></div>
              <button onClick={handleCreateRFQ} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 mt-1">ارسال استعلام</button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-reorder preview */}
      {reorderPreviewOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setReorderPreviewOpen(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-[28rem] max-h-[80vh] overflow-y-auto" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setReorderPreviewOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">اقلام کم‌موجودی (پیش‌نمایش)</p>
            </div>
            <div className="space-y-2 mb-3">
              {lowStockItems.map((i) => (
                <div key={i.id} className="flex items-center justify-between text-xs border-b border-border/30 pb-1">
                  <span className="font-mono text-muted-foreground" dir="ltr">{i.availableQuantity}/{i.reorderPoint}</span>
                  <span className="text-foreground">{i.nameFa}</span>
                </div>
              ))}
              {lowStockItems.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-4">کالایی به نقطه سفارش نرسیده</p>}
            </div>
            <button onClick={handleAutoReorder} disabled={lowStockItems.length === 0} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-40">تأیید و ایجاد درخواست‌ها</button>
          </div>
        </div>
      )}
    </div>
  );
}
