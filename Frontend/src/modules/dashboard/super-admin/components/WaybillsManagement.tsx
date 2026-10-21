// ============================================================================
// Task 8: Waybill Management
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ClipboardList,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Flag,
  AlertTriangle,
  Truck,
  Weight,
  Calendar,
  FileText,
  ChevronDown,
  ChevronUp,
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

import { useWaybillStore, type WaybillStatus } from '../store/useWaybillStore';
import { useNationalStore } from '../store/useNationalStore';
import { toJalaliStr, parseJalaliInput, jalaliToIso, toPersianDigits, formatNumber } from '@/utils/persianFormat';

/* ------------------------------------------------------------------ */
/*  Schemas                                                           */
/* ------------------------------------------------------------------ */

const statusActionSchema = z.object({
  comment: z.string().optional(),
  reason: z.string().min(10, 'دلیل حداقل ۱۰ کاراکتر').optional(),
});

const templateSchema = z.object({
  zoneId: z.string().min(1),
  requiredFields: z.string().min(1),
  approvalSteps: z.string().min(1),
  autoChargePerTonKm: z.coerce.number().min(0),
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const statusLabels: Record<WaybillStatus, string> = {
  DRAFT: 'پیش‌نویس',
  PENDING_ORIGIN: 'در انتظار مبدأ',
  PENDING_DESTINATION: 'در انتظار مقصد',
  NATIONAL_CONFIRMED: 'تأیید ملی',
  REJECTED: 'رد شده',
  FLAGGED_FOR_AUDIT: 'علامت حسابرسی',
  COMPLETED: 'تکمیل شده',
};

const statusColors: Record<WaybillStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING_ORIGIN: 'bg-blue-50 text-blue-700',
  PENDING_DESTINATION: 'bg-indigo-50 text-indigo-700',
  NATIONAL_CONFIRMED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-700',
  FLAGGED_FOR_AUDIT: 'bg-purple-50 text-purple-700',
  COMPLETED: 'bg-green-50 text-green-700',
};

export default function WaybillsManagement() {
  const store = useWaybillStore();
  const parks = useNationalStore(s => s.parks);
  const companies = useNationalStore(s => s.companies);
  const [activeTab, setActiveTab] = useState('grid');
  const [filters, setFilters] = useState({
    originZoneId: '',
    destinationZoneId: '',
    status: '' as WaybillStatus | '',
    plateSearch: '',
    dateFromJalali: '',
    dateToJalali: '',
    minWeight: '',
    maxWeight: '',
  });
  const [selectedWaybill, setSelectedWaybill] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'confirm' | 'reject' | 'flag' | null>(null);

  useEffect(() => {
    if (store.waybills.length === 0 && !store.isLoading) {
      store.loadFromApi();
    }
  }, [store]);

  const filtered = useMemo(() => {
    return store.getFilteredWaybills({
      originZoneId: filters.originZoneId || undefined,
      destinationZoneId: filters.destinationZoneId || undefined,
      status: (filters.status as WaybillStatus) || undefined,
      plateSearch: filters.plateSearch || undefined,
      dateFrom: filters.dateFromJalali ? jalaliToIso(...Object.values(parseJalaliInput(filters.dateFromJalali)!) as [number, number, number]) : undefined,
      dateTo: filters.dateToJalali ? jalaliToIso(...Object.values(parseJalaliInput(filters.dateToJalali)!) as [number, number, number]) : undefined,
      minWeight: filters.minWeight ? Number(filters.minWeight) : undefined,
      maxWeight: filters.maxWeight ? Number(filters.maxWeight) : undefined,
    });
  }, [store, filters]);

  const actionForm = useForm({ resolver: zodResolver(statusActionSchema), defaultValues: { comment: '', reason: '' } });
  const templateForm = useForm({ resolver: zodResolver(templateSchema), defaultValues: { zoneId: '', requiredFields: '', approvalSteps: '', autoChargePerTonKm: 0 } });

  const handleAction = (data: { comment?: string; reason?: string }) => {
    if (!selectedWaybill || !actionType) return;
    
    if (actionType === 'confirm') {
      store.updateStatus(selectedWaybill, 'NATIONAL_CONFIRMED', { comment: data.comment });
      toast.success('بارنامه تأیید ملی شد');
    } else if (actionType === 'reject') {
      if (!data.reason || data.reason.length < 10) {
        toast.error('دلیل رد حداقل ۱۰ کاراکتر باشد');
        return;
      }
      store.updateStatus(selectedWaybill, 'REJECTED', { reason: data.reason });
      toast.success('بارنامه رد شد');
    } else if (actionType === 'flag') {
      store.updateStatus(selectedWaybill, 'FLAGGED_FOR_AUDIT', { comment: data.comment });
      toast.success('بارنامه برای حسابرسی علامت‌گذاری شد');
    }
    
    setActionType(null);
    setSelectedWaybill(null);
    actionForm.reset();
  };

  const onTemplateSubmit = (data: z.infer<typeof templateSchema>) => {
    store.addTemplate({
      zoneId: data.zoneId,
      requiredFields: data.requiredFields.split(',').map(s => s.trim()),
      approvalSteps: data.approvalSteps.split(',').map(s => s.trim()),
      autoChargePerTonKm: data.autoChargePerTonKm,
    });
    toast.success('قالب بارنامه ثبت شد');
    templateForm.reset();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">مدیریت بارنامه‌ها</h2>
          <p className="text-sm text-slate-500">مشاهده و عملیات بارنامه‌های کل کشور</p>
        </div>
        <Badge className="bg-slate-100 text-slate-700">
          <ClipboardList className="w-3 h-3 ml-1" />
          {toPersianDigits(filtered.length)} رکورد
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="grid">شبکه بارنامه‌ها</TabsTrigger>
          <TabsTrigger value="filters">فیلترهای پیشرفته</TabsTrigger>
          <TabsTrigger value="templates">قالب بارنامه</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input placeholder="پلاک خودرو..." className="w-48" value={filters.plateSearch} onChange={e => setFilters(f => ({ ...f, plateSearch: e.target.value }))} />
            <Select value={filters.originZoneId || "all"} onValueChange={v => setFilters(f => ({ ...f, originZoneId: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-48"><SelectValue placeholder="شهرک مبدأ" /></SelectTrigger>
              <SelectContent><SelectItem value="all">همه</SelectItem>{parks.map(p => <SelectItem key={p.id} value={p.id}>{p.nameFa ?? p.zoneCode}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filters.status || "all"} onValueChange={v => setFilters(f => ({ ...f, status: (v === "all" ? "" : v) as WaybillStatus }))}>
              <SelectTrigger className="w-40"><SelectValue placeholder="وضعیت" /></SelectTrigger>
              <SelectContent><SelectItem value="all">همه</SelectItem>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>شماره بارنامه</TableHead>
                <TableHead>مبدأ</TableHead>
                <TableHead>مقصد</TableHead>
                <TableHead>پلاک</TableHead>
                <TableHead>وزن خالص</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>تاریخ</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 50).map(wb => {
                const originZone = parks.find(p => p.id === wb.originZoneId);
                const destZone = wb.destinationZoneId ? parks.find(p => p.id === wb.destinationZoneId) : null;
                return (
                  <TableRow key={wb.id}>
                    <TableCell className="font-mono text-xs">{wb.waybillNumber}</TableCell>
                    <TableCell>{originZone?.nameFa ?? wb.originZoneId}</TableCell>
                    <TableCell>{destZone?.nameFa ?? wb.destinationAddress}</TableCell>
                    <TableCell dir="ltr" className="font-mono text-xs">{wb.vehiclePlate}</TableCell>
                    <TableCell>{formatNumber(wb.netWeightKg)} کیلوگرم</TableCell>
                    <TableCell><Badge className={statusColors[wb.status]}>{statusLabels[wb.status]}</Badge></TableCell>
                    <TableCell>{toJalaliStr(wb.issueDate)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {wb.status !== 'NATIONAL_CONFIRMED' && wb.status !== 'COMPLETED' && (
                          <Button size="icon" variant="ghost" className="text-emerald-600" onClick={() => { setSelectedWaybill(wb.id); setActionType('confirm'); }}>
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                        {wb.status !== 'REJECTED' && (
                          <Button size="icon" variant="ghost" className="text-red-600" onClick={() => { setSelectedWaybill(wb.id); setActionType('reject'); }}>
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="text-purple-600" onClick={() => { setSelectedWaybill(wb.id); setActionType('flag'); }}>
                          <Flag className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="filters" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>فیلترهای پیشرفته</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>تاریخ از (شمسی)</Label><Input placeholder="1403/01/01" value={filters.dateFromJalali} onChange={e => setFilters(f => ({ ...f, dateFromJalali: e.target.value }))} /></div>
              <div className="space-y-2"><Label>تاریخ تا (شمسی)</Label><Input placeholder="1403/12/29" value={filters.dateToJalali} onChange={e => setFilters(f => ({ ...f, dateToJalali: e.target.value }))} /></div>
              <div className="space-y-2"><Label>شهرک مقصد</Label><Select value={filters.destinationZoneId || "all"} onValueChange={v => setFilters(f => ({ ...f, destinationZoneId: v === "all" ? "" : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">همه</SelectItem>{parks.map(p => <SelectItem key={p.id} value={p.id}>{p.nameFa ?? p.zoneCode}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>حداقل وزن (کیلوگرم)</Label><Input type="number" value={filters.minWeight} onChange={e => setFilters(f => ({ ...f, minWeight: e.target.value }))} /></div>
              <div className="space-y-2"><Label>حداکثر وزن (کیلوگرم)</Label><Input type="number" value={filters.maxWeight} onChange={e => setFilters(f => ({ ...f, maxWeight: e.target.value }))} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>تعریف قالب بارنامه</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={templateForm.handleSubmit(onTemplateSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>شهرک</Label>
                    <Controller control={templateForm.control} name="zoneId" render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{parks.map(p => <SelectItem key={p.id} value={p.id}>{p.nameFa ?? p.zoneCode}</SelectItem>)}</SelectContent></Select>
                    )} />
                  </div>
                  <div className="space-y-2"><Label>فیلدهای الزامی (با کاما)</Label><Input {...templateForm.register('requiredFields')} placeholder="vehiclePlate, driverName, grossWeight" /></div>
                  <div className="space-y-2"><Label>مراحل تأیید (با کاما)</Label><Input {...templateForm.register('approvalSteps')} placeholder="origin_check, destination_check, national_confirm" /></div>
                  <div className="space-y-2"><Label>نرخ خودکار (ریال به ازای تن-کیلومتر)</Label><Input type="number" {...templateForm.register('autoChargePerTonKm')} /></div>
                </div>
                <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">ثبت قالب</Button>
              </form>
            </CardContent>
          </Card>

          <Table>
            <TableHeader>
              <TableRow><TableHead>شهرک</TableHead><TableHead>فیلدهای الزامی</TableHead><TableHead>مراحل</TableHead><TableHead>نرخ</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {store.templates.map(t => {
                const zone = parks.find(p => p.id === t.zoneId);
                return (
                  <TableRow key={t.id}>
                    <TableCell>{zone?.nameFa ?? t.zoneId}</TableCell>
                    <TableCell>{t.requiredFields.join(', ')}</TableCell>
                    <TableCell>{t.approvalSteps.join(' → ')}</TableCell>
                    <TableCell>{formatNumber(t.autoChargePerTonKm)} ریال</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={!!actionType} onOpenChange={() => { setActionType(null); setSelectedWaybill(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'confirm' ? 'تأیید ملی بارنامه' :
               actionType === 'reject' ? 'رد بارنامه' : 'علامت‌گذاری حسابرسی'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={actionForm.handleSubmit(handleAction)} className="space-y-4">
            {actionType === 'reject' && (
              <div className="space-y-2">
                <Label>دلیل رد (حداقل ۱۰ کاراکتر)</Label>
                <Input {...actionForm.register('reason')} />
                {actionForm.formState.errors.reason && <p className="text-xs text-red-500">{actionForm.formState.errors.reason.message}</p>}
              </div>
            )}
            {(actionType === 'confirm' || actionType === 'flag') && (
              <div className="space-y-2">
                <Label>توضیحات</Label>
                <Input {...actionForm.register('comment')} />
              </div>
            )}
            <DialogFooter>
              <Button type="submit" className={
                actionType === 'confirm' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
                actionType === 'reject' ? 'bg-red-600 hover:bg-red-700 text-white' :
                'bg-purple-600 hover:bg-purple-700 text-white'
              }>تأیید</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
