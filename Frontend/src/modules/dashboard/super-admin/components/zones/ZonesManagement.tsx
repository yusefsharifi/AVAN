import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useNationalStore } from '../../store/useNationalStore';
import { useNationalCompanyStore } from '../../store/useNationalCompanyStore';
import { useTenantStore } from '@/core/stores/useTenantStore';
import { calculateZoneOccupancy, zoneStatusLabels, zoneStatusColors } from '@/entities/zone';
import type { IndustrialZone, ZoneStatus } from '@/entities/zone';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { toast } from 'sonner';
import { Plus, PauseCircle, PlayCircle, Trash2, Building2 } from 'lucide-react';

export default function ZonesManagement() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const user = useTenantStore((s) => (s as any).currentUser);
  const actor = { id: user?.id ?? 'unknown', name: user?.name ?? 'ناشناس' };

  const {
    getFilteredParks, setZoneFilters, clearZoneFilters, zoneFilters,
    suspendPark, activatePark, deletePark,
  } = useNationalStore();
  const getCompaniesByZone = useNationalCompanyStore((s) => s.getCompaniesByZone);

  const [confirm, setConfirm] = useState<{ type: 'suspend' | 'delete' | 'activate'; zone: IndustrialZone } | null>(null);
  const [reason, setReason] = useState('');

  /* deep-link: ?highlight=zoneId or ?zoneId for company creation handled elsewhere */
  const highlightId = params.get('highlight');

  const zones = getFilteredParks();

  const occupancy = (z: IndustrialZone) => {
    const count = getCompaniesByZone(z.id).length;
    const plots = (z as any).totalPlots ?? Math.max(count, 1);
    return { used: count, total: plots, percent: Math.round((count / plots) * 100) };
  };

  const handleAction = () => {
    if (!confirm) return;
    let res;
    if (confirm.type === 'suspend') res = suspendPark(confirm.zone.id, reason, actor.id, actor.name);
    else if (confirm.type === 'activate') res = activatePark(confirm.zone.id, actor.id, actor.name);
    else res = deletePark(confirm.zone.id, actor.id, actor.name);

    if (res.success) {
      toast.success(confirm.type === 'suspend' ? 'منطقه تعلیق شد.' : confirm.type === 'activate' ? 'منطقه فعال شد.' : 'منطقه حذف شد.');
    } else toast.error(res.error ?? 'خطا در انجام عملیات.');
    setConfirm(null);
    setReason('');
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">مدیریت مناطق صنعتی</h2>
          <p className="text-slate-500 text-sm">{zones.length} منطقه ثبت‌شده</p>
        </div>
        <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => navigate('/super-admin/zones/new')}>
          <Plus className="w-4 h-4 ml-1" /> منطقه جدید
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <Input placeholder="جستجو (نام، کد، استان)…" value={zoneFilters.searchQuery ?? ''}
          onChange={(e) => setZoneFilters({ searchQuery: e.target.value })} />
        <Input placeholder="استان" value={zoneFilters.province ?? ''}
          onChange={(e) => setZoneFilters({ province: e.target.value || undefined })} />
        <select className="border rounded-md px-3 py-2 text-sm" value={zoneFilters.status ?? ''}
          onChange={(e) => setZoneFilters({ status: (e.target.value || undefined) as ZoneStatus })}>
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(zoneStatusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <Input type="number" placeholder="حداقل اشغال %" value={zoneFilters.minOccupancy ?? ''}
          onChange={(e) => setZoneFilters({ minOccupancy: e.target.value ? Number(e.target.value) : undefined })} />
        <Button variant="outline" onClick={clearZoneFilters}>پاک‌سازی فیلترها</Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {zones.map((z) => {
          const occ = occupancy(z);
          return (
            <div key={z.id}
              className={`bg-white rounded-xl border p-5 space-y-3 hover:shadow-md transition ${highlightId === z.id ? 'ring-2 ring-amber-400' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">{z.name}</h3>
                  <p className="text-xs text-slate-500">{z.code} — {z.province}، {z.city}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${zoneStatusColors[z.status]}`}>
                  {zoneStatusLabels[z.status]}
                </span>
              </div>

              {/* Capacity */}
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>ظرفیت اشغال</span>
                  <span>{occ.used}/{occ.total} ({occ.percent}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className={`h-2 rounded-full ${occ.percent > 85 ? 'bg-red-500' : occ.percent > 60 ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(100, occ.percent)}%` }} />
                </div>
              </div>

              <div className="text-xs text-slate-500 space-y-1">
                <p>مساحت: {z.totalArea} هکتار</p>
                {z.nationalZoneId && <p>شناسه ملی: {z.nationalZoneId}</p>}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <Button size="sm" variant="outline" className="flex-1"
                  onClick={() => navigate(`/super-admin/companies/new?zoneId=${z.id}`)}>
                  <Building2 className="w-3.5 h-3.5 ml-1" /> ثبت شرکت
                </Button>
                {z.status === 'active' ? (
                  <Button size="sm" variant="outline" onClick={() => setConfirm({ type: 'suspend', zone: z })}>
                    <PauseCircle className="w-3.5 h-3.5" />
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setConfirm({ type: 'activate', zone: z })}>
                    <PlayCircle className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => setConfirm({ type: 'delete', zone: z })}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
        {zones.length === 0 && (
          <div className="col-span-full text-center text-slate-400 py-12">منطقه‌ای با این فیلترها یافت نشد.</div>
        )}
      </div>

      {/* Confirm Modal */}
      {confirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4" dir="rtl">
            <h3 className="font-bold text-slate-800">
              {confirm.type === 'suspend' && `تعلیق «${confirm.zone.name}»`}
              {confirm.type === 'activate' && `فعال‌سازی «${confirm.zone.name}»`}
              {confirm.type === 'delete' && `حذف دائمی «${confirm.zone.name}»`}
            </h3>
            {confirm.type !== 'activate' && (
              <div>
                <label className="text-sm text-slate-600">دلیل (الزامی):</label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1" />
              </div>
            )}
            {confirm.type === 'delete' && getCompaniesByZone(confirm.zone.id).length > 0 && (
              <p className="text-red-500 text-sm">⚠️ این منطقه {getCompaniesByZone(confirm.zone.id).length} شرکت فعال دارد. ابتدا شرکت‌ها را منتقل کنید.</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setConfirm(null); setReason(''); }}>انصراف</Button>
              <Button
                className={confirm.type === 'delete' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}
                onClick={handleAction}
                disabled={(confirm.type !== 'activate' && !reason.trim()) ||
                  (confirm.type === 'delete' && getCompaniesByZone(confirm.zone.id).length > 0)}
              >
                تأیید
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
