import { X } from "lucide-react";
import { Contractor } from "@/entities/document";

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

interface ContractorModalProps {
  contractorForm: { name: string; company: string; workType: string; startDate: string; endDate: string; workers: string };
  setContractorForm: (form: { name: string; company: string; workType: string; startDate: string; endDate: string; workers: string }) => void;
  setContractorsList: React.Dispatch<React.SetStateAction<Contractor[]>>;
  setContractorModalOpen: (open: boolean) => void;
  onSubmit?: (form: { name: string; company: string; workType: string; startDate: string; endDate: string; workers: string }) => void;
}

export default function ContractorModal({ contractorForm, setContractorForm, setContractorsList, setContractorModalOpen, onSubmit }: ContractorModalProps) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setContractorModalOpen(false)} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl shadow-2xl p-5 w-96 z-50" dir="rtl">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setContractorModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
          <p className="text-sm font-bold text-foreground">افزودن پیمانکار جدید</p>
        </div>
        <div className="space-y-3">
          <div><label className={labelCls}>نام پیمانکار / شرکت</label><input dir="rtl" value={contractorForm.name} onChange={(e) => setContractorForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} /></div>
          <div><label className={labelCls}>نوع فعالیت</label><input dir="rtl" value={contractorForm.workType} onChange={(e) => setContractorForm((f) => ({ ...f, workType: e.target.value }))} placeholder="مثال: تعمیرات تأسیسات" className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls}>تاریخ شروع</label><input type="date" dir="ltr" value={contractorForm.startDate} onChange={(e) => setContractorForm((f) => ({ ...f, startDate: e.target.value }))} className={inputCls} /></div>
            <div><label className={labelCls}>تاریخ پایان</label><input type="date" dir="ltr" value={contractorForm.endDate} onChange={(e) => setContractorForm((f) => ({ ...f, endDate: e.target.value }))} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>تعداد نفرات</label><input type="number" dir="ltr" value={contractorForm.workers} onChange={(e) => setContractorForm((f) => ({ ...f, workers: e.target.value }))} className={inputCls} /></div>
          <button
            disabled={!contractorForm.name.trim()}
            onClick={() => {
              onSubmit?.(contractorForm);
              setContractorsList((list) => [{ id: `CT-${46 + list.length}`, name: contractorForm.name, company: contractorForm.name, workType: contractorForm.workType || "—", permitNumber: "—", startDate: contractorForm.startDate || "—", endDate: contractorForm.endDate || "—", workers: Number(contractorForm.workers || 1), status: "pending" }, ...list]);
              setContractorForm({ name: "", company: "", workType: "", startDate: "", endDate: "", workers: "" });
              setContractorModalOpen(false);
            }}
            className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-1">
            افزودن پیمانکار
          </button>
        </div>
      </div>
    </>
  );
}
