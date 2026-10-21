import { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Search, Edit2, Ban, CheckCircle, KeyRound, Trash2, Loader2, X,
} from 'lucide-react';
import { toast } from 'sonner';

import { usersApi, type UserDto, type UserRole, type UserStatus } from '@/shared/api/users.api';
import { companiesApi, type CompanyDto } from '@/shared/api/companies.api';
import { useAuthStore } from '@/core/stores/useAuthStore';

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/app/components/ui/select';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';

const ROLE_LABELS_FA: Record<string, string> = {
  SUPER_ADMIN: 'مدیر ارشد',
  ZONE_MANAGER: 'مدیر شهرک',
  ZONE_OPERATOR: 'کارشناس شهرک',
  COMPANY_ADMIN: 'مدیر شرکت',
  COMPANY_MANAGER: 'کارمند ارشد شرکت',
  COMPANY_STAFF: 'کارمند شرکت',
  GUARD: 'نگهبان',
  DRIVER: 'راننده',
};

const STATUS_LABELS_FA: Record<string, string> = {
  PENDING: 'در انتظار',
  ACTIVE: 'فعال',
  SUSPENDED: 'معلق',
  BANNED: 'مسدود',
  LOCKED: 'قفل‌شده',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  SUSPENDED: 'bg-red-50 text-red-700',
  BANNED: 'bg-slate-100 text-slate-600',
  LOCKED: 'bg-blue-50 text-blue-700',
};

const ZONE_MANAGER_ROLES: UserRole[] = ['ZONE_OPERATOR', 'GUARD', 'DRIVER', 'COMPANY_ADMIN'];
const COMPANY_ROLES: UserRole[] = ['COMPANY_MANAGER', 'COMPANY_STAFF'];

interface UsersManagementProps {
  scope: 'zone' | 'company';
  scopeName?: string;
}

export default function UsersManagement({ scope, scopeName }: UsersManagementProps) {
  const user = useAuthStore((s) => s.user);
  const actorRole = user?.role || '';

  const isZoneScope = scope === 'zone';
  const allowedRoles: UserRole[] = isZoneScope ? ZONE_MANAGER_ROLES : COMPANY_ROLES;
  const zoneId = user?.zoneId;
  const companyId = user?.companyId;

  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserDto | null>(null);
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await usersApi.list({
        page,
        limit: 20,
        search: search || undefined,
        role: (roleFilter || undefined) as UserRole | undefined,
        status: (statusFilter || undefined) as UserStatus | undefined,
        zoneId: isZoneScope ? zoneId : undefined,
        companyId: !isZoneScope ? companyId : undefined,
      });
      setUsers(result.items || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      toast.error(err?.message || 'خطا در دریافت لیست کاربران');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter, isZoneScope, zoneId, companyId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (isZoneScope && zoneId) {
      companiesApi.listByZone(zoneId).then(setCompanies).catch(() => {});
    }
  }, [isZoneScope, zoneId]);

  const handleCreate = async (data: CreateFormData) => {
    try {
      await usersApi.create({
        email: data.email,
        phone: data.phone,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        nationalId: data.nationalId || undefined,
        role: data.role,
        zoneId: isZoneScope ? zoneId : undefined,
        companyId: isZoneScope ? data.companyId : companyId,
      });
      toast.success('کاربر با موفقیت ایجاد شد');
      setCreateOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.message || 'خطا در ایجاد کاربر');
    }
  };

  const handleUpdate = async (id: string, data: Partial<CreateFormData>) => {
    try {
      await usersApi.update(id, {
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role as UserRole | undefined,
        companyId: data.companyId,
      });
      toast.success('کاربر به‌روزرسانی شد');
      setEditTarget(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.message || 'خطا در به‌روزرسانی');
    }
  };

  const handleSetStatus = async (id: string, status: UserStatus) => {
    setActionLoading(id + status);
    try {
      await usersApi.setStatus(id, status);
      toast.success(status === 'ACTIVE' ? 'کاربر فعال شد' : 'کاربر معلق شد');
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.message || 'خطا در تغییر وضعیت');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async (id: string) => {
    setActionLoading(id + 'reset');
    try {
      const result = await usersApi.resetPassword(id);
      toast.success(`رمز موقت: ${result.temporaryPassword}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.message || 'خطا در بازنشانی رمز');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این کاربر اطمینان دارید؟')) return;
    setActionLoading(id + 'delete');
    try {
      await usersApi.remove(id);
      toast.success('کاربر حذف شد');
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.message || 'خطا در حذف');
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">مدیریت کاربران</h2>
          {scopeName && (
            <span className="text-xs text-muted-foreground mr-2">· {scopeName}</span>
          )}
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-accent text-white hover:bg-accent/90"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          <span>کاربر جدید</span>
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="جستجو نام، ایمیل، موبایل…"
            className="pr-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="نقش" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه نقش‌ها</SelectItem>
            {allowedRoles.map((r) => (
              <SelectItem key={r} value={r}>{ROLE_LABELS_FA[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="وضعیت" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه وضعیت‌ها</SelectItem>
            {Object.entries(STATUS_LABELS_FA).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-right py-3 px-4 text-xs font-semibold text-foreground">نام</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-foreground">نقش</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-foreground">موبایل</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-foreground">ایمیل</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-foreground">وضعیت</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-foreground">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    کاربری یافت نشد
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="text-xs font-semibold text-foreground">{u.firstName} {u.lastName}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs text-muted-foreground">{ROLE_LABELS_FA[u.role] || u.role}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs text-muted-foreground font-mono" dir="ltr">{u.phone}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs text-muted-foreground font-mono" dir="ltr">{u.email}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[u.status] || 'bg-slate-100 text-slate-600'}`}>
                        {STATUS_LABELS_FA[u.status] || u.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditTarget(u)}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          title="ویرایش"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        {u.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleSetStatus(u.id, 'SUSPENDED')}
                            disabled={actionLoading === u.id + 'SUSPENDED'}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-muted-foreground hover:text-amber-600 transition-colors"
                            title="تعلیق"
                          >
                            {actionLoading === u.id + 'SUSPENDED' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSetStatus(u.id, 'ACTIVE')}
                            disabled={actionLoading === u.id + 'ACTIVE'}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-muted-foreground hover:text-emerald-600 transition-colors"
                            title="فعال‌سازی"
                          >
                            {actionLoading === u.id + 'ACTIVE' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                          </button>
                        )}
                        <button
                          onClick={() => handleResetPassword(u.id)}
                          disabled={actionLoading === u.id + 'reset'}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"
                          title="بازنشانی رمز"
                        >
                          {actionLoading === u.id + 'reset' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          disabled={actionLoading === u.id + 'delete'}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                          title="حذف"
                        >
                          {actionLoading === u.id + 'delete' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              نمایش صفحه {page.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')} · {total.toLocaleString('fa-IR')} کاربر
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                قبلی
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                بعدی
              </Button>
            </div>
          </div>
        )}
      </div>

      {createOpen && (
        <UserFormDialog
          mode="create"
          allowedRoles={allowedRoles}
          companies={isZoneScope ? companies : []}
          showCompanyField={isZoneScope}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
        />
      )}

      {editTarget && (
        <UserFormDialog
          mode="edit"
          user={editTarget}
          allowedRoles={allowedRoles}
          companies={isZoneScope ? companies : []}
          showCompanyField={isZoneScope}
          onClose={() => setEditTarget(null)}
          onSubmit={(data) => handleUpdate(editTarget.id, data)}
        />
      )}
    </div>
  );
}

interface CreateFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  nationalId?: string;
  role: UserRole;
  companyId?: string;
}

interface UserFormDialogProps {
  mode: 'create' | 'edit';
  user?: UserDto;
  allowedRoles: UserRole[];
  companies: CompanyDto[];
  showCompanyField: boolean;
  onClose: () => void;
  onSubmit: (data: CreateFormData) => Promise<unknown>;
}

function UserFormDialog({ mode, user, allowedRoles, companies, showCompanyField, onClose, onSubmit }: UserFormDialogProps) {
  const [form, setForm] = useState<CreateFormData>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    password: '',
    nationalId: '',
    role: allowedRoles[0],
    companyId: user?.companyId || undefined,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create' && !form.password) return;
    setSubmitting(true);
    onSubmit(form).finally(() => setSubmitting(false));
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl shadow-2xl p-5 w-[440px] max-w-[90vw] z-50" dir="rtl">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
          <p className="text-sm font-bold text-foreground">
            {mode === 'create' ? 'کاربر جدید' : 'ویرایش کاربر'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">نام</label>
              <Input
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">نام خانوادگی</label>
              <Input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
                className="text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">موبایل</label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              dir="ltr"
              inputMode="numeric"
              placeholder="09123456789"
              required
              disabled={mode === 'edit'}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">ایمیل</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              dir="ltr"
              required
              disabled={mode === 'edit'}
              className="text-sm"
            />
          </div>
          {mode === 'create' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">رمز عبور موقت</label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                dir="ltr"
                required
                minLength={8}
                className="text-sm"
              />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">نقش</label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedRoles.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS_FA[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {showCompanyField && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">شرکت (برای نقش‌های شرکتی)</label>
              <Select
                value={form.companyId || 'none'}
                onValueChange={(v) => setForm({ ...form, companyId: v === 'none' ? undefined : v })}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="بدون شرکت" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون شرکت</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nameFa}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">کد ملی (اختیاری)</label>
            <Input
              value={form.nationalId}
              onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
              dir="ltr"
              inputMode="numeric"
              maxLength={10}
              className="text-sm"
            />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-accent text-white hover:bg-accent/90"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'create' ? 'ایجاد کاربر' : 'ذخیره تغییرات'}
          </Button>
        </form>
      </div>
    </>
  );
}
