import { useState } from 'react';
import { toast } from 'sonner';
import { useProductionStore } from '../../store/useProductionStore';
import { useHRStore } from '@/modules/hr';
import { WORK_ORDER_STATUS_CONFIG, PRIORITY_CONFIG, SHIFT_CONFIG } from '../../constants';
import { Plus, Search, Play, PauseCircle, CheckCircle2, Send, X } from 'lucide-react';
import type { WorkOrderStatus } from '../../types';

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

const PIPELINE: WorkOrderStatus[] = ['planned', 'released', 'in_progress', 'completed'];

export default function WorkOrderList() {
  const { workOrders, boms, updateWorkOrderStatus, releaseWorkOrder } = useProductionStore();
  const { employees } = useHRStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | ''>('');
  const [drawerWoId, setDrawerWoId] = useState<string | null>(null);
  const [completeModalId, setCompleteModalId] = useState<string | null>(null);
  const [completeForm, setCompleteForm] = useState({ actualQuantity: '', scrapQuantity: '' });

  const filtered = workOrders.filter((w) => {
    if (statusFilter && w.status !== statusFilter) return false;
    if (search) return w.workOrderNumber.includes(search) || w.itemNameFa.includes(search) || w.salesOrderNumber.includes(search);
    return true;
  });

  const drawerWo = workOrders.find((w) => w.id === drawerWoId);
  const drawerBom = boms.find((b) => b.id === drawerWo?.bomId);
  const lineEmployees = employees.filter((e) => e.department === drawerWo?.lineName);

  const handleRelease = (id: string) => releaseWorkOrder(id);
  const handleStart = (id: string) => { updateWorkOrderStatus(id, 'in_progress'); toast.success('تولید آغاز شد'); };
  const handleHold = (id: string) => { updateWorkOrderStatus(id, 'on_hold'); toast.success('دستور کار متوقف شد'); };
  const handleComplete = () => {
    if (!completeModalId) return;
    updateWorkOrderStatus(completeModalId, 'completed', {
      actualQuantity: Number(completeForm.actualQuantity || 0) || undefined,
      scrapQuantity: Number(completeForm.scrapQuantity || 0) || undefined,
    });
    toast.success('سند حسابداری تولید ثبت شد');
    setCompleteModalId(null);
    setCompleteForm({ actualQuantity: '', scrapQuantity: '' });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">دستورات کار</h1>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between">
          {PIPELINE.map((status, i) => {
            const cfg = WORK_ORDER_STATUS_CONFIG[status];
            const count = workOrders.filter((w) => w.status === status).length;
            return (
              <div key={status} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <span className={`text-lg font-bold ${cfg.color}`} dir="ltr">{count}</span>
                  <span className="text-[10px] text-muted-foreground">{cfg.fa}</span>
                </div>
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
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی شماره WO، محصول، سفارش..." className="w-full pr-9 pl-3 py-2 rounded-lg border border-border bg-background text-xs focus:outline-none" dir="rtl" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as WorkOrderStatus | '')} className="px-3 py-2 rounded-lg border border-border bg-background text-xs">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(WORK_ORDER_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.fa}</option>)}
          </select>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {['عملیات', 'وضعیت', 'سرپرست', 'شیفت', 'مقدار واقعی', 'مقدار برنامه', 'خط', 'سفارش فروش', 'محصول', 'شماره WO'].map((h) => (
                <th key={h} className="text-right py-2.5 px-3 text-[10px] font-semibold text-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((w) => {
              const cfg = WORK_ORDER_STATUS_CONFIG[w.status];
              return (
                <tr key={w.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      {w.status === 'planned' && <button onClick={() => handleRelease(w.id)} className="flex items-center gap-1 text-[10px] text-blue-700 hover:underline"><Send className="w-3 h-3" />آزادسازی</button>}
                      {w.status === 'released' && <button onClick={() => handleStart(w.id)} className="flex items-center gap-1 text-[10px] text-amber-700 hover:underline"><Play className="w-3 h-3" />شروع تولید</button>}
                      {w.status === 'in_progress' && (
                        <>
                          <button onClick={() => setCompleteModalId(w.id)} className="flex items-center gap-1 text-[10px] text-emerald-700 hover:underline"><CheckCircle2 className="w-3 h-3" />تکمیل</button>
                          <button onClick={() => handleHold(w.id)} className="flex items-center gap-1 text-[10px] text-orange-700 hover:underline"><PauseCircle className="w-3 h-3" />توقف</button>
                        </>
                      )}
                      <button onClick={() => setDrawerWoId(w.id)} className="text-[10px] text-muted-foreground hover:underline">جزئیات</button>
                    </div>
                  </td>
                  <td className="py-2.5 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color} ${cfg.bg}`}>{cfg.fa}</span></td>
                  <td className="py-2.5 px-3 text-xs text-muted-foreground">{w.supervisorName ?? '—'}</td>
                  <td className="py-2.5 px-3 text-xs text-muted-foreground">{SHIFT_CONFIG[w.assignedShift].fa}</td>
                  <td className="py-2.5 px-3 text-xs font-mono text-foreground" dir="ltr">{w.actualQuantity.toLocaleString('fa-IR')}</td>
                  <td className="py-2.5 px-3 text-xs font-mono text-foreground" dir="ltr">{w.plannedQuantity.toLocaleString('fa-IR')}</td>
                  <td className="py-2.5 px-3 text-xs text-muted-foreground">{w.lineName}</td>
                  <td className="py-2.5 px-3 text-xs text-muted-foreground" dir="ltr">{w.salesOrderNumber}</td>
                  <td className="py-2.5 px-3 text-xs text-foreground">{w.itemNameFa}</td>
                  <td className="py-2.5 px-3 text-xs font-mono text-primary" dir="ltr">{w.workOrderNumber}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-10 text-sm text-muted-foreground">دستور کاری یافت نشد</div>}
      </div>

      {/* Complete modal */}
      {completeModalId && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setCompleteModalId(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-[26rem]" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCompleteModalId(null)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">تکمیل دستور کار</p>
            </div>
            <div className="space-y-3">
              <div><label className={labelCls}>مقدار تولید واقعی</label><input type="number" value={completeForm.actualQuantity} onChange={(e) => setCompleteForm((f) => ({ ...f, actualQuantity: e.target.value }))} className={inputCls} dir="ltr" /></div>
              <div><label className={labelCls}>مقدار ضایعات</label><input type="number" value={completeForm.scrapQuantity} onChange={(e) => setCompleteForm((f) => ({ ...f, scrapQuantity: e.target.value }))} className={inputCls} dir="ltr" /></div>
              <p className="text-[10px] text-muted-foreground">با تکمیل این دستور کار، سند حسابداری بهای تولید به‌طور خودکار در ماژول مالی ثبت می‌شود.</p>
              <button onClick={handleComplete} className="w-full py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 mt-1">تکمیل و ثبت سند مالی</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {drawerWo && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setDrawerWoId(null)} />
          <div className="fixed top-0 left-0 bottom-0 w-[26rem] bg-card border-l border-border z-50 overflow-y-auto p-5" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setDrawerWoId(null)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">{drawerWo.workOrderNumber}</p>
            </div>
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-secondary/30 rounded-lg p-2"><p className="text-muted-foreground">محصول</p><p className="font-semibold text-foreground">{drawerWo.itemNameFa}</p></div>
                <div className="bg-secondary/30 rounded-lg p-2"><p className="text-muted-foreground">خط تولید</p><p className="font-semibold text-foreground">{drawerWo.lineName}</p></div>
                <div className="bg-secondary/30 rounded-lg p-2"><p className="text-muted-foreground">مقدار برنامه</p><p className="font-semibold text-foreground" dir="ltr">{drawerWo.plannedQuantity}</p></div>
                <div className="bg-secondary/30 rounded-lg p-2"><p className="text-muted-foreground">مقدار واقعی</p><p className="font-semibold text-foreground" dir="ltr">{drawerWo.actualQuantity}</p></div>
                <div className="bg-secondary/30 rounded-lg p-2"><p className="text-muted-foreground">شروع برنامه</p><p className="font-semibold text-foreground" dir="ltr">{drawerWo.scheduledStart}</p></div>
                <div className="bg-secondary/30 rounded-lg p-2"><p className="text-muted-foreground">پایان برنامه</p><p className="font-semibold text-foreground" dir="ltr">{drawerWo.scheduledEnd}</p></div>
              </div>

              <div>
                <p className="font-bold text-foreground mb-2">نیازمندی‌های BOM</p>
                {drawerBom ? (
                  <table className="w-full">
                    <thead><tr className="border-b border-border">{['مقدار مؤثر', 'واحد', 'مقدار', 'ماده اولیه'].map((h) => <th key={h} className="text-right py-1.5 px-1 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
                    <tbody>
                      {drawerBom.lines.map((l) => (
                        <tr key={l.id} className="border-b border-border/30 last:border-0">
                          <td className="py-1.5 px-1 text-[10px] font-mono" dir="ltr">{(l.effectiveQuantity * drawerWo.plannedQuantity).toFixed(2)}</td>
                          <td className="py-1.5 px-1 text-[10px] text-muted-foreground">{l.uom}</td>
                          <td className="py-1.5 px-1 text-[10px] font-mono" dir="ltr">{l.quantity}</td>
                          <td className="py-1.5 px-1 text-[10px] text-foreground">{l.itemNameFa}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="text-muted-foreground">BOM یافت نشد</p>}
              </div>

              <div>
                <p className="font-bold text-foreground mb-2">کارکنان واحد {drawerWo.lineName}</p>
                {lineEmployees.length ? (
                  <ul className="space-y-1">
                    {lineEmployees.map((e) => <li key={e.id} className="flex items-center justify-between border-b border-border/30 pb-1"><span className="text-muted-foreground">{e.position}</span><span className="text-foreground font-medium">{e.name}</span></li>)}
                  </ul>
                ) : <p className="text-muted-foreground">کارمندی یافت نشد</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
