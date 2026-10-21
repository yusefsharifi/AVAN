import { Plus } from "lucide-react";

import { Badge } from "@/shared/components/feedback";

interface ServiceRequest {
  id: string;
  title: string;
  status: string;
  date: string;
  pri: string;
  priColor: string;
}

interface ServicesViewProps {
  requestsList: ServiceRequest[];
  serviceModalOpen: boolean;
  setServiceModalOpen: (open: boolean) => void;
}

export default function ServicesView({ requestsList, serviceModalOpen, setServiceModalOpen }: ServicesViewProps) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setServiceModalOpen(true)} className="bg-accent hover:bg-accent/90 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
          <Plus className="w-3.5 h-3.5" /><span>درخواست جدید</span>
        </button>
        <h3 className="text-sm font-semibold text-foreground">درخواست خدمات</h3>
      </div>
      <div className="space-y-2.5">
        {requestsList.map((r) => (
          <div key={r.id} className="p-3 rounded-lg border border-border hover:border-accent/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <Badge status={r.status as any} />
              <p className="text-sm font-medium text-foreground text-right">{r.title}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-mono" dir="ltr">{r.id}</span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${r.priColor}`}>{r.pri}</span>
                <span className="text-[10px] text-muted-foreground">{r.date}</span>
              </div>
            </div>
          </div>
        ))}
        {requestsList.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">درخواستی ثبت نشده است.</p>}
      </div>
    </div>
  );
}
