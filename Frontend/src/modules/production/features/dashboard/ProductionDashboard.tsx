import { useProductionStore } from '../../store/useProductionStore';
import { useProductionStats } from '../../hooks';
import { useInventoryStore } from '@/modules/inventory';
import { useFinanceStore } from '@/modules/finance';
import { SHIPMENTS } from '@/entities/document';
import { GanttChart } from '../../components';
import { LINE_STATUS_CONFIG } from '../../constants';
import { ClipboardList, Gauge, Factory, ShieldAlert, ShoppingCart, CheckCircle2, Truck, Landmark, PackageSearch } from 'lucide-react';

export default function ProductionDashboard() {
  const { workOrders, productionLines } = useProductionStore();
  const stats = useProductionStats();
  const { requisitions } = useInventoryStore();
  const { vouchers } = useFinanceStore();

  const productionMRs = requisitions.filter((r) => r.purpose === 'production' && r.status !== 'issued').slice(0, 5);
  const productionVouchers = vouchers.filter((v) => v.referenceType === 'production').slice(0, 5);
  const outboundShipments = SHIPMENTS.filter((s) => s.direction === 'out').slice(0, 5);

  const kpis = [
    { label: 'سفارشات در تولید', value: stats.pendingOrders + stats.activeWorkOrders, icon: ShoppingCart, color: 'text-blue-600 bg-blue-50' },
    { label: 'دستور کار باز', value: workOrders.filter((w) => w.status !== 'completed' && w.status !== 'cancelled').length, icon: ClipboardList, color: 'text-amber-600 bg-amber-50' },
    { label: 'OEE کل', value: `${stats.overallOEE}٪`, icon: Gauge, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'خطوط در حال تولید', value: `${stats.linesRunning}/${productionLines.length}`, icon: Factory, color: 'text-purple-600 bg-purple-50' },
    { label: 'چک کیفی در انتظار', value: stats.pendingQualityChecks, icon: CheckCircle2, color: 'text-slate-600 bg-slate-100' },
    { label: 'NCR باز', value: stats.openNCRs, icon: ShieldAlert, color: 'text-red-600 bg-red-50' },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-foreground">داشبورد تولید</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="bg-card rounded-xl border border-border shadow-sm p-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${k.color}`}><k.icon className="w-4 h-4" /></div>
            <p className="text-lg font-bold text-foreground" dir="ltr">{k.value}</p>
            <p className="text-[10px] text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Cross-module widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <div className="flex items-center gap-1.5 mb-3"><PackageSearch className="w-4 h-4 text-accent" /><h3 className="text-xs font-bold text-foreground">مواد در راه (از انبار)</h3></div>
          <div className="space-y-2">
            {productionMRs.map((mr) => (
              <div key={mr.id} className="flex items-center justify-between text-[11px] border-b border-border/50 pb-1.5 last:border-0">
                <span className="text-muted-foreground">{mr.status}</span>
                <span className="text-foreground font-medium">{mr.lineItems[0]?.itemName ?? '—'}</span>
              </div>
            ))}
            {productionMRs.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-3">درخواستی در جریان نیست</p>}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <div className="flex items-center gap-1.5 mb-3"><Landmark className="w-4 h-4 text-emerald-600" /><h3 className="text-xs font-bold text-foreground">اسناد مالی تولید</h3></div>
          <div className="space-y-2">
            {productionVouchers.map((v) => (
              <div key={v.id} className="flex items-center justify-between text-[11px] border-b border-border/50 pb-1.5 last:border-0">
                <span className={v.status === 'posted' ? 'text-emerald-600' : 'text-amber-600'}>{v.status}</span>
                <span className="text-foreground font-medium font-mono" dir="ltr">{v.totalDebit.toLocaleString('fa-IR')}</span>
                <span className="text-muted-foreground">{v.voucherNumber}</span>
              </div>
            ))}
            {productionVouchers.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-3">هنوز سندی ثبت نشده</p>}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <div className="flex items-center gap-1.5 mb-3"><Truck className="w-4 h-4 text-purple-600" /><h3 className="text-xs font-bold text-foreground">تردد خروج کالا</h3></div>
          <div className="space-y-2">
            {outboundShipments.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-[11px] border-b border-border/50 pb-1.5 last:border-0">
                <span className="text-muted-foreground" dir="ltr">{s.weight} kg</span>
                <span className="text-foreground font-medium">{s.cargoType}</span>
                <span className="text-muted-foreground font-mono" dir="ltr">{s.plate}</span>
              </div>
            ))}
            {outboundShipments.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-3">تردد خروجی ثبت نشده</p>}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm p-4">
        <h3 className="text-sm font-bold text-foreground mb-3">نمای کلی برنامه تولید</h3>
        <GanttChart workOrders={workOrders.filter((w) => w.status !== 'completed' && w.status !== 'cancelled')} lines={productionLines} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {productionLines.map((line) => {
          const cfg = LINE_STATUS_CONFIG[line.currentStatus];
          const currentWO = workOrders.find((w) => w.id === line.currentWorkOrderId) ?? workOrders.find((w) => w.lineId === line.id && w.status === 'in_progress');
          return (
            <div key={line.id} className="bg-card rounded-xl border border-border shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color} ${cfg.bg}`}>{cfg.fa}</span>
                <p className="text-sm font-bold text-foreground">{line.nameFa}</p>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2">{currentWO ? `دستور کار جاری: ${currentWO.workOrderNumber}` : 'بدون دستور کار جاری'}</p>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-foreground" dir="ltr">{line.oee}٪</span>
                <span className="text-[10px] text-muted-foreground">OEE</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5 mb-2"><div className="bg-accent h-1.5 rounded-full" style={{ width: `${line.oee}%` }} /></div>
              <p className="text-[10px] text-muted-foreground">نگهداری بعدی: <span dir="ltr">{line.nextMaintenanceDate}</span></p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
