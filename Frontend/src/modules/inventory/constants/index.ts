import type { WarehouseType, WarehouseStatus, ZoneType, LocationStatus, UnitOfMeasure, ABCClass, ItemStatus, LotStatus, MovementType, GRNStatus, MRStatus, DOStatus, CountType, CountSessionStatus } from '../types';

export const WAREHOUSE_TYPE_CONFIG: Record<WarehouseType, { fa: string; icon: string; color: string }> = {
  raw_material: { fa: 'مواد اولیه', icon: 'Package', color: 'bg-blue-50 text-blue-700' },
  finished_goods: { fa: 'محصول نهایی', icon: 'CheckCircle', color: 'bg-emerald-50 text-emerald-700' },
  spare_parts: { fa: 'قطعات یدکی', icon: 'Wrench', color: 'bg-amber-50 text-amber-700' },
  hazmat: { fa: 'مواد خطرناک', icon: 'AlertTriangle', color: 'bg-red-50 text-red-700' },
  cold_storage: { fa: 'سردخانه', icon: 'Thermometer', color: 'bg-cyan-50 text-cyan-700' },
  cross_dock: { fa: 'کراس‌داک', icon: 'ArrowLeftRight', color: 'bg-indigo-50 text-indigo-700' },
};

export const WAREHOUSE_STATUS_CONFIG: Record<WarehouseStatus, { fa: string; color: string; bg: string }> = {
  active: { fa: 'فعال', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  full: { fa: 'پر', color: 'text-red-700', bg: 'bg-red-50' },
  maintenance: { fa: 'تعمیرات', color: 'text-amber-700', bg: 'bg-amber-50' },
  closed: { fa: 'بسته', color: 'text-slate-600', bg: 'bg-slate-100' },
};

export const ZONE_TYPE_CONFIG: Record<ZoneType, { fa: string }> = {
  receiving: { fa: 'دریافت' },
  putaway: { fa: 'جایگذاری' },
  bulk: { fa: 'انبار عمده' },
  picking: { fa: 'picked' },
  quarantine: { fa: 'قرنطینه' },
  returns: { fa: 'مرجوعی' },
  cross_dock: { fa: 'کراس‌داک' },
  bulk_storage: { fa: 'انبار فله' },
  rack_storage: { fa: 'انبار قفسه‌ای' },
  hazmat: { fa: 'مواد خطرناک' },
  cold_room: { fa: 'اتاق سرد' },
};

export const LOCATION_STATUS_CONFIG: Record<LocationStatus, { fa: string; color: string; bg: string }> = {
  empty: { fa: 'خالی', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  occupied: { fa: 'اشغال', color: 'text-amber-700', bg: 'bg-amber-50' },
  reserved: { fa: 'رزرو شده', color: 'text-blue-700', bg: 'bg-blue-50' },
  blocked: { fa: 'مسدود', color: 'text-red-700', bg: 'bg-red-50' },
};

export const UOM_CONFIG: Record<UnitOfMeasure, { fa: string; baseUnit: UnitOfMeasure; factor: number }> = {
  kg: { fa: 'کیلوگرم', baseUnit: 'kg', factor: 1 },
  ton: { fa: 'تن', baseUnit: 'kg', factor: 1000 },
  meter: { fa: 'متر', baseUnit: 'meter', factor: 1 },
  piece: { fa: 'عدد', baseUnit: 'piece', factor: 1 },
  liter: { fa: 'لیتر', baseUnit: 'liter', factor: 1 },
  box: { fa: 'جعبه', baseUnit: 'piece', factor: 24 },
  pallet: { fa: 'پالت', baseUnit: 'piece', factor: 48 },
  roll: { fa: 'رول', baseUnit: 'meter', factor: 50 },
  drum: { fa: 'بشکه', baseUnit: 'liter', factor: 200 },
};

export const ABC_CONFIG: Record<ABCClass, { fa: string; color: string; bg: string; countFrequency: string }> = {
  A: { fa: 'کلاس A', color: 'text-red-700', bg: 'bg-red-50', countFrequency: 'ماهانه' },
  B: { fa: 'کلاس B', color: 'text-amber-700', bg: 'bg-amber-50', countFrequency: 'فصلی' },
  C: { fa: 'کلاس C', color: 'text-slate-600', bg: 'bg-slate-100', countFrequency: 'سالانه' },
};

export const ITEM_STATUS_CONFIG: Record<ItemStatus, { fa: string; color: string; bg: string }> = {
  active: { fa: 'فعال', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  pending: { fa: 'در انتظار', color: 'text-amber-700', bg: 'bg-amber-50' },
  inactive: { fa: 'غیرفعال', color: 'text-slate-600', bg: 'bg-slate-100' },
  blocked: { fa: 'مسدود', color: 'text-red-700', bg: 'bg-red-50' },
  obsolete: { fa: 'منسوخ', color: 'text-slate-500', bg: 'bg-slate-50' },
  quarantine: { fa: 'قرنطینه', color: 'text-amber-700', bg: 'bg-amber-50' },
};

export const LOT_STATUS_CONFIG: Record<LotStatus, { fa: string; color: string; bg: string }> = {
  available: { fa: 'موجود', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  reserved: { fa: 'رزرو شده', color: 'text-blue-700', bg: 'bg-blue-50' },
  quarantine: { fa: 'قرنطینه', color: 'text-amber-700', bg: 'bg-amber-50' },
  expired: { fa: 'منقضی', color: 'text-red-700', bg: 'bg-red-50' },
  consumed: { fa: 'مصرف شده', color: 'text-slate-500', bg: 'bg-slate-50' },
};

export const MOVEMENT_TYPE_CONFIG: Record<MovementType, { fa: string; direction: 'in' | 'out' | 'internal' }> = {
  receipt: { fa: 'رسید', direction: 'in' },
  issue: { fa: 'حواله', direction: 'out' },
  transfer: { fa: 'انتقال', direction: 'internal' },
  return_vendor: { fa: 'مرجوعی به تأمین‌کننده', direction: 'out' },
  return_customer: { fa: 'مرجوعی مشتری', direction: 'in' },
  adjustment: { fa: 'تصحیح', direction: 'internal' },
  scrap: { fa: 'ضایعات', direction: 'out' },
  cycle_count: { fa: 'شمارش', direction: 'internal' },
  production_consumption: { fa: 'مصرف تولید', direction: 'out' },
  production_output: { fa: 'خروجی تولید', direction: 'in' },
};

export const GRN_STATUS_CONFIG: Record<GRNStatus, { fa: string; color: string; bg: string }> = {
  pending_inspection: { fa: 'در انتظار بازرسی', color: 'text-amber-700', bg: 'bg-amber-50' },
  inspecting: { fa: 'در حال بازرسی', color: 'text-blue-700', bg: 'bg-blue-50' },
  accepted: { fa: 'پذیرفته شده', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  partially_accepted: { fa: 'پذیرش جزئی', color: 'text-amber-700', bg: 'bg-amber-50' },
  rejected: { fa: 'رد شده', color: 'text-red-700', bg: 'bg-red-50' },
  putaway_completed: { fa: 'جایگذاری تکمیل', color: 'text-emerald-700', bg: 'bg-emerald-50' },
};

export const MR_STATUS_CONFIG: Record<MRStatus, { fa: string; color: string; bg: string }> = {
  draft: { fa: 'پیش‌نویس', color: 'text-slate-600', bg: 'bg-slate-100' },
  pending_approval: { fa: 'در انتظار تأیید', color: 'text-amber-700', bg: 'bg-amber-50' },
  approved: { fa: 'تأیید شده', color: 'text-blue-700', bg: 'bg-blue-50' },
  picking: { fa: 'در حال انتخاب', color: 'text-purple-700', bg: 'bg-purple-50' },
  picked: { fa: 'انتخاب شده', color: 'text-indigo-700', bg: 'bg-indigo-50' },
  issued: { fa: 'صادر شده', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  partially_issued: { fa: 'صادر جزئی', color: 'text-amber-700', bg: 'bg-amber-50' },
  rejected: { fa: 'رد شده', color: 'text-red-700', bg: 'bg-red-50' },
};

export const DO_STATUS_CONFIG: Record<DOStatus, { fa: string; color: string; bg: string }> = {
  pending: { fa: 'در انتظار', color: 'text-slate-600', bg: 'bg-slate-100' },
  picking: { fa: 'در حال انتخاب', color: 'text-purple-700', bg: 'bg-purple-50' },
  picked: { fa: 'انتخاب شده', color: 'text-indigo-700', bg: 'bg-indigo-50' },
  packing: { fa: 'در حال بسته‌بندی', color: 'text-blue-700', bg: 'bg-blue-50' },
  packed: { fa: 'بسته‌بندی شده', color: 'text-cyan-700', bg: 'bg-cyan-50' },
  ready_to_ship: { fa: 'آماده ارسال', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  shipped: { fa: 'ارسال شده', color: 'text-blue-700', bg: 'bg-blue-50' },
  delivered: { fa: 'تحویل شده', color: 'text-emerald-700', bg: 'bg-emerald-50' },
};

export const COUNT_TYPE_CONFIG: Record<CountType, { fa: string }> = {
  abc_based: { fa: 'بر اساس ABC' },
  zone_based: { fa: 'بر اساس ناحیه' },
  item_based: { fa: 'بر اساس کالا' },
  blind_count: { fa: 'شمارش کور' },
  full_physical: { fa: 'انبارگردانی کامل' },
};

export const COUNT_STATUS_CONFIG: Record<CountSessionStatus, { fa: string; color: string; bg: string }> = {
  scheduled: { fa: 'زمان‌بندی شده', color: 'text-blue-700', bg: 'bg-blue-50' },
  in_progress: { fa: 'در حال اجرا', color: 'text-amber-700', bg: 'bg-amber-50' },
  completed: { fa: 'تکمیل شده', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  recount_required: { fa: 'نیاز به شمارش مجدد', color: 'text-red-700', bg: 'bg-red-50' },
};

export const HAZARD_CLASSES = [
  { code: '1', name: 'مواد منفجره', color: 'text-red-700 bg-red-50' },
  { code: '2.1', name: 'گازهای قابل اشتعال', color: 'text-red-700 bg-red-50' },
  { code: '2.2', name: 'گازهای غیر قابل اشتعال', color: 'text-slate-700 bg-slate-50' },
  { code: '3', name: 'مایعات قابل اشتعال', color: 'text-red-700 bg-red-50' },
  { code: '4.1', name: 'جامدات قابل اشتعال', color: 'text-red-700 bg-red-50' },
  { code: '5.1', name: 'اکسیدکننده‌ها', color: 'text-amber-700 bg-amber-50' },
  { code: '6.1', name: 'سمی', color: 'text-purple-700 bg-purple-50' },
  { code: '8', name: 'خورنده', color: 'text-amber-700 bg-amber-50' },
  { code: '9', name: 'مواد خطرناک مختلف', color: 'text-slate-700 bg-slate-50' },
];

export const VARIANCE_THRESHOLD_PERCENT = 2;
export const VARIANCE_THRESHOLD_AMOUNT = 1000000;
export const SHELF_LIFE_ALERT_PERCENT = 80;
export const SAFETY_STOCK_MULTIPLIER = 1.5;

// ── Additional Constants ─────────────────────────────────────────────────────

export const ITEM_CATEGORY_CONFIG: Record<string, { fa: string; icon: string }> = {
  raw_material: { fa: 'مواد اولیه', icon: 'Package' },
  finished_goods: { fa: 'محصول نهایی', icon: 'CheckCircle' },
  spare_parts: { fa: 'قطعات یدکی', icon: 'Wrench' },
  consumable: { fa: 'مصرفی', icon: 'FileText' },
  packaging: { fa: 'بسته‌بندی', icon: 'Box' },
};

export const ABC_CLASS_CONFIG: Record<string, { fa: string; color: string; bg: string; countFrequency: string }> = {
  A: { fa: 'کلاس A', color: 'text-red-700', bg: 'bg-red-50', countFrequency: 'ماهانه' },
  B: { fa: 'کلاس B', color: 'text-amber-700', bg: 'bg-amber-50', countFrequency: 'فصلی' },
  C: { fa: 'کلاس C', color: 'text-slate-600', bg: 'bg-slate-100', countFrequency: 'سالانه' },
};

export const MR_PRIORITY_CONFIG: Record<string, { fa: string; color: string; bg: string }> = {
  normal: { fa: 'عادی', color: 'text-blue-700', bg: 'bg-blue-50' },
  urgent: { fa: 'فوری', color: 'text-amber-700', bg: 'bg-amber-50' },
  critical: { fa: 'بحرانی', color: 'text-red-700', bg: 'bg-red-50' },
};

export const ABC_FREQUENCY: Record<string, string> = {
  A: 'ماهانه',
  B: 'فصلی',
  C: 'سالانه',
};
