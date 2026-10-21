import { useState } from 'react';
import { useProcurementStore } from '../../store/useProcurementStore';
import { useInventoryStore } from '@/modules/inventory';
import { ExportButton } from '@/shared/components/ui';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { VENDOR_CATEGORY_CONFIG } from '../../constants';

const PIE_COLORS = ['#0E7C86', '#d97706', '#dc2626', '#7c3aed', '#64748b', '#0891b2', '#65a30d'];

export default function ProcurementReports() {
  const { purchaseOrders, vendors, getVendorSpendAnalysis, getItemPriceHistory } = useProcurementStore();
  const { items } = useInventoryStore();
  const [report, setReport] = useState<'monthly' | 'vendors' | 'price' | 'performance'>('monthly');
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id ?? '');

  // 1. Monthly (group POs by orderDate month-prefix)
  const monthlyMap = new Map<string, { count: number; total: number; paid: number }>();
  purchaseOrders.forEach((po) => {
    const month = po.orderDate.slice(0, 7);
    const e = monthlyMap.get(month) ?? { count: 0, total: 0, paid: 0 };
    monthlyMap.set(month, { count: e.count + 1, total: e.total + po.grandTotal, paid: e.paid + po.paidAmount });
  });
  const monthlyData = Array.from(monthlyMap.entries()).map(([month, v]) => ({ month, ...v, outstanding: v.total - v.paid }));

  // 2. Vendor analysis
  const vendorSpend = getVendorSpendAnalysis();
  const spendByCategory = Object.entries(
    vendors.reduce((acc, v) => {
      const spend = purchaseOrders.filter((po) => po.vendorId === v.id).reduce((s, po) => s + po.grandTotal, 0);
      acc[v.category] = (acc[v.category] || 0) + spend;
      return acc;
    }, {} as Record<string, number>)
  ).map(([cat, value]) => ({ name: VENDOR_CATEGORY_CONFIG[cat as keyof typeof VENDOR_CATEGORY_CONFIG]?.fa ?? cat, value })).filter((d) => d.value > 0);

  // 3. Price history
  const priceHistory = getItemPriceHistory(selectedItemId);
  const prices = priceHistory.map((h) => h.unitPrice);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const avgPrice = prices.length ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length) : 0;

  // 4. Vendor performance comparison
  const perfData = vendors.filter((v) => v.status === 'active').map((v) => {
    const latest = v.performanceHistory[v.performanceHistory.length - 1];
    return { name: v.nameFa, 'تحویل به‌موقع': latest?.onTimeDeliveryRate ?? 0, 'کیفیت': latest?.qualityAcceptanceRate ?? 0, 'انطباق قیمت': latest?.priceComplianceRate ?? 0 };
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <ExportButton data={monthlyData} filename="procurement-report" columns={[{ key: 'month', header: 'ماه' }, { key: 'count', header: 'تعداد PO' }, { key: 'total', header: 'مبلغ کل' }, { key: 'paid', header: 'پرداخت‌شده' }]} />
        <h1 className="text-lg font-bold text-foreground">گزارشات خرید</h1>
      </div>

      <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 w-fit">
        {([{ id: 'monthly', label: 'خرید ماهانه' }, { id: 'vendors', label: 'تحلیل تأمین‌کنندگان' }, { id: 'price', label: 'تاریخچه قیمت کالا' }, { id: 'performance', label: 'عملکرد تأمین‌کنندگان' }] as const).map((t) => (
          <button key={t.id} onClick={() => setReport(t.id)} className={`px-3.5 py-1.5 rounded-md text-xs font-medium ${report === t.id ? 'bg-primary text-white' : 'text-muted-foreground'}`}>{t.label}</button>
        ))}
      </div>

      {report === 'monthly' && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-xs font-bold text-foreground mb-3">ارزش سفارشات خرید بر اساس ماه</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip />
                <Bar dataKey="total" fill="#0E7C86" radius={[4, 4, 0, 0]} name="مبلغ کل" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-border bg-secondary/30">{['معوق', 'پرداخت‌شده', 'مبلغ کل', 'تعداد PO', 'ماه'].map((h) => <th key={h} className="text-right py-2.5 px-3 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {monthlyData.map((m) => (
                  <tr key={m.month} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 px-3 text-xs font-mono text-red-600" dir="ltr">{m.outstanding.toLocaleString('fa-IR')}</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-emerald-600" dir="ltr">{m.paid.toLocaleString('fa-IR')}</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-foreground" dir="ltr">{m.total.toLocaleString('fa-IR')}</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-muted-foreground" dir="ltr">{m.count}</td>
                    <td className="py-2.5 px-3 text-xs text-foreground" dir="ltr">{m.month}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {report === 'vendors' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-xs font-bold text-foreground mb-3">۱۰ تأمین‌کننده برتر (بر اساس خرید)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={vendorSpend.slice(0, 10)} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 9 }} /><YAxis type="category" dataKey="vendorName" tick={{ fontSize: 9 }} width={100} /><Tooltip />
                  <Bar dataKey="totalSpend" fill="#0E7C86" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-xs font-bold text-foreground mb-3">خرید بر اساس دسته‌بندی</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={spendByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label>
                    {spendByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-border bg-secondary/30">{['میانگین مدت تحویل', 'تعداد PO', 'مجموع خرید', 'تأمین‌کننده'].map((h) => <th key={h} className="text-right py-2.5 px-3 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {vendorSpend.map((v) => (
                  <tr key={v.vendorId} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 px-3 text-xs font-mono text-muted-foreground" dir="ltr">{v.avgLeadTime} روز</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-muted-foreground" dir="ltr">{v.poCount}</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-foreground" dir="ltr">{v.totalSpend.toLocaleString('fa-IR')}</td>
                    <td className="py-2.5 px-3 text-xs text-foreground">{v.vendorName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {report === 'price' && (
        <div className="space-y-4">
          <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-background text-xs">
            {items.map((i) => <option key={i.id} value={i.id}>{i.nameFa}</option>)}
          </select>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">کمترین قیمت</p><p className="text-lg font-bold text-emerald-600" dir="ltr">{minPrice.toLocaleString('fa-IR')}</p></div>
            <div className="bg-card rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">بیشترین قیمت</p><p className="text-lg font-bold text-red-600" dir="ltr">{maxPrice.toLocaleString('fa-IR')}</p></div>
            <div className="bg-card rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">میانگین</p><p className="text-lg font-bold text-foreground" dir="ltr">{avgPrice.toLocaleString('fa-IR')}</p></div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-xs font-bold text-foreground mb-3">روند قیمت خرید</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={priceHistory}>
                <XAxis dataKey="date" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip />
                <Line type="monotone" dataKey="unitPrice" stroke="#0E7C86" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-border bg-secondary/30">{['شماره PO', 'مقدار', 'قیمت واحد', 'تأمین‌کننده', 'تاریخ'].map((h) => <th key={h} className="text-right py-2.5 px-3 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {priceHistory.map((h, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 px-3 text-xs font-mono text-primary" dir="ltr">{h.poNumber}</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-muted-foreground" dir="ltr">{h.quantity}</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-foreground" dir="ltr">{h.unitPrice.toLocaleString('fa-IR')}</td>
                    <td className="py-2.5 px-3 text-xs text-foreground">{h.vendorName}</td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground" dir="ltr">{h.date}</td>
                  </tr>
                ))}
                {priceHistory.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-[11px] text-muted-foreground">تاریخچه خریدی برای این کالا ثبت نشده</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {report === 'performance' && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-xs font-bold text-foreground mb-3">مقایسه عملکرد تأمین‌کنندگان</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={perfData}>
                <XAxis dataKey="name" tick={{ fontSize: 9 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 10 }} /><Tooltip /><Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="تحویل به‌موقع" fill="#0E7C86" radius={[4, 4, 0, 0]} />
                <Bar dataKey="کیفیت" fill="#d97706" radius={[4, 4, 0, 0]} />
                <Bar dataKey="انطباق قیمت" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-border bg-secondary/30">{['امتیاز کل', 'انطباق قیمت', 'کیفیت', 'تحویل به‌موقع', 'تأمین‌کننده'].map((h) => <th key={h} className="text-right py-2.5 px-3 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {vendors.filter((v) => v.status === 'active').map((v) => {
                  const latest = v.performanceHistory[v.performanceHistory.length - 1];
                  return (
                    <tr key={v.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 px-3 text-xs font-bold text-foreground" dir="ltr">{v.overallScore}</td>
                      <td className="py-2.5 px-3 text-xs font-mono text-muted-foreground" dir="ltr">{latest?.priceComplianceRate ?? '—'}٪</td>
                      <td className="py-2.5 px-3 text-xs font-mono text-muted-foreground" dir="ltr">{latest?.qualityAcceptanceRate ?? '—'}٪</td>
                      <td className="py-2.5 px-3 text-xs font-mono text-muted-foreground" dir="ltr">{latest?.onTimeDeliveryRate ?? '—'}٪</td>
                      <td className="py-2.5 px-3 text-xs text-foreground">{v.nameFa}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
