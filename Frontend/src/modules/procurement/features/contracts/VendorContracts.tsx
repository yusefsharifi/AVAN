import { useState, Fragment } from 'react';
import { toast } from 'sonner';
import { useProcurementStore } from '../../store/useProcurementStore';
import { CONTRACT_STATUS_CONFIG, CONTRACT_TYPE_CONFIG } from '../../constants';
import { Plus, Search, ChevronLeft, X, AlertTriangle, RefreshCw, Ban } from 'lucide-react';
import type { ContractStatus, ContractType } from '../../types';

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

export default function VendorContracts() {
  const { contracts, vendors, purchaseOrders, createContract, terminateContract, getExpiringContracts } = useProcurementStore();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContractStatus | ''>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);

  const [form, setForm] = useState({
    vendorId: vendors[0]?.id ?? '', type: 'supply' as ContractType, title: '', description: '', startDate: '', endDate: '',
    totalValue: '', paymentSchedule: '', autoRenew: false, renewalNoticeDays: '30', signatoryCompany: '', signatoryVendor: '',
  });

  const filtered = contracts.filter((c) => {
    if (typeFilter && c.type !== typeFilter) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    if (search) return c.contractNumber.includes(search) || c.vendorName.includes(search) || c.title.includes(search);
    return true;
  });

  const expiring = getExpiringContracts(60);

  const submitContract = () => {
    const vendor = vendors.find((v) => v.id === form.vendorId);
    if (!form.title.trim() || !vendor) { toast.error('اطلاعات را کامل کنید'); return; }
    createContract({
      vendorId: form.vendorId, vendorName: vendor.nameFa, type: form.type, title: form.title, description: form.description,
      startDate: form.startDate, endDate: form.endDate, totalValue: Number(form.totalValue || 0), paymentSchedule: form.paymentSchedule,
      autoRenew: form.autoRenew, renewalNoticeDays: Number(form.renewalNoticeDays || 30), signatoryCompany: form.signatoryCompany, signatoryVendor: form.signatoryVendor,
    });
    toast.success('قرارداد جدید ثبت شد');
    setModalOpen(false);
  };

  const handleTerminate = (id: string) => {
    const reason = prompt('دلیل فسخ قرارداد را وارد کنید:');
    if (reason === null) return;
    terminateContract(id, reason || 'نامشخص');
    toast.success('قرارداد فسخ شد');
  };

  const handleRenew = (id: string) => {
    const c = contracts.find((cc) => cc.id === id);
    if (!c) return;
    createContract({ vendorId: c.vendorId, vendorName: c.vendorName, type: c.type, title: `${c.title} (تمدید)`, description: c.description, startDate: c.endDate, endDate: '—', totalValue: c.totalValue, paymentSchedule: c.paymentSchedule, autoRenew: c.autoRenew, renewalNoticeDays: c.renewalNoticeDays, signatoryCompany: c.signatoryCompany, signatoryVendor: c.signatoryVendor });
    toast.success('قرارداد جدید بر اساس قرارداد قبلی ایجاد شد — لطفاً تاریخ پایان را تکمیل کنید');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90"><Plus className="w-3.5 h-3.5" />قرارداد جدید</button>
        <h1 className="text-lg font-bold text-foreground">قراردادهای تأمین‌کنندگان</h1>
      </div>

      {expiring.length > 0 && !alertDismissed && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-3">
          <button onClick={() => setAlertDismissed(true)} className="text-amber-700 text-xs">×</button>
          <span className="text-xs text-amber-800 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />{expiring.length} قرارداد در ۶۰ روز آینده منقضی می‌شود</span>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو..." className="w-full pr-9 pl-3 py-2 rounded-lg border border-border bg-background text-xs" dir="rtl" />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-background text-xs">
            <option value="">همه انواع</option>
            {Object.entries(CONTRACT_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.fa}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ContractStatus | '')} className="px-3 py-2 rounded-lg border border-border bg-background text-xs">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(CONTRACT_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.fa}</option>)}
          </select>
        </div>

        <table className="w-full">
          <thead><tr className="border-b border-border bg-secondary/30">{['عملیات', 'وضعیت', 'مانده', 'مصرف‌شده', 'ارزش کل', 'تا تاریخ', 'از تاریخ', 'عنوان', 'نوع', 'تأمین‌کننده', 'شماره'].map((h) => <th key={h} className="text-right py-2.5 px-3 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((c) => {
              const cfg = CONTRACT_STATUS_CONFIG[c.status];
              const isExp = expandedId === c.id;
              const consumedPct = c.totalValue ? Math.min(100, Math.round((c.consumedValue / c.totalValue) * 100)) : 0;
              const linkedPOs = purchaseOrders.filter((po) => c.linkedPOIds.includes(po.id));
              return (
                <Fragment key={c.id}>
                  <tr className="border-b border-border/50 last:border-0 hover:bg-secondary/20 cursor-pointer" onClick={() => setExpandedId(isExp ? null : c.id)}>
                    <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                      {c.status !== 'terminated' && c.status !== 'expired' && (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleRenew(c.id)} className="flex items-center gap-1 text-[10px] text-blue-700 hover:underline"><RefreshCw className="w-3 h-3" />تمدید</button>
                          <button onClick={() => handleTerminate(c.id)} className="flex items-center gap-1 text-[10px] text-red-700 hover:underline"><Ban className="w-3 h-3" />فسخ</button>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color} ${cfg.bg}`}>{cfg.fa}</span></td>
                    <td className="py-2.5 px-3 text-xs font-mono text-emerald-600" dir="ltr">{c.remainingValue.toLocaleString('fa-IR')}</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-amber-600" dir="ltr">{c.consumedValue.toLocaleString('fa-IR')}</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-foreground" dir="ltr">{c.totalValue.toLocaleString('fa-IR')}</td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground" dir="ltr">{c.endDate}</td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground" dir="ltr">{c.startDate}</td>
                    <td className="py-2.5 px-3 text-xs text-foreground">{c.title}</td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground">{CONTRACT_TYPE_CONFIG[c.type].fa}</td>
                    <td className="py-2.5 px-3 text-xs text-foreground">{c.vendorName}</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-primary flex items-center gap-1" dir="ltr"><ChevronLeft className={`w-3 h-3 transition-transform ${isExp ? '-rotate-90' : ''}`} />{c.contractNumber}</td>
                  </tr>
                  {isExp && (
                    <tr><td colSpan={11} className="bg-secondary/20 p-4 space-y-3">
                      <div className="text-xs space-y-1">
                        <p><span className="text-muted-foreground">نوع: </span><span className="text-foreground">{CONTRACT_TYPE_CONFIG[c.type].fa}</span> — <span className="text-muted-foreground">امضاکنندگان: </span><span className="text-foreground">{c.signatoryCompany} / {c.signatoryVendor}</span></p>
                        <p><span className="text-muted-foreground">زمان‌بندی پرداخت: </span><span className="text-foreground">{c.paymentSchedule}</span></p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1"><span className="text-[10px] font-semibold text-foreground" dir="ltr">{consumedPct}٪</span><span className="text-[10px] text-muted-foreground">میزان مصرف قرارداد</span></div>
                        <div className="w-full bg-secondary rounded-full h-2"><div className="bg-accent h-2 rounded-full" style={{ width: `${consumedPct}%` }} /></div>
                      </div>
                      {c.milestones.length > 0 && (
                        <table className="w-full">
                          <thead><tr className="border-b border-border">{['وضعیت', 'تاریخ تکمیل', 'ارزش', 'سررسید', 'عنوان'].map((h) => <th key={h} className="text-right py-1 px-2 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
                          <tbody>
                            {c.milestones.map((m) => (
                              <tr key={m.id} className="border-b border-border/30 last:border-0">
                                <td className="py-1 px-2 text-[10px]">{m.status === 'completed' ? 'تکمیل' : m.status === 'overdue' ? 'عقب‌افتاده' : 'در انتظار'}</td>
                                <td className="py-1 px-2 text-[10px] text-muted-foreground" dir="ltr">{m.completedDate ?? '—'}</td>
                                <td className="py-1 px-2 text-[10px] font-mono" dir="ltr">{m.value.toLocaleString('fa-IR')}</td>
                                <td className="py-1 px-2 text-[10px] text-muted-foreground" dir="ltr">{m.dueDate}</td>
                                <td className="py-1 px-2 text-[10px] text-foreground">{m.title}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      {linkedPOs.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-foreground mb-1">سفارشات مرتبط</p>
                          {linkedPOs.map((po) => <p key={po.id} className="text-[10px] text-muted-foreground" dir="ltr">{po.poNumber} — {po.grandTotal.toLocaleString('fa-IR')} — {po.orderDate}</p>)}
                        </div>
                      )}
                    </td></tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-10 text-sm text-muted-foreground">قراردادی یافت نشد</div>}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-[30rem] max-h-[85vh] overflow-y-auto" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">قرارداد جدید</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>تأمین‌کننده</label>
                <select value={form.vendorId} onChange={(e) => setForm((f) => ({ ...f, vendorId: e.target.value }))} className={inputCls} dir="rtl">
                  {vendors.filter((v) => v.status === 'active').map((v) => <option key={v.id} value={v.id}>{v.nameFa}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>عنوان</label><input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputCls} dir="rtl" /></div>
                <div>
                  <label className={labelCls}>نوع</label>
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ContractType }))} className={inputCls} dir="rtl">
                    {Object.entries(CONTRACT_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.fa}</option>)}
                  </select>
                </div>
              </div>
              <div><label className={labelCls}>شرح</label><textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} rows={2} dir="rtl" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>تاریخ شروع</label><input value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} placeholder="۱۴۰۳/۰۵/۰۱" className={inputCls} dir="rtl" /></div>
                <div><label className={labelCls}>تاریخ پایان</label><input value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} placeholder="۱۴۰۴/۰۵/۰۱" className={inputCls} dir="rtl" /></div>
              </div>
              <div><label className={labelCls}>ارزش کل قرارداد</label><input type="number" value={form.totalValue} onChange={(e) => setForm((f) => ({ ...f, totalValue: e.target.value }))} className={inputCls} dir="ltr" /></div>
              <div><label className={labelCls}>زمان‌بندی پرداخت</label><input value={form.paymentSchedule} onChange={(e) => setForm((f) => ({ ...f, paymentSchedule: e.target.value }))} className={inputCls} dir="rtl" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>امضاکننده شرکت</label><input value={form.signatoryCompany} onChange={(e) => setForm((f) => ({ ...f, signatoryCompany: e.target.value }))} className={inputCls} dir="rtl" /></div>
                <div><label className={labelCls}>امضاکننده تأمین‌کننده</label><input value={form.signatoryVendor} onChange={(e) => setForm((f) => ({ ...f, signatoryVendor: e.target.value }))} className={inputCls} dir="rtl" /></div>
              </div>
              <label className="flex items-center gap-2 text-xs text-foreground"><input type="checkbox" checked={form.autoRenew} onChange={(e) => setForm((f) => ({ ...f, autoRenew: e.target.checked }))} />تمدید خودکار</label>
              <button onClick={submitContract} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 mt-1">ثبت قرارداد</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
