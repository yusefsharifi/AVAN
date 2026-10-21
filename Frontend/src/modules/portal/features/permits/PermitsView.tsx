import { usePortalStore } from '../../store';
import { PERMIT_TYPE_CONFIG, PERMIT_STATUS_CONFIG } from '../../constants';
import { calculateDaysUntilExpiry } from '../../utils';
import { AlertTriangle, Download, RefreshCw, Plus, Calendar } from 'lucide-react';
import type { CompanyPermit } from '../../types';

export function PermitsView() {
  const { companies } = usePortalStore();
  const allPermits = companies.flatMap(c => c.permits.map(p => ({ ...p, companyName: c.name })));

  return (
    <div className="h-full flex flex-col p-5 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">مجوزها</h1>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary"><Calendar className="w-3.5 h-3.5" /><span>تقویم انقضا</span></button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary"><Download className="w-3.5 h-3.5" /><span>خروجی</span></button>
        </div>
      </div>
      <div className="space-y-3">
        {allPermits.map(permit => {
          const typeCfg = PERMIT_TYPE_CONFIG[permit.type];
          const statusCfg = PERMIT_STATUS_CONFIG[permit.status];
          const daysLeft = calculateDaysUntilExpiry(permit.expiryDate);
          return (
            <div key={permit.id} className={`bg-card rounded-xl border p-4 ${permit.status === 'expired' ? 'border-red-200' : permit.status === 'expiring_soon' ? 'border-amber-200' : 'border-border'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <span className="text-lg">{typeCfg.icon === 'FileCheck' ? '📋' : typeCfg.icon === 'Leaf' ? '🌿' : typeCfg.icon === 'Flame' ? '🔥' : typeCfg.icon === 'Truck' ? '🚛' : '🏗️'}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{typeCfg.fa}</h4>
                    <p className="text-[10px] text-muted-foreground">{(permit as any).companyName} · {permit.number}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusCfg.color} ${statusCfg.bg}`}>{statusCfg.fa}</span>
                  {permit.status === 'expiring_soon' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                  <span className="text-[10px] text-muted-foreground" dir="ltr">{daysLeft > 0 ? `${daysLeft} روز` : 'منقضی'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
