import { useState } from 'react';
import { Calendar } from 'lucide-react';

interface DateRangePickerProps {
  from?: string;
  to?: string;
  onChange: (from: string, to: string) => void;
}

export function DateRangePicker({ from = '', to = '', onChange }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input dir="ltr" type="date" value={from} onChange={e => onChange(e.target.value, to)}
          className="bg-secondary border border-border rounded-lg py-1.5 pr-8 pl-2 text-xs text-foreground focus:outline-none focus:border-accent" />
      </div>
      <span className="text-xs text-muted-foreground">تا</span>
      <input dir="ltr" type="date" value={to} onChange={e => onChange(from, e.target.value)}
        className="bg-secondary border border-border rounded-lg py-1.5 px-2 text-xs text-foreground focus:outline-none focus:border-accent" />
    </div>
  );
}
