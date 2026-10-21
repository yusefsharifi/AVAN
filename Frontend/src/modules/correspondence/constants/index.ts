import type { LetterType, LetterDirection, LetterClassification, LetterPriority, LetterStatus, Permission } from '../types';

// ── Letter Type Config ───────────────────────────────────────────────────────

export const LETTER_TYPE_CONFIG: Record<LetterType, { fa: string; icon: string; code: string }> = {
  official: { fa: 'نامه رسمی', icon: 'FileText', code: 'O' },
  memo: { fa: 'دستورالعمل داخلی', icon: 'ClipboardList', code: 'M' },
  circular: { fa: 'بخشنامه', icon: 'Megaphone', code: 'C' },
  report: { fa: 'گزارش', icon: 'BarChart3', code: 'R' },
  instruction: { fa: 'دستور', icon: 'Command', code: 'I' },
  request: { fa: 'درخواست', icon: 'Send', code: 'Q' },
  response: { fa: 'پاسخ', icon: 'Reply', code: 'P' },
};

export const DIRECTION_CONFIG: Record<LetterDirection, { fa: string; code: string }> = {
  incoming: { fa: 'وارده', code: 'I' },
  outgoing: { fa: 'صادره', code: 'O' },
  internal: { fa: 'داخلی', code: 'M' },
};

export const CLASSIFICATION_CONFIG: Record<LetterClassification, { fa: string; color: string; bg: string; watermark: string }> = {
  unclassified: { fa: 'عادی', color: 'text-slate-600', bg: 'bg-slate-50', watermark: '' },
  confidential: { fa: 'محرمانه', color: 'text-amber-700', bg: 'bg-amber-50', watermark: 'محرمانه' },
  restricted: { fa: 'سری', color: 'text-red-700', bg: 'bg-red-50', watermark: 'سری' },
  secret: { fa: 'فوق‌سری', color: 'text-red-900', bg: 'bg-red-100', watermark: 'فوق‌سری' },
};

export const PRIORITY_CONFIG: Record<LetterPriority, { fa: string; color: string; bg: string; dot: string; order: number }> = {
  instant: { fa: 'خیلی فوری', color: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-500', order: 0 },
  urgent: { fa: 'فوری', color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500', order: 1 },
  normal: { fa: 'عادی', color: 'text-slate-600', bg: 'bg-slate-50', dot: 'bg-slate-400', order: 2 },
  low: { fa: 'کم‌اهمیت', color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-400', order: 3 },
};

export const STATUS_CONFIG: Record<LetterStatus, { fa: string; color: string; bg: string }> = {
  draft: { fa: 'پیش‌نویس', color: 'text-slate-600', bg: 'bg-slate-100' },
  'pending-approval': { fa: 'در انتظار تأیید', color: 'text-amber-700', bg: 'bg-amber-50' },
  approved: { fa: 'تأیید شده', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  sent: { fa: 'ارسال شده', color: 'text-blue-700', bg: 'bg-blue-50' },
  dispatched: { fa: 'ارسال شده', color: 'text-blue-700', bg: 'bg-blue-50' },
  archived: { fa: 'بایگانی شده', color: 'text-slate-500', bg: 'bg-slate-50' },
  returned: { fa: 'برگشت خورده', color: 'text-red-700', bg: 'bg-red-50' },
  referred: { fa: 'ارجاع شده', color: 'text-purple-700', bg: 'bg-purple-50' },
};

export const STEP_STATUS_CONFIG: Record<string, { fa: string; color: string; bg: string; icon: string }> = {
  pending: { fa: 'در انتظار', color: 'text-slate-500', bg: 'bg-slate-100', icon: 'Circle' },
  active: { fa: 'فعال', color: 'text-blue-600', bg: 'bg-blue-50', icon: 'Clock' },
  approved: { fa: 'تأیید شده', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: 'CheckCircle' },
  rejected: { fa: 'رد شده', color: 'text-red-600', bg: 'bg-red-50', icon: 'XCircle' },
  returned: { fa: 'برگشت', color: 'text-amber-600', bg: 'bg-amber-50', icon: 'RotateCcw' },
  skipped: { fa: 'رد شده', color: 'text-slate-400', bg: 'bg-slate-50', icon: 'SkipForward' },
  delegated: { fa: 'واگذار شده', color: 'text-purple-600', bg: 'bg-purple-50', icon: 'UserCheck' },
};

export const CLOSING_OPTIONS = [
  'با احترام',
  'با تقدیم احترام',
  'ارادتمند',
  'با تشکر',
  'موفق باشید',
];

export const CATEGORY_TABS = [
  { id: 'inbox', label: 'دریافتی', icon: 'Inbox' },
  { id: 'outbox', label: 'ارسالی', icon: 'Send' },
  { id: 'draft', label: 'پیش‌نویس', icon: 'FileEdit' },
  { id: 'pending', label: 'در انتظار', icon: 'Clock' },
  { id: 'archive', label: 'بایگانی', icon: 'Archive' },
  { id: 'all', label: 'همه', icon: 'List' },
];

export const ANNOTATION_COLORS = [
  '#dcfce7', '#fef3c7', '#fee2e2', '#dbeafe', '#e9d5ff', '#f3e8ff', '#f0fdf4', '#fef9c3',
];

export const REGISTRY_TYPE_LABELS: Record<string, string> = {
  O: 'صادره رسمی',
  I: 'وارده رسمی',
  M: 'داخلی',
  C: 'بخشنامه',
  R: 'گزارش',
  Q: 'درخواست',
  P: 'پاسخ',
};

export const DISPATCH_METHODS = [
  { id: 'hand', fa: 'تحویل حضوری' },
  { id: 'post', fa: 'پست' },
  { id: 'courier', fa: 'پیک' },
  { id: 'fax', fa: 'فکس' },
  { id: 'email', fa: 'ایمیل' },
];

export const KEYBOARD_SHORTCUTS = {
  'n': 'نامه جدید',
  '/': 'جستجو',
  'Escape': 'بستن',
  's': 'ذخیره',
  'r': 'پاسخ',
  'f': 'بایگانی',
  'e': 'ویرایش',
  'd': 'حذف',
  'a': 'تایید',
  '?': 'راهنما',
};
