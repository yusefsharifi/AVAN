import { useState } from "react";
import { AlertTriangle, Shield, Calendar, Users, Clock, CheckCircle2, XCircle, FileText } from "lucide-react";
import { Badge } from "@/shared/components/feedback";
import { SEVERITY_CFG } from "@/shared/constants/status";
import { HSE_INCIDENTS, HSE_COMPLIANCE_CALENDAR, EMERGENCY_PLANS } from "@/entities/document";

type HSETabId = "incidents" | "compliance" | "emergency";

const TYPE_CFG: Record<string, { fa: string; bg: string; text: string }> = {
  security: { fa: "امنیتی", bg: "bg-blue-50", text: "text-blue-700" },
  hse: { fa: "ایمنی", bg: "bg-amber-50", text: "text-amber-700" },
  fire: { fa: "حریق", bg: "bg-red-50", text: "text-red-700" },
  medical: { fa: "پزشکی", bg: "bg-emerald-50", text: "text-emerald-700" },
  theft: { fa: "سرقت", bg: "bg-purple-50", text: "text-purple-700" },
  environmental: { fa: "محیط زیست", bg: "bg-teal-50", text: "text-teal-700" },
};

const STATUS_HSE: Record<string, { fa: string; bg: string; text: string }> = {
  logged: { fa: "ثبت‌شده", bg: "bg-secondary", text: "text-muted-foreground" },
  assigned: { fa: "ارجاع‌شده", bg: "bg-blue-50", text: "text-blue-700" },
  "in-progress": { fa: "در حال بررسی", bg: "bg-amber-50", text: "text-amber-700" },
  resolved: { fa: "حل‌شده", bg: "bg-emerald-50", text: "text-emerald-700" },
  closed: { fa: "بسته‌شده", bg: "bg-slate-100", text: "text-slate-600" },
};

const CAL_STATUS: Record<string, { fa: string; bg: string; text: string }> = {
  pending: { fa: "در انتظار", bg: "bg-amber-50", text: "text-amber-700" },
  scheduled: { fa: "برنامه‌ریزی‌شده", bg: "bg-blue-50", text: "text-blue-700" },
  overdue: { fa: "عقب‌افتاده", bg: "bg-red-50", text: "text-red-700" },
  completed: { fa: "انجام‌شده", bg: "bg-emerald-50", text: "text-emerald-700" },
};

const PLAN_STATUS: Record<string, { fa: string; bg: string; text: string }> = {
  active: { fa: "فعال", bg: "bg-emerald-50", text: "text-emerald-700" },
  review: { fa: "بازنگری", bg: "bg-amber-50", text: "text-amber-700" },
  inactive: { fa: "غیرفعال", bg: "bg-slate-100", text: "text-slate-600" },
};

const LEVEL_CFG: Record<string, { fa: string; color: string }> = {
  "بحرانی": { fa: "بحرانی", color: "text-red-700" },
  "زیاد": { fa: "زیاد", color: "text-amber-700" },
  "متوسط": { fa: "متوسط", color: "text-blue-700" },
  "کم": { fa: "کم", color: "text-slate-600" },
};

export const HSETab = () => {
  const [tab, setTab] = useState<HSETabId>("incidents");

  const criticalCount = HSE_INCIDENTS.filter((i) => i.severity === "critical" || i.severity === "high").length;
  const resolvedCount = HSE_INCIDENTS.filter((i) => i.status === "resolved" || i.status === "closed").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 w-fit mr-auto">
        {([
          { id: "incidents" as HSETabId, label: "حوادث", Icon: AlertTriangle },
          { id: "compliance" as HSETabId, label: "انطباق", Icon: Calendar },
          { id: "emergency" as HSETabId, label: "برنامه اضطراری", Icon: Shield },
        ]).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === t.id ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
            <t.Icon className="w-3.5 h-3.5" /><span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "incidents" && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center"><AlertTriangle className="w-4 h-4 text-red-600 mx-auto mb-2" /><p className="text-2xl font-bold text-foreground" dir="ltr">{HSE_INCIDENTS.length}</p><p className="text-[11px] text-muted-foreground mt-1">کل حوادث</p></div>
            <div className="bg-red-50 rounded-xl border border-red-200 shadow-sm p-4 text-center"><XCircle className="w-4 h-4 text-red-600 mx-auto mb-2" /><p className="text-2xl font-bold text-red-700" dir="ltr">{criticalCount}</p><p className="text-[11px] text-red-600 mt-1">بحرانی / بالا</p></div>
            <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto mb-2" /><p className="text-2xl font-bold text-foreground" dir="ltr">{resolvedCount}</p><p className="text-[11px] text-muted-foreground mt-1">حل‌شده / بسته‌شده</p></div>
            <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center"><Clock className="w-4 h-4 text-accent mx-auto mb-2" /><p className="text-2xl font-bold text-foreground" dir="ltr">۴.۲ س</p><p className="text-[11px] text-muted-foreground mt-1">میانگین زمان پاسخ</p></div>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm p-5">
            <h3 className="text-sm font-semibold text-foreground text-right mb-4">فهرست حوادث</h3>
            <table className="w-full">
              <thead><tr className="border-b border-border">{["تاریخ", "محل", "شدت", "نوع", "وضعیت", "مسئول", "شناسه"].map((h) => <th key={h} className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {HSE_INCIDENTS.map((inc) => {
                  const sv = SEVERITY_CFG[inc.severity] || { fa: inc.severity, bg: "bg-secondary", text: "text-muted-foreground" };
                  const tp = TYPE_CFG[inc.type] || { fa: inc.type, bg: "bg-secondary", text: "text-muted-foreground" };
                  const st = STATUS_HSE[inc.status] || { fa: inc.status, bg: "bg-secondary", text: "text-muted-foreground" };
                  return (
                    <tr key={inc.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/40 transition-colors">
                      <td className="py-3 px-3 text-xs text-muted-foreground">{inc.date} {inc.time}</td>
                      <td className="py-3 px-3 text-xs text-foreground text-right">{inc.location}</td>
                      <td className="py-3 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sv.bg} ${sv.text}`}>{sv.fa}</span></td>
                      <td className="py-3 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${tp.bg} ${tp.text}`}>{tp.fa}</span></td>
                      <td className="py-3 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.bg} ${st.text}`}>{st.fa}</span></td>
                      <td className="py-3 px-3 text-xs text-muted-foreground">{inc.assignedTo}</td>
                      <td className="py-3 px-3 text-xs font-semibold text-foreground font-mono" dir="ltr">{inc.id}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "compliance" && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <h3 className="text-sm font-semibold text-foreground text-right mb-4">تقویم انطباق قانونی</h3>
          <div className="space-y-2">
            {HSE_COMPLIANCE_CALENDAR.map((c) => {
              const cs = CAL_STATUS[c.status] || { fa: c.status, bg: "bg-secondary", text: "text-muted-foreground" };
              return (
                <div key={c.id} className="flex items-center justify-between border border-border rounded-lg p-3 hover:bg-secondary/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cs.bg} ${cs.text}`}>{cs.fa}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{c.type}</span>
                  </div>
                  <div className="text-right flex-1 mx-4">
                    <p className="text-xs font-semibold text-foreground">{c.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{c.zone}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> {c.dueDate}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "emergency" && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <h3 className="text-sm font-semibold text-foreground text-right mb-4">برنامه واکنش اضطراری</h3>
          <table className="w-full">
            <thead><tr className="border-b border-border">{["وضعیت", "مسئول", "تمرین بعدی", "آخرین تمرین", "سطح خطر", "نوع برنامه"].map((h) => <th key={h} className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">{h}</th>)}</tr></thead>
            <tbody>
              {EMERGENCY_PLANS.map((p) => {
                const ps = PLAN_STATUS[p.status] || { fa: p.status, bg: "bg-secondary", text: "text-muted-foreground" };
                const lv = LEVEL_CFG[p.level] || { fa: p.level, color: "text-muted-foreground" };
                return (
                  <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/40 transition-colors">
                    <td className="py-3 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ps.bg} ${ps.text}`}>{ps.fa}</span></td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">{p.responsible}</td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">{p.nextDrill}</td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">{p.lastDrill}</td>
                    <td className="py-3 px-3"><span className={`text-xs font-semibold ${lv.color}`}>{p.level}</span></td>
                    <td className="py-3 px-3 text-xs font-medium text-foreground text-right flex items-center gap-1.5 justify-end"><FileText className="w-3.5 h-3.5 text-muted-foreground" /> {p.name}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
