import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useInventoryStore } from '../../store';
import type { ZoneType } from '../../types';

const ZONE_TYPES: { value: ZoneType; label: string }[] = [
  { value: 'receiving', label: 'دریافت' },
  { value: 'putaway', label: 'تخصیص' },
  { value: 'bulk_storage', label: 'ذخیره عمده' },
  { value: 'rack_storage', label: 'ذخیره رک' },
  { value: 'picking', label: 'جمع‌آوری' },
  { value: 'quarantine', label: 'قرنطینه' },
  { value: 'returns', label: 'مرجوعی' },
  { value: 'hazmat', label: 'مواد خطرناک' },
  { value: 'cold_room', label: 'سردخانه' },
];

export function ZoneManager() {
  const { warehouses, addZone } = useInventoryStore();
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? '');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<ZoneType>('bulk_storage');
  const [temperatureControlled, setTemperatureControlled] = useState(false);

  const zones = useMemo(
    () => warehouses.find((warehouse) => warehouse.id === warehouseId)?.zones ?? [],
    [warehouses, warehouseId],
  );

  const saveZone = () => {
    if (!warehouseId || !code.trim() || !name.trim()) {
      toast.error('انبار، کد و نام زون الزامی است.');
      return;
    }

    addZone(warehouseId, {
      code: code.trim(),
      name: name.trim(),
      type,
      temperatureControlled,
      temperatureRange: temperatureControlled ? [2, 8] : undefined,
      humidityControlled: false,
      allowedItemCategories: [],
    });

    toast.success('زون جدید ایجاد شد.');
    setCode('');
    setName('');
  };

  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-4" dir="rtl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold">مدیریت زون‌ها</h2>
      </div>

      <div className="mb-4 grid gap-2 rounded-lg bg-secondary/40 p-3 md:grid-cols-5">
        <select
          className="rounded border border-border bg-card p-2 text-xs"
          value={warehouseId}
          onChange={(event) => setWarehouseId(event.target.value)}
        >
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.code} — {warehouse.nameFa}
            </option>
          ))}
        </select>

        <input
          className="rounded border border-border bg-card p-2 text-xs"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="کد زون: A"
        />

        <input
          className="rounded border border-border bg-card p-2 text-xs"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="نام زون"
        />

        <select
          className="rounded border border-border bg-card p-2 text-xs"
          value={type}
          onChange={(event) => setType(event.target.value as ZoneType)}
        >
          {ZONE_TYPES.map((zoneType) => (
            <option key={zoneType.value} value={zoneType.value}>
              {zoneType.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <label className="flex flex-1 items-center gap-2 text-xs">
            <input
              checked={temperatureControlled}
              onChange={(event) => setTemperatureControlled(event.target.checked)}
              type="checkbox"
            />
            کنترل دما
          </label>
          <button
            className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-2 text-xs text-white"
            onClick={saveZone}
          >
            <Plus className="h-4 w-4" />
            ایجاد
          </button>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-secondary/50">
            <tr>
              {['کد', 'نام', 'نوع', 'دما', 'رطوبت', 'تعداد لوکیشن'].map((header) => (
                <th className="p-3 text-right" key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {zones.map((zone) => (
              <tr className="border-t border-border" key={zone.id}>
                <td className="p-3 font-mono" dir="ltr">{zone.code}</td>
                <td>{zone.nameFa || zone.name || '—'}</td>
                <td>{ZONE_TYPES.find((item) => item.value === zone.type)?.label}</td>
                <td>{zone.temperatureControlled ? `${zone.temperatureRange?.[0] ?? '—'} تا ${zone.temperatureRange?.[1] ?? '—'} °C` : 'ندارد'}</td>
                <td>{zone.humidityControlled ? 'کنترل‌شده' : 'ندارد'}</td>
                <td>{zone.locationCount.toLocaleString('fa-IR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default ZoneManager;
