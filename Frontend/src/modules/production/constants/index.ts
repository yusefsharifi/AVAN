import type {
  OrderStatus, WorkOrderStatus, LineStatus, MachineStatus, MaintenanceType,
  NCRStatus, QCResult,
} from '../types';

export const ORDER_STATUS_CONFIG: Record<OrderStatus, { fa: string; color: string; bg: string }> = {
  draft:         { fa: 'پیش‌نویس',   color: 'text-slate-600',   bg: 'bg-slate-100' },
  confirmed:     { fa: 'تأیید شده',  color: 'text-blue-700',    bg: 'bg-blue-50' },
  in_production: { fa: 'در تولید',   color: 'text-amber-700',   bg: 'bg-amber-50' },
  completed:     { fa: 'تکمیل شده',  color: 'text-emerald-700', bg: 'bg-emerald-50' },
  cancelled:     { fa: 'لغو شده',    color: 'text-red-700',     bg: 'bg-red-50' },
};

export const WORK_ORDER_STATUS_CONFIG: Record<WorkOrderStatus, { fa: string; color: string; bg: string }> = {
  planned:     { fa: 'برنامه‌ریزی‌شده', color: 'text-slate-600',   bg: 'bg-slate-100' },
  released:    { fa: 'آزادشده',         color: 'text-blue-700',    bg: 'bg-blue-50' },
  in_progress: { fa: 'در حال اجرا',     color: 'text-amber-700',   bg: 'bg-amber-50' },
  completed:   { fa: 'تکمیل‌شده',       color: 'text-emerald-700', bg: 'bg-emerald-50' },
  on_hold:     { fa: 'متوقف',           color: 'text-orange-700',  bg: 'bg-orange-50' },
  cancelled:   { fa: 'لغوشده',          color: 'text-red-700',     bg: 'bg-red-50' },
};

export const LINE_STATUS_CONFIG: Record<LineStatus, { fa: string; color: string; bg: string }> = {
  idle:        { fa: 'بیکار',    color: 'text-slate-600',   bg: 'bg-slate-100' },
  running:     { fa: 'در حال کار', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  maintenance: { fa: 'نگهداری',   color: 'text-blue-700',    bg: 'bg-blue-50' },
  breakdown:   { fa: 'خرابی',     color: 'text-red-700',     bg: 'bg-red-50' },
};

export const MACHINE_STATUS_CONFIG: Record<MachineStatus, { fa: string; color: string; bg: string }> = {
  running:        { fa: 'در حال کار', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  idle:           { fa: 'بیکار',       color: 'text-slate-600',   bg: 'bg-slate-100' },
  maintenance:    { fa: 'نگهداری',     color: 'text-blue-700',    bg: 'bg-blue-50' },
  breakdown:      { fa: 'خرابی',       color: 'text-red-700',     bg: 'bg-red-50' },
  decommissioned: { fa: 'خارج از رده', color: 'text-slate-500',   bg: 'bg-slate-100' },
};

export const MAINTENANCE_TYPE_CONFIG: Record<MaintenanceType, { fa: string; icon: string }> = {
  preventive:  { fa: 'پیشگیرانه', icon: 'Shield' },
  corrective:  { fa: 'اصلاحی',    icon: 'Wrench' },
  predictive:  { fa: 'پیش‌بینانه', icon: 'Radar' },
  calibration: { fa: 'کالیبراسیون', icon: 'Gauge' },
};

export const DOWNTIME_REASON_CONFIG: Record<string, { fa: string; color: string }> = {
  breakdown:          { fa: 'خرابی',              color: 'text-red-700' },
  planned_maintenance:{ fa: 'نگهداری برنامه‌ریزی‌شده', color: 'text-blue-700' },
  material_shortage:  { fa: 'کمبود مواد',          color: 'text-amber-700' },
  power_outage:       { fa: 'قطعی برق',            color: 'text-red-700' },
  operator_absence:   { fa: 'غیبت اپراتور',        color: 'text-slate-600' },
  quality_issue:      { fa: 'مشکل کیفیت',          color: 'text-purple-700' },
  setup:              { fa: 'راه‌اندازی',           color: 'text-slate-600' },
  other:              { fa: 'سایر',                color: 'text-slate-600' },
};

export const SHIFT_CONFIG = {
  morning:   { fa: 'شیفت صبح', hours: '۰۶:۰۰–۱۴:۰۰' },
  afternoon: { fa: 'شیفت عصر', hours: '۱۴:۰۰–۲۲:۰۰' },
  night:     { fa: 'شیفت شب',  hours: '۲۲:۰۰–۰۶:۰۰' },
};

export const NCR_STATUS_CONFIG: Record<NCRStatus, { fa: string; color: string; bg: string }> = {
  open:              { fa: 'باز',              color: 'text-red-700',     bg: 'bg-red-50' },
  under_review:      { fa: 'در حال بررسی',     color: 'text-amber-700',   bg: 'bg-amber-50' },
  corrective_action: { fa: 'اقدام اصلاحی',     color: 'text-blue-700',    bg: 'bg-blue-50' },
  closed:            { fa: 'بسته‌شده',         color: 'text-emerald-700', bg: 'bg-emerald-50' },
  rejected:          { fa: 'رد شده',           color: 'text-slate-600',   bg: 'bg-slate-100' },
};

export const QC_RESULT_CONFIG: Record<QCResult, { fa: string; color: string; bg: string }> = {
  pass:        { fa: 'قبول',      color: 'text-emerald-700', bg: 'bg-emerald-50' },
  fail:        { fa: 'مردود',     color: 'text-red-700',     bg: 'bg-red-50' },
  conditional: { fa: 'مشروط',     color: 'text-amber-700',   bg: 'bg-amber-50' },
  pending:     { fa: 'در انتظار', color: 'text-slate-600',   bg: 'bg-slate-100' },
};

export const MACHINE_CATEGORY_CONFIG: Record<string, { fa: string; icon: string }> = {
  injection_molding: { fa: 'تزریق پلاستیک', icon: 'Cog' },
  blow_molding:      { fa: 'دمش پلاستیک',   icon: 'Wind' },
  extrusion:         { fa: 'اکستروژن',       icon: 'Move' },
  cnc:               { fa: 'CNC',            icon: 'Settings2' },
  press:             { fa: 'پرس',            icon: 'ArrowDownToLine' },
  assembly:          { fa: 'مونتاژ',          icon: 'Puzzle' },
  packaging:         { fa: 'بسته‌بندی',       icon: 'Package' },
  quality:           { fa: 'کنترل کیفیت',    icon: 'ShieldCheck' },
  utility:           { fa: 'تأسیسات',        icon: 'Zap' },
  other:             { fa: 'سایر',            icon: 'CircleDot' },
};

export const PRIORITY_CONFIG: Record<'normal' | 'urgent' | 'critical', { fa: string; color: string; bg: string }> = {
  normal:   { fa: 'عادی',    color: 'text-slate-600', bg: 'bg-slate-100' },
  urgent:   { fa: 'فوری',    color: 'text-amber-700', bg: 'bg-amber-50' },
  critical: { fa: 'بحرانی',  color: 'text-red-700',   bg: 'bg-red-50' },
};
