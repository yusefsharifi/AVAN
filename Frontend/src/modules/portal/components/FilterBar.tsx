import { Search, X, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';

interface FilterOption {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date';
  options?: { value: string; label: string }[];
}

interface FilterBarProps {
  filters: FilterOption[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClear: () => void;
}

export function FilterBar({ filters, values, onChange, onClear }: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const hasFilters = Object.values(values).some(v => v);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input dir="rtl" value={values.search || ''} onChange={e => onChange('search', e.target.value)} placeholder="جستجو..."
            className="w-full bg-secondary border border-border rounded-lg py-2 pr-9 pl-3 text-xs text-foreground focus:outline-none focus:border-accent" />
        </div>
        <button onClick={() => setShowAdvanced(s => !s)} className={`p-2 rounded-lg border ${showAdvanced ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted-foreground hover:bg-secondary'}`}>
          <SlidersHorizontal className="w-4 h-4" />
        </button>
        {hasFilters && (
          <button onClick={onClear} className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {showAdvanced && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-secondary/30 rounded-lg border border-border">
          {filters.map(f => (
            <div key={f.key}>
              <label className="text-[10px] text-muted-foreground mb-1 block">{f.label}</label>
              {f.type === 'select' ? (
                <select value={values[f.key] || ''} onChange={e => onChange(f.key, e.target.value)} className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground">
                  <option value="">همه</option>
                  {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input dir="rtl" type={f.type === 'date' ? 'date' : 'text'} value={values[f.key] || ''} onChange={e => onChange(f.key, e.target.value)}
                  className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
