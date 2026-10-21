import { X } from "lucide-react";
import { StatusKind } from "@/entities/document";

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

interface ServiceRequest {
  id: string;
  title: string;
  status: string;
  date: string;
  pri: string;
  priColor: string;
}

interface ServiceModalProps {
  serviceForm: { title: string; description: string; priority: string };
  setServiceForm: (form: { title: string; description: string; priority: string }) => void;
  setRequestsList: React.Dispatch<React.SetStateAction<ServiceRequest[]>>;
  setServiceModalOpen: (open: boolean) => void;
  onSubmit?: (form: { title: string; description: string; priority: string }) => void;
}

export default function ServiceModal({ serviceForm, setServiceForm, setRequestsList, setServiceModalOpen, onSubmit }: ServiceModalProps) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setServiceModalOpen(false)} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl shadow-2xl p-5 w-96 z-50" dir="rtl">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setServiceModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
          <p className="text-sm font-bold text-foreground">درخواست خدمات جدید</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>عنوان درخواست</label>
            <input dir="rtl" value={serviceForm.title} onChange={(e) => setServiceForm((f) => ({ ...f, title: e.target.value }))} placeholder="مثال: تعمیر سیستم برق" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>توضیحات</label>
            <textarea dir="rtl" rows={3} value={serviceForm.description} onChange={(e) => setServiceForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>اولویت</label>
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
              {["پایین", "متوسط", "بالا"].map((p) => (
                <button key={p} onClick={() => setServiceForm((f) => ({ ...f, priority: p }))}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${serviceForm.priority === p ? "bg-primary text-white" : "text-muted-foreground"}`}>{p}</button>
              ))}
            </div>
          </div>
          <button
            disabled={!serviceForm.title.trim()}
            onClick={() => {
              onSubmit?.(serviceForm);
              const priColorMap: Record<string, string> = { "بالا": "text-red-600 bg-red-50", "متوسط": "text-amber-700 bg-amber-50", "پایین": "text-slate-600 bg-slate-100" };
              setRequestsList((list) => [{ id: `SR-${1042 + list.length}`, title: serviceForm.title, status: "pending" as StatusKind, date: "۱۴۰۳/۰۴/۱۶", pri: serviceForm.priority, priColor: priColorMap[serviceForm.priority] }, ...list]);
              setServiceForm({ title: "", description: "", priority: "متوسط" });
              setServiceModalOpen(false);
            }}
            className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-1">
            ثبت درخواست
          </button>
        </div>
      </div>
    </>
  );
}
