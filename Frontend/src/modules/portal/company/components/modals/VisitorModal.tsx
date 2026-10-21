import { X } from "lucide-react";
import { Visitor } from "@/entities/document";

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

interface VisitorModalProps {
  visitorForm: { name: string; phone: string; host: string; purpose: string; date: string; time: string };
  setVisitorForm: (form: { name: string; phone: string; host: string; purpose: string; date: string; time: string }) => void;
  setVisitorsList: React.Dispatch<React.SetStateAction<Visitor[]>>;
  setVisitorModalOpen: (open: boolean) => void;
  onSubmit?: (form: { name: string; phone: string; host: string; purpose: string; date: string; time: string }) => void;
}

export default function VisitorModal({ visitorForm, setVisitorForm, setVisitorsList, setVisitorModalOpen, onSubmit }: VisitorModalProps) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setVisitorModalOpen(false)} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl shadow-2xl p-5 w-96 z-50" dir="rtl">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setVisitorModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
          <p className="text-sm font-bold text-foreground">ثبت مهمان جدید</p>
        </div>
        <div className="space-y-3">
          <div><label className={labelCls}>نام و نام خانوادگی</label><input dir="rtl" value={visitorForm.name} onChange={(e) => setVisitorForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} /></div>
          <div><label className={labelCls}>شماره تماس</label><input dir="ltr" value={visitorForm.phone} onChange={(e) => setVisitorForm((f) => ({ ...f, phone: e.target.value }))} className={inputCls} /></div>
          <div><label className={labelCls}>میزبان (نام کارمند)</label><input dir="rtl" value={visitorForm.host} onChange={(e) => setVisitorForm((f) => ({ ...f, host: e.target.value }))} className={inputCls} /></div>
          <div><label className={labelCls}>هدف از بازدید</label><input dir="rtl" value={visitorForm.purpose} onChange={(e) => setVisitorForm((f) => ({ ...f, purpose: e.target.value }))} className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls}>تاریخ</label><input type="date" dir="ltr" value={visitorForm.date} onChange={(e) => setVisitorForm((f) => ({ ...f, date: e.target.value }))} className={inputCls} /></div>
            <div><label className={labelCls}>ساعت</label><input type="time" dir="ltr" value={visitorForm.time} onChange={(e) => setVisitorForm((f) => ({ ...f, time: e.target.value }))} className={inputCls} /></div>
          </div>
          <button
            disabled={!visitorForm.name.trim() || !visitorForm.host.trim()}
            onClick={() => {
              onSubmit?.(visitorForm);
              setVisitorsList((list) => [{ id: `V-${202 + list.length}`, name: visitorForm.name, phone: visitorForm.phone || "—", host: visitorForm.host, purpose: visitorForm.purpose || "—", date: visitorForm.date || "۱۴۰۳/۰۴/۱۶", time: visitorForm.time || "—", status: "scheduled" }, ...list]);
              setVisitorForm({ name: "", phone: "", host: "", purpose: "", date: "", time: "" });
              setVisitorModalOpen(false);
            }}
            className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-1">
            ثبت مهمان
          </button>
        </div>
      </div>
    </>
  );
}
