import { useEffect, useState } from 'react';
import { zonesApi, type ZoneDto } from '@/shared/api/zones.api';

const inputCls =
  'w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent';

export interface ZoneSelectorProps {
  /** Currently selected zone id (`''` = nothing selected yet). */
  value: string;
  /** Called with the newly selected zone id (empty string clears it). */
  onChange: (zoneId: string) => void;
  /** Selector caption; defaults to the Persian label used by the create forms. */
  label?: string;
  /** Extra classes merged onto the <select> element. */
  className?: string;
}

/**
 * Zone picker for SUPER_ADMIN.
 *
 * A SUPER_ADMIN has no zone in its own scope, so any zone-scoped create
 * (employee, finance account, …) must let the operator name the zone the row
 * belongs to. Every other role already has a zone baked into its token, so the
 * backend `ResolveScope` fills it in and this control must stay hidden.
 *
 * This is deliberately ONE shared component (Step 6 / TASK A3) so the HR and
 * finance create forms cannot drift into separate copies of the same logic.
 */
export function ZoneSelector({ value, onChange, label = 'انتخاب ناحیه', className }: ZoneSelectorProps) {
  const [zones, setZones] = useState<ZoneDto[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    zonesApi
      .list()
      .then((rows) => {
        if (cancelled) return;
        setZones(rows);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div dir="rtl" className="mb-3 text-right">
      <label htmlFor="zone-selector" className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <select
        id="zone-selector"
        dir="rtl"
        className={className ?? inputCls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={status !== 'ready'}
      >
        <option value="">{status === 'loading' ? 'در حال دریافت نواحی…' : '— انتخاب ناحیه —'}</option>
        {zones.map((zone) => (
          <option key={zone.id} value={zone.id}>
            {zone.nameFa} ({zone.code})
          </option>
        ))}
      </select>
      {status === 'error' && (
        <p className="mt-1 text-[11px] text-destructive">دریافت فهرست نواحی ممکن نشد؛ دوباره تلاش کنید.</p>
      )}
    </div>
  );
}

export type { ZoneDto };
