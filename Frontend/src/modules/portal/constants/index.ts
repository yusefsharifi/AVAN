import type { CompanyType, CompanyStatus, ShipmentStatus, PermitType, PermitStatus, InvoiceStatus, ContractorStatus, ContractorGrade } from '../types';

export const COMPANY_TYPE_CONFIG: Record<CompanyType, { fa: string; icon: string }> = {
  manufacturing: { fa: 'تولیدی', icon: 'Factory' },
  trading: { fa: 'بازرگانی', icon: 'Store' },
  service: { fa: 'خدماتی', icon: 'Settings' },
  logistics: { fa: 'لجستیک', icon: 'Truck' },
};

export const COMPANY_STATUS_CONFIG: Record<CompanyStatus, { fa: string; color: string; bg: string }> = {
  active: { fa: 'فعال', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  suspended: { fa: 'تعلیق', color: 'text-red-700', bg: 'bg-red-50' },
  terminated: { fa: 'خاتمه یافته', color: 'text-slate-600', bg: 'bg-slate-100' },
  pending_onboarding: { fa: 'در انتظار عضویت', color: 'text-amber-700', bg: 'bg-amber-50' },
};

export const SHIPMENT_STATUS_CONFIG: Record<ShipmentStatus, { fa: string; color: string; bg: string }> = {
  draft: { fa: 'پیش‌نویس', color: 'text-slate-600', bg: 'bg-slate-100' },
  pending_approval: { fa: 'در انتظار تأیید', color: 'text-amber-700', bg: 'bg-amber-50' },
  approved: { fa: 'تأیید شده', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  scheduled: { fa: 'زمان‌بندی شده', color: 'text-blue-700', bg: 'bg-blue-50' },
  arrived: { fa: 'رسیده', color: 'text-teal-700', bg: 'bg-teal-50' },
  weighing: { fa: 'در حال توزین', color: 'text-purple-700', bg: 'bg-purple-50' },
  unloading: { fa: 'در حال تخلیه', color: 'text-indigo-700', bg: 'bg-indigo-50' },
  completed: { fa: 'تکمیل شده', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  rejected: { fa: 'رد شده', color: 'text-red-700', bg: 'bg-red-50' },
  cancelled: { fa: 'لغو شده', color: 'text-slate-500', bg: 'bg-slate-50' },
};

export const PERMIT_TYPE_CONFIG: Record<PermitType, { fa: string; icon: string }> = {
  operating: { fa: 'پروانه بهره‌برداری', icon: 'FileCheck' },
  environmental: { fa: 'مجوز محیط زیست', icon: 'Leaf' },
  fire_safety: { fa: 'گواهینامه آتش‌نشانی', icon: 'Flame' },
  transport: { fa: 'مجوز حمل‌ونقل', icon: 'Truck' },
  construction: { fa: 'مجوز ساخت‌وساز', icon: 'Building' },
};

export const PERMIT_STATUS_CONFIG: Record<PermitStatus, { fa: string; color: string; bg: string; daysWarning: number }> = {
  valid: { fa: 'معتبر', color: 'text-emerald-700', bg: 'bg-emerald-50', daysWarning: 30 },
  expiring_soon: { fa: 'در حال انقضا', color: 'text-amber-700', bg: 'bg-amber-50', daysWarning: 7 },
  expired: { fa: 'منقضی', color: 'text-red-700', bg: 'bg-red-50', daysWarning: 0 },
  suspended: { fa: 'تعلیق', color: 'text-slate-600', bg: 'bg-slate-100', daysWarning: 0 },
};

export const INVOICE_STATUS_CONFIG: Record<InvoiceStatus, { fa: string; color: string; bg: string }> = {
  draft: { fa: 'پیش‌نویس', color: 'text-slate-600', bg: 'bg-slate-100' },
  pending_approval: { fa: 'در انتظار تأیید', color: 'text-amber-700', bg: 'bg-amber-50' },
  approved: { fa: 'تأیید شده', color: 'text-blue-700', bg: 'bg-blue-50' },
  paid: { fa: 'پرداخت شده', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  overdue: { fa: 'سررسید گذشته', color: 'text-red-700', bg: 'bg-red-50' },
  cancelled: { fa: 'لغو شده', color: 'text-slate-500', bg: 'bg-slate-50' },
};

export const CONTRACTOR_STATUS_CONFIG: Record<ContractorStatus, { fa: string; color: string; bg: string }> = {
  active: { fa: 'فعال', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  suspended: { fa: 'مسدود', color: 'text-red-700', bg: 'bg-red-50' },
  pending_verification: { fa: 'در انتظار تأیید', color: 'text-amber-700', bg: 'bg-amber-50' },
  offboarded: { fa: 'خارج شده', color: 'text-slate-600', bg: 'bg-slate-100' },
};

export const GRADE_CONFIG: Record<ContractorGrade, { fa: string; color: string; bg: string }> = {
  A: { fa: 'عالی', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  B: { fa: 'خوب', color: 'text-blue-700', bg: 'bg-blue-50' },
  C: { fa: 'متوسط', color: 'text-amber-700', bg: 'bg-amber-50' },
  D: { fa: 'ضعیف', color: 'text-orange-700', bg: 'bg-orange-50' },
  F: { fa: 'مردود', color: 'text-red-700', bg: 'bg-red-50' },
};

export const KPI_THRESHOLDS = {
  hseScore: { excellent: 90, good: 70, warning: 50, critical: 30 },
  permitExpiry: { warningDays: 30, criticalDays: 7 },
  shipmentProcessing: { targetMinutes: 45, warningMinutes: 90 },
  contractorKPI: { gradeA: 90, gradeB: 75, gradeC: 60, gradeD: 40 },
  weightDiscrepancy: { acceptablePercent: 2, warningPercent: 5, criticalPercent: 10 },
};

export const DOCK_OPTIONS = [
  { id: 'dock-1', name: 'دوک ۱', capacity: 50, cargoTypes: ['all'] },
  { id: 'dock-2', name: 'دوک ۲', capacity: 30, cargoTypes: ['hazmat'] },
  { id: 'dock-3', name: 'دوک ۳', capacity: 40, cargoTypes: ['all'] },
  { id: 'dock-4', name: 'دوک ۴', capacity: 60, cargoTypes: ['bulk'] },
  { id: 'dock-5', name: 'دوک ۵', capacity: 35, cargoTypes: ['refrigerated'] },
];

export const WORKFLOW_TRIGGERS = [
  {
    when: { entity: 'shipment', action: 'approved' },
    then: [
      { action: 'scheduling.auto_assign_slot' },
      { action: 'notification.sms', template: 'slot_assigned' },
      { action: 'notification.push', template: 'shipment_approved' },
    ],
  },
  {
    when: { entity: 'shipment', action: 'completed' },
    then: [
      { action: 'finance.pre_invoice' },
      { action: 'notification.push', template: 'shipment_completed' },
    ],
  },
  {
    when: { entity: 'permit', action: 'expiring' },
    then: [
      { action: 'notification.email', template: 'permit_expiry_30d' },
      { action: 'workflow.create_task', assignTo: 'company_admin' },
    ],
  },
];
