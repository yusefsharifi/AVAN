// ═══════════════════════════════════════════════════════════════════════════════
// Route Permissions Mapping — Maps frontend route patterns to permission keys
// ═══════════════════════════════════════════════════════════════════════════════

export interface RoutePermissionRule {
  pattern: RegExp;
  permission: string;
  descriptionFa: string;
}

export const ROUTE_PERMISSIONS: Record<string, string> = {
  // Roles & RBAC Management
  '/roles': 'users.roles.view',
  '/super-admin/roles': 'users.roles.view',

  // Core Management
  '/super-admin/users': 'users.list.view',
  '/super-admin/companies': 'companies.list.view',
  '/super-admin/parks': 'zones.list.view',
  '/super-admin/financial': 'finance.dashboard.view',
  '/super-admin/waybills': 'logistics.waybills.view',
  '/super-admin/bascule': 'logistics.bascule.view',
  '/super-admin/certificates': 'quality.certificates.view',
  '/super-admin/audit-logs': 'audit.logs.view',
  '/super-admin/system': 'system.health.view',
  '/super-admin/settings': 'settings.general.view',
  '/super-admin/mobile-config': 'system.mobile.view',
  '/super-admin/push-notifications': 'notifications.push.view',
  '/super-admin/versions': 'system.versions.view',
  '/super-admin/reports': 'reports.general.view',

  // Marketplace & B2B
  '/city/marketplace': 'b2b.marketplace.view',
  '/portal/marketplace': 'b2b.marketplace.view',
  '/portal/marketplace/rfqs': 'b2b.rfq.view',
  '/portal/marketplace/bids': 'b2b.bids.view',
  '/portal/marketplace/bids/opportunities': 'b2b.bids.view',

  // Operational Modules
  '/inventory': 'inventory.stock.view',
  '/hr': 'hr.employees.view',
  '/finance': 'finance.dashboard.view',
  '/commercial': 'commercial.orders.view',
  '/weighbridge': 'logistics.bascule.view',
  '/correspondence': 'correspondence.letters.view',
  '/workflow': 'workflow.definitions.view',

  // Accounting & Finance deep routes
  '/accounting/payroll/reports': 'hr.payroll.view',
  '/accounting/payroll/dashboard': 'hr.payroll.view',
  '/accounting/payroll/employees': 'hr.employees.view',
  '/accounting/payroll/calculation': 'hr.payroll.view',
  '/accounting/fiscal-year/close': 'finance.fiscal.view',
  '/accounting/assets/register': 'finance.assets.view',
  '/accounting/assets/depreciation': 'finance.assets.view',
  '/accounting/reports/trial-balance': 'finance.reports.view',
  '/accounting/reports/account-card': 'finance.reports.view',
  '/accounting/reports/balance-sheet': 'finance.reports.view',
  '/accounting/reports/income-statement': 'finance.reports.view',
};

export const ROUTE_PATTERN_RULES: RoutePermissionRule[] = [
  { pattern: /^\/roles(\/.*)?$/, permission: 'users.roles.view', descriptionFa: 'مدیریت نقش‌ها و دسترسی‌ها' },
  { pattern: /^\/accounting\/payroll(\/.*)?$/, permission: 'hr.payroll.view', descriptionFa: 'حقوق و دستمزد' },
  { pattern: /^\/accounting\/assets(\/.*)?$/, permission: 'finance.assets.view', descriptionFa: 'اموال و دارایی‌های ثابت' },
  { pattern: /^\/accounting\/reports(\/.*)?$/, permission: 'finance.reports.view', descriptionFa: 'گزارش‌های مالی و حسابداری' },
  { pattern: /^\/accounting\/fiscal-year(\/.*)?$/, permission: 'finance.fiscal.view', descriptionFa: 'بستن سال مالی' },
  { pattern: /^\/portal\/marketplace(\/.*)?$/, permission: 'b2b.marketplace.view', descriptionFa: 'بازارگاه B2B' },
  { pattern: /^\/inventory(\/.*)?$/, permission: 'inventory.stock.view', descriptionFa: 'انبارداری و موجودی کالا' },
  { pattern: /^\/commercial(\/.*)?$/, permission: 'commercial.orders.view', descriptionFa: 'بازرگانی و قراردادها' },
  { pattern: /^\/hr(\/.*)?$/, permission: 'hr.employees.view', descriptionFa: 'منابع انسانی و پرسنل' },
  { pattern: /^\/finance(\/.*)?$/, permission: 'finance.dashboard.view', descriptionFa: 'مدیریت مالی' },
  { pattern: /^\/weighbridge(\/.*)?$/, permission: 'logistics.bascule.view', descriptionFa: 'باسکول و توزین' },
  { pattern: /^\/correspondence(\/.*)?$/, permission: 'correspondence.letters.view', descriptionFa: 'دبیرخانه و مکاتبات اداری' },
  { pattern: /^\/workflow(\/.*)?$/, permission: 'workflow.definitions.view', descriptionFa: 'مدیریت فرآیندها' },
];

/**
 * Returns required permission string for a given URL pathname, or undefined if public/unrestricted
 */
export function getRequiredPermissionForRoute(pathname: string): string | undefined {
  const cleanPath = pathname.split('?')[0].replace(/\/+$/, '') || '/';

  // 1. Exact match in lookup table
  if (ROUTE_PERMISSIONS[cleanPath]) {
    return ROUTE_PERMISSIONS[cleanPath];
  }

  // 2. Pattern match in rules
  for (const rule of ROUTE_PATTERN_RULES) {
    if (rule.pattern.test(cleanPath)) {
      return rule.permission;
    }
  }

  return undefined;
}
