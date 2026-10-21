import { useState } from 'react';
import { 
  UnifiedSidebar, 
  NationalCommandCenter, 
  ZoneOnboardingWizard,
  NationalCompanyRegistry,
  UsersManagementPage
} from './modules/dashboard/super-admin/components';

// Route components mapping
const routes: Record<string, React.ReactNode> = {
  '/super-admin/dashboard': <NationalCommandCenter />,
  '/super-admin/parks/onboarding': <ZoneOnboardingWizard />,
  '/super-admin/companies': <NationalCompanyRegistry />,
  '/super-admin/users': <UsersManagementPage />,
};

// Placeholder component for routes under development
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-full bg-slate-50" dir="rtl">
      <div className="text-center p-8 bg-white rounded-xl border border-slate-200 shadow-sm max-w-md">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">{title}</h2>
        <p className="text-slate-500 text-sm">این صفحه در حال توسعه است و به زودی فعال خواهد شد.</p>
      </div>
    </div>
  );
}

export default function App() {
  const [currentPath, setCurrentPath] = useState('/super-admin/dashboard');

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
  };

  // Get current page title for placeholder
  const getPageTitle = (path: string) => {
    const titles: Record<string, string> = {
      '/super-admin/dashboard': 'داشبورد ملی',
      '/super-admin/gis-map': 'نقشه GIS ملی',
      '/super-admin/health-scores': 'امتیاز سلامت شهرک‌ها',
      '/super-admin/alerts': 'هشدارهای ملی',
      '/super-admin/watchlist': 'لیست نظارت',
      '/super-admin/reports': 'گزارشات ملی',
      '/super-admin/parks': 'شهرک‌های صنعتی',
      '/super-admin/parks/onboarding': 'ثبت شهرک جدید',
      '/super-admin/companies': 'ثبت ملی شرکت‌ها',
      '/super-admin/companies/onboarding': 'ثبت شرکت جدید',
      '/super-admin/leases': 'اجاره و قطعات',
      '/super-admin/certificates': 'گواهینامه‌ها و مجوزها',
      '/super-admin/marketplace': 'تحلیل بازار',
      '/super-admin/users': 'مدیریت کاربران',
      '/super-admin/roles': 'مدیریت نقش‌ها',
      '/super-admin/permissions': 'ماتریس دسترسی',
      '/super-admin/sessions': 'نشست‌های فعال',
      '/super-admin/mfa': 'سیاست‌های MFA',
      '/super-admin/audit': 'لاگ‌های حسابرسی',
      '/super-admin/security-events': 'رویدادهای امنیتی',
      '/super-admin/weighbridges': 'مدیریت باسکول‌ها',
      '/super-admin/waybills': 'مدیریت بارنامه‌ها',
      '/super-admin/inventory': 'انبار ملی',
      '/super-admin/devices': 'دستگاه‌های IoT',
      '/super-admin/device-health': 'سلامت دستگاه‌ها',
      '/super-admin/hse-alerts': 'هشدارهای HSE',
      '/super-admin/emergency': 'عملیات اضطراری',
      '/super-admin/finance': 'داشبورد مالی ملی',
      '/super-admin/receivables': 'مطالبات و وصول',
      '/super-admin/utility-billing': 'صورتحساب خدمات',
      '/super-admin/budget': 'بودجه و جریان نقد',
      '/super-admin/finance-reports': 'گزارشات مالی',
      '/super-admin/marketplace-analytics': 'تحلیل بازار تجمیعی',
      '/super-admin/benchmarking': 'الگوبرداری ملی',
      '/super-admin/workflow-builder': 'سازنده گردش کار',
      '/super-admin/workflow-scenarios': 'سناریوهای گردش کار',
      '/super-admin/workflow-templates': 'قالب‌های گردش کار',
      '/super-admin/mobile-config': 'پیکربندی موبایل',
      '/super-admin/push-notifications': 'اعلان‌های پوش',
      '/super-admin/app-versions': 'نسخه‌های اپلیکیشن',
      '/super-admin/settings': 'تنظیمات سیستم',
      '/super-admin/api-keys': 'کلیدهای API',
      '/super-admin/webhooks': 'مدیریت Webhooks',
      '/super-admin/integrations': 'سلامت یکپارچه‌سازی',
      '/super-admin/system-health': 'سلامت سیستم',
    };
    return titles[path] || 'صفحه';
  };

  // Render current page content
  const renderContent = () => {
    if (routes[currentPath]) {
      return routes[currentPath];
    }
    return <PlaceholderPage title={getPageTitle(currentPath)} />;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* Sidebar */}
      <UnifiedSidebar currentPath={currentPath} onNavigate={handleNavigate} />
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
}
