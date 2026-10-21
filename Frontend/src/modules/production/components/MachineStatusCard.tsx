import { Wrench, User } from 'lucide-react';
import type { Machine } from '../types';
import { MACHINE_STATUS_CONFIG, MACHINE_CATEGORY_CONFIG } from '../constants';
import OeeGauge from './OeeGauge';
import { calculateOEE, isOverdue } from '../utils';

export default function MachineStatusCard({ machine, onClick }: { machine: Machine; onClick?: () => void }) {
  const statusCfg = MACHINE_STATUS_CONFIG[machine.status];
  const categoryCfg = MACHINE_CATEGORY_CONFIG[machine.category];
  const hoursUntilPM = machine.pmIntervalHours - machine.operatingHoursSinceLastPM;
  const pmOverdue = isOverdue(machine.nextPMDue) || hoursUntilPM <= 0;
  const oee = calculateOEE(machine.oeeAvailability, machine.oeePerformance, machine.oeeQuality);

  return (
    <div onClick={onClick} className="bg-card rounded-xl border border-border shadow-sm p-4 cursor-pointer hover:border-accent/40 transition-colors" dir="rtl">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusCfg.color} ${statusCfg.bg}`}>{statusCfg.fa}</span>
        <div className="text-right">
          <p className="text-sm font-bold text-foreground">{machine.nameFa}</p>
          <p className="text-[10px] text-muted-foreground" dir="ltr">{machine.code} · {categoryCfg?.fa ?? machine.category}</p>
        </div>
      </div>

      <div className="flex items-center justify-center py-2">
        <OeeGauge value={oee} label="OEE کلی" size="md" />
      </div>

      <div className="grid grid-cols-3 gap-1 mb-3 text-center">
        <div><p className="text-[9px] text-muted-foreground">دسترس‌پذیری</p><p className="text-xs font-bold text-foreground" dir="ltr">{machine.oeeAvailability}٪</p></div>
        <div><p className="text-[9px] text-muted-foreground">کارایی</p><p className="text-xs font-bold text-foreground" dir="ltr">{machine.oeePerformance}٪</p></div>
        <div><p className="text-[9px] text-muted-foreground">کیفیت</p><p className="text-xs font-bold text-foreground" dir="ltr">{machine.oeeQuality}٪</p></div>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-2 text-[10px]">
        <span className={`flex items-center gap-1 ${pmOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
          <Wrench className="w-3 h-3" />{pmOverdue ? 'نگهداری عقب‌افتاده' : `${hoursUntilPM} ساعت تا PM`}
        </span>
        {machine.currentOperatorName && (
          <span className="flex items-center gap-1 text-muted-foreground"><User className="w-3 h-3" />{machine.currentOperatorName}</span>
        )}
      </div>
    </div>
  );
}
