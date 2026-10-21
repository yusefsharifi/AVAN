import { useState } from 'react';
import { toast } from 'sonner';
import { useProductionStore } from '../../store/useProductionStore';
import { useMrpCalculation } from '../../hooks';
import { GanttChart } from '../../components';
import { WORK_ORDER_STATUS_CONFIG } from '../../constants';
import { ChevronRight, ChevronLeft, PanelRightClose, PanelRightOpen, Send, X } from 'lucide-react';
import type { WorkOrder, WorkOrderStatus } from '../../types';

export default function ProductionPlanBoard() {
  const { workOrders, productionLines, updateWorkOrderStatus, triggerMaterialRequisition } = useProductionStore();
  const [tab, setTab] = useState<'gantt' | 'list'>('gantt');
  const [panelOpen, setPanelOpen] = useState(true);
  const [selectedWo, setSelectedWo] = useState<WorkOrder | null>(null);

  const activeWorkOrders = workOrders.filter((w) => w.status !== 'completed' && w.status !== 'cancelled');
  const mrp = useMrpCalculation(activeWorkOrders.map((w) => w.id));

  const groupedByLine = productionLines.map((line) => ({
    line, wos: workOrders.filter((w) => w.lineId === line.id),
  }));

  const handleSendToInventory = () => {
    const released = workOrders.filter((w) => w.status === 'released');
    released.forEach((w) => triggerMaterialRequisition(w.id));
    toast.success(`درخواست مواد برای ${released.length} دستور کار آزادشده به انبار ارسال شد`);
  };

  return (
    <div className="flex gap-4">
      <div className="flex-1 space-y-4 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            <button onClick={() => setTab('gantt')} className={`px-3 py-1.5 rounded-md text-xs font-medium ${tab === 'gantt' ? 'bg-primary text-white' : 'text-muted-foreground'}`}>Gantt</button>
            <button onClick={() => setTab('list')} className={`px-3 py-1.5 rounded-md text-xs font-medium ${tab === 'list' ? 'bg-primary text-white' : 'text-muted-foreground'}`}>لیست</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPanelOpen((p) => !p)} className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground">
              {panelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>
            <h1 className="text-lg font-bold text-foreground">برنامه‌ریزی تولید</h1>
          </div>
        </div>

        {tab === 'gantt' && (
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <button className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground"><ChevronRight className="w-4 h-4" /></button>
              <p className="text-xs font-semibold text-foreground">هفته جاری</p>
              <button className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground"><ChevronLeft className="w-4 h-4" /></button>
            </div>
            <GanttChart workOrders={workOrders} lines={productionLines} onWorkOrderClick={setSelectedWo} />
          </div>
        )}

        {tab === 'list' && (
          <div className="space-y-4">
            {groupedByLine.map(({ line, wos }) => (
              <div key={line.id} className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="p-3 bg-secondary/30 border-b border-border"><p className="text-xs font-bold text-foreground">{line.nameFa}</p></div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {['عملیات', 'وضعیت', 'پیشرفت', 'مقدار', 'برنامه پایان', 'برنامه شروع', 'شیفت', 'محصول', 'سفارش', 'شماره WO'].map((h) => (
                        <th key={h} className="text-right py-2 px-2 text-[10px] font-semibold text-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {wos.map((w) => {
                      const cfg = WORK_ORDER_STATUS_CONFIG[w.status];
                      const progress = w.plannedQuantity ? Math.min(100, Math.round((w.actualQuantity / w.plannedQuantity) * 100)) : 0;
                      return (
                        <tr key={w.id} className="border-b border-border/30 last:border-0 hover:bg-secondary/20 cursor-pointer" onClick={() => setSelectedWo(w)}>
                          <td className="py-2 px-2 text-[10px] text-accent">مشاهده</td>
                          <td className="py-2 px-2"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color} ${cfg.bg}`}>{cfg.fa}</span></td>
                          <td className="py-2 px-2"><div className="w-16 bg-secondary rounded-full h-1.5"><div className="bg-accent h-1.5 rounded-full" style={{ width: `${progress}%` }} /></div></td>
                          <td className="py-2 px-2 text-[10px] font-mono" dir="ltr">{w.plannedQuantity}</td>
                          <td className="py-2 px-2 text-[10px] text-muted-foreground" dir="ltr">{w.scheduledEnd}</td>
                          <td className="py-2 px-2 text-[10px] text-muted-foreground" dir="ltr">{w.scheduledStart}</td>
                          <td className="py-2 px-2 text-[10px] text-muted-foreground">{w.assignedShift}</td>
                          <td className="py-2 px-2 text-[10px] text-foreground">{w.itemNameFa}</td>
                          <td className="py-2 px-2 text-[10px] text-muted-foreground" dir="ltr">{w.salesOrderNumber}</td>
                          <td className="py-2 px-2 text-[10px] font-mono text-primary" dir="ltr">{w.workOrderNumber}</td>
                        </tr>
                      );
                    })}
                    {wos.length === 0 && <tr><td colSpan={10} className="text-center py-4 text-[11px] text-muted-foreground">دستور کاری روی این خط نیست</td></tr>}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MRP Panel */}
      {panelOpen && (
        <div className="w-80 shrink-0 bg-card rounded-xl border border-border p-4 h-fit sticky top-0">
          <h3 className="text-xs font-bold text-foreground mb-3">نیازمندی مواد (MRP)</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {mrp.map((item) => (
              <div key={item.itemId} className="p-2 rounded-lg bg-secondary/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-muted-foreground" dir="ltr">{item.itemSku}</span>
                  <span className="text-[11px] font-semibold text-foreground">{item.itemNameFa}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  <div><p className="text-muted-foreground">نیاز</p><p className="font-mono text-foreground" dir="ltr">{item.required}</p></div>
                  <div><p className="text-muted-foreground">موجود</p><p className="font-mono text-foreground" dir="ltr">{item.available}</p></div>
                  <div><p className="text-muted-foreground">کمبود</p><p className={`font-mono ${item.shortage > 0 ? 'text-red-600 font-bold' : 'text-emerald-600'}`} dir="ltr">{item.shortage}</p></div>
                </div>
                {item.suggestPR && <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 font-medium">نیاز به تأمین</span>}
              </div>
            ))}
            {mrp.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-4">دستور کار فعالی برای محاسبه نیست</p>}
          </div>
          <button onClick={handleSendToInventory} className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90">
            <Send className="w-3.5 h-3.5" />ارسال به انبار
          </button>
        </div>
      )}

      {/* Work order side panel */}
      {selectedWo && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelectedWo(null)} />
          <div className="fixed top-0 left-0 bottom-0 w-96 bg-card border-l border-border z-50 overflow-y-auto p-5" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setSelectedWo(null)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">{selectedWo.workOrderNumber}</p>
            </div>
            <div className="space-y-3 text-xs">
              <p className="text-foreground font-semibold">{selectedWo.itemNameFa}</p>
              <div className="flex items-center gap-2">
                <select
                  value={selectedWo.status}
                  onChange={(e) => { updateWorkOrderStatus(selectedWo.id, e.target.value as WorkOrderStatus); toast.success('وضعیت به‌روزرسانی شد'); setSelectedWo(null); }}
                  className="bg-secondary border border-border rounded-lg py-1.5 px-2 text-xs"
                >
                  {Object.entries(WORK_ORDER_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.fa}</option>)}
                </select>
                <span className="text-muted-foreground">تغییر وضعیت</span>
              </div>
              <p className="text-muted-foreground">خط: <span className="text-foreground font-medium">{selectedWo.lineName}</span></p>
              <p className="text-muted-foreground">مقدار: <span className="text-foreground font-medium" dir="ltr">{selectedWo.plannedQuantity}</span></p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
