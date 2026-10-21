// ============================================================================
// Task 5: Financial Management
// ============================================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Edit3,
  Printer,
  Filter,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  FileText,
  ChevronDown,
  ChevronUp,
  Search,
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
  useFinancialStore,
  type ServiceType,
  type CalculationMethod,
  type InvoiceStatus,
  type PaymentMethodType,
} from '../store/useFinancialStore';
import { useNationalStore } from '../store/useNationalStore';
import { useActionAudit } from '../hooks/useActionAudit';
import {
  toPersianDigits,
  formatRial,
  toJalaliStr,
  jalaliNow,
  jalaliToIso,
  parseJalaliInput,
  isOverdueJalali,
  daysUntilJalali,
} from '@/utils/persianFormat';

/* ------------------------------------------------------------------ */
/*  Zod Schemas                                                       */
/* ------------------------------------------------------------------ */

const tariffSchema = z.object({
  name: z.string().min(2, 'نام الزامی است'),
  serviceType: z.enum(['land_lease', 'utility', 'permit_issuance', 'municipal_services', 'annual_tax']),
  baseAmount: z.coerce.number().min(0, 'مبلغ پایه باید مثبت باشد'),
  calculationMethod: z.enum(['fixed', 'per_sqm', 'per_employee']),
  taxRate: z.coerce.number().min(0).max(1, 'نرخ مالیات باید بین ۰ و ۱ باشد'),
  effectiveDateJalali: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, 'تاریخ شمسی نامعتبر'),
  expiryDateJalali: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, 'تاریخ شمسی نامعتبر'),
});

const invoiceItemSchema = z.object({
  title: z.string().min(1, 'عنوان الزامی است'),
  amount: z.coerce.number().min(1, 'مبلغ باید مثبت باشد'),
  period: z.string().min(1, 'دوره الزامی است'),
  collectionIdentifier: z.string().min(1, 'شناسه وصول الزامی است'),
});

const invoiceSchema = z.object({
  zoneId: z.string().min(1, 'انتخاب شهرک الزامی است'),
  targetType: z.enum(['all', 'specific']),
  companyIds: z.array(z.string()).optional(),
  items: z.array(invoiceItemSchema).min(1, 'حداقل یک ردیف الزامی است'),
  dueDateJalali: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, 'تاریخ سررسید نامعتبر'),
  description: z.string().max(500),
});

const paymentSchema = z.object({
  amount: z.coerce.number().min(1, 'مبلغ باید مثبت باشد'),
  method: z.enum(['bank_transfer', 'cheque', 'cash']),
  receiptNumber: z.string().min(1, 'شماره رسید الزامی است'),
});

/* ------------------------------------------------------------------ */
/*  Status Helpers                                                    */
/* ------------------------------------------------------------------ */

const statusLabels: Record<InvoiceStatus, string> = {
  DRAFT: 'پیش‌نویس',
  ISSUED: 'صدور شده',
  SENT: 'ارسال شده',
  UNPAID: 'پرداخت نشده',
  PARTIAL: 'پرداخت جزئی',
  PAID: 'پرداخت شده',
};

const statusColors: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  ISSUED: 'bg-blue-50 text-blue-700',
  SENT: 'bg-indigo-50 text-indigo-700',
  UNPAID: 'bg-red-50 text-red-700',
  PARTIAL: 'bg-amber-50 text-amber-700',
  PAID: 'bg-emerald-50 text-emerald-700',
};

const serviceLabels: Record<ServiceType, string> = {
  land_lease: 'اجاره زمین',
  utility: 'خدمات عمومی',
  permit_issuance: 'صدور پروانه',
  municipal_services: 'خدمات شهرداری',
  annual_tax: 'مالیات سالانه',
};

const calcLabels: Record<CalculationMethod, string> = {
  fixed: 'ثابت',
  per_sqm: 'پر متر مربع',
  per_employee: 'پر نفر',
};

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

export default function FinancialManagement() {
  const store = useFinancialStore();
  const national = useNationalStore();
  const audit = useActionAudit();
  const printRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState('tariffs');
  const [invoiceFilters, setInvoiceFilters] = useState({
    zoneId: '',
    status: '' as InvoiceStatus | '',
    dateFromJalali: '',
    dateToJalali: '',
  });
  const [debtThreshold, setDebtThreshold] = useState(5000000);
  const [editingTariff, setEditingTariff] = useState<string | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);

  useEffect(() => {
    if (store.invoices.length === 0 && !store.isLoading) store.loadFromApi();
  }, [store]);

  const zones = national.parks;
  const filteredInvoices = useMemo(() => {
    return store.getFilteredInvoices({
      zoneId: invoiceFilters.zoneId || undefined,
      status: (invoiceFilters.status as InvoiceStatus) || undefined,
      dateFrom: invoiceFilters.dateFromJalali
        ? jalaliToIso(...Object.values(parseJalaliInput(invoiceFilters.dateFromJalali)!) as [number, number, number])
        : undefined,
      dateTo: invoiceFilters.dateToJalali
        ? jalaliToIso(...Object.values(parseJalaliInput(invoiceFilters.dateToJalali)!) as [number, number, number])
        : undefined,
    });
  }, [store, invoiceFilters]);

  const revenueByZone = store.getTotalRevenueByZone();
  const monthlyTrend = store.getMonthlyCollectionTrend();
  const debtors = store.getDebtorsAboveThreshold(debtThreshold);
  const overdueInvoices = store.getOverdueInvoices();

  /* ----------------- Tariff Form ----------------- */
  // `jalaliNow()` returns a FORMATTED Jalali string (`۱۴۰۴/۰۷/۲۸`), not an
  // object, so `.year`/`.month`/`.day` were all `undefined` and these two
  // defaults were literally "undefined/undefined/undefined" (fix7.md B1,
  // TS2339). Parse the string once and build the same YYYY/MM/DD shape.
  const todayJalali = parseJalaliInput(jalaliNow());
  const jalaliDate = (y: number) =>
    `${y}/${String(todayJalali.m).padStart(2, '0')}/${String(todayJalali.d).padStart(2, '0')}`;

  const tariffForm = useForm({
    resolver: zodResolver(tariffSchema),
    defaultValues: {
      name: '',
      serviceType: 'land_lease' as ServiceType,
      baseAmount: 0,
      calculationMethod: 'fixed' as CalculationMethod,
      taxRate: 0.09,
      effectiveDateJalali: jalaliDate(todayJalali.y),
      expiryDateJalali: jalaliDate(todayJalali.y + 1),
    },
  });

  const onTariffSubmit = (data: z.infer<typeof tariffSchema>) => {
    const effectiveDate = jalaliToIso(...Object.values(parseJalaliInput(data.effectiveDateJalali)!) as [number, number, number]);
    const expiryDate = jalaliToIso(...Object.values(parseJalaliInput(data.expiryDateJalali)!) as [number, number, number]);

    if (editingTariff) {
      store.updateTariff(editingTariff, { ...data, effectiveDate, expiryDate });
      audit.log('UPDATE', 'financial_invoice', editingTariff, { entityName: data.name });
      toast.success('الگوی تعرفه به‌روزرسانی شد');
      setEditingTariff(null);
    } else {
      const t = store.addTariff({ ...data, effectiveDate, expiryDate, applicableZoneTypes: ['light', 'heavy'] as string[], currency: 'IRR' });
      audit.log('CREATE', 'financial_invoice', t.id, { entityName: t.name });
      toast.success('الگوی تعرفه ثبت شد');
    }
    tariffForm.reset();
  };

  /* ----------------- Invoice Form ----------------- */
  const invoiceForm = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      zoneId: '',
      targetType: 'all' as const,
      companyIds: [] as string[],
      items: [{ title: '', amount: 0, period: '', collectionIdentifier: '' }],
      dueDateJalali: '',
      description: '',
    },
  });

  const itemFields = useFieldArray({ control: invoiceForm.control, name: 'items' });

  const onInvoiceSubmit = (data: z.infer<typeof invoiceSchema>) => {
    const dueDate = jalaliToIso(...Object.values(parseJalaliInput(data.dueDateJalali)!) as [number, number, number]);
    const totalAmount = data.items.reduce((s, it) => s + it.amount, 0);

    const inv = store.addInvoice({
      zoneId: data.zoneId,
      companyIds: data.targetType === 'all' ? [] : (data.companyIds ?? []),
      targetedAllCompanies: data.targetType === 'all',
      items: data.items,
      totalAmount,
      paidAmount: 0,
      dueDate,
      description: data.description,
      status: 'DRAFT',
      createdBy: 'current-user',
    });

    audit.log('CREATE', 'financial_invoice', inv.id, { entityName: `صورت‌حساب ${inv.id}` });
    toast.success('صورت‌حساب جدید صادر شد');
    invoiceForm.reset();
    setEditingInvoice(null);
  };

  /* ----------------- Payment ----------------- */
  const paymentForm = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: 0, method: 'bank_transfer' as PaymentMethodType, receiptNumber: '' },
  });

  const onPayment = (data: z.infer<typeof paymentSchema>) => {
    if (!showPaymentModal) return;
    const res = store.recordPayment(showPaymentModal, data.amount, data.method, data.receiptNumber, 'current-user', 'مدیر سیستم ملی');
    if (res.success) {
      toast.success('پرداخت ثبت شد');
      setShowPaymentModal(null);
      paymentForm.reset();
    } else {
      toast.error(res.error ?? 'خطا در ثبت پرداخت');
    }
  };

  /* ----------------- Print ----------------- */
  const handlePrint = () => {
    if (printRef.current) {
      const w = window.open('', '_blank');
      if (w) {
        // NEW-004: Use textContent instead of innerHTML to prevent XSS
        const content = printRef.current.innerText || printRef.current.textContent || '';
        w.document.write(`<html dir="rtl"><head><title>گزارش مالی</title><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px;text-align:right}th{background:#f5f5f5}</style></head><body><pre style="white-space:pre-wrap;font-family:sans-serif">${content}</pre></body></html>`);
        w.document.close();
        w.print();
      }
    }
  };

  /* ============================================= */
  /*  RENDER                                         */
  /* ============================================= */

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">مدیریت مالی ملی</h2>
          <p className="text-sm text-slate-500">صدور صورت‌حساب، تعرفه‌ها و گزارش‌های مالی</p>
        </div>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="w-4 h-4 ml-2" /> چاپ گزارش
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">کل صورت‌حساب‌ها</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{toPersianDigits(store.invoices.length)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">درآمد وصول‌شده</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-600">{formatRial(store.invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.paidAmount, 0))}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">معوقات</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-600">{formatRial(overdueInvoices.reduce((s, i) => s + i.remainingAmount, 0))}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500">تعرفه‌های فعال</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-amber-600">{toPersianDigits(store.tariffTemplates.length)}</p></CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tariffs">قالب‌های تعرفه</TabsTrigger>
          <TabsTrigger value="invoices">صورت‌حساب‌ها</TabsTrigger>
          <TabsTrigger value="payments">گردش پرداخت</TabsTrigger>
          <TabsTrigger value="reports">گزارش‌ها</TabsTrigger>
        </TabsList>

        {/* ========== TARIFFS ========== */}
        <TabsContent value="tariffs" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{editingTariff ? 'ویرایش تعرفه' : 'تعریف تعرفه جدید'}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={tariffForm.handleSubmit(onTariffSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>نام قالب</Label>
                    <Input {...tariffForm.register('name')} />
                    {tariffForm.formState.errors.name && <p className="text-xs text-red-500">{tariffForm.formState.errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>نوع خدمت</Label>
                    <Controller control={tariffForm.control} name="serviceType" render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(serviceLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div className="space-y-2">
                    <Label>مبلغ پایه (ریال)</Label>
                    <Input type="number" {...tariffForm.register('baseAmount')} />
                  </div>
                  <div className="space-y-2">
                    <Label>روش محاسبه</Label>
                    <Controller control={tariffForm.control} name="calculationMethod" render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(calcLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div className="space-y-2">
                    <Label>تاریخ اثرگذاری (شمسی)</Label>
                    <Input placeholder="1403/01/01" {...tariffForm.register('effectiveDateJalali')} />
                  </div>
                  <div className="space-y-2">
                    <Label>تاریخ انقضا (شمسی)</Label>
                    <Input placeholder="1404/01/01" {...tariffForm.register('expiryDateJalali')} />
                  </div>
                  <div className="space-y-2">
                    <Label>نرخ مالیات (۰ تا ۱)</Label>
                    <Input type="number" step="0.01" {...tariffForm.register('taxRate')} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">
                    {editingTariff ? 'به‌روزرسانی' : 'ثبت تعرفه'}
                  </Button>
                  {editingTariff && (
                    <Button type="button" variant="outline" onClick={() => { setEditingTariff(null); tariffForm.reset(); }}>
                      انصراف
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>نوع خدمت</TableHead>
                <TableHead>مبلغ پایه</TableHead>
                <TableHead>روش محاسبه</TableHead>
                <TableHead>تاریخ اثرگذاری</TableHead>
                <TableHead>تاریخ انقضا</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {store.tariffTemplates.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{serviceLabels[t.serviceType]}</TableCell>
                  <TableCell>{formatRial(t.baseAmount)}</TableCell>
                  <TableCell>{calcLabels[t.calculationMethod]}</TableCell>
                  <TableCell>{toJalaliStr(t.effectiveDate)}</TableCell>
                  <TableCell>{toJalaliStr(t.expiryDate)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditingTariff(t.id); tariffForm.reset({ ...t, effectiveDateJalali: toJalaliStr(t.effectiveDate), expiryDateJalali: toJalaliStr(t.expiryDate) }); }}>
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-red-500" onClick={() => { store.deleteTariff(t.id); toast.success('حذف شد'); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* ========== INVOICES ========== */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>صدور صورت‌حساب گروهی</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={invoiceForm.handleSubmit(onInvoiceSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>شهرک</Label>
                    <Controller control={invoiceForm.control} name="zoneId" render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="انتخاب شهرک" /></SelectTrigger>
                        <SelectContent>
                          {zones.map(z => <SelectItem key={z.id} value={z.id}>{z.nameFa ?? z.zoneCode}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )} />
                    {invoiceForm.formState.errors.zoneId && <p className="text-xs text-red-500">{invoiceForm.formState.errors.zoneId.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>هدف</Label>
                    <Controller control={invoiceForm.control} name="targetType" render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">همه شرکت‌ها</SelectItem>
                          <SelectItem value="specific">شرکت‌های انتخابی</SelectItem>
                        </SelectContent>
                      </Select>
                    )} />
                  </div>
                </div>

                {invoiceForm.watch('targetType') === 'specific' && (
                  <div className="space-y-2">
                    <Label>انتخاب شرکت‌ها</Label>
                    <Controller control={invoiceForm.control} name="companyIds" render={({ field }) => (
                      <div className="flex flex-wrap gap-2">
                        {national.companies.filter(c => c.zoneId === invoiceForm.watch('zoneId')).map(c => (
                          <label key={c.id} className="flex items-center gap-1 text-sm border rounded px-2 py-1 cursor-pointer">
                            <input type="checkbox" checked={field.value?.includes(c.id)} onChange={(e) => {
                              const vals = field.value ?? [];
                              field.onChange(e.target.checked ? [...vals, c.id] : vals.filter(v => v !== c.id));
                            }} />
                            {c.nameFa}
                          </label>
                        ))}
                      </div>
                    )} />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>ردیف‌های صورت‌حساب</Label>
                    <Button type="button" size="sm" variant="outline" onClick={() => itemFields.append({ title: '', amount: 0, period: '', collectionIdentifier: '' })}>
                      <Plus className="w-4 h-4 ml-1" /> افزودن ردیف
                    </Button>
                  </div>
                  {itemFields.fields.map((field, idx) => (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-end border rounded p-3">
                      <div className="col-span-3">
                        <Input placeholder="عنوان" {...invoiceForm.register(`items.${idx}.title` as const)} />
                      </div>
                      <div className="col-span-2">
                        <Input type="number" placeholder="مبلغ" {...invoiceForm.register(`items.${idx}.amount` as const)} />
                      </div>
                      <div className="col-span-3">
                        <Input placeholder="دوره" {...invoiceForm.register(`items.${idx}.period` as const)} />
                      </div>
                      <div className="col-span-3">
                        <Input placeholder="شناسه وصول" {...invoiceForm.register(`items.${idx}.collectionIdentifier` as const)} />
                      </div>
                      <div className="col-span-1">
                        <Button type="button" size="icon" variant="ghost" className="text-red-500" onClick={() => itemFields.remove(idx)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>تاریخ سررسید (شمسی)</Label>
                    <Input placeholder="1403/06/15" {...invoiceForm.register('dueDateJalali')} />
                  </div>
                  <div className="space-y-2">
                    <Label>توضیحات</Label>
                    <Input {...invoiceForm.register('description')} />
                  </div>
                </div>

                <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">صدور صورت‌حساب</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>لیست صورت‌حساب‌ها</CardTitle>
              <div className="flex gap-2">
                <Select value={invoiceFilters.zoneId || "all"} onValueChange={(v) => setInvoiceFilters(f => ({ ...f, zoneId: v === "all" ? "" : v }))}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="شهرک" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه</SelectItem>
                    {zones.map(z => <SelectItem key={z.id} value={z.id}>{z.nameFa ?? z.zoneCode}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={invoiceFilters.status || "all"} onValueChange={(v) => setInvoiceFilters(f => ({ ...f, status: (v === "all" ? "" : v) as InvoiceStatus }))}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="وضعیت" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه</SelectItem>
                    {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>شماره</TableHead>
                    <TableHead>شهرک</TableHead>
                    <TableHead>مبلغ کل</TableHead>
                    <TableHead>پرداخت‌شده</TableHead>
                    <TableHead>باقی‌مانده</TableHead>
                    <TableHead>سررسید</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead>عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((inv) => {
                    const zone = zones.find(z => z.id === inv.zoneId);
                    const isOverdue = isOverdueJalali(inv.dueDate);
                    return (
                      <TableRow key={inv.id} className={isOverdue ? 'bg-red-50/50' : ''}>
                        <TableCell className="font-mono text-xs">{inv.id}</TableCell>
                        <TableCell>{zone?.nameFa ?? inv.zoneId}</TableCell>
                        <TableCell>{formatRial(inv.totalAmount)}</TableCell>
                        <TableCell>{formatRial(inv.paidAmount)}</TableCell>
                        <TableCell>{formatRial(inv.remainingAmount)}</TableCell>
                        <TableCell>
                          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                            {toJalaliStr(inv.dueDate)}
                            {isOverdue && <span className="text-xs mr-1">({toPersianDigits(Math.abs(daysUntilJalali(inv.dueDate)))} روز گذشته)</span>}
                          </span>
                        </TableCell>
                        <TableCell><Badge className={statusColors[inv.status]}>{statusLabels[inv.status]}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {inv.status !== 'PAID' && (
                              <Button size="sm" variant="outline" onClick={() => setShowPaymentModal(inv.id)}>
                                <CreditCard className="w-3 h-3 ml-1" /> ثبت پرداخت
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" className="text-red-500" onClick={() => { store.deleteInvoice(inv.id); toast.success('حذف شد'); }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== PAYMENTS ========== */}
        <TabsContent value="payments" className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>شماره صورت‌حساب</TableHead>
                <TableHead>مبلغ کل</TableHead>
                <TableHead>پرداخت‌شده</TableHead>
                <TableHead>باقی‌مانده</TableHead>
                <TableHead>تاریخ پرداخت</TableHead>
                <TableHead>روش</TableHead>
                <TableHead>شماره رسید</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {store.invoices.filter(i => i.status === 'PAID' || i.status === 'PARTIAL').map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-xs">{inv.id}</TableCell>
                  <TableCell>{formatRial(inv.totalAmount)}</TableCell>
                  <TableCell className="text-emerald-600 font-medium">{formatRial(inv.paidAmount)}</TableCell>
                  <TableCell className={inv.remainingAmount > 0 ? 'text-red-600' : ''}>{formatRial(inv.remainingAmount)}</TableCell>
                  <TableCell>{inv.paymentDate ? toJalaliStr(inv.paymentDate) : '—'}</TableCell>
                  <TableCell>
                    {inv.paymentMethod === 'bank_transfer' ? 'انتقال بانکی' :
                     inv.paymentMethod === 'cheque' ? 'چک' : 'نقدی'}
                  </TableCell>
                  <TableCell>{inv.receiptNumber ?? '—'}</TableCell>
                  <TableCell>
                    {inv.remainingAmount > 0 && (
                      <Button size="sm" variant="outline" onClick={() => setShowPaymentModal(inv.id)}>
                        <CreditCard className="w-3 h-3 ml-1" /> پرداخت باقی‌مانده
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* ========== REPORTS ========== */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>درآمد بر شهرک</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={Object.entries(revenueByZone).map(([k, v]) => ({ name: zones.find(z => z.id === k)?.nameFa ?? k, value: v }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => toPersianDigits(Math.round(v / 1_000_000)) + 'M'} />
                    <Tooltip formatter={(value: number) => [formatRial(value), 'درآمد']} />
                    <Bar dataKey="value" fill="#d97706" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>روند ماهانه وصول</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrend.map(m => ({ ...m, monthLabel: toPersianDigits(m.month.split('-')[1]) }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="monthLabel" />
                    <YAxis tickFormatter={(v) => toPersianDigits(Math.round(v / 1_000_000)) + 'M'} />
                    <Tooltip formatter={(value: number) => [formatRial(value), '']} />
                    <Legend />
                    <Line type="monotone" dataKey="collected" name="وصول‌شده" stroke="#059669" strokeWidth={2} />
                    <Line type="monotone" dataKey="issued" name="صدور شده" stroke="#2563eb" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>بدهکاران بالای آستانه</CardTitle>
              <div className="flex items-center gap-2">
                <Label>آستانه (ریال):</Label>
                <Input type="number" className="w-40" value={debtThreshold} onChange={(e) => setDebtThreshold(Number(e.target.value))} />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>شناسه شرکت</TableHead><TableHead>بدهی کل</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {debtors.map((d) => (
                    <TableRow key={d.companyId}>
                      <TableCell>{d.companyId}</TableCell>
                      <TableCell className="text-red-600 font-bold">{formatRial(d.totalUnpaid)}</TableCell>
                    </TableRow>
                  ))}
                  {debtors.length === 0 && (
                    <TableRow><TableCell colSpan={2} className="text-center text-slate-400">هیچ بدهکاری بالای آستانه یافت نشد</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div ref={printRef} className="hidden">
            <h2 className="text-lg font-bold mb-4">گزارش مالی ملی</h2>
            <table>
              <thead><tr><th>شماره</th><th>شهرک</th><th>مبلغ</th><th>وضعیت</th><th>سررسید</th></tr></thead>
              <tbody>
                {filteredInvoices.map(inv => (
                  <tr key={inv.id}>
                    <td>{inv.id}</td>
                    <td>{zones.find(z => z.id === inv.zoneId)?.nameFa ?? inv.zoneId}</td>
                    <td>{formatRial(inv.totalAmount)}</td>
                    <td>{statusLabels[inv.status]}</td>
                    <td>{toJalaliStr(inv.dueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Payment Modal */}
      <Dialog open={!!showPaymentModal} onOpenChange={() => setShowPaymentModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>ثبت پرداخت</DialogTitle></DialogHeader>
          <form onSubmit={paymentForm.handleSubmit(onPayment)} className="space-y-4">
            <div className="space-y-2">
              <Label>مبلغ پرداخت (ریال)</Label>
              <Input type="number" {...paymentForm.register('amount')} />
              {paymentForm.formState.errors.amount && <p className="text-xs text-red-500">{paymentForm.formState.errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>روش پرداخت</Label>
              <Controller control={paymentForm.control} name="method" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">انتقال بانکی</SelectItem>
                    <SelectItem value="cheque">چک</SelectItem>
                    <SelectItem value="cash">نقدی</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-2">
              <Label>شماره رسید</Label>
              <Input {...paymentForm.register('receiptNumber')} />
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">ثبت پرداخت</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
