import { useState, Fragment } from 'react';
import { toast } from 'sonner';
import { useProductionStore } from '../../store/useProductionStore';
import { useHRStore } from '@/modules/hr';
import { QC_RESULT_CONFIG, NCR_STATUS_CONFIG } from '../../constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Plus, ChevronLeft, X, UserPlus, CheckCircle2 } from 'lucide-react';
import type { QCResult } from '../../types';
type QualityCheckType = 'incoming' | 'in_process' | 'final' | 'outgoing';

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";
const PIE_COLORS = ['#0E7C86', '#d97706', '#dc2626', '#7c3aed', '#64748b'];
const REASON_LABELS: Record<string, string> = { defect: 'معیوب', setup_waste: 'ضایعات راه‌اندازی', trial_run: 'تست اولیه', material_issue: 'مشکل مواد', machine_issue: 'مشکل دستگاه', other: 'سایر' };

export default function QualityControl() {
  const { qualityChecks, ncrs, scrapRecords, workOrders, createQualityCheck, raiseNCR, closeNCR, assignNCR, recordScrap } = useProductionStore();
  const { employees } = useHRStore();
  const [subTab, setSubTab] = useState<'checks' | 'ncr' | 'scrap'>('checks');
  const [expandedQC, setExpandedQC] = useState<string | null>(null);
  const [expandedNCR, setExpandedNCR] = useState<string | null>(null);
  const [qcModalOpen, setQcModalOpen] = useState(false);
  const [scrapModalOpen, setScrapModalOpen] = useState(false);
  const [assignNcrId, setAssignNcrId] = useState<string | null>(null);

  const [qcForm, setQcForm] = useState<{ workOrderId: string; checkType: QualityCheckType; sampleSize: string; defectCount: string; checkedBy: string; param1Name: string; param1Target: string; param1Actual: string; param2Name: string; param2Target: string; param2Actual: string }>({ workOrderId: workOrders[0]?.id ?? '', checkType: 'in_process', sampleSize: '', defectCount: '', checkedBy: '', param1Name: '', param1Target: '', param1Actual: '', param2Name: '', param2Target: '', param2Actual: '' });
  const [scrapForm, setScrapForm] = useState<{ workOrderId: string; quantity: string; reason: 'defect' | 'setup_waste' | 'trial_run' | 'material_issue' | 'machine_issue' | 'other'; recordedBy: string; disposalMethod: 'recycled' | 'rework' | 'disposal' | 'vendor_return' }>({ workOrderId: workOrders[0]?.id ?? '', quantity: '', reason: 'defect', recordedBy: '', disposalMethod: 'disposal' });

  const passCount = qualityChecks.filter((q) => q.result === 'pass').length;
  const failCount = qualityChecks.filter((q) => q.result === 'fail').length;
  const pendingCount = qualityChecks.filter((q) => q.result === 'pending').length;
  const passRate = qualityChecks.length ? Math.round((passCount / qualityChecks.length) * 100) : 0;

  const totalScrapCost = scrapRecords.reduce((s, r) => s + r.cost, 0);
  const scrapByReason = Object.entries(
    scrapRecords.reduce((acc, r) => { acc[r.reason] = (acc[r.reason] || 0) + r.quantity; return acc; }, {} as Record<string, number>)
  ).map(([reason, qty]) => ({ name: REASON_LABELS[reason] ?? reason, value: qty }));

  const submitQC = () => {
    const wo = workOrders.find((w) => w.id === qcForm.workOrderId);
    const parameters = [];
    if (qcForm.param1Name) parameters.push({ name: qcForm.param1Name, unit: '', target: Number(qcForm.param1Target || 0), actual: Number(qcForm.param1Actual || 0), tolerance: 1, pass: Math.abs(Number(qcForm.param1Actual || 0) - Number(qcForm.param1Target || 0)) <= 1 });
    if (qcForm.param2Name) parameters.push({ name: qcForm.param2Name, unit: '', target: Number(qcForm.param2Target || 0), actual: Number(qcForm.param2Actual || 0), tolerance: 1, pass: Math.abs(Number(qcForm.param2Actual || 0) - Number(qcForm.param2Target || 0)) <= 1 });
    const newQC = createQualityCheck({
      workOrderId: qcForm.workOrderId, workOrderNumber: wo?.workOrderNumber ?? '', itemId: wo?.itemId ?? '', itemNameFa: wo?.itemNameFa ?? '',
      checkType: qcForm.checkType, sampleSize: Number(qcForm.sampleSize || 0), defectCount: Number(qcForm.defectCount || 0),
      checkedBy: qcForm.checkedBy || '—', parameters,
    });
    toast.success('بازرسی کیفی ثبت شد');
    setQcModalOpen(false);
    if (newQC.result === 'fail') {
      setTimeout(() => {
        if (confirm('نتیجه بازرسی مردود است. آیا مایلید NCR ثبت شود؟')) {
          raiseNCR({ workOrderId: newQC.workOrderId, title: `عدم انطباق در ${newQC.itemNameFa}`, description: `بازرسی ${newQC.checkNumber} با نرخ عیب ${newQC.defectRate}٪ مردود شد.`, severity: 'major', raisedBy: newQC.checkedBy });
          toast.success('NCR ثبت شد');
        }
      }, 300);
    }
  };

  const submitScrap = () => {
    const wo = workOrders.find((w) => w.id === scrapForm.workOrderId);
    recordScrap({ workOrderId: scrapForm.workOrderId, itemId: wo?.itemId ?? '', itemNameFa: wo?.itemNameFa ?? '', quantity: Number(scrapForm.quantity || 0), uom: wo?.uom ?? 'piece', reason: scrapForm.reason, recordedBy: scrapForm.recordedBy || '—', disposalMethod: scrapForm.disposalMethod });
    toast.success('ضایعات ثبت شد — هزینه از قیمت میانگین موجودی محاسبه شد');
    setScrapModalOpen(false);
  };

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-foreground">کنترل کیفیت</h1>

      <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 w-fit">
        {([{ id: 'checks', label: 'بازرسی‌ها' }, { id: 'ncr', label: 'NCR' }, { id: 'scrap', label: 'ضایعات' }] as const).map((t) => (
          <button key={t.id} onClick={() => setSubTab(t.id)} className={`px-3.5 py-1.5 rounded-md text-xs font-medium ${subTab === t.id ? 'bg-primary text-white' : 'text-muted-foreground'}`}>{t.label}</button>
        ))}
      </div>

      {subTab === 'checks' && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-card rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">کل بازرسی این ماه</p><p className="text-lg font-bold text-foreground" dir="ltr">{qualityChecks.length}</p></div>
            <div className="bg-card rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">نرخ قبولی</p><p className="text-lg font-bold text-emerald-600" dir="ltr">{passRate}٪</p></div>
            <div className="bg-card rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">مردود</p><p className="text-lg font-bold text-red-600" dir="ltr">{failCount}</p></div>
            <div className="bg-card rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">در انتظار</p><p className="text-lg font-bold text-amber-600" dir="ltr">{pendingCount}</p></div>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <button onClick={() => setQcModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90"><Plus className="w-3.5 h-3.5" />بازرسی جدید</button>
              <h3 className="text-sm font-semibold text-foreground">بازرسی‌های کیفی</h3>
            </div>
            <table className="w-full">
              <thead><tr className="border-b border-border bg-secondary/30">{['تاریخ', 'بازرس', 'نتیجه', 'نرخ عیب', 'معیوب', 'نمونه', 'نوع', 'محصول', 'دستور کار', 'شماره QC'].map((h) => <th key={h} className="text-right py-2.5 px-3 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {qualityChecks.map((qc) => {
                  const cfg = QC_RESULT_CONFIG[qc.result];
                  const isExp = expandedQC === qc.id;
                  return (
                    <Fragment key={qc.id}>
                      <tr className="border-b border-border/50 last:border-0 hover:bg-secondary/20 cursor-pointer" onClick={() => setExpandedQC(isExp ? null : qc.id)}>
                        <td className="py-2.5 px-3 text-[10px] text-muted-foreground" dir="ltr">{qc.checkedAt}</td>
                        <td className="py-2.5 px-3 text-[10px] text-muted-foreground">{qc.checkedBy}</td>
                        <td className="py-2.5 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color} ${cfg.bg}`}>{cfg.fa}</span></td>
                        <td className="py-2.5 px-3 text-[10px] font-mono" dir="ltr">{qc.defectRate}٪</td>
                        <td className="py-2.5 px-3 text-[10px] font-mono" dir="ltr">{qc.defectCount}</td>
                        <td className="py-2.5 px-3 text-[10px] font-mono" dir="ltr">{qc.sampleSize}</td>
                        <td className="py-2.5 px-3 text-[10px] text-muted-foreground">{qc.checkType}</td>
                        <td className="py-2.5 px-3 text-[10px] text-foreground">{qc.itemNameFa}</td>
                        <td className="py-2.5 px-3 text-[10px] text-muted-foreground" dir="ltr">{qc.workOrderNumber}</td>
                        <td className="py-2.5 px-3 text-[10px] font-mono text-primary flex items-center gap-1" dir="ltr"><ChevronLeft className={`w-3 h-3 transition-transform ${isExp ? '-rotate-90' : ''}`} />{qc.checkNumber}</td>
                      </tr>
                      {isExp && (
                        <tr><td colSpan={10} className="bg-secondary/20 p-3">
                          <table className="w-full">
                            <thead><tr className="border-b border-border">{['نتیجه', 'تلورانس', 'واقعی', 'هدف', 'پارامتر'].map((h) => <th key={h} className="text-right py-1 px-2 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
                            <tbody>
                              {qc.parameters.map((p, i) => (
                                <tr key={i} className="border-b border-border/30 last:border-0">
                                  <td className="py-1 px-2 text-[10px]">{p.pass ? <span className="text-emerald-600">قبول</span> : <span className="text-red-600">مردود</span>}</td>
                                  <td className="py-1 px-2 text-[10px] font-mono" dir="ltr">±{p.tolerance}</td>
                                  <td className="py-1 px-2 text-[10px] font-mono" dir="ltr">{p.actual}</td>
                                  <td className="py-1 px-2 text-[10px] font-mono" dir="ltr">{p.target}</td>
                                  <td className="py-1 px-2 text-[10px] text-foreground">{p.name}</td>
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
          </div>
        </div>
      )}

      {subTab === 'ncr' && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-border bg-secondary/30">{['عملیات', 'مسئول', 'تاریخ', 'ثبت‌کننده', 'وضعیت', 'شدت', 'عنوان', 'شماره NCR'].map((h) => <th key={h} className="text-right py-2.5 px-3 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
            <tbody>
              {ncrs.map((n) => {
                const cfg = NCR_STATUS_CONFIG[n.status];
                const isExp = expandedNCR === n.id;
                return (
                  <Fragment key={n.id}>
                    <tr className="border-b border-border/50 last:border-0 hover:bg-secondary/20 cursor-pointer" onClick={() => setExpandedNCR(isExp ? null : n.id)}>
                      <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {n.status !== 'closed' && (
                            <>
                              <button onClick={() => setAssignNcrId(n.id)} className="flex items-center gap-1 text-[10px] text-blue-700 hover:underline"><UserPlus className="w-3 h-3" />ارجاع</button>
                              <button onClick={() => { closeNCR(n.id, 'سرپرست تولید'); toast.success('NCR بسته شد'); }} className="flex items-center gap-1 text-[10px] text-emerald-700 hover:underline"><CheckCircle2 className="w-3 h-3" />بستن</button>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[10px] text-muted-foreground">{n.assignedTo ?? '—'}</td>
                      <td className="py-2.5 px-3 text-[10px] text-muted-foreground" dir="ltr">{n.raisedAt}</td>
                      <td className="py-2.5 px-3 text-[10px] text-muted-foreground">{n.raisedBy}</td>
                      <td className="py-2.5 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color} ${cfg.bg}`}>{cfg.fa}</span></td>
                      <td className="py-2.5 px-3 text-[10px]">{n.severity === 'critical' ? 'بحرانی' : n.severity === 'major' ? 'زیاد' : 'کم'}</td>
                      <td className="py-2.5 px-3 text-[10px] text-foreground">{n.title}</td>
                      <td className="py-2.5 px-3 text-[10px] font-mono text-primary" dir="ltr">{n.ncrNumber}</td>
                    </tr>
                    {isExp && (
                      <tr><td colSpan={8} className="bg-secondary/20 p-3 text-[11px] space-y-1">
                        <p><span className="text-muted-foreground">شرح: </span><span className="text-foreground">{n.description}</span></p>
                        {n.rootCause && <p><span className="text-muted-foreground">علت ریشه‌ای: </span><span className="text-foreground">{n.rootCause}</span></p>}
                        {n.correctiveAction && <p><span className="text-muted-foreground">اقدام اصلاحی: </span><span className="text-foreground">{n.correctiveAction}</span></p>}
                        {n.grnId && <button className="text-accent hover:underline">مشاهده GRN</button>}
                      </td></tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'scrap' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">هزینه ضایعات این ماه</p><p className="text-lg font-bold text-red-600" dir="ltr">{totalScrapCost.toLocaleString('fa-IR')} ریال</p></div>
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground mb-2">علل ضایعات</p>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={scrapByReason} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={45} label>
                    {scrapByReason.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <button onClick={() => setScrapModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90"><Plus className="w-3.5 h-3.5" />ثبت ضایعات</button>
              <h3 className="text-sm font-semibold text-foreground">رکوردهای ضایعات</h3>
            </div>
            <table className="w-full">
              <thead><tr className="border-b border-border bg-secondary/30">{['نحوه دفع', 'هزینه', 'علت', 'مقدار', 'محصول', 'دستور کار'].map((h) => <th key={h} className="text-right py-2.5 px-3 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {scrapRecords.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 px-3 text-[10px] text-muted-foreground">{r.disposalMethod}</td>
                    <td className="py-2.5 px-3 text-[10px] font-mono text-red-600" dir="ltr">{r.cost.toLocaleString('fa-IR')}</td>
                    <td className="py-2.5 px-3 text-[10px] text-muted-foreground">{REASON_LABELS[r.reason]}</td>
                    <td className="py-2.5 px-3 text-[10px] font-mono" dir="ltr">{r.quantity} {r.uom}</td>
                    <td className="py-2.5 px-3 text-[10px] text-foreground">{r.itemNameFa}</td>
                    <td className="py-2.5 px-3 text-[10px] text-muted-foreground" dir="ltr">{r.workOrderId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QC modal */}
      {qcModalOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setQcModalOpen(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-[28rem] max-h-[85vh] overflow-y-auto" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setQcModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">بازرسی کیفی جدید</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>دستور کار</label>
                <select value={qcForm.workOrderId} onChange={(e) => setQcForm((f) => ({ ...f, workOrderId: e.target.value }))} className={inputCls} dir="rtl">
                  {workOrders.map((w) => <option key={w.id} value={w.id}>{w.workOrderNumber} — {w.itemNameFa}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>اندازه نمونه</label><input type="number" value={qcForm.sampleSize} onChange={(e) => setQcForm((f) => ({ ...f, sampleSize: e.target.value }))} className={inputCls} dir="ltr" /></div>
                <div>
                  <label className={labelCls}>نوع بازرسی</label>
                  <select value={qcForm.checkType} onChange={(e) => setQcForm((f) => ({ ...f, checkType: e.target.value as typeof qcForm.checkType }))} className={inputCls} dir="rtl">
                    <option value="incoming">ورودی</option><option value="in_process">حین تولید</option>
                    <option value="final">نهایی</option><option value="outgoing">خروجی</option>
                  </select>
                </div>
              </div>
              <div><label className={labelCls}>تعداد معیوب</label><input type="number" value={qcForm.defectCount} onChange={(e) => setQcForm((f) => ({ ...f, defectCount: e.target.value }))} className={inputCls} dir="ltr" /></div>
              <div><label className={labelCls}>بازرس</label><input value={qcForm.checkedBy} onChange={(e) => setQcForm((f) => ({ ...f, checkedBy: e.target.value }))} className={inputCls} dir="rtl" /></div>
              <p className={labelCls}>پارامترها</p>
              <div className="grid grid-cols-3 gap-2"><input placeholder="نام پارامتر ۱" value={qcForm.param1Name} onChange={(e) => setQcForm((f) => ({ ...f, param1Name: e.target.value }))} className={inputCls} dir="rtl" /><input placeholder="هدف" type="number" value={qcForm.param1Target} onChange={(e) => setQcForm((f) => ({ ...f, param1Target: e.target.value }))} className={inputCls} dir="ltr" /><input placeholder="واقعی" type="number" value={qcForm.param1Actual} onChange={(e) => setQcForm((f) => ({ ...f, param1Actual: e.target.value }))} className={inputCls} dir="ltr" /></div>
              <div className="grid grid-cols-3 gap-2"><input placeholder="نام پارامتر ۲" value={qcForm.param2Name} onChange={(e) => setQcForm((f) => ({ ...f, param2Name: e.target.value }))} className={inputCls} dir="rtl" /><input placeholder="هدف" type="number" value={qcForm.param2Target} onChange={(e) => setQcForm((f) => ({ ...f, param2Target: e.target.value }))} className={inputCls} dir="ltr" /><input placeholder="واقعی" type="number" value={qcForm.param2Actual} onChange={(e) => setQcForm((f) => ({ ...f, param2Actual: e.target.value }))} className={inputCls} dir="ltr" /></div>
              <button onClick={submitQC} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 mt-1">ثبت بازرسی</button>
            </div>
          </div>
        </div>
      )}

      {/* Scrap modal */}
      {scrapModalOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setScrapModalOpen(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-[26rem]" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setScrapModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">ثبت ضایعات</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>دستور کار</label>
                <select value={scrapForm.workOrderId} onChange={(e) => setScrapForm((f) => ({ ...f, workOrderId: e.target.value }))} className={inputCls} dir="rtl">
                  {workOrders.map((w) => <option key={w.id} value={w.id}>{w.workOrderNumber} — {w.itemNameFa}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>مقدار</label><input type="number" value={scrapForm.quantity} onChange={(e) => setScrapForm((f) => ({ ...f, quantity: e.target.value }))} className={inputCls} dir="ltr" /></div>
              <div>
                <label className={labelCls}>علت</label>
                <select value={scrapForm.reason} onChange={(e) => setScrapForm((f) => ({ ...f, reason: e.target.value as typeof scrapForm.reason }))} className={inputCls} dir="rtl">
                  {Object.entries(REASON_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>ثبت‌کننده</label><input value={scrapForm.recordedBy} onChange={(e) => setScrapForm((f) => ({ ...f, recordedBy: e.target.value }))} className={inputCls} dir="rtl" /></div>
              <button onClick={submitScrap} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 mt-1">ثبت</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign NCR modal */}
      {assignNcrId && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setAssignNcrId(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-[22rem]" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setAssignNcrId(null)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">ارجاع NCR</p>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {employees.map((e) => (
                <button key={e.id} onClick={() => { assignNCR(assignNcrId, e.name); toast.success(`به ${e.name} ارجاع شد`); setAssignNcrId(null); }} className="w-full text-right p-2 rounded-lg hover:bg-secondary text-xs text-foreground">
                  {e.name} <span className="text-muted-foreground">— {e.position}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
