// ============================================================================
// Task 7: Bascule (Weighbridge) Management
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Scale,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  Activity,
  Calendar,
  Plus,
  Edit3,
  Trash2,
  Filter,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useBasculeStore, type BasculeStatus } from '../store/useBasculeStore';
import { useNationalStore } from '../store/useNationalStore';
import { toJalaliStr, jalaliNow, jalaliToIso, parseJalaliInput, toPersianDigits } from '@/utils/persianFormat';

/* ------------------------------------------------------------------ */
/*  Schemas                                                           */
/* ------------------------------------------------------------------ */

const deviceSchema = z.object({
  zoneId: z.string().min(1, 'انتخاب شهرک الزامی است'),
  capacityTons: z.coerce.number().min(1),
  precisionKg: z.coerce.number().min(0.1),
  manufacturer: z.string().min(1),
  model: z.string().min(1),
  yearOfManufacture: z.coerce.number().min(1980).max(new Date().getFullYear()),
  serialNumber: z.string().min(1),
  lastCalibrationDateJalali: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/),
  nextCalibrationDateJalali: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/),
  calibrationCertificateNumber: z.string().min(1),
  assignedOperatorId: z.string().optional(),
  minWeightKg: z.coerce.number().min(0),
  maxWeightKg: z.coerce.number().min(1),
  installationDateJalali: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/),
  locationInZone: z.string().min(1),
});

const statusChangeSchema = z.object({
  status: z.enum(['ACTIVE', 'UNDER_MAINTENANCE', 'OUT_OF_ORDER']),
  reason: z.string().min(5, 'دلیل تغییر حداقل ۵ کاراکتر باشد'),
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const statusLabels: Record<BasculeStatus, string> = {
  ACTIVE: 'فعال',
  UNDER_MAINTENANCE: 'در تعمیر',
  OUT_OF_ORDER: 'خارج از سرویس',
};

const statusColors: Record<BasculeStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  UNDER_MAINTENANCE: 'bg-amber-50 text-amber-700',
  OUT_OF_ORDER: 'bg-red-50 text-red-700',
};

export default function BasculeManagement() {
  const store = useBasculeStore();
  const national = useNationalStore();
  const [activeTab, setActiveTab] = useState('devices');
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [statusModalDevice, setStatusModalDevice] = useState<string | null>(null);
  const [calModalDevice, setCalModalDevice] = useState<string | null>(null);
  const [zoneFilter, setZoneFilter] = useState('');

  useEffect(() => {
    if (store.devices.length === 0 && !store.isLoading) {
      store.loadFromApi();
    }
  }, [store]);

  const filteredDevices = useMemo(() => {
    let list = [...store.devices];
    if (zoneFilter) list = list.filter(d => d.zoneId === zoneFilter);
    return list;
  }, [store.devices, zoneFilter]);

  const expiringDevices = store.getExpiringCalibrations(30);

  /* Forms */
  const deviceForm = useForm({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      zoneId: '',
      capacityTons: 60,
      precisionKg: 5,
      manufacturer: '',
      model: '',
      // jalaliNow() is a formatted Jalali STRING, not an object: `.year` was
      // undefined, so this default was NaN (fix7.md B1, TS2339).
      yearOfManufacture: parseJalaliInput(jalaliNow()).y - 1300,
      serialNumber: '',
      lastCalibrationDateJalali: '',
      nextCalibrationDateJalali: '',
      calibrationCertificateNumber: '',
      assignedOperatorId: '',
      minWeightKg: 100,
      maxWeightKg: 60000,
      installationDateJalali: '',
      locationInZone: '',
    },
  });

  // Typed from the zod schema rather than inferred from `defaultValues`, so
  // handleSubmit accepts `onSubmit: (data: z.infer<typeof statusChangeSchema>) => void`.
  const statusForm = useForm<z.infer<typeof statusChangeSchema>>({ resolver: zodResolver(statusChangeSchema), defaultValues: { status: 'ACTIVE', reason: '' } });
  const calForm = useForm({
    defaultValues: { calibrationDateJalali: '', nextCalibrationDateJalali: '', certificateNumber: '', performedBy: '', notes: '' }
  });

  const onDeviceSubmit = (data: z.infer<typeof deviceSchema>) => {
    const zone = national.parks.find(p => p.id === data.zoneId);
    const lastCal = jalaliToIso(...Object.values(parseJalaliInput(data.lastCalibrationDateJalali)!) as [number, number, number]);
    const nextCal = jalaliToIso(...Object.values(parseJalaliInput(data.nextCalibrationDateJalali)!) as [number, number, number]);
    const install = jalaliToIso(...Object.values(parseJalaliInput(data.installationDateJalali)!) as [number, number, number]);

    const device = store.addDevice({
      ...data,
      // `deviceCode` is required by BasculeDevice and read straight back in the
      // success toast below; the form does not collect it. Generate it in the
      // seed's own `BSC-<zoneCode>-<seq>` format (useBasculeStore, seed data).
      deviceCode: `BSC-${zone?.zoneCode ?? 'NA'}-${String(store.devices.length + 1).padStart(3, '0')}`,
      zoneCode: zone?.zoneCode ?? '',
      lastCalibrationDate: lastCal,
      nextCalibrationDate: nextCal,
      installationDate: install,
      status: 'ACTIVE',
    });
    
    toast.success(`باسکول ${device.deviceCode} ثبت شد`);
    setDeviceModalOpen(false);
    deviceForm.reset();
  };

  const onStatusChange = (data: z.infer<typeof statusChangeSchema>) => {
    if (!statusModalDevice) return;
    store.changeStatus(statusModalDevice, data.status, data.reason, 'current-user', 'مدیر سیستم ملی');
    toast.success('وضعیت به‌روزرسانی شد');
    setStatusModalDevice(null);
    statusForm.reset();
  };

  const onCalSubmit = (data: { calibrationDateJalali: string; nextCalibrationDateJalali: string; certificateNumber: string; performedBy: string; notes: string }) => {
    if (!calModalDevice) return;
    const calDate = jalaliToIso(...Object.values(parseJalaliInput(data.calibrationDateJalali)!) as [number, number, number]);
    const nextCal = jalaliToIso(...Object.values(parseJalaliInput(data.nextCalibrationDateJalali)!) as [number, number, number]);
    
    store.addCalibration({
      deviceId: calModalDevice,
      calibrationDate: calDate,
      nextCalibrationDate: nextCal,
      certificateNumber: data.certificateNumber,
      performedBy: data.performedBy,
      notes: data.notes,
    });
    
    toast.success('کالیبراسیون ثبت شد');
    setCalModalDevice(null);
    calForm.reset();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">مدیریت باسکول‌ها</h2>
          <p className="text-sm text-slate-500">ثبت، کالیبراسیون و پایش وضعیت باسکول‌های مناطق</p>
        </div>
        {expiringDevices.length > 0 && (
          <Badge className="bg-red-100 text-red-800 border-red-300">
            <AlertTriangle className="w-3 h-3 ml-1" />
            {toPersianDigits(expiringDevices.length)} باسکول نیاز به کالیبراسیون دارند
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">کل باسکول‌ها</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{toPersianDigits(store.devices.length)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">فعال</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-600">{toPersianDigits(store.devices.filter(d => d.status === 'ACTIVE').length)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">در تعمیر</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600">{toPersianDigits(store.devices.filter(d => d.status === 'UNDER_MAINTENANCE').length)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">نیاز به کالیبراسیون (۳۰ روز)</CardTitle></CardHeader><CardContent><p className={`text-2xl font-bold ${expiringDevices.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{toPersianDigits(expiringDevices.length)}</p></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="devices">دستگاه‌ها</TabsTrigger>
          <TabsTrigger value="calibrations">تاریخچه کالیبراسیون</TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-4">
          <div className="flex justify-between items-center">
            <Select value={zoneFilter || "all"} onValueChange={(v) => setZoneFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-56"><SelectValue placeholder="فیلتر شهرک" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه شهرک‌ها</SelectItem>
                {national.parks.map(p => <SelectItem key={p.id} value={p.id}>{p.nameFa ?? p.zoneCode}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setDeviceModalOpen(true)}>
              <Plus className="w-4 h-4 ml-1" /> ثبت باسکول جدید
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>کد دستگاه</TableHead>
                <TableHead>شهرک</TableHead>
                <TableHead>ظرفیت</TableHead>
                <TableHead>دقت</TableHead>
                <TableHead>سازنده</TableHead>
                <TableHead>تاریخ کالیبراسیون بعدی</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDevices.map(device => {
                const daysUntilCal = Math.ceil((new Date(device.nextCalibrationDate).getTime() - Date.now()) / 86400000);
                const calAlert = daysUntilCal < 30;
                return (
                  <TableRow key={device.id} className={calAlert ? 'bg-amber-50/30' : ''}>
                    <TableCell className="font-mono font-bold text-xs">{device.deviceCode}</TableCell>
                    <TableCell>{device.zoneCode}</TableCell>
                    <TableCell>{toPersianDigits(device.capacityTons)} تن</TableCell>
                    <TableCell>{toPersianDigits(device.precisionKg)} کیلوگرم</TableCell>
                    <TableCell>{device.manufacturer}</TableCell>
                    <TableCell>
                      <span className={calAlert ? 'text-amber-600 font-medium' : ''}>
                        {toJalaliStr(device.nextCalibrationDate)}
                        {calAlert && <span className="text-xs mr-1">({toPersianDigits(daysUntilCal)} روز)</span>}
                      </span>
                    </TableCell>
                    <TableCell><Badge className={statusColors[device.status]}>{statusLabels[device.status]}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setStatusModalDevice(device.id)}>تغییر وضعیت</Button>
                        <Button size="sm" variant="outline" onClick={() => setCalModalDevice(device.id)}>کالیبراسیون</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="calibrations">
          <Table>
            <TableHeader>
              <TableRow><TableHead>دستگاه</TableHead><TableHead>تاریخ کالیبراسیون</TableHead><TableHead>تاریخ بعدی</TableHead><TableHead>شماره گواهی</TableHead><TableHead>انجام‌دهنده</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {store.calibrations.map(cal => {
                const device = store.devices.find(d => d.id === cal.deviceId);
                return (
                  <TableRow key={cal.id}>
                    <TableCell>{device?.deviceCode ?? cal.deviceId}</TableCell>
                    <TableCell>{toJalaliStr(cal.calibrationDate)}</TableCell>
                    <TableCell>{toJalaliStr(cal.nextCalibrationDate)}</TableCell>
                    <TableCell>{cal.certificateNumber}</TableCell>
                    <TableCell>{cal.performedBy}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* Add Device Modal */}
      <Dialog open={deviceModalOpen} onOpenChange={setDeviceModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>ثبت باسکول جدید</DialogTitle></DialogHeader>
          <form onSubmit={deviceForm.handleSubmit(onDeviceSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>شهرک</Label>
                <Controller control={deviceForm.control} name="zoneId" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="انتخاب شهرک" /></SelectTrigger>
                    <SelectContent>{national.parks.map(p => <SelectItem key={p.id} value={p.id}>{p.nameFa ?? p.zoneCode}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-2"><Label>ظرفیت (تن)</Label><Input type="number" {...deviceForm.register('capacityTons')} /></div>
              <div className="space-y-2"><Label>دقت (کیلوگرم)</Label><Input type="number" {...deviceForm.register('precisionKg')} /></div>
              <div className="space-y-2"><Label>سازنده</Label><Input {...deviceForm.register('manufacturer')} /></div>
              <div className="space-y-2"><Label>مدل</Label><Input {...deviceForm.register('model')} /></div>
              <div className="space-y-2"><Label>سال ساخت</Label><Input type="number" {...deviceForm.register('yearOfManufacture')} /></div>
              <div className="space-y-2"><Label>شماره سریال</Label><Input {...deviceForm.register('serialNumber')} /></div>
              <div className="space-y-2"><Label>تاریخ کالیبراسیون (شمسی)</Label><Input placeholder="1403/01/01" {...deviceForm.register('lastCalibrationDateJalali')} /></div>
              <div className="space-y-2"><Label>تاریخ کالیبراسیون بعدی (شمسی)</Label><Input placeholder="1404/01/01" {...deviceForm.register('nextCalibrationDateJalali')} /></div>
              <div className="space-y-2"><Label>شماره گواهی کالیبراسیون</Label><Input {...deviceForm.register('calibrationCertificateNumber')} /></div>
              <div className="space-y-2"><Label>حداقل وزن (کیلوگرم)</Label><Input type="number" {...deviceForm.register('minWeightKg')} /></div>
              <div className="space-y-2"><Label>حداکثر وزن (کیلوگرم)</Label><Input type="number" {...deviceForm.register('maxWeightKg')} /></div>
              <div className="space-y-2"><Label>تاریخ نصب (شمسی)</Label><Input placeholder="1402/06/15" {...deviceForm.register('installationDateJalali')} /></div>
              <div className="space-y-2"><Label>موقعیت در شهرک</Label><Input {...deviceForm.register('locationInZone')} /></div>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">ثبت باسکول</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Status Change Modal */}
      <Dialog open={!!statusModalDevice} onOpenChange={() => setStatusModalDevice(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>تغییر وضعیت دستگاه</DialogTitle></DialogHeader>
          <form onSubmit={statusForm.handleSubmit(onStatusChange)} className="space-y-4">
            <div className="space-y-2">
              <Label>وضعیت جدید</Label>
              <Controller control={statusForm.control} name="status" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">فعال</SelectItem>
                    <SelectItem value="UNDER_MAINTENANCE">در تعمیر</SelectItem>
                    <SelectItem value="OUT_OF_ORDER">خارج از سرویس</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-2">
              <Label>دلیل تغییر وضعیت</Label>
              <Input {...statusForm.register('reason')} />
              {statusForm.formState.errors.reason && <p className="text-xs text-red-500">{statusForm.formState.errors.reason.message}</p>}
            </div>
            <DialogFooter><Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">تأیید</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Calibration Modal */}
      <Dialog open={!!calModalDevice} onOpenChange={() => setCalModalDevice(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>ثبت کالیبراسیون</DialogTitle></DialogHeader>
          <form onSubmit={calForm.handleSubmit(onCalSubmit)} className="space-y-4">
            <div className="space-y-2"><Label>تاریخ کالیبراسیون (شمسی)</Label><Input placeholder="1403/06/15" {...calForm.register('calibrationDateJalali')} /></div>
            <div className="space-y-2"><Label>تاریخ کالیبراسیون بعدی (شمسی)</Label><Input placeholder="1404/06/15" {...calForm.register('nextCalibrationDateJalali')} /></div>
            <div className="space-y-2"><Label>شماره گواهی</Label><Input {...calForm.register('certificateNumber')} /></div>
            <div className="space-y-2"><Label>انجام‌دهنده</Label><Input {...calForm.register('performedBy')} /></div>
            <div className="space-y-2"><Label>یادداشت</Label><Input {...calForm.register('notes')} /></div>
            <DialogFooter><Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">ثبت کالیبراسیون</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
