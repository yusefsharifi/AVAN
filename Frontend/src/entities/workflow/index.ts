export interface WorkflowNodeV2 {
  id: string;
  type: 'start' | 'end' | 'task' | 'decision' | 'parallel-split' | 'parallel-join' | 'timer' | 'notification';
  x: number; y: number; title: string; assignee?: string; assigneeRole?: string;
  slaHours?: number; formFields?: string[]; notificationTriggers?: string[]; escalationRules?: string[];
}

export interface WorkflowVersion {
  id: string; workflowId: string; version: number; nodes: WorkflowNodeV2[];
  edges: Array<{ from: string; to: string; label?: string; kind?: 'yes' | 'no' | 'default' }>;
  createdBy: string; createdAt: string; changeNote: string; status: 'draft' | 'published' | 'unpublished';
}

export interface InstanceAuditEntry {
  id: string; instanceId: string; nodeId: string; nodeName: string;
  action: string; performedBy: string; performedAt: string; duration?: string;
  annotation?: string; attachments?: string[];
}

export type WFNodeKind = "start" | "end-success" | "end-rejected" | "human" | "approval" | "review" | "automated" | "xor" | "and" | "timer" | "notification" | "api" | "docgen";
export interface WFNode { id: string; kind: WFNodeKind; x: number; y: number; title: string; person?: string; sla?: string; signatureRequired?: boolean; }
export interface WFEdge { from: string; to: string; label?: string; kind?: "default" | "yes" | "no"; }

export const WF_NODES: WFNode[] = [
  { id: "s1", kind: "start", x: 30, y: 190, title: "دریافت بارنامه" },
  { id: "h1", kind: "human", x: 150, y: 150, title: "بررسی اولیه لجستیک", person: "مسئول لجستیک", sla: "۴ ساعت" },
  { id: "g1", kind: "xor", x: 400, y: 170, title: "بار خطرناک؟" },
  { id: "a1", kind: "approval", x: 550, y: 40, title: "تأیید مدیر HSE", person: "مدیر HSE", sla: "۲۴ ساعت", signatureRequired: true },
  { id: "auto1", kind: "automated", x: 550, y: 300, title: "ارسال نوتیفیکیشن به حراست" },
  { id: "and1", kind: "and", x: 760, y: 170, title: "همه تأییدها" },
  { id: "e1", kind: "end-success", x: 900, y: 110, title: "پایان موفق" },
  { id: "e2", kind: "end-rejected", x: 900, y: 260, title: "پایان رد" },
];

export const WF_EDGES: WFEdge[] = [
  { from: "s1", to: "h1" },
  { from: "h1", to: "g1" },
  { from: "g1", to: "a1", label: "بله", kind: "yes" },
  { from: "g1", to: "auto1", label: "خیر", kind: "no" },
  { from: "a1", to: "and1", label: "تأیید شد", kind: "yes" },
  { from: "auto1", to: "and1" },
  { from: "and1", to: "e1" },
  { from: "a1", to: "e2", label: "رد شد", kind: "no" },
];

export const WF_NODE_LIB = [
  { cat: "🟢 شروع و پایان", items: [{ kind: "start", label: "شروع", emoji: "⬤" }, { kind: "end-success", label: "پایان موفق", emoji: "⬤" }, { kind: "end-rejected", label: "پایان رد", emoji: "⬤" }] },
  { cat: "🔵 وظایف", items: [{ kind: "human", label: "وظیفه انسانی", emoji: "👤" }, { kind: "approval", label: "تأیید / رد", emoji: "✅" }, { kind: "review", label: "بررسی (بدون تغییر)", emoji: "👁" }, { kind: "automated", label: "عملیات خودکار", emoji: "⚙️" }] },
  { cat: "🔷 دروازه‌ها", items: [{ kind: "xor", label: "تصمیم (یکی از چند)", emoji: "◇" }, { kind: "and", label: "همه با هم", emoji: "◈" }, { kind: "timer", label: "تایمر / تأخیر", emoji: "⏱" }] },
  { cat: "⚡ رویدادها", items: [{ kind: "notification", label: "ارسال اعلان", emoji: "🔔" }, { kind: "api", label: "فراخوانی سرویس", emoji: "🔗" }, { kind: "docgen", label: "صدور سند", emoji: "📄" }] },
];

export const SIM_TIMELINE = [
  { stage: "مسئول لجستیک", time: "۲ ساعت", sla: "۴ ساعت", ok: true },
  { stage: "مدیر HSE", time: "escalated پس از ۴۸ ساعت", sla: "۲۴ ساعت", ok: false },
  { stage: "تأیید نهایی", time: "۱ ساعت", sla: "—", ok: true },
];

export interface WFCard { id: string; title: string; category: "logistics" | "permits" | "letters"; desc: string; activeInstances: number; avgTime: string; successRate: number; version: number; lastEdit: string; isSystemDefault: boolean; }
export const WF_CATEGORY_CFG: Record<string, { fa: string; color: string }> = {
  logistics: { fa: "لجستیک", color: "#0F2A44" },
  permits: { fa: "مجوزها", color: "#0E7C86" },
  letters: { fa: "مکاتبات", color: "#F2A541" },
};
export const WORKFLOW_LIBRARY: WFCard[] = [
  { id: "wf1", title: "تأیید بارنامه خطرناک", category: "logistics", desc: "برای بارهای با کد UN، نیازمند تأیید HSE و مدیر ارشد است.", activeInstances: 124, avgTime: "۱۸ ساعت", successRate: 94, version: 5, lastEdit: "۳ روز پیش", isSystemDefault: false },
  { id: "wf2", title: "تأیید بارنامه ساده", category: "logistics", desc: "مسیر استاندارد برای بارهای عادی بدون نیاز به تأیید HSE.", activeInstances: 312, avgTime: "۶ ساعت", successRate: 98, version: 3, lastEdit: "۱ هفته پیش", isSystemDefault: true },
  { id: "wf3", title: "مسیر مجوز ساختی", category: "permits", desc: "فرآیند صدور مجوز ساخت‌وساز و تغییرات کالبدی واحدها.", activeInstances: 19, avgTime: "۴ روز", successRate: 87, version: 2, lastEdit: "۲ هفته پیش", isSystemDefault: false },
  { id: "wf4", title: "مکاتبه رسمی خروجی", category: "letters", desc: "مسیر تأیید و امضای نامه‌های رسمی خروجی به سازمان‌ها.", activeInstances: 41, avgTime: "۱۲ ساعت", successRate: 91, version: 7, lastEdit: "دیروز", isSystemDefault: true },
  { id: "wf5", title: "خدمات اضطراری", category: "logistics", desc: "مسیر تسریع‌شده برای درخواست‌های خدمات فوری زیرساختی.", activeInstances: 6, avgTime: "۲ ساعت", successRate: 99, version: 1, lastEdit: "۱ ماه پیش", isSystemDefault: false },
  { id: "wf6", title: "تمدید مجوز فعالیت", category: "permits", desc: "مسیر تمدید سالانه مجوز فعالیت شرکت‌ها در شهرک.", activeInstances: 53, avgTime: "۲ روز", successRate: 90, version: 4, lastEdit: "۵ روز پیش", isSystemDefault: false },
];
export const WF_ASSIGNMENTS = [
  { entity: "بارنامه ورودی عادی", workflow: "تأیید بارنامه ساده" },
  { entity: "بارنامه ورودی خطرناک", workflow: "تأیید بارنامه خطرناک" },
  { entity: "مجوز ساخت", workflow: "مسیر مجوز ساختی" },
  { entity: "نامه رسمی به شهرک", workflow: "مکاتبه رسمی خروجی" },
  { entity: "درخواست خدمات فوری", workflow: "خدمات اضطراری" },
];

export interface WFInstance { id: string; workflowType: string; company: string; currentStage: string; assignee: string; started: string; slaPct: number; status: "onTime" | "atRisk" | "overdue"; }
export const WF_INSTANCES: WFInstance[] = [
  { id: "WFI-3401", workflowType: "تأیید بارنامه خطرناک", company: "پتروشیمی پارس", currentStage: "تأیید مدیر HSE", assignee: "مدیر HSE", started: "امروز ۰۸:۱۰", slaPct: 72, status: "onTime" },
  { id: "WFI-3388", workflowType: "مسیر مجوز ساختی", company: "فولاد البرز", currentStage: "بررسی شهرسازی", assignee: "واحد فنی", started: "دیروز", slaPct: 35, status: "atRisk" },
  { id: "WFI-3355", workflowType: "تأیید بارنامه خطرناک", company: "شرکت پلاستیک ایران", currentStage: "تأیید مدیر ارشد", assignee: "احمد کریمی", started: "۳ روز پیش", slaPct: 8, status: "overdue" },
  { id: "WFI-3402", workflowType: "مکاتبه رسمی خروجی", company: "مدیریت شهرک", currentStage: "امضای نهایی", assignee: "دبیرخانه", started: "امروز ۱۰:۲۰", slaPct: 88, status: "onTime" },
  { id: "WFI-3390", workflowType: "تمدید مجوز فعالیت", company: "غذایی تهران", currentStage: "بررسی مالی", assignee: "واحد مالی", started: "۲ روز پیش", slaPct: 44, status: "atRisk" },
];
export const WF_BOTTLENECKS = [
  { stage: "تأیید مدیر HSE", avgDelay: 14 }, { stage: "بررسی شهرسازی", avgDelay: 9 },
  { stage: "تأیید مدیر ارشد", avgDelay: 22 }, { stage: "امضای نهایی", avgDelay: 3 }, { stage: "بررسی مالی", avgDelay: 6 },
];

export interface WFVersionEntry { version: number; editedBy: string; date: string; changeNote: string; }

export const WF_VERSION_HISTORY: Record<string, WFVersionEntry[]> = {
  wf1: [
    { version: 5, editedBy: "احمد کریمی", date: "۳ روز پیش", changeNote: "افزودن گره تأیید HSE" },
    { version: 4, editedBy: "احمد کریمی", date: "۱ هفته پیش", changeNote: "اصلاح SLA مرحله لجستیک" },
    { version: 3, editedBy: "مریم رضایی", date: "۳ هفته پیش", changeNote: "افزودن دروازه تصمیم بار خطرناک" },
    { version: 2, editedBy: "احمد کریمی", date: "۲ ماه پیش", changeNote: "تغییر عامل مرحله بررسی اولیه" },
    { version: 1, editedBy: "احمد کریمی", date: "۴ ماه پیش", changeNote: "ایجاد اولیه Workflow" },
  ],
  wf4: [
    { version: 7, editedBy: "احمد کریمی", date: "دیروز", changeNote: "افزودن مرحله امضای دیجیتال نهایی" },
    { version: 6, editedBy: "مریم رضایی", date: "۲ هفته پیش", changeNote: "تغییر عامل بررسی به دبیرخانه" },
    { version: 5, editedBy: "احمد کریمی", date: "۱ ماه پیش", changeNote: "ایجاد اولیه Workflow" },
  ],
};

export interface NotificationTemplate { id: string; nameFa: string; channel: "sms" | "email" | "push"; bodyFa: string; }

export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  { id: "NT1", nameFa: "اطلاع تأیید مرحله", channel: "push", bodyFa: "بارنامه {{shipmentId}} در مرحله {{stage}} تأیید شد." },
  { id: "NT2", nameFa: "یادآوری انقضای SLA", channel: "sms", bodyFa: "هشدار: مهلت اقدام روی {{entity}} رو به اتمام است." },
  { id: "NT3", nameFa: "ارجاع به سطح بالاتر", channel: "email", bodyFa: "درخواست {{entity}} به دلیل عدم اقدام به شما ارجاع شد." },
  { id: "NT4", nameFa: "رد نهایی درخواست", channel: "sms", bodyFa: "درخواست {{entity}} رد شد. دلیل: {{reason}}" },
  { id: "NT5", nameFa: "شروع فرآیند شبیه‌سازی", channel: "push", bodyFa: "شبیه‌سازی Workflow «{{workflowName}}» آغاز شد." },
];

export interface DeputyAssignment { role: string; primary: string; deputy: string; activeWhen: string; }

export const WF_DEPUTY_ASSIGNMENTS: DeputyAssignment[] = [
  { role: "مدیر HSE", primary: "حسین کاظمی", deputy: "زهرا امینی", activeWhen: "در غیاب (مرخصی)" },
  { role: "مدیر لجستیک", primary: "رضایی محمد", deputy: "علی نجفی", activeWhen: "در غیاب (مأموریت)" },
  { role: "مدیر شهرک", primary: "احمد کریمی", deputy: "مریم رضایی", activeWhen: "زمان‌بندی‌شده" },
];

export interface WFValidationIssue { severity: "error" | "warning"; message: string; nodeId?: string; }

export const WF_VALIDATION_ISSUES: WFValidationIssue[] = [
  { severity: "warning", message: "گره «ارسال نوتیفیکیشن به حراست» هیچ خروجی برچسب‌گذاری‌شده‌ای ندارد.", nodeId: "auto1" },
];

// ── Derived Data ───────────────────────────────────────────────────────────────

export const WF_HISTORY_LIST = Object.entries(WF_VERSION_HISTORY || {}).flatMap(([workflowId, versions]) =>
  (versions || []).map((v: any) => ({
    id: `${workflowId}-${v.version}`,
    name: workflowId,
    category: "Workflow",
    updatedAt: v.date,
    status: "published",
    ...v,
  }))
);
