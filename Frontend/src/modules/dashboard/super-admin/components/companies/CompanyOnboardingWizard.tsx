// src/modules/dashboard/super-admin/components/companies/CompanyOnboardingWizard.tsx
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { WizardShell, useWizardDraft, ZoneSelector } from '../shared/company';
import { useNationalStore } from '../../store/useNationalStore';
import { useNationalCompanyStore } from '../../store/useNationalCompanyStore';
import { useTenantStore } from '@/core/stores/useTenantStore';
import type { NationalCompany, CompanyProduct, CompanyRawMaterial, CompanyDocument } from '@/entities/company';
import { isValidNationalId, isValidShaba, isValidIsic } from '@/entities/company';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Button } from '@/app/components/ui/button';
import { toast } from 'sonner';

const DRAFT_KEY = 'draft_company_onboarding_super_admin';

const STEPS = [
  { key: 'zone', label: 'انتخاب منطقه' },
  { key: 'identity', label: 'شناسنامه' },
  { key: 'contact', label: 'تماس و آدرس' },
  { key: 'activity', label: 'محصولات و مواد' },
  { key: 'financial', label: 'مالی' },
  { key: 'hse', label: 'ایمنی' },
  { key: 'documents', label: 'مدارک' },
  { key: 'review', label: 'مرور و ثبت' },
];

const defaultCompany = (): Partial<NationalCompany> => ({
  id: crypto.randomUUID(),
  zoneId: undefined,
  status: 'PENDING_ZONE_APPROVAL',
  name: '', brand: '', nationalId: '', registrationNumber: '',
  isicCode: '', industry: '', companyType: 'private', size: 'small',
  phone: '', email: '', website: '', address: '', province: '', city: '',
  ceoName: '', ceoNationalId: '', establishmentYear: undefined,
  employeeCount: 0,
  products: [], rawMaterials: [],
  financials: { registeredCapital: 0, shaba: '', taxCode: '', fiscalYearEndMonth: 12 } as any,
  hse: { hasEnvironmentalPermit: false, hasFireSafetyCert: false, hazardLevel: 'low' } as any,
  documents: [],
  description: '',
});

export function CompanyOnboardingWizard() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const presetZoneId = params.get('zoneId') ?? undefined;
  const zoneLocked = !!presetZoneId;

  const user = useTenantStore((s) => (s as any).currentUser);
  const getParkById = useNationalStore((s) => s.getParkById);
  const addCompany = useNationalCompanyStore((s) => s.addCompany);

  const { draft: form, setDraft: setForm, clearDraft } = useWizardDraft<Partial<NationalCompany>>(
    DRAFT_KEY,
    () => ({ ...defaultCompany(), zoneId: presetZoneId })
  );

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const setField = <K extends keyof NationalCompany>(key: K, value: NationalCompany[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => { const n = { ...p }; delete n[key as string]; return n; });
  };

  /* ---------------- Validation per step ---------------- */
  const validateStep = (i: number): boolean => {
    const e: Record<string, string> = {};
    if (i === 0 && !form.zoneId) e.zoneId = 'انتخاب منطقه صنعتی الزامی است.';
    if (i === 1) {
      if (!form.name?.trim()) e.name = 'نام شرکت الزامی است.';
      if (!form.nationalId) e.nationalId = 'شناسه ملی الزامی است.';
      else if (!isValidNationalId(form.nationalId)) e.nationalId = 'شناسه ملی ۱۱ رقمی با کنترل صحیح نیست.';
      if (!form.isicCode) e.isicCode = 'کد آیسیک الزامی است.';
      else if (!isValidIsic(form.isicCode)) e.isicCode = 'کد آیسیک باید ۴ رقم باشد.';
      if (!form.industry) e.industry = 'صنعت الزامی است.';
    }
    if (i === 2) {
      if (!form.phone) e.phone = 'تلفن الزامی است.';
      if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'ایمیل معتبر نیست.';
      if (!form.address) e.address = 'آدرس الزامی است.';
      if (!form.province) e.province = 'استان الزامی است.';
      if (!form.city) e.city = 'شهر الزامی است.';
    }
    if (i === 4) {
      if (form.financials?.shaba && !isValidShaba(form.financials.shaba))
        e.shaba = 'فرمت شبا صحیح نیست (IR + ۲۴ رقم).';
      if ((form.financials?.registeredCapital ?? 0) <= 0)
        e.registeredCapital = 'سرمایه ثبتی باید بزرگ‌تر از صفر باشد.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep(step) && step < STEPS.length - 1) setStep(step + 1); };
  const back = () => step > 0 && setStep(step - 1);

  const submit = () => {
    for (let i = 0; i < STEPS.length - 1; i++) {
      if (!validateStep(i)) {
        setStep(i);
        toast.error('لطفاً خطاهای مرحله «' + STEPS[i].label + '» را برطرف کنید.');
        return;
      }
    }
    setSubmitting(true);
    const zone = getParkById(form.zoneId!);
    const payload: NationalCompany = {
      ...(form as NationalCompany),
      zoneName: zone?.name,
      province: form.province ?? zone?.province,
      workflowState: {
        currentStep: 'PENDING_ZONE_APPROVAL',
        submittedAt: new Date().toISOString(),
        reviewNotes: [],
      } as any,
    };

    const result = addCompany(payload, user?.id ?? 'unknown', user?.name ?? 'ناشناس');
    if (result.success) {
      clearDraft();
      toast.success('شرکت با موفقیت ثبت شد و در انتظار تأیید مدیر منطقه است.');
      navigate('/super-admin/companies');
    } else {
      toast.error(result.error ?? 'خطا در ثبت شرکت.');
    }
    setSubmitting(false);
  };

  /* ---------------- Field component ---------------- */
  const F = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <div>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );

  /* ---------------- Step 0: Zone ---------------- */
  const renderZoneStep = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        ℹ️ هر شرکت باید به دقیقاً یک منطقه صنعتی متصل باشد. پس از انتخاب، منطقه در ادامهٔ فرآیند قابل تغییر نیست.
      </div>
      <ZoneSelector
        value={form.zoneId}
        onChange={(id) => setField('zoneId', id)}
        locked={zoneLocked}
        error={errors.zoneId}
      />
    </div>
  );

  /* ---------------- Step 1: Identity ---------------- */
  const renderIdentity = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <F label="نام شرکت *" error={errors.name}>
        <Input value={form.name ?? ''} onChange={(e) => setField('name', e.target.value)} />
      </F>
      <F label="نام تجاری (برند)">
        <Input value={form.brand ?? ''} onChange={(e) => setField('brand', e.target.value)} />
      </F>
      <F label="شناسه ملی (۱۱ رقم) *" error={errors.nationalId}>
        <Input value={form.nationalId ?? ''} maxLength={11} dir="ltr"
          onChange={(e) => setField('nationalId', e.target.value.replace(/\D/g, ''))} />
      </F>
      <F label="شماره ثبت">
        <Input value={form.registrationNumber ?? ''} onChange={(e) => setField('registrationNumber', e.target.value)} />
      </F>
      <F label="کد آیسیک (۴ رقم) *" error={errors.isicCode}>
        <Input value={form.isicCode ?? ''} maxLength={4} dir="ltr"
          onChange={(e) => setField('isicCode', e.target.value.replace(/\D/g, ''))} />
      </F>
      <F label="صنعت *" error={errors.industry}>
        <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.industry ?? ''}
          onChange={(e) => setField('industry', e.target.value)}>
          <option value="">انتخاب کنید…</option>
          {['فلزی', 'شیمیایی', 'غذایی', 'نساجی', 'سلولزی', 'معدنی', 'الکترونیک', 'دارویی', 'ساختمانی', 'پلاستیک', 'خودرو', 'سایر']
            .map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
      </F>
      <F label="نوع شرکت">
        <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.companyType ?? 'private'}
          onChange={(e) => setField('companyType', e.target.value as any)}>
          <option value="private">خصوصی</option>
          <option value="public">عمومی</option>
          <option value="cooperative">تعاونی</option>
          <option value="governmental">دولتی</option>
        </select>
      </F>
      <F label="اندازه شرکت">
        <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.size ?? 'small'}
          onChange={(e) => setField('size', e.target.value as any)}>
          <option value="micro">خرد</option>
          <option value="small">کوچک</option>
          <option value="medium">متوسط</option>
          <option value="large">بزرگ</option>
        </select>
      </F>
      <F label="سال تأسیس">
        <Input type="number" value={form.establishmentYear ?? ''} dir="ltr"
          onChange={(e) => setField('establishmentYear', Number(e.target.value))} />
      </F>
      <F label="تعداد کارکنان">
        <Input type="number" value={form.employeeCount ?? 0} dir="ltr"
          onChange={(e) => setField('employeeCount', Number(e.target.value))} />
      </F>
      <F label="نام مدیرعامل">
        <Input value={form.ceoName ?? ''} onChange={(e) => setField('ceoName', e.target.value)} />
      </F>
      <F label="کد ملی مدیرعامل">
        <Input value={form.ceoNationalId ?? ''} maxLength={10} dir="ltr"
          onChange={(e) => setField('ceoNationalId', e.target.value.replace(/\D/g, ''))} />
      </F>
    </div>
  );

  /* ---------------- Step 2: Contact ---------------- */
  const renderContact = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <F label="تلفن *" error={errors.phone}>
        <Input value={form.phone ?? ''} dir="ltr" onChange={(e) => setField('phone', e.target.value)} />
      </F>
      <F label="ایمیل" error={errors.email}>
        <Input value={form.email ?? ''} dir="ltr" onChange={(e) => setField('email', e.target.value)} />
      </F>
      <F label="وب‌سایت">
        <Input value={form.website ?? ''} dir="ltr" onChange={(e) => setField('website', e.target.value)} />
      </F>
      <F label="استان *" error={errors.province}>
        <Input value={form.province ?? ''} onChange={(e) => setField('province', e.target.value)} />
      </F>
      <F label="شهر *" error={errors.city}>
        <Input value={form.city ?? ''} onChange={(e) => setField('city', e.target.value)} />
      </F>
      <F label="کد پستی">
        <Input value={(form as any).postalCode ?? ''} dir="ltr" maxLength={10}
          onChange={(e) => setField('postalCode' as any, e.target.value as any)} />
      </F>
      <div className="md:col-span-2">
        <F label="آدرس دقیق *" error={errors.address}>
          <Input value={form.address ?? ''} onChange={(e) => setField('address', e.target.value)} />
        </F>
      </div>
    </div>
  );

  /* ---------------- Step 3: Products & Materials ---------------- */
  const renderActivity = () => (
    <div className="space-y-6">
      {/* Products */}
      <div className="space-y-3">
        <h4 className="font-bold text-slate-700">محصولات</h4>
        {(form.products || []).map((p: CompanyProduct, i: number) => (
          <div key={i} className="grid grid-cols-4 gap-2 border rounded-lg p-2">
            <Input placeholder="نام محصول" value={p.name} onChange={(e) => {
              const n = [...(form.products || [])]; n[i] = { ...p, name: e.target.value }; setField('products', n);
            }} />
            <Input placeholder="کد آیسیک" value={p.isicCode ?? ''} maxLength={4} dir="ltr" onChange={(e) => {
              const n = [...(form.products || [])]; n[i] = { ...p, isicCode: e.target.value }; setField('products', n);
            }} />
            <Input placeholder="ظرفیت سالانه (تن)" type="number" value={p.annualCapacity ?? ''} dir="ltr" onChange={(e) => {
              const n = [...(form.products || [])]; n[i] = { ...p, annualCapacity: Number(e.target.value) }; setField('products', n);
            }} />
            <Button variant="destructive" size="sm" onClick={() => {
              const n = [...(form.products || [])]; n.splice(i, 1); setField('products', n);
            }}>حذف</Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() =>
          setField('products', [...(form.products || []), { name: '', isicCode: '', annualCapacity: 0 } as CompanyProduct])}>
          + افزودن محصول
        </Button>
      </div>

      {/* Raw materials */}
      <div className="space-y-3">
        <h4 className="font-bold text-slate-700">مواد اولیه</h4>
        {(form.rawMaterials || []).map((m: CompanyRawMaterial, i: number) => (
          <div key={i} className="grid grid-cols-4 gap-2 border rounded-lg p-2 items-end">
            <Input placeholder="نام ماده" value={m.name} onChange={(e) => {
              const n = [...(form.rawMaterials || [])]; n[i] = { ...m, name: e.target.value }; setField('rawMaterials', n);
            }} />
            <Input placeholder="مصرف سالانه (تن)" type="number" value={m.annualConsumption ?? ''} dir="ltr" onChange={(e) => {
              const n = [...(form.rawMaterials || [])]; n[i] = { ...m, annualConsumption: Number(e.target.value) }; setField('rawMaterials', n);
            }} />
            <label className="flex items-center gap-2 text-sm pb-2">
              <input type="checkbox" checked={m.isHazardous ?? false} onChange={(e) => {
                const n = [...(form.rawMaterials || [])]; n[i] = { ...m, isHazardous: e.target.checked }; setField('rawMaterials', n);
              }} />
              خطرناک
            </label>
            <Button variant="destructive" size="sm" onClick={() => {
              const n = [...(form.rawMaterials || [])]; n.splice(i, 1); setField('rawMaterials', n);
            }}>حذف</Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() =>
          setField('rawMaterials', [...(form.rawMaterials || []), { name: '', annualConsumption: 0, isHazardous: false } as CompanyRawMaterial])}>
          + افزودن ماده اولیه
        </Button>
      </div>
    </div>
  );

  /* ---------------- Step 4: Financial ---------------- */
  const renderFinancial = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <F label="سرمایه ثبتی (ریال) *" error={errors.registeredCapital}>
        <Input type="number" dir="ltr" value={form.financials?.registeredCapital ?? ''}
          onChange={(e) => setField('financials', { ...(form.financials as any), registeredCapital: Number(e.target.value) })} />
      </F>
      <F label="شماره شبا (IR + ۲۴ رقم)" error={errors.shaba}>
        <Input dir="ltr" maxLength={26} value={form.financials?.shaba ?? ''} placeholder="IR…"
          onChange={(e) => setField('financials', { ...(form.financials as any), shaba: e.target.value.toUpperCase() })} />
      </F>
      <F label="کد اقتصادی">
        <Input dir="ltr" value={form.financials?.taxCode ?? ''}
          onChange={(e) => setField('financials', { ...(form.financials as any), taxCode: e.target.value })} />
      </F>
      <F label="ماه پایان سال مالی">
        <select className="w-full border rounded-md px-3 py-2 text-sm"
          value={form.financials?.fiscalYearEndMonth ?? 12}
          onChange={(e) => setField('financials', { ...(form.financials as any), fiscalYearEndMonth: Number(e.target.value) })}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>ماه {m}</option>)}
        </select>
      </F>
    </div>
  );

  /* ---------------- Step 5: HSE ---------------- */
  const renderHSE = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <F label="سطح خطر">
        <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.hse?.hazardLevel ?? 'low'}
          onChange={(e) => setField('hse', { ...(form.hse as any), hazardLevel: e.target.value })}>
          <option value="low">کم</option>
          <option value="medium">متوسط</option>
          <option value="high">زیاد</option>
        </select>
      </F>
      <F label="تعداد پرسنل HSE">
        <Input type="number" dir="ltr" value={(form.hse as any)?.hseStaffCount ?? 0}
          onChange={(e) => setField('hse', { ...(form.hse as any), hseStaffCount: Number(e.target.value) })} />
      </F>
      {([
        ['hasEnvironmentalPermit', 'پروانه محیط‌زیست'],
        ['hasFireSafetyCert', 'گواهی آتش‌نشانی'],
        ['hasWasteManagementPlan', 'طرح مدیریت پسماند'],
        ['hasEmergencyPlan', 'طرح اضطراری'],
      ] as const).map(([k, label]) => (
        <label key={k} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={(form.hse as any)?.[k] ?? false}
            onChange={(e) => setField('hse', { ...(form.hse as any), [k]: e.target.checked })} />
          {label}
        </label>
      ))}
    </div>
  );

  /* ---------------- Step 6: Documents ---------------- */
  const DOC_TYPES: [string, string][] = [
    ['registration', 'آگهی ثبتی'], ['license', 'پروانه بهره‌برداری'],
    ['environmental', 'مجوز محیط‌زیست'], ['fire', 'گواهی آتش‌نشانی'], ['other', 'سایر'],
  ];

  const renderDocuments = () => (
    <div className="space-y-3">
      {(form.documents || []).map((d: CompanyDocument, i: number) => (
        <div key={i} className="grid grid-cols-5 gap-2 border rounded-lg p-2">
          <select className="border rounded-md px-2 py-2 text-sm" value={d.type}
            onChange={(e) => {
              const n = [...(form.documents || [])]; n[i] = { ...d, type: e.target.value as any }; setField('documents', n);
            }}>
            {DOC_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <Input placeholder="عنوان" value={d.title} onChange={(e) => {
            const n = [...(form.documents || [])]; n[i] = { ...d, title: e.target.value }; setField('documents', n);
          }} />
          <Input placeholder="شماره سند" value={d.documentNumber ?? ''} onChange={(e) => {
            const n = [...(form.documents || [])]; n[i] = { ...d, documentNumber: e.target.value }; setField('documents', n);
          }} />
          <Input type="date" value={d.expiryDate ?? ''} onChange={(e) => {
            const n = [...(form.documents || [])]; n[i] = { ...d, expiryDate: e.target.value }; setField('documents', n);
          }} />
          <Button variant="destructive" size="sm" onClick={() => {
            const n = [...(form.documents || [])]; n.splice(i, 1); setField('documents', n);
          }}>حذف</Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() =>
        setField('documents', [...(form.documents || []), {
          id: crypto.randomUUID(), type: 'license', title: '', documentNumber: '',
          issueDate: new Date().toISOString().slice(0, 10), expiryDate: '',
        } as CompanyDocument])}>
        + افزودن مدرک
      </Button>
      <p className="text-xs text-slate-500">مدارک بدون تاریخ انقضا «دائمی» و مدارک با انقضای نزدیک‌تر از ۳۰ روز «رو به اتمام» محاسبه می‌شوند.</p>
    </div>
  );

  /* ---------------- Step 7: Review ---------------- */
  const renderReview = () => {
    const zone = form.zoneId ? getParkById(form.zoneId) : null;
    const rows: [string, string][] = [
      ['منطقه صنعتی', zone ? `${zone.name} (${zone.code})` : '—'],
      ['نام شرکت', form.name || '—'],
      ['شناسه ملی', form.nationalId || '—'],
      ['کد آیسیک', form.isicCode || '—'],
      ['صنعت', form.industry || '—'],
      ['موقعیت', `${form.province || '—'}، ${form.city || '—'}`],
      ['تلفن', form.phone || '—'],
      ['محصولات', String((form.products || []).length)],
      ['مواد اولیه', String((form.rawMaterials || []).length)],
      ['مدارک', String((form.documents || []).length)],
      ['وضعیت اولیه', 'در انتظار تأیید مدیر منطقه'],
    ];
    return (
      <div className="space-y-4">
        <h4 className="font-bold text-slate-800">مرور نهایی اطلاعات شرکت</h4>
        <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 rounded-lg p-4">
          {rows.map(([k, v]) => (
            <div key={k}>{k}: <b>{v}</b></div>
          ))}
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          ⚠️ پس از ثبت، شرکت در وضعیت <b>PENDING_ZONE_APPROVAL</b> قرار می‌گیرد و پس از تأیید مدیر منطقه به <b>PENDING_NATIONAL_APPROVAL</b> ارتقا می‌یابد.
        </div>
      </div>
    );
  };

  const stepBodies = [
    renderZoneStep, renderIdentity, renderContact, renderActivity,
    renderFinancial, renderHSE, renderDocuments, renderReview,
  ];

  return (
    <WizardShell
      title="ثبت شرکت جدید"
      subtitle="ثبت شرکت در سطح ملی — اتصال اجباری به منطقه صنعتی"
      steps={STEPS}
      activeStep={step}
      onStepClick={setStep}
      onBack={back}
      onNext={next}
      onSubmit={submit}
      isLastStep={step === STEPS.length - 1}
      submitting={submitting}
      submitLabel="ثبت نهایی شرکت"
    >
      {stepBodies[step]()}
    </WizardShell>
  );
}

