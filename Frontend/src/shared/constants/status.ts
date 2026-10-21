export const STATUS_CFG: Record<string, { fa: string; bg: string; text: string; dot: string }> = {
  active:      { fa: "فعال",        bg: "bg-emerald-50",  text: "text-emerald-700", dot: "bg-emerald-500" },
  inactive:    { fa: "غیرفعال",     bg: "bg-slate-100",   text: "text-slate-600",   dot: "bg-slate-400" },
  suspended:   { fa: "تعلیق",       bg: "bg-red-50",      text: "text-red-700",     dot: "bg-red-500" },
  online:      { fa: "آنلاین",      bg: "bg-emerald-50",  text: "text-emerald-700", dot: "bg-emerald-500" },
  offline:     { fa: "آفلاین",      bg: "bg-slate-100",   text: "text-slate-600",   dot: "bg-slate-400" },
  warning:     { fa: "هشدار",       bg: "bg-amber-50",    text: "text-amber-700",   dot: "bg-amber-500" },
  entered:     { fa: "ورود",        bg: "bg-teal-50",     text: "text-teal-700",    dot: "bg-teal-500" },
  exited:      { fa: "خروج",        bg: "bg-slate-100",   text: "text-slate-600",   dot: "bg-slate-400" },
  pending:     { fa: "در انتظار",   bg: "bg-amber-50",    text: "text-amber-700",   dot: "bg-amber-500" },
  denied:      { fa: "رد شده",      bg: "bg-red-50",      text: "text-red-700",     dot: "bg-red-500" },
  operational: { fa: "عملیاتی",     bg: "bg-emerald-50",  text: "text-emerald-700", dot: "bg-emerald-500" },
  partial:     { fa: "جزئی",        bg: "bg-amber-50",    text: "text-amber-700",   dot: "bg-amber-500" },
  critical:    { fa: "بحرانی",      bg: "bg-red-50",      text: "text-red-700",     dot: "bg-red-500" },
  approved:    { fa: "تأیید شده",   bg: "bg-emerald-50",  text: "text-emerald-700", dot: "bg-emerald-500" },
  rejected:    { fa: "رد شده",      bg: "bg-red-50",      text: "text-red-700",     dot: "bg-red-500" },
  processing:  { fa: "در حال پردازش", bg: "bg-blue-50",  text: "text-blue-700",    dot: "bg-blue-500" },
};

export const SEVERITY_CFG: Record<string, { fa: string; bg: string; text: string }> = {
  high:   { fa: "بحرانی", bg: "bg-red-50",   text: "text-red-700" },
  medium: { fa: "متوسط",  bg: "bg-amber-50", text: "text-amber-700" },
  low:    { fa: "عادی",   bg: "bg-secondary", text: "text-muted-foreground" },
};

export const ACTIVITY_CFG: Record<string, { fa: string; color: string }> = {
  high:   { fa: "فعالیت بالا",   color: "#0E7C86" },
  medium: { fa: "فعالیت متوسط",  color: "#F2A541" },
  low:    { fa: "فعالیت پایین",  color: "#94A3B8" },
};
