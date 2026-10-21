import { useState } from "react";
import { toast } from "sonner";
import { Plus, X, PackageCheck, PackageX, AlertTriangle } from "lucide-react";
import { Employee, AssetCategory, ASSET_CATEGORY_LABELS } from "../types";
import { useHRStore } from "../store/useHRStore";

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";
const CONDITION_LABELS: Record<string, string> = { new: "نو", good: "سالم", fair: "قابل قبول", damaged: "آسیب‌دیده" };

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate).getTime() < Date.now();
}

export default function AssetCustody({ employees }: { employees: Employee[] }) {
  const { assets, assignAsset, returnAsset, getAssetHistory } = useHRStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [historyEmployeeId, setHistoryEmployeeId] = useState(employees[0]?.employeeId ?? "");
  const [form, setForm] = useState({
    assetTag: "", assetName: "", category: "Electronics" as AssetCategory, value: "",
    employeeId: employees[0]?.employeeId ?? "", condition: "good" as "new" | "good" | "fair" | "damaged", dueReturnDate: "",
  });

  const activeCount = assets.filter((a) => a.status === "assigned").length;
  const overdueCount = assets.filter((a) => a.status === "assigned" && isOverdue(a.dueReturnDate)).length;

  const assign = () => {
    if (!form.employeeId || !form.assetName.trim()) { toast.error("نام دارایی و کارمند الزامی است"); return; }
    assignAsset({
      assetTag: form.assetTag || `TAG-${Date.now().toString().slice(-5)}`, assetName: form.assetName,
      category: form.category, value: form.value ? Number(form.value) : undefined,
      employeeId: form.employeeId, condition: form.condition, dueReturnDate: form.dueReturnDate || undefined,
    });
    const emp = employees.find((e) => e.employeeId === form.employeeId);
    toast.success(`${form.assetName} به ${emp?.name} تحویل داده شد (اعلان شبیه‌سازی‌شده ارسال شد)`);
    setModalOpen(false);
  };

  const handleReturn = (id: string, assetName: string) => {
    returnAsset(id);
    toast.success(`${assetName} مسترد شد`);
  };

  const history = getAssetHistory(historyEmployeeId);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-foreground" dir="ltr">{assets.length}</p>
          <p className="text-xs text-muted-foreground mt-1">کل اقلام ثبت‌شده</p>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600" dir="ltr">{activeCount}</p>
          <p className="text-xs text-muted-foreground mt-1">در تحویل کارکنان</p>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-red-600" dir="ltr">{overdueCount}</p>
          <p className="text-xs text-muted-foreground mt-1">عقب‌افتاده استرداد</p>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground" dir="ltr">{assets.length - activeCount}</p>
          <p className="text-xs text-muted-foreground mt-1">مسترد شده</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors">
            <Plus className="w-3.5 h-3.5" /><span>تحویل مال به کارمند</span>
          </button>
          <h3 className="text-sm font-semibold text-foreground">اموال و تجهیزات امانی</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {["عملیات", "وضعیت", "سررسید", "ارزش", "کارمند", "دسته", "شناسه دارایی"].map((h) => (
                <th key={h} className="text-right py-3 px-3 text-xs font-semibold text-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => {
              const overdue = a.status === "assigned" && isOverdue(a.dueReturnDate);
              return (
                <tr key={a.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="py-3 px-3">
                    {a.status === "assigned" ? (
                      <button onClick={() => handleReturn(a.id, a.assetName)} className="flex items-center gap-1 text-xs text-accent hover:underline"><PackageX className="w-3.5 h-3.5" />استرداد</button>
                    ) : <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><PackageCheck className="w-3.5 h-3.5" />{a.returnedAt}</span>}
                  </td>
                  <td className="py-3 px-3">
                    {overdue ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700"><AlertTriangle className="w-3 h-3" />عقب‌افتاده</span>
                    ) : (
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${a.status === "assigned" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {a.status === "assigned" ? "در اختیار کارمند" : "مسترد شده"}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-xs text-muted-foreground" dir="ltr">{a.dueReturnDate ?? "—"}</td>
                  <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{a.value ? a.value.toLocaleString() : "—"}</td>
                  <td className="py-3 px-3 text-sm font-semibold text-foreground">{a.employeeName}</td>
                  <td className="py-3 px-3 text-xs text-muted-foreground">{ASSET_CATEGORY_LABELS[a.category]}</td>
                  <td className="py-3 px-3 text-xs font-mono text-primary" dir="ltr">{a.assetTag}</td>
                </tr>
              );
            })}
            {assets.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">هنوز مالی ثبت نشده</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <select dir="rtl" value={historyEmployeeId} onChange={(e) => setHistoryEmployeeId(e.target.value)} className={`${inputCls} w-48`}>
            {employees.map((e) => <option key={e.id} value={e.employeeId}>{e.name}</option>)}
          </select>
          <h3 className="text-sm font-semibold text-foreground">تاریخچه اموال این کارمند</h3>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">هیچ سابقه‌ای ندارد</p>
        ) : (
          <ul className="space-y-2">
            {history.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-xs border-b border-border/50 pb-2 last:border-0">
                <span className={a.status === "assigned" ? "text-emerald-700" : "text-muted-foreground"}>{a.status === "assigned" ? "در اختیار" : `مسترد در ${a.returnedAt}`}</span>
                <span className="text-muted-foreground">تحویل: {a.assignedAt}</span>
                <span className="font-semibold text-foreground">{a.assetName} ({a.assetTag})</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setModalOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl shadow-2xl p-5 w-[28rem] z-50" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">تحویل مال / تجهیزات</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>کارمند</label>
                <select dir="rtl" value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))} className={inputCls}>
                  {employees.map((e) => <option key={e.id} value={e.employeeId}>{e.name}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>نام دارایی</label><input dir="rtl" value={form.assetName} onChange={(e) => setForm((f) => ({ ...f, assetName: e.target.value }))} placeholder="مثال: لپ‌تاپ Dell" className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>شناسه/تگ دارایی</label><input dir="ltr" value={form.assetTag} onChange={(e) => setForm((f) => ({ ...f, assetTag: e.target.value }))} placeholder="IT-LAPTOP-014" className={inputCls} /></div>
                <div>
                  <label className={labelCls}>دسته‌بندی</label>
                  <select dir="rtl" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as AssetCategory }))} className={inputCls}>
                    {(Object.keys(ASSET_CATEGORY_LABELS) as AssetCategory[]).map((c) => <option key={c} value={c}>{ASSET_CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>ارزش (تومان — از مالی)</label><input dir="ltr" type="number" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} className={inputCls} /></div>
                <div><label className={labelCls}>تاریخ سررسید استرداد</label><input type="date" dir="ltr" value={form.dueReturnDate} onChange={(e) => setForm((f) => ({ ...f, dueReturnDate: e.target.value }))} className={inputCls} /></div>
              </div>
              <div>
                <label className={labelCls}>وضعیت فیزیکی هنگام تحویل</label>
                <select dir="rtl" value={form.condition} onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value as typeof form.condition }))} className={inputCls}>
                  {(Object.keys(CONDITION_LABELS) as (keyof typeof CONDITION_LABELS)[]).map((c) => <option key={c} value={c}>{CONDITION_LABELS[c]}</option>)}
                </select>
              </div>
              <p className="text-[11px] text-muted-foreground">اگر «شناسه دارایی» با یک دارایی ثابت در ماژول مالی مطابقت داشته باشد (مثال: IT-LAPTOP-014)، فیلد «در اختیار» آن دارایی به‌صورت خودکار به‌روزرسانی می‌شود.</p>
              <button onClick={assign} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors mt-1">
                ثبت تحویل
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
