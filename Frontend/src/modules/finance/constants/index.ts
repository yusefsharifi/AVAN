import type { AccountCategory, TaxReturnType, CostCenterType, ProjectStatus, ProjectType } from '../types';

export const ACCOUNT_CATEGORY_CONFIG: Record<AccountCategory, { fa: string; type: string; color: string }> = {
  current_asset: { fa: 'دارایی جاری', type: 'asset', color: 'text-emerald-700 bg-emerald-50' },
  fixed_asset: { fa: 'دارایی ثابت', type: 'asset', color: 'text-emerald-700 bg-emerald-50' },
  current_liability: { fa: 'بدهی جاری', type: 'liability', color: 'text-red-700 bg-red-50' },
  long_term_liability: { fa: 'بدهی بلندمدت', type: 'liability', color: 'text-red-700 bg-red-50' },
  equity: { fa: 'حقوق صاحبان سهام', type: 'equity', color: 'text-blue-700 bg-blue-50' },
  operating_revenue: { fa: 'درآمد عملیاتی', type: 'revenue', color: 'text-emerald-700 bg-emerald-50' },
  cogs: { fa: 'بهای تمام‌شده', type: 'expense', color: 'text-amber-700 bg-amber-50' },
  operating_expense: { fa: 'هزینه‌های عملیاتی', type: 'expense', color: 'text-amber-700 bg-amber-50' },
  non_operating: { fa: 'سایر درآمدها و هزینه‌ها', type: 'expense', color: 'text-slate-700 bg-slate-50' },
};

export const ACCOUNT_TYPE_CONFIG: Record<string, { fa: string; color: string }> = {
  asset: { fa: 'دارایی', color: 'text-emerald-700' },
  liability: { fa: 'بدهی', color: 'text-red-700' },
  equity: { fa: 'حقوق صاحبان سهام', color: 'text-blue-700' },
  revenue: { fa: 'درآمد', color: 'text-emerald-700' },
  expense: { fa: 'هزینه', color: 'text-amber-700' },
};

export const VOUCHER_TYPE_CONFIG: Record<string, { fa: string }> = {
  general: { fa: 'سند عمومی' },
  adjusting: { fa: 'سند تعدیلی' },
  closing: { fa: 'سند اختتامیه' },
  reversing: { fa: 'سند واگردانی' },
  recurring: { fa: 'سند دوره‌ای' },
  allocation: { fa: 'سند تخصیص' },
};

export const VOUCHER_STATUS_CONFIG: Record<string, { fa: string; color: string; bg: string }> = {
  draft: { fa: 'پیش‌نویس', color: 'text-slate-600', bg: 'bg-slate-100' },
  pending_review: { fa: 'در انتظار بررسی', color: 'text-amber-700', bg: 'bg-amber-50' },
  approved: { fa: 'تأیید شده', color: 'text-blue-700', bg: 'bg-blue-50' },
  posted: { fa: 'ثبت شده', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  reversed: { fa: 'واگردانی شده', color: 'text-red-700', bg: 'bg-red-50' },
};

export const AR_STATUS_CONFIG: Record<string, { fa: string; color: string; bg: string }> = {
  draft: { fa: 'پیش‌نویس', color: 'text-slate-600', bg: 'bg-slate-100' },
  sent: { fa: 'ارسال شده', color: 'text-blue-700', bg: 'bg-blue-50' },
  partially_paid: { fa: 'پرداخت جزئی', color: 'text-amber-700', bg: 'bg-amber-50' },
  paid: { fa: 'پرداخت شده', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  overdue: { fa: 'سررسید گذشته', color: 'text-red-700', bg: 'bg-red-50' },
  written_off: { fa: 'سند‌نویسی شده', color: 'text-slate-500', bg: 'bg-slate-50' },
  credit_noted: { fa: 'اعتباری', color: 'text-purple-700', bg: 'bg-purple-50' },
};

export const AP_STATUS_CONFIG: Record<string, { fa: string; color: string; bg: string }> = {
  pending_match: { fa: 'در انتظار تطبیق', color: 'text-amber-700', bg: 'bg-amber-50' },
  pending_approval: { fa: 'در انتظار تأیید', color: 'text-blue-700', bg: 'bg-blue-50' },
  approved: { fa: 'تأیید شده', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  scheduled: { fa: 'زمان‌بندی پرداخت', color: 'text-purple-700', bg: 'bg-purple-50' },
  paid: { fa: 'پرداخت شده', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  disputed: { fa: 'اختلاف', color: 'text-red-700', bg: 'bg-red-50' },
};

export const PO_STATUS_CONFIG: Record<string, { fa: string; color: string; bg: string }> = {
  draft: { fa: 'پیش‌نویس', color: 'text-slate-600', bg: 'bg-slate-100' },
  pending_approval: { fa: 'در انتظار تأیید', color: 'text-amber-700', bg: 'bg-amber-50' },
  approved: { fa: 'تأیید شده', color: 'text-blue-700', bg: 'bg-blue-50' },
  sent: { fa: 'ارسال شده', color: 'text-purple-700', bg: 'bg-purple-50' },
  partially_received: { fa: 'دریافت جزئی', color: 'text-amber-700', bg: 'bg-amber-50' },
  fully_received: { fa: 'دریافت کامل', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  invoiced: { fa: 'فاکتور ثبت شده', color: 'text-blue-700', bg: 'bg-blue-50' },
  closed: { fa: 'بسته شده', color: 'text-slate-500', bg: 'bg-slate-50' },
  cancelled: { fa: 'لغو شده', color: 'text-red-700', bg: 'bg-red-50' },
};

export const MATCH_STATUS_CONFIG: Record<string, { fa: string; color: string; bg: string }> = {
  unmatched: { fa: 'تطبیق نشده', color: 'text-slate-600', bg: 'bg-slate-100' },
  partially_matched: { fa: 'تطبیق جزئی', color: 'text-amber-700', bg: 'bg-amber-50' },
  matched: { fa: 'تطبیق شده', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  discrepancy: { fa: 'اختلاف', color: 'text-red-700', bg: 'bg-red-50' },
};

export const ASSET_STATUS_CONFIG: Record<string, { fa: string; color: string; bg: string }> = {
  active: { fa: 'فعال', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  under_maintenance: { fa: 'در تعمیر', color: 'text-amber-700', bg: 'bg-amber-50' },
  idle: { fa: 'غیرفعال', color: 'text-slate-600', bg: 'bg-slate-100' },
  disposed: { fa: 'واگذار شده', color: 'text-slate-500', bg: 'bg-slate-50' },
  sold: { fa: 'فروخته شده', color: 'text-purple-700', bg: 'bg-purple-50' },
};

export const TAX_RATE = 0.09; // VAT 9%
export const WHT_RATE = 0.03; // Withholding tax 3%

export const FISCAL_CALENDAR: { type: string; label: string; frequency: string; month?: number; day?: number }[] = [
  { type: 'vat_monthly', label: 'اظهارنامه ارزش افزوده', frequency: 'monthly', day: 15 },
  { type: 'corporate_tax', label: 'مالیات عملکرد', frequency: 'annually', month: 3, day: 31 },
  { type: 'wh_quarterly', label: 'مالیات تکلیفی', frequency: 'quarterly', month: 1, day: 31 },
];

export const APPROVAL_MATRIX = {
  journal_voucher: [
    { min: 0, max: 10000000, approvers: [{ role: 'department_head', required: true }] },
    { min: 10000000, max: 100000000, approvers: [{ role: 'department_head', required: true }, { role: 'finance_manager', required: true }] },
    { min: 100000000, max: Infinity, approvers: [{ role: 'department_head', required: true }, { role: 'finance_manager', required: true }, { role: 'cfo', required: true }] },
  ],
  payment: [
    { min: 0, max: 50000000, approvers: [{ role: 'ap_manager', required: true }] },
    { min: 50000000, max: 500000000, approvers: [{ role: 'ap_manager', required: true }, { role: 'cfo', required: true }] },
    { min: 500000000, max: Infinity, approvers: [{ role: 'cfo', required: true }, { role: 'ceo', required: true }] },
  ],
  write_off: [
    { min: 0, max: 50000000, approvers: [{ role: 'cfo', required: true }] },
    { min: 50000000, max: Infinity, approvers: [{ role: 'cfo', required: true }, { role: 'board', required: true }] },
  ],
};

export const AGING_BUCKETS = [
  { key: 'current', label: 'جاری', maxDays: 0 },
  { key: '1-30', label: '۱ تا ۳۰ روز', maxDays: 30 },
  { key: '31-60', label: '۳۱ تا ۶۰ روز', maxDays: 60 },
  { key: '61-90', label: '۶۱ تا ۹۰ روز', maxDays: 90 },
  { key: '90+', label: 'بالای ۹۰ روز', maxDays: Infinity },
];

export const CLOSING_CHECKLIST = [
  { id: 'bank_reconciliation', label: 'تطبیق حساب‌های بانکی', required: true },
  { id: 'inventory_count', label: 'انبارگردانی', required: true },
  { id: 'depreciation', label: 'ثبت استهلاک', required: true },
  { id: 'accruals', label: 'ثبت هزینه‌های معوق', required: true },
  { id: 'prepayments', label: 'ثبت پیش‌پرداخت‌ها', required: true },
  { id: 'intercompany', label: 'تطبیق تراکنش‌های بین شرکتی', required: false },
  { id: 'vat_return', label: 'تنظیم اظهارنامه ارزش افزوده', required: true },
  { id: 'fixed_assets', label: 'بررسی دارایی‌های ثابت', required: true },
  { id: 'bank_reconciliation', label: 'تطبیق حساب‌های بانکی', required: true },
];

export const DEPRECIATION_RATES: Record<string, { method: string; usefulLife: number }> = {
  land: { method: 'straight_line', usefulLife: 0 },
  building: { method: 'straight_line', usefulLife: 20 },
  machinery: { method: 'straight_line', usefulLife: 10 },
  vehicle: { method: 'straight_line', usefulLife: 5 },
  furniture: { method: 'straight_line', usefulLife: 10 },
  it_equipment: { method: 'declining_balance', usefulLife: 3 },
};

// ── Cost Center Constants ────────────────────────────────────────────────────

export const COST_CENTER_TYPE_CONFIG: Record<CostCenterType, { fa: string; icon: string }> = {
  production_line: { fa: 'خط تولید', icon: 'Cog' },
  warehouse: { fa: 'انبار', icon: 'Warehouse' },
  admin: { fa: 'اداری', icon: 'Building' },
  sales: { fa: 'فروش', icon: 'TrendingUp' },
  maintenance: { fa: 'تعمیر و نگهداری', icon: 'Wrench' },
};

// ── Project Constants ────────────────────────────────────────────────────────

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { fa: string; color: string; bg: string }> = {
  planning: { fa: 'در حال برنامه‌ریزی', color: 'text-blue-700', bg: 'bg-blue-50' },
  active: { fa: 'فعال', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  on_hold: { fa: 'متوقف', color: 'text-amber-700', bg: 'bg-amber-50' },
  completed: { fa: 'تکمیل شده', color: 'text-slate-600', bg: 'bg-slate-100' },
  cancelled: { fa: 'لغو شده', color: 'text-red-700', bg: 'bg-red-50' },
};

export const PROJECT_TYPE_CONFIG: Record<ProjectType, { fa: string; icon: string }> = {
  construction: { fa: 'ساختمانی', icon: 'Building' },
  manufacturing: { fa: 'تولیدی', icon: 'Cog' },
  maintenance: { fa: 'تعمیراتی', icon: 'Wrench' },
  it: { fa: 'IT', icon: 'Monitor' },
  other: { fa: 'سایر', icon: 'Folder' },
};
