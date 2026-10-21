import { useState } from 'react';
import { toast } from 'sonner';
import { useInventoryStore } from '../../store';
import { UtilizationGauge } from '../../components';
import { WAREHOUSE_TYPE_CONFIG, WAREHOUSE_STATUS_CONFIG, ZONE_TYPE_CONFIG } from '../../constants';
import { ChevronLeft, Plus, MapPin, Users, X } from 'lucide-react';
import type { WarehouseType } from '../../types';
import LocationManager from './LocationManager';
import ZoneManager from './ZoneManager';

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

export default function WarehouseList() {
  const { warehouses, addWarehouse } = useInventoryStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ nameFa: '', code: '', type: 'raw_material' as WarehouseType, address: '', maxWeight: '', maxVolume: '', maxPallets: '' });

  const submitWarehouse = () => {
    if (!form.nameFa.trim()) { toast.error('نام انبار الزامی است'); return; }
    addWarehouse({
      nameFa: form.nameFa, name: form.nameFa, code: form.code || undefined, type: form.type, address: form.address,
      capacity: { maxWeight: Number(form.maxWeight || 0), maxVolume: Number(form.maxVolume || 0), maxPallets: Number(form.maxPallets || 0) },
    });
    toast.success('انبار جدید افزوده شد');
    setModalOpen(false);
    setForm({ nameFa: '', code: '', type: 'raw_material', address: '', maxWeight: '', maxVolume: '', maxPallets: '' });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90"><Plus className="w-3.5 h-3.5" /><span>انبار جدید</span></button>
        <h1 className="text-lg font-bold text-foreground">مدیریت انبارها</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {warehouses.map(wh => {
          const typeCfg = WAREHOUSE_TYPE_CONFIG[wh.type] ?? { fa: wh.type, color: '' };
          const statusCfg = WAREHOUSE_STATUS_CONFIG[wh.status] ?? { fa: wh.status, color: '', bg: '' };

          // Normalise capacity — store uses either flat or nested shapes
          const maxPallets: number = (wh as any).totalPalletCapacity ?? wh.capacity?.maxPallets ?? 0;
          const maxWeight: number  = (wh as any).totalWeightCapacity ?? wh.capacity?.maxWeight  ?? 0;
          const maxVolume: number  = (wh as any).totalVolumeCapacity ?? wh.capacity?.maxVolume  ?? 0;

          // Utilisation — either pre-computed percent or raw used values
          const weightPct: number  = (wh as any).currentUtilization?.weightPercent
            ?? (maxWeight  > 0 ? Math.round(((wh as any).usedWeight  ?? 0) / maxWeight  * 100) : 0);
          const volumePct: number  = (wh as any).currentUtilization?.volumePercent
            ?? (maxVolume  > 0 ? Math.round(((wh as any).usedVolume  ?? 0) / maxVolume  * 100) : 0);
          const palletPct: number  = (wh as any).currentUtilization?.palletPercent
            ?? (maxPallets > 0 ? Math.round(((wh as any).usedPallets ?? 0) / maxPallets * 100) : 0);

          // Address / manager — may be nested or flat
          const address: string     = (wh as any).address    ?? (wh as any).location ?? '—';
          const managerName: string = (wh as any).managerName ?? (wh as any).manager  ?? '—';

          const isExpanded = expandedId === wh.id;
          const zones: any[] = wh.zones ?? [];

          return (
            <div key={wh.id} className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : wh.id)}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-foreground">{wh.nameFa ?? wh.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusCfg.color} ${statusCfg.bg}`}>{statusCfg.fa}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground" dir="ltr">{wh.code} · {typeCfg.fa}</p>
                  </div>
                  <ChevronLeft className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-[-90deg]' : ''}`} />
                </div>

                <div className="space-y-2 mb-3">
                  <UtilizationGauge label="وزن" value={weightPct} />
                  <UtilizationGauge label="حجم" value={volumePct} />
                  <UtilizationGauge label="پالت" value={palletPct} />
                </div>

                <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{address}</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{managerName}</span>
                </div>

                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{zones.length} زون</span>
                  <span className="text-[10px] text-muted-foreground">
                    {maxPallets > 0 ? maxPallets.toLocaleString('fa-IR') : '—'} ظرفیت پالت
                  </span>
                </div>
              </div>

              {isExpanded && zones.length > 0 && (
                <div className="border-t border-border bg-secondary/20 p-4">
                  <p className="text-xs font-bold text-foreground text-right mb-2">جزئیات زون‌ها</p>
                  <div className="space-y-2">
                    {zones.map((zone: any) => {
                      const zoneType: string = zone.type ?? '';
                      const zoneCfg = ZONE_TYPE_CONFIG[zoneType as keyof typeof ZONE_TYPE_CONFIG] ?? { fa: zoneType };
                      const tempControlled: boolean = zone.isTemperatureControlled ?? zone.temperatureControlled ?? false;
                      const [minT, maxT] = zone.temperatureRange ?? [zone.minTemp, zone.maxTemp];
                      const locationCount: number = zone.locationCount ?? zone.binCount ?? 0;
                      const aisleCount: number = zone.aisleCount ?? 0;
                      const rackCount: number  = zone.rackCount  ?? 0;
                      return (
                        <div key={zone.id} className="bg-card rounded-lg border border-border p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-foreground">{zone.nameFa ?? zone.code ?? zone.id}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-foreground">{zoneCfg.fa}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-1 rounded bg-secondary/30">
                              <p className="text-[10px] text-muted-foreground">راهرو</p>
                              <p className="text-[10px] font-semibold text-foreground" dir="ltr">{aisleCount}</p>
                            </div>
                            <div className="p-1 rounded bg-secondary/30">
                              <p className="text-[10px] text-muted-foreground">رک</p>
                              <p className="text-[10px] font-semibold text-foreground" dir="ltr">{rackCount}</p>
                            </div>
                            <div className="p-1 rounded bg-secondary/30">
                              <p className="text-[10px] text-muted-foreground">محل</p>
                              <p className="text-[10px] font-semibold text-foreground" dir="ltr">{locationCount}</p>
                            </div>
                          </div>
                          {tempControlled && minT != null && maxT != null && (
                            <p className="text-[10px] text-cyan-600 mt-1">کنترل دما: {minT}°C تا {maxT}°C</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ZoneManager />
      <LocationManager />

      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setModalOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl shadow-2xl p-5 w-[28rem] z-50" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">انبار جدید</p>
            </div>
            <div className="space-y-3">
              <div><label className={labelCls}>نام انبار</label><input dir="rtl" value={form.nameFa} onChange={e => setForm(f => ({ ...f, nameFa: e.target.value }))} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>کد انبار</label><input dir="ltr" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="مثال: RM-02" className={inputCls} /></div>
                <div>
                  <label className={labelCls}>نوع انبار</label>
                  <select dir="rtl" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as WarehouseType }))} className={inputCls}>
                    {Object.entries(WAREHOUSE_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.fa}</option>)}
                  </select>
                </div>
              </div>
              <div><label className={labelCls}>آدرس</label><input dir="rtl" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={inputCls} /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className={labelCls}>حداکثر وزن (kg)</label><input dir="ltr" type="number" value={form.maxWeight} onChange={e => setForm(f => ({ ...f, maxWeight: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>حداکثر حجم (m³)</label><input dir="ltr" type="number" value={form.maxVolume} onChange={e => setForm(f => ({ ...f, maxVolume: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>حداکثر پالت</label><input dir="ltr" type="number" value={form.maxPallets} onChange={e => setForm(f => ({ ...f, maxPallets: e.target.value }))} className={inputCls} /></div>
              </div>
              <button onClick={submitWarehouse} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors mt-1">افزودن انبار</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
