// src/modules/finance/components/JalaliDatePicker.tsx
import { useState, useRef, useEffect } from 'react';
import { Calendar, X } from 'lucide-react';
import { toPersianDigits, toEnglishDigits, isValidJalaliDateString, jalaliToday } from '../utils/persianUtils';

const MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const DAYS_IN_MONTH = (m: number) => m <= 6 ? 31 : m <= 11 ? 30 : 29;

function parseDateStr(v: string): { y: number; m: number; d: number } | null {
  const normalized = toEnglishDigits(v || '');
  if (!/^\d{4}\/\d{2}\/\d{2}$/.test(normalized)) return null;
  const [y, m, d] = normalized.split('/').map(Number);
  if (!isValidJalaliDateString(v)) return null;
  return { y, m, d };
}

interface Props {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
}

export function JalaliDatePicker({ label, value, onChange, error, disabled, placeholder, minDate, maxDate }: Props) {
  const today = jalaliToday();
  const parsed = parseDateStr(value) ?? parseDateStr(today)!;
  const [viewY, setViewY] = useState(parsed.y);
  const [viewM, setViewM] = useState(parsed.m);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value ? toPersianDigits(value) : '');
  const ref = useRef<HTMLDivElement>(null);

  // Sync input when value changes from outside
  useEffect(() => {
    setInput(value ? toPersianDigits(value) : '');
  }, [value]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleInputChange = (raw: string) => {
    setInput(raw);
    const normalized = toEnglishDigits(raw);
    if (isValidJalaliDateString(normalized)) {
      onChange(normalized);
      const p = parseDateStr(normalized);
      if (p) { setViewY(p.y); setViewM(p.m); }
    }
  };

  const selectDay = (d: number) => {
    const dateStr = `${viewY}/${String(viewM).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
    if (minDate && dateStr < minDate) return;
    if (maxDate && dateStr > maxDate) return;
    onChange(dateStr);
    setInput(toPersianDigits(dateStr));
    setOpen(false);
  };

  const prevMonth = () => { if (viewM === 1) { setViewM(12); setViewY(y => y - 1); } else setViewM(m => m - 1); };
  const nextMonth = () => { if (viewM === 12) { setViewM(1); setViewY(y => y + 1); } else setViewM(m => m + 1); };

  // Build calendar grid (first day of Jalali month is Shanbeh = Saturday = col 6 in 0-indexed Sat..Fri)
  // We just use a simple 1-based grid starting at col 0 for simplicity
  const daysInMonth = DAYS_IN_MONTH(viewM);
  const selected = parseDateStr(value);
  const isSelected = (d: number) => selected?.y === viewY && selected?.m === viewM && selected?.d === d;
  const isToday = (d: number) => {
    const t = parseDateStr(today);
    return t?.y === viewY && t?.m === viewM && t?.d === d;
  };

  return (
    <div ref={ref} className="relative" dir="rtl">
      {label && <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>}
      <div className="flex items-center gap-1">
        <div className="relative flex-1">
          <input
            disabled={disabled}
            value={input}
            onChange={e => handleInputChange(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder || '۱۴۰۳/۰۱/۰۱'}
            dir="ltr"
            className={`w-full rounded-lg border px-3 py-2 text-sm bg-secondary focus:outline-none focus:border-accent text-center
              ${error ? 'border-red-400' : 'border-border'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          {value && !disabled && (
            <button
              type="button"
              onClick={() => { onChange(''); setInput(''); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(o => !o)}
          className="p-2 rounded-lg border border-border bg-secondary hover:bg-secondary/80 disabled:opacity-50"
        >
          <Calendar size={15} className="text-muted-foreground" />
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {open && !disabled && (
        <div className="absolute z-50 mt-1 right-0 bg-white border border-border rounded-xl shadow-xl p-3 w-72">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={nextMonth} className="p-1 hover:bg-secondary rounded">›</button>
            <div className="flex items-center gap-2">
              <select
                value={viewM}
                onChange={e => setViewM(+e.target.value)}
                className="text-sm font-semibold bg-transparent border-none outline-none cursor-pointer"
              >
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <input
                type="number"
                value={viewY}
                onChange={e => setViewY(+e.target.value)}
                className="w-16 text-sm font-semibold text-center bg-transparent border-none outline-none"
              />
            </div>
            <button type="button" onClick={prevMonth} className="p-1 hover:bg-secondary rounded">‹</button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {['ش','ی','د','س','چ','پ','ج'].map(d => (
              <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
              const dateStr = `${viewY}/${String(viewM).padStart(2,'0')}/${String(d).padStart(2,'0')}`;
              const disabled = (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate);
              return (
                <button
                  key={d}
                  type="button"
                  disabled={!!disabled}
                  onClick={() => selectDay(d)}
                  className={`h-8 w-full rounded text-xs transition-colors
                    ${isSelected(d) ? 'bg-accent text-white font-bold' : ''}
                    ${isToday(d) && !isSelected(d) ? 'border border-accent text-accent font-semibold' : ''}
                    ${!isSelected(d) && !disabled ? 'hover:bg-secondary' : ''}
                    ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                    text-foreground`}
                >
                  {toPersianDigits(d)}
                </button>
              );
            })}
          </div>

          {/* Today button */}
          <button
            type="button"
            onClick={() => { const t = parseDateStr(today); if (t) { setViewY(t.y); setViewM(t.m); selectDay(t.d); } }}
            className="w-full mt-2 py-1.5 text-xs text-accent hover:bg-accent/10 rounded-lg transition-colors"
          >
            برو به امروز
          </button>
        </div>
      )}
    </div>
  );
}

export default JalaliDatePicker;
