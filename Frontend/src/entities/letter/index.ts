export interface LetterV2 {
  id: string; registryNumber: string;
  direction: 'incoming' | 'outgoing' | 'internal';
  type: 'official' | 'memo' | 'circular' | 'report' | 'instruction' | 'request' | 'response';
  classification: 'unclassified' | 'confidential' | 'restricted';
  priority: 'instant' | 'urgent' | 'normal' | 'low';
  subject: string; referenceLetterId?: string;
  sender: string; senderOrg: string;
  recipients: Array<{ name: string; org: string; action: 'action' | 'info' | 'reference' }>;
  cc: string[]; body: string; closing: string;
  attachments: Array<{ name: string; size: string; description: string }>;
  enclosuresCount: number; signatory: string; signatoryRole: string;
  approvalChain: Array<{ name: string; role: string; type: 'reviewer' | 'approver' | 'signer'; status: 'pending' | 'approved' | 'rejected' | 'returned'; date?: string; comment?: string }>;
  annotations: LetterAnnotation[];
  status: 'draft' | 'pending-approval' | 'approved' | 'sent' | 'dispatched' | 'archived';
  dispatchRecord?: DispatchRecord; archiveLocation?: ArchiveLocation;
  createdAt: string; updatedAt: string; responseDeadline?: string; slaHours: number; registryYear: number;
  qrHash?: string;
}

export interface LetterAnnotation {
  id: string; author: string; date: string; text: string; color: string;
}

export interface DispatchRecord {
  method: 'hand' | 'post' | 'courier' | 'fax' | 'email';
  trackingNumber?: string; dispatcher: string; timestamp: string; receivedBy?: string;
}

export interface ArchiveLocation {
  box: string; folder: string; shelf: string; physicalReceived: boolean; scanUploaded: boolean;
}

export const LETTER_TYPES = ["رسمی", "اداری", "درخواست", "اطلاعیه", "حقوقی"];

export const PRIORITY_CFG: Record<string, { fa: string; dot: string; text: string; bg: string }> = {
  urgent: { fa: "فوری", dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50" },
  important: { fa: "مهم", dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
  normal: { fa: "عادی", dot: "bg-slate-400", text: "text-slate-600", bg: "bg-slate-100" },
  info: { fa: "اطلاعاتی", dot: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50" },
};

export const SIGNATURE_CFG: Record<string, { fa: string; text: string; bg: string; emoji: string }> = {
  signed: { fa: "امضاشده", text: "text-emerald-700", bg: "bg-emerald-50", emoji: "✅" },
  pending: { fa: "در انتظار امضا", text: "text-amber-700", bg: "bg-amber-50", emoji: "⏳" },
  rejected: { fa: "رد شده", text: "text-red-700", bg: "bg-red-50", emoji: "❌" },
  unsigned: { fa: "بدون امضا", text: "text-slate-600", bg: "bg-slate-100", emoji: "🔓" },
};

export interface ApprovalStep { name: string; person: string; date?: string; state: "done" | "current" | "pending"; comment?: string; }
export interface ThreadMsg { id: string; author: string; org: string; date: string; type: string; body: string; signature: keyof typeof SIGNATURE_CFG; }
export interface Letter {
  id: string; number: string; subject: string; preview: string;
  senderName: string; senderOrg: string; recipients: string[]; cc: string[];
  date: string; relDate: string; priority: keyof typeof PRIORITY_CFG; type: string;
  status: "inbox" | "inprogress" | "done" | "draft" | "referred" | "archived";
  starred: boolean; unread: boolean; stepCurrent: number; stepTotal: number;
  signatureStatus: keyof typeof SIGNATURE_CFG;
  approvalSteps: ApprovalStep[]; thread: ThreadMsg[];
}

export const LETTERS: Letter[] = [
  {
    id: "L-1", number: "۱۴۰۳/۱۲۴۵", subject: "درخواست تمدید مجوز فعالیت واحد A-12", preview: "با احترام، به استحضار می‌رساند مجوز فعالیت این واحد در تاریخ ۱۴۰۳/۰۶/۳۱ منقضی می‌گردد...",
    senderName: "علیرضا صادقی", senderOrg: "شرکت پلاستیک ایران", recipients: ["مدیریت شهرک کاوه"], cc: ["واحد HSE"],
    date: "۱۴۰۳/۰۴/۱۵", relDate: "امروز", priority: "urgent", type: "درخواست", status: "inbox",
    starred: true, unread: true, stepCurrent: 2, stepTotal: 4, signatureStatus: "pending",
    approvalSteps: [
      { name: "ثبت اولیه", person: "علیرضا صادقی", date: "۱۴۰۳/۰۴/۱۵", state: "done" },
      { name: "بررسی کارشناس", person: "مریم رضایی", date: "۱۴۰۳/۰۴/۱۵", state: "current", comment: "در حال بررسی مدارک پیوست" },
      { name: "تأیید مدیر شهرک", person: "احمد کریمی", state: "pending" },
      { name: "صدور مجوز", person: "دبیرخانه", state: "pending" },
    ],
    thread: [
      { id: "t1", author: "علیرضا صادقی", org: "پلاستیک ایران", date: "۱۴۰۳/۰۴/۱۵ ۰۹:۱۰", type: "نامه اصلی", body: "درخواست تمدید مجوز فعالیت واحد A-12 به پیوست ارسال می‌گردد.", signature: "signed" },
      { id: "t2", author: "مریم رضایی", org: "مدیریت شهرک", date: "۱۴۰۳/۰۴/۱۵ ۱۴:۲۰", type: "ارجاع", body: "جهت بررسی کارشناسی به واحد فنی ارجاع داده شد.", signature: "unsigned" },
    ],
  },
  {
    id: "L-2", number: "۱۴۰۳/۱۲۳۹", subject: "اطلاعیه قطعی برنامه‌ریزی‌شده برق بلوک B", preview: "به اطلاع کلیه واحدهای محترم بلوک B می‌رساند به دلیل تعمیرات...",
    senderName: "واحد تأسیسات", senderOrg: "مدیریت شهرک کاوه", recipients: ["کلیه واحدهای بلوک B"], cc: [],
    date: "۱۴۰۳/۰۴/۱۴", relDate: "دیروز", priority: "important", type: "اطلاعیه", status: "inprogress",
    starred: false, unread: true, stepCurrent: 1, stepTotal: 2, signatureStatus: "signed",
    approvalSteps: [
      { name: "صدور اطلاعیه", person: "واحد تأسیسات", date: "۱۴۰۳/۰۴/۱۴", state: "done" },
      { name: "ابلاغ به واحدها", person: "دبیرخانه", state: "current" },
    ],
    thread: [{ id: "t1", author: "واحد تأسیسات", org: "مدیریت شهرک", date: "۱۴۰۳/۰۴/۱۴ ۱۰:۰۰", type: "نامه اصلی", body: "قطعی برق بلوک B در تاریخ ۱۴۰۳/۰۴/۱۸ از ساعت ۹ الی ۱۳.", signature: "signed" }],
  },
  {
    id: "L-3", number: "۱۴۰۳/۱۲۳۰", subject: "تأیید نهایی صورتحساب خدمات خرداد ماه", preview: "پیرو مکاتبات قبلی، صورتحساب خدمات ماهانه مورد تأیید نهایی قرار گرفت...",
    senderName: "واحد مالی", senderOrg: "مدیریت شهرک کاوه", recipients: ["صنایع فولاد البرز"], cc: ["واحد حسابداری"],
    date: "۱۴۰۳/۰۴/۱۰", relDate: "۵ روز پیش", priority: "normal", type: "اداری", status: "done",
    starred: false, unread: false, stepCurrent: 4, stepTotal: 4, signatureStatus: "signed",
    approvalSteps: [
      { name: "ثبت اولیه", person: "واحد مالی", date: "۱۴۰۳/۰۴/۰۸", state: "done" },
      { name: "بررسی حسابداری", person: "حسین کاظمی", date: "۱۴۰۳/۰۴/۰۹", state: "done" },
      { name: "تأیید مدیر مالی", person: "زهرا امینی", date: "۱۴۰۳/۰۴/۱۰", state: "done" },
      { name: "بایگانی", person: "دبیرخانه", date: "۱۴۰۳/۰۴/۱۰", state: "done" },
    ],
    thread: [{ id: "t1", author: "واحد مالی", org: "مدیریت شهرک", date: "۱۴۰۳/۰۴/۰۸ ۱۱:۰۰", type: "نامه اصلی", body: "صورتحساب خدمات خرداد ماه جهت تأیید ارسال می‌گردد.", signature: "signed" }],
  },
  {
    id: "L-4", number: "۱۴۰۳/۱۲۴۸", subject: "پیش‌نویس نامه به سازمان صنایع کوچک", preview: "در حال تکمیل — گزارش عملکرد سه‌ماهه شهرک صنعتی...",
    senderName: "احمد کریمی", senderOrg: "مدیریت شهرک کاوه", recipients: ["سازمان صنایع کوچک"], cc: [],
    date: "۱۴۰۳/۰۴/۱۶", relDate: "امروز", priority: "normal", type: "رسمی", status: "draft",
    starred: false, unread: false, stepCurrent: 0, stepTotal: 3, signatureStatus: "unsigned",
    approvalSteps: [{ name: "پیش‌نویس", person: "احمد کریمی", date: "۱۴۰۳/۰۴/۱۶", state: "current" }],
    thread: [],
  },
  {
    id: "L-5", number: "۱۴۰۳/۱۲۳۶", subject: "ارجاع بررسی گزارش حادثه انبار مواد شیمیایی", preview: "با توجه به گزارش ثبت‌شده در سامانه حراست، موضوع جهت بررسی...",
    senderName: "واحد HSE", senderOrg: "مدیریت شهرک کاوه", recipients: ["واحد ایمنی پتروشیمی پارس"], cc: ["حراست"],
    date: "۱۴۰۳/۰۴/۱۲", relDate: "۳ روز پیش", priority: "urgent", type: "حقوقی", status: "referred",
    starred: true, unread: false, stepCurrent: 2, stepTotal: 3, signatureStatus: "rejected",
    approvalSteps: [
      { name: "ثبت گزارش", person: "واحد HSE", date: "۱۴۰۳/۰۴/۱۲", state: "done" },
      { name: "ارجاع به شرکت", person: "واحد HSE", date: "۱۴۰۳/۰۴/۱۲", state: "done" },
      { name: "پاسخ شرکت", person: "پتروشیمی پارس", state: "current", comment: "مستندات ناقص — نیاز به تکمیل" },
    ],
    thread: [
      { id: "t1", author: "واحد HSE", org: "مدیریت شهرک", date: "۱۴۰۳/۰۴/۱۲ ۰۸:۳۰", type: "نامه اصلی", body: "گزارش حادثه انبار مواد شیمیایی جهت بررسی و اقدام ارسال می‌شود.", signature: "signed" },
      { id: "t2", author: "پتروشیمی پارس", org: "واحد ایمنی", date: "۱۴۰۳/۰۴/۱۳ ۱۶:۴۵", type: "پاسخ", body: "مستندات درخواستی در دست تهیه است و ظرف ۴۸ ساعت ارسال می‌شود.", signature: "rejected" },
    ],
  },
  {
    id: "L-6", number: "۱۴۰۳/۱۱۹۸", subject: "بایگانی صورت‌جلسه شورای مدیران شهرک", preview: "صورت‌جلسه شورای مدیران مورخ خرداد ماه جهت بایگانی ارسال می‌گردد...",
    senderName: "دبیرخانه", senderOrg: "مدیریت شهرک کاوه", recipients: ["بایگانی مرکزی"], cc: [],
    date: "۱۴۰۳/۰۳/۲۸", relDate: "۲ هفته پیش", priority: "info", type: "اداری", status: "archived",
    starred: false, unread: false, stepCurrent: 2, stepTotal: 2, signatureStatus: "signed",
    approvalSteps: [
      { name: "تنظیم صورت‌جلسه", person: "دبیرخانه", date: "۱۴۰۳/۰۳/۲۷", state: "done" },
      { name: "بایگانی نهایی", person: "دبیرخانه", date: "۱۴۰۳/۰۳/۲۸", state: "done" },
    ],
    thread: [],
  },
  {
    id: "L-7", number: "۱۴۰۳/۱۲۴۲", subject: "درخواست نصب تابلوی تبلیغاتی جدید", preview: "احتراماً درخواست می‌گردد نسبت به صدور مجوز نصب تابلو در محوطه...",
    senderName: "فرید نجفی", senderOrg: "پتروشیمی پارس", recipients: ["مدیریت شهرک کاوه"], cc: [],
    date: "۱۴۰۳/۰۴/۱۳", relDate: "۲ روز پیش", priority: "normal", type: "درخواست", status: "inbox",
    starred: false, unread: true, stepCurrent: 1, stepTotal: 3, signatureStatus: "unsigned",
    approvalSteps: [
      { name: "ثبت درخواست", person: "فرید نجفی", date: "۱۴۰۳/۰۴/۱۳", state: "done" },
      { name: "بررسی شهرسازی", person: "واحد فنی", state: "current" },
      { name: "تأیید نهایی", person: "احمد کریمی", state: "pending" },
    ],
    thread: [{ id: "t1", author: "فرید نجفی", org: "پتروشیمی پارس", date: "۱۴۰۳/۰۴/۱۳ ۱۰:۱۵", type: "نامه اصلی", body: "درخواست نصب تابلوی تبلیغاتی در ورودی واحد به پیوست ارسال می‌گردد.", signature: "unsigned" }],
  },
];

export const LETTERS_V2: LetterV2[] = [
  {
    id: "LV2-1", registryNumber: "KVH-1403/O/0001", direction: "incoming", type: "official", classification: "unclassified",
    priority: "urgent", subject: "درخواست تمدید مجوز فعالیت واحد A-12", referenceLetterId: undefined,
    sender: "علیرضا صادقی", senderOrg: "شرکت پلاستیک ایران",
    recipients: [{ name: "مدیریت شهرک کاوه", org: "مدیریت شهرک", action: "action" }],
    cc: ["واحد HSE"], body: "با احترام، به استحضار می‌رساند مجوز فعالیت این واحد در تاریخ ۱۴۰۳/۰۶/۳۱ منقضی می‌گردد. خواهشمند است دستور فرمایید نسبت به تمدید مجوز اقدام لازم مبذول گردد.", closing: "با احترام",
    attachments: [{ name: "رونوشت مجوز.pdf", size: "1.2 MB", description: "رونوشت مجوز فعلی" }, { name: "فرم درخواست.docx", size: "250 KB", description: "فرم تکمیل‌شده" }],
    enclosuresCount: 2, signatory: "علیرضا صادقی", signatoryRole: "مدیر واحد",
    approvalChain: [
      { name: "ثبت اولیه", role: "دبیرخانه", type: "reviewer", status: "approved", date: "۱۴۰۳/۰۴/۱۵" },
      { name: "بررسی کارشناس", role: "کارشناس", type: "reviewer", status: "approved", date: "۱۴۰۳/۰۴/۱۵", comment: "مدارک کامل است" },
      { name: "تأیید مدیر شهرک", role: "مدیر", type: "approver", status: "pending" },
      { name: "صدور مجوز", role: "دبیرخانه", type: "signer", status: "pending" },
    ],
    annotations: [{ id: "a1", author: "مریم رضایی", date: "۱۴۰۳/۰۴/۱۵", text: "مدارک پیوست بررسی شد - کامل است", color: "#dcfce7" }],
    status: "pending-approval", createdAt: "۱۴۰۳/۰۴/۱۵", updatedAt: "۱۴۰۳/۰۴/۱۵",
    responseDeadline: "۱۴۰۳/۰۴/۲۲", slaHours: 168, registryYear: 1403,
    dispatchRecord: { method: "courier", trackingNumber: "PK-98765", dispatcher: "پیک شرکت", timestamp: "۱۴۰۳/۰۴/۱۵ ۰۹:۰۰", receivedBy: "واحد دریافت" },
  },
  {
    id: "LV2-2", registryNumber: "KVH-1403/C/0002", direction: "outgoing", type: "circular", classification: "unclassified",
    priority: "normal", subject: "اطلاعیه قطعی برنامه‌ریزی‌شده برق بلوک B",
    sender: "واحد تأسیسات", senderOrg: "مدیریت شهرک کاوه",
    recipients: [{ name: "کلیه واحدهای بلوک B", org: "شهرک صنعتی", action: "info" }],
    cc: [], body: "به اطلاع کلیه واحدهای محترم بلوک B می‌رساند به دلیل تعمیرات شبکه برق، قطعی برنامه‌ریزی‌شده در تاریخ ۱۴۰۳/۰۴/۱۸ از ساعت ۹ الی ۱۳ خواهیم داشت.", closing: "با تشکر",
    attachments: [], enclosuresCount: 0, signatory: "واحد تأسیسات", signatoryRole: "مدیر تأسیسات",
    approvalChain: [
      { name: "صدور اطلاعیه", role: "تأسیسات", type: "approver", status: "approved", date: "۱۴۰۳/۰۴/۱۴" },
      { name: "ابلاغ به واحدها", role: "دبیرخانه", type: "reviewer", status: "pending" },
    ],
    annotations: [], status: "approved", createdAt: "۱۴۰۳/۰۴/۱۴", updatedAt: "۱۴۰۳/۰۴/۱۴",
    slaHours: 48, registryYear: 1403,
  },
  {
    id: "LV2-3", registryNumber: "KVH-1403/M/0003", direction: "outgoing", type: "memo", classification: "unclassified",
    priority: "normal", subject: "تأیید نهایی صورتحساب خدمات خرداد ماه",
    sender: "واحد مالی", senderOrg: "مدیریت شهرک کاوه",
    recipients: [{ name: "صنایع فولاد البرز", org: "فولاد البرز", action: "action" }],
    cc: ["واحد حسابداری"], body: "پیرو مکاتبات قبلی، صورتحساب خدمات ماهانه مورد تأیید نهایی قرار گرفت. خواهشمند است نسبت به واریز مبلغ مندرج اقدام فرمایید.", closing: "با احترام",
    attachments: [{ name: "صورتحساب.xlsx", size: "340 KB", description: "صورتحساب تفصیلی" }],
    enclosuresCount: 1, signatory: "زهرا امینی", signatoryRole: "مدیر مالی",
    approvalChain: [
      { name: "ثبت اولیه", role: "مالی", type: "reviewer", status: "approved", date: "۱۴۰۳/۰۴/۰۸" },
      { name: "بررسی حسابداری", role: "حسابداری", type: "reviewer", status: "approved", date: "۱۴۰۳/۰۴/۰۹" },
      { name: "تأیید مدیر مالی", role: "مدیر مالی", type: "approver", status: "approved", date: "۱۴۰۳/۰۴/۱۰" },
      { name: "بایگانی", role: "دبیرخانه", type: "reviewer", status: "approved", date: "۱۴۰۳/۰۴/۱۰" },
    ],
    annotations: [], status: "sent", createdAt: "۱۴۰۳/۰۴/۰۸", updatedAt: "۱۴۰۳/۰۴/۱۰",
    slaHours: 48, registryYear: 1403,
  },
  {
    id: "LV2-4", registryNumber: "KVH-1403/O/0004", direction: "incoming", type: "official", classification: "confidential",
    priority: "instant", subject: "ارجاع بررسی گزارش حادثه انبار مواد شیمیایی",
    sender: "واحد HSE", senderOrg: "مدیریت شهرک کاوه",
    recipients: [{ name: "واحد ایمنی پتروشیمی پارس", org: "پتروشیمی پارس", action: "action" }],
    cc: ["حراست"], body: "با توجه به گزارش ثبت‌شده در سامانه حراست، موضوع جهت بررسی و اقدام اصلاحی ارسال می‌گردد.", closing: "با احترام",
    attachments: [{ name: "گزارش حادثه.pdf", size: "2.1 MB", description: "گزارش کامل حادثه" }],
    enclosuresCount: 1, signatoryRole: "مدیر HSE", signatory: "مدیر HSE",
    approvalChain: [
      { name: "ثبت گزارش", role: "HSE", type: "reviewer", status: "approved", date: "۱۴۰۳/۰۴/۱۲" },
      { name: "ارجاع به شرکت", role: "دبیرخانه", type: "reviewer", status: "approved", date: "۱۴۰۳/۰۴/۱۲" },
      { name: "پاسخ شرکت", role: "پتروشیمی", type: "approver", status: "returned", comment: "مستندات ناقص — نیاز به تکمیل" },
    ],
    annotations: [{ id: "a2", author: "حراست", date: "۱۴۰۳/۰۴/۱۳", text: "пیگیری فوری شود", color: "#fee2e2" }],
    status: "pending-approval", createdAt: "۱۴۰۳/۰۴/۱۲", updatedAt: "۱۴۰۳/۰۴/۱۳",
    responseDeadline: "۱۴۰۳/۰۴/۱۰", slaHours: 72, registryYear: 1403,
    archiveLocation: { box: "B-12", folder: "HSE-2024", shelf: "3-A", physicalReceived: true, scanUploaded: true },
  },
  {
    id: "LV2-5", registryNumber: "KVH-1403/R/0005", direction: "outgoing", type: "report", classification: "unclassified",
    priority: "normal", subject: "گزارش عملکرد سه‌ماهه شهرک صنعتی کاوه",
    sender: "احمد کریمی", senderOrg: "مدیریت شهرک کاوه",
    recipients: [{ name: "سازمان صنایع کوچک", org: "سازمان صنایع", action: "action" }],
    cc: [], body: "گزارش عملکرد سه‌ماهه اول سال ۱۴۰۳ شهرک صنعتی کاوه جهت بررسی و اعلام نظر ارسال می‌گردد.", closing: "با تقدیم احترام",
    attachments: [{ name: "گزارش عملکرد.pdf", size: "4.5 MB", description: "گزارش کامل" }],
    enclosuresCount: 1, signatory: "احمد کریمی", signatoryRole: "مدیر شهرک",
    approvalChain: [
      { name: "تهیه گزارش", role: "اداری", type: "reviewer", status: "pending" },
      { name: "بررسی مدیریت", role: "مدیر", type: "approver", status: "pending" },
      { name: "امضا", role: "مدیر شهرک", type: "signer", status: "pending" },
    ],
    annotations: [], status: "draft", createdAt: "۱۴۰۳/۰۴/۱۶", updatedAt: "۱۴۰۳/۰۴/۱۶",
    slaHours: 24, registryYear: 1403,
  },
  {
    id: "LV2-6", registryNumber: "KVH-1403/I/0006", direction: "internal", type: "instruction", classification: "unclassified",
    priority: "urgent", subject: "دستورالعمل اجرایی پروژه بهسازی معابر",
    sender: "مدیریت شهرک", senderOrg: "مدیریت شهرک کاوه",
    recipients: [{ name: "واحد فنی", org: "مدیریت شهرک", action: "action" }, { name: "واحد لجستیک", org: "مدیریت شهرک", action: "info" }],
    cc: ["حسابداری"], body: "دستورالعمل اجرایی پروژه بهسازی معابر شهرک صنعتی جهت اجرا ابلاغ می‌گردد.", closing: "با احترام",
    attachments: [], enclosuresCount: 0, signatory: "احمد کریمی", signatoryRole: "مدیر شهرک",
    approvalChain: [
      { name: "تهیه دستورالعمل", role: "فنی", type: "reviewer", status: "approved", date: "۱۴۰۳/۰۴/۱۰" },
      { name: "تأیید نهایی", role: "مدیریت", type: "approver", status: "approved", date: "۱۴۰۳/۰۴/۱۱" },
    ],
    annotations: [], status: "sent", createdAt: "۱۴۰۳/۰۴/۱۰", updatedAt: "۱۴۰۳/۰۴/۱۱",
    slaHours: 24, registryYear: 1403,
  },
  {
    id: "LV2-7", registryNumber: "KVH-1403/Q/0007", direction: "incoming", type: "request", classification: "unclassified",
    priority: "normal", subject: "درخواست نصب تابلوی تبلیغاتی جدید",
    sender: "فرید نجفی", senderOrg: "پتروشیمی پارس",
    recipients: [{ name: "مدیریت شهرک کاوه", org: "مدیریت شهرک", action: "action" }],
    cc: [], body: "احتراماً درخواست می‌گردد نسبت به صدور مجوز نصب تابلو در محوطه ورودی واحد اقدام فرمایید.", closing: "با احترام",
    attachments: [{ name: "تصویر طرح.jpg", size: "800 KB", description: "تصویر طرح پیشنهادی" }],
    enclosuresCount: 1, signatory: "فرید نجفی", signatoryRole: "مدیر روابط عمومی",
    approvalChain: [
      { name: "ثبت درخواست", role: "دبیرخانه", type: "reviewer", status: "approved", date: "۱۴۰۳/۰۴/۱۳" },
      { name: "بررسی شهرسازی", role: "فنی", type: "approver", status: "pending" },
      { name: "تأیید نهایی", role: "مدیریت", type: "signer", status: "pending" },
    ],
    annotations: [], status: "pending-approval", createdAt: "۱۴۰۳/۰۴/۱۳", updatedAt: "۱۴۰۳/۰۴/۱۳",
    responseDeadline: "۱۴۰۳/۰۴/۲۰", slaHours: 120, registryYear: 1403,
  },
  {
    id: "LV2-8", registryNumber: "KVH-1403/P/0008", direction: "incoming", type: "response", classification: "unclassified",
    priority: "normal", subject: "پاسخ به استعلام قیمت خدمات نظافتی",
    sender: "شرکت پاکان", senderOrg: "خدمات پاکان",
    recipients: [{ name: "واحد لجستیک", org: "مدیریت شهرک", action: "action" }],
    cc: ["حسابداری"], body: "پاسخ به استعلام شماره KVH-1403/O/0003 — قیمت پیشنهادی خدمات نظافتی ماهانه ارسال می‌گردد.", closing: "با احترام",
    attachments: [{ name: "پیشنهاد قیمت.pdf", size: "500 KB", description: "جدول قیمت‌ها" }],
    enclosuresCount: 1, signatory: "مدیر فروش", signatoryRole: "مدیر فروش",
    approvalChain: [
      { name: "بررسی اولیه", role: "لجستیک", type: "reviewer", status: "pending" },
    ],
    annotations: [], status: "draft", createdAt: "۱۴۰۳/۰۴/۱۷", updatedAt: "۱۴۰۳/۰۴/۱۷",
    slaHours: 48, registryYear: 1403,
  },
];

export interface OrgNode { id: string; kind: "role" | "unit"; x: number; y: number; title: string; person?: string; status?: "active" | "vacant" | "deputy"; headcount?: number; }
export interface OrgEdge { from: string; to: string; kind: "solid" | "dashed"; label?: string; }

export const ORG_NODES: OrgNode[] = [
  { id: "n1", kind: "role", x: 380, y: 30, title: "مدیر شهرک", person: "احمد کریمی", status: "active" },
  { id: "n2", kind: "unit", x: 100, y: 190, title: "واحد لجستیک و انبار", headcount: 8 },
  { id: "n3", kind: "role", x: 380, y: 170, title: "مدیر لجستیک", person: "رضایی محمد", status: "active" },
  { id: "n4", kind: "role", x: 620, y: 170, title: "مدیر HSE", person: "—", status: "vacant" },
  { id: "n5", kind: "role", x: 380, y: 310, title: "سرپرست انبار", person: "علی نجفی", status: "deputy" },
];
export const ORG_EDGES: OrgEdge[] = [
  { from: "n1", to: "n3", kind: "solid", label: "گزارش مستقیم" },
  { from: "n1", to: "n4", kind: "solid", label: "گزارش مستقیم" },
  { from: "n3", to: "n5", kind: "solid" },
  { from: "n3", to: "n2", kind: "dashed", label: "همکاری" },
];
export const ORG_NODE_LIB = [
  { kind: "role", label: "پست سازمانی", emoji: "👤" },
  { kind: "unit", label: "واحد / دپارتمان", emoji: "🏢" },
  { kind: "group", label: "گروه", emoji: "👥" },
  { kind: "external", label: "ارتباط خارجی", emoji: "🔗" },
];
export const ORG_TEMPLATES = ["ساختار خطی", "ماتریسی", "تخت", "سلسله‌مراتبی"];
