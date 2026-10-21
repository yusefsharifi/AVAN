// Persian text constants to avoid esbuild parsing issues with Unicode in strings
export const PERSIAN = {
  // Status labels
  status: {
    pending: "در انتظار",
    verified: "تأیید شده",
    rejected: "رد شده",
    inProgress: "در حال پردازش",
    drafted: "پیش‌نویس",
  },

  // Step labels
  steps: {
    technical: "تأیید فنی",
    manager: "تأیید مدیر",
    security: "بررسی امنیتی",
    gate: "کنترل گیت",
    completion: "تکمیل",
  },

  // Common UI text
  ui: {
    noItems: "موردی برای تأیید وجود ندارد.",
    allMatched: "مطابق (همه)",
    needsRecheck: "نیاز به بررسی مجدد",
    allMismatched: "عدم تطابق (همه)",
    approvedBy: "تأییدشده توسط: ",
    onDate: "در تاریخ: ",
    rejectionReason: "دلیل رد: ",
    quickActions: "عملیات سریع",
    backToStep: "بازگشت به مرحله",
    sendReminder: "ارسال یادآوری",
    generateReport: "ساخت گزارش",
    filters: "فیلترها",
    emptyExit: "خروج خالی",
    registerEmptyExit: "ثبت خروج خالی",
    dailyReport: "گزارش روزانه",
    totalWeightReport: "گزارش کلی وزن",
    reports: "گزارش‌گیری",
    verifyStep: "تأیید ",
    verifyItem: "تأیید کالا",
    quantity: "دسته: ",
    weight: "وزن: ",
    price: "قیمت: ",
    barcode: "بارکد: ",
    edit: "ویرایش",
    delete: "حذف",
    matched: "مطابق",
    mismatched: "عدم تطابق",
    discrepancy: "مغایرت: ",
    unknown: "—",
    noData: "ندارد",
    allVerified: "تکمیل شده",
    pendingVerification: "در انتظار تأیید",
    inProcess: "در حال پردازش",
    completed: "تکمیل",
    rejected: "رد شده",
  },

  // Item categories
  categories: {
    rawMaterial: "مواد اولیه",
    finishedProduct: "محصول نهایی",
    chemicals: "مواد شیمی",
    equipment: "تجهیزات",
    other: "سایر",
  },

  // Units
  units: {
    kg: "کیلوگرم",
    ton: "تن",
    piece: "عدد",
    liter: "لیتر",
  },

  // Quick actions
  actions: {
    backToStep: "بازگشت به مرحله",
    sendReminder: "ارسال یادآوری",
    generateReport: "ساخت گزارش",
    filter: "فیلترها",
  },
};

// Helper to get text
export function t(key: string): string {
  const keys = key.split(".");
  let value: any = PERSIAN;
  for (const k of keys) {
    value = value?.[k];
  }
  return value || key;
}