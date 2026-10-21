import { useState } from "react";
import { Building2, Copy, RefreshCw, Plus, X } from "lucide-react";
import { Badge } from "@/shared/components/feedback";
import { StatusKind } from "@/entities/document";

interface SettingsTabProps {
  settingsTab: "general" | "notifications" | "users" | "integrations";
  setSettingsTab: (t: "general" | "notifications" | "users" | "integrations") => void;
  zoneStaffList: { name: string; role: string; email: string }[];
  setZoneStaffList: React.Dispatch<React.SetStateAction<{ name: string; role: string; email: string }[]>>;
  staffModalOpen: boolean;
  setStaffModalOpen: (o: boolean) => void;
  staffForm: { name: string; role: string; email: string };
  setStaffForm: React.Dispatch<React.SetStateAction<{ name: string; role: string; email: string }>>;
  notifPrefs: { securityAlerts: boolean; financeAlerts: boolean; deviceAlerts: boolean; weeklyReport: boolean; smsUrgent: boolean };
  setNotifPrefs: React.Dispatch<React.SetStateAction<{ securityAlerts: boolean; financeAlerts: boolean; deviceAlerts: boolean; weeklyReport: boolean; smsUrgent: boolean }>>;
}

export const SettingsTab = ({
  settingsTab, setSettingsTab, zoneStaffList, setZoneStaffList,
  staffModalOpen, setStaffModalOpen, staffForm, setStaffForm,
  notifPrefs, setNotifPrefs,
}: SettingsTabProps) => (
  <div className="space-y-5">
    <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 w-fit mr-auto">
      {[
        { id: "general", label: "عمومی" }, { id: "notifications", label: "اعلان‌ها" },
        { id: "users", label: "کاربران و دسترسی‌ها" }, { id: "integrations", label: "یکپارچه‌سازی" },
      ].map((t) => (
        <button key={t.id} onClick={() => setSettingsTab(t.id as any)} className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${settingsTab === t.id ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>{t.label}</button>
      ))}
    </div>

    {settingsTab === "general" && (
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 max-w-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0"><Building2 className="w-7 h-7 text-muted-foreground" /></div>
          <button className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors">تغییر لوگو شهرک</button>
        </div>
        <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">نام شهرک صنعتی</label>
          <input dir="rtl" defaultValue="شهرک صنعتی کاوه" className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-sm text-foreground focus:outline-none focus:border-accent" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">استان</label>
            <input dir="rtl" defaultValue="مرکزی" className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-sm text-foreground focus:outline-none focus:border-accent" /></div>
          <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">شهر</label>
            <input dir="rtl" defaultValue="ساوه" className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-sm text-foreground focus:outline-none focus:border-accent" /></div>
        </div>
        <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">آدرس کامل</label>
          <textarea dir="rtl" rows={2} defaultValue="استان مرکزی، ساوه، کیلومتر ۸ جاده ساوه–تهران، شهرک صنعتی کاوه" className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-sm text-foreground focus:outline-none focus:border-accent" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">ساعت شروع فعالیت</label>
            <input type="time" dir="ltr" defaultValue="06:00" className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-sm text-foreground focus:outline-none focus:border-accent" /></div>
          <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">ساعت پایان فعالیت</label>
            <input type="time" dir="ltr" defaultValue="22:00" className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-sm text-foreground focus:outline-none focus:border-accent" /></div>
        </div>
        <button className="px-5 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors">ذخیره تغییرات</button>
      </div>
    )}

    {settingsTab === "notifications" && (
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 max-w-2xl space-y-1.5">
        {[
          { key: "securityAlerts", label: "هشدارهای امنیتی (ورود غیرمجاز، دستگاه آفلاین)" },
          { key: "financeAlerts", label: "اعلان‌های مالی (فاکتور جدید، پرداخت معوق)" },
          { key: "deviceAlerts", label: "اعلان وضعیت دستگاه‌های IoT" },
          { key: "weeklyReport", label: "دریافت گزارش خلاصه هفتگی از طریق ایمیل" },
          { key: "smsUrgent", label: "پیامک برای رویدادهای فوری" },
        ].map((n) => (
          <label key={n.key} className="w-full flex items-center gap-3 justify-between p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/40">
            <input type="checkbox" checked={(notifPrefs as any)[n.key]} onChange={(e) => setNotifPrefs((p) => ({ ...p, [n.key]: e.target.checked }))} className="w-4 h-4 accent-accent flex-shrink-0" />
            <span className="text-sm text-foreground text-right flex-1">{n.label}</span>
          </label>
        ))}
      </div>
    )}

    {settingsTab === "users" && (
      <div className="bg-card rounded-xl border border-border shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setStaffModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors">
            <Plus className="w-3.5 h-3.5" /><span>افزودن کاربر جدید</span>
          </button>
          <h3 className="text-sm font-semibold text-foreground">کاربران و دسترسی‌های شهرک</h3>
        </div>
        <table className="w-full">
          <thead><tr className="border-b border-border">{["عملیات", "ایمیل", "نقش", "نام"].map((h) => <th key={h} className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">{h}</th>)}</tr></thead>
          <tbody>
            {zoneStaffList.map((u, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0">
                <td className="py-2.5 px-3">
                  <button onClick={() => setZoneStaffList((list) => list.filter((_, ix) => ix !== i))} className="text-[11px] text-red-600 hover:underline">حذف</button>
                </td>
                <td className="py-2.5 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{u.email}</td>
                <td className="py-2.5 px-3 text-xs text-muted-foreground">{u.role}</td>
                <td className="py-2.5 px-3 text-sm font-medium text-foreground">{u.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

    {settingsTab === "integrations" && (
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 max-w-2xl space-y-4">
        <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">کلید API</label>
          <div className="flex items-center gap-2">
            <input dir="ltr" readOnly value="idop_live_sk_5f8a2c91b4e6" className="flex-1 bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground font-mono focus:outline-none" />
            <button className="p-2 rounded-lg border border-border hover:bg-secondary text-muted-foreground"><Copy className="w-4 h-4" /></button>
            <button className="p-2 rounded-lg border border-border hover:bg-secondary text-muted-foreground"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>
        <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">Webhook URL</label>
          <input dir="ltr" placeholder="https://example.com/webhook" className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent" /></div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 text-right">سرویس‌های متصل</p>
          <div className="space-y-1.5">
            {[{ name: "درگاه پرداخت بانکی", status: "active" as StatusKind }, { name: "سامانه پیامک", status: "active" as StatusKind }, { name: "دبیرخانه الکترونیک (CMS)", status: "active" as StatusKind }].map((s) => (
              <div key={s.name} className="flex items-center justify-between p-2.5 rounded-lg border border-border">
                <Badge status={s.status} /><span className="text-xs text-foreground">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* Add new staff member modal */}
    {staffModalOpen && (
      <>
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setStaffModalOpen(false)} />
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl shadow-2xl p-5 w-96 z-50" dir="rtl">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setStaffModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
            <p className="text-sm font-bold text-foreground">افزودن کاربر جدید</p>
          </div>
          <div className="space-y-3">
            <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">نام و نام خانوادگی</label>
              <input dir="rtl" value={staffForm.name} onChange={(e) => setStaffForm((f) => ({ ...f, name: e.target.value }))} className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent" /></div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">نقش</label>
              <input dir="rtl" value={staffForm.role} onChange={(e) => setStaffForm((f) => ({ ...f, role: e.target.value }))} placeholder="مثال: کارشناس عملیات" className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent" /></div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">ایمیل</label>
              <input dir="ltr" value={staffForm.email} onChange={(e) => setStaffForm((f) => ({ ...f, email: e.target.value }))} className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent" /></div>
            <button
              disabled={!staffForm.name.trim()}
              onClick={() => { setZoneStaffList((list) => [...list, staffForm]); setStaffForm({ name: "", role: "", email: "" }); setStaffModalOpen(false); }}
              className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-1">
              افزودن کاربر
            </button>
          </div>
        </div>
      </>
    )}
  </div>
);
