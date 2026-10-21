import { usePortalStore } from '../../store';
import { KpiWidget } from '../../components/KpiWidget';
import { Building2, Truck, CreditCard, Shield, Users, AlertTriangle, Package, Clock } from 'lucide-react';
import { COMPANY_STATUS_CONFIG } from '../../constants';
import type { Company } from '../../types';

export function ExecutiveDashboard() {
  const { companies, shipments, getCompanyStats } = usePortalStore();
  const stats = getCompanyStats();

  const expiringPermits = companies.flatMap(c => c.permits.filter(p => p.status === 'expiring_soon').map(p => ({ ...p, companyName: c.name }))).slice(0, 5);
  const recentShipments = shipments.slice(0, 5);

  return (
    <div className="h-full flex flex-col p-5 space-y-5" dir="rtl">
      <h1 className="text-lg font-bold text-foreground">داشبورد مدیریتی</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <KpiWidget label="Companies" labelFa="شرکت‌های فعال" value={stats.active} icon={Building2} color="bg-primary/10 text-primary" change={5} />
        <KpiWidget label="Shipments" labelFa="بارنامه‌ها" value={shipments.length} icon={Truck} color="bg-blue-50 text-blue-600" change={12} />
        <KpiWidget label="Revenue" labelFa="درآمد ماهانه" value={`${(stats.totalRevenue / 1000000).toFixed(0)}M`} unit="تومان" icon={CreditCard} color="bg-emerald-50 text-emerald-600" change={8} />
        <KpiWidget label="HSE" labelFa="میانگین HSE" value={Math.round(companies.reduce((s, c) => s + c.hseRating, 0) / companies.length)} icon={Shield} color="bg-amber-50 text-amber-600" change={3} />
        <KpiWidget label="Expiring" labelFa="مجوزهای در حال انقضا" value={stats.expiringPermits} icon={AlertTriangle} color="bg-red-50 text-red-600" />
        <KpiWidget label="Contractors" labelFa="پیمانکاران" value={companies.reduce((s, c) => s + c.activeContractorsCount, 0)} icon={Users} color="bg-purple-50 text-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Expiring Permits */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground text-right">مجوزهای در حال انقضا</h3>
            <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{expiringPermits.length} مورد</span>
          </div>
          <div className="space-y-2">
            {expiringPermits.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50/50">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <div>
                    <p className="text-xs font-medium text-foreground">{p.type === 'operating' ? 'پروانه بهره‌برداری' : 'مجوز محیط زیست'}</p>
                    <p className="text-[10px] text-muted-foreground">{p.companyName}</p>
                  </div>
                </div>
                <span className="text-[10px] text-amber-700 font-semibold" dir="ltr">انقضا: {p.expiryDate}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Shipments */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground text-right">بارنامه‌های اخیر</h3>
          </div>
          <div className="space-y-2">
            {recentShipments.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-foreground" dir="ltr">{s.waybillNumber}</p>
                    <p className="text-[10px] text-muted-foreground">{s.driverName} · {s.cargoType}</p>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : s.status === 'pending_approval' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                  {s.status === 'completed' ? 'تکمیل' : s.status === 'pending_approval' ? 'در انتظار' : s.status === 'approved' ? 'تأیید شده' : s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
