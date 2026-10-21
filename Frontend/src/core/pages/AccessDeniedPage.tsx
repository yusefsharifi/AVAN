// ═══════════════════════════════════════════════════════════════════════════════
// AccessDeniedPage — 403 Forbidden Access Page
// ═══════════════════════════════════════════════════════════════════════════════

import { useNavigate } from 'react-router';
import { ShieldAlert, ArrowRight, Home, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/core/stores/useAuthStore';
import { getDefaultPathForRole } from '@/core/components/ProtectedRoute';

export function AccessDeniedPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const homePath = getDefaultPathForRole(user?.role);

  return (
    <div
      dir="rtl"
      className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 font-[Vazirmatn]"
    >
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 text-center relative overflow-hidden">
        {/* Subtle accent backdrop blur */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#0047E1]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-[#00B8F0]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Shield Icon */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 mb-6 shadow-sm">
          <ShieldAlert className="w-10 h-10" />
        </div>

        {/* Code & Title */}
        <div className="inline-block px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-bold rounded-full mb-3 tracking-wide">
          خطای ۴۰۳ — عدم دسترسی
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
          سطح دسترسی شما کافی نیست
        </h1>

        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
          شما مجوزهای لازم برای دسترسی به این بخش از سامانه را ندارید. لطفاً نقش و دسترسی‌های حساب کاربری خود را بررسی فرمایید.
        </p>

        {/* User Info Card */}
        {user && (
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/60 text-xs text-right space-y-1 mb-6">
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
              <span>کاربر فعلی:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {user.firstName} {user.lastName}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
              <span>نقش اصلی:</span>
              <span className="font-mono font-medium text-[#0047E1] dark:text-[#00B8F0]">
                {user.role}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => navigate(homePath, { replace: true })}
            className="flex-1 bg-[#0047E1] hover:bg-[#0038b5] text-white flex items-center justify-center gap-2 font-medium"
          >
            <Home className="w-4 h-4" />
            بازگشت به داشبورد
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex-1 flex items-center justify-center gap-2 text-slate-700 dark:text-slate-300"
          >
            <ArrowRight className="w-4 h-4" />
            صفحه قبلی
          </Button>
        </div>

        {/* Support hint */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>در صورت نیاز به این دسترسی، با مدیر سیستم تماس بگیرید.</span>
        </div>
      </div>
    </div>
  );
}

export default AccessDeniedPage;
