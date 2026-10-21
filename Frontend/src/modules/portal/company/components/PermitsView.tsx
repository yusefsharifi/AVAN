import { Plus, Download } from "lucide-react";

import { Badge } from "@/shared/components/feedback";
import { StatusKind } from "@/entities/document";

interface PermitItem {
  name: string;
  num: string;
  status: StatusKind;
  exp: string;
}

interface PermitsViewProps {
  permitsList: PermitItem[];
  permitModalOpen: boolean;
  setPermitModalOpen: (open: boolean) => void;
  setPermitForm: (form: { type: string; description: string }) => void;
}

export default function PermitsView({ permitsList, permitModalOpen, setPermitModalOpen, setPermitForm }: PermitsViewProps) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setPermitModalOpen(true)} className="bg-accent hover:bg-accent/90 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
          <Plus className="w-3.5 h-3.5" /><span>درخواست مجوز جدید</span>
        </button>
        <h3 className="text-sm font-semibold text-foreground">مجوزها و گواهینامه‌ها</h3>
      </div>
      <div className="space-y-2.5">
        {permitsList.map((p) => (
          <div key={p.num} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${p.status === "warning" ? "border-amber-200 bg-amber-50/50" : "border-border bg-secondary/30 hover:bg-secondary/60"}`}>
            <div className="flex items-center gap-2 flex-shrink-0">
              {p.status === "warning" && (
                <button onClick={() => { setPermitForm({ type: p.name, description: "" }); setPermitModalOpen(true); }}
                  className="text-[10px] px-2 py-1 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors font-medium">تمدید</button>
              )}
              <button className={`p-1.5 rounded-lg transition-colors ${p.status === "warning" ? "text-amber-600 hover:bg-amber-100" : "text-muted-foreground hover:bg-secondary"}`}>
                <Download className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-muted-foreground font-mono bg-secondary px-2 py-0.5 rounded" dir="ltr">{p.num}</span>
            </div>
            <Badge status={p.status} />
            <div className="flex-1 text-right">
              <p className="text-sm font-medium text-foreground">{p.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">انقضا: {p.exp}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
