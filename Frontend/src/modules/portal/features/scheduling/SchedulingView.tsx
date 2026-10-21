import { useState } from 'react';
import { DOCK_OPTIONS } from '../../constants';
import { Plus, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

const TIME_SLOTS = ['۰۶:۰۰', '۰۶:۳۰', '۰۷:۰۰', '۰۷:۳۰', '۰۸:۰۰', '۰۸:۳۰', '۰۹:۰۰', '۰۹:۳۰', '۱۰:۰۰', '۱۰:۳۰', '۱۱:۰۰', '۱۱:۳۰', '۱۲:۰۰', '۱۲:۳۰', '۱۳:۰۰', '۱۳:۳۰', '۱۴:۰۰', '۱۴:۳۰', '۱۵:۰۰', '۱۵:۳۰', '۱۶:۰۰', '۱۶:۳۰', '۱۷:۰۰', '۱۷:۳۰', '۱۸:۰۰'];
const WEEK_DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه'];

export function SchedulingView() {
  const [selectedDock, setSelectedDock] = useState(DOCK_OPTIONS[0].id);

  const getSlotStatus = (dock: string, day: string, time: string): 'available' | 'booked' | 'blocked' => {
    const hash = (dock + day + time).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    if (hash % 7 === 0) return 'available';
    if (hash % 3 === 0) return 'booked';
    return 'available';
  };

  return (
    <div className="h-full flex flex-col p-5 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">نوبت‌دهی</h1>
        <div className="flex items-center gap-2">
          <select value={selectedDock} onChange={e => setSelectedDock(e.target.value)} className="bg-secondary border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground">
            {DOCK_OPTIONS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90"><Plus className="w-3.5 h-3.5" /><span>رزرو جدید</span></button>
        </div>
      </div>
      <div className="flex-1 bg-card rounded-xl border border-border overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 px-2 text-[10px] text-muted-foreground font-medium w-16"></th>
              {WEEK_DAYS.map(d => <th key={d} className="py-2 px-2 text-xs font-semibold text-foreground text-center">{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map(time => (
              <tr key={time} className="border-b border-border/50">
                <td className="py-1 px-2 text-[10px] text-muted-foreground font-mono text-center" dir="ltr">{time}</td>
                {WEEK_DAYS.map(day => {
                  const status = getSlotStatus(selectedDock, day, time);
                  return (
                    <td key={day} className="py-1 px-1">
                      <div className={`h-7 rounded flex items-center justify-center text-[9px] transition-colors cursor-pointer ${status === 'available' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100' : status === 'booked' ? 'bg-amber-50 border border-amber-200 text-amber-700' : 'bg-slate-50 border border-slate-200 text-slate-400'}`}>
                        {status === 'booked' ? 'رزرو' : status === 'available' ? 'آزاد' : ''}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
