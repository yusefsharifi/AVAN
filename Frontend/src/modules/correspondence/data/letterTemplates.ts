import type { LetterTemplate } from '../types/templates';

export const LETTER_TEMPLATES: LetterTemplate[] = [
  // ── 1. درخواست مجوز جدید ──────────────────────────────────────────────────
  {
    id: 'tpl-permit-request',
    nameFa: 'درخواست مجوز جدید',
    descriptionFa: 'نامه رسمی جهت درخواست صدور مجوز فعالیت برای انواع مجوزها',
    category: 'permit',
    direction: 'outgoing',
    type: 'request',
    classification: 'unclassified',
    priority: 'normal',
    subjectTemplate: 'درخواست صدور مجوز {{permit_type}} — {{company_name}}',
    bodyTemplate: `بسمه تعالی

مدیریت محترم شهرک صنعتی

با احترام، شرکت {{company_name}} فعال در حوزه {{industry}} واقع در بلوک {{block}} واحد {{unit}}، بدینوسیله درخواست صدور مجوز "{{permit_type}}" را تقدیم می‌دارد.

مشخصات درخواست:
• نوع مجوز: {{permit_type}}
• نام شرکت: {{company_name}}
• واحد: {{block}}-{{unit}}

خواهشمند است دستور اقدام لازم را مقرر فرمایید.`,
    closingTemplate: 'با تقدیم احترام',
    variables: [
      { key: 'company_name', labelFa: 'نام شرکت', source: 'company', sourcePath: 'company.nameFa' },
      { key: 'industry', labelFa: 'حوزه فعالیت', source: 'company', sourcePath: 'company.industry' },
      { key: 'block', labelFa: 'بلوک', source: 'company', sourcePath: 'company.block' },
      { key: 'unit', labelFa: 'واحد', source: 'company', sourcePath: 'company.unit' },
      { key: 'permit_type', labelFa: 'نوع مجوز', source: 'permit', sourcePath: 'permit.type' },
    ],
    slaHours: 72,
    approvalChainTemplate: ['کارشناس مجوزها', 'مدیر فنی', 'مدیر شهرک'],
    topic: 'مجوزها',
    tags: ['permit', 'request'],
    autoTrigger: { event: 'permit_request' },
    icon: 'FileText',
  },

  // ── 2. اخطار انقضای مجوز ─────────────────────────────────────────────────
  {
    id: 'tpl-permit-expiry',
    nameFa: 'اخطار انقضای مجوز',
    descriptionFa: 'ابلاغ انقضای قریب‌الوقوع مجوز و لزوم تمدید آن',
    category: 'permit',
    direction: 'outgoing',
    type: 'official',
    classification: 'unclassified',
    priority: 'urgent',
    subjectTemplate: 'اخطار: انقضای مجوز {{permit_type}} — {{company_name}}',
    bodyTemplate: `بسمه تعالی

مدیریت محترم {{company_name}}

با احترام، به استحضار می‌رساند مجوز "{{permit_type}}" با شماره {{permit_number}} مربوط به شرکت {{company_name}} در تاریخ {{expiry_date}} منقضی می‌گردد.

در صورت عدم تمدید به موقع، فعالیت‌های مرتبط از تاریخ انقضا متوقف خواهد شد.

خواهشمند است نسبت به تمدید مجوز مذکور اقدام فرمایید.`,
    closingTemplate: 'با احترام',
    variables: [
      { key: 'company_name', labelFa: 'نام شرکت', source: 'company', sourcePath: 'company.nameFa' },
      { key: 'permit_type', labelFa: 'نوع مجوز', source: 'permit', sourcePath: 'permit.type' },
      { key: 'permit_number', labelFa: 'شماره مجوز', source: 'permit', sourcePath: 'permit.number' },
      { key: 'expiry_date', labelFa: 'تاریخ انقضا', source: 'permit', sourcePath: 'permit.expiryDate' },
    ],
    slaHours: 48,
    approvalChainTemplate: ['کارشناس مجوزها', 'مدیر شهرک'],
    topic: 'مجوزها',
    tags: ['permit', 'expiry', 'warning'],
    autoTrigger: { event: 'permit_expiry', daysBeforeEvent: 30 },
    icon: 'AlertTriangle',
  },

  // ── 3. ابلاغ اقدام اصلاحی HSE ────────────────────────────────────────────
  {
    id: 'tpl-hse-corrective',
    nameFa: 'ابلاغ اقدام اصلاحی HSE',
    descriptionFa: 'نامه رسمی جهت ابلاغ اقدام اصلاحی به دنبال گزارش حادثه یا ریسک',
    category: 'hse',
    direction: 'outgoing',
    type: 'instruction',
    classification: 'unclassified',
    priority: 'urgent',
    subjectTemplate: 'ابلاغ اقدام اصلاحی — حادثه {{incident_number}} — {{company_name}}',
    bodyTemplate: `بسمه تعالی

مدیریت محترم {{company_name}}

با احترام، پیرو گزارش حادثه شماره {{incident_number}} مورخ {{incident_date}} در محل {{incident_location}}، بدینوسیله موارد ذیل جهت اقدام اصلاحی ابلاغ می‌گردد:

نوع حادثه: {{incident_type}}
شدت: {{incident_severity}}

اقدامات اصلاحی الزامی:
{{corrective_actions}}

مهلت اجرا: {{due_date}}

عدم اجرای به موقع اقدامات فوق موجب توقف فعالیت واحد خواهد شد.`,
    closingTemplate: 'با احترام',
    variables: [
      { key: 'company_name', labelFa: 'نام شرکت', source: 'company', sourcePath: 'company.nameFa' },
      { key: 'incident_number', labelFa: 'شماره حادثه', source: 'incident', sourcePath: 'incident.number' },
      { key: 'incident_date', labelFa: 'تاریخ حادثه', source: 'date' },
      { key: 'incident_location', labelFa: 'محل حادثه', source: 'incident', sourcePath: 'incident.location' },
      { key: 'incident_type', labelFa: 'نوع حادثه', source: 'incident', sourcePath: 'incident.type' },
      { key: 'incident_severity', labelFa: 'شدت حادثه', source: 'incident', sourcePath: 'incident.severity' },
      { key: 'corrective_actions', labelFa: 'اقدامات اصلاحی', source: 'manual' },
      { key: 'due_date', labelFa: 'مهلت اجرا', source: 'manual' },
    ],
    slaHours: 24,
    approvalChainTemplate: ['مسئول HSE', 'مدیر عملیات', 'مدیر شهرک'],
    topic: 'ایمنی و بهداشت',
    tags: ['hse', 'corrective-action', 'incident'],
    autoTrigger: { event: 'incident_reported' },
    icon: 'ShieldAlert',
  },

  // ── 4. اخطار پرداخت معوق ─────────────────────────────────────────────────
  {
    id: 'tpl-payment-overdue',
    nameFa: 'اخطار پرداخت معوق',
    descriptionFa: 'اخطار رسمی جهت پیگیری پرداخت‌های معوق اجاره یا خدمات',
    category: 'finance',
    direction: 'outgoing',
    type: 'official',
    classification: 'unclassified',
    priority: 'urgent',
    subjectTemplate: 'اخطار پرداخت معوق — {{company_name}} — {{invoice_number}}',
    bodyTemplate: `بسمه تعالی

مدیریت محترم {{company_name}}

با احترام، به استحضار می‌رساند فاکتور شماره {{invoice_number}} به مبلغ {{amount}} ریال که سررسید پرداخت آن {{due_date}} بوده، تاکنون پرداخت نگردیده است.

خواهشمند است نسبت به تسویه بدهی مذکور حداکثر ظرف ۱۰ روز کاری از تاریخ این نامه اقدام فرمایید.

در غیر این صورت، متأسفانه ناگزیر از اعمال جریمه تأخیر و در صورت لزوم تعلیق خدمات خواهیم بود.`,
    closingTemplate: 'با احترام',
    variables: [
      { key: 'company_name', labelFa: 'نام شرکت', source: 'company', sourcePath: 'company.nameFa' },
      { key: 'invoice_number', labelFa: 'شماره فاکتور', source: 'payment', sourcePath: 'payment.invoiceNumber' },
      { key: 'amount', labelFa: 'مبلغ', source: 'payment', sourcePath: 'payment.amount' },
      { key: 'due_date', labelFa: 'تاریخ سررسید', source: 'payment', sourcePath: 'payment.dueDate' },
    ],
    slaHours: 48,
    approvalChainTemplate: ['کارشناس مالی', 'مدیر مالی'],
    topic: 'امور مالی',
    tags: ['finance', 'payment', 'overdue'],
    autoTrigger: { event: 'payment_overdue' },
    icon: 'CreditCard',
  },

  // ── 5. تمدید قرارداد اجاره ──────────────────────────────────────────────
  {
    id: 'tpl-lease-renewal',
    nameFa: 'تمدید قرارداد اجاره',
    descriptionFa: 'نامه پیشنهاد تمدید قرارداد اجاره با شرایط جدید',
    category: 'lease',
    direction: 'outgoing',
    type: 'official',
    classification: 'unclassified',
    priority: 'normal',
    subjectTemplate: 'پیشنهاد تمدید قرارداد اجاره — {{company_name}} — {{contract_number}}',
    bodyTemplate: `بسمه تعالی

مدیریت محترم {{company_name}}

با احترام، پیرو قرارداد اجاره شماره {{contract_number}} که تاریخ انقضای آن {{end_date}} می‌باشد، بدینوسیله پیشنهاد تمدید قرارداد مذکور برای یک دوره جدید تقدیم می‌گردد.

واحد مورد اجاره: بلوک {{block}} واحد {{unit}}

خواهشمند است نظر خود را در خصوص تمدید قرارداد ظرف ۱۴ روز کاری اعلام فرمایید.`,
    closingTemplate: 'با احترام و ارادت',
    variables: [
      { key: 'company_name', labelFa: 'نام شرکت', source: 'company', sourcePath: 'company.nameFa' },
      { key: 'contract_number', labelFa: 'شماره قرارداد', source: 'lease', sourcePath: 'lease.contractNumber' },
      { key: 'end_date', labelFa: 'تاریخ انقضا', source: 'lease', sourcePath: 'lease.endDate' },
      { key: 'block', labelFa: 'بلوک', source: 'lease', sourcePath: 'lease.block' },
      { key: 'unit', labelFa: 'واحد', source: 'lease', sourcePath: 'lease.unit' },
    ],
    slaHours: 168, // 1 week
    approvalChainTemplate: ['کارشناس قراردادها', 'مدیر مالی', 'مدیر شهرک'],
    topic: 'قراردادها',
    tags: ['lease', 'renewal'],
    autoTrigger: { event: 'lease_renewal', daysBeforeEvent: 60 },
    icon: 'FileText',
  },

  // ── 6. خوش‌آمدگویی شرکت جدید ────────────────────────────────────────────
  {
    id: 'tpl-welcome',
    nameFa: 'خوش‌آمدگویی شرکت جدید',
    descriptionFa: 'نامه خوش‌آمدگویی و معرفی خدمات شهرک پس از فعال‌سازی شرکت',
    category: 'onboarding',
    direction: 'outgoing',
    type: 'official',
    classification: 'unclassified',
    priority: 'normal',
    subjectTemplate: 'خوش آمدید — {{company_name}} به جمع شرکت‌های شهرک صنعتی پیوست',
    bodyTemplate: `بسمه تعالی

مدیریت محترم {{company_name}}

با احترام، ورود شرکت ارجمند {{company_name}} به مجموعه شهرک صنعتی کاوه را گرامی می‌داریم.

ثبت‌نام شما در تاریخ {{registration_date}} تأیید نهایی گردیده است.

در ادامه برخی از خدمات مهم شهرک که در اختیار شما قرار دارد:
• پورتال آنلاین شرکت برای مدیریت درخواست‌ها
• سیستم مکاتبات و اتوماسیون اداری
• سامانه پایش انرژی و تأسیسات
• مرکز خدمات HSE

برای هر گونه راهنمایی با مرکز پشتیبانی شهرک تماس حاصل فرمایید.`,
    closingTemplate: 'با آرزوی موفقیت',
    variables: [
      { key: 'company_name', labelFa: 'نام شرکت', source: 'company', sourcePath: 'company.nameFa' },
      { key: 'registration_date', labelFa: 'تاریخ ثبت‌نام', source: 'date' },
    ],
    slaHours: 0,
    approvalChainTemplate: ['روابط عمومی', 'مدیر شهرک'],
    topic: 'پذیرش و ورود',
    tags: ['welcome', 'onboarding'],
    autoTrigger: { event: 'company_activated' },
    icon: 'Building2',
  },

  // ── 7. دعوتنامه بازرسی دوره‌ای ──────────────────────────────────────────
  {
    id: 'tpl-inspection-invite',
    nameFa: 'دعوتنامه بازرسی دوره‌ای',
    descriptionFa: 'دعوتنامه رسمی برای حضور در بازرسی HSE دوره‌ای شهرک',
    category: 'hse',
    direction: 'outgoing',
    type: 'official',
    classification: 'unclassified',
    priority: 'normal',
    subjectTemplate: 'دعوتنامه بازرسی دوره‌ای HSE — {{company_name}} — {{inspection_date}}',
    bodyTemplate: `بسمه تعالی

مدیریت محترم {{company_name}}

با احترام، به اطلاع می‌رساند طبق برنامه بازرسی دوره‌ای شهرک صنعتی، بازرسی HSE واحد شما در تاریخ {{inspection_date}} رأس ساعت {{inspection_time}} انجام خواهد پذیرفت.

بازرس: {{inspector_name}}
محورهای بازرسی: ایمنی محیط کار، PPE، مواد شیمیایی، مسیرهای خروج اضطراری

خواهشمند است مسئول HSE واحد در حین بازرسی حضور داشته باشند.`,
    closingTemplate: 'با احترام',
    variables: [
      { key: 'company_name', labelFa: 'نام شرکت', source: 'company', sourcePath: 'company.nameFa' },
      { key: 'inspection_date', labelFa: 'تاریخ بازرسی', source: 'manual' },
      { key: 'inspection_time', labelFa: 'ساعت بازرسی', source: 'manual' },
      { key: 'inspector_name', labelFa: 'نام بازرس', source: 'manual' },
    ],
    slaHours: 48,
    approvalChainTemplate: ['مسئول HSE', 'مدیر عملیات'],
    topic: 'ایمنی و بهداشت',
    tags: ['hse', 'inspection'],
    autoTrigger: { event: 'inspection_scheduled' },
    icon: 'ClipboardList',
  },

  // ── 8. تایید فعالیت B2B ──────────────────────────────────────────────────
  {
    id: 'tpl-b2b-confirm',
    nameFa: 'تایید فعالیت B2B',
    descriptionFa: 'نامه رسمی تأیید برنده شدن مناقصه و شروع همکاری B2B',
    category: 'general',
    direction: 'outgoing',
    type: 'official',
    classification: 'unclassified',
    priority: 'normal',
    subjectTemplate: 'تأیید قرارداد B2B — {{company_name}} — {{rfq_number}}',
    bodyTemplate: `بسمه تعالی

مدیریت محترم {{company_name}}

با احترام، بدینوسیله اطلاع می‌رسانیم که شرکت {{company_name}} در مناقصه شماره {{rfq_number}} برنده اعلام گردیده است.

جزئیات همکاری:
• شماره مناقصه: {{rfq_number}}
• موضوع: {{rfq_subject}}
• ارزش قرارداد: {{contract_value}} ریال

خواهشمند است جهت امضای قرارداد و شروع رسمی همکاری حداکثر ظرف ۷ روز کاری مراجعه فرمایید.`,
    closingTemplate: 'با احترام و ارادت',
    variables: [
      { key: 'company_name', labelFa: 'نام شرکت', source: 'company', sourcePath: 'company.nameFa' },
      { key: 'rfq_number', labelFa: 'شماره مناقصه', source: 'manual' },
      { key: 'rfq_subject', labelFa: 'موضوع مناقصه', source: 'manual' },
      { key: 'contract_value', labelFa: 'ارزش قرارداد', source: 'manual' },
    ],
    slaHours: 48,
    approvalChainTemplate: ['کارشناس B2B', 'مدیر بازرگانی', 'مدیر شهرک'],
    topic: 'B2B',
    tags: ['b2b', 'rfq', 'award'],
    autoTrigger: { event: 'rfq_awarded' },
    icon: 'Handshake',
  },
  // ── 9. درخواست کالا از انبار ────────────────────────────────────────────────
  {
    id: 'tpl-goods-requisition',
    nameFa: 'درخواست کالا از انبار',
    descriptionFa: 'فرم درخواست تحویل کالا یا اموال از انبار — مصرفی یا اموالی',
    category: 'general',
    direction: 'outgoing',
    type: 'request',
    classification: 'unclassified',
    priority: 'normal',
    subjectTemplate: 'درخواست کالا از انبار — {{requester_name}} — {{department}}',
    bodyTemplate: `بسمه تعالی

مدیریت محترم {{manager_name}}

با احترام، اینجانب {{requester_name}} از {{department}}، درخواست تحویل اقلام ذیل را از انبار دارم:

نوع درخواست: {{goods_type}}
شرح کالا: {{item_description}}
مقدار: {{quantity}} {{unit}}
تاریخ نیاز: {{required_date}}
مقصد مصرف / محل استقرار: {{destination}}
توجیه درخواست: {{justification}}

{{#if is_property}}
در صورت تأیید، رسید تحویل اموال پس از تحویل صادر خواهد شد.
{{/if}}

خواهشمند است دستور اقدام لازم را مقرر فرمایید.`,
    closingTemplate: 'با احترام',
    variables: [
      { key: 'requester_name', labelFa: 'نام درخواست‌کننده', source: 'user', sourcePath: 'currentUser.name' },
      { key: 'department', labelFa: 'واحد / بخش', source: 'manual' },
      { key: 'manager_name', labelFa: 'نام مدیر مستقیم', source: 'manual' },
      { key: 'goods_type', labelFa: 'نوع کالا', source: 'manual', defaultValue: 'مصرفی' },
      { key: 'item_description', labelFa: 'شرح کالا', source: 'manual' },
      { key: 'quantity', labelFa: 'مقدار', source: 'manual' },
      { key: 'unit', labelFa: 'واحد', source: 'manual', defaultValue: 'عدد' },
      { key: 'required_date', labelFa: 'تاریخ نیاز', source: 'date' },
      { key: 'destination', labelFa: 'مقصد / محل استقرار', source: 'manual' },
      { key: 'justification', labelFa: 'توجیه درخواست', source: 'manual' },
      { key: 'is_property', labelFa: 'آیا اموالی است؟', source: 'manual', defaultValue: 'بله' },
    ],
    slaHours: 48,
    approvalChainTemplate: ['مدیر مستقیم', 'مدیر انبار'],
    topic: 'انبار و اموال',
    tags: ['warehouse', 'requisition', 'goods-request'],
    icon: 'Package',
  },

  // ── 10. درخواست خرید ────────────────────────────────────────────────────────
  {
    id: 'tpl-purchase-request',
    nameFa: 'درخواست خرید',
    descriptionFa: 'فرم رسمی درخواست خرید کالا یا خدمات با مشخصات پرداخت و پیوست پیش‌فاکتور',
    category: 'finance',
    direction: 'outgoing',
    type: 'request',
    classification: 'unclassified',
    priority: 'normal',
    subjectTemplate: 'درخواست خرید — {{item_description}} — {{requester_name}}',
    bodyTemplate: `بسمه تعالی

مدیریت محترم {{recipient_name}}

با احترام، بدینوسیله درخواست خرید به شرح ذیل تقدیم می‌گردد:

━━━━ مشخصات کالا / خدمات ━━━━
شرح: {{item_description}}
مقدار: {{quantity}} {{unit}}
برآورد قیمت واحد: {{unit_price}} ریال
مبلغ کل برآوردی: {{total_price}} ریال
توجیه خرید: {{justification}}

━━━━ مشخصات پرداخت ━━━━
شماره کارت: {{card_number}}
شماره حساب مبدأ: {{source_account}}
شماره حساب مقصد (فروشنده): {{destination_account}}
نام بانک: {{bank_name}}

━━━━ مدارک پیوست ━━━━
☐ پیش‌فاکتور / فاکتور فروشنده (پیوست شده)

خواهشمند است دستور تأیید و ارجاع به واحد مالی صادر فرمایید.`,
    closingTemplate: 'با احترام',
    variables: [
      { key: 'requester_name', labelFa: 'نام درخواست‌کننده', source: 'user', sourcePath: 'currentUser.name' },
      { key: 'recipient_name', labelFa: 'نام گیرنده / مدیر', source: 'manual' },
      { key: 'item_description', labelFa: 'شرح کالا / خدمت', source: 'manual' },
      { key: 'quantity', labelFa: 'مقدار', source: 'manual' },
      { key: 'unit', labelFa: 'واحد', source: 'manual', defaultValue: 'عدد' },
      { key: 'unit_price', labelFa: 'قیمت واحد (ریال)', source: 'manual' },
      { key: 'total_price', labelFa: 'مبلغ کل (ریال)', source: 'manual' },
      { key: 'justification', labelFa: 'توجیه خرید', source: 'manual' },
      { key: 'card_number', labelFa: 'شماره کارت', source: 'manual' },
      { key: 'source_account', labelFa: 'شماره حساب مبدأ', source: 'manual' },
      { key: 'destination_account', labelFa: 'شماره حساب مقصد', source: 'manual' },
      { key: 'bank_name', labelFa: 'نام بانک', source: 'manual' },
    ],
    slaHours: 72,
    approvalChainTemplate: ['مدیر مستقیم', 'مدیر مالی', 'حسابداری'],
    topic: 'درخواست خرید',
    tags: ['purchase', 'payment', 'procurement'],
    icon: 'CreditCard',
  },
];

// ── Quick lookup by ID ────────────────────────────────────────────────────────
export function getTemplateById(id: string) {
  return LETTER_TEMPLATES.find(t => t.id === id) ?? null;
}

// ── Group by category ─────────────────────────────────────────────────────────
export function getTemplatesByCategory() {
  return LETTER_TEMPLATES.reduce<Record<string, typeof LETTER_TEMPLATES>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});
}
