import { X, Upload } from "lucide-react";
import { StatusKind } from "@/entities/document";

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

interface PermitModalProps {
  permitForm: { type: string; description: string };
  setPermitForm: (form: { type: string; description: string }) => void;
  setPermitsList: React.Dispatch<React.SetStateAction<{ name: string; num: string; status: StatusKind; exp: string }[]>>;
  setPermitModalOpen: (open: boolean) => void;
  onSubmit?: (form: { type: string; description: string }) => void;
}

export default function PermitModal({ permitForm, setPermitForm, setPermitsList, setPermitModalOpen, onSubmit }: PermitModalProps) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setPermitModalOpen(false)} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl shadow-2xl p-5 w-96 z-50" dir="rtl">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setPermitModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
          <p className="text-sm font-bold text-foreground">درخواست مجوز جدید</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>نوع مجوز</label>
            <input dir="rtl" value={permitForm.type} onChange={(e) => setPermitForm((f) => ({ ...f, type: e.target.value }))} placeholder="مثال: مجوز حمل‌ونقل" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>توضیحات</label>
            <textarea dir="rtl" rows={3} value={permitForm.description} onChange={(e) => setPermitForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} />
          </div>
          <label className="w-full border-2 border-dashed border-border rounded-lg py-4 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-accent transition-colors">
            <Upload className="w-4 h-4 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">پیوست مدارک (اختیاری)</span>
            <input type="file" className="hidden" />
          </label>
          <button
            disabled={!permitForm.type.trim()}
            onClick={() => {
              onSubmit?.(permitForm);
              setPermitsList((list) => [{ name: permitForm.type, num: `REQ-${1000 + list.length}`, status: "pending" as StatusKind, exp: "—" }, ...list]);
              setPermitForm({ type: "", description: "" });
              setPermitModalOpen(false);
            }}
            className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-1">
            ثبت درخواست
          </button>
        </div>
      </div>
    </>
  );
}
