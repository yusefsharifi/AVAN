// ============================================================================
// Task 6: Certificates Management
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Award,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Search,
  Plus,
  Edit3,
  Trash2,
  Download,
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

import {
  useCertificateStore,
  type CertificateTypeCode,
  type CertificateStatus,
} from '../store/useCertificateStore';
import { useNationalStore } from '../store/useNationalStore';
import { useActionAudit } from '../hooks/useActionAudit';
import { toJalaliStr, jalaliNow, jalaliToIso, parseJalaliInput, toPersianDigits } from '@/utils/persianFormat';

/* ------------------------------------------------------------------ */
/*  Schema                                                            */
/* ------------------------------------------------------------------ */

const typeSchema = z.object({
  code: z.string().min(1),
  nameFa: z.string().min(2),
  nameEn: z.string().min(2),
  defaultValidityMonths: z.coerce.number().min(1).max(120),
  issuingAuthority: z.string().min(2),
  mandatoryForOperation: z.boolean(),
  renewalReminderDays: z.coerce.number().min(1).max(90),
});

const issueSchema = z.object({
  companyId: z.string().min(1, 'انتخاب شرکت الزامی است'),
  typeCode: z.string().min(1, 'انتخاب نوع گواهینامه الزامی است'),
  issueDateJalali: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, 'تاریخ نامعتبر'),
  certificateNumber: z.string().min(1, 'شماره گواهینامه الزامی است'),
  issuingAuthorityName: z.string().min(1, 'نام مرجع صادرکننده الزامی است'),
  scannedFileName: z.string().optional(),
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const statusColors: Record<CertificateStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  EXPIRED: 'bg-red-50 text-red-700 border-red-200',
  REVOKED: 'bg-slate-100 text-slate-700 border-slate-200',
  PENDING_RENEWAL: 'bg-amber-50 text-amber-700 border-amber-200',
};

const statusLabels: Record<CertificateStatus, string> = {
  ACTIVE: 'فعال',
  EXPIRED: 'منقضی',
  REVOKED: 'ابطال شده',
  PENDING_RENEWAL: 'در انتظار تمدید',
};

const typeLabels: Record<CertificateTypeCode, string> = {
  ISO_9001: 'ایزو ۹۰۰۱',
  ISO_14001: 'ایزو ۱۴۰۰۱',
  ISO_45001: 'ایزو ۴۵۰۰۱',
  SAFETY_QUALIFICATION: 'صلاحیت ایمنی',
  OPERATING_LICENSE: 'پروانه بهره‌برداری',
  CONSTRUCTION_PERMIT: 'مجوز ساخت',
  HSE_APPROVAL: 'تأییدیه HSE',
  LAND_LEASE_CONTRACT: 'قرارداد اجاره زمین',
};

function getDaysRemaining(expiryDate: string): number {
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (86400000));
}

function getHealthColor(expiryDate: string, status: CertificateStatus): string {
  if (status === 'EXPIRED' || status === 'REVOKED') return 'text-red-600';
  const days = getDaysRemaining(expiryDate);
  if (days < 0) return 'text-red-600';
  if (days <= 30) return 'text-amber-600';
  return 'text-emerald-600';
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function CertificatesManagement() {
  const store = useCertificateStore();
  const national = useNationalStore();
  const audit = useActionAudit();
  const [activeTab, setActiveTab] = useState('registry');
  const [filter, setFilter] = useState<'all' | 'expiring' | 'expired' | 'active'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [viewCompanyId, setViewCompanyId] = useState<string | null>(null);

  useEffect(() => {
    if (store.certificates.length === 0 && !store.isLoading) {
      store.loadFromApi();
    }
  }, [national.companies]);

  const filteredCerts = useMemo(() => {
    let list = [...store.certificates];
    if (filter === 'expiring') list = list.filter(c => c.status === 'PENDING_RENEWAL');
    if (filter === 'expired') list = list.filter(c => c.status === 'EXPIRED');
    if (filter === 'active') list = list.filter(c => c.status === 'ACTIVE');
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => {
        const company = national.companies.find(comp => comp.id === c.companyId);
        return (
          company?.nameFa?.includes(q) ||
          c.certificateNumber.toLowerCase().includes(q) ||
          typeLabels[c.typeCode]?.includes(q)
        );
      });
    }
    return list;
  }, [store.certificates, filter, searchQuery, national.companies]);

  /* Forms */
  const typeForm = useForm({ resolver: zodResolver(typeSchema), defaultValues: { code: 'ISO_9001', nameFa: '', nameEn: '', defaultValidityMonths: 12, issuingAuthority: '', mandatoryForOperation: false, renewalReminderDays: 30 } });
  const issueForm = useForm({ resolver: zodResolver(issueSchema), defaultValues: { companyId: '', typeCode: 'ISO_9001', issueDateJalali: '', certificateNumber: '', issuingAuthorityName: '', scannedFileName: '' } });

  const selectedTypeCode = issueForm.watch('typeCode');
  const selectedType = store.certificateTypes.find(t => t.code === selectedTypeCode);

  const onIssueSubmit = (data: z.infer<typeof issueSchema>) => {
    const typeDef = store.certificateTypes.find(t => t.code === data.typeCode);
    const issueDate = jalaliToIso(...Object.values(parseJalaliInput(data.issueDateJalali)!) as [number, number, number]);
    const expiryDate = new Date(issueDate);
    expiryDate.setMonth(expiryDate.getMonth() + (typeDef?.defaultValidityMonths ?? 12));

    const company = national.companies.find(c => c.id === data.companyId);
    const cert = store.issueCertificate({
      companyId: data.companyId,
      zoneId: company?.zoneId ?? '',
      typeCode: data.typeCode as CertificateTypeCode,
      issueDate,
      expiryDate: expiryDate.toISOString(),
      certificateNumber: data.certificateNumber,
      issuingAuthorityName: data.issuingAuthorityName,
      scannedFileName: data.scannedFileName,
      // CompanyCertificate.status is required and the store's expiry queries key
      // off it (`getExpiredCertificates()` filters `status === 'EXPIRED'`), so a
      // certificate issued with an already-past expiry must land as EXPIRED
      // rather than ACTIVE forever.
      status: expiryDate.getTime() < Date.now() ? 'EXPIRED' : 'ACTIVE',
    });
    
    audit.log('CREATE', 'certificate', cert.id, { entityName: data.certificateNumber });
    toast.success('گواهینامه صادر شد');
    setIssueModalOpen(false);
    issueForm.reset();
  };

  /* Stats */
  const expiringCount = store.getExpiringCertificates(30).length;
  const expiredCount = store.getExpiredCertificates().length;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">مدیریت گواهینامه‌ها</h2>
          <p className="text-sm text-slate-500">ثبت، تمدید و پیگیری گواهینامه‌های شرکت‌ها</p>
        </div>
        <div className="flex gap-2">
          {expiringCount > 0 && (
            <Badge className="bg-amber-100 text-amber-800 border-amber-300">
              <AlertTriangle className="w-3 h-3 ml-1" />
              {toPersianDigits(expiringCount)} در حال انقضا
            </Badge>
          )}
          {expiredCount > 0 && (
            <Badge className="bg-red-100 text-red-800 border-red-300">
              <XCircle className="w-3 h-3 ml-1" />
              {toPersianDigits(expiredCount)} منقضی
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">کل گواهینامه‌ها</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{toPersianDigits(store.certificates.length)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">فعال</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-600">{toPersianDigits(store.certificates.filter(c => c.status === 'ACTIVE').length)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">در حال انقضا (۳۰ روز)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600">{toPersianDigits(expiringCount)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">منقضی‌شده</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{toPersianDigits(expiredCount)}</p></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="registry">لیست گواهینامه‌ها</TabsTrigger>
          <TabsTrigger value="types">انواع گواهینامه</TabsTrigger>
          <TabsTrigger value="byCompany">نمای شرکتی</TabsTrigger>
        </TabsList>

        {/* Registry */}
        <TabsContent value="registry" className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-2">
              <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>همه</Button>
              <Button size="sm" variant={filter === 'active' ? 'default' : 'outline'} onClick={() => setFilter('active')}>فعال</Button>
              <Button size="sm" variant={filter === 'expiring' ? 'default' : 'outline'} onClick={() => setFilter('expiring')}>در حال انقضا</Button>
              <Button size="sm" variant={filter === 'expired' ? 'default' : 'outline'} onClick={() => setFilter('expired')}>منقضی</Button>
            </div>
            <div className="flex gap-2">
              <Input placeholder="جستجو..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-64" />
              <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setIssueModalOpen(true)}>
                <Plus className="w-4 h-4 ml-1" /> صدور گواهینامه
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>شرکت</TableHead>
                <TableHead>نوع</TableHead>
                <TableHead>شماره گواهینامه</TableHead>
                <TableHead>تاریخ صدور</TableHead>
                <TableHead>تاریخ انقضا</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCerts.map(cert => {
                const company = national.companies.find(c => c.id === cert.companyId);
                const daysLeft = getDaysRemaining(cert.expiryDate);
                return (
                  <TableRow key={cert.id}>
                    <TableCell>{company?.nameFa ?? cert.companyId}</TableCell>
                    <TableCell>{typeLabels[cert.typeCode]}</TableCell>
                    <TableCell className="font-mono text-xs">{cert.certificateNumber}</TableCell>
                    <TableCell>{toJalaliStr(cert.issueDate)}</TableCell>
                    <TableCell>
                      <span className={getHealthColor(cert.expiryDate, cert.status)}>
                        {toJalaliStr(cert.expiryDate)}
                        {cert.status === 'ACTIVE' && daysLeft > 0 && <span className="text-xs mr-1">({toPersianDigits(daysLeft)} روز)</span>}
                      </span>
                    </TableCell>
                    <TableCell><Badge className={statusColors[cert.status]}>{statusLabels[cert.status]}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => {
                          store.revokeCertificate(cert.id, 'ابطال توسط مدیر');
                          toast.success('گواهینامه باطل شد');
                        }}><XCircle className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Types CRUD */}
        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>تعریف نوع گواهینامه</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={typeForm.handleSubmit(data => {
                // typeSchema.code is free text (the input below is a plain
                // <Input>), while CertificateTypeDef.code is the closed
                // CertificateTypeCode union. Narrow it exactly the way the
                // issue-form already narrows `typeCode` a few lines above, so
                // validation and UX are untouched.
                store.addType({ ...data, code: data.code as CertificateTypeCode });
                toast.success('نوع گواهینامه ثبت شد');
                typeForm.reset();
              })} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>کد</Label><Input {...typeForm.register('code')} /></div>
                  <div className="space-y-2"><Label>نام فارسی</Label><Input {...typeForm.register('nameFa')} /></div>
                  <div className="space-y-2"><Label>نام انگلیسی</Label><Input {...typeForm.register('nameEn')} /></div>
                  <div className="space-y-2"><Label>مدت اعتبار (ماه)</Label><Input type="number" {...typeForm.register('defaultValidityMonths')} /></div>
                  <div className="space-y-2"><Label>مرجع صادرکننده</Label><Input {...typeForm.register('issuingAuthority')} /></div>
                  <div className="space-y-2"><Label>هشدار تمدید (روز)</Label><Input type="number" {...typeForm.register('renewalReminderDays')} /></div>
                </div>
                <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">ثبت نوع</Button>
              </form>
            </CardContent>
          </Card>

          <Table>
            <TableHeader>
              <TableRow><TableHead>کد</TableHead><TableHead>نام</TableHead><TableHead>اعتبار (ماه)</TableHead><TableHead>الزامی</TableHead><TableHead>عملیات</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {store.certificateTypes.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono">{t.code}</TableCell>
                  <TableCell>{t.nameFa}</TableCell>
                  <TableCell>{toPersianDigits(t.defaultValidityMonths)} ماه</TableCell>
                  <TableCell>{t.mandatoryForOperation ? <CheckCircle2 className="w-4 h-4 text-red-500" /> : '—'}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="text-red-500" onClick={() => { store.deleteType(t.id); toast.success('حذف شد'); }}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* By Company */}
        <TabsContent value="byCompany" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {national.companies.slice(0, 12).map(company => {
              const certs = store.getCertificatesByCompany(company.id);
              const hasExpired = certs.some(c => c.status === 'EXPIRED');
              const hasExpiring = certs.some(c => c.status === 'PENDING_RENEWAL');
              return (
                <Card key={company.id} className={`border-l-4 ${hasExpired ? 'border-l-red-500' : hasExpiring ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
                  <CardHeader>
                    <CardTitle className="text-sm">{company.nameFa}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs text-slate-500">تعداد گواهینامه: {toPersianDigits(certs.length)}</p>
                    <div className="flex flex-wrap gap-1">
                      {certs.map(cert => (
                        <Badge key={cert.id} className={`text-xs ${statusColors[cert.status]}`}>
                          {typeLabels[cert.typeCode]}
                        </Badge>
                      ))}
                    </div>
                    {certs.map(cert => {
                      const days = getDaysRemaining(cert.expiryDate);
                      return (
                        <div key={cert.id} className="flex items-center justify-between text-xs border-t pt-1">
                          <span>{typeLabels[cert.typeCode]}</span>
                          <span className={getHealthColor(cert.expiryDate, cert.status)}>
                            {days > 0 ? `${toPersianDigits(days)} روز باقی` : days === 0 ? 'امروز' : `${toPersianDigits(Math.abs(days))} روز گذشته`}
                          </span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Issue Modal */}
      <Dialog open={issueModalOpen} onOpenChange={setIssueModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>صدور گواهینامه جدید</DialogTitle></DialogHeader>
          <form onSubmit={issueForm.handleSubmit(onIssueSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>شرکت</Label>
              <Controller control={issueForm.control} name="companyId" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="انتخاب شرکت" /></SelectTrigger>
                  <SelectContent>
                    {national.companies.map(c => <SelectItem key={c.id} value={c.id}>{c.nameFa}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-2">
              <Label>نوع گواهینامه</Label>
              <Controller control={issueForm.control} name="typeCode" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {store.certificateTypes.map(t => <SelectItem key={t.code} value={t.code}>{t.nameFa}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
              {selectedType && <p className="text-xs text-slate-500">مدت اعتبار: {toPersianDigits(selectedType.defaultValidityMonths)} ماه</p>}
            </div>
            <div className="space-y-2">
              <Label>تاریخ صدور (شمسی)</Label>
              <Input placeholder="1403/05/12" {...issueForm.register('issueDateJalali')} />
            </div>
            <div className="space-y-2">
              <Label>شماره گواهینامه</Label>
              <Input {...issueForm.register('certificateNumber')} />
            </div>
            <div className="space-y-2">
              <Label>مرجع صادرکننده</Label>
              <Input {...issueForm.register('issuingAuthorityName')} />
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">صدور گواهینامه</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
