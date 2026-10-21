import { useState } from "react";
import { Search, Filter, X, ChevronDown } from "lucide-react";

export interface SearchFilters {
  query: string;
  direction: string;
  type: string;
  classification: string;
  priority: string;
  dateFrom: string;
  dateTo: string;
}

const DIRECTIONS = [
  { value: "", label: "همه" },
  { value: "incoming", label: "ورودی" },
  { value: "outgoing", label: "خروجی" },
  { value: "internal", label: "داخلی" },
];

const TYPES = [
  { value: "", label: "همه" },
  { value: "official", label: "رسمی" },
  { value: "memo", label: "یادداشت" },
  { value: "circular", label: "بخشنامه" },
  { value: "report", label: "گزارش" },
  { value: "instruction", label: "دستورالعمل" },
  { value: "request", label: "درخواست" },
  { value: "response", label: "پاسخ" },
];

const CLASSIFICATIONS = [
  { value: "", label: "همه" },
  { value: "unclassified", label: "عادی" },
  { value: "confidential", label: "محرمانه" },
  { value: "restricted", label: "-secret" },
];

const PRIORITIES = [
  { value: "", label: "همه" },
  { value: "instant", label: "فوری" },
  { value: "urgent", label: "ضروری" },
  { value: "normal", label: "عادی" },
  { value: "low", label: "کم‌اهمیت" },
];

interface SearchPanelProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
}

export function SearchPanel({ filters, onChange }: SearchPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const update = (patch: Partial<SearchFilters>) => {
    onChange({ ...filters, ...patch });
  };

  const hasActiveFilters = filters.direction || filters.type || filters.classification || filters.priority || filters.dateFrom || filters.dateTo;

  const clearFilters = () => {
    onChange({ query: filters.query, direction: "", type: "", classification: "", priority: "", dateFrom: "", dateTo: "" });
  };

  return (
    <div className="border-b border-border">
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
            placeholder="جستجو در نامه‌ها..."
            className="w-full bg-secondary border border-border rounded-lg py-1.5 pr-8 pl-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent"
          />
          {filters.query && (
            <button onClick={() => update({ query: "" })} className="absolute left-2 top-1/2 -translate-y-1/2">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
            expanded || hasActiveFilters ? "bg-accent/10 border-accent text-accent" : "border-border text-muted-foreground hover:bg-secondary"
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          فیتر پیشرفته
          {hasActiveFilters && (
            <span className="w-4 h-4 rounded-full bg-accent text-white text-[9px] flex items-center justify-center">
              {[filters.direction, filters.type, filters.classification, filters.priority, filters.dateFrom, filters.dateTo].filter(Boolean).length}
            </span>
          )}
          <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-[10px] text-muted-foreground hover:text-foreground">
            پاک کردن فیترها
          </button>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-3 grid grid-cols-5 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">جهت</label>
            <select value={filters.direction} onChange={(e) => update({ direction: e.target.value })} className="w-full bg-secondary border border-border rounded-lg py-1.5 px-2 text-xs text-foreground">
              {DIRECTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">نوع</label>
            <select value={filters.type} onChange={(e) => update({ type: e.target.value })} className="w-full bg-secondary border border-border rounded-lg py-1.5 px-2 text-xs text-foreground">
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">رده طبقه‌بندی</label>
            <select value={filters.classification} onChange={(e) => update({ classification: e.target.value })} className="w-full bg-secondary border border-border rounded-lg py-1.5 px-2 text-xs text-foreground">
              {CLASSIFICATIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">اولویت</label>
            <select value={filters.priority} onChange={(e) => update({ priority: e.target.value })} className="w-full bg-secondary border border-border rounded-lg py-1.5 px-2 text-xs text-foreground">
              {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">از تاریخ</label>
              <input type="date" value={filters.dateFrom} onChange={(e) => update({ dateFrom: e.target.value })} className="w-full bg-secondary border border-border rounded-lg py-1.5 px-2 text-xs text-foreground" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">تا تاریخ</label>
              <input type="date" value={filters.dateTo} onChange={(e) => update({ dateTo: e.target.value })} className="w-full bg-secondary border border-border rounded-lg py-1.5 px-2 text-xs text-foreground" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
