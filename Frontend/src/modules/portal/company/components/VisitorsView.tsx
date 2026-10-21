import { Plus } from "lucide-react";

import { Badge } from "@/shared/components/feedback";
import { Visitor, StatusKind } from "@/entities/document";

interface VisitorsViewProps {
  visitorsList: Visitor[];
  visitorModalOpen: boolean;
  setVisitorModalOpen: (open: boolean) => void;
}

export default function VisitorsView({ visitorsList, visitorModalOpen, setVisitorModalOpen }: VisitorsViewProps) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setVisitorModalOpen(true)} className="bg-accent hover:bg-accent/90 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
          <Plus className="w-3.5 h-3.5" /><span>ثبت مهمان جدید</span>
        </button>
        <h3 className="text-sm font-semibold text-foreground">مهمانان</h3>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {["وضعیت", "زمان", "میزبان", "شماره تماس", "نام مهمان"].map((h) => (
              <th key={h} className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visitorsList.map((v) => {
            const statusMap: Record<Visitor["status"], StatusKind> = { scheduled: "pending", "checked-in": "active", "checked-out": "approved", cancelled: "rejected" };
            const statusLabel: Record<Visitor["status"], string> = { scheduled: "زمان‌بندی‌شده", "checked-in": "در محوطه", "checked-out": "خروج ثبت‌شده", cancelled: "لغو شده" };
            return (
              <tr key={v.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/40 transition-colors">
                <td className="py-3 px-3"><span className="inline-flex"><Badge status={statusMap[v.status]} /></span><span className="text-[10px] text-muted-foreground mr-1.5">{statusLabel[v.status]}</span></td>
                <td className="py-3 px-3 text-xs text-muted-foreground">{v.date} · {v.time}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground">{v.host}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{v.phone}</td>
                <td className="py-3 px-3">
                  <p className="text-sm font-semibold text-foreground">{v.name}</p>
                  <p className="text-[10px] text-muted-foreground">{v.purpose}</p>
                </td>
              </tr>
            );
          })}
          {visitorsList.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-sm text-muted-foreground">مهمانی ثبت نشده است.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
