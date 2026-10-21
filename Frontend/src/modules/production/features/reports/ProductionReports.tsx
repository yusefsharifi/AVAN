import { useState } from 'react';
import { useProductionStore } from '../../store/useProductionStore';
import { useOeeMetrics } from '../../hooks';
import { useFinanceStore } from '@/modules/finance';
import { useInventoryStore } from '@/modules/inventory';
import { ExportButton } from '@/shared/components/ui';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const PIE_COLORS = ['#0E7C86', '#d97706', '#dc2626', '#7c3aed', '#64748b'];
const LINE_COLORS = ['#0E7C86', '#d97706', '#7c3aed'];
const REASON_LABELS: Record<string, string> = { defect: 'معیوب', setup_waste: 'ضایعات راه‌اندازی', trial_run: 'تست اولیه', material_issue: 'مشکل مواد', machine_issue: 'مشکل دستگاه', other: 'سایر' };

export default function ProductionReports() {
  const { workOrders, boms, scrapRecords, qualityChecks } = useProductionStore();
  const { accounts, vouchers } = useFinanceStore();
  const { items } = useInventoryStore();
  const oee = useOeeMetrics();
  const [report, setReport] = useState<'monthly' | 'oee' | 'quality' | 'cost'>('monthly');

  const weeklyData = [1, 2, 3, 4].map((w) => {
    const planned = Math.round(workOrders.reduce((s, wo) => s + wo.plannedQuantity, 0) / 4);
    const actual = Math.round(workOrders.reduce((s, wo) => s + wo.actualQuantity, 0) / 4 * (0.8 + w * 0.05));
    return { week: `هفته ${w}`, planned, actual, achievement: planned ? Math.round((actual / planned) * 100) : 0 };
  });
  const scrapRate = workOrders.reduce((s, w) => s + w.plannedQuantity, 0)
    ? Math.round((scrapRecords.reduce((s, r) => s + r.quantity, 0) / workOrders.reduce((s, w) => s + w.plannedQuantity, 0)) * 1000) / 10
    : 0;

  const defectByReason = Object.entries(
    scrapRecords.reduce((acc, r) => { acc[r.reason] = (acc[r.reason] || 0) + r.quantity; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name: REASON_LABELS[name] ?? name, value }));
  const defectByWO = qualityChecks.map((q) => ({ name: q.workOrderNumber, defectRate: q.defectRate }));
  const topDefective = [...qualityChecks].sort((a, b) => b.defectRate - a.defectRate).slice(0, 5);

  const cogsAccount = accounts.find((a) => a.code === '5101');
  const productionVouchers = vouchers.filter((v) => v.referenceType === 'production');
  const itemPrices = Object.fromEntries(items.map((i) => [i.id, i.movingAverageCost]));
  const woCosts = workOrders.map((wo) => {
    const bom = boms.find((b) => b.id === wo.bomId);
    const materialCost = bom ? bom.lines.reduce((s, l) => s + l.quantity * (1 + l.scrapFactor) * (wo.actualQuantity || wo.plannedQuantity) * (itemPrices[l.itemId] ?? 0), 0) : 0;
    const voucher = productionVouchers.find((v) => v.referenceId === wo.id);
    return { wo, materialCost, processingCost: bom?.processingCost ?? 0, total: materialCost + (bom?.processingCost ?? 0), voucher };
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <ExportButton data={weeklyData} filename="production-report" columns={[{ key: 'week', header: 'هفته' }, { key: 'planned', header: 'برنامه' }, { key: 'actual', header: 'واقعی' }, { key: 'achievement', header: 'درصد تحقق' }]} />
        <h1 className="text-lg font-bold text-foreground">گزارشات تولید</h1>
      </div>

      <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 w-fit">
        {([
          { id: 'monthly', label: 'تولید ماهانه' }, { id: 'oee', label: 'آمار OEE' },
          { id: 'quality', label: 'آمار کیفیت' }, { id: 'cost', label: 'هزینه تولید' },
        ] as const).map((t) => (
          <button key={t.id} onClick={() => setReport(t.id)} className={`px-3.5 py-1.5 rounded-md text-xs font-medium ${report === t.id ? 'bg-primary text-white' : 'text-muted-foreground'}`}>{t.label}</button>
        ))}
      </div>

      {report === 'monthly' && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-xs font-bold text-foreground mb-3">برنامه در مقابل واقعی (هفتگی)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weeklyData}>
                <XAxis dataKey="week" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="planned" name="برنامه" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="واقعی" fill="#0E7C86" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-border bg-secondary/30">{['نرخ ضایعات', 'OEE', 'درصد تحقق', 'واقعی', 'برنامه', 'هفته'].map((h) => <th key={h} className="text-right py-2.5 px-3 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {weeklyData.map((w) => (
                  <tr key={w.week} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 px-3 text-xs font-mono" dir="ltr">{scrapRate}٪</td>
                    <td className="py-2.5 px-3 text-xs font-mono" dir="ltr">{oee.overallOEE}٪</td>
                    <td className="py-2.5 px-3 text-xs font-mono" dir="ltr">{w.achievement}٪</td>
                    <td className="py-2.5 px-3 text-xs font-mono" dir="ltr">{w.actual.toLocaleString('fa-IR')}</td>
                    <td className="py-2.5 px-3 text-xs font-mono" dir="ltr">{w.planned.toLocaleString('fa-IR')}</td>
                    <td className="py-2.5 px-3 text-xs text-foreground">{w.week}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {report === 'oee' && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-xs font-bold text-foreground mb-3">روند OEE ۷ روز اخیر</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={oee.trend}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 10 }} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
                {oee.byLine.map((l, i) => <Line key={l.id} type="monotone" dataKey={l.nameFa} stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-border bg-secondary/30">{['OEE', 'کیفیت', 'کارایی', 'دسترس‌پذیری', 'ماشین'].map((h) => <th key={h} className="text-right py-2.5 px-3 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {oee.byMachine.map((m) => (
                  <tr key={m.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 px-3 text-xs font-bold" dir="ltr">{m.oee}٪</td>
                    <td className="py-2.5 px-3 text-xs font-mono" dir="ltr">{m.quality}٪</td>
                    <td className="py-2.5 px-3 text-xs font-mono" dir="ltr">{m.performance}٪</td>
                    <td className="py-2.5 px-3 text-xs font-mono" dir="ltr">{m.availability}٪</td>
                    <td className="py-2.5 px-3 text-xs text-foreground">{m.nameFa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {report === 'quality' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-xs font-bold text-foreground mb-3">علل ضایعات</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={defectByReason} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {defectByReason.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-xs font-bold text-foreground mb-3">نرخ عیب به‌تفکیک دستور کار</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={defectByWO}>
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip />
                  <Bar dataKey="defectRate" name="نرخ عیب ٪" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-3 bg-secondary/30 border-b border-border"><p className="text-xs font-bold text-foreground">۵ محصول با بیشترین نرخ عیب</p></div>
            <table className="w-full">
              <thead><tr className="border-b border-border">{['نتیجه', 'نرخ عیب', 'محصول', 'شماره QC'].map((h) => <th key={h} className="text-right py-2 px-2 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {topDefective.map((q) => (
                  <tr key={q.id} className="border-b border-border/30 last:border-0">
                    <td className="py-2 px-2 text-[10px]">{q.result}</td>
                    <td className="py-2 px-2 text-[10px] font-mono" dir="ltr">{q.defectRate}٪</td>
                    <td className="py-2 px-2 text-[10px] text-foreground">{q.itemNameFa}</td>
                    <td className="py-2 px-2 text-[10px] font-mono text-primary" dir="ltr">{q.checkNumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {report === 'cost' && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-xs font-bold text-foreground mb-3">هزینه تولید در مقابل مانده حساب بهای تولید (مالی)</h3>
            <div className="flex items-center gap-6 mb-3">
              <div><p className="text-[10px] text-muted-foreground">مانده حساب ۵۱۰۱ (از مالی)</p><p className="text-sm font-bold text-foreground" dir="ltr">{(cogsAccount?.currentBalance ?? 0).toLocaleString('fa-IR')}</p></div>
              <div><p className="text-[10px] text-muted-foreground">مجموع هزینه محاسبه‌شده WOها</p><p className="text-sm font-bold text-foreground" dir="ltr">{woCosts.reduce((s, w) => s + w.total, 0).toLocaleString('fa-IR')}</p></div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={woCosts.slice(0, 7).map((w) => ({ name: w.wo.workOrderNumber, cost: Math.round(w.total) }))}>
                <XAxis dataKey="name" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip />
                <Bar dataKey="cost" name="بهای تولید" fill="#0E7C86" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-border bg-secondary/30">{['سند مالی', 'جمع کل', 'هزینه فرآوری', 'هزینه مواد', 'شماره WO'].map((h) => <th key={h} className="text-right py-2.5 px-3 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {woCosts.map(({ wo, materialCost, processingCost, total, voucher }) => (
                  <tr key={wo.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 px-3 text-xs font-mono text-primary" dir="ltr">{voucher?.voucherNumber ?? '—'}</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-foreground" dir="ltr">{Math.round(total).toLocaleString('fa-IR')}</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-muted-foreground" dir="ltr">{Math.round(processingCost).toLocaleString('fa-IR')}</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-muted-foreground" dir="ltr">{Math.round(materialCost).toLocaleString('fa-IR')}</td>
                    <td className="py-2.5 px-3 text-xs text-foreground" dir="ltr">{wo.workOrderNumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
