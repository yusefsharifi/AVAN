import { LiveDot } from "@/shared/components/feedback";
import { SEVERITY_CFG } from "@/shared/constants/status";
import { LiveEvent } from "@/entities/document";

interface LiveFeedProps {
  feedFilter: "all" | "security" | "logistics" | "services";
  setFeedFilter: (f: "all" | "security" | "logistics" | "services") => void;
  filteredEvents: LiveEvent[];
}

export const LiveFeed = ({ feedFilter, setFeedFilter, filteredEvents }: LiveFeedProps) => (
  <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4 flex flex-col gap-3 h-full">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <LiveDot />
        <span className="text-[10px] text-emerald-600 font-medium">زنده</span>
      </div>
      <h3 className="text-sm font-semibold text-foreground">رویدادهای اخیر</h3>
    </div>
    <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
      {([
        { id: "all", label: "همه" }, { id: "security", label: "امنیتی" },
        { id: "logistics", label: "لجستیک" }, { id: "services", label: "خدمات" },
      ] as const).map((f) => (
        <button key={f.id} onClick={() => setFeedFilter(f.id)}
          className={`flex-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors ${feedFilter === f.id ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
          {f.label}
        </button>
      ))}
    </div>
    <div className="flex-1 overflow-y-auto space-y-2 pl-1" style={{ maxHeight: 460 }}>
      {filteredEvents.map((e) => {
        const sv = SEVERITY_CFG[e.severity];
        return (
          <div key={e.id} className="flex items-start gap-2 p-2.5 rounded-lg border border-border/60 bg-secondary/20">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${sv.bg} ${sv.text}`}>{sv.fa}</span>
            <div className="flex-1 text-right min-w-0">
              <p className="text-xs font-medium text-foreground leading-tight">{e.descFa}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-muted-foreground font-mono" dir="ltr">{e.time}</span>
                <span className="text-[10px] text-muted-foreground truncate">{e.entity}</span>
              </div>
            </div>
            <div className={`p-1.5 rounded-lg flex-shrink-0 ${sv.bg}`}>
              <e.Icon className={`w-3.5 h-3.5 ${sv.text}`} />
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
