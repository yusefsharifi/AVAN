import { PermitType, PermitDocType } from '../dto/create-permit-request.dto';

export interface PermitApprovalStepConfig {
  order: number;
  stepName: string;
  roleFa: string;
  isRequired: boolean;
  slaDays: number;
}

export interface PermitTypeConfig {
  nameFa: string;
  abbreviation: string;
  defaultDurationDays: number;
  approvalSteps: PermitApprovalStepConfig[];
  requiresHSEApproval: boolean;
  requiresEnvApproval: boolean;
  requiresFireApproval: boolean;
  requiresInspection: boolean;
  requiredDocuments: PermitDocType[];
  defaultConditions: string[];
}

export const PERMIT_TYPE_CONFIG: Record<PermitType, PermitTypeConfig> = {
  CONSTRUCTION: {
    nameFa: 'مجوز ساختمانی',
    abbreviation: 'CON',
    defaultDurationDays: 90,
    approvalSteps: [
      { order: 1, stepName: 'بررسی مدارک اولیه', roleFa: 'کارشناس فنی شهرک', isRequired: true, slaDays: 3 },
      { order: 2, stepName: 'بازدید میدانی', roleFa: 'مهندس ناظر', isRequired: true, slaDays: 5 },
      { order: 3, stepName: 'تأیید ایمنی', roleFa: 'مسئول HSE شهرک', isRequired: true, slaDays: 2 },
      { order: 4, stepName: 'تأیید نهایی', roleFa: 'مدیر شهرک', isRequired: true, slaDays: 2 },
    ],
    requiresHSEApproval: true,
    requiresEnvApproval: false,
    requiresFireApproval: true,
    requiresInspection: true,
    requiredDocuments: [
      PermitDocType.SITE_PLAN,
      PermitDocType.TECHNICAL_DRAWING,
      PermitDocType.SAFETY_PLAN,
      PermitDocType.CONTRACTOR_LICENSE,
    ],
    defaultConditions: [
      'تابلو هشدار در محل نصب گردد',
      'حصارکشی محوطه قبل از شروع کار الزامی است',
      'کپسول آتش‌نشانی در محل حاضر باشد',
    ],
  },

  NIGHT_TRAFFIC: {
    nameFa: 'مجوز تردد شبانه',
    abbreviation: 'NIG',
    defaultDurationDays: 7,
    approvalSteps: [
      { order: 1, stepName: 'تأیید شرکت', roleFa: 'مدیر شرکت', isRequired: true, slaDays: 1 },
      { order: 2, stepName: 'تأیید حراست', roleFa: 'مدیر حراست', isRequired: true, slaDays: 1 },
    ],
    requiresHSEApproval: false,
    requiresEnvApproval: false,
    requiresFireApproval: false,
    requiresInspection: false,
    requiredDocuments: [PermitDocType.APPLICATION_FORM],
    defaultConditions: ['تردد فقط از درب اصلی مجاز است'],
  },

  HAZMAT_TRANSPORT: {
    nameFa: 'مجوز حمل مواد خطرناک',
    abbreviation: 'HAZ',
    defaultDurationDays: 30,
    approvalSteps: [
      { order: 1, stepName: 'بررسی MSDS', roleFa: 'مسئول HSE شهرک', isRequired: true, slaDays: 2 },
      { order: 2, stepName: 'تأیید محیط زیست', roleFa: 'کارشناس محیط زیست', isRequired: true, slaDays: 3 },
      { order: 3, stepName: 'تأیید آتش‌نشانی', roleFa: 'نماینده آتش‌نشانی', isRequired: true, slaDays: 2 },
      { order: 4, stepName: 'تأیید مدیر شهرک', roleFa: 'مدیر شهرک', isRequired: true, slaDays: 1 },
    ],
    requiresHSEApproval: true,
    requiresEnvApproval: true,
    requiresFireApproval: true,
    requiresInspection: true,
    requiredDocuments: [
      PermitDocType.SAFETY_PLAN,
      PermitDocType.ENVIRONMENTAL_ASSESSMENT,
      PermitDocType.FIRE_SAFETY_PLAN,
      PermitDocType.INSURANCE_CERTIFICATE,
    ],
    defaultConditions: [
      'برگه اطلاعات ایمنی (MSDS) در خودرو موجود باشد',
      'راننده دارای گواهینامه حمل مواد خطرناک باشد',
      'خودرو مجهز به کپسول آتش‌نشانی و کیت اضطراری باشد',
    ],
  },

  ACTIVITY_LICENSE: {
    nameFa: 'مجوز فعالیت',
    abbreviation: 'ACT',
    defaultDurationDays: 365,
    approvalSteps: [
      { order: 1, stepName: 'بررسی مدارک', roleFa: 'کارشناس فنی شهرک', isRequired: true, slaDays: 5 },
      { order: 2, stepName: 'تأیید HSE', roleFa: 'مسئول HSE شهرک', isRequired: true, slaDays: 3 },
      { order: 3, stepName: 'تأیید نهایی', roleFa: 'مدیر شهرک', isRequired: true, slaDays: 2 },
    ],
    requiresHSEApproval: true,
    requiresEnvApproval: false,
    requiresFireApproval: false,
    requiresInspection: false,
    requiredDocuments: [PermitDocType.APPLICATION_FORM, PermitDocType.CONTRACTOR_LICENSE],
    defaultConditions: [],
  },

  ENVIRONMENTAL: {
    nameFa: 'مجوز محیط زیست',
    abbreviation: 'ENV',
    defaultDurationDays: 180,
    approvalSteps: [
      { order: 1, stepName: 'بررسی مستندات', roleFa: 'کارشناس محیط زیست', isRequired: true, slaDays: 5 },
      { order: 2, stepName: 'بازدید میدانی', roleFa: 'کارشناس محیط زیست', isRequired: true, slaDays: 3 },
      { order: 3, stepName: 'تأیید نهایی', roleFa: 'مدیر شهرک', isRequired: true, slaDays: 2 },
    ],
    requiresHSEApproval: false,
    requiresEnvApproval: true,
    requiresFireApproval: false,
    requiresInspection: true,
    requiredDocuments: [PermitDocType.ENVIRONMENTAL_ASSESSMENT, PermitDocType.SAFETY_PLAN],
    defaultConditions: ['پایش مستمر آلودگی الزامی است'],
  },

  FIRE_SAFETY: {
    nameFa: 'مجوز آتش‌نشانی',
    abbreviation: 'FIR',
    defaultDurationDays: 90,
    approvalSteps: [
      { order: 1, stepName: 'بررسی ایمنی', roleFa: 'نماینده آتش‌نشانی', isRequired: true, slaDays: 3 },
      { order: 2, stepName: 'تأیید نهایی', roleFa: 'مدیر شهرک', isRequired: true, slaDays: 2 },
    ],
    requiresHSEApproval: false,
    requiresEnvApproval: false,
    requiresFireApproval: true,
    requiresInspection: true,
    requiredDocuments: [PermitDocType.FIRE_SAFETY_PLAN, PermitDocType.SAFETY_PLAN],
    defaultConditions: ['تجهیزات اطفاء حریق در محل نصب شود'],
  },

  EMERGENCY_POWER: {
    nameFa: 'مجوز برق اضطراری',
    abbreviation: 'EMR',
    defaultDurationDays: 30,
    approvalSteps: [
      { order: 1, stepName: 'بررسی فنی', roleFa: 'کارشناس فنی شهرک', isRequired: true, slaDays: 2 },
      { order: 2, stepName: 'تأیید نهایی', roleFa: 'مدیر شهرک', isRequired: true, slaDays: 1 },
    ],
    requiresHSEApproval: false,
    requiresEnvApproval: false,
    requiresFireApproval: false,
    requiresInspection: false,
    requiredDocuments: [PermitDocType.APPLICATION_FORM],
    defaultConditions: ['رعایت موارد ایمنی برق الزامی است'],
  },

  WASTE_DISPOSAL: {
    nameFa: 'مجوز تخلیه پسماند',
    abbreviation: 'WAS',
    defaultDurationDays: 30,
    approvalSteps: [
      { order: 1, stepName: 'بررسی نوع پسماند', roleFa: 'کارشناس محیط زیست', isRequired: true, slaDays: 2 },
      { order: 2, stepName: 'تأیید نهایی', roleFa: 'مدیر شهرک', isRequired: true, slaDays: 1 },
    ],
    requiresHSEApproval: false,
    requiresEnvApproval: true,
    requiresFireApproval: false,
    requiresInspection: false,
    requiredDocuments: [PermitDocType.ENVIRONMENTAL_ASSESSMENT],
    defaultConditions: ['حمل پسماند خطرناک فقط با ماشین‌آلات مجاز'],
  },

  WORKING_AT_HEIGHT: {
    nameFa: 'مجوز کار در ارتفاع',
    abbreviation: 'HGT',
    defaultDurationDays: 7,
    approvalSteps: [
      { order: 1, stepName: 'ارزیابی ریسک', roleFa: 'مسئول HSE شهرک', isRequired: true, slaDays: 1 },
      { order: 2, stepName: 'تأیید نهایی', roleFa: 'مدیر شهرک', isRequired: true, slaDays: 1 },
    ],
    requiresHSEApproval: true,
    requiresEnvApproval: false,
    requiresFireApproval: false,
    requiresInspection: true,
    requiredDocuments: [PermitDocType.SAFETY_PLAN],
    defaultConditions: ['استفاده از کمربند ایمنی الزامی است', 'بازرسی تجهیزات قبل از شروع کار'],
  },

  HOT_WORK: {
    nameFa: 'مجوز کار گرم (جوشکاری)',
    abbreviation: 'HOT',
    defaultDurationDays: 1,
    approvalSteps: [
      { order: 1, stepName: 'بازدید محل', roleFa: 'مسئول HSE شهرک', isRequired: true, slaDays: 1 },
      { order: 2, stepName: 'تأیید آتش‌نشانی', roleFa: 'نماینده آتش‌نشانی', isRequired: true, slaDays: 1 },
    ],
    requiresHSEApproval: true,
    requiresEnvApproval: false,
    requiresFireApproval: true,
    requiresInspection: true,
    requiredDocuments: [PermitDocType.SAFETY_PLAN, PermitDocType.FIRE_SAFETY_PLAN],
    defaultConditions: [
      'پرده آتش در محل نصب گردد',
      'نگهبان آتش در تمام مدت کار حضور داشته باشد',
      '۳۰ دقیقه پس از اتمام کار محل بازرسی شود',
    ],
  },

  CONFINED_SPACE: {
    nameFa: 'مجوز ورود به فضای محصور',
    abbreviation: 'CNF',
    defaultDurationDays: 1,
    approvalSteps: [
      { order: 1, stepName: 'ارزیابی ریسک', roleFa: 'مسئول HSE شهرک', isRequired: true, slaDays: 1 },
      { order: 2, stepName: 'تأیید تجهیزات', roleFa: 'کارشناس ایمنی', isRequired: true, slaDays: 1 },
    ],
    requiresHSEApproval: true,
    requiresEnvApproval: false,
    requiresFireApproval: false,
    requiresInspection: true,
    requiredDocuments: [PermitDocType.SAFETY_PLAN],
    defaultConditions: [
      'آزمایش گاز قبل از ورود الزامی است',
      'نجات‌دهنده در خارج از فضا حضور داشته باشد',
      'وسایل ارتباطی در اختیار فرد داخل باشد',
    ],
  },

  EXCAVATION: {
    nameFa: 'مجوز حفاری',
    abbreviation: 'EXC',
    defaultDurationDays: 30,
    approvalSteps: [
      { order: 1, stepName: 'بررسی نقشه تاسیسات', roleFa: 'کارشناس فنی شهرک', isRequired: true, slaDays: 2 },
      { order: 2, stepName: 'تأیید ایمنی', roleFa: 'مسئول HSE شهرک', isRequired: true, slaDays: 1 },
      { order: 3, stepName: 'تأیید نهایی', roleFa: 'مدیر شهرک', isRequired: true, slaDays: 1 },
    ],
    requiresHSEApproval: true,
    requiresEnvApproval: false,
    requiresFireApproval: false,
    requiresInspection: true,
    requiredDocuments: [PermitDocType.TECHNICAL_DRAWING, PermitDocType.SAFETY_PLAN],
    defaultConditions: ['استفاده از تجهیزات محافظتی در حفاری عمیق'],
  },

  NOISE_WAIVER: {
    nameFa: 'معافیت سر و صدا',
    abbreviation: 'NSE',
    defaultDurationDays: 7,
    approvalSteps: [
      { order: 1, stepName: 'بررسی درخواست', roleFa: 'مسئول HSE شهرک', isRequired: true, slaDays: 1 },
    ],
    requiresHSEApproval: true,
    requiresEnvApproval: false,
    requiresFireApproval: false,
    requiresInspection: false,
    requiredDocuments: [PermitDocType.APPLICATION_FORM],
    defaultConditions: ['فقط در ساعات مجاز'],
  },

  OVERSIZE_TRANSPORT: {
    nameFa: 'مجوز حمل بار اضافه‌ابعاد',
    abbreviation: 'OVR',
    defaultDurationDays: 7,
    approvalSteps: [
      { order: 1, stepName: 'بررسی ابعاد', roleFa: 'کارشناس فنی شهرک', isRequired: true, slaDays: 1 },
      { order: 2, stepName: 'تأیید مدیر شهرک', roleFa: 'مدیر شهرک', isRequired: true, slaDays: 1 },
    ],
    requiresHSEApproval: false,
    requiresEnvApproval: false,
    requiresFireApproval: false,
    requiresInspection: false,
    requiredDocuments: [PermitDocType.APPLICATION_FORM, PermitDocType.TECHNICAL_DRAWING],
    defaultConditions: ['اسکورت الزامی است'],
  },

  TEMPORARY_STRUCTURE: {
    nameFa: 'سازه موقت',
    abbreviation: 'TMP',
    defaultDurationDays: 30,
    approvalSteps: [
      { order: 1, stepName: 'بررسی نقشه', roleFa: 'کارشناس فنی شهرک', isRequired: true, slaDays: 3 },
      { order: 2, stepName: 'تأیید ایمنی', roleFa: 'مسئول HSE شهرک', isRequired: true, slaDays: 2 },
      { order: 3, stepName: 'تأیید نهایی', roleFa: 'مدیر شهرک', isRequired: true, slaDays: 1 },
    ],
    requiresHSEApproval: true,
    requiresEnvApproval: false,
    requiresFireApproval: false,
    requiresInspection: true,
    requiredDocuments: [PermitDocType.TECHNICAL_DRAWING, PermitDocType.SAFETY_PLAN],
    defaultConditions: ['بازرسی دوره‌ای سازه الزامی است'],
  },

  EVENT_PERMIT: {
    nameFa: 'مجوز رویداد',
    abbreviation: 'EVT',
    defaultDurationDays: 7,
    approvalSteps: [
      { order: 1, stepName: 'بررسی برنامه', roleFa: 'مدیر روابط عمومی', isRequired: true, slaDays: 2 },
      { order: 2, stepName: 'تأیید ایمنی', roleFa: 'مسئول HSE شهرک', isRequired: true, slaDays: 1 },
      { order: 3, stepName: 'تأیید نهایی', roleFa: 'مدیر شهرک', isRequired: true, slaDays: 1 },
    ],
    requiresHSEApproval: true,
    requiresEnvApproval: false,
    requiresFireApproval: true,
    requiresInspection: false,
    requiredDocuments: [PermitDocType.APPLICATION_FORM, PermitDocType.SAFETY_PLAN],
    defaultConditions: ['-resources-as-needed'],
  },

  CUSTOM: {
    nameFa: 'مجوز سفارشی',
    abbreviation: 'CUS',
    defaultDurationDays: 30,
    approvalSteps: [
      { order: 1, stepName: 'بررسی درخواست', roleFa: 'کارشناس فنی شهرک', isRequired: true, slaDays: 3 },
      { order: 2, stepName: 'تأیید نهایی', roleFa: 'مدیر شهرک', isRequired: true, slaDays: 2 },
    ],
    requiresHSEApproval: false,
    requiresEnvApproval: false,
    requiresFireApproval: false,
    requiresInspection: false,
    requiredDocuments: [PermitDocType.APPLICATION_FORM],
    defaultConditions: [],
  },
};

export const PERMIT_TYPE_ABBREVIATION_MAP: Record<PermitType, string> = Object.fromEntries(
  Object.entries(PERMIT_TYPE_CONFIG).map(([type, config]) => [type, config.abbreviation]),
) as Record<PermitType, string>;
