export const statusColor = (s: string) =>
  s === "paid" || s === "approved" || s === "active" || s === "entered" ? "bg-emerald-50 text-emerald-700"
  : s === "pending" || s === "warning" ? "bg-amber-50 text-amber-700"
  : s === "rejected" || s === "denied" || s === "critical" ? "bg-red-50 text-red-700"
  : "bg-slate-100 text-slate-600";

export const statusLabel = (s: string) =>
  s === "paid" ? "پرداخت‌شده" : s === "pending" ? "در انتظار" : s === "approved" ? "تأیید شده" : s;
