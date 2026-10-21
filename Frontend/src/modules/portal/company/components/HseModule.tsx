import { useState } from "react";
import { Plus, AlertTriangle, Shield, Flame, HeartPulse, ShieldCheck, Beaker, HardHat, ClipboardCheck } from "lucide-react";
import { HSEIncident, HSE_INCIDENTS } from "@/entities/document";
import IncidentModal from "./modals/IncidentModal";

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

const SEVERITY_MAP: Record<HSEIncident["severity"], { label: string; bg: string; text: string }> = {
  low: { label: "کم", bg: "bg-slate-100", text: "text-slate-600" },
  medium: { label: "متوسط", bg: "bg-amber-50", text: "text-amber-700" },
  high: { label: "زیاد", bg: "bg-orange-50", text: "text-orange-700" },
  critical: { label: "بحرانی", bg: "bg-red-50", text: "text-red-700" },
};
const TYPE_MAP: Record<HSEIncident["type"], { label: string; Icon: React.ElementType }> = {
  security: { label: "امنیتی", Icon: Shield },
  hse: { label: "HSE", Icon: AlertTriangle },
  fire: { label: "آتش‌سوزی", Icon: Flame },
  medical: { label: "پزشکی", Icon: HeartPulse },
  theft: { label: "سرقت", Icon: ShieldCheck },
  environmental: { label: "محیط زیست", Icon: Beaker },
};
const STATUS_MAP: Record<HSEIncident["status"], { label: string; color: string }> = {
  logged: { label: "ثبت‌شده", color: "bg-slate-100 text-slate-600" },
  assigned: { label: "واگذار شده", color: "bg-blue-50 text-blue-700" },
  "in-progress": { label: "در حال بررسی", color: "bg-amber-50 text-amber-700" },
  resolved: { label: "حل‌شده", color: "bg-emerald-50 text-emerald-700" },
  closed: { label: "بسته‌شده", color: "bg-slate-100 text-slate-500" },
};

const CHEMICALS = [
  { name: "اسید سولفوریک", cas: "7664-93-9", hazard: "خورنده", storage: "D-01", quantity: "800 لیتر", expiry: "۱۴۰۴/۰۶/۳۰" },
  { name: "هیدروکسید سدیم", cas: "1310-73-2", hazard: "خورنده", storage: "D-02", quantity: "1500 kg", expiry: "۱۴۰۴/۱۲/۳۰" },
  { name: "تینر صنعتی", cas: "8052-41-7", hazard: "قابل اشتعال", storage: "D-03", quantity: "350 لیتر", expiry: "۱۴۰۴/۰۳/۱۵" },
  { name: "رنگ صنعتی مشکی", cas: "—", hazard: "سمی", storage: "B-01", quantity: "3500 kg", expiry: "۱۴۰۴/۰۹/۳۰" },
  { name: "گازوئیل صنعتی", cas: "68476-34-6", hazard: "قابل اشتعال", storage: "مخزن جداگانه", quantity: "5000 لیتر", expiry: "۱۴۰۴/۰۱/۱۵" },
];

const PPE_ITEMS = [
  { name: "کلاه ایمنی", stock: 120, issued: 85, minStock: 50 },
  { name: "دستکش کار", stock: 500, issued: 320, minStock: 100 },
  { name: "عینک ایمنی", stock: 80, issued: 60, minStock: 30 },
  { name: "کمربند ایمنی", stock: 40, issued: 25, minStock: 15 },
  { name: "جلیقه ایمنی", stock: 60, issued: 42, minStock: 20 },
  { name: "ماسک تنفسی", stock: 200, issued: 150, minStock: 80 },
  { name: "گوشی ایمنی", stock: 90, issued: 55, minStock: 30 },
  { name: "چکمه ایمنی", stock: 70, issued: 48, minStock: 25 },
];

const CHECKLISTS = [
  { id: "CL-001", title: "بازرسی ایمنی انبار مواد شیمیایی", frequency: "هفتگی", lastDone: "۱۴۰۳/۰۴/۱۳", nextDue: "۱۴۰۳/۰۴/۲۰", status: "done" as const },
  { id: "CL-002", title: "بازرسی سیستم اطفاء حریق", frequency: "ماهانه", lastDone: "۱۴۰۳/۰۳/۱۵", nextDue: "۱۴۰۳/۰۴/۱۵", status: "overdue" as const },
  { id: "CL-003", title: "بازرسی تجهیزات ایمنی شخصی", frequency: "هفتگی", lastDone: "۱۴۰۳/۰۴/۱۴", nextDue: "۱۴۰۳/۰۴/۲۱", status: "done" as const },
  { id: "CL-004", title: "تست سنسورهای گاز", frequency: "هفتگی", lastDone: "۱۴۰۳/۰۴/۱۲", nextDue: "۱۴۰۳/۰۴/۱۹", status: "due" as const },
  { id: "CL-005", title: "بازرسی کمربند ایمنی و طناب", frequency: "ماهانه", lastDone: "۱۴۰۳/۰۲/۱۰", nextDue: "۱۴۰۳/۰۳/۱۰", status: "overdue" as const },
  { id: "CL-006", title: "بازرسی کپسول آتش‌نشانی", frequency: "ماهانه", lastDone: "۱۴۰۳/۰۴/۰۱", nextDue: "۱۴۰۳/۰۵/۰۱", status: "done" as const },
];

const CL_STATUS = { done: { label: "انجام‌شده", color: "bg-emerald-50 text-emerald-700" }, overdue: { label: "عقب‌افتاده", color: "bg-red-50 text-red-700" }, due: { label: "نزدیک", color: "bg-amber-50 text-amber-700" } };

export default function HseModule() {
  const [tab, setTab] = useState<"dashboard" | "incidents" | "chemicals" | "ppe" | "checklists">("dashboard");
  const [incidentsList, setIncidentsList] = useState<HSEIncident[]>(HSE_INCIDENTS);
  const [modalOpen, setModalOpen] = useState(false);
  const [incidentForm, setIncidentForm] = useState({
    type: "hse" as HSEIncident["type"], severity: "medium" as HSEIncident["severity"],
    location: "", description: "", injuredCount: 0, immediateActions: "", reportedBy: "", assignedTo: "",
  });

  const lastIncident = incidentsList[0];
  const daysSinceLastIncident = 1; // Simplified
  const ltiCount = incidentsList.filter((i) => i.injuredCount > 0).length;
  const nearMissCount = incidentsList.filter((i) => i.injuredCount === 0 && i.severity !== "low").length;
  const openIncidents = incidentsList.filter((i) => i.status === "in-progress" || i.status === "logged" || i.status === "assigned").length;
  const criticalCount = incidentsList.filter((i) => i.severity === "critical" || i.severity === "high").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
          {([
            { id: "dashboard", label: "داشبورد" },
            { id: "incidents", label: " ثبت حوادث" },
            { id: "chemicals", label: "مواد شیمیایی" },
            { id: "ppe", label: "لوازم ایمنی" },
            { id: "checklists", label: "چک‌لیست‌ها" },
          ] as const).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === t.id ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <h1 className="text-sm font-semibold text-foreground">ایمنی، بهداشت و محیط زیست (HSE)</h1>
      </div>

      {/* Dashboard KPIs */}
      {tab === "dashboard" && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
              <div className="flex items-center justify-center mb-2"><ShieldCheck className="w-5 h-5 text-emerald-500" /></div>
              <p className="text-2xl font-bold text-emerald-600" dir="ltr">{daysSinceLastIncident}</p>
              <p className="text-xs text-muted-foreground mt-1">روز از آخرین حادثه</p>
            </div>
            <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
              <div className="flex items-center justify-center mb-2"><HeartPulse className="w-5 h-5 text-red-500" /></div>
              <p className="text-2xl font-bold text-red-600" dir="ltr">{ltiCount}</p>
              <p className="text-xs text-muted-foreground mt-1">تعداد LTI</p>
            </div>
            <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
              <div className="flex items-center justify-center mb-2"><AlertTriangle className="w-5 h-5 text-amber-500" /></div>
              <p className="text-2xl font-bold text-amber-600" dir="ltr">{nearMissCount}</p>
              <p className="text-xs text-muted-foreground mt-1">نزدیک به حادثه</p>
            </div>
            <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
              <div className="flex items-center justify-center mb-2"><Flame className="w-5 h-5 text-orange-500" /></div>
              <p className="text-2xl font-bold text-orange-600" dir="ltr">{openIncidents}</p>
              <p className="text-xs text-muted-foreground mt-1">حادثه باز</p>
            </div>
          </div>
          {/* Recent Incidents */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">آخرین حوادث</h3>
            <div className="space-y-2">
              {incidentsList.slice(0, 5).map((inc) => {
                const TypeCfg = TYPE_MAP[inc.type];
                const sev = SEVERITY_MAP[inc.severity];
                const st = STATUS_MAP[inc.status];
                return (
                  <div key={inc.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <TypeCfg.Icon className="w-4 h-4 text-muted-foreground" />
                      <div className="text-right">
                        <p className="text-xs font-semibold text-foreground">{inc.description}</p>
                        <p className="text-[10px] text-muted-foreground">{inc.location} · {inc.date} {inc.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sev.bg} ${sev.text}`}>{sev.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Incidents Tab */}
      {tab === "incidents" && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors">
              <Plus className="w-3.5 h-3.5" /><span>ثبت حادثه جدید</span>
            </button>
            <h3 className="text-sm font-semibold text-foreground">دفتر حوادث</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["وضعیت", "شدت", "مصدومین", "محل", "تاریخ", "نوع", "شناسه"].map((h) => (
                  <th key={h} className="text-right py-3 px-3 text-xs font-semibold text-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {incidentsList.map((inc) => {
                const TypeCfg = TYPE_MAP[inc.type];
                const sev = SEVERITY_MAP[inc.severity];
                const st = STATUS_MAP[inc.status];
                return (
                  <tr key={inc.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="py-3 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span></td>
                    <td className="py-3 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sev.bg} ${sev.text}`}>{sev.label}</span></td>
                    <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{inc.injuredCount}</td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">{inc.location}</td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">{inc.date} {inc.time}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <TypeCfg.Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{TypeCfg.label}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs font-mono text-primary" dir="ltr">{inc.id}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Chemicals Tab */}
      {tab === "chemicals" && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">فهرست مواد شیمیایی</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["انقضا", "موجودی", "خانه", "خطر", "شماره CAS", "نام"].map((h) => (
                  <th key={h} className="text-right py-3 px-4 text-xs font-semibold text-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CHEMICALS.map((c, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="py-3 px-4 text-xs text-muted-foreground">{c.expiry}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground font-mono" dir="ltr">{c.quantity}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground font-mono" dir="ltr">{c.storage}</td>
                  <td className="py-3 px-4"><span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700">{c.hazard}</span></td>
                  <td className="py-3 px-4 text-xs font-mono text-muted-foreground" dir="ltr">{c.cas}</td>
                  <td className="py-3 px-4 text-sm font-semibold text-foreground">{c.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PPE Tab */}
      {tab === "ppe" && (
        <div className="space-y-5">
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">موجودی لوازم ایمنی شخصی</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  {["وضعیت", "حداقل", "صادر شده", "موجودی", "نام"].map((h) => (
                    <th key={h} className="text-right py-3 px-4 text-xs font-semibold text-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PPE_ITEMS.map((ppe, i) => {
                  const isLow = ppe.stock - ppe.issued < ppe.minStock;
                  return (
                    <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                      <td className="py-3 px-4"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isLow ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{isLow ? "کمبود" : "کافی"}</span></td>
                      <td className="py-3 px-4 text-xs text-muted-foreground font-mono" dir="ltr">{ppe.minStock}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground font-mono" dir="ltr">{ppe.issued}</td>
                      <td className="py-3 px-4 text-xs font-semibold font-mono" dir="ltr">{ppe.stock}</td>
                      <td className="py-3 px-4 text-sm font-semibold text-foreground">{ppe.name}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Checklists Tab */}
      {tab === "checklists" && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">چک‌لیست‌های بازرسی ایمنی</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["عملیات", "وضعیت", "بازدید بعدی", "آخرین بازدید", "دوره", "عنوان", "شناسه"].map((h) => (
                  <th key={h} className="text-right py-3 px-3 text-xs font-semibold text-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CHECKLISTS.map((cl) => {
                const st = CL_STATUS[cl.status];
                return (
                  <tr key={cl.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="py-3 px-3">
                      <button className="text-[10px] px-2 py-0.5 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors">انجام بازدید</button>
                    </td>
                    <td className="py-3 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span></td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">{cl.nextDue}</td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">{cl.lastDone}</td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">{cl.frequency}</td>
                    <td className="py-3 px-3 text-sm font-semibold text-foreground">{cl.title}</td>
                    <td className="py-3 px-3 text-xs font-mono text-primary" dir="ltr">{cl.id}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <IncidentModal
          incidentForm={incidentForm}
          setIncidentForm={setIncidentForm}
          setIncidentsList={setIncidentsList}
          setModalOpen={setModalOpen}
        />
      )}
    </div>
  );
}
