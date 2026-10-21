import { useState } from 'react';
import { toast } from 'sonner';
import { useInventoryStore } from '../../store';
import { MR_STATUS_CONFIG, MR_PRIORITY_CONFIG } from '../../constants';
import { Plus, ClipboardList, Search, ChevronLeft, Send, Package, Check, X } from 'lucide-react';

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

export default function RequisitionList() {
  const { requisitions, items, createRequisition, approveRequisition, startPicking, issueRequisition } = useInventoryStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    requesterName: '', departmentId: '', itemId: items[0]?.id ?? '', requestedQuantity: '',
    purpose: 'production' as const, requiredDate: '',
  });

  const filteredMRs = requisitions.filter(m => {
    if (statusFilter && m.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return m.mrNumber.toLowerCase().includes(s) || m.requesterName.includes(s) || m.departmentId.includes(s);
    }
    return true;
  });

  const pendingApproval = requisitions.filter(m => m.status === 'pending_approval').length;
  const inPicking = requisitions.filter(m => m.status === 'picking').length;
  const issuedTotal = requisitions.filter(m => m.status === 'issued').length;

  const submitMr = () => {
    const item = items.find(i => i.id === form.itemId);
    if (!form.requesterName.trim() || !item) { toast.error('نام درخواست‌کننده و کالا الزامی است'); return; }
    const qty = Number(form.requestedQuantity || 0);
    createRequisition({
      requesterName: form.requesterName, departmentId: form.departmentId || 'واحد تولید',
      purpose: form.purpose, requiredDate: form.requiredDate || undefined,
      totalEstimatedCost: qty * item.movingAverageCost,
      lineItems: [{ id: `mli-${Date.now()}`, itemId: item.id, itemName: item.nameFa, requestedQuantity: qty, issuedQuantity: 0, uom: item.uom, allocatedLotIds: [], pickedLocationIds: [], status: 'pending' }],
    });
    toast.success('درخواست کالا ثبت شد — در انتظار تأیید');
    setModalOpen(false);
  };

  const handleApprove = (id: string) => { approveRequisition(id, 'مدیر انبار'); toast.success('درخواست تأیید شد'); };
  const handleStartPicking = (id: string) => { startPicking(id); toast.success('آماده‌سازی کالا آغاز شد'); };
  const handleIssue = (id: string) => { issueRequisition(id); toast.success('کالا صادر شد — موجودی کسر و سند بهای تمام‌شده در ماژول مالی ثبت شد'); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90"><Plus className="w-3.5 h-3.5" /><span>درخواست جدید</span></button>
        <h1 className="text-lg font-bold text-foreground">درخواست مواد (MR)</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">در انتظار تأیید</p>
          <p className="text-lg font-bold text-amber-600" dir="ltr">{pendingApproval}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">در حال آماده‌سازی</p>
          <p className="text-lg font-bold text-purple-600" dir="ltr">{inPicking}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">تحویل شده</p>
          <p className="text-lg font-bold text-emerald-600" dir="ltr">{issuedTotal}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="جستجوی شماره MR، درخواست‌کننده، واحد..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" dir="rtl" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(MR_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.fa}</option>)}
          </select>
        </div>

        <div className="divide-y divide-border">
          {filteredMRs.map(mr => {
            const statusCfg = MR_STATUS_CONFIG[mr.status];
            const priorityCfg = MR_PRIORITY_CONFIG[mr.priority];
            const isExpanded = expandedId === mr.id;
            return (
              <div key={mr.id}>
                <div className="p-4 hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : mr.id)}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">{mr.mrNumber}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusCfg.color} ${statusCfg.bg}`}>{statusCfg.fa}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${priorityCfg.color} ${priorityCfg.bg}`}>{priorityCfg.fa}</span>
                    </div>
                    <ChevronLeft className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-[-90deg]' : ''}`} />
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-[10px] text-muted-foreground">{mr.requesterName}</span>
                    <span className="text-[10px] text-muted-foreground">{mr.departmentId}</span>
                    <span className="text-[10px] text-muted-foreground" dir="ltr">{mr.requiredDate}</span>
                    <span className="text-[10px] text-muted-foreground">اقلام: <span className="font-semibold text-foreground" dir="ltr">{mr.lineItems.length}</span></span>
                    <span className="text-[10px] text-muted-foreground">ارزش: <span className="font-semibold text-foreground" dir="ltr">{new Intl.NumberFormat('fa-IR').format(mr.totalEstimatedCost)} ریال</span></span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-secondary/20 p-4 border-t border-border">
                    <p className="text-xs font-bold text-foreground text-right mb-2">اقلام درخواست</p>
                    <table className="w-full mb-3">
                      <thead>
                        <tr className="border-b border-border">
                          {['وضعیت', 'صادر شده', 'درخواست', 'نام کالا'].map(h => (
                            <th key={h} className="text-right py-2 px-2 text-[10px] font-semibold text-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {mr.lineItems.map(li => (
                          <tr key={li.id} className="border-b border-border/50 last:border-0">
                            <td className="py-2 px-2 text-[10px] text-muted-foreground">{li.status}</td>
                            <td className="py-2 px-2 text-[10px] font-mono text-foreground" dir="ltr">{li.issuedQuantity}</td>
                            <td className="py-2 px-2 text-[10px] font-mono text-foreground" dir="ltr">{li.requestedQuantity}</td>
                            <td className="py-2 px-2 text-[10px] text-foreground">{li.itemName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex gap-2">
                      {mr.status === 'pending_approval' && (
                        <button onClick={() => handleApprove(mr.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[10px] font-semibold hover:bg-blue-500">
                          <Check className="w-3 h-3" /><span>تأیید درخواست</span>
                        </button>
                      )}
                      {mr.status === 'approved' && (
                        <button onClick={() => handleStartPicking(mr.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-[10px] font-semibold hover:bg-purple-500">
                          <Send className="w-3 h-3" /><span>آغاز آماده‌سازی</span>
                        </button>
                      )}
                      {mr.status === 'picking' && (
                        <button onClick={() => handleIssue(mr.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-semibold hover:bg-emerald-500">
                          <Package className="w-3 h-3" /><span>تکمیل صدور</span>
                        </button>
                      )}
                    </div>
                    {mr.status === 'issued' && <p className="text-[10px] text-emerald-700 mt-2">✓ صادر شده در {mr.issuedDate}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredMRs.length === 0 && (
          <div className="text-center py-10">
            <ClipboardList className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
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
              <p className="text-sm font-bold text-foreground">درخواست کالا جدید (MR)</p>
            </div>
            <div className="space-y-3">
              <div><label className={labelCls}>درخواست‌کننده</label><input dir="rtl" value={form.requesterName} onChange={e => setForm(f => ({ ...f, requesterName: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>واحد سازمانی</label><input dir="rtl" value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))} placeholder="مثال: خط تولید ۱" className={inputCls} /></div>
              <div>
                <label className={labelCls}>کالا</label>
                <select dir="rtl" value={form.itemId} onChange={e => setForm(f => ({ ...f, itemId: e.target.value }))} className={inputCls}>
                  {items.map(i => <option key={i.id} value={i.id}>{i.nameFa}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>مقدار درخواستی</label><input dir="ltr" type="number" value={form.requestedQuantity} onChange={e => setForm(f => ({ ...f, requestedQuantity: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>تاریخ نیاز</label><input dir="ltr" type="date" value={form.requiredDate} onChange={e => setForm(f => ({ ...f, requiredDate: e.target.value }))} className={inputCls} /></div>
              </div>
              <button onClick={submitMr} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors mt-1">ثبت درخواست</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
