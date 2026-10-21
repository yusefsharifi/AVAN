export interface PermissionPage {
  key: string;
  nameFa: string;
  path: string;
  actions: string[];
}

export interface PermissionSubsystem {
  key: string;
  nameFa: string;
  pages: PermissionPage[];
}

export interface PermissionModule {
  module: string;
  nameFa: string;
  subsystems: PermissionSubsystem[];
}

const ACTIONS = ['view', 'create', 'update', 'delete'];

export const PERMISSIONS_CATALOG: PermissionModule[] = [
  {
    module: 'auth',
    nameFa: 'احراز هویت',
    subsystems: [
      {
        key: 'sessions',
        nameFa: 'نشست‌ها',
        pages: [
          { key: 'sessions', nameFa: 'نشست‌های فعال', path: '/auth/sessions', actions: ['view', 'delete'] },
          { key: 'list', nameFa: 'لیست نشست‌ها', path: '/auth/sessions', actions: ['view', 'delete'] },
        ],
      },
      {
        key: '2fa',
        nameFa: 'احراز دو مرحله‌ای',
        pages: [
          { key: '2fa', nameFa: 'تنظیمات 2FA', path: '/auth/2fa', actions: ACTIONS },
          { key: 'list', nameFa: 'وضعیت 2FA', path: '/auth/2fa', actions: ACTIONS },
        ],
      },
      {
        key: 'profile',
        nameFa: 'پروفایل کاربری',
        pages: [
          { key: 'profile', nameFa: 'مشاهده و ویرایش مشخصات', path: '/auth/me', actions: ACTIONS },
          { key: 'list', nameFa: 'مشخصات حساب کاربری', path: '/auth/me', actions: ACTIONS },
        ],
      },
    ],
  },
  {
    module: 'users',
    nameFa: 'کاربران',
    subsystems: [
      {
        key: 'users',
        nameFa: 'مدیریت کاربران',
        pages: [
          { key: 'list', nameFa: 'لیست کاربران', path: '/users', actions: ACTIONS },
          { key: 'profile', nameFa: 'پروفایل کاربر', path: '/users/:id', actions: ['view', 'update'] },
          { key: 'status', nameFa: 'وضعیت کاربر', path: '/users/:id/status', actions: ['update'] },
          { key: 'password', nameFa: 'بازنشانی رمز', path: '/users/:id/reset-password', actions: ['update'] },
        ],
      },
    ],
  },
  {
    module: 'roles',
    nameFa: 'نقش‌ها و دسترسی‌ها',
    subsystems: [
      {
        key: 'roles',
        nameFa: 'مدیریت نقش‌ها',
        pages: [
          { key: 'list', nameFa: 'لیست نقش‌ها', path: '/roles', actions: ACTIONS },
          { key: 'permissions', nameFa: 'دسترسی‌های نقش', path: '/roles/:id/permissions', actions: ['view', 'update'] },
        ],
      },
    ],
  },
  {
    module: 'zones',
    nameFa: 'شهرک‌های صنعتی',
    subsystems: [
      {
        key: 'zones',
        nameFa: 'مدیریت شهرک‌ها',
        pages: [
          { key: 'list', nameFa: 'لیست شهرک‌ها', path: '/zones', actions: ACTIONS },
          { key: 'settings', nameFa: 'تنظیمات شهرک', path: '/zones/:id/settings', actions: ['view', 'update'] },
          { key: 'gates', nameFa: 'دروازه‌ها', path: '/zones/:id/gates', actions: ACTIONS },
          { key: 'holidays', nameFa: 'تعطیلات', path: '/zones/:id/holidays', actions: ACTIONS },
        ],
      },
    ],
  },
  {
    module: 'companies',
    nameFa: 'شرکت‌ها',
    subsystems: [
      {
        key: 'companies',
        nameFa: 'مدیریت شرکت‌ها',
        pages: [
          { key: 'list', nameFa: 'لیست شرکت‌ها', path: '/companies', actions: ['view', 'create'] },
          { key: 'detail', nameFa: 'جزئیات شرکت', path: '/companies/:id', actions: ['view', 'update'] },
          { key: 'onboarding', nameFa: 'پذیرش', path: '/companies/:id/onboarding', actions: ['view', 'update'] },
          { key: 'suspend', nameFa: 'تعلیق/فعال‌سازی', path: '/companies/:id/suspend', actions: ['update'] },
          { key: 'documents', nameFa: 'اسناد شرکت', path: '/companies/:id/documents', actions: ['view', 'create', 'update'] },
          { key: 'contacts', nameFa: 'مخاطبین', path: '/companies/:id/contacts', actions: ACTIONS },
          { key: 'health', nameFa: 'امتیاز سلامت', path: '/companies/:id/health-score', actions: ['view', 'update'] },
        ],
      },
    ],
  },
  {
    module: 'plots',
    nameFa: 'قطعات',
    subsystems: [
      {
        key: 'plots',
        nameFa: 'مدیریت قطعات',
        pages: [
          { key: 'list', nameFa: 'لیست قطعات', path: '/plots', actions: ACTIONS },
        ],
      },
    ],
  },
  {
    module: 'guard-portal',
    nameFa: 'پرتال حراست',
    subsystems: [
      {
        key: 'guard',
        nameFa: 'عملیات حراست',
        pages: [
          { key: 'portal', nameFa: 'داشبورد حراست', path: '/guard-portal', actions: ['view', 'create', 'update'] },
        ],
      },
    ],
  },
  {
    module: 'vehicles',
    nameFa: 'خودروها',
    subsystems: [
      {
        key: 'vehicles',
        nameFa: 'مدیریت خودروها',
        pages: [
          { key: 'list', nameFa: 'لیست خودروها', path: '/vehicles', actions: ACTIONS },
        ],
      },
    ],
  },
  {
    module: 'blacklist',
    nameFa: 'لیست سیاه',
    subsystems: [
      {
        key: 'blacklist',
        nameFa: 'مدیریت لیست سیاه',
        pages: [
          { key: 'list', nameFa: 'لیست سیاه خودروها', path: '/blacklist', actions: ACTIONS },
        ],
      },
    ],
  },
  {
    module: 'traffic',
    nameFa: 'ترافیک',
    subsystems: [
      {
        key: 'traffic',
        nameFa: 'مدیریت ترافیک',
        pages: [
          { key: 'list', nameFa: 'گزارش ترافیک', path: '/traffic', actions: ['view', 'create', 'update', 'delete'] },
        ],
      },
    ],
  },
  {
    module: 'logistics',
    nameFa: 'لجستیک و بارنامه',
    subsystems: [
      {
        key: 'waybills',
        nameFa: 'بارنامه‌ها',
        pages: [
          { key: 'list', nameFa: 'لیست بارنامه‌ها', path: '/waybills', actions: ACTIONS },
          { key: 'approvals', nameFa: 'تأییدهای در انتظار', path: '/waybills/pending-approvals', actions: ['view', 'update'] },
        ],
      },
      {
        key: 'weigh',
        nameFa: 'باسکول',
        pages: [
          { key: 'scales', nameFa: 'ترازوها', path: '/weigh/scales', actions: ACTIONS },
          { key: 'records', nameFa: 'رکوردهای وزن‌کشی', path: '/weigh/records', actions: ['view', 'create', 'update'] },
        ],
      },
      {
        key: 'appointments',
        nameFa: 'نوبت‌دهی',
        pages: [
          { key: 'list', nameFa: 'نوبت‌ها', path: '/appointments', actions: ACTIONS },
        ],
      },
      {
        key: 'docks',
        nameFa: 'اسکله‌ها و سکوها',
        pages: [
          { key: 'list', nameFa: 'سکوها', path: '/docks', actions: ACTIONS },
        ],
      },
      {
        key: 'carriers',
        nameFa: 'حمل‌ونقل',
        pages: [
          { key: 'list', nameFa: 'شرکت‌های حمل', path: '/carriers', actions: ACTIONS },
        ],
      },
    ],
  },
  {
    module: 'visitors',
    nameFa: 'بازدیدکنندگان',
    subsystems: [
      {
        key: 'visitors',
        nameFa: 'درخواست بازدید',
        pages: [
          { key: 'list', nameFa: 'درخواست‌ها', path: '/visitors', actions: ACTIONS },
        ],
      },
      {
        key: 'walk-in',
        nameFa: 'مراجعه حضوری',
        pages: [
          { key: 'list', nameFa: 'مراجعات', path: '/visitors/walk-in', actions: ['view', 'create', 'update', 'delete'] },
        ],
      },
      {
        key: 'recurring',
        nameFa: 'مجوز تردد دائم',
        pages: [
          { key: 'list', nameFa: 'مجوزها', path: '/recurring-permits', actions: ACTIONS },
        ],
      },
      {
        key: 'group',
        nameFa: 'بازدید گروهی',
        pages: [
          { key: 'list', nameFa: 'گروه‌ها', path: '/group-visits', actions: ACTIONS },
        ],
      },
      {
        key: 'blacklist',
        nameFa: 'لیست سیاه بازدیدکنندگان',
        pages: [
          { key: 'list', nameFa: 'افراد مسدود', path: '/visitor-blacklist', actions: ACTIONS },
        ],
      },
    ],
  },
  {
    module: 'permits',
    nameFa: 'مجوزها',
    subsystems: [
      {
        key: 'permits',
        nameFa: 'مجوزهای صادرشده',
        pages: [
          { key: 'list', nameFa: 'لیست مجوزها', path: '/permits', actions: ACTIONS },
        ],
      },
      {
        key: 'requests',
        nameFa: 'درخواست مجوز',
        pages: [
          { key: 'list', nameFa: 'درخواست‌های مجوز', path: '/permit-requests', actions: ACTIONS },
        ],
      },
      {
        key: 'templates',
        nameFa: 'قالب‌ها',
        pages: [
          { key: 'list', nameFa: 'قالب‌های مجوز', path: '/permit-templates', actions: ACTIONS },
        ],
      },
      {
        key: 'inspections',
        nameFa: 'بازرسی‌ها',
        pages: [
          { key: 'list', nameFa: 'بازرسی‌های مجوز', path: '/permit-inspections', actions: ACTIONS },
        ],
      },
    ],
  },
  {
    module: 'correspondence',
    nameFa: 'مکاتبات و دبیرخانه',
    subsystems: [
      {
        key: 'letters',
        nameFa: 'نامه‌ها',
        pages: [
          { key: 'list', nameFa: 'لیست نامه‌ها', path: '/correspondence/letters', actions: ACTIONS },
        ],
      },
      {
        key: 'templates',
        nameFa: 'قالب‌ها',
        pages: [
          { key: 'list', nameFa: 'قالب‌های نامه', path: '/correspondence/templates', actions: ACTIONS },
        ],
      },
      {
        key: 'archive',
        nameFa: 'آرشیو فیزیکی',
        pages: [
          { key: 'list', nameFa: 'پرونده‌های بایگانی', path: '/correspondence/archive', actions: ACTIONS },
        ],
      },
    ],
  },
  {
    module: 'workflow',
    nameFa: 'گردش کار و فرآیندها',
    subsystems: [
      {
        key: 'definitions',
        nameFa: 'تعریف فرآیند',
        pages: [
          { key: 'list', nameFa: 'تعاریف فرآیندها', path: '/workflow-definitions', actions: ACTIONS },
        ],
      },
      {
        key: 'instances',
        nameFa: 'فرآیندهای جاری',
        pages: [
          { key: 'list', nameFa: 'نمونه‌های فرآیند', path: '/workflow-instances', actions: ACTIONS },
        ],
      },
      {
        key: 'tasks',
        nameFa: 'کارتابل وظایف',
        pages: [
          { key: 'list', nameFa: 'وظایف ارجاع‌شده', path: '/workflow-tasks', actions: ACTIONS },
        ],
      },
      {
        key: 'sla',
        nameFa: 'توافق سطح خدمت SLA',
        pages: [
          { key: 'list', nameFa: 'قوانین و پایش SLA', path: '/workflow-sla', actions: ACTIONS },
        ],
      },
      {
        key: 'metrics',
        nameFa: 'گزارش عملکرد فرآیند',
        pages: [
          { key: 'list', nameFa: 'شاخص‌ها و آمار', path: '/workflow-metrics', actions: ['view'] },
        ],
      },
    ],
  },
  {
    module: 'notifications',
    nameFa: 'اعلان‌ها',
    subsystems: [
      {
        key: 'notifications',
        nameFa: 'اعلان‌های کاربر',
        pages: [
          { key: 'list', nameFa: 'لیست پیام‌ها', path: '/notifications', actions: ['view', 'create', 'update', 'delete'] },
        ],
      },
      {
        key: 'admin',
        nameFa: 'مدیریت اعلان‌ها',
        pages: [
          { key: 'templates', nameFa: 'قالب‌ها', path: '/notifications/admin/templates', actions: ACTIONS },
          { key: 'rules', nameFa: 'قوانین ارسال', path: '/notifications/admin/rules', actions: ACTIONS },
        ],
      },
    ],
  },
  {
    module: 'finance',
    nameFa: 'مالی و حسابداری',
    subsystems: [
      {
        key: 'invoicing',
        nameFa: 'صورتحساب‌ها',
        pages: [
          { key: 'invoices', nameFa: 'لیست صورتحساب‌ها', path: '/finance/invoices', actions: ACTIONS },
          { key: 'payments', nameFa: 'پرداخت‌ها', path: '/finance/invoices/:id/payment', actions: ['view', 'create'] },
        ],
      },
      {
        key: 'vouchers',
        nameFa: 'اسناد حسابداری',
        pages: [
          { key: 'vouchers', nameFa: 'اسناد دوبل', path: '/finance/vouchers', actions: ACTIONS },
          { key: 'trial-balance', nameFa: 'تراز آزمایشی', path: '/finance/vouchers/trial-balance', actions: ['view'] },
        ],
      },
      {
        key: 'accounts',
        nameFa: 'کدینگ حساب‌ها',
        pages: [
          { key: 'accounts', nameFa: 'درخت حساب‌ها', path: '/finance/accounts', actions: ACTIONS },
        ],
      },
      {
        key: 'banking',
        nameFa: 'بانک و چک',
        pages: [
          { key: 'bank-accounts', nameFa: 'حساب‌های بانکی', path: '/finance/bank-accounts', actions: ACTIONS },
        ],
      },
      {
        key: 'budgeting',
        nameFa: 'بودجه و اعتبارات',
        pages: [
          { key: 'budgets', nameFa: 'بودجه سالانه', path: '/finance/budgets', actions: ACTIONS },
        ],
      },
      {
        key: 'leases',
        nameFa: 'اجاره و قرارداد مالی',
        pages: [
          { key: 'leases', nameFa: 'قراردادهای استیجاری', path: '/finance/leases', actions: ACTIONS },
        ],
      },
      {
        key: 'periods',
        nameFa: 'دوره‌های مالی',
        pages: [
          { key: 'periods', nameFa: 'بستن دوره‌ها', path: '/finance/periods', actions: ['view', 'create', 'update'] },
        ],
      },
      {
        key: 'reports',
        nameFa: 'صورت‌های مالی',
        pages: [
          { key: 'kpi', nameFa: 'شاخص‌ها', path: '/finance/reports/kpi', actions: ['view'] },
          { key: 'income-statement', nameFa: 'سود و زیان', path: '/finance/reports/income-statement', actions: ['view'] },
          { key: 'balance-sheet', nameFa: 'ترازنامه', path: '/finance/reports/balance-sheet', actions: ['view'] },
        ],
      },
    ],
  },
  {
    module: 'b2b',
    nameFa: 'تبادلات B2B و مناقصات',
    subsystems: [
      {
        key: 'rfq',
        nameFa: 'استعلام‌ها و مناقصات',
        pages: [
          { key: 'list', nameFa: 'لیست استعلام‌ها', path: '/b2b/rfqs', actions: ACTIONS },
        ],
      },
      {
        key: 'bids',
        nameFa: 'پیشنهادات قیمت',
        pages: [
          { key: 'list', nameFa: 'پیشنهادها', path: '/b2b/bids', actions: ['view', 'create', 'update', 'delete'] },
        ],
      },
      {
        key: 'evaluations',
        nameFa: 'ارزیابی کیفی و فنی',
        pages: [
          { key: 'list', nameFa: 'فرم‌های ارزیابی', path: '/b2b/evaluations', actions: ACTIONS },
        ],
      },
      {
        key: 'awards',
        nameFa: 'انتخاب برنده و واگذاری',
        pages: [
          { key: 'list', nameFa: 'ابلاغ برنده', path: '/b2b/awards', actions: ACTIONS },
        ],
      },
      {
        key: 'catalog',
        nameFa: 'کاتالوگ محصولات B2B',
        pages: [
          { key: 'list', nameFa: 'کالاهای مشترک', path: '/b2b/catalog', actions: ACTIONS },
        ],
      },
      {
        key: 'suppliers',
        nameFa: 'تأمین‌کنندگان',
        pages: [
          { key: 'list', nameFa: 'وندور لیست B2B', path: '/b2b/suppliers', actions: ACTIONS },
        ],
      },
    ],
  },
  {
    module: 'iot',
    nameFa: 'اینترنت اشیا و مانیتورینگ',
    subsystems: [
      {
        key: 'devices',
        nameFa: 'تجهیزات متصل',
        pages: [
          { key: 'list', nameFa: 'لیست تجهیزات', path: '/iot/devices', actions: ACTIONS },
          { key: 'dashboard', nameFa: 'داشبورد سلامت', path: '/iot/devices/dashboard', actions: ['view'] },
          { key: 'map', nameFa: 'نقشه استقرار', path: '/iot/devices/map', actions: ['view'] },
        ],
      },
      {
        key: 'alerts',
        nameFa: 'هشدارهای سنسوری',
        pages: [
          { key: 'list', nameFa: 'هشدارها', path: '/iot/alerts', actions: ['view', 'create', 'update', 'delete'] },
        ],
      },
      {
        key: 'barriers',
        nameFa: 'گیت‌ها و راهبندها',
        pages: [
          { key: 'control', nameFa: 'کنترل فرمان گیت', path: '/iot/barriers', actions: ACTIONS },
        ],
      },
      {
        key: 'gps',
        nameFa: 'ردیابی ناوگان',
        pages: [
          { key: 'live', nameFa: 'ردیابی برخط', path: '/iot/gps', actions: ['view'] },
          { key: 'geofences', nameFa: 'محدوده‌های مجاز', path: '/iot/gps/geofences', actions: ACTIONS },
        ],
      },
      {
        key: 'scales',
        nameFa: 'باسکول‌های هوشمند',
        pages: [
          { key: 'list', nameFa: 'ترازوها', path: '/iot/scales', actions: ACTIONS },
        ],
      },
      {
        key: 'environmental',
        nameFa: 'پایش محیطی',
        pages: [
          { key: 'list', nameFa: 'سنسورهای محیطی', path: '/iot/environmental', actions: ['view', 'create', 'update', 'delete'] },
        ],
      },
    ],
  },
  {
    module: 'hr',
    nameFa: 'منابع انسانی',
    subsystems: [
      {
        key: 'employees',
        nameFa: 'پرسنل و پرونده‌ها',
        pages: [
          { key: 'list', nameFa: 'لیست پرسنل', path: '/hr/employees', actions: ACTIONS },
        ],
      },
      {
        key: 'attendance',
        nameFa: 'ورود و خروج',
        pages: [
          { key: 'list', nameFa: 'ترددهای ثبت شده', path: '/hr/attendance', actions: ACTIONS },
        ],
      },
      {
        key: 'leave',
        nameFa: 'مرخصی و ماموریت',
        pages: [
          { key: 'list', nameFa: 'درخواست‌های مرخصی', path: '/hr/leaves', actions: ACTIONS },
        ],
      },
      {
        key: 'payroll',
        nameFa: 'حقوق و دستمزد',
        pages: [
          { key: 'list', nameFa: 'فیش‌های حقوقی', path: '/hr/payrolls', actions: ACTIONS },
        ],
      },
      {
        key: 'loans',
        nameFa: 'وام و مساعده',
        pages: [
          { key: 'list', nameFa: 'تسهیلات پرسنلی', path: '/hr/loans', actions: ACTIONS },
        ],
      },
      {
        key: 'departments',
        nameFa: 'ساختار سازمانی',
        pages: [
          { key: 'list', nameFa: 'دپارتمان‌ها و واحدها', path: '/hr/departments', actions: ACTIONS },
        ],
      },
      {
        key: 'performance',
        nameFa: 'ارزیابی عملکرد',
        pages: [
          { key: 'list', nameFa: 'دوره ارزیابی پرسنل', path: '/hr/performance', actions: ACTIONS },
        ],
      },
    ],
  },
  {
    module: 'cmms',
    nameFa: 'نگهداری و تعمیرات نت',
    subsystems: [
      {
        key: 'assets',
        nameFa: 'تجهیزات و ماشین‌آلات',
        pages: [
          { key: 'list', nameFa: 'شناسنامه تجهیزات', path: '/cmms/assets', actions: ACTIONS },
        ],
      },
      {
        key: 'work-orders',
        nameFa: 'دستور کار تعمیراتی',
        pages: [
          { key: 'list', nameFa: 'دستورات کار', path: '/cmms/work-orders', actions: ACTIONS },
        ],
      },
      {
        key: 'plans',
        nameFa: 'سرویس دوره‌ای PM',
        pages: [
          { key: 'list', nameFa: 'برنامه‌های نگهداری', path: '/cmms/plans', actions: ACTIONS },
        ],
      },
      {
        key: 'spare-parts',
        nameFa: 'قطعات یدکی',
        pages: [
          { key: 'list', nameFa: 'انبار قطعات نت', path: '/cmms/spare-parts', actions: ACTIONS },
        ],
      },
      {
        key: 'technicians',
        nameFa: 'تکنسین‌ها و شیفت‌ها',
        pages: [
          { key: 'list', nameFa: 'کادر تعمیرات', path: '/cmms/technicians', actions: ACTIONS },
        ],
      },
      {
        key: 'contractors',
        nameFa: 'پیمانکاران تعمیرات',
        pages: [
          { key: 'list', nameFa: 'پیمانکاران بیرونی', path: '/cmms/contractors', actions: ACTIONS },
        ],
      },
      {
        key: 'failures',
        nameFa: 'گزارش خرابی و رخداد',
        pages: [
          { key: 'list', nameFa: 'ثبت خرابی اضطراری', path: '/cmms/failures', actions: ACTIONS },
        ],
      },
    ],
  },
  {
    module: 'hse',
    nameFa: 'بهداشت، ایمنی و محیط زیست',
    subsystems: [
      {
        key: 'incidents',
        nameFa: 'حوادث و شبه‌حوادث',
        pages: [
          { key: 'list', nameFa: 'گزارش حوادث', path: '/hse/incidents', actions: ACTIONS },
        ],
      },
      {
        key: 'risks',
        nameFa: 'ماتریس ریسک',
        pages: [
          { key: 'list', nameFa: 'ارزیابی ریسک‌ها', path: '/hse/risks', actions: ACTIONS },
        ],
      },
      {
        key: 'capa',
        nameFa: 'اقدامات اصلاحی CAPA',
        pages: [
          { key: 'list', nameFa: 'اقدامات پیشگیرانه', path: '/hse/capas', actions: ACTIONS },
        ],
      },
      {
        key: 'inspections',
        nameFa: 'چک‌لیست بازرسی',
        pages: [
          { key: 'list', nameFa: 'ممیزی‌های ایمنی', path: '/hse/inspections', actions: ACTIONS },
        ],
      },
      {
        key: 'emergency',
        nameFa: 'وضعیت اضطراری',
        pages: [
          { key: 'list', nameFa: 'مانورها و بحران', path: '/hse/emergency', actions: ACTIONS },
        ],
      },
      {
        key: 'environmental',
        nameFa: 'پایش آلایندگی',
        pages: [
          { key: 'list', nameFa: 'شاخص‌های زیست‌محیطی', path: '/hse/environmental', actions: ACTIONS },
        ],
      },
      {
        key: 'training',
        nameFa: 'دوره‌های ایمنی',
        pages: [
          { key: 'list', nameFa: 'آموزش‌های HSE', path: '/hse/training', actions: ACTIONS },
        ],
      },
      {
        key: 'statistics',
        nameFa: 'آمار و شاخص‌های سلامت',
        pages: [
          { key: 'list', nameFa: 'شاخص ضریب حوادث', path: '/hse/statistics', actions: ['view'] },
        ],
      },
    ],
  },
  {
    module: 'inventory',
    nameFa: 'انبار و لجستیک کالا',
    subsystems: [
      {
        key: 'warehouses',
        nameFa: 'انبارها و موقعیت‌ها',
        pages: [
          { key: 'list', nameFa: 'لیست انبارها', path: '/inventory/warehouses', actions: ACTIONS },
        ],
      },
      {
        key: 'items',
        nameFa: 'کاتالوگ اقلام',
        pages: [
          { key: 'list', nameFa: 'شناسنامه کالا', path: '/inventory/items', actions: ACTIONS },
        ],
      },
      {
        key: 'requisitions',
        nameFa: 'درخواست کالا از انبار',
        pages: [
          { key: 'list', nameFa: 'حواله‌های مصرف', path: '/inventory/requisitions', actions: ACTIONS },
        ],
      },
      {
        key: 'purchase-orders',
        nameFa: 'سفارشات خرید کالا',
        pages: [
          { key: 'list', nameFa: 'سفارش خرید PO', path: '/inventory/purchase-orders', actions: ACTIONS },
        ],
      },
      {
        key: 'purchase-requests',
        nameFa: 'درخواست‌های خرید PR',
        pages: [
          { key: 'list', nameFa: 'پیش‌نویس خرید', path: '/inventory/purchase-requests', actions: ACTIONS },
        ],
      },
      {
        key: 'goods-receipt',
        nameFa: 'رسید ورود کالا',
        pages: [
          { key: 'list', nameFa: 'رسید انبار GR', path: '/inventory/goods-receipt', actions: ACTIONS },
        ],
      },
      {
        key: 'stock',
        nameFa: 'کاردکس و موجودی',
        pages: [
          { key: 'list', nameFa: 'موجودی انبارها', path: '/inventory/stock', actions: ['view', 'update'] },
        ],
      },
      {
        key: 'physical-counts',
        nameFa: 'انبارگردانی',
        pages: [
          { key: 'list', nameFa: 'شمارش موجودی', path: '/inventory/counts', actions: ACTIONS },
        ],
      },
      {
        key: 'vendors',
        nameFa: 'تأمین‌کنندگان انبار',
        pages: [
          { key: 'list', nameFa: 'وندورهای معتبر', path: '/inventory/vendors', actions: ACTIONS },
        ],
      },
    ],
  },
  {
    module: 'reporting',
    nameFa: 'سامانه هوش تجاری و گزارشات',
    subsystems: [
      {
        key: 'reports',
        nameFa: 'تعاریف گزارش',
        pages: [
          { key: 'definitions', nameFa: 'طراحی گزارش', path: '/reports', actions: ACTIONS },
          { key: 'dashboards', nameFa: 'داشبورد مدیریتی', path: '/dashboards', actions: ['view', 'create', 'update', 'delete'] },
          { key: 'metrics', nameFa: 'شاخص‌های کلیدی', path: '/metrics', actions: ['view', 'create', 'update', 'delete'] },
          { key: 'schedules', nameFa: 'زمان‌بندی گزارشات', path: '/reports/schedules', actions: ACTIONS },
          { key: 'standard', nameFa: 'گزارشات آماده سامانه', path: '/reports/standard', actions: ['view'] },
        ],
      },
      {
        key: 'dashboard',
        nameFa: 'داشبوردها',
        pages: [{ key: 'list', nameFa: 'لیست داشبوردها', path: '/dashboards', actions: ACTIONS }],
      },
      {
        key: 'report-definition',
        nameFa: 'تعاریف گزارش',
        pages: [{ key: 'list', nameFa: 'لیست گزارش‌ها', path: '/reports', actions: ACTIONS }],
      },
      {
        key: 'schedule',
        nameFa: 'زمان‌بندی گزارشات',
        pages: [{ key: 'list', nameFa: 'برنامه‌های زمان‌بندی', path: '/reports/schedules', actions: ACTIONS }],
      },
      {
        key: 'standard-reports',
        nameFa: 'گزارشات استاندارد',
        pages: [{ key: 'list', nameFa: 'گزارشات سازمانی', path: '/reports/standard', actions: ACTIONS }],
      },
      {
        key: 'metrics',
        nameFa: 'شاخص‌های کلیدی',
        pages: [{ key: 'list', nameFa: 'متریک‌های سازمانی', path: '/metrics', actions: ACTIONS }],
      },
    ],
  },
  {
    module: 'super-admin',
    nameFa: 'مدیریت ارشد ملی',
    subsystems: [
      {
        key: 'audit',
        nameFa: 'حسابرسی امنیتی',
        pages: [
          { key: 'logs', nameFa: 'لاگ‌های رخدادها', path: '/super/audit/logs', actions: ['view'] },
          { key: 'suspicious', nameFa: 'رفتارهای مشکوک', path: '/super/audit/suspicious', actions: ['view'] },
        ],
      },
      {
        key: 'zones',
        nameFa: 'نظارت بر شهرک‌ها',
        pages: [
          { key: 'list', nameFa: 'مدیریت کلان شهرک‌ها', path: '/super/zones', actions: ACTIONS },
        ],
      },
      {
        key: 'companies',
        nameFa: 'نظارت بر شرکت‌ها',
        pages: [
          { key: 'list', nameFa: 'مدیریت کلان شرکت‌ها', path: '/super/companies', actions: ACTIONS },
        ],
      },
      {
        key: 'system-config',
        nameFa: 'تنظیمات کلان سامانه',
        pages: [
          { key: 'settings', nameFa: 'پیکربندی سراسری', path: '/super/system-config', actions: ACTIONS },
        ],
      },
    ],
  },
  {
    module: 'document-verification',
    nameFa: 'اصالت‌سنجی و اعتبارسنجی اسناد',
    subsystems: [
      {
        key: 'verification',
        nameFa: 'درگاه بررسی اصالت',
        pages: [
          { key: 'verify', nameFa: 'استعلام سند با بارکد', path: '/verify', actions: ['view'] },
          { key: 'admin', nameFa: 'مدیریت گواهی‌ها', path: '/super/verification', actions: ACTIONS },
        ],
      },
    ],
  },
  {
    module: 'digital-signature',
    nameFa: 'زیرساخت امضای دیجیتال امن',
    subsystems: [
      {
        key: 'signatures',
        nameFa: 'گردش امضا',
        pages: [
          { key: 'requests', nameFa: 'کارتابل درخواست امضا', path: '/signatures/requests', actions: ACTIONS },
          { key: 'certificates', nameFa: 'گواهی‌های دیجیتال', path: '/signatures/certificates', actions: ACTIONS },
          { key: 'documents', nameFa: 'اسناد امضا شده', path: '/signatures/documents', actions: ACTIONS },
          { key: 'templates', nameFa: 'قالب‌های سند امضا', path: '/signatures/templates', actions: ACTIONS },
          { key: 'agent', nameFa: 'عامل سخت‌افزاری توکن', path: '/signatures/agent', actions: ACTIONS },
          { key: 'verify', nameFa: 'اعتبارسنجی هش امضا', path: '/signatures/verify', actions: ['view', 'create'] },
        ],
      },
      {
        key: 'certificate',
        nameFa: 'صدور گواهی امضا',
        pages: [{ key: 'list', nameFa: 'گواهی‌ها', path: '/signatures/certificates', actions: ACTIONS }],
      },
      {
        key: 'signature-request',
        nameFa: 'درخواست‌های امضا',
        pages: [{ key: 'list', nameFa: 'کارتابل درخواست امضا', path: '/signatures/requests', actions: ACTIONS }],
      },
      {
        key: 'document-signature',
        nameFa: 'اسناد امضا شده',
        pages: [{ key: 'list', nameFa: 'فایل‌های امضاشده', path: '/signatures/documents', actions: ACTIONS }],
      },
      {
        key: 'template',
        nameFa: 'قالب‌های امضا',
        pages: [{ key: 'list', nameFa: 'الگوهای قرارداد', path: '/signatures/templates', actions: ACTIONS }],
      },
      {
        key: 'verification',
        nameFa: 'اعتبارسنجی امضا',
        pages: [{ key: 'list', nameFa: 'تأیید هش امضا', path: '/signatures/verify', actions: ACTIONS }],
      },
      {
        key: 'agent',
        nameFa: 'عامل توکن سخت‌افزاری',
        pages: [{ key: 'list', nameFa: 'سرویس توکن', path: '/signatures/agent', actions: ACTIONS }],
      },
    ],
  },
  {
    module: 'commercial',
    nameFa: 'بازرگانی، فروش و وصول',
    subsystems: [
      {
        key: 'proforma',
        nameFa: 'پیش‌فاکتور فروش',
        pages: [
          { key: 'list', nameFa: 'لیست پیش‌فاکتورها', path: '/commercial/proformas', actions: ACTIONS },
        ],
      },
      {
        key: 'orders',
        nameFa: 'سفارشات خرید و فروش',
        pages: [
          { key: 'list', nameFa: 'لیست سفارشات', path: '/commercial/orders', actions: ACTIONS },
        ],
      },
      {
        key: 'contracts',
        nameFa: 'قراردادهای تجاری',
        pages: [
          { key: 'list', nameFa: 'لیست قراردادها', path: '/commercial/contracts', actions: ACTIONS },
        ],
      },
      {
        key: 'collection',
        nameFa: 'وصول مطالبات و چک‌ها',
        pages: [
          { key: 'list', nameFa: 'پرونده‌های وصول', path: '/commercial/collection', actions: ACTIONS },
        ],
      },
      {
        key: 'parties',
        nameFa: 'طرف‌های تجاری',
        pages: [
          { key: 'list', nameFa: 'مشتریان و تأمین‌کنندگان', path: '/commercial/parties', actions: ACTIONS },
        ],
      },
    ],
  },
];

export function buildPermissionString(module: string, page: string, action: string, subsystem?: string): string {
  if (subsystem && subsystem !== page) {
    return `${module}.${subsystem}.${page}.${action}`;
  }
  return `${module}.${page}.${action}`;
}

export function getAllPermissionStrings(): string[] {
  const result = new Set<string>();
  for (const mod of PERMISSIONS_CATALOG) {
    for (const sub of mod.subsystems) {
      for (const page of sub.pages) {
        for (const action of page.actions) {
          result.add(`${mod.module}.${page.key}.${action}`);
          result.add(`${mod.module}.${sub.key}.${action}`);
          result.add(`${mod.module}.${sub.key}.${page.key}.${action}`);
        }
      }
    }
  }
  return Array.from(result);
}
