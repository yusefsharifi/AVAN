import { useState } from "react";
import { toast } from "sonner";
import { Play, CheckCircle2, Send, Landmark } from "lucide-react";
import { useHRStore } from "../store/useHRStore";
import { useFinanceStore } from "@/modules/finance/store";

export default function PayrollTab() {
  const { payrollBatches, runPayroll, markPayrollPaid } = useHRStore();
  const { vouchers } = useFinanceStore();
  const [month, setMonth] = useState("مرداد ۱۴۰۳");
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleRun = () => {
    const batch = runPayroll(month);
    toast.success(`حقوق ${month} برای ${batch.payslips.length} نفر محاسبه شد و سند حسابداری در ماژول مالی ثبت شد`);
  };

  const handleMarkPaid = (batchId: string) => {
    markPayrollPaid(batchId, "انتقال بانکی");
    toast.success("پرداخت ثبت و سند حسابداری در ماژول مالی به وضعیت «ثبت‌شده» تغییر یافت");
  };

  const handleSendPayslip = (employeeName: string) => {
    toast.info(`فیش حقوقی ${employeeName} (شبیه‌سازی ارسال ایمیل)`);
  };

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input dir="rtl" value={month} onChange={(e) => setMonth(e.target.value)}
            className="bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground w-40" />
          <button onClick={handleRun} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors">
            <Play className="w-3.5 h-3.5" /><span>اجرای حقوق (Run Payroll)</span>
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Landmark className="w-3.5 h-3.5" />
          محاسبه از روی حضور‌وغیاب و مرخصی‌های تأییدشده + ثبت خودکار سند در ماژول مالی
        </p>
      </div>

      <div className="space-y-4">
        {payrollBatches.map((batch) => {
          const voucher = vouchers.find((v) => v.id === batch.journalVoucherId);
          return (
            <div key={batch.id} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  {batch.status === "processing" ? (
                    <button onClick={() => handleMarkPaid(batch.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors">
                      <CheckCircle2 className="w-3.5 h-3.5" />ثبت پرداخت
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />پرداخت‌شده ({batch.paymentMethod})</span>
                  )}
                  <button onClick={() => setExpanded(expanded === batch.id ? null : batch.id)} className="text-xs text-accent hover:underline">
                    {expanded === batch.id ? "بستن جزئیات" : "مشاهده فیش‌ها"}
                  </button>
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-semibold text-foreground">{batch.month}</h3>
                  <p className="text-[11px] text-muted-foreground" dir="ltr">جمع خالص: {batch.totalNetPay.toLocaleString()} — سند مالی: {voucher?.voucherNumber ?? "—"} ({voucher?.status})</p>
                </div>
              </div>
              {expanded === batch.id && (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      {["ارسال فیش", "خالص پرداختی", "بیمه", "مالیات", "کسر حضور", "حقوق پایه", "کارمند"].map((h) => (
                        <th key={h} className="text-right py-2.5 px-3 text-xs font-semibold text-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {batch.payslips.map((p) => (
                      <tr key={p.employeeId} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 px-3">
                          <button onClick={() => handleSendPayslip(p.employeeName)} className="flex items-center gap-1 text-xs text-accent hover:underline"><Send className="w-3 h-3" />ارسال</button>
                        </td>
                        <td className="py-2.5 px-3 text-xs font-semibold text-emerald-600 font-mono" dir="ltr">{p.netPay.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-xs text-red-600 font-mono" dir="ltr">{p.insurance.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-xs text-red-600 font-mono" dir="ltr">{p.tax.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-xs text-amber-600 font-mono" dir="ltr">{p.attendanceDeduction.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{p.baseSalary.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-sm font-semibold text-foreground">{p.employeeName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
        {payrollBatches.length === 0 && (
          <div className="bg-card rounded-xl border border-border shadow-sm p-8 text-center text-sm text-muted-foreground">
            هنوز حقوقی اجرا نشده — روی «اجرای حقوق» کلیک کنید
          </div>
        )}
      </div>
    </div>
  );
}
