import { Plus } from "lucide-react";

import { Badge } from "@/shared/components/feedback";
import { Contractor, StatusKind } from "@/entities/document";

interface ContractorsViewProps {
  contractorsList: Contractor[];
  contractorModalOpen: boolean;
  setContractorModalOpen: (open: boolean) => void;
}

export default function ContractorsView({ contractorsList, contractorModalOpen, setContractorModalOpen }: ContractorsViewProps) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setContractorModalOpen(true)} className="bg-accent hover:bg-accent/90 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
          <Plus className="w-3.5 h-3.5" /><span>افزودن پیمانکار جدید</span>
        </button>
        <h3 className="text-sm font-semibold text-foreground">پیمانکاران</h3>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {["وضعیت", "نفرات", "پایان", "شروع", "شماره مجوز", "نوع فعالیت", "پیمانکار"].map((h) => (
              <th key={h} className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {contractorsList.map((c) => {
            const statusMap: Record<Contractor["status"], StatusKind> = { active: "active", pending: "pending", expired: "inactive" };
            return (
              <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/40 transition-colors">
                <td className="py-3 px-3"><Badge status={statusMap[c.status]} /></td>
                <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{c.workers}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground">{c.endDate}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground">{c.startDate}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{c.permitNumber}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground">{c.workType}</td>
                <td className="py-3 px-3"><p className="text-sm font-semibold text-foreground">{c.name}</p></td>
              </tr>
            );
          })}
          {contractorsList.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">پیمانکاری ثبت نشده است.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
