import { useMemo, useState } from 'react';
import { Ban, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useInventoryStore } from '../../store';
import type { LocationType } from '../../types';

const formatNumber = (value: number) => value.toLocaleString('fa-IR');

const LOCATION_TYPES: { value: LocationType; label: string }[] = [
  { value: 'floor', label: 'کف انبار' },
  { value: 'rack', label: 'رک' },
  { value: 'shelf', label: 'قفسه' },
  { value: 'bin', label: 'باکس' },
  { value: 'refrigerated', label: 'سردخانه' },
  { value: 'tank', label: 'مخزن' },
  { value: 'silos', label: 'سیلو' },
];

export function LocationManager() {
  const { warehouses, locations, addLocation, blockLocation } = useInventoryStore();
  const [open, setOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? '');
  const [zoneId, setZoneId] = useState('');
  const [code, setCode] = useState('');
  const [locationType, setLocationType] = useState<LocationType>('bin');
  const [maxWeight, setMaxWeight] = useState('');

  const zones = useMemo(
    () => warehouses.find((warehouse) => warehouse.id === warehouseId)?.zones ?? [],
    [warehouses, warehouseId],
  );

  const createLocation = () => {
    if (!warehouseId || !zoneId || !code.trim()) {
      toast.error('انبار، زون و کد لوکیشن الزامی است.');
      return;
    }

    addLocation({
      warehouseId,
      zoneId,
      code: code.trim(),
      barcode: `LOC-${code.trim()}`,
      locationType,
      maxWeight: Number(maxWeight || 0),
      dimensions: { length: 0, width: 0, height: 0 },
      allowedItemCategories: [],
    });

    toast.success('لوکیشن جدید ایجاد شد.');
    setCode('');
    setMaxWeight('');
    setOpen(false);
  };

  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-4" dir="rtl">
      <div className="mb-4 flex items-center justify-between">
        <button
          className="flex items-center gap-1 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white"
          onClick={() => setOpen((value) => !value)}
        >
          <Plus className="h-4 w-4" />
          لوکیشن جدید
        </button>
        <h2 className="text-sm font-bold">لوکیشن‌های انبار</h2>
      </div>

      {open && (
        <div className="mb-4 grid gap-2 rounded-lg bg-secondary/40 p-3 md:grid-cols-5">
          <select
            className="rounded border border-border bg-card p-2 text-xs"
            value={warehouseId}
            onChange={(event) => {
              setWarehouseId(event.target.value);
              setZoneId('');
            }}
          >
            <option value="">انتخاب انبار</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.code} — {warehouse.nameFa}
              </option>
            ))}
          </select>

          <select
            className="rounded border border-border bg-card p-2 text-xs"
            value={zoneId}
            onChange={(event) => setZoneId(event.target.value)}
          >
            <option value="">انتخاب زون</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.code}
              </option>
            ))}
          </select>

          <input
            className="rounded border border-border bg-card p-2 text-xs"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="کد: A-01-02-03"
          />

          <select
            className="rounded border border-border bg-card p-2 text-xs"
            value={locationType}
            onChange={(event) => setLocationType(event.target.value as LocationType)}
          >
            {LOCATION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded border border-border bg-card p-2 text-xs"
              value={maxWeight}
              onChange={(event) => setMaxWeight(event.target.value)}
              placeholder="حداکثر وزن"
              type="number"
            />
            <button
              className="rounded bg-emerald-600 px-3 text-xs text-white"
              onClick={createLocation}
            >
              ذخیره
            </button>
          </div>
        </div>
      )}

      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-secondary/50">
            <tr>
              {['کد', 'بارکد', 'زون', 'نوع', 'وضعیت', 'کالای فعلی', 'موجودی', 'عملیات'].map((header) => (
                <th className="p-3 text-right" key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {locations.map((location) => (
              <tr className="border-t border-border" key={location.id}>
                <td className="p-3 font-mono" dir="ltr">{location.code}</td>
                <td className="font-mono" dir="ltr">{location.barcode}</td>
                <td>{zones.find((zone) => zone.id === location.zoneId)?.code ?? '—'}</td>
                <td>{LOCATION_TYPES.find((type) => type.value === location.locationType)?.label}</td>
                <td>{location.status}</td>
                <td>{location.currentItemId ?? '—'}</td>
                <td>{formatNumber(location.currentQuantity)}</td>
                <td>
                  <button
                    className="inline-flex items-center gap-1 text-red-600 hover:underline"
                    disabled={location.status === 'blocked'}
                    onClick={() => {
                      blockLocation(location.id);
                      toast.success('لوکیشن مسدود شد.');
                    }}
                  >
                    <Ban className="h-3.5 w-3.5" />
                    مسدود کردن
                  </button>
                </td>
              </tr>
            ))}
            {locations.length === 0 && (
              <tr>
                <td className="p-8 text-center text-muted-foreground" colSpan={8}>
                  هنوز لوکشینی تعریف نشده است.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default LocationManager;
