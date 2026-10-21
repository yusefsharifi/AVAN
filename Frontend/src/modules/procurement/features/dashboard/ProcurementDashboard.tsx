import { toast } from 'sonner';
import { useProcurementStore } from '../../store/useProcurementStore';
import { useProcurementStats } from '../../hooks';
import { useInventoryStore } from '@/modules/inventory';
import { useFinanceStore } from '@/modules/finance';
import { SHIPMENTS } from '@/entities/document';
import { VendorScoreCard } from '../../components';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  ClipboardList, MessageSquare, ShoppingCart, Landmark, Building2, FileSignature, Wallet,
  Plus, Truck, AlertTriangle, ArrowLeft,
} from 'lucide-react';

export default function ProcurementDashboard() {
  const { vendors, purchaseRequests, rfqs, purchaseOrders, getExpiringContracts, createPurchaseRequest, getVendorSpendAnalysis } = useProcurementStore();
  const stats = useProcurementStats();
  const { items } = useInventoryStore();
  const { accounts } = useFinanceStore();

  const reorderItems = items.filter((i) => i.availableQuantity <= i.reorderPoint).slice(0, 6);
  const apAccount = accounts.find((a) => a.code === '2101');
  const inboundShipments = SHIPMENTS.filter((s) => s.direction === 'in').slice(0, 5);
  const topVendors = getVendorSpendAnalysis().slice(0, 5);
  const topVendor = vendors.find((v) => v.id === stats.topVendorId);
  const expiring = getExpiringContracts(60);

  const kpis = [
    { label: 'درخواست خرید باز', value: stats.openPRs, icon: ClipboardList },
    { label: 'استعلام فعال', value: stats.openRFQs, icon: MessageSquare },
    { label: 'PO در انتظار دریافت', value: stats.pendingReceipts, icon: ShoppingCart },
    { label: 'پرداخت معوق', value: stats.overduePayments, icon: Wallet },
    { label: 'تأمین‌کننده فعال', value: stats.activeVendors, icon: Building2 },
    { label: 'قرارداد در حال انقضا', value: stats.expiringContracts, icon: FileSignature },
    { label: 'ارزش خرید این ماه', value: new Intl.NumberFormat('fa-IR').format(stats.totalPOValueThisMonth), icon: Landmark },
  ];

  const handleCreatePR = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    createPurchaseRequest({
      source: 'reorder_auto', sourceRef: item.sku, requestedBy: 'سیستم بازسفارش', requestedByDept: 'انبار', priority: 'urgent',
      lines: [{ id: `prl-${Date.now()}`, itemId: item.id, itemNameFa: item.nameFa, itemSku: item.sku, uom: item.uom, requestedQuantity: item.reorderQuantity, estimatedUnitPrice: item.lastPurchasePrice, totalEstimated: item.reorderQuantity * item.lastPurchasePrice, requiredDate: '—', notes: '' }],
    });
    toast.success('درخواست خرید ایجاد شد');
  };

  const pipeline = [
    { label: 'PR', count: purchaseRequests.length },
    { label: 'RFQ', count: rfqs.length },
    { label: 'PO', count: purchaseOrders.length },
    { label: 'دریافت', count: purchaseOrders.filter((po) => ['partially_received', 'fully_received', 'invoiced', 'paid'].includes(po.status)).length },
    { label: 'پرداخت', count: purchaseOrders.filter((po) => po.status === 'paid').length },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-foreground">داشبورد خرید و تأمین</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="bg-card rounded-xl border border-border shadow-sm p-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2 bg-accent/10 text-accent"><k.icon className="w-4 h-4" /></div>
            <p className="text-base font-bold text-foreground" dir="ltr">{k.value}</p>
            <p className="text-[10px] text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Pipeline funnel */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-4">
        <h3 className="text-xs font-bold text-foreground mb-3">قیف فرآیند خرید</h3>
        <div className="flex items-center">
          {pipeline.map((p, i) => (
            <div key={p.label} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <span className="text-lg font-bold text-accent" dir="ltr">{p.count}</span>
                <span className="text-[10px] text-muted-foreground">{p.label}</span>
              </div>
              {i < pipeline.length - 1 && <ArrowLeft className="w-4 h-4 text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* Cross-module widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <h3 className="text-xs font-bold text-foreground mb-3">نقاط سفارش مجدد (از انبار)</h3>
          <div className="space-y-2">
            {reorderItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-[11px] border-b border-border/50 pb-1.5 last:border-0">
                <button onClick={() => handleCreatePR(item.id)} className="flex items-center gap-1 text-accent hover:underline"><Plus className="w-3 h-3" />ایجاد PR</button>
                <span className="text-muted-foreground" dir="ltr">{item.availableQuantity}/{item.reorderPoint}</span>
                <span className="text-foreground font-medium">{item.nameFa}</span>
              </div>
            ))}
            {reorderItems.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-3">کالایی به نقطه سفارش نرسیده</p>}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <h3 className="text-xs font-bold text-foreground mb-3">تطبیق پرداختنی‌ها (از مالی)</h3>
          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between"><span className="text-muted-foreground">مانده حساب پرداختنی (۲۱۰۱)</span><span className="font-mono font-semibold text-foreground" dir="ltr">{(apAccount?.currentBalance ?? 0).toLocaleString('fa-IR')}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">مانده PO های خرید</span><span className="font-mono font-semibold text-foreground" dir="ltr">{stats.totalPayablesOutstanding.toLocaleString('fa-IR')}</span></div>
            <div className={`flex justify-between pt-2 border-t border-border ${Math.abs((apAccount?.currentBalance ?? 0) - stats.totalPayablesOutstanding) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              <span>اختلاف</span><span className="font-mono font-bold" dir="ltr">{Math.abs((apAccount?.currentBalance ?? 0) - stats.totalPayablesOutstanding).toLocaleString('fa-IR')}</span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <h3 className="text-xs font-bold text-foreground mb-3">تردد ورود کالا (از تردد شهرک)</h3>
          <div className="space-y-2">
            {inboundShipments.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-[11px] border-b border-border/50 pb-1.5 last:border-0">
                <button className="text-accent hover:underline flex items-center gap-1"><Truck className="w-3 h-3" />تطبیق با PO</button>
                <span className="text-muted-foreground" dir="ltr">{s.weight} kg</span>
                <span className="text-foreground font-medium font-mono" dir="ltr">{s.plate}</span>
              </div>
            ))}
            {inboundShipments.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-3">تردد ورودی ثبت نشده</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <h3 className="text-xs font-bold text-foreground mb-3">۵ تأمین‌کننده برتر (بر اساس خرید)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topVendors} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 9 }} />
              <YAxis type="category" dataKey="vendorName" tick={{ fontSize: 10 }} width={110} />
              <Tooltip />
              <Bar dataKey="totalSpend" fill="#0E7C86" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {topVendor && (
          <div>
            <h3 className="text-xs font-bold text-foreground mb-3">تأمین‌کننده برتر</h3>
            <VendorScoreCard vendor={topVendor} />
          </div>
        )}
      </div>

      {expiring.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-foreground">هشدار انقضای قرارداد</h3>
          {expiring.map((c) => (
            <div key={c.id} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-3">
              <span className="text-[11px] text-amber-800 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />انقضا: {c.endDate}</span>
              <span className="text-xs font-semibold text-amber-900">{c.title} — {c.vendorName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
