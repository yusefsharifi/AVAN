import { useState } from "react";
import {
  Smartphone, Bell, Settings, ChevronLeft, ChevronRight, Download, Send,
  Wifi, Battery, Signal, User, BarChart3, Eye, Users, Clock, AlertTriangle,
  Shield, Truck, CheckSquare, PenTool, Monitor, Tablet,
} from "lucide-react";

const APP_SCREENS = [
  {
    id: "guard",
    label: "خانه نگهبان",
    content: (
      <>
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-[10px] text-white/50">تردد امروز</p>
          <p className="text-lg font-bold text-white">۲۴ ورود · ۱۸ خروج</p>
        </div>
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-[10px] text-white/50">بارنامه‌های فعال</p>
          <p className="text-lg font-bold text-white">۷ مورد</p>
        </div>
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-[10px] text-white/50">اعلان‌های جدید</p>
          <p className="text-lg font-bold text-white">۳ خوانده‌نشده</p>
        </div>
        <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-emerald-400" />
          <p className="text-[10px] text-emerald-300">همه سرویس‌ها فعال</p>
        </div>
      </>
    ),
  },
  {
    id: "company",
    label: "ارسال شرکت",
    content: (
      <>
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-[10px] text-white/50">بارنامه‌های منتظر تأیید</p>
          <p className="text-lg font-bold text-white">۳ مورد</p>
        </div>
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-[10px] text-white/50">ارسال‌های امروز</p>
          <p className="text-lg font-bold text-white">۱۲ تردد</p>
        </div>
        <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-3 flex items-center gap-2">
          <Truck className="w-4 h-4 text-blue-400" />
          <p className="text-[10px] text-blue-300">۵ خودرو در مسیر</p>
        </div>
      </>
    ),
  },
  {
    id: "driver",
    label: "بارنامه راننده",
    content: (
      <>
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-[10px] text-white/50">بارنامه فعال</p>
          <p className="text-sm font-bold text-white">BN-1042 — مواد اولیه</p>
          <p className="text-[10px] text-white/40">وزن: ۱۲,۵۰۰ کیلوگرم</p>
        </div>
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-[10px] text-white/50">وضعیت</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <p className="text-xs text-white">در انتظار بارگیری</p>
          </div>
        </div>
        <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <p className="text-[10px] text-amber-300">زمان تخمینی: ۲ ساعت</p>
        </div>
      </>
    ),
  },
  {
    id: "visitor",
    label: "ورود بازدیدکننده",
    content: (
      <>
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-[10px] text-white/50">بازدیدکننده بعدی</p>
          <p className="text-sm font-bold text-white">محسن قربانی</p>
          <p className="text-[10px] text-white/40">ساعت ۱۰:۳۰ — علیرضا صادقی</p>
        </div>
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-[10px] text-white/50">بازدید امروز</p>
          <p className="text-lg font-bold text-white">۲ مورد</p>
        </div>
        <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-400" />
          <p className="text-[10px] text-purple-300">احراز هویت انجام شد</p>
        </div>
      </>
    ),
  },
  {
    id: "signature",
    label: "امضای دیجیتال",
    content: (
      <>
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-[10px] text-white/50">امضاهای منتظر</p>
          <p className="text-lg font-bold text-white">۲ سند</p>
        </div>
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-[10px] text-white/50">آخرین امضا</p>
          <p className="text-xs text-white">بارنامه BN-1039</p>
          <p className="text-[10px] text-white/40">دیروز ۱۳:۴۰</p>
        </div>
        <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2">
          <PenTool className="w-4 h-4 text-emerald-400" />
          <p className="text-[10px] text-emerald-300">گواهی دیجیتال فعال</p>
        </div>
      </>
    ),
  },
];

const DEVICE_SIZES = [
  { id: "iphone", label: "iPhone 15 Pro", w: 280, h: 560, radius: 36 },
  { id: "galaxy", label: "Galaxy S24", w: 270, h: 540, radius: 28 },
  { id: "tablet", label: "Tablet", w: 360, h: 500, radius: 18 },
];

const NOTIFICATION_TEMPLATES = [
  { id: "t1", label: "اعلام تردد خودرو", body: "خودرو {{plate}} در ساعت {{time}} وارد شهرک شد." },
  { id: "t2", label: "هشدار امنیتی", body: "رویداد امنیتی: {{event}} در {{location}}." },
  { id: "t3", label: "وضعیت بارنامه", body: "بارنامه {{id}} در مرحله {{stage}} قرار دارد." },
  { id: "t4", label: "یادآوری وظیفه", body: "وظیفه {{task}} تا {{deadline}} انجام شود." },
];

const NOTIFICATION_AUDIENCES = ["همه کاربران", "نگهبانان", "مدیران شرکت", "رانندگان", "بازدیدکنندگان"];

const NOTIFICATION_TREND = [
  { d: "شنبه", sent: 120, delivered: 115, opened: 89 },
  { d: "یکشنبه", sent: 145, delivered: 140, opened: 112 },
  { d: "دوشنبه", sent: 98, delivered: 95, opened: 72 },
  { d: "سه‌شنبه", sent: 167, delivered: 160, opened: 134 },
  { d: "چهارشنبه", sent: 134, delivered: 128, opened: 101 },
  { d: "پنجشنبه", sent: 89, delivered: 85, opened: 63 },
  { d: "جمعه", sent: 42, delivered: 40, opened: 28 },
];

const APP_VERSIONS = [
  { version: "۲.۴.۱", date: "۱۴۰۳/۰۴/۱۰", status: "active" as const, notes: "بهبود عملکرد ANPR", crashes: 3, forced: false, rollout: 85 },
  { version: "۲.۳.۰", date: "۱۴۰۳/۰۲/۱۵", status: "active" as const, notes: "افزودن قابلیت امضا", crashes: 12, forced: false, rollout: 100 },
  { version: "۲.۲.۰", date: "۱۴۰۳/۰۱/۰۵", status: "deprecated" as const, notes: "نسخه پایدار", crashes: 45, forced: true, rollout: 100 },
];

const APP_CONFIG = [
  { id: "c1", label: "زبان رابط", value: "فارسی" },
  { id: "c2", label: "حالت تاریک", value: "فعال" },
  { id: "c3", label: "اتصال خودکار", value: "فعال" },
  { id: "c4", label: "همگام‌سازی پس‌زمینه", value: "فعال" },
  { id: "c5", label: "ذخیره داده آفلاین", value: "۲۴ ساعت" },
];

function MobilePortal() {
  const [activeTab, setActiveTab] = useState<"preview" | "config" | "notifications" | "versions">("preview");
  const [screenIdx, setScreenIdx] = useState(0);
  const [deviceId, setDeviceId] = useState("iphone");
  const [notifTab, setNotifTab] = useState<"compose" | "analytics">("compose");
  const [selectedTemplate, setSelectedTemplate] = useState(NOTIFICATION_TEMPLATES[0].id);
  const [notifBody, setNotifBody] = useState("");
  const [notifAudience, setNotifAudience] = useState(NOTIFICATION_AUDIENCES[0]);
  const [notifPriority, setNotifPriority] = useState("normal");

  const device = DEVICE_SIZES.find((d) => d.id === deviceId)!;
  const screen = APP_SCREENS[screenIdx];

  const prevScreen = () => setScreenIdx((i) => (i - 1 + APP_SCREENS.length) % APP_SCREENS.length);
  const nextScreen = () => setScreenIdx((i) => (i + 1) % APP_SCREENS.length);

  return (
    <div className="h-full flex flex-col bg-background" dir="rtl">
      {/* Header */}
      <div className="px-6 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Smartphone className="w-5 h-5 text-accent" />
          <h2 className="text-sm font-bold text-foreground">مدیریت اپلیکیشن موبایل</h2>
        </div>
        <div className="flex gap-1.5">
          {([["preview", "پیش‌نمایش"], ["config", "تنظیمات"], ["notifications", "اعلان‌ها"], ["versions", "نسخه‌ها"]] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`text-[11px] px-3 py-1.5 rounded-md transition-colors ${activeTab === id ? "bg-accent text-white" : "text-muted-foreground hover:bg-secondary"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* ── PREVIEW TAB ── */}
        {activeTab === "preview" && (
          <div className="space-y-5">
            {/* Device Size Selector */}
            <div className="flex items-center gap-2">
              {DEVICE_SIZES.map((d) => {
                const Icon = d.id === "tablet" ? Tablet : d.id === "galaxy" ? Smartphone : Monitor;
                return (
                  <button
                    key={d.id}
                    onClick={() => setDeviceId(d.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                      deviceId === d.id ? "bg-accent text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {d.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-start justify-center gap-10">
              {/* Phone + Arrows */}
              <div className="flex items-center gap-4">
                <button onClick={prevScreen} className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>

                <div className="relative">
                  <div
                    className="border-4 border-slate-700 bg-slate-900 overflow-hidden shadow-2xl transition-all"
                    style={{ width: device.w, height: device.h, borderRadius: device.radius }}
                  >
                    {/* Status Bar */}
                    <div className="flex items-center justify-between px-6 pt-3 pb-1">
                      <span className="text-[9px] text-white/60">۱۴:۳۲</span>
                      <div className="flex items-center gap-1">
                        <Signal className="w-3 h-3 text-white/60" />
                        <Wifi className="w-3 h-3 text-white/60" />
                        <Battery className="w-3 h-3 text-white/60" />
                      </div>
                    </div>
                    {/* App Header */}
                    <div className="bg-accent px-4 py-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-white">آوان</span>
                      <div className="flex items-center gap-2">
                        <Bell className="w-3.5 h-3.5 text-white/80" />
                        <User className="w-3.5 h-3.5 text-white/80" />
                      </div>
                    </div>
                    {/* Screen Label */}
                    <div className="px-4 pt-3 pb-1">
                      <p className="text-[10px] text-white/40 font-medium">{screen.label}</p>
                    </div>
                    {/* Content */}
                    <div className="px-4 pb-14 space-y-3">
                      {screen.content}
                    </div>
                    {/* Bottom Nav */}
                    <div className="absolute bottom-0 left-0 right-0 bg-slate-800/95 backdrop-blur flex items-center justify-around py-3 px-4">
                      {APP_SCREENS.map((s, i) => (
                        <span key={s.id} className={`text-[8px] ${i === screenIdx ? "text-accent font-bold" : "text-white/40"}`}>{s.label.split(" ")[0]}</span>
                      ))}
                    </div>
                  </div>
                  {/* Screen Indicator */}
                  <div className="flex justify-center gap-1.5 mt-3">
                    {APP_SCREENS.map((_, i) => (
                      <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === screenIdx ? "bg-accent" : "bg-border"}`} />
                    ))}
                  </div>
                </div>

                <button onClick={nextScreen} className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors">
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Info Panel */}
              <div className="w-72 space-y-4">
                <div className="bg-secondary rounded-xl p-4">
                  <h3 className="text-xs font-bold text-foreground mb-2">اطلاعات اپلیکیشن</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">نام</span><span className="text-foreground font-medium">آوان موبایل</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">نسخه</span><span className="text-foreground font-medium">۲.۴.۱</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">پلتفرم</span><span className="text-foreground font-medium">iOS / Android</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">کاربران فعال</span><span className="text-foreground font-medium">۱,۲۴۷</span></div>
                  </div>
                </div>
                <div className="bg-secondary rounded-xl p-4">
                  <h3 className="text-xs font-bold text-foreground mb-2">دانلود</h3>
                  <div className="space-y-2">
                    <button className="w-full bg-foreground text-background text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2">
                      <Download className="w-3.5 h-3.5" /> دانلود از App Store
                    </button>
                    <button className="w-full bg-foreground text-background text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2">
                      <Download className="w-3.5 h-3.5" /> دانلود از Google Play
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CONFIG TAB ── */}
        {activeTab === "config" && (
          <div className="max-w-xl">
            <h3 className="text-xs font-bold text-foreground mb-3">تنظیمات اپلیکیشن</h3>
            {APP_CONFIG.map((cfg) => (
              <div key={cfg.id} className="flex items-center justify-between py-3 border-b border-border">
                <span className="text-xs text-foreground">{cfg.label}</span>
                <span className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded">{cfg.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── NOTIFICATIONS TAB ── */}
        {activeTab === "notifications" && (
          <div className="space-y-4">
            {/* Sub-tabs */}
            <div className="flex gap-1 bg-secondary rounded-lg p-1 max-w-xs">
              {([["compose", "ارسال اعلان"], ["analytics", "تحلیل اعلان‌ها"]] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setNotifTab(id as "compose" | "analytics")}
                  className={`flex-1 text-[11px] px-3 py-1.5 rounded-md font-medium transition-colors ${notifTab === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {notifTab === "compose" && (
              <div className="max-w-xl space-y-4">
                <div className="bg-secondary rounded-xl p-4">
                  <h3 className="text-xs font-bold text-foreground mb-3">قالب اعلان</h3>
                  <div className="space-y-2">
                    {NOTIFICATION_TEMPLATES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => { setSelectedTemplate(t.id); setNotifBody(t.body); }}
                        className={`w-full text-right p-3 rounded-lg text-xs transition-colors ${
                          selectedTemplate === t.id ? "bg-accent/10 border border-accent/30 text-accent" : "bg-background border border-border text-foreground hover:border-accent/30"
                        }`}
                      >
                        <p className="font-medium">{t.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{t.body}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-secondary rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-foreground">ارسال اعلان</h3>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">متن اعلان</label>
                    <textarea
                      value={notifBody}
                      onChange={(e) => setNotifBody(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground resize-none h-20"
                      placeholder="متن اعلان را بنویسید..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">مخاطب</label>
                      <select
                        value={notifAudience}
                        onChange={(e) => setNotifAudience(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground"
                      >
                        {NOTIFICATION_AUDIENCES.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">اولویت</label>
                      <select
                        value={notifPriority}
                        onChange={(e) => setNotifPriority(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground"
                      >
                        <option value="low">کم</option>
                        <option value="normal">عادی</option>
                        <option value="high">بالا</option>
                        <option value="urgent">فوری</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">زمان‌بندی ارسال</label>
                    <input type="datetime-local" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
                  </div>
                  <button className="w-full bg-accent text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2">
                    <Send className="w-3.5 h-3.5" /> ارسال اعلان
                  </button>
                </div>
              </div>
            )}

            {notifTab === "analytics" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "ارسال‌شده", value: "۸۹۵", icon: Send, color: "text-blue-600" },
                    { label: "تحویل‌شده", value: "۸۶۳", icon: Eye, color: "text-emerald-600" },
                    { label: "مشاهده‌شده", value: "۶۹۹", icon: Users, color: "text-accent" },
                  ].map((kpi) => (
                    <div key={kpi.label} className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
                      <kpi.icon className={`w-4 h-4 ${kpi.color} mx-auto mb-2`} />
                      <p className={`text-lg font-bold ${kpi.color}`} dir="ltr">{kpi.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-card rounded-xl border border-border shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-foreground text-right mb-4">روند ۷ روز اخیر</h3>
                  <div className="space-y-2">
                    {NOTIFICATION_TREND.map((day) => (
                      <div key={day.d} className="flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground w-16">{day.d}</span>
                        <div className="flex-1 flex items-center gap-1">
                          <div className="h-4 bg-blue-200 rounded" style={{ width: `${(day.sent / 170) * 100}%` }} />
                          <div className="h-4 bg-emerald-200 rounded" style={{ width: `${(day.delivered / 170) * 100}%` }} />
                          <div className="h-4 bg-accent/30 rounded" style={{ width: `${(day.opened / 170) * 100}%` }} />
                        </div>
                        <span className="text-[9px] text-muted-foreground font-mono" dir="ltr">{day.sent}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-[9px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-200 rounded" /> ارسال</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-200 rounded" /> تحویل</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-accent/30 rounded" /> مشاهده</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── VERSIONS TAB ── */}
        {activeTab === "versions" && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-foreground">مدیریت نسخه‌ها</h3>
            {APP_VERSIONS.map((v, i) => (
              <div key={i} className="bg-secondary rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">نسخه {v.version}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${v.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {v.status === "active" ? "فعال" : "منسوخ"}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{v.date}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mb-2">{v.notes}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-background rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">گزارش کرش</p>
                    <p className={`text-sm font-bold ${v.crashes > 20 ? "text-red-600" : v.crashes > 5 ? "text-amber-600" : "text-emerald-600"}`}>{v.crashes}</p>
                  </div>
                  <div className="bg-background rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">درصد انتشار</p>
                    <p className="text-sm font-bold text-foreground">{v.rollout}%</p>
                  </div>
                  <div className="bg-background rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">آپدیت اجباری</p>
                    <p className={`text-sm font-bold ${v.forced ? "text-red-600" : "text-emerald-600"}`}>{v.forced ? "بله" : "خیر"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button className="flex-1 text-[10px] px-3 py-1.5 rounded-lg border border-border hover:bg-background transition-colors">
                    {v.forced ? "لغو اجبار" : "اجباری کردن"}
                  </button>
                  <button className="flex-1 text-[10px] px-3 py-1.5 rounded-lg border border-border hover:bg-background transition-colors">
                    تغییر درصد انتشار
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MobilePortal;
