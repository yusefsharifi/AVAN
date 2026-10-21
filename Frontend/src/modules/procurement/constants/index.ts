import type { VendorStatus, VendorCategory, PRStatus, RFQStatus, POStatus, ContractStatus, ContractType, PaymentTerms, PRSource } from '../types';

export const VENDOR_STATUS_CONFIG: Record<VendorStatus, { fa: string; color: string; bg: string }> = {
  active:           { fa: 'فعال',            color: 'text-emerald-700', bg: 'bg-emerald-50' },
  inactive:         { fa: 'غیرفعال',         color: 'text-slate-600',   bg: 'bg-slate-100' },
  blacklisted:      { fa: 'لیست سیاه',       color: 'text-red-700',     bg: 'bg-red-50' },
  pending_approval: { fa: 'در انتظار تأیید', color: 'text-amber-700',   bg: 'bg-amber-50' },
};

export const VENDOR_CATEGORY_CONFIG: Record<VendorCategory, { fa: string; icon: string }> = {
  raw_material: { fa: 'مواد اولیه',   icon: '🧪' },
  equipment:    { fa: 'تجهیزات',      icon: '⚙️' },
  services:     { fa: 'خدمات',        icon: '🔧' },
  packaging:    { fa: 'بسته‌بندی',    icon: '📦' },
  chemicals:    { fa: 'مواد شیمیایی', icon: '⚗️' },
  spare_parts:  { fa: 'قطعات یدکی',   icon: '🔩' },
  utilities:    { fa: 'خدمات عمومی',  icon: '💡' },
  other:        { fa: 'سایر',         icon: '📋' },
};

export const PR_STATUS_CONFIG: Record<PRStatus, { fa: string; color: string; bg: string; step: number }> = {
  draft:            { fa: 'پیش‌نویس',        color: 'text-slate-600',   bg: 'bg-slate-100',   step: 0 },
  pending_approval: { fa: 'در انتظار تأیید', color: 'text-amber-700',   bg: 'bg-amber-50',    step: 1 },
  approved:         { fa: 'تأیید شده',       color: 'text-blue-700',    bg: 'bg-blue-50',     step: 2 },
  rfq_sent:         { fa: 'استعلام ارسال شد',color: 'text-purple-700',  bg: 'bg-purple-50',   step: 3 },
  po_created:       { fa: 'PO ایجاد شد',     color: 'text-emerald-700', bg: 'bg-emerald-50',  step: 4 },
  cancelled:        { fa: 'لغو شده',         color: 'text-red-700',     bg: 'bg-red-50',      step: -1 },
};

export const RFQ_STATUS_CONFIG: Record<RFQStatus, { fa: string; color: string; bg: string }> = {
  draft:              { fa: 'پیش‌نویس',           color: 'text-slate-600',   bg: 'bg-slate-100' },
  sent:               { fa: 'ارسال‌شده',          color: 'text-blue-700',    bg: 'bg-blue-50' },
  responses_received: { fa: 'پاسخ دریافت شد',    color: 'text-amber-700',   bg: 'bg-amber-50' },
  evaluated:          { fa: 'ارزیابی شده',        color: 'text-purple-700',  bg: 'bg-purple-50' },
  awarded:            { fa: 'برنده مشخص شد',      color: 'text-emerald-700', bg: 'bg-emerald-50' },
  cancelled:          { fa: 'لغو شده',            color: 'text-red-700',     bg: 'bg-red-50' },
};

export const PO_STATUS_CONFIG: Record<POStatus, { fa: string; color: string; bg: string; step: number }> = {
  draft:              { fa: 'پیش‌نویس',       color: 'text-slate-600',   bg: 'bg-slate-100',  step: 0 },
  approved:           { fa: 'تأیید شده',      color: 'text-blue-700',    bg: 'bg-blue-50',    step: 1 },
  sent:               { fa: 'ارسال شده',      color: 'text-purple-700',  bg: 'bg-purple-50',  step: 2 },
  partially_received: { fa: 'دریافت جزئی',    color: 'text-amber-700',   bg: 'bg-amber-50',   step: 3 },
  fully_received:     { fa: 'دریافت کامل',    color: 'text-emerald-700', bg: 'bg-emerald-50', step: 4 },
  invoiced:           { fa: 'فاکتور شده',     color: 'text-cyan-700',    bg: 'bg-cyan-50',    step: 5 },
  paid:               { fa: 'پرداخت شده',     color: 'text-emerald-800', bg: 'bg-emerald-100',step: 6 },
  cancelled:          { fa: 'لغو شده',        color: 'text-red-700',     bg: 'bg-red-50',     step: -1 },
};

export const CONTRACT_STATUS_CONFIG: Record<ContractStatus, { fa: string; color: string; bg: string }> = {
  draft:          { fa: 'پیش‌نویس',        color: 'text-slate-600',   bg: 'bg-slate-100' },
  active:         { fa: 'فعال',             color: 'text-emerald-700', bg: 'bg-emerald-50' },
  expiring_soon:  { fa: 'در حال انقضا',    color: 'text-amber-700',   bg: 'bg-amber-50' },
  expired:        { fa: 'منقضی شده',       color: 'text-red-700',     bg: 'bg-red-50' },
  terminated:     { fa: 'فسخ شده',         color: 'text-slate-600',   bg: 'bg-slate-100' },
};

export const CONTRACT_TYPE_CONFIG: Record<ContractType, { fa: string }> = {
  supply:         { fa: 'تأمین کالا' },
  service:        { fa: 'خدماتی' },
  framework:      { fa: 'چارچوبی' },
  blanket_order:  { fa: 'سفارش باز' },
};

export const PAYMENT_TERMS_CONFIG: Record<PaymentTerms, { fa: string; days: number }> = {
  cod:     { fa: 'نقدی',           days: 0 },
  net15:   { fa: 'اعتبار ۱۵ روزه', days: 15 },
  net30:   { fa: 'اعتبار ۳۰ روزه', days: 30 },
  net45:   { fa: 'اعتبار ۴۵ روزه', days: 45 },
  net60:   { fa: 'اعتبار ۶۰ روزه', days: 60 },
  prepaid: { fa: 'پیش‌پرداخت',     days: -1 },
  lc:      { fa: 'اعتبار اسنادی',  days: 90 },
};

export const PR_SOURCE_CONFIG: Record<PRSource, { fa: string; color: string }> = {
  manual:          { fa: 'دستی',                 color: 'text-slate-600' },
  mrp_auto:        { fa: 'خودکار (MRP تولید)',   color: 'text-purple-700' },
  reorder_auto:    { fa: 'خودکار (نقطه سفارش)',  color: 'text-blue-700' },
  production_auto: { fa: 'خودکار (تولید)',       color: 'text-purple-700' },
};

export const PRIORITY_LABELS: Record<'normal' | 'urgent' | 'critical', string> = {
  normal: 'عادی', urgent: 'فوری', critical: 'بحرانی',
};

export const DOCUMENT_TYPE_CONFIG: Record<string, { fa: string }> = {
  trade_license:      { fa: 'جواز کسب' },
  tax_certificate:    { fa: 'گواهی مالیاتی' },
  quality_certificate:{ fa: 'گواهی کیفیت' },
  iso_certificate:    { fa: 'گواهی ISO' },
  bank_guarantee:     { fa: 'ضمانت‌نامه بانکی' },
  other:              { fa: 'سایر' },
};
