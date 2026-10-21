import { useState } from 'react';
import { toast } from 'sonner';
import { useInventoryStore } from '../../store';
import { COUNT_STATUS_CONFIG } from '../../constants';
import { Plus, ClipboardCheck, Calendar, AlertTriangle, X, Check } from 'lucide-react';

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

const ABC_FREQ: Record<string, { label: string; countPerYear: number }> = {
  A: { label: 'ماهانه', countPerYear: 12 },
  B: { label: 'فصلی', countPerYear: 4 },
  C: { label: 'سالانه', countPerYear: 1 },
};

export default function CountSchedule() {
  const { cycleCounts: countSessions, warehouses, items, createCountSession, recordCount, completeCountSession } = useInventoryStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [countingSessionId, setCountingSessionId] = useState<string | null>(null);
  const [form, setForm] = useState({ warehouseId: warehouses[0]?.id ?? '', itemIds: [] as string[], scheduledDate: '' });
  const [countInputs, setCountInputs] = useState<Record<string, string>>({});

  const filteredSessions = countSessions.filter(c => !statusFilter || c.status === statusFilter);
  const scheduled = countSessions.filter(c => c.status === 'scheduled').length;
  const inProgress = countSessions.filter(c => c.status === 'in_progress').length;
  const completed = countSessions.filter(c => c.status === 'completed').length;
  const varianceAlerts = countSessions.reduce((s, c) => s + (c.totalVarianceValue > 0 ? 1 : 0), 0);

  const submitSession = () => {
    if (form.itemIds.length === 0) { toast.error('حداقل یک کالا را انتخاب کنید'); return; }
    const wh = warehouses.find(w => w.id === form.warehouseId);
    createCountSession({ warehouseId: form.warehouseId, warehouseName: wh?.nameFa, scheduledDate: form.scheduledDate, itemIds: form.itemIds });
    toast.success('جلسه انبارگردانی زمان‌بندی شد');
    setModalOpen(false);
    setForm({ warehouseId: warehouses[0]?.id ?? '', itemIds: [], scheduledDate: '' });
  };

  const handleRecordCount = (sessionId: string, itemId: string) => {
    const qty = Number(countInputs[itemId] ?? '');
    if (Number.isNaN(qty)) { toast.error('مقدار شمارش‌شده را وارد کنید'); return; }
    recordCount(sessionId, itemId, qty);
    toast.success('شمارش ثبت شد');
  };

  const handleComplete = (sessionId: string) => {
    completeCountSession(sessionId);
    toast.success('انبارگردانی تکمیل شد — موجودی سیستم با شمارش واقعی تطبیق داده شد');
    setCountingSessionId(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90">
          <Plus className="w-3.5 h-3.5" /><span>برنامه‌ریزی انبارگردانی</span>
        </button>
        <h1 className="text-lg font-bold text-foreground">انبارگردانی دوره‌ای</h1>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">زمان‌بندی شده</p><p className="text-lg font-bold text-blue-600" dir="ltr">{scheduled}</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">در حال اجرا</p><p className="text-lg font-bold text-amber-600" dir="ltr">{inProgress}</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">تکمیل شده</p><p className="text-lg font-bold text-emerald-600" dir="ltr">{completed}</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">هشدار انحراف</p><p className="text-lg font-bold text-red-600" dir="ltr">{varianceAlerts}</p></div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-bold text-foreground text-right mb-3">دوره انبارگردانی بر اساس کلاس ABC</h3>
        <div className="grid grid-cols-3 gap-4">
          {(['A', 'B', 'C'] as const).map(cls => (
            <div key={cls} className="p-3 rounded-lg bg-secondary/30">
              <p className="text-xs font-bold text-foreground mb-1">کلاس {cls}</p>
              <p className="text-[10px] text-muted-foreground">{ABC_FREQ[cls].label}</p>
              <p className="text-xs font-semibold text-foreground mt-1" dir="ltr">{ABC_FREQ[cls].countPerYear} بار در سال</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-3 mb-4">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(COUNT_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.fa}</option>)}
          </select>
        </div>

        <div className="divide-y divide-border">
          {filteredSessions.map(session => {
            const statusCfg = COUNT_STATUS_CONFIG[session.status] ?? { fa: session.status, color: 'text-foreground', bg: 'bg-secondary' };
            const totalItems = session.countSheets.length;
            const countedItems = session.countSheets.filter(cs => cs.status !== 'pending').length;
            const progressPct = totalItems > 0 ? Math.round((countedItems / totalItems) * 100) : 0;
            const isCounting = countingSessionId === session.id;

            return (
              <div key={session.id} className="p-4">
                <div className="flex items-center justify-between mb-1 cursor-pointer" onClick={() => setCountingSessionId(isCounting ? null : session.id)}>
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">{session.sessionNumber}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusCfg.color} ${statusCfg.bg}`}>{statusCfg.fa}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground"><Calendar className="w-3 h-3 inline ml-1" />{session.scheduledDate}</span>
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-[10px] text-muted-foreground">{session.warehouseName ?? '—'}</span>
                </div>
                {session.status !== 'completed' && totalItems > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] text-muted-foreground">پیشرفت شمارش</span>
                      <span className="text-[10px] font-semibold text-foreground" dir="ltr">{countedItems}/{totalItems} ({progressPct}٪)</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5"><div className="bg-accent h-1.5 rounded-full" style={{ width: `${progressPct}%` }} /></div>
                  </div>
                )}
                {(session.totalVarianceValue ?? 0) > 0 && (
                  <span className="text-[10px] flex items-center gap-1 text-amber-600 mt-2">
                    <AlertTriangle className="w-3 h-3" />انحراف: {new Intl.NumberFormat('fa-IR').format(session.totalVarianceValue)} ریال
                  </span>
                )}

                {isCounting && session.status !== 'completed' && (
                  <div className="mt-3 bg-secondary/20 rounded-lg p-3 space-y-2">
                    {session.countSheets.map(cs => (
                      <div key={cs.id} className="flex items-center gap-2">
                        <span className="text-xs text-foreground flex-1">{cs.itemName}</span>
                        <span className="text-[10px] text-muted-foreground" dir="ltr">سیستم: {cs.systemQuantity}</span>
                        <input type="number" placeholder="شمارش واقعی" dir="ltr"
                          defaultValue={cs.countedQuantity ?? ''}
                          onChange={e => setCountInputs(v => ({ ...v, [cs.itemId]: e.target.value }))}
                          className="w-24 bg-background border border-border rounded-lg py-1 px-2 text-xs" />
                        <button onClick={() => handleRecordCount(session.id, cs.itemId)} className="text-[10px] text-accent hover:underline">ثبت</button>
                        {cs.status === 'counted' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                    ))}
                    <button onClick={() => handleComplete(session.id)} className="w-full mt-2 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-semibold hover:bg-emerald-500">
                      تکمیل انبارگردانی و تعدیل موجودی
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredSessions.length === 0 && (
          <div className="text-center py-10">
            <ClipboardCheck className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">موردی یافت نشد</p>
          </div>
        )}
      </div>

      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setModalOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl shadow-2xl p-5 w-[28rem] z-50 max-h-[80vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">برنامه‌ریزی انبارگردانی</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>انبار</label>
                <select dir="rtl" value={form.warehouseId} onChange={e => setForm(f => ({ ...f, warehouseId: e.target.value }))} className={inputCls}>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.nameFa}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>تاریخ اجرا</label><input dir="ltr" type="date" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} className={inputCls} /></div>
              <div>
                <label className={labelCls}>اقلام مشمول شمارش</label>
                <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
                  {items.map(item => (
                    <label key={item.id} className="flex items-center gap-2 text-xs text-foreground">
                      <input type="checkbox" checked={form.itemIds.includes(item.id)}
                        onChange={e => setForm(f => ({ ...f, itemIds: e.target.checked ? [...f.itemIds, item.id] : f.itemIds.filter(id => id !== item.id) }))} />
                      {item.nameFa}
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={submitSession} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors mt-1">ایجاد جلسه</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
