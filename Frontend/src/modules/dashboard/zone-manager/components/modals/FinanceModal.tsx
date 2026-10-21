import { X } from "lucide-react";
import { FinanceTransaction, Company } from "@/entities/document";
import { FINANCE_CATEGORIES, CONTRACTORS } from "@/entities/document";

interface FinanceModalProps {
  open: boolean;
  onClose: () => void;
  form: { type: "income" | "expense"; category: string; party: string; amount: string; date: string; status: "paid" | "pending" | "overdue" };
  setForm: React.Dispatch<React.SetStateAction<{ type: "income" | "expense"; category: string; party: string; amount: string; date: string; status: "paid" | "pending" | "overdue" }>>;
  companiesListState: { nameFa: string }[];
  onConfirm: () => void;
}

export const FinanceModal = ({ open, onClose, form, setForm, companiesListState, onConfirm }: FinanceModalProps) => {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl shadow-2xl p-5 w-96 z-50" dir="rtl">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
          <p className="text-sm font-bold text-foreground">ثبت تراکنش مالی جدید</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">نوع تراکنش</label>
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
              {(["income", "expense"] as const).map((tp) => (
                <button key={tp} onClick={() => setForm((f) => ({ ...f, type: tp, category: FINANCE_CATEGORIES[tp][0] }))}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${form.type === tp ? (tp === "income" ? "bg-emerald-600 text-white" : "bg-amber-600 text-white") : "text-muted-foreground"}`}>
                  {tp === "income" ? "درآمد" : "هزینه"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">دسته‌بندی</label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent">
              {FINANCE_CATEGORIES[form.type].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">طرف حساب</label>
            <input dir="rtl" value={form.party} onChange={(e) => setForm((f) => ({ ...f, party: e.target.value }))} placeholder="نام شرکت، پیمانکار یا واحد..."
              className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">مبلغ (تومان)</label>
              <input type="number" dir="ltr" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent" /></div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">تاریخ</label>
              <input dir="rtl" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} placeholder="۱۴۰۳/۰۴/۱۶"
                className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent" /></div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">وضعیت</label>
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
              {(["paid", "pending", "overdue"] as const).map((s) => (
                <button key={s} onClick={() => setForm((f) => ({ ...f, status: s }))}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${form.status === s ? "bg-primary text-white" : "text-muted-foreground"}`}>
                  {s === "paid" ? "پرداخت‌شده" : s === "pending" ? "در انتظار" : "معوق"}
                </button>
              ))}
            </div>
          </div>
          <button
            disabled={!form.party.trim() || !form.amount}
            onClick={onConfirm}
            className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-1">
            ثبت تراکنش
          </button>
        </div>
      </div>
    </>
  );
};
