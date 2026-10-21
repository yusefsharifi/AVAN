// src/modules/dashboard/super-admin/components/shared/company/ZoneSelector.tsx
import React from 'react';
import { useNationalStore } from '../../../store/useNationalStore';
import { useNationalCompanyStore } from '../../../store/useNationalCompanyStore';
import { zoneStatusLabels } from '@/entities/zone';
import { MapPin } from 'lucide-react';

interface Props {
  value?: string;
  onChange: (zoneId: string) => void;
  locked?: boolean;      // بعد از انتخاب (deep-link) قفل می‌شود
  error?: string;
}

export default function ZoneSelector({ value, onChange, locked, error }: Props) {
  const parks = useNationalStore((s) => s.parks);
  const getCompaniesByZone = useNationalCompanyStore((s) => s.getCompaniesByZone);

  const activeZones = parks.filter((p) => p.status === 'active');

  if (locked && value) {
    const z = parks.find((p) => p.id === value);
    return (
      <div className="border rounded-lg p-4 bg-amber-50 border-amber-300">
        <p className="text-sm text-slate-600">منطقه صنعتی انتخاب‌شده (غیرقابل تغییر):</p>
        <p className="font-bold text-amber-700 mt-1 flex items-center gap-2">
          <MapPin className="w-4 h-4" /> {z?.name} <span className="text-xs font-normal">({z?.code})</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {activeZones.map((z) => {
          const count = getCompaniesByZone(z.id).length;
          const selected = value === z.id;
          return (
            <button key={z.id} type="button" onClick={() => onChange(z.id)}
              className={`text-right border rounded-xl p-4 transition ${
                selected ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-300' : 'hover:border-amber-300'
              }`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-slate-800">{z.nameFa}</p>
                  <p className="text-xs text-slate-500 mt-1">{z.zoneCode} — {z.province}، {z.city}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  {getZoneStatusLabel(z.status)}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">شرکت‌های فعال: {count}</p>
            </button>
          );
        })}
      </div>
      {activeZones.length === 0 && (
        <p className="text-sm text-red-500">هیچ منطقه فعالی وجود ندارد. ابتدا یک منطقه ثبت و فعال کنید.</p>
      )}
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}
