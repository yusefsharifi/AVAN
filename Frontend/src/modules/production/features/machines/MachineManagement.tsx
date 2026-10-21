import { useState } from 'react';
import { toast } from 'sonner';
import { useProductionStore } from '../../store/useProductionStore';
import { useOeeMetrics } from '../../hooks';
import { useFinanceStore } from '@/modules/finance';
import { MachineStatusCard, OeeGauge } from '../../components';
import { MACHINE_STATUS_CONFIG, DOWNTIME_REASON_CONFIG, MAINTENANCE_TYPE_CONFIG } from '../../constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { X, Wrench, AlertTriangle, ExternalLink, Calendar } from 'lucide-react';
import type { Machine, MaintenanceType, DowntimeLog } from '../../types';

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";
const LINE_COLORS = ['#0E7C86', '#d97706', '#7c3aed'];

export default function MachineManagement() {
  const { machines, productionLines, scheduleMaintenanceRecord, logDowntime } = useProductionStore();
  const { fixedAssets } = useFinanceStore();
  const oee = useOeeMetrics();
  const [subTab, setSubTab] = useState<'machines' | 'maintenance' | 'downtime' | 'oee'>('machines');
  const [lineFilter, setLineFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [pmModalId, setPmModalId] = useState<string | null>(null);
  const [downtimeModalId, setDowntimeModalId] = useState<string | null>(null);

  const [pmForm, setPmForm] = useState({ type: 'preventive' as MaintenanceType, description: '', performedBy: '', durationHours: '', cost: '', partReplaced: '' });
  const [dtForm, setDtForm] = useState<{ reason: DowntimeLog['reason']; description: string; impact: DowntimeLog['impact']; reportedBy: string }>({ reason: 'breakdown', description: '', impact: 'minor', reportedBy: '' });

  const filteredMachines = machines.filter((m) => (!lineFilter || m.lineId === lineFilter) && (!statusFilter || m.status === statusFilter));
  const detailMachine = machines.find((m) => m.id === detailId);
  const linkedAsset = detailMachine?.assetId ? fixedAssets.find((a) => a.id === detailMachine.assetId) : undefined;

  const upcomingPM = machines.filter((m) => (m.pmIntervalHours - m.operatingHoursSinceLastPM) <= 100 * 5); // within ~500h*10% proxy window
  const allDowntime = machines.flatMap((m) => m.downtimeLogs.map((d) => ({ ...d, machineName: m.nameFa })));
  const totalDowntimeHours = allDowntime.reduce((s, d) => s + (d.durationMinutes ?? 0), 0) / 60;

  const submitPM = () => {
    if (!pmModalId) return;
    scheduleMaintenanceRecord(pmModalId, {
      type: pmForm.type, description: pmForm.description, performedBy: pmForm.performedBy || '—',
      durationHours: Number(pmForm.durationHours || 0), cost: Number(pmForm.cost || 0), partReplaced: pmForm.partReplaced || undefined,
    });
    toast.success('رکورد نگهداری ثبت شد');
    setPmModalId(null);
    setPmForm({ type: 'preventive', description: '', performedBy: '', durationHours: '', cost: '', partReplaced: '' });
  };

  const submitDowntime = () => {
    if (!downtimeModalId) return;
    logDowntime(downtimeModalId, { ...dtForm, startTime: new Date().toISOString() });
    toast.success('خرابی ثبت شد');
    setDowntimeModalId(null);
    setDtForm({ reason: 'breakdown', description: '', impact: 'minor', reportedBy: '' });
  };

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-foreground">ماشین‌آلات و تجهیزات</h1>

      <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 w-fit">
        {([
          { id: 'machines', label: 'ماشین‌آلات' }, { id: 'maintenance', label: 'نگهداری' },
          { id: 'downtime', label: 'خرابی‌ها' }, { id: 'oee', label: 'آمار OEE' },
        ] as const).map((t) => (
          <button key={t.id} onClick={() => setSubTab(t.id)} className={`px-3.5 py-1.5 rounded-md text-xs font-medium ${subTab === t.id ? 'bg-primary text-white' : 'text-muted-foreground'}`}>{t.label}</button>
        ))}
      </div>

      {subTab === 'machines' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select value={lineFilter} onChange={(e) => setLineFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-background text-xs">
              <option value="">همه خطوط</option>
              {productionLines.map((l) => <option key={l.id} value={l.id}>{l.nameFa}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-background text-xs">
              <option value="">همه وضعیت‌ها</option>
              {Object.entries(MACHINE_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.fa}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMachines.map((m) => <MachineStatusCard key={m.id} machine={m} onClick={() => setDetailId(m.id)} />)}
          </div>
        </div>
      )}

      {subTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-xs font-bold text-foreground mb-3">سررسید نگهداری پیشگیرانه (۳۰ روز آینده)</h3>
            <div className="space-y-2">
              {upcomingPM.map((m) => {
                const hoursLeft = m.pmIntervalHours - m.operatingHoursSinceLastPM;
                const overdue = hoursLeft <= 0;
                return (
                  <div key={m.id} className={`flex items-center justify-between p-2.5 rounded-lg ${overdue ? 'bg-red-50' : 'bg-secondary/30'}`}>
                    <button onClick={() => setPmModalId(m.id)} className="text-[10px] text-accent hover:underline">ثبت نگهداری</button>
                    <span className={`text-[11px] font-semibold ${overdue ? 'text-red-700' : 'text-foreground'}`} dir="ltr">{overdue ? 'عقب‌افتاده' : `${hoursLeft} ساعت باقی‌مانده`}</span>
                    <span className="text-[11px] text-muted-foreground" dir="ltr">{m.nextPMDue}</span>
                    <span className="text-[11px] font-medium text-foreground">{m.nameFa}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-3 bg-secondary/30 border-b border-border"><p className="text-xs font-bold text-foreground">تاریخچه نگهداری</p></div>
            <table className="w-full">
              <thead><tr className="border-b border-border">{['هزینه', 'مدت (ساعت)', 'انجام‌دهنده', 'نوع', 'ماشین'].map((h) => <th key={h} className="text-right py-2 px-2 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {machines.flatMap((m) => m.maintenanceRecords.map((r) => (
                  <tr key={r.id} className="border-b border-border/30 last:border-0">
                    <td className="py-2 px-2 text-[10px] font-mono" dir="ltr">{r.cost.toLocaleString('fa-IR')}</td>
                    <td className="py-2 px-2 text-[10px] font-mono" dir="ltr">{r.durationHours}</td>
                    <td className="py-2 px-2 text-[10px] text-muted-foreground">{r.performedBy}</td>
                    <td className="py-2 px-2 text-[10px] text-muted-foreground">{MAINTENANCE_TYPE_CONFIG[r.type].fa}</td>
                    <td className="py-2 px-2 text-[10px] text-foreground">{m.nameFa}</td>
                  </tr>
                )))}
              </tbody>
            </table>
            {machines.every((m) => m.maintenanceRecords.length === 0) && <p className="text-center py-6 text-[11px] text-muted-foreground">رکوردی ثبت نشده</p>}
          </div>
        </div>
      )}

      {subTab === 'downtime' && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">مجموع ساعات توقف این ماه</p><p className="text-lg font-bold text-red-600" dir="ltr">{totalDowntimeHours.toFixed(1)} ساعت</p></div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-border bg-secondary/30">{['وضعیت', 'تأثیر', 'مدت', 'علت', 'تاریخ', 'ماشین'].map((h) => <th key={h} className="text-right py-2.5 px-3 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {allDowntime.map((d) => (
                  <tr key={d.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 px-3 text-[10px]">{d.endTime ? 'برطرف‌شده' : 'باز'}</td>
                    <td className="py-2.5 px-3"><span className="text-[10px] font-medium">{d.impact === 'critical' ? 'بحرانی' : d.impact === 'major' ? 'زیاد' : 'کم'}</span></td>
                    <td className="py-2.5 px-3 text-[10px] font-mono" dir="ltr">{d.durationMinutes ?? '—'}</td>
                    <td className="py-2.5 px-3 text-[10px]" style={{ color: DOWNTIME_REASON_CONFIG[d.reason]?.color }}>{DOWNTIME_REASON_CONFIG[d.reason]?.fa}</td>
                    <td className="py-2.5 px-3 text-[10px] text-muted-foreground" dir="ltr">{d.startTime.slice(0, 10)}</td>
                    <td className="py-2.5 px-3 text-[10px] text-foreground">{d.machineName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {allDowntime.length === 0 && <p className="text-center py-6 text-[11px] text-muted-foreground">خرابی‌ای ثبت نشده</p>}
          </div>
        </div>
      )}

      {subTab === 'oee' && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-xs font-bold text-foreground mb-3">روند OEE ۷ روز اخیر به‌تفکیک خط</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={oee.trend}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {productionLines.map((l, i) => <Bar key={l.id} dataKey={l.nameFa} fill={LINE_COLORS[i % LINE_COLORS.length]} radius={[4, 4, 0, 0]} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {oee.byMachine.map((m) => (
              <div key={m.id} className="bg-card rounded-xl border border-border p-4 flex flex-col items-center">
                <OeeGauge value={m.oee} label={m.nameFa} size="sm" />
              </div>
            ))}
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-border bg-secondary/30">{['OEE', 'کیفیت', 'کارایی', 'دسترس‌پذیری', 'ماشین'].map((h) => <th key={h} className="text-right py-2.5 px-3 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {oee.byMachine.map((m) => (
                  <tr key={m.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 px-3 text-xs font-bold text-foreground" dir="ltr">{m.oee}٪</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-foreground" dir="ltr">{m.quality}٪</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-foreground" dir="ltr">{m.performance}٪</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-foreground" dir="ltr">{m.availability}٪</td>
                    <td className="py-2.5 px-3 text-xs text-foreground">{m.nameFa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Machine detail drawer */}
      {detailMachine && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setDetailId(null)} />
          <div className="fixed top-0 left-0 bottom-0 w-96 bg-card border-l border-border z-50 overflow-y-auto p-5" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setDetailId(null)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">{detailMachine.nameFa}</p>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <button onClick={() => setPmModalId(detailMachine.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-[10px] font-semibold hover:bg-blue-500"><Wrench className="w-3 h-3" />ثبت نگهداری</button>
                <button onClick={() => setDowntimeModalId(detailMachine.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-[10px] font-semibold hover:bg-red-500"><AlertTriangle className="w-3 h-3" />ثبت خرابی</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-secondary/30 rounded-lg p-2"><p className="text-muted-foreground">برند/مدل</p><p className="font-semibold text-foreground">{detailMachine.brand} {detailMachine.model}</p></div>
                <div className="bg-secondary/30 rounded-lg p-2"><p className="text-muted-foreground">شماره سریال</p><p className="font-semibold text-foreground" dir="ltr">{detailMachine.serialNumber}</p></div>
                <div className="bg-secondary/30 rounded-lg p-2"><p className="text-muted-foreground">ساعات کارکرد کل</p><p className="font-semibold text-foreground" dir="ltr">{detailMachine.operatingHoursTotal}</p></div>
                <div className="bg-secondary/30 rounded-lg p-2"><p className="text-muted-foreground">تاریخ نصب</p><p className="font-semibold text-foreground" dir="ltr">{detailMachine.installDate}</p></div>
              </div>

              {linkedAsset && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                  <p className="flex items-center gap-1 text-emerald-800 font-semibold mb-1"><ExternalLink className="w-3 h-3" />مشاهده در دارایی‌های ثابت (مالی)</p>
                  <p className="text-emerald-700">{linkedAsset.name} — ارزش دفتری: <span dir="ltr">{linkedAsset.netBookValue.toLocaleString('fa-IR')}</span></p>
                </div>
              )}

              <div>
                <p className="font-bold text-foreground mb-2">تاریخچه نگهداری</p>
                {detailMachine.maintenanceRecords.length ? (
                  <ul className="space-y-1">{detailMachine.maintenanceRecords.map((r) => <li key={r.id} className="flex items-center justify-between border-b border-border/30 pb-1"><span className="text-muted-foreground" dir="ltr">{r.performedAt}</span><span className="text-foreground">{r.description || MAINTENANCE_TYPE_CONFIG[r.type].fa}</span></li>)}</ul>
                ) : <p className="text-muted-foreground">رکوردی ثبت نشده</p>}
              </div>
              <div>
                <p className="font-bold text-foreground mb-2">تاریخچه خرابی</p>
                {detailMachine.downtimeLogs.length ? (
                  <ul className="space-y-1">{detailMachine.downtimeLogs.map((d) => <li key={d.id} className="flex items-center justify-between border-b border-border/30 pb-1"><span className="text-muted-foreground" dir="ltr">{d.startTime.slice(0, 10)}</span><span className="text-foreground">{DOWNTIME_REASON_CONFIG[d.reason]?.fa}</span></li>)}</ul>
                ) : <p className="text-muted-foreground">رکوردی ثبت نشده</p>}
              </div>
            </div>
          </div>
        </>
      )}

      {/* PM modal */}
      {pmModalId && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setPmModalId(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-[26rem]" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setPmModalId(null)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">ثبت نگهداری</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>نوع</label>
                <select value={pmForm.type} onChange={(e) => setPmForm((f) => ({ ...f, type: e.target.value as MaintenanceType }))} className={inputCls} dir="rtl">
                  {Object.entries(MAINTENANCE_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.fa}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>شرح</label><input value={pmForm.description} onChange={(e) => setPmForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} dir="rtl" /></div>
              <div><label className={labelCls}>انجام‌دهنده</label><input value={pmForm.performedBy} onChange={(e) => setPmForm((f) => ({ ...f, performedBy: e.target.value }))} className={inputCls} dir="rtl" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>مدت (ساعت)</label><input type="number" value={pmForm.durationHours} onChange={(e) => setPmForm((f) => ({ ...f, durationHours: e.target.value }))} className={inputCls} dir="ltr" /></div>
                <div><label className={labelCls}>هزینه</label><input type="number" value={pmForm.cost} onChange={(e) => setPmForm((f) => ({ ...f, cost: e.target.value }))} className={inputCls} dir="ltr" /></div>
              </div>
              <div><label className={labelCls}>قطعه تعویض‌شده</label><input value={pmForm.partReplaced} onChange={(e) => setPmForm((f) => ({ ...f, partReplaced: e.target.value }))} className={inputCls} dir="rtl" /></div>
              <button onClick={submitPM} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 mt-1">ثبت</button>
            </div>
          </div>
        </div>
      )}

      {/* Downtime modal */}
      {downtimeModalId && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setDowntimeModalId(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-[26rem]" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setDowntimeModalId(null)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">ثبت خرابی</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>علت</label>
                <select value={dtForm.reason} onChange={(e) => setDtForm((f) => ({ ...f, reason: e.target.value as DowntimeLog['reason'] }))} className={inputCls} dir="rtl">
                  {Object.entries(DOWNTIME_REASON_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.fa}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>شرح</label><input value={dtForm.description} onChange={(e) => setDtForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} dir="rtl" /></div>
              <div>
                <label className={labelCls}>تأثیر</label>
                <select value={dtForm.impact} onChange={(e) => setDtForm((f) => ({ ...f, impact: e.target.value as DowntimeLog['impact'] }))} className={inputCls} dir="rtl">
                  <option value="minor">کم</option><option value="major">زیاد</option><option value="critical">بحرانی</option>
                </select>
              </div>
              <div><label className={labelCls}>گزارش‌دهنده</label><input value={dtForm.reportedBy} onChange={(e) => setDtForm((f) => ({ ...f, reportedBy: e.target.value }))} className={inputCls} dir="rtl" /></div>
              <button onClick={submitDowntime} className="w-full py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-500 mt-1">ثبت خرابی</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
