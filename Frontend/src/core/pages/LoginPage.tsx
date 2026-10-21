import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router';
import { Phone, Lock, ArrowRight, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';

import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/app/components/ui/form';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/app/components/ui/input-otp';

import { useAuthStore } from '@/core/stores/useAuthStore';
import { getDefaultPathForRole } from '@/core/components/ProtectedRoute';

const loginSchema = z.object({
  phone: z
    .string()
    .min(1, 'شماره موبایل را وارد کنید')
    .regex(/^09\d{9}$/, 'شماره موبایل معتبر وارد کنید (۰۹XXXXXXXXX)'),
  password: z.string().min(6, 'رمز عبور حداقل ۶ کاراکتر است'),
});

type LoginValues = z.infer<typeof loginSchema>;

function maskPhone(phone: string | null): string {
  if (!phone) return '';
  return phone.replace(/^(\d{3})(\d{4})(\d{4})$/, '$1****$3');
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const login = useAuthStore((s) => s.login);
  const sendOtp = useAuthStore((s) => s.sendOtp);
  const setOtpRequired = useAuthStore((s) => s.setOtpRequired);
  const clearError = useAuthStore((s) => s.clearError);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const user = useAuthStore((s) => s.user);
  const requiresOtp = useAuthStore((s) => s.requiresOtp);
  const pendingPhone = useAuthStore((s) => s.pendingPhone);
  const error = useAuthStore((s) => s.error);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', password: '' },
    mode: 'onSubmit',
  });

  const redirectTo = (path?: string) => {
    const from = (location.state as { from?: string } | null)?.from;
    navigate(path || from || (user ? getDefaultPathForRole(user.role) : '/login'), {
      replace: true,
    });
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      redirectTo();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  useEffect(() => {
    if (!requiresOtp) {
      setOtpCode('');
    }
  }, [requiresOtp]);

  const onSubmit = async (values: LoginValues) => {
    clearError();
    try {
      await login({
        identifier: values.phone,
        password: values.password,
        deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : 'web',
      });
    } catch {}
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) return;
    clearError();
    const phone = form.getValues('phone');
    const password = form.getValues('password');
    try {
      await login({
        identifier: phone,
        password,
        otpCode,
        deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : 'web',
      });
    } catch {}
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    const phone = pendingPhone || form.getValues('phone');
    if (!phone) return;
    clearError();
    try {
      await sendOtp(phone, 'login');
      setResendCooldown(60);
    } catch {}
  };

  const handleBack = () => {
    clearError();
    setOtpRequired(false);
    setOtpCode('');
  };

  return (
    <div
      dir="rtl"
      className="relative min-h-screen w-full overflow-hidden flex items-center justify-center p-4 bg-brand-gradient"
    >
      <div className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />

      {isInitializing ? (
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      ) : (
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-xl border border-white/25 shadow-xl overflow-hidden">
            <img src="/avan-logo.png" alt="آوان" className="h-16 w-16 object-contain" style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))' }} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">آوان</h1>
            <p className="text-xs font-medium tracking-[0.3em] text-white/70">AVAN</p>
          </div>
          <p className="text-sm text-white/80">سامانه یکپارچه مدیریت شهرک‌های صنعتی آوان</p>
        </div>

        <div className="rounded-3xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl p-6 sm:p-8">
          {!requiresOtp ? (
            <>
              <div className="mb-6 text-center">
                <h2 className="text-lg font-semibold text-white">ورود به حساب</h2>
                <p className="mt-1 text-xs text-white/70">
                  شماره موبایل و رمز عبور خود را وارد کنید
                </p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/90">شماره موبایل</FormLabel>
                        <div className="relative">
                          <Phone className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                          <FormControl>
                            <Input
                              {...field}
                              dir="ltr"
                              inputMode="numeric"
                              placeholder="09123456789"
                              className="rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/40 pr-9 focus-visible:border-white/50 focus-visible:ring-white/20"
                            />
                          </FormControl>
                        </div>
                        <FormMessage className="text-red-200" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/90">رمز عبور</FormLabel>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="••••••••"
                              className="rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/40 pr-9 focus-visible:border-white/50 focus-visible:ring-white/20"
                            />
                          </FormControl>
                        </div>
                        <FormMessage className="text-red-200" />
                      </FormItem>
                    )}
                  />

                  {error && (
                    <div className="rounded-xl border border-red-300/40 bg-red-500/15 px-3 py-2.5 text-xs text-red-100">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 rounded-xl bg-white text-foreground hover:bg-white/90 font-semibold text-sm shadow-lg disabled:opacity-60"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <span>ورود</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </>
          ) : (
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 border border-white/25">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-white">تأیید پیامک یک‌بارمصرف</h2>
                <p className="mt-1 text-xs text-white/70">
                  کد ۶ رقمی ارسال‌شده به
                  <span className="mx-1 font-mono" dir="ltr">
                    {maskPhone(pendingPhone) || maskPhone(form.getValues('phone'))}
                  </span>
                  را وارد کنید
                </p>
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-5">
                <div className="flex justify-center" dir="ltr">
                  <InputOTP
                    maxLength={6}
                    value={otpCode}
                    onChange={(v) => setOtpCode(v.replace(/\D/g, ''))}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="h-12 w-12 text-base bg-white/10 border-white/30 text-white" />
                      <InputOTPSlot index={1} className="h-12 w-12 text-base bg-white/10 border-white/30 text-white" />
                      <InputOTPSlot index={2} className="h-12 w-12 text-base bg-white/10 border-white/30 text-white" />
                    </InputOTPGroup>
                    <InputOTPSeparator className="text-white/40" />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} className="h-12 w-12 text-base bg-white/10 border-white/30 text-white" />
                      <InputOTPSlot index={4} className="h-12 w-12 text-base bg-white/10 border-white/30 text-white" />
                      <InputOTPSlot index={5} className="h-12 w-12 text-base bg-white/10 border-white/30 text-white" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-300/40 bg-red-500/15 px-3 py-2.5 text-center text-xs text-red-100">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading || otpCode.length !== 6}
                  className="w-full h-11 rounded-xl bg-white text-foreground hover:bg-white/90 font-semibold text-sm shadow-lg disabled:opacity-60"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>تأیید و ورود</span>
                  )}
                </Button>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-xs text-white/70 hover:text-white transition-colors"
                  >
                    بازگشت
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || isLoading}
                    className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {resendCooldown > 0
                      ? `ارسال مجدد (${resendCooldown})`
                      : 'ارسال مجدد کد'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-white/60">
          © {new Date().getFullYear()} آوان (AVAN) — تمامی حقوق محفوظ است.
        </p>
      </div>
      )}
    </div>
  );
}
