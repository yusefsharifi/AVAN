import { Plus } from "lucide-react";

import { Badge } from "@/shared/components/feedback";
import { Shipment, StatusKind } from "@/entities/document";

interface ShipmentsViewProps {
  shipmentsList: Shipment[];
  setShipmentsList: React.Dispatch<React.SetStateAction<Shipment[]>>;
  shipmentTab: "list" | "approvals";
  setShipmentTab: (tab: "list" | "approvals") => void;
  pendingCount: number;
  setSelectedShipment: (s: Shipment) => void;
  setShipmentStatus: (id: string, status: StatusKind) => void;
}

export default function ShipmentsView({ shipmentsList, setShipmentsList, shipmentTab, setShipmentTab, pendingCount, setSelectedShipment, setShipmentStatus }: ShipmentsViewProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
          <button onClick={() => setShipmentTab("list")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${shipmentTab === "list" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
            لیست بارنامه‌ها
          </button>
          <button onClick={() => setShipmentTab("approvals")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${shipmentTab === "approvals" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
            <span>صندوق تأیید</span>
            {pendingCount > 0 && <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">{pendingCount}</span>}
          </button>
        </div>
      </div>

      {shipmentTab === "list" ? (
        <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["وضعیت", "تاریخ", "نوع محموله", "پلاک", "شماره بارنامه"].map((h) => (
                  <th key={h} className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shipmentsList.map((s) => (
                <tr key={s.id} onClick={() => setSelectedShipment(s)} className="border-b border-border/50 hover:bg-secondary/40 cursor-pointer transition-colors">
                  <td className="py-3 px-3"><Badge status={s.status} /></td>
                  <td className="py-3 px-3 text-sm text-muted-foreground">{s.date}</td>
                  <td className="py-3 px-3 text-sm text-muted-foreground">{s.cargoType}</td>
                  <td className="py-3 px-3 text-sm text-muted-foreground font-mono" dir="ltr">{s.plate}</td>
                  <td className="py-3 px-3 text-sm font-semibold text-foreground font-mono" dir="ltr">{s.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["عملیات", "وضعیت", "تاریخ", "ثبت‌کننده", "نوع محموله", "پلاک خودرو", "شماره بارنامه"].map((h) => (
                  <th key={h} className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shipmentsList.filter((s) => s.status === "pending").map((s) => (
                <tr key={s.id} onClick={() => setSelectedShipment(s)} className="border-b border-border/50 hover:bg-secondary/40 cursor-pointer transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={(e) => { e.stopPropagation(); setShipmentStatus(s.id, "approved"); }}
                        className="text-[11px] px-2.5 py-1.5 rounded-md bg-accent text-white hover:bg-accent/90 transition-colors font-medium">
                        بررسی و تأیید
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setShipmentStatus(s.id, "rejected"); }}
                        className="text-[11px] px-2.5 py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors font-medium">
                        رد
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-3"><Badge status={s.status} /></td>
                  <td className="py-3 px-3 text-sm text-muted-foreground">{s.date}</td>
                  <td className="py-3 px-3 text-sm text-muted-foreground">{s.submittedBy}</td>
                  <td className="py-3 px-3 text-sm text-muted-foreground">{s.cargoType}</td>
                  <td className="py-3 px-3 text-sm text-muted-foreground font-mono" dir="ltr">{s.plate}</td>
                  <td className="py-3 px-3 text-sm font-semibold text-foreground font-mono" dir="ltr">{s.id}</td>
                </tr>
              ))}
              {shipmentsList.filter((s) => s.status === "pending").length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">موردی برای تأیید وجود ندارد.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
