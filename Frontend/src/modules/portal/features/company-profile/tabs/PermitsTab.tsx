import type { CompanyPermit } from '../../../types';
import { PERMIT_TYPE_CONFIG, PERMIT_STATUS_CONFIG } from '../../../constants';
import { calculateDaysUntilExpiry } from '../../../utils';
import { AlertTriangle, Download, RefreshCw } from 'lucide-react';

interface PermitsTabProps {
  permits: CompanyPermit[];
}

export function PermitsTab({ permits }: PermitsTabProps) {
  return (
    <div className="space-y-4">
      {permits.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">مجوزی ثبت نشده</p>
        </div>
      ) : permits.map(permit => {
        const typeCfg = PERMIT_TYPE_CONFIG[permit.type];
        const statusCfg = PERMIT_STATUS_CONFIG[permit.status];
        const daysLeft = calculateDaysUntilExpiry(permit.expiryDate);
        return (
          <div key={permit.id} className={`bg-card rounded-xl border p-5 ${permit.status === 'expired' ? 'border-red-200 bg-red-50/30' : permit.status === 'expiring_soon' ? 'border-amber-200 bg-amber-50/30' : 'border-border'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <span className="text-lg">{typeCfg.icon === 'FileCheck' ? '📋' : typeCfg.icon === 'Leaf' ? '🌿' : typeCfg.icon === 'Flame' ? '🔥' : typeCfg.icon === 'Truck' ? '🚛' : '🏗️'}</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">{typeCfg.fa}</h4>
                  <p className="text-[10px] text-muted-foreground">شماره: {permit.number}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusCfg.color} ${statusCfg.bg}`}>{statusCfg.fa}</span>
                {permit.status === 'expiring_soon' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
              <div className="p-2 rounded-lg bg-secondary/30"><span className="text-muted-foreground block">صادرکننده</span><span className="text-foreground font-medium">{permit.issuedBy}</span></div>
              <div className="p-2 rounded-lg bg-secondary/30"><span className="text-muted-foreground block">تاریخ صدور</span><span className="text-foreground font-medium" dir="ltr">{permit.issueDate}</span></div>
              <div className="p-2 rounded-lg bg-secondary/30"><span className="text-muted-foreground block">تاریخ انقضا</span><span className={`font-medium ${daysLeft <= 30 ? 'text-red-600' : 'text-foreground'}`} dir="ltr">{permit.expiryDate}</span></div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {daysLeft > 0 && <span className="text-[10px] text-muted-foreground">{daysLeft.toLocaleString('fa-IR')} روز تا انقضا</span>}
              <div className="flex-1" />
              <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><Download className="w-4 h-4" /></button>
              <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}