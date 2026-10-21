// ═══════════════════════════════════════════════════════════════════════════════
// M9: Notification Seed Data — 24 Rules + Email/SMS Templates
// ═══════════════════════════════════════════════════════════════════════════════

export interface NotificationRuleSeed {
  module: string;
  eventType: string;
  targetType: string;
  targetValue?: string;
  channels: string[];
  priority: string;
  conditions?: any;
  throttleEnabled?: boolean;
  throttleMinutes?: number;
}

export interface NotificationTemplateSeed {
  code: string;
  module: string;
  eventType: string;
  channel: string;
  language: string;
  subject?: string;
  titleTemplate: string;
  bodyTemplate: string;
  smsTemplate?: string;
  htmlTemplate?: string;
}

// ─── 24 NOTIFICATION RULES ──────────────────────────────────────────────────

export const NOTIFICATION_RULES_SEED: NotificationRuleSeed[] = [
  // ── PERMIT (4 rules) ────────────────────────────────────────────────────
  {
    module: 'PERMIT',
    eventType: 'permit.submitted',
    targetType: 'ROLE',
    targetValue: 'ZONE_MANAGER',
    channels: ['IN_APP', 'SMS'],
    priority: 'NORMAL',
  },
  {
    module: 'PERMIT',
    eventType: 'permit.issued',
    targetType: 'ROLE',
    targetValue: 'COMPANY_ADMIN',
    channels: ['IN_APP', 'SMS', 'EMAIL'],
    priority: 'NORMAL',
  },
  {
    module: 'PERMIT',
    eventType: 'permit.approved',
    targetType: 'ROLE',
    targetValue: 'COMPANY_ADMIN',
    channels: ['IN_APP'],
    priority: 'NORMAL',
  },
  {
    module: 'PERMIT',
    eventType: 'permit.rejected',
    targetType: 'ROLE',
    targetValue: 'COMPANY_ADMIN',
    channels: ['IN_APP', 'SMS'],
    priority: 'NORMAL',
  },

  // ── VISITOR (4 rules) ───────────────────────────────────────────────────
  {
    module: 'VISITOR',
    eventType: 'visitor.checked_in',
    targetType: 'ROLE',
    targetValue: 'COMPANY_ADMIN',
    channels: ['IN_APP', 'SMS'],
    priority: 'NORMAL',
  },
  {
    module: 'VISITOR',
    eventType: 'visitor.walkin_pending',
    targetType: 'ROLE',
    targetValue: 'COMPANY_ADMIN',
    channels: ['IN_APP', 'SMS'],
    priority: 'HIGH',
  },
  {
    module: 'VISITOR',
    eventType: 'visitor.overstay',
    targetType: 'ROLE',
    targetValue: 'COMPANY_ADMIN',
    channels: ['IN_APP', 'SMS'],
    priority: 'HIGH',
    throttleEnabled: true,
    throttleMinutes: 30,
  },
  {
    module: 'VISITOR',
    eventType: 'visitor.extension_requested',
    targetType: 'ROLE',
    targetValue: 'COMPANY_ADMIN',
    channels: ['IN_APP'],
    priority: 'NORMAL',
  },

  // ── LOGISTICS (4 rules) ─────────────────────────────────────────────────
  {
    module: 'LOGISTICS',
    eventType: 'waybill.created',
    targetType: 'ROLE',
    targetValue: 'COMPANY_STAFF',
    channels: ['IN_APP'],
    priority: 'NORMAL',
  },
  {
    module: 'LOGISTICS',
    eventType: 'waybill.approved',
    targetType: 'ROLE',
    targetValue: 'COMPANY_ADMIN',
    channels: ['IN_APP', 'SMS'],
    priority: 'NORMAL',
  },
  {
    module: 'LOGISTICS',
    eventType: 'waybill.rejected',
    targetType: 'ROLE',
    targetValue: 'COMPANY_ADMIN',
    channels: ['IN_APP', 'SMS'],
    priority: 'NORMAL',
  },
  {
    module: 'LOGISTICS',
    eventType: 'system.scale.tamper',
    targetType: 'ROLE',
    targetValue: 'ZONE_MANAGER',
    channels: ['IN_APP', 'SMS'],
    priority: 'CRITICAL',
  },

  // ── CORRESPONDENCE (3 rules) ────────────────────────────────────────────
  {
    module: 'CORRESPONDENCE',
    eventType: 'letter.submitted',
    targetType: 'ROLE',
    targetValue: 'ZONE_MANAGER',
    channels: ['IN_APP'],
    priority: 'NORMAL',
  },
  {
    module: 'CORRESPONDENCE',
    eventType: 'letter.approved',
    targetType: 'ROLE',
    targetValue: 'COMPANY_ADMIN',
    channels: ['IN_APP'],
    priority: 'NORMAL',
  },
  {
    module: 'CORRESPONDENCE',
    eventType: 'letter.dispatched',
    targetType: 'ROLE',
    targetValue: 'COMPANY_ADMIN',
    channels: ['IN_APP', 'EMAIL'],
    priority: 'NORMAL',
  },

  // ── WORKFLOW (4 rules) ──────────────────────────────────────────────────
  {
    module: 'WORKFLOW',
    eventType: 'workflow.task.activated',
    targetType: 'ROLE',
    targetValue: 'COMPANY_STAFF',
    channels: ['IN_APP'],
    priority: 'NORMAL',
  },
  {
    module: 'WORKFLOW',
    eventType: 'workflow.sla.breach',
    targetType: 'ROLE',
    targetValue: 'ZONE_MANAGER',
    channels: ['IN_APP', 'SMS'],
    priority: 'HIGH',
  },
  {
    module: 'WORKFLOW',
    eventType: 'workflow.escalation',
    targetType: 'ROLE',
    targetValue: 'ZONE_MANAGER',
    channels: ['IN_APP', 'SMS'],
    priority: 'HIGH',
  },
  {
    module: 'WORKFLOW',
    eventType: 'workflow.instance.completed',
    targetType: 'ROLE',
    targetValue: 'COMPANY_ADMIN',
    channels: ['IN_APP'],
    priority: 'NORMAL',
  },

  // ── GUARD (2 rules) ─────────────────────────────────────────────────────
  {
    module: 'GUARD',
    eventType: 'guard.blacklist_alert',
    targetType: 'ROLE',
    targetValue: 'ZONE_MANAGER',
    channels: ['IN_APP', 'SMS'],
    priority: 'HIGH',
  },
  {
    module: 'GUARD',
    eventType: 'incident.reported',
    targetType: 'ROLE',
    targetValue: 'ZONE_MANAGER',
    channels: ['IN_APP', 'SMS'],
    priority: 'HIGH',
  },

  // ── HSE (1 rule) ────────────────────────────────────────────────────────
  {
    module: 'HSE',
    eventType: 'hse.incident.critical',
    targetType: 'ROLE',
    targetValue: 'ZONE_MANAGER',
    channels: ['IN_APP', 'SMS', 'EMAIL'],
    priority: 'CRITICAL',
  },

  // ── SYSTEM (2 rules) ────────────────────────────────────────────────────
  {
    module: 'SYSTEM',
    eventType: 'system.barrier.offline',
    targetType: 'ROLE',
    targetValue: 'ZONE_MANAGER',
    channels: ['IN_APP', 'SMS'],
    priority: 'HIGH',
  },
  {
    module: 'SYSTEM',
    eventType: 'finance.payment_overdue',
    targetType: 'ROLE',
    targetValue: 'COMPANY_ADMIN',
    channels: ['IN_APP', 'EMAIL'],
    priority: 'NORMAL',
    throttleEnabled: true,
    throttleMinutes: 1440, // once per day
  },
];

// ─── EMAIL TEMPLATES (Handlebars) ───────────────────────────────────────────

export const NOTIFICATION_TEMPLATES_SEED: NotificationTemplateSeed[] = [
  // ── PERMIT TEMPLATES ────────────────────────────────────────────────────
  {
    code: 'PERMIT_ISSUED_EMAIL',
    module: 'PERMIT',
    eventType: 'permit.issued',
    channel: 'EMAIL',
    language: 'fa',
    subject: 'مجوز صادر شد — {{permitNumber}}',
    titleTemplate: 'مجوز صادر شد',
    bodyTemplate: 'مجوز شماره {{permitNumber}} از نوع {{permitType}} صادر شد. برای مشاهده جزئیات روی دکمه زیر کلیک کنید.',
    htmlTemplate: `<div dir="rtl" style="font-family:Tahoma,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1a5276;color:#fff;padding:20px;text-align:center;border-radius:8px 8px 0 0">
        <h1 style="margin:0">آوان</h1>
      </div>
      <div style="padding:25px;background:#fff;border:1px solid #ddd">
        <h2 style="color:#1a5276">مجوز صادر شد ✅</h2>
        <p>با سلام،</p>
        <p>مجوز شماره <strong>{{permitNumber}}</strong> از نوع <strong>{{permitType}}</strong> صادر شد.</p>
        <table style="width:100%;border-collapse:collapse;margin:15px 0">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">شماره مجوز</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold">{{permitNumber}}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">نوع</td><td style="padding:8px;border-bottom:1px #eee">{{permitType}}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">تاریخ شروع</td><td style="padding:8px;border-bottom:1px solid #eee">{{jalaliDate validFrom}}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">تاریخ پایان</td><td style="padding:8px;border-bottom:1px solid #eee">{{jalaliDate validUntil}}</td></tr>
        </table>
        <div style="text-align:center;margin:20px 0">
          <a href="{{actionUrl}}" style="display:inline-block;background:#1a5276;color:#fff;padding:12px 30px;border-radius:6px;text-decoration:none;font-weight:bold">مشاهده مجوز</a>
        </div>
      </div>
      <div style="background:#f5f5f5;padding:15px;text-align:center;color:#999;font-size:12px;border-radius:0 0 8px 8px">
        سامانه یکپارچه مدیریت شهرک‌های صنعتی — آوان (AVAN)
      </div>
    </div>`,
  },
  {
    code: 'PERMIT_EXPIRY_EMAIL',
    module: 'PERMIT',
    eventType: 'permit.expiry',
    channel: 'EMAIL',
    language: 'fa',
    subject: 'هشدار انقضای مجوز — {{daysRemaining}} روز باقیمانده',
    titleTemplate: 'هشدار انقضای مجوز',
    bodyTemplate: 'مجوز {{permitType}} شما در {{daysRemaining}} روز منقضی می‌شود. لطفاً نسبت به تمدید اقدام فرمایید.',
    htmlTemplate: `<div dir="rtl" style="font-family:Tahoma,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#e74c3c;color:#fff;padding:20px;text-align:center;border-radius:8px 8px 0 0">
        <h1 style="margin:0">⚠️ هشدار انقضا</h1>
      </div>
      <div style="padding:25px;background:#fff;border:1px solid #ddd">
        <h2 style="color:#e74c3c">مجوز در حال انقضا</h2>
        <p>مجوز <strong>{{permitType}}</strong> شما در <strong>{{daysRemaining}} روز</strong> منقضی می‌شود.</p>
        <p>لطفاً نسبت به تمدید مجوز اقدام فرمایید.</p>
        <div style="text-align:center;margin:20px 0">
          <a href="{{actionUrl}}" style="display:inline-block;background:#e74c3c;color:#fff;padding:12px 30px;border-radius:6px;text-decoration:none;font-weight:bold">تمدید مجوز</a>
        </div>
      </div>
    </div>`,
  },

  // ── VISITOR TEMPLATES ───────────────────────────────────────────────────
  {
    code: 'VISITOR_CHECKIN_SMS',
    module: 'VISITOR',
    eventType: 'visitor.checked_in',
    channel: 'SMS',
    language: 'fa',
    titleTemplate: 'بازدیدکننده وارد شد',
    bodyTemplate: 'بازدیدکننده {{visitorName}} از {{visitorCompany}} وارد شد.',
    smsTemplate: 'بازدیدکننده {{visitorName}} وارد شد. ساعت: {{time}}',
  },
  {
    code: 'VISITOR_CHECKIN_EMAIL',
    module: 'VISITOR',
    eventType: 'visitor.checked_in',
    channel: 'EMAIL',
    language: 'fa',
    subject: 'ورود بازدیدکننده — {{visitorName}}',
    titleTemplate: 'ورود بازدیدکننده',
    bodyTemplate: 'بازدیدکننده {{visitorName}} از شرکت {{visitorCompany}} وارد شهرک شد.',
    htmlTemplate: `<div dir="rtl" style="font-family:Tahoma,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#27ae60;color:#fff;padding:20px;text-align:center;border-radius:8px 8px 0 0"><h1 style="margin:0">ورود بازدیدکننده</h1></div>
      <div style="padding:25px;background:#fff;border:1px solid #ddd">
        <p><strong>{{visitorName}}</strong> از شرکت <strong>{{visitorCompany}}</strong> وارد شهرک شد.</p>
        <p>ساعت ورود: {{time}}</p>
      </div>
    </div>`,
  },
  {
    code: 'VISITOR_WALKIN_SMS',
    module: 'VISITOR',
    eventType: 'visitor.walkin_pending',
    channel: 'SMS',
    language: 'fa',
    titleTemplate: 'بازدیدکننده بدون نوبت',
    bodyTemplate: '{{visitorName}} در درب {{gateName}} منتظر تأیید شماست.',
    smsTemplate: '{{visitorName}} بدون نوبت در درب {{gateName}} منتظر شماست.',
  },
  {
    code: 'VISITOR_OVERSTAY_SMS',
    module: 'VISITOR',
    eventType: 'visitor.overstay',
    channel: 'SMS',
    language: 'fa',
    titleTemplate: 'تجاوز از زمان بازدید',
    bodyTemplate: '{{visitorName}} {{overstayMinutes}} دقیقه از زمان مجاز بیشتر مانده است.',
    smsTemplate: 'بازدیدکننده {{visitorName}} {{overstayMinutes}} دقیقه تجاوز از زمان دارد.',
  },

  // ── LOGISTICS TEMPLATES ─────────────────────────────────────────────────
  {
    code: 'WAYBILL_APPROVED_SMS',
    module: 'LOGISTICS',
    eventType: 'waybill.approved',
    channel: 'SMS',
    language: 'fa',
    titleTemplate: 'بارنامه تأیید شد',
    bodyTemplate: 'بارنامه {{waybillNumber}} تأیید شد.',
    smsTemplate: 'بارنامه {{waybillNumber}} تأیید شد.',
  },
  {
    code: 'WAYBILL_REJECTED_SMS',
    module: 'LOGISTICS',
    eventType: 'waybill.rejected',
    channel: 'SMS',
    language: 'fa',
    titleTemplate: 'بارنامه رد شد',
    bodyTemplate: 'بارنامه {{waybillNumber}} رد شد. دلیل: {{reason}}',
    smsTemplate: 'بارنامه {{waybillNumber}} رد شد.',
  },
  {
    code: 'SCALE_TAMPER_SMS',
    module: 'LOGISTICS',
    eventType: 'system.scale.tamper',
    channel: 'SMS',
    language: 'fa',
    titleTemplate: 'تقلب باسکول',
    bodyTemplate: 'تقلب در وزن‌کشی رکورد {{recordId}} تشخیص داده شد.',
    smsTemplate: '⚠️ تقلب باسکول: رکورد {{recordId}}',
  },

  // ── CORRESPONDENCE TEMPLATES ────────────────────────────────────────────
  {
    code: 'LETTER_SUBMITTED_EMAIL',
    module: 'CORRESPONDENCE',
    eventType: 'letter.submitted',
    channel: 'EMAIL',
    language: 'fa',
    subject: 'نامه جدید برای تأیید — {{registryNumber}}',
    titleTemplate: 'نامه جدید',
    bodyTemplate: 'نامه شماره {{registryNumber}} با موضوع «{{subject}}» برای تأیید ارسال شد.',
    htmlTemplate: `<div dir="rtl" style="font-family:Tahoma,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#8e44ad;color:#fff;padding:20px;text-align:center;border-radius:8px 8px 0 0"><h1 style="margin:0">نامه جدید</h1></div>
      <div style="padding:25px;background:#fff;border:1px solid #ddd">
        <p>نامه شماره <strong>{{registryNumber}}</strong> با موضوع <strong>«{{subject}}»</strong> برای تأیید ارسال شد.</p>
        <div style="text-align:center;margin:20px 0">
          <a href="{{actionUrl}}" style="display:inline-block;background:#8e44ad;color:#fff;padding:12px 30px;border-radius:6px;text-decoration:none;font-weight:bold">بررسی نامه</a>
        </div>
      </div>
    </div>`,
  },
  {
    code: 'LETTER_DISPATCHED_EMAIL',
    module: 'CORRESPONDENCE',
    eventType: 'letter.dispatched',
    channel: 'EMAIL',
    language: 'fa',
    subject: 'نامه ارسال شد — {{registryNumber}}',
    titleTemplate: 'نامه ارسال شد',
    bodyTemplate: 'نامه شماره {{registryNumber}} از طریق {{methods}} ارسال شد.',
    htmlTemplate: `<div dir="rtl" style="font-family:Tahoma,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#2980b9;color:#fff;padding:20px;text-align:center;border-radius:8px 8px 0 0"><h1 style="margin:0">نامه ارسال شد ✉️</h1></div>
      <div style="padding:25px;background:#fff;border:1px solid #ddd">
        <p>نامه شماره <strong>{{registryNumber}}</strong> ارسال شد.</p>
        <p>روش ارسال: <strong>{{methods}}</strong></p>
      </div>
    </div>`,
  },

  // ── WORKFLOW TEMPLATES ──────────────────────────────────────────────────
  {
    code: 'WORKFLOW_TASK_ACTIVATED',
    module: 'WORKFLOW',
    eventType: 'workflow.task.activated',
    channel: 'IN_APP',
    language: 'fa',
    titleTemplate: 'وظیفه جدید: {{stepName}}',
    bodyTemplate: 'وظیفه «{{stepName}}» در گردش کار {{definitionCode}} فعال شد.',
  },
  {
    code: 'WORKFLOW_SLA_BREACH_SMS',
    module: 'WORKFLOW',
    eventType: 'workflow.sla.breach',
    channel: 'SMS',
    language: 'fa',
    titleTemplate: 'تأخیر در وظیفه',
    bodyTemplate: 'SLA مرحله {{stepName}} نقض شده است.',
    smsTemplate: '⚠️ تأخیر: {{stepName}} — SLA نقض شد',
  },
  {
    code: 'WORKFLOW_ESCALATION_SMS',
    module: 'WORKFLOW',
    eventType: 'workflow.escalation',
    channel: 'SMS',
    language: 'fa',
    titleTemplate: 'ارجاع وظیفه',
    bodyTemplate: 'وظیفه «{{stepName}}» به شما ارجاع داده شد.',
    smsTemplate: 'ارجاع: {{stepName}} — لطفاً بررسی کنید',
  },

  // ── GUARD TEMPLATES ─────────────────────────────────────────────────────
  {
    code: 'BLACKLIST_ALERT_SMS',
    module: 'GUARD',
    eventType: 'guard.blacklist_alert',
    channel: 'SMS',
    language: 'fa',
    titleTemplate: 'هشدار لیست سیاه',
    bodyTemplate: 'پلاک {{plate}} در لیست سیاه شناسایی شد.',
    smsTemplate: '⚠️ لیست سیاه: پلاک {{plate}} — {{reason}}',
  },
  {
    code: 'INCIDENT_REPORTED_SMS',
    module: 'GUARD',
    eventType: 'incident.reported',
    channel: 'SMS',
    language: 'fa',
    titleTemplate: 'حادثه گزارش شد',
    bodyTemplate: 'حادثه {{type}} با شدت {{severity}} گزارش شد.',
    smsTemplate: '⚠️ حادثه: {{type}} — شدت: {{severity}}',
  },

  // ── HSE TEMPLATES ───────────────────────────────────────────────────────
  {
    code: 'HSE_CRITICAL_SMS',
    module: 'HSE',
    eventType: 'hse.incident.critical',
    channel: 'SMS',
    language: 'fa',
    titleTemplate: 'حادثه HSE بحرانی',
    bodyTemplate: 'حادثه بحرانی: {{description}}',
    smsTemplate: '🚨 حادثه بحرانی HSE: {{description}}',
  },
  {
    code: 'HSE_CRITICAL_EMAIL',
    module: 'HSE',
    eventType: 'hse.incident.critical',
    channel: 'EMAIL',
    language: 'fa',
    subject: '🚨 حادثه HSE بحرانی',
    titleTemplate: 'حادثه HSE بحرانی',
    bodyTemplate: 'حادثه بحرانی HSE گزارش شده است. شرح: {{description}}',
    htmlTemplate: `<div dir="rtl" style="font-family:Tahoma,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#c0392b;color:#fff;padding:20px;text-align:center;border-radius:8px 8px 0 0"><h1 style="margin:0">🚨 حادثه بحرانی HSE</h1></div>
      <div style="padding:25px;background:#fff;border:1px solid #ddd;border-top:4px solid #c0392b">
        <p style="color:#c0392b;font-weight:bold;font-size:18px">حادثه بحرانی گزارش شده است</p>
        <p>{{description}}</p>
        <p>لطفاً فوراً بررسی کنید.</p>
        <div style="text-align:center;margin:20px 0">
          <a href="{{actionUrl}}" style="display:inline-block;background:#c0392b;color:#fff;padding:12px 30px;border-radius:6px;text-decoration:none;font-weight:bold">مشاهده جزئیات</a>
        </div>
      </div>
    </div>`,
  },

  // ── SYSTEM TEMPLATES ────────────────────────────────────────────────────
  {
    code: 'BARRIER_OFFLINE_SMS',
    module: 'SYSTEM',
    eventType: 'system.barrier.offline',
    channel: 'SMS',
    language: 'fa',
    titleTemplate: 'بارrier آفلاین',
    bodyTemplate: 'دسترسی به barrier {{gateCode}} قطع شده است.',
    smsTemplate: '⚠️ barrier {{gateCode}} آفلاین — بررسی کنید',
  },
];
