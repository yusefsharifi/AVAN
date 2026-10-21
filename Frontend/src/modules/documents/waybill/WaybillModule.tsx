import { useState } from "react";
import { Plus, Download, Search, Eye, Printer } from "lucide-react";

function WaybillModule() {
  const [tab, setTab] = useState<"active" | "history">("active");
  const [search, setSearch] = useState("");

  const activeWaybills = [
    { id: "WB-2024-0451", plate: "الف-۱۲۳-ب", cargo: "پلاستیک خام", driver: "محمد احمدی", dest: "تهران", weight: "۱۲,۵۰۰ kg", status: "در حال بارگیری", date: "۱۴۰۳/۰۴/۱۶", time: "۰۸:۳۰" },
    { id: "WB-2024-0450", plate: "ج-۴۵۶-د", cargo: "محصولات بسته‌بندی", driver: "علی رضایی", dest: "اصفهان", weight: "۸,۲۰۰ kg", status: "در انتظار تأیید", date: "۱۴۰۳/۰۴/۱۶", time: "۰۹:۰۰" },
    { id: "WB-2024-0449", plate: "ه-۷۸۹-و", cargo: "مواد شیمیایی", driver: "رضا کریمی", dest: "شیراز", weight: "۵,۰۰۰ kg", status: "تأیید شده", date: "۱۴۰۳/۰۴/۱۵", time: "۱۴:۱۵" },
    { id: "WB-2024-0448", plate: "ز-۱۰۱-ح", cargo: "قطعات پلاستیکی", driver: "حسن موسوی", dest: "کرج", weight: "۳,۸۰۰ kg", status: "در حال خروج", date: "۱۴۰۳/۰۴/۱۵", time: "۱۵:۴۵" },
  ];

  const historyWaybills = [
    { id: "WB-2024-0447", plate: "ط-۲۰۲-ی", cargo: "پلاستیک بازیافتی", driver: "سعید جعفری", dest: "قم", weight: "۹,۱۰۰ kg", status: "تحویل داده شد", date: "۱۴۰۳/۰۴/۱۴", time: "۱۰:۰۰" },
    { id: "WB-2024-0446", plate: "ک-۳۰۳-ل", cargo: "پوشاک صنعتی", driver: "مهدی زارع", dest: "مشهد", weight: "۲,۵۰۰ kg", status: "تحویل داده شد", date: "۱۴۰۳/۰۴/۱۳", time: "۰۷:۳۰" },
    { id: "WB-2024-0445", plate: "م-۴۰۴-ن", cargo: "مواد اولیه", driver: "کمال صادقی", dest: "تبریز", weight: "۱۵,۰۰۰ kg", status: "تحویل داده شد", date: "۱۴۰۳/۰۴/۱۲", time: "۱۲:۰۰" },
  ];

  const displayed = (tab === "active" ? activeWaybills : historyWaybills).filter(
    (w) => !search || w.id.includes(search) || w.plate.includes(search) || w.cargo.includes(search)
  );

  const statusColor = (s: string) =>
    s === "تأیید شده" || s === "تحویل داده شد" ? "bg-emerald-50 text-emerald-700"
    : s === "در انتظار تأیید" ? "bg-amber-50 text-amber-700"
    : s === "در حال بارگیری" || s === "در حال خروج" ? "bg-blue-50 text-blue-700"
    : "bg-slate-100 text-slate-600";

  const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors">
            <Plus className="w-3.5 h-3.5" /><span>بارنامه خروج جدید</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
            <Download className="w-3.5 h-3.5" /><span>خروجی Excel</span>
          </button>
        </div>
        <h1 className="text-sm font-semibold text-foreground">بارنامه‌های خروج</h1>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "فعال امروز", value: activeWaybills.length, color: "text-foreground" },
          { label: "در انتظار تأیید", value: activeWaybills.filter(w => w.status === "در انتظار تأیید").length, color: "text-amber-600" },
          { label: "تأیید شده", value: activeWaybills.filter(w => w.status === "تأیید شده").length, color: "text-emerald-600" },
          { label: "تحویل این هفته", value: historyWaybills.length, color: "text-primary" },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`} dir="ltr">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
          {([{ id: "active", label: "فعال" }, { id: "history", label: "تاریخچه" }] as const).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === t.id ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input dir="rtl" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو..."
            className="bg-card border border-border rounded-lg py-1.5 pr-3 pl-9 text-xs text-foreground focus:outline-none focus:border-accent w-52" />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {["عملیات", "وضعیت", "وزن", "مقصد", "راننده", "نوع بار", "پلاک", "شناسه", "زمان"].map((h) => (
                <th key={h} className="text-right py-3 px-3 text-xs font-semibold text-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.map((w) => (
              <tr key={w.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                    <button className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Printer className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor(w.status)}`}>{w.status}</span>
                </td>
                <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{w.weight}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground">{w.dest}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground">{w.driver}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground">{w.cargo}</td>
                <td className="py-3 px-3 text-xs font-mono text-foreground" dir="ltr">{w.plate}</td>
                <td className="py-3 px-3 text-xs font-mono text-primary" dir="ltr">{w.id}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground">{w.date} · {w.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {displayed.length === 0 && (
          <div className="p-10 text-center text-muted-foreground text-sm">نتیجه‌ای یافت نشد</div>
        )}
      </div>
    </div>
  );
}

export default WaybillModule;
