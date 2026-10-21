import type { Company } from '../../../types';
import { KpiWidget } from '../../../components/KpiWidget';
import { Building2, Truck, CreditCard, Shield, Users, Clock } from 'lucide-react';

interface OverviewTabProps {
  company: Company;
}

export function OverviewTab({ company }: OverviewTabProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiWidget label="Total Shipments" labelFa="بارنامه YTD" value={company.totalShipmentsYTD} icon={Truck} color="bg-primary/10 text-primary" change={8} />
        <KpiWidget label="Avg Processing" labelFa="میانگین پردازش" value={company.avgProcessingTime} unit="دقیقه" icon={Clock} color="bg-amber-50 text-amber-600" change={-5} />
        <KpiWidget label="Outstanding" labelFa="مانده بدهی" value={`${(company.outstandingBalance / 1000000).toFixed(0)}M`} unit="تومان" icon={CreditCard} color="bg-red-50 text-red-600" />
        <KpiWidget label="HSE Rating" labelFa="امتیاز HSE" value={company.hseRating} icon={Shield} color="bg-emerald-50 text-emerald-600" change={3} />
        <KpiWidget label="Compliance" labelFa="امتیاز انطباق" value={company.complianceScore} icon={Building2} color="bg-blue-50 text-blue-600" />
        <KpiWidget label="Contractors" labelFa="پیمانکاران فعال" value={company.activeContractorsCount} icon={Users} color="bg-purple-50 text-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Company Info */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-bold text-foreground mb-4 text-right">اطلاعات شرکت</h3>
          <div className="space-y-3">
            {[{ label: 'مدیرعامل', value: company.ceoName }, { label: 'تلفن مدیرعامل', value: company.ceoPhone, dir: 'ltr' }, { label: 'واحد', value: company.unitNumber }, { label: 'مساحت', value: `${company.areaSqm.toLocaleString('fa-IR')} م²`, dir: 'ltr' }, { label: 'اجاره ماهانه', value: `${(company.monthlyRent / 1000000).toFixed(0)} میلیون تومان`, dir: 'ltr' }, { label: 'دوره پرداخت', value: company.paymentTerms === 'monthly' ? 'ماهانه' : company.paymentTerms === 'quarterly' ? 'فصلی' : 'سالانه' }].map(item => (
              <div key={item.label} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="text-xs text-foreground font-medium" dir={item.dir || 'rtl'}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Permits Summary */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-bold text-foreground mb-4 text-right">خلاصه مجوزها</h3>
          <div className="space-y-3">
            {company.permits.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">مجوزی ثبت نشده</p>
            ) : company.permits.map(permit => {
              const daysLeft = Math.ceil((new Date(permit.expiryDate).getTime() - Date.now()) / 86400000);
              return (
                <div key={permit.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${permit.status === 'valid' ? 'bg-emerald-500' : permit.status === 'expiring_soon' ? 'bg-amber-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="text-xs font-medium text-foreground">{permit.type === 'operating' ? 'پروانه بهره‌برداری' : permit.type === 'environmental' ? 'مجوز محیط زیست' : permit.type}</p>
                      <p className="text-[10px] text-muted-foreground">{permit.number}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${permit.status === 'valid' ? 'bg-emerald-50 text-emerald-700' : permit.status === 'expiring_soon' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                      {daysLeft > 0 ? `${daysLeft.toLocaleString('fa-IR')} روز` : 'منقضی'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}