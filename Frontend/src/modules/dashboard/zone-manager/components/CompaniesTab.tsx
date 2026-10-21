import { useState } from "react";
import { Search, Plus, LayoutDashboard, Layers, Building2, MoreHorizontal, Eye, Bell, Globe, X, Edit2, Download, FileText, Zap, MessageSquare, Star } from "lucide-react";
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, Cell } from "recharts";
import { Badge } from "@/shared/components/feedback";
import { ACTIVITY_CFG, SEVERITY_CFG } from "@/shared/constants/status";
import { Company, FinanceTransaction, StatusKind } from "@/entities/document";
import { FINANCE_CATEGORIES, VEHICLES, TENANT_SCORES, LEASE_CONTRACTS, ENERGY_PER_COMPANY, COMMUNICATION_LOG } from "@/entities/document";
import CompanyHealthScore from './CompanyHealthScore';

type CompanyTabId = "overview" | "vehicles" | "workforce" | "permits" | "history" | "financial" | "scoring" | "health" | "marketplace" | "hse" | "leases" | "energy" | "communications";

interface CompaniesTabProps {
  companyView: "table" | "card"; setCompanyView: (v: "table" | "card") => void;
  companySearch: string; setCompanySearch: (s: string) => void;
  industryFilter: string; setIndustryFilter: (f: string) => void;
  activityFilter: string; setActivityFilter: (f: string) => void;
  zoneFilter: string; setZoneFilter: (f: string) => void;
  filteredCompanies: Company[]; selectedCompany: Company | null; setSelectedCompany: (c: Company | null) => void;
  companyTab: CompanyTabId; setCompanyTab: (t: CompanyTabId) => void;
  openRowMenu: string | null; setOpenRowMenu: (id: string | null) => void;
  industries: string[]; zoneSections: string[];
  companiesListState: Company[]; setCompaniesListState: React.Dispatch<React.SetStateAction<Company[]>>;
  newCompanyModalOpen: boolean; setNewCompanyModalOpen: (o: boolean) => void;
  newCompanyForm: { nameFa: string; sectorFa: string; zoneSection: string; unit: string; employees: string };
  setNewCompanyForm: React.Dispatch<React.SetStateAction<{ nameFa: string; sectorFa: string; zoneSection: string; unit: string; employees: string }>>;
  onOpenOnboarding: () => void;
  approvalsList: { id: string; company: string; label: string; time: string }[];
  setApprovalsList: React.Dispatch<React.SetStateAction<{ id: string; company: string; label: string; time: string }[]>>;
  companyPermitsList: { name: string; status: StatusKind }[];
  setCompanyPermitsList: React.Dispatch<React.SetStateAction<{ name: string; status: StatusKind }[]>>;
  financeTransactionsList: FinanceTransaction[];
  financeModalOpen: boolean; setFinanceModalOpen: (o: boolean) => void;
  financeForm: { type: "income" | "expense"; category: string; party: string; amount: string; date: string; status: "paid" | "pending" | "overdue" };
  setFinanceForm: React.Dispatch<React.SetStateAction<{ type: "income" | "expense"; category: string; party: string; amount: string; date: string; status: "paid" | "pending" | "overdue" }>>;
}

const DETAIL_TABS = [
  { id: "overview" as CompanyTabId, label: "نمای کلی" },
  { id: "workforce" as CompanyTabId, label: "ظرفیت انسانی" },
  { id: "vehicles" as CompanyTabId, label: "خودروها" },
  { id: "permits" as CompanyTabId, label: "مجوزها" },
  { id: "history" as CompanyTabId, label: "تاریخچه" },
  { id: "financial" as CompanyTabId, label: "مالی" },
  { id: "scoring" as CompanyTabId, label: "امتیازدهی" },
  { id: "health" as CompanyTabId, label: "سلامت شرکت" },
  { id: "marketplace" as CompanyTabId, label: "بازارگاه" },
  { id: "hse" as CompanyTabId, label: "HSE و انطباق" },
  { id: "leases" as CompanyTabId, label: "قراردادها" },
  { id: "energy" as CompanyTabId, label: "انرژی" },
  { id: "communications" as CompanyTabId, label: "ارتباطات" },
];

const CompanyDetail = ({ selectedCompany, companyTab, setCompanyTab, approvalsList, setApprovalsList, companyPermitsList, setCompanyPermitsList, financeTransactionsList, financeModalOpen, setFinanceModalOpen, financeForm, setFinanceForm, setSelectedCompany }: {
  selectedCompany: Company; companyTab: CompanyTabId; setCompanyTab: (t: CompanyTabId) => void;
  approvalsList: any[]; setApprovalsList: any;
  companyPermitsList: any[]; setCompanyPermitsList: any;
  financeTransactionsList: FinanceTransaction[];
  financeModalOpen: boolean; setFinanceModalOpen: (o: boolean) => void;
  financeForm: any; setFinanceForm: any; setSelectedCompany: (c: Company | null) => void;
}) => {
  const tenantScore = TENANT_SCORES.find((s) => s.companyId === selectedCompany.id);
  const companyLease = LEASE_CONTRACTS.find((l) => l.companyId === selectedCompany.id);
  const companyEnergy = ENERGY_PER_COMPANY.find((e) => e.name === selectedCompany.nameFa);
  const companyComms = COMMUNICATION_LOG.filter((c) => c.company === selectedCompany.nameFa);

  const scoreBar = (label: string, value: number) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground">{label}</span><span className="text-[11px] font-semibold text-foreground" dir="ltr">{value}</span></div>
      <div className="w-full h-2 bg-secondary rounded-full"><div className={`h-2 rounded-full ${value >= 85 ? "bg-emerald-500" : value >= 70 ? "bg-amber-400" : "bg-red-500"}`} style={{ width: `${value}%` }} /></div>
    </div>
  );

  return (
    <>
      <div className="absolute inset-0 bg-black/30 z-30" onClick={() => setSelectedCompany(null)} />
      <div className="absolute top-0 bottom-0 right-0 w-[450px] bg-card border-l border-border shadow-2xl z-40 flex flex-col" dir="rtl">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <button onClick={() => setSelectedCompany(null)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-bold text-foreground">{selectedCompany.nameFa}</p>
              <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">ثبت: {selectedCompany.regNo}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0"><Building2 className="w-5 h-5 text-muted-foreground" /></div>
          </div>
        </div>

        <div className="flex items-center gap-1 p-2 border-b border-border overflow-x-auto">
          {DETAIL_TABS.map((t) => (
            <button key={t.id} onClick={() => setCompanyTab(t.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${companyTab === t.id ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary"}`}>{t.label}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {companyTab === "overview" && (
            <>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-secondary/40 rounded-lg p-3 text-center"><p className="text-lg font-bold text-foreground" dir="ltr">{selectedCompany.employees}</p><p className="text-[10px] text-muted-foreground mt-0.5">کارمند</p></div>
                <div className="bg-secondary/40 rounded-lg p-3 text-center"><p className="text-lg font-bold text-foreground" dir="ltr">{selectedCompany.monthTraffic}</p><p className="text-[10px] text-muted-foreground mt-0.5">تردد این ماه</p></div>
                <div className="bg-secondary/40 rounded-lg p-3 text-center"><p className="text-lg font-bold text-foreground" dir="ltr">{selectedCompany.permits}</p><p className="text-[10px] text-muted-foreground mt-0.5">مجوز فعال</p></div>
              </div>
              <div><p className="text-xs font-semibold text-foreground mb-2 text-right">مشخصات</p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between"><span className="text-foreground">{selectedCompany.sectorFa}</span><span className="text-muted-foreground">صنعت</span></div>
                  <div className="flex items-center justify-between"><span className="text-foreground">{selectedCompany.unit}</span><span className="text-muted-foreground">واحد</span></div>
                </div></div>
              <div><p className="text-xs font-semibold text-foreground mb-2 text-right">تأییدهای در انتظار</p>
                <div className="space-y-2">
                  {approvalsList.filter((r) => r.company === selectedCompany.nameFa).map((r) => (
                    <div key={r.id} className="border border-border rounded-lg p-2.5">
                      <p className="text-xs text-foreground text-right mb-1">{r.label}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setApprovalsList((list) => list.filter((x) => x.id !== r.id))} className="text-[10px] px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100">تأیید</button>
                          <button onClick={() => setApprovalsList((list) => list.filter((x) => x.id !== r.id))} className="text-[10px] px-2 py-1 rounded-md bg-red-50 text-red-700 hover:bg-red-100">رد</button>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{r.time}</span>
                      </div>
                    </div>
                  ))}
                  {approvalsList.filter((r) => r.company === selectedCompany.nameFa).length === 0 && <p className="text-[11px] text-muted-foreground text-center py-3">موردی در انتظار تأیید نیست.</p>}
                </div></div>
            </>
          )}

          {companyTab === "workforce" && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded bg-teal-50 p-3 text-center"><p className="text-lg font-bold text-teal-700">{selectedCompany.employees.toLocaleString('fa-IR')}</p><p className="text-[10px] text-muted-foreground">کل کارکنان</p></div>
                <div className="rounded bg-blue-50 p-3 text-center"><p className="text-lg font-bold text-blue-700">{Math.round(selectedCompany.employees * 0.86).toLocaleString('fa-IR')}</p><p className="text-[10px] text-muted-foreground">فعال</p></div>
                <div className="rounded bg-amber-50 p-3 text-center"><p className="text-lg font-bold text-amber-700">{Math.round(selectedCompany.employees * 0.14).toLocaleString('fa-IR')}</p><p className="text-[10px] text-muted-foreground">پیمانکار/موقت</p></div>
              </div>
              <div className="rounded border p-3 text-xs text-muted-foreground">برای مشاهده جزئیات پرسنل، حقوق و دستمزد و قراردادهای کارکنان، مدیر شرکت از Portal منابع انسانی استفاده می‌کند.</div>
            </div>
          )}

          {companyTab === "vehicles" && (
            <div className="space-y-2">
              {VEHICLES.slice(0, 3).map((v, i) => (
                <div key={i} className="border border-border rounded-lg p-3 flex items-center justify-between">
                  <Badge status={v.status} />
                  <div className="text-right"><p className="text-xs font-semibold text-foreground font-mono" dir="ltr">{v.plate}</p><p className="text-[10px] text-muted-foreground">{v.driver} · {v.purposeFa}</p></div>
                </div>
              ))}
            </div>
          )}

          {companyTab === "permits" && (
            <div className="space-y-2">
              {companyPermitsList.map((p) => (
                <div key={p.name} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between"><Badge status={p.status} /><p className="text-xs text-foreground">{p.name}</p></div>
                  {p.status === "pending" && (
                    <div className="flex items-center gap-1.5 justify-end mt-2 pt-2 border-t border-border">
                      <button onClick={() => setCompanyPermitsList((list) => list.map((x) => x.name === p.name ? { ...x, status: "approved" as StatusKind } : x))} className="text-[10px] px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100">تأیید</button>
                      <button onClick={() => setCompanyPermitsList((list) => list.map((x) => x.name === p.name ? { ...x, status: "rejected" as StatusKind } : x))} className="text-[10px] px-2 py-1 rounded-md bg-red-50 text-red-700 hover:bg-red-100">رد</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {companyTab === "history" && (
            <div className="space-y-3">
              {[{ d: "امروز", e: "ورود ۴ کامیون مواد اولیه" }, { d: "دیروز", e: "ثبت درخواست جدید مجوز" }, { d: "۲ روز پیش", e: "بازرسی دوره‌ای HSE انجام شد" }, { d: "هفته گذشته", e: "تسویه صورتحساب خدمات شهرک" }].map((h, i) => (
                <div key={i} className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" /><div className="text-right flex-1"><p className="text-xs text-foreground">{h.e}</p><p className="text-[10px] text-muted-foreground">{h.d}</p></div></div>
              ))}
            </div>
          )}

          {companyTab === "financial" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-secondary/40 rounded-lg p-3 text-center"><p className="text-sm font-bold text-emerald-600" dir="ltr">{financeTransactionsList.filter((t) => t.party === selectedCompany.nameFa && t.status === "paid").reduce((s, t) => s + t.amount, 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground mt-0.5">مجموع پرداختی (تومان)</p></div>
                <div className="bg-secondary/40 rounded-lg p-3 text-center"><p className="text-sm font-bold text-red-600" dir="ltr">{financeTransactionsList.filter((t) => t.party === selectedCompany.nameFa && t.status !== "paid").reduce((s, t) => s + t.amount, 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground mt-0.5">بدهی معوق</p></div>
              </div>
              <button onClick={() => { setFinanceForm({ type: "income", category: FINANCE_CATEGORIES.income[0], party: selectedCompany.nameFa, amount: "", date: "", status: "pending" }); setFinanceModalOpen(true); }}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-accent/10 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors"><Plus className="w-3.5 h-3.5" /><span>ثبت تراکنش جدید</span></button>
              <div className="space-y-2">
                {financeTransactionsList.filter((t) => t.party === selectedCompany.nameFa).map((f) => (
                  <div key={f.id} className="border border-border rounded-lg p-2.5 flex items-center justify-between">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${f.status === "paid" ? "bg-emerald-50 text-emerald-700" : f.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{f.status === "paid" ? "پرداخت‌شده" : f.status === "pending" ? "در انتظار" : "معوق"}</span>
                    <div className="text-right"><p className={`text-xs font-semibold font-mono ${f.type === "income" ? "text-emerald-600" : "text-red-600"}`} dir="ltr">{f.type === "income" ? "+" : "-"}{f.amount.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">{f.category}</p></div>
                  </div>
                ))}
                {financeTransactionsList.filter((t) => t.party === selectedCompany.nameFa).length === 0 && <p className="text-[11px] text-muted-foreground text-center py-3">تراکنشی ثبت نشده است.</p>}
              </div>
            </div>
          )}

          {companyTab === "scoring" && (
            <div className="space-y-4">
              {tenantScore ? (
                <>
                  <div className="bg-secondary/40 rounded-xl p-4 text-center">
                    <div className="w-20 h-20 mx-auto rounded-full border-4 border-accent flex items-center justify-center mb-2">
                      <span className="text-2xl font-bold text-accent" dir="ltr">{tenantScore.total}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">امتیاز کل (از ۱۰۰)</p>
                  </div>
                  <div className="space-y-3">{scoreBar("پرداخت", tenantScore.payment)}{scoreBar("انطباق", tenantScore.compliance)}{scoreBar("ترافیک", tenantScore.traffic)}{scoreBar("تعامل", tenantScore.engagement)}</div>
                </>
              ) : <p className="text-[11px] text-muted-foreground text-center py-6">امتیازی ثبت نشده است.</p>}
            </div>
          )}

          {companyTab === "health" && (
            <CompanyHealthScore
              company={selectedCompany}
              financialScore={tenantScore?.payment ?? 70}
              complianceScore={tenantScore?.compliance ?? 70}
              operationalScore={tenantScore?.traffic ?? 75}
              energyScore={companyEnergy ? Math.max(45, 100 - Math.round(companyEnergy.kwh / 1000)) : 70}
              engagementScore={tenantScore?.engagement ?? 70}
            />
          )}

          {companyTab === "marketplace" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-lg bg-secondary/40 p-3 text-center"><p className="text-lg font-bold">{selectedCompany.monthTraffic.toLocaleString('fa-IR')}</p><p className="text-[10px] text-muted-foreground">شاخص تعامل B2B</p></div>
                <div className="rounded-lg bg-secondary/40 p-3 text-center"><p className="text-lg font-bold">{tenantScore?.engagement ?? '—'}</p><p className="text-[10px] text-muted-foreground">امتیاز پاسخگویی</p></div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">به‌دلیل محرمانگی بازارگاه، قیمت‌ها، پیشنهادها، نام طرف معامله و جزئیات RFQ در نمای مدیریت شهرک نمایش داده نمی‌شوند.</div>
            </div>
          )}

          {companyTab === "hse" && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded bg-emerald-50 p-3 text-center"><p className="text-lg font-bold text-emerald-700">{companyPermitsList.filter((permit) => permit.status === 'approved').length}</p><p className="text-[10px] text-muted-foreground">مجوز تأییدشده</p></div>
                <div className="rounded bg-amber-50 p-3 text-center"><p className="text-lg font-bold text-amber-700">{companyPermitsList.filter((permit) => permit.status === 'pending').length}</p><p className="text-[10px] text-muted-foreground">در انتظار بررسی</p></div>
                <div className="rounded bg-red-50 p-3 text-center"><p className="text-lg font-bold text-red-700">1</p><p className="text-[10px] text-muted-foreground">اقدام اصلاحی باز</p></div>
              </div>
              <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">اقدام پیشنهادی: بازبینی مجوز مواد شیمیایی و برنامه‌ریزی بازرسی دوره‌ای HSE.</div>
            </div>
          )}

          {companyTab === "leases" && (
            <div className="space-y-4">
              {companyLease ? (
                <>
                  <div className="bg-secondary/40 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">نوع قرارداد</span><span className="text-xs font-semibold text-foreground">{companyLease.contractType === "standard" ? "استاندارد" : companyLease.contractType === "preferred" ? "ترجیحی" : "موقت"}</span></div>
                    <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">متراژ</span><span className="text-xs font-semibold text-foreground" dir="ltr">{companyLease.areaSqM.toLocaleString()} m²</span></div>
                    <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">اجاره ماهانه</span><span className="text-xs font-semibold text-foreground" dir="ltr">{companyLease.monthlyRent.toLocaleString()} تومان</span></div>
                    <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">حق نگهداری</span><span className="text-xs font-semibold text-foreground" dir="ltr">{companyLease.monthlyMaintenanceFee.toLocaleString()} تومان</span></div>
                    <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">ودیعه</span><span className="text-xs font-semibold text-foreground" dir="ltr">{companyLease.depositAmount.toLocaleString()} تومان</span></div>
                    <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">ضريب تعدیل</span><span className="text-xs font-semibold text-foreground">{companyLease.escalationClause}</span></div>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">تاریخ شروع</span><span className="text-foreground">{companyLease.startDate}</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">تاریخ پایان</span><span className="text-foreground">{companyLease.endDate}</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">انقضای بیمه</span><span className="text-foreground">{companyLease.insuranceExpiry}</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">شماره کنتور</span><span className="text-foreground font-mono" dir="ltr">{companyLease.utilityMeterNo}</span></div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <span className="text-xs text-muted-foreground">وضعیت تمدید</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${companyLease.renewalStatus === "active" ? "bg-emerald-50 text-emerald-700" : companyLease.renewalStatus === "pending-renewal" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{companyLease.renewalStatus === "active" ? "فعال" : companyLease.renewalStatus === "pending-renewal" ? "در انتظار تمدید" : "منقضی"}</span>
                  </div>
                </>
              ) : <p className="text-[11px] text-muted-foreground text-center py-6">قراردادی ثبت نشده است.</p>}
            </div>
          )}

          {companyTab === "energy" && (
            <div className="space-y-4">
              {companyEnergy ? (
                <>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-secondary/40 rounded-lg p-3 text-center"><p className="text-lg font-bold text-foreground" dir="ltr">{companyEnergy.kwh.toLocaleString()}</p><p className="text-[10px] text-muted-foreground mt-0.5">مصرف برق (کیلووات)</p></div>
                    <div className="bg-secondary/40 rounded-lg p-3 text-center"><p className="text-lg font-bold text-foreground" dir="ltr">{companyEnergy.water.toLocaleString()}</p><p className="text-[10px] text-muted-foreground mt-0.5">مصرف آب (متر مکعب)</p></div>
                  </div>
                  <div className="bg-card rounded-xl border border-border p-4">
                    <h4 className="text-xs font-semibold text-foreground text-right mb-3">مقایسه با سایر شرکت‌ها</h4>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={ENERGY_PER_COMPANY.slice(0, 6)} layout="vertical">
                        <XAxis type="number" tick={{ fill: "#6B7A8D", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fill: "#6B7A8D", fontSize: 9 }} axisLine={false} tickLine={false} width={90} />
                        <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2EAF0", borderRadius: 8, fontSize: 11 }} />
                        <Bar dataKey="kwh" fill="#0E7C86" radius={[0, 3, 3, 0]} name="کیلووات" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : <p className="text-[11px] text-muted-foreground text-center py-6">داده انرژی ثبت نشده است.</p>}
            </div>
          )}

          {companyTab === "communications" && (
            <div className="space-y-2">
              {companyComms.length > 0 ? companyComms.map((c) => (
                <div key={c.id} className="border border-border rounded-lg p-2.5 flex items-start gap-2">
                  <div className={`p-1.5 rounded-lg flex-shrink-0 ${c.type === "ایمیل" ? "bg-blue-50" : c.type === "تماس تلفنی" ? "bg-emerald-50" : c.type === "پیامک" ? "bg-amber-50" : "bg-purple-50"}`}>
                    {c.type === "ایمیل" ? <Globe className="w-3.5 h-3.5 text-blue-600" /> : c.type === "تماس تلفنی" ? <Bell className="w-3.5 h-3.5 text-emerald-600" /> : c.type === "پیامک" ? <MessageSquare className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5 text-purple-600" />}
                  </div>
                  <div className="text-right flex-1 min-w-0">
                    <p className="text-xs text-foreground font-medium">{c.subject}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">{c.type} · {c.direction === "inbound" ? "ورودی" : "خروجی"}</span>
                      <span className="text-[10px] text-muted-foreground">{c.date}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${c.status === "completed" ? "bg-emerald-50 text-emerald-700" : c.status === "sent" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{c.status === "completed" ? "انجام شده" : c.status === "sent" ? "ارسال شده" : "در انتظار"}</span>
                </div>
              )) : <p className="text-[11px] text-muted-foreground text-center py-6">سابقه ارتباطی ثبت نشده است.</p>}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export const CompaniesTab = ({
  companyView, setCompanyView, companySearch, setCompanySearch,
  industryFilter, setIndustryFilter, activityFilter, setActivityFilter,
  zoneFilter, setZoneFilter, filteredCompanies, selectedCompany, setSelectedCompany,
  companyTab, setCompanyTab, openRowMenu, setOpenRowMenu, industries, zoneSections,
  companiesListState, setCompaniesListState, newCompanyModalOpen, setNewCompanyModalOpen,
  newCompanyForm, setNewCompanyForm, onOpenOnboarding, approvalsList, setApprovalsList,
  companyPermitsList, setCompanyPermitsList, financeTransactionsList,
  financeModalOpen, setFinanceModalOpen, financeForm, setFinanceForm,
}: CompaniesTabProps) => (
  <>
    <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4 flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-2">
        <button onClick={onOpenOnboarding} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors"><Plus className="w-3.5 h-3.5" /><span>افزودن شرکت جدید</span></button>
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
          <button onClick={() => setCompanyView("table")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${companyView === "table" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}><LayoutDashboard className="w-3.5 h-3.5" /><span>جدول</span></button>
          <button onClick={() => setCompanyView("card")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${companyView === "card" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}><Layers className="w-3.5 h-3.5" /><span>کارت</span></button>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} className="bg-secondary border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-accent"><option value="all">همه بخش‌ها</option>{zoneSections.map((z) => <option key={z} value={z}>{z}</option>)}</select>
        <select value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)} className="bg-secondary border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-accent"><option value="all">همه سطوح فعالیت</option><option value="high">فعالیت بالا</option><option value="medium">فعالیت متوسط</option><option value="low">فعالیت پایین</option></select>
        <select value={industryFilter} onChange={(e) => setIndustryFilter(e.target.value)} className="bg-secondary border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-accent"><option value="all">همه صنایع</option>{industries.map((i) => <option key={i} value={i}>{i}</option>)}</select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input dir="rtl" value={companySearch} onChange={(e) => setCompanySearch(e.target.value)} placeholder="جستجوی شرکت..." className="bg-secondary border border-border rounded-lg py-1.5 pr-3 pl-9 text-xs text-foreground focus:outline-none focus:border-accent w-44" />
        </div>
      </div>
    </div>

    {companyView === "table" ? (
      <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
        <table className="w-full">
          <thead><tr className="border-b border-border">{["عملیات", "وضعیت", "درخواست باز", "ترافیک", "خودرو", "بخش", "نام شرکت"].map((h) => (<th key={h} className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">{h}</th>))}</tr></thead>
          <tbody>
            {filteredCompanies.map((c) => (
              <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/40 transition-colors relative">
                <td className="py-3 px-3"><div className="relative"><button onClick={() => setOpenRowMenu(openRowMenu === c.id ? null : c.id)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><MoreHorizontal className="w-4 h-4" /></button>
                  {openRowMenu === c.id && (<div className="absolute top-8 right-0 z-20 bg-card border border-border rounded-lg shadow-lg w-48 py-1">
                    <button onClick={() => { setSelectedCompany(c); setCompanyTab("overview"); setOpenRowMenu(null); }} className="w-full text-right px-3 py-2 text-xs text-foreground hover:bg-secondary flex items-center gap-2 justify-end"><span>مشاهده جزئیات</span><Eye className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setOpenRowMenu(null)} className="w-full text-right px-3 py-2 text-xs text-foreground hover:bg-secondary flex items-center gap-2 justify-end"><span>ارسال اعلان</span><Bell className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setOpenRowMenu(null)} className="w-full text-right px-3 py-2 text-xs text-foreground hover:bg-secondary flex items-center gap-2 justify-end"><span>ورود به پرتال</span><Globe className="w-3.5 h-3.5" /></button>
                  </div>)}</div></td>
                <td className="py-3 px-3"><Badge status={c.status} /></td>
                <td className="py-3 px-3"><span className={`text-sm font-semibold ${c.openRequests > 3 ? "text-amber-600" : "text-foreground"}`} dir="ltr">{c.openRequests}</span></td>
                <td className="py-3 px-3 text-sm text-muted-foreground font-mono" dir="ltr">{c.monthTraffic.toLocaleString()}</td>
                <td className="py-3 px-3 text-sm text-muted-foreground font-mono" dir="ltr">{c.activeVehicles}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground">{c.zoneSection}</td>
                <td className="py-3 px-3"><p className="text-sm font-semibold text-foreground">{c.nameFa}</p><p className="text-[10px] text-muted-foreground">{c.sectorFa}</p></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">نمایش ۱–{filteredCompanies.length} از ۸۴۷ شرکت</p>
          <div className="flex items-center gap-1">{[1, 2, 3, "...", 47].map((p, i) => (<button key={i} className={`w-8 h-8 rounded-lg text-xs transition-colors ${p === 1 ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary"}`}>{p}</button>))}</div>
        </div>
      </div>
    ) : (
      <div className="grid grid-cols-4 gap-4">
        {filteredCompanies.map((c) => {
          const act = ACTIVITY_CFG[c.activityLevel]; const score = TENANT_SCORES.find((s) => s.companyId === c.id);
          return (
            <div key={c.id} className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Badge status={c.status} />
                {score && <div className="flex items-center gap-1 bg-secondary rounded-full px-2 py-0.5"><Star className="w-3 h-3 text-amber-500 fill-amber-500" /><span className="text-[10px] font-bold text-foreground" dir="ltr">{score.total}</span></div>}
              </div>
              <div className="text-right"><p className="text-sm font-semibold text-foreground">{c.nameFa}</p><p className="text-[10px] text-muted-foreground mt-0.5">{c.sectorFa} · {c.zoneSection}</p></div>
              <div className="flex items-center gap-1.5 justify-end"><span className="text-[10px] font-medium" style={{ color: act.color }}>{act.fa}</span><span className="w-1.5 h-1.5 rounded-full" style={{ background: act.color }} /></div>
              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-border">
                <div className="text-center"><p className="text-sm font-bold text-foreground" dir="ltr">{c.activeVehicles}</p><p className="text-[9px] text-muted-foreground">خودرو</p></div>
                <div className="text-center"><p className="text-sm font-bold text-foreground" dir="ltr">{c.monthTraffic}</p><p className="text-[9px] text-muted-foreground">ترافیک</p></div>
                <div className="text-center"><p className={`text-sm font-bold ${c.openRequests > 3 ? "text-amber-600" : "text-foreground"}`} dir="ltr">{c.openRequests}</p><p className="text-[9px] text-muted-foreground">درخواست</p></div>
              </div>
              <button onClick={() => { setSelectedCompany(c); setCompanyTab("overview"); }} className="w-full py-2 rounded-lg bg-accent/10 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors">مشاهده جزئیات</button>
            </div>
          );
        })}
      </div>
    )}

    {selectedCompany && <CompanyDetail selectedCompany={selectedCompany} companyTab={companyTab} setCompanyTab={setCompanyTab} approvalsList={approvalsList} setApprovalsList={setApprovalsList} companyPermitsList={companyPermitsList} setCompanyPermitsList={setCompanyPermitsList} financeTransactionsList={financeTransactionsList} financeModalOpen={financeModalOpen} setFinanceModalOpen={setFinanceModalOpen} financeForm={financeForm} setFinanceForm={setFinanceForm} setSelectedCompany={setSelectedCompany} />}

    {newCompanyModalOpen && (
      <>
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setNewCompanyModalOpen(false)} />
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl shadow-2xl p-5 w-96 z-50" dir="rtl">
          <div className="flex items-center justify-between mb-4"><button onClick={() => setNewCompanyModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button><p className="text-sm font-bold text-foreground">افزودن شرکت جدید</p></div>
          <div className="space-y-3">
            <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">نام شرکت</label><input dir="rtl" value={newCompanyForm.nameFa} onChange={(e) => setNewCompanyForm((f) => ({ ...f, nameFa: e.target.value }))} className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent" /></div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">صنعت</label><input dir="rtl" value={newCompanyForm.sectorFa} onChange={(e) => setNewCompanyForm((f) => ({ ...f, sectorFa: e.target.value }))} placeholder="پلاستیک، فلزکاری..." className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">بخش</label><select value={newCompanyForm.zoneSection} onChange={(e) => setNewCompanyForm((f) => ({ ...f, zoneSection: e.target.value }))} className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent">{["بلوک A", "بلوک B", "بلوک C", "بلوک D", "بلوک E", "بلوک F", "بلوک G", "بلوک H"].map((z) => <option key={z} value={z}>{z}</option>)}</select></div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">واحد</label><input dir="rtl" value={newCompanyForm.unit} onChange={(e) => setNewCompanyForm((f) => ({ ...f, unit: e.target.value }))} className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent" /></div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">تعداد کارمندان</label><input type="number" dir="ltr" value={newCompanyForm.employees} onChange={(e) => setNewCompanyForm((f) => ({ ...f, employees: e.target.value }))} className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent" /></div>
            <button disabled={!newCompanyForm.nameFa.trim()} onClick={() => {
              const newCo: Company = { id: `C${(companiesListState.length + 1).toString().padStart(3, "0")}`, nameFa: newCompanyForm.nameFa, sectorFa: newCompanyForm.sectorFa || "—", status: "pending", employees: Number(newCompanyForm.employees || 0), unit: `${newCompanyForm.zoneSection}، ${newCompanyForm.unit || "—"}`, zoneSection: newCompanyForm.zoneSection, activeVehicles: 0, monthTraffic: 0, openRequests: 0, activityLevel: "low", regNo: `${100000 + companiesListState.length}`, permits: 0 };
              setCompaniesListState((list) => [...list, newCo]); setNewCompanyForm({ nameFa: "", sectorFa: "", zoneSection: "بلوک A", unit: "", employees: "" }); setNewCompanyModalOpen(false);
            }} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-1">افزودن شرکت</button>
          </div>
        </div>
      </>
    )}
  </>
);
