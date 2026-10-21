import { useState } from 'react';
import { toast } from 'sonner';
import { useProcurementStore } from '../../store/useProcurementStore';
import { useFinanceStore } from '@/modules/finance';
import { VendorScoreCard } from '../../components';
import { VENDOR_STATUS_CONFIG, VENDOR_CATEGORY_CONFIG, PAYMENT_TERMS_CONFIG, DOCUMENT_TYPE_CONFIG } from '../../constants';
import { getDaysUntilExpiry } from '../../utils';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plus, Search, Grid3X3, List, X, Check, RefreshCw, AlertTriangle } from 'lucide-react';
import type { VendorCategory, PaymentTerms, VendorContact } from '../../types';

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

export default function VendorMaster() {
  const { vendors, purchaseOrders, contracts, createVendor, updateVendorScore } = useProcurementStore();
  const { accounts } = useFinanceStore();
  const [subTab, setSubTab] = useState<'list' | 'evaluation' | 'documents'>('list');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'documents' | 'orders' | 'evaluation' | 'contracts'>('info');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    nameFa: '', nameEn: '', taxId: '', category: 'raw_material' as VendorCategory, address: '', city: '', province: '', phone: '', website: '',
    paymentTerms: 'net30' as PaymentTerms, creditLimit: '', bankName: '', bankAccount: '', glAccountId: '',
    contacts: [{ name: '', title: '', phone: '', mobile: '', email: '', isPrimary: true }] as Omit<VendorContact, 'id'>[],
  });

  const filtered = vendors.filter((v) => {
    if (categoryFilter && v.category !== categoryFilter) return false;
    if (statusFilter && v.status !== statusFilter) return false;
    if (search) return v.nameFa.includes(search) || v.vendorCode.includes(search) || v.city.includes(search);
    return true;
  });

  const detailVendor = vendors.find((v) => v.id === detailId);
  const detailPOs = purchaseOrders.filter((po) => po.vendorId === detailId);
  const detailContracts = contracts.filter((c) => c.vendorId === detailId);
  const apAccounts = accounts.filter((a) => a.type === 'liability');

  const submitVendor = () => {
    if (!form.nameFa.trim() || !form.taxId.trim()) { toast.error('نام و شناسه مالیاتی الزامی است'); return; }
    createVendor({
      nameFa: form.nameFa, nameEn: form.nameEn, taxId: form.taxId, category: form.category, address: form.address, city: form.city,
      province: form.province, phone: form.phone, website: form.website, paymentTerms: form.paymentTerms, creditLimit: Number(form.creditLimit || 0),
      bankName: form.bankName, bankAccount: form.bankAccount, glAccountId: form.glAccountId || undefined,
      contacts: form.contacts.filter((c) => c.name).map((c) => ({ ...c, id: `vc-${Date.now()}-${Math.random()}` })),
    });
    toast.success('تأمین‌کننده جدید ثبت شد — در انتظار تأیید');
    setWizardOpen(false);
    setStep(1);
    setForm({ nameFa: '', nameEn: '', taxId: '', category: 'raw_material', address: '', city: '', province: '', phone: '', website: '', paymentTerms: 'net30', creditLimit: '', bankName: '', bankAccount: '', glAccountId: '', contacts: [{ name: '', title: '', phone: '', mobile: '', email: '', isPrimary: true }] });
  };

  const activeVendorsForEval = vendors.filter((v) => v.status === 'active').sort((a, b) => b.overallScore - a.overallScore);
  const evalChartData = activeVendorsForEval.map((v) => ({ name: v.nameFa, score: v.overallScore }));

  const expiringDocs = vendors.flatMap((v) => v.documents.filter((d) => d.expiryDate).map((d) => ({ ...d, vendorName: v.nameFa, days: getDaysUntilExpiry(d.expiryDate!) }))).filter((d) => d.days <= 60).sort((a, b) => a.days - b.days);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => setWizardOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90"><Plus className="w-3.5 h-3.5" />تأمین‌کننده جدید</button>
        <h1 className="text-lg font-bold text-foreground">تأمین‌کنندگان</h1>
      </div>

      <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 w-fit">
        {([{ id: 'list', label: 'لیست تأمین‌کنندگان' }, { id: 'evaluation', label: 'ارزیابی عملکرد' }, { id: 'documents', label: `مدارک${expiringDocs.length ? ` (${expiringDocs.length})` : ''}` }] as const).map((t) => (
          <button key={t.id} onClick={() => setSubTab(t.id)} className={`px-3.5 py-1.5 rounded-md text-xs font-medium ${subTab === t.id ? 'bg-primary text-white' : 'text-muted-foreground'}`}>{t.label}</button>
        ))}
      </div>

      {subTab === 'list' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو..." className="w-full pr-9 pl-3 py-2 rounded-lg border border-border bg-background text-xs" dir="rtl" />
            </div>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-background text-xs">
              <option value="">همه دسته‌بندی‌ها</option>
              {Object.entries(VENDOR_CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.fa}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-background text-xs">
              <option value="">همه وضعیت‌ها</option>
              {Object.entries(VENDOR_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.fa}</option>)}
            </select>
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'bg-accent text-white' : 'bg-background text-muted-foreground'}`}><Grid3X3 className="w-4 h-4" /></button>
              <button onClick={() => setViewMode('table')} className={`p-2 ${viewMode === 'table' ? 'bg-accent text-white' : 'bg-background text-muted-foreground'}`}><List className="w-4 h-4" /></button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((v) => <VendorScoreCard key={v.id} vendor={v} onClick={() => { setDetailId(v.id); setDetailTab('info'); }} />)}
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-border bg-secondary/30">{['عملیات', 'آخرین سفارش', 'مانده', 'حد اعتبار', 'امتیاز', 'وضعیت', 'شهر', 'دسته‌بندی', 'نام', 'شماره'].map((h) => <th key={h} className="text-right py-2.5 px-3 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
                <tbody>
                  {filtered.map((v) => {
                    const cfg = VENDOR_STATUS_CONFIG[v.status];
                    const lastPO = purchaseOrders.filter((po) => po.vendorId === v.id).sort((a, b) => b.orderDate.localeCompare(a.orderDate))[0];
                    return (
                      <tr key={v.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 cursor-pointer" onClick={() => { setDetailId(v.id); setDetailTab('info'); }}>
                        <td className="py-2.5 px-3 text-[10px] text-accent">مشاهده</td>
                        <td className="py-2.5 px-3 text-[10px] text-muted-foreground" dir="ltr">{lastPO?.orderDate ?? '—'}</td>
                        <td className="py-2.5 px-3 text-[10px] font-mono text-foreground" dir="ltr">{v.currentBalance.toLocaleString('fa-IR')}</td>
                        <td className="py-2.5 px-3 text-[10px] font-mono text-foreground" dir="ltr">{v.creditLimit.toLocaleString('fa-IR')}</td>
                        <td className="py-2.5 px-3 text-xs font-bold text-foreground" dir="ltr">{v.overallScore}</td>
                        <td className="py-2.5 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color} ${cfg.bg}`}>{cfg.fa}</span></td>
                        <td className="py-2.5 px-3 text-[10px] text-muted-foreground">{v.city}</td>
                        <td className="py-2.5 px-3 text-[10px] text-muted-foreground">{VENDOR_CATEGORY_CONFIG[v.category].fa}</td>
                        <td className="py-2.5 px-3 text-xs font-semibold text-foreground">{v.nameFa}</td>
                        <td className="py-2.5 px-3 text-[10px] font-mono text-primary" dir="ltr">{v.vendorCode}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {subTab === 'evaluation' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { vendors.forEach((v) => updateVendorScore(v.id)); toast.success('امتیازها بروزرسانی شد'); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90"><RefreshCw className="w-3.5 h-3.5" />بروزرسانی امتیاز</button>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-xs font-bold text-foreground mb-3">مقایسه امتیاز تأمین‌کنندگان فعال</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={evalChartData}>
                <XAxis dataKey="name" tick={{ fontSize: 9 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 10 }} /><Tooltip />
                <Bar dataKey="score" fill="#0E7C86" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-border bg-secondary/30">{['رتبه‌بندی', 'امتیاز کل', 'انطباق قیمت', 'کیفیت', 'تحویل به‌موقع', 'تأمین‌کننده', 'رتبه'].map((h) => <th key={h} className="text-right py-2.5 px-3 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {activeVendorsForEval.map((v, i) => {
                  const latest = v.performanceHistory[v.performanceHistory.length - 1];
                  return (
                    <tr key={v.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${v.overallScore >= 80 ? 'bg-emerald-50 text-emerald-700' : v.overallScore >= 60 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{v.overallScore >= 80 ? 'عالی' : v.overallScore >= 60 ? 'متوسط' : 'نیاز به بررسی'}</span></td>
                      <td className="py-2.5 px-3 text-xs font-bold text-foreground" dir="ltr">{v.overallScore}</td>
                      <td className="py-2.5 px-3 text-xs font-mono text-muted-foreground" dir="ltr">{latest?.priceComplianceRate ?? '—'}٪</td>
                      <td className="py-2.5 px-3 text-xs font-mono text-muted-foreground" dir="ltr">{latest?.qualityAcceptanceRate ?? '—'}٪</td>
                      <td className="py-2.5 px-3 text-xs font-mono text-muted-foreground" dir="ltr">{latest?.onTimeDeliveryRate ?? '—'}٪</td>
                      <td className="py-2.5 px-3 text-xs font-semibold text-foreground">{v.nameFa}</td>
                      <td className="py-2.5 px-3 text-xs font-mono text-foreground" dir="ltr">#{i + 1}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'documents' && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-border bg-secondary/30">{['عملیات', 'وضعیت', 'تاریخ انقضا', 'نوع مدرک', 'تأمین‌کننده'].map((h) => <th key={h} className="text-right py-2.5 px-3 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
            <tbody>
              {expiringDocs.map((d) => (
                <tr key={d.id} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 px-3 text-[10px] text-accent">مشاهده تأمین‌کننده</td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 w-fit ${d.days < 0 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                      <AlertTriangle className="w-3 h-3" />{d.days < 0 ? 'منقضی‌شده' : `${d.days} روز مانده`}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[10px] text-muted-foreground" dir="ltr">{d.expiryDate}</td>
                  <td className="py-2.5 px-3 text-[10px] text-foreground">{DOCUMENT_TYPE_CONFIG[d.type]?.fa}</td>
                  <td className="py-2.5 px-3 text-xs font-semibold text-foreground">{d.vendorName}</td>
                </tr>
              ))}
              {expiringDocs.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-sm text-muted-foreground">مدرکی نزدیک به انقضا نیست</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Vendor detail drawer */}
      {detailVendor && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setDetailId(null)} />
          <div className="fixed top-0 left-0 bottom-0 w-[28rem] bg-card border-l border-border z-50 overflow-y-auto p-5" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setDetailId(null)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">{detailVendor.nameFa}</p>
            </div>
            <div className="flex items-center gap-1 bg-secondary/30 rounded-lg p-1 mb-4 flex-wrap">
              {([{ id: 'info', label: 'اطلاعات' }, { id: 'documents', label: 'مدارک' }, { id: 'orders', label: 'تاریخچه سفارش' }, { id: 'evaluation', label: 'ارزیابی' }, { id: 'contracts', label: 'قراردادها' }] as const).map((t) => (
                <button key={t.id} onClick={() => setDetailTab(t.id)} className={`px-2.5 py-1 rounded-md text-[10px] font-medium ${detailTab === t.id ? 'bg-primary text-white' : 'text-muted-foreground'}`}>{t.label}</button>
              ))}
            </div>

            {detailTab === 'info' && (
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-secondary/30 rounded-lg p-2"><p className="text-muted-foreground">شناسه مالیاتی</p><p className="font-semibold text-foreground" dir="ltr">{detailVendor.taxId}</p></div>
                  <div className="bg-secondary/30 rounded-lg p-2"><p className="text-muted-foreground">شرایط پرداخت</p><p className="font-semibold text-foreground">{PAYMENT_TERMS_CONFIG[detailVendor.paymentTerms].fa}</p></div>
                  <div className="bg-secondary/30 rounded-lg p-2"><p className="text-muted-foreground">آدرس</p><p className="font-semibold text-foreground">{detailVendor.address}</p></div>
                  <div className="bg-secondary/30 rounded-lg p-2"><p className="text-muted-foreground">بانک</p><p className="font-semibold text-foreground">{detailVendor.bankName}</p></div>
                </div>
                <p className="font-bold text-foreground mt-3">مخاطبین</p>
                {detailVendor.contacts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between border-b border-border/30 pb-1">
                    <span className="text-muted-foreground" dir="ltr">{c.mobile}</span>
                    <span className="text-foreground">{c.name} — {c.title}</span>
                  </div>
                ))}
              </div>
            )}

            {detailTab === 'documents' && (
              <div className="space-y-2">
                {detailVendor.documents.map((d) => {
                  const days = d.expiryDate ? getDaysUntilExpiry(d.expiryDate) : 999;
                  return (
                    <div key={d.id} className={`flex items-center justify-between p-2 rounded-lg text-xs ${days < 0 ? 'bg-red-50' : 'bg-secondary/30'}`}>
                      <span className={days < 0 ? 'text-red-700 font-semibold' : 'text-muted-foreground'} dir="ltr">{d.expiryDate ?? '—'}</span>
                      <span className="text-foreground">{DOCUMENT_TYPE_CONFIG[d.type]?.fa}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {detailTab === 'orders' && (
              <table className="w-full">
                <thead><tr className="border-b border-border">{['وضعیت', 'مبلغ', 'تاریخ', 'شماره PO'].map((h) => <th key={h} className="text-right py-1.5 px-1 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
                <tbody>
                  {detailPOs.map((po) => (
                    <tr key={po.id} className="border-b border-border/30 last:border-0">
                      <td className="py-1.5 px-1 text-[10px] text-muted-foreground">{po.status}</td>
                      <td className="py-1.5 px-1 text-[10px] font-mono" dir="ltr">{po.grandTotal.toLocaleString('fa-IR')}</td>
                      <td className="py-1.5 px-1 text-[10px] text-muted-foreground" dir="ltr">{po.orderDate}</td>
                      <td className="py-1.5 px-1 text-[10px] font-mono text-primary" dir="ltr">{po.poNumber}</td>
                    </tr>
                  ))}
                  {detailPOs.length === 0 && <tr><td colSpan={4} className="text-center py-4 text-[11px] text-muted-foreground">سفارشی ثبت نشده</td></tr>}
                </tbody>
              </table>
            )}

            {detailTab === 'evaluation' && (
              <div className="space-y-3">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={detailVendor.performanceHistory.map((m) => ({ period: m.period, تحویل: m.onTimeDeliveryRate, کیفیت: m.qualityAcceptanceRate, قیمت: m.priceComplianceRate }))}>
                    <XAxis dataKey="period" tick={{ fontSize: 9 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 9 }} /><Tooltip /><Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="تحویل" stroke="#0E7C86" strokeWidth={2} />
                    <Line type="monotone" dataKey="کیفیت" stroke="#d97706" strokeWidth={2} />
                    <Line type="monotone" dataKey="قیمت" stroke="#7c3aed" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {detailTab === 'contracts' && (
              <div className="space-y-2">
                {detailContracts.map((c) => (
                  <div key={c.id} className="p-2 rounded-lg bg-secondary/30 text-xs">
                    <p className="font-semibold text-foreground">{c.title}</p>
                    <p className="text-muted-foreground" dir="ltr">{c.startDate} → {c.endDate}</p>
                  </div>
                ))}
                {detailContracts.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-4">قراردادی ثبت نشده</p>}
              </div>
            )}
          </div>
        </>
      )}

      {/* Create vendor wizard */}
      {wizardOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setWizardOpen(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-[32rem] max-h-[85vh] overflow-y-auto" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setWizardOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">تأمین‌کننده جدید — گام {step} از ۵</p>
            </div>

            {step === 1 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={labelCls}>نام (فارسی)</label><input value={form.nameFa} onChange={(e) => setForm((f) => ({ ...f, nameFa: e.target.value }))} className={inputCls} dir="rtl" /></div>
                  <div><label className={labelCls}>نام (انگلیسی)</label><input value={form.nameEn} onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))} className={inputCls} dir="ltr" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={labelCls}>شناسه مالیاتی</label><input value={form.taxId} onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))} className={inputCls} dir="ltr" /></div>
                  <div>
                    <label className={labelCls}>دسته‌بندی</label>
                    <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as VendorCategory }))} className={inputCls} dir="rtl">
                      {Object.entries(VENDOR_CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.fa}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className={labelCls}>آدرس</label><input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className={inputCls} dir="rtl" /></div>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className={labelCls}>شهر</label><input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className={inputCls} dir="rtl" /></div>
                  <div><label className={labelCls}>استان</label><input value={form.province} onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))} className={inputCls} dir="rtl" /></div>
                  <div><label className={labelCls}>تلفن</label><input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputCls} dir="ltr" /></div>
                </div>
                <button onClick={() => setStep(2)} disabled={!form.nameFa.trim()} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-40 mt-1">مرحله بعد</button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>شرایط پرداخت</label>
                  <select value={form.paymentTerms} onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value as PaymentTerms }))} className={inputCls} dir="rtl">
                    {Object.entries(PAYMENT_TERMS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.fa}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>حد اعتبار</label><input type="number" value={form.creditLimit} onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))} className={inputCls} dir="ltr" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={labelCls}>نام بانک</label><input value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} className={inputCls} dir="rtl" /></div>
                  <div><label className={labelCls}>شماره حساب</label><input value={form.bankAccount} onChange={(e) => setForm((f) => ({ ...f, bankAccount: e.target.value }))} className={inputCls} dir="ltr" /></div>
                </div>
                <div>
                  <label className={labelCls}>حساب دفتر کل (پرداختنی)</label>
                  <select value={form.glAccountId} onChange={(e) => setForm((f) => ({ ...f, glAccountId: e.target.value }))} className={inputCls} dir="rtl">
                    <option value="">انتخاب نشده</option>
                    {apAccounts.map((a) => <option key={a.id} value={a.id}>{a.nameFa} ({a.code})</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStep(3)} className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90">مرحله بعد</button>
                  <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-secondary">بازگشت</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <button onClick={() => setForm((f) => ({ ...f, contacts: [...f.contacts, { name: '', title: '', phone: '', mobile: '', email: '', isPrimary: false }] }))} className="text-[10px] text-accent hover:underline">+ افزودن مخاطب</button>
                  <label className={labelCls}>مخاطبین</label>
                </div>
                {form.contacts.map((c, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-2 border-b border-border/30 pb-2">
                    <input placeholder="نام" value={c.name} onChange={(e) => setForm((f) => ({ ...f, contacts: f.contacts.map((x, i) => i === idx ? { ...x, name: e.target.value } : x) }))} className={inputCls} dir="rtl" />
                    <input placeholder="سمت" value={c.title} onChange={(e) => setForm((f) => ({ ...f, contacts: f.contacts.map((x, i) => i === idx ? { ...x, title: e.target.value } : x) }))} className={inputCls} dir="rtl" />
                    <input placeholder="موبایل" value={c.mobile} onChange={(e) => setForm((f) => ({ ...f, contacts: f.contacts.map((x, i) => i === idx ? { ...x, mobile: e.target.value } : x) }))} className={inputCls} dir="ltr" />
                    <input placeholder="ایمیل" value={c.email} onChange={(e) => setForm((f) => ({ ...f, contacts: f.contacts.map((x, i) => i === idx ? { ...x, email: e.target.value } : x) }))} className={inputCls} dir="ltr" />
                  </div>
                ))}
                <div className="flex gap-2">
                  <button onClick={() => setStep(4)} className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90">مرحله بعد</button>
                  <button onClick={() => setStep(2)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-secondary">بازگشت</button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">آپلود مدارک (اختیاری — می‌توانید بعداً تکمیل کنید)</p>
                {Object.entries(DOCUMENT_TYPE_CONFIG).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 text-xs">
                    <button className="text-[10px] text-accent hover:underline">آپلود</button>
                    <span className="text-foreground">{v.fa}</span>
                  </div>
                ))}
                <div className="flex gap-2">
                  <button onClick={() => setStep(5)} className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90">مرحله بعد</button>
                  <button onClick={() => setStep(3)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-secondary">بازگشت</button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-3">
                <div className="bg-secondary/30 rounded-lg p-3 space-y-1 text-xs">
                  <p><span className="text-muted-foreground">نام: </span><span className="text-foreground font-semibold">{form.nameFa}</span></p>
                  <p><span className="text-muted-foreground">دسته‌بندی: </span><span className="text-foreground">{VENDOR_CATEGORY_CONFIG[form.category].fa}</span></p>
                  <p><span className="text-muted-foreground">شرایط پرداخت: </span><span className="text-foreground">{PAYMENT_TERMS_CONFIG[form.paymentTerms].fa}</span></p>
                  <p><span className="text-muted-foreground">مخاطبین: </span><span className="text-foreground">{form.contacts.filter((c) => c.name).length} نفر</span></p>
                </div>
                <div className="flex gap-2">
                  <button onClick={submitVendor} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500"><Check className="w-4 h-4" />ثبت تأمین‌کننده</button>
                  <button onClick={() => setStep(4)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-secondary">بازگشت</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
