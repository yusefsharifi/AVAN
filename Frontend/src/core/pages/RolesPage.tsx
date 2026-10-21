// ═══════════════════════════════════════════════════════════════════════════════
// RolesPage — Complete Role-Based Access Control (RBAC) Management
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
  ShieldCheck,
  Shield,
  Users,
  Plus,
  Search,
  Trash2,
  Edit2,
  Lock,
  Building2,
  Factory,
  Globe,
  Layers,
  AlertCircle,
  UserPlus,
  UserMinus,
  RefreshCw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  permissionsApi,
  type Role,
  type RoleScope,
  type PermissionModule,
  type RoleUser,
} from '@/shared/api/permissions.api';
import { usersApi as usersApiTyped, type UserDto } from '@/shared/api/users.api';
import { useAuthStore } from '@/core/stores/useAuthStore';
import { PermissionTree } from '@/core/components/PermissionTree';

// ─── Zod Schema for Role Create / Edit ───────────────────────────────────────
const roleSchema = z.object({
  name: z
    .string()
    .min(2, 'شناسه انگلیسی باید حداقل ۲ نویسه باشد')
    .max(50, 'شناسه بیش از حد طولانی است')
    .regex(/^[A-Z0-9_]+$/, 'شناسه باید فقط شامل حروف بزرگ انگلیسی، اعداد و خط زیر (_) باشد (مثلاً LOGISTICS_SUPERVISOR)'),
  nameFa: z
    .string()
    .min(2, 'عنوان فارسی باید حداقل ۲ نویسه باشد')
    .max(80, 'عنوان بیش از حد طولانی است'),
  description: z.string().max(250, 'توضیحات نباید بیش از ۲۵۰ نویسه باشد').optional(),
  scopeType: z.enum(['GLOBAL', 'ZONE', 'COMPANY']),
});

type RoleFormData = z.infer<typeof roleSchema>;

const SCOPE_CONFIG: Record<
  RoleScope,
  { labelFa: string; icon: any; color: string; bg: string; border: string }
> = {
  GLOBAL: {
    labelFa: 'سراسری',
    icon: Globe,
    color: 'text-[#0047E1] dark:text-[#00B8F0]',
    bg: 'bg-[#0047E1]/10 dark:bg-[#0047E1]/20',
    border: 'border-[#0047E1]/30',
  },
  ZONE: {
    labelFa: 'منطقه / شهرک',
    icon: Factory,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-200 dark:border-purple-800',
  },
  COMPANY: {
    labelFa: 'شرکتی',
    icon: Building2,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
  },
};

export function RolesPage() {
  const user = useAuthStore((s) => s.user);

  // Core Data State
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<PermissionModule[]>([]);

  // Permissions of selected role
  const [currentPermissions, setCurrentPermissions] = useState<string[]>([]);
  const [initialPermissions, setInitialPermissions] = useState<string[]>([]);

  // Assigned Users of selected role
  const [assignedUsers, setAssignedUsers] = useState<RoleUser[]>([]);

  // Loading States
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [isLoadingRoleDetails, setIsLoadingRoleDetails] = useState(false);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Filters & Tabs
  const [scopeFilter, setScopeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'permissions' | 'users'>('permissions');

  // Dialogs State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  // Assign / Unassign User Modal State
  const [isAssignUserOpen, setIsAssignUserOpen] = useState(false);
  const [userToUnassign, setUserToUnassign] = useState<RoleUser | null>(null);
  const [availableUsers, setAvailableUsers] = useState<UserDto[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isLoadingAvailableUsers, setIsLoadingAvailableUsers] = useState(false);

  // Form for Create / Edit
  const {
    register,
    handleSubmit,
    reset: resetForm,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      nameFa: '',
      description: '',
      scopeType: 'COMPANY',
    },
  });

  // Selected Role Object
  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) || null,
    [roles, selectedRoleId],
  );

  // Check if permissions have changed locally
  const isDirty = useMemo(() => {
    if (currentPermissions.length !== initialPermissions.length) return true;
    const initialSet = new Set(initialPermissions);
    return currentPermissions.some((p) => !initialSet.has(p));
  }, [currentPermissions, initialPermissions]);

  // Allowed scopes for role creation based on current actor
  const allowedScopesForActor: RoleScope[] = useMemo(() => {
    if (!user) return ['COMPANY'];
    if (user.role === 'SUPER_ADMIN') return ['GLOBAL', 'ZONE', 'COMPANY'];
    if (user.role === 'ZONE_MANAGER') return ['ZONE'];
    if (user.role === 'COMPANY_ADMIN') return ['COMPANY'];
    return ['COMPANY'];
  }, [user]);

  // ─── Fetch Initial Data ──────────────────────────────────────────────────────
  const loadCatalog = useCallback(async () => {
    try {
      setIsLoadingCatalog(true);
      const data = await permissionsApi.getCatalog();
      setCatalog(data || []);
    } catch (err: any) {
      toast.error(err.message || 'خطا در بارگذاری فهرست دسترسی‌ها');
    } finally {
      setIsLoadingCatalog(false);
    }
  }, []);

  const loadRoles = useCallback(async (selectId?: string) => {
    try {
      setIsLoadingRoles(true);
      const data = await permissionsApi.listRoles();
      setRoles(data || []);

      // If specific role requested or current selection no longer exists, select first
      if (selectId && data.some((r) => r.id === selectId)) {
        setSelectedRoleId(selectId);
      } else if (data.length > 0) {
        setSelectedRoleId((prev) => (prev && data.some((r) => r.id === prev) ? prev : data[0].id));
      } else {
        setSelectedRoleId(null);
      }
    } catch (err: any) {
      toast.error(err.message || 'خطا در بارگذاری لیست نقش‌ها');
    } finally {
      setIsLoadingRoles(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
    loadRoles();
  }, [loadCatalog, loadRoles]);

  // ─── Load Active Role Permissions & Users ────────────────────────────────────
  const loadRolePermissions = useCallback(async (roleId: string) => {
    try {
      setIsLoadingRoleDetails(true);
      const perms = await permissionsApi.getRolePermissions(roleId);
      setCurrentPermissions(perms || []);
      setInitialPermissions(perms || []);
    } catch (err: any) {
      toast.error(err.message || 'خطا در دریافت دسترسی‌های نقش');
    } finally {
      setIsLoadingRoleDetails(false);
    }
  }, []);

  const loadRoleUsers = useCallback(async (roleId: string) => {
    try {
      setIsLoadingUsers(true);
      const users = await permissionsApi.getRoleUsers(roleId);
      setAssignedUsers(users || []);
    } catch (err: any) {
      toast.error(err.message || 'خطا در دریافت کاربران منتسب به نقش');
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRoleId) {
      loadRolePermissions(selectedRoleId);
      loadRoleUsers(selectedRoleId);
    } else {
      setCurrentPermissions([]);
      setInitialPermissions([]);
      setAssignedUsers([]);
    }
  }, [selectedRoleId, loadRolePermissions, loadRoleUsers]);

  // ─── Permissions Save & Reset ───────────────────────────────────────────────
  const handleSavePermissions = async () => {
    if (!selectedRoleId || selectedRole?.isSystem) return;

    try {
      setIsSavingPermissions(true);
      await permissionsApi.setRolePermissions(selectedRoleId, currentPermissions);
      setInitialPermissions(currentPermissions);
      toast.success('ماتریس دسترسی‌های نقش با موفقیت ذخیره شد');
      // Update local count
      setRoles((prev) =>
        prev.map((r) =>
          r.id === selectedRoleId
            ? {
                ...r,
                _count: {
                  ...r._count,
                  permissions: currentPermissions.length,
                },
              }
            : r,
        ),
      );
    } catch (err: any) {
      toast.error(err.message || 'خطا در ذخیره دسترسی‌های نقش');
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const handleResetPermissions = () => {
    setCurrentPermissions(initialPermissions);
    toast.info('تغییرات لغو و به وضعیت ذخیره شده بازگردانده شد');
  };

  // ─── Role Create / Edit Modals ──────────────────────────────────────────────
  const openCreateModal = () => {
    setEditingRole(null);
    resetForm({
      name: '',
      nameFa: '',
      description: '',
      scopeType: allowedScopesForActor[0] || 'COMPANY',
    });
    setIsCreateOpen(true);
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setValue('name', role.name);
    setValue('nameFa', role.nameFa);
    setValue('description', role.description || '');
    setValue('scopeType', role.scopeType);
    setIsCreateOpen(true);
  };

  const onFormSubmit = async (data: RoleFormData) => {
    try {
      if (editingRole) {
        // Edit Mode
        const updated = await permissionsApi.updateRole(editingRole.id, {
          name: editingRole.isSystem ? undefined : data.name,
          nameFa: data.nameFa,
          description: data.description,
        });
        toast.success(`نقش «${updated.nameFa}» به‌روزرسانی شد`);
        setIsCreateOpen(false);
        loadRoles(updated.id);
      } else {
        // Create Mode
        const created = await permissionsApi.createRole({
          name: data.name,
          nameFa: data.nameFa,
          description: data.description,
          scopeType: data.scopeType,
        });
        toast.success(`نقش «${created.nameFa}» با موفقیت ایجاد شد`);
        setIsCreateOpen(false);
        loadRoles(created.id);
      }
    } catch (err: any) {
      toast.error(err.message || 'عملیات با خطا مواجه شد');
    }
  };

  // ─── Delete Role ────────────────────────────────────────────────────────────
  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    try {
      await permissionsApi.deleteRole(roleToDelete.id);
      toast.success(`نقش «${roleToDelete.nameFa}» حذف شد`);
      setRoleToDelete(null);
      loadRoles();
    } catch (err: any) {
      toast.error(err.message || 'خطا در حذف نقش');
    }
  };

  // ─── Assign / Unassign User ─────────────────────────────────────────────────
  const openAssignModal = async () => {
    setIsAssignUserOpen(true);
    try {
      setIsLoadingAvailableUsers(true);
      const res = await usersApiTyped.list({ limit: 100 });
      setAvailableUsers(res.items || []);
    } catch (err: any) {
      toast.error(err.message || 'خطا در دریافت لیست کاربران');
    } finally {
      setIsLoadingAvailableUsers(false);
    }
  };

  const handleAssignUser = async (userId: string) => {
    if (!selectedRoleId) return;
    try {
      await permissionsApi.assignRole(selectedRoleId, userId);
      toast.success('نقش با موفقیت به کاربر انتساب داده شد');
      setIsAssignUserOpen(false);
      loadRoleUsers(selectedRoleId);
      // Update count
      setRoles((prev) =>
        prev.map((r) =>
          r.id === selectedRoleId
            ? { ...r, _count: { ...r._count, assignments: (r._count?.assignments || 0) + 1 } }
            : r,
        ),
      );
    } catch (err: any) {
      toast.error(err.message || 'خطا در انتساب نقش به کاربر');
    }
  };

  const handleUnassignUser = async () => {
    if (!selectedRoleId || !userToUnassign) return;
    try {
      await permissionsApi.unassignRole(selectedRoleId, userToUnassign.id);
      toast.success(`نقش از کاربر «${userToUnassign.firstName} ${userToUnassign.lastName}» سلب شد`);
      setUserToUnassign(null);
      loadRoleUsers(selectedRoleId);
      // Update count
      setRoles((prev) =>
        prev.map((r) =>
          r.id === selectedRoleId
            ? { ...r, _count: { ...r._count, assignments: Math.max(0, (r._count?.assignments || 1) - 1) } }
            : r,
        ),
      );
    } catch (err: any) {
      toast.error(err.message || 'خطا در سلب نقش از کاربر');
    }
  };

  // ─── Filtered Roles List ────────────────────────────────────────────────────
  const filteredRoles = useMemo(() => {
    return roles.filter((role) => {
      const matchesScope =
        scopeFilter === 'ALL' || role.scopeType === scopeFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        role.name.toLowerCase().includes(q) ||
        role.nameFa.toLowerCase().includes(q) ||
        (role.description && role.description.toLowerCase().includes(q));

      return matchesScope && matchesSearch;
    });
  }, [roles, scopeFilter, searchQuery]);

  // Filtered Available Users in Assign Modal
  const filteredAvailableUsers = useMemo(() => {
    const q = userSearchQuery.trim().toLowerCase();
    const assignedIds = new Set(assignedUsers.map((u) => u.id));

    return availableUsers.filter((u) => {
      const matchesSearch =
        !q ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.includes(q);
      const notAssigned = !assignedIds.has(u.id);
      return matchesSearch && notAssigned;
    });
  }, [availableUsers, userSearchQuery, assignedUsers]);

  return (
    <div
      dir="rtl"
      className="h-[calc(100vh-64px)] flex flex-col p-4 md:p-6 bg-slate-50/60 dark:bg-slate-950/60 font-[Vazirmatn] overflow-hidden"
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#0047E1] text-white shadow-md shadow-[#0047E1]/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              مدیریت نقش‌ها و سطوح دسترسی
              <Badge variant="outline" className="text-xs font-mono font-normal">
                {roles.length} نقش
              </Badge>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              پیکربندی نقش‌های سازمانی، تخصیص مجوزهای ماژولار و مدیریت انتساب کاربران
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadRoles(selectedRoleId || undefined)}
            className="h-9 gap-1.5 text-xs text-slate-600 dark:text-slate-300"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            تازه‌سازی
          </Button>

          <Button
            onClick={openCreateModal}
            className="h-9 gap-1.5 text-xs bg-[#0047E1] hover:bg-[#0038b5] text-white shadow-xs"
          >
            <Plus className="w-4 h-4" />
            افزودن نقش جدید
          </Button>
        </div>
      </div>

      {/* Main Two-Panel Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0 overflow-hidden">
        {/* ─── Right Panel: Roles List (4 cols) ──────────────────────────────── */}
        <div className="lg:col-span-4 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {/* Filter Bar & Search */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو بر اساس عنوان یا شناسه نقش..."
                className="pr-9 h-9 text-xs bg-white dark:bg-slate-800"
              />
            </div>

            {/* Scope Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
              {[
                { key: 'ALL', label: 'همه' },
                { key: 'GLOBAL', label: 'سراسری' },
                { key: 'ZONE', label: 'منطقه' },
                { key: 'COMPANY', label: 'شرکتی' },
              ].map((scope) => (
                <button
                  key={scope.key}
                  type="button"
                  onClick={() => setScopeFilter(scope.key)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                    scopeFilter === scope.key
                      ? 'bg-[#0047E1] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {scope.label}
                </button>
              ))}
            </div>
          </div>

          {/* Roles Scrollable List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {isLoadingRoles ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Shield className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs">هیچ نقشی با معیارهای انتخاب شده یافت نشد.</p>
              </div>
            ) : (
              filteredRoles.map((role) => {
                const isSelected = role.id === selectedRoleId;
                const scopeConf = SCOPE_CONFIG[role.scopeType];
                const ScopeIcon = scopeConf.icon;

                return (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'bg-[#0047E1]/5 border-[#0047E1] dark:bg-[#0047E1]/15 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                            {role.nameFa}
                          </span>
                          {role.isSystem && (
                            <span title="نقش سیستمی غیرقابل حذف">
                              <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 truncate mt-0.5">
                          {role.name}
                        </p>
                      </div>

                      {/* Scope Badge */}
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border ${scopeConf.bg} ${scopeConf.color} ${scopeConf.border}`}
                      >
                        <ScopeIcon className="w-3 h-3" />
                        {scopeConf.labelFa}
                      </span>
                    </div>

                    {role.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-1.5">
                        {role.description}
                      </p>
                    )}

                    {/* Stats & Actions */}
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3 text-[#0047E1]" />
                          {role._count?.permissions ?? 0} دسترسی
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-[#00B8F0]" />
                          {role._count?.assignments ?? 0} کاربر
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(role);
                          }}
                          className="p-1 hover:text-[#0047E1] rounded"
                          title="ویرایش نقش"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {!role.isSystem && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRoleToDelete(role);
                            }}
                            className="p-1 hover:text-rose-600 rounded"
                            title="حذف نقش"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ─── Left Panel: Active Role Details, Matrix & Users (8 cols) ───────── */}
        <div className="lg:col-span-8 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden min-h-0">
          {!selectedRole ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <ShieldCheck className="w-16 h-16 text-slate-200 dark:text-slate-800 mb-3" />
              <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                هیچ نقشی انتخاب نشده است
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                برای مشاهده و ویرایش دسترسی‌ها یا انتساب کاربران، یک نقش را از لیست سمت راست انتخاب نمایید یا نقش جدیدی تعریف کنید.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Active Role Bar */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0047E1] to-[#00B8F0] flex items-center justify-center text-white shadow-xs">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-base text-slate-900 dark:text-slate-100">
                        {selectedRole.nameFa}
                      </h2>
                      <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                        ({selectedRole.name})
                      </span>
                    </div>
                    {selectedRole.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{selectedRole.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md border ${
                      SCOPE_CONFIG[selectedRole.scopeType].bg
                    } ${SCOPE_CONFIG[selectedRole.scopeType].color} ${
                      SCOPE_CONFIG[selectedRole.scopeType].border
                    }`}
                  >
                    {SCOPE_CONFIG[selectedRole.scopeType].labelFa}
                  </span>

                  {selectedRole.isSystem && (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-xs gap-1">
                      <Lock className="w-3 h-3" />
                      سیستمی
                    </Badge>
                  )}
                </div>
              </div>

              {/* Tabs Navigation */}
              <Tabs
                value={activeTab}
                onValueChange={(val) => setActiveTab(val as 'permissions' | 'users')}
                className="flex-1 flex flex-col min-h-0 overflow-hidden"
              >
                <div className="px-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                  <TabsList className="bg-transparent h-11 p-0 gap-6">
                    <TabsTrigger
                      value="permissions"
                      className="data-[state=active]:border-b-2 data-[state=active]:border-[#0047E1] data-[state=active]:text-[#0047E1] rounded-none px-2 text-xs font-semibold h-11 bg-transparent shadow-none"
                    >
                      <Layers className="w-4 h-4 ml-1.5" />
                      ماتریس دسترسی‌ها
                      <span className="mr-1.5 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">
                        {currentPermissions.length}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="users"
                      className="data-[state=active]:border-b-2 data-[state=active]:border-[#0047E1] data-[state=active]:text-[#0047E1] rounded-none px-2 text-xs font-semibold h-11 bg-transparent shadow-none"
                    >
                      <Users className="w-4 h-4 ml-1.5" />
                      کاربران منتسب
                      <span className="mr-1.5 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">
                        {assignedUsers.length}
                      </span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Tab 1: Permissions Matrix Tree */}
                <TabsContent value="permissions" className="flex-1 min-h-0 m-0 p-3 overflow-hidden">
                  {isLoadingCatalog || isLoadingRoleDetails ? (
                    <div className="space-y-3 p-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-28 w-full" />
                      <Skeleton className="h-28 w-full" />
                    </div>
                  ) : (
                    <PermissionTree
                      catalog={catalog}
                      selectedPermissions={currentPermissions}
                      onChange={setCurrentPermissions}
                      readOnly={selectedRole.isSystem}
                      isSaving={isSavingPermissions}
                      isDirty={isDirty}
                      onSave={handleSavePermissions}
                      onReset={handleResetPermissions}
                      roleName={selectedRole.nameFa}
                      isSystem={selectedRole.isSystem}
                    />
                  )}
                </TabsContent>

                {/* Tab 2: Assigned Users */}
                <TabsContent value="users" className="flex-1 min-h-0 m-0 p-4 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        کاربران دارای این نقش
                      </h4>
                      <p className="text-xs text-slate-500">
                        کاربران حاضر از تمام دسترسی‌های فعال این نقش بهره‌مند خواهند شد.
                      </p>
                    </div>

                    <Button
                      onClick={openAssignModal}
                      size="sm"
                      className="gap-1.5 text-xs bg-[#0047E1] hover:bg-[#0038b5] text-white"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      انتساب کاربر جدید
                    </Button>
                  </div>

                  {/* Users Table / List */}
                  <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                    {isLoadingUsers ? (
                      <div className="space-y-2 p-4">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-14 w-full" />
                        ))}
                      </div>
                    ) : assignedUsers.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">
                        <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                        <p className="text-xs">هیچ کاربری در حال حاضر به این نقش منتسب نشده است.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={openAssignModal}
                          className="mt-3 text-xs gap-1.5"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          اولین کاربر را منتسب کنید
                        </Button>
                      </div>
                    ) : (
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800 sticky top-0">
                          <tr>
                            <th className="py-2.5 px-4 font-semibold">نام و نام خانوادگی</th>
                            <th className="py-2.5 px-4 font-semibold">تماس / ایمیل</th>
                            <th className="py-2.5 px-4 font-semibold">نقش کاربری</th>
                            <th className="py-2.5 px-4 font-semibold">وضعیت</th>
                            <th className="py-2.5 px-4 font-semibold text-center">عملیات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {assignedUsers.map((item) => (
                            <tr
                              key={item.id}
                              className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                                    {item.firstName[0]}
                                  </div>
                                  <span>{item.firstName} {item.lastName}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                                <div>{item.email}</div>
                                <div className="text-slate-400">{item.phone}</div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-mono text-[11px] text-[#0047E1] dark:text-[#00B8F0] bg-[#0047E1]/5 px-2 py-0.5 rounded">
                                  {item.role}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${
                                    item.status === 'ACTIVE'
                                      ? 'text-emerald-600 border-emerald-200 bg-emerald-50'
                                      : 'text-amber-600 border-amber-200 bg-amber-50'
                                  }`}
                                >
                                  {item.status === 'ACTIVE' ? 'فعال' : item.status}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setUserToUnassign(item)}
                                  className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1 px-2"
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                  سلب نقش
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* ─── Modal: Create / Edit Role ────────────────────────────────────────── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md font-[Vazirmatn]" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#0047E1]" />
              {editingRole ? `ویرایش نقش «${editingRole.nameFa}»` : 'ایجاد نقش جدید'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              مشخصات و دامنه شمول نقش سازمانی را تعیین فرمایید.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 py-2 text-right">
            {/* Persian Name */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                عنوان فارسی نقش <span className="text-rose-500">*</span>
              </label>
              <Input
                {...register('nameFa')}
                placeholder="مثال: سرپرست انبار مرکزی"
                className="text-xs h-9"
              />
              {errors.nameFa && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.nameFa.message}</p>
              )}
            </div>

            {/* English Identifier */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                شناسه یکتا به انگلیسی <span className="text-rose-500">*</span>
              </label>
              <Input
                {...register('name')}
                placeholder="مثال: WAREHOUSE_SUPERVISOR"
                disabled={editingRole?.isSystem}
                className="text-xs h-9 font-mono"
                dir="ltr"
              />
              {editingRole?.isSystem && (
                <p className="text-[11px] text-amber-600 mt-1">شناسه نقش‌های سیستمی قابل تغییر نیست.</p>
              )}
              {errors.name && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Scope Selection */}
            {!editingRole && (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  دامنه شمول نقش (Scope) <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {allowedScopesForActor.map((sc) => {
                    const conf = SCOPE_CONFIG[sc];
                    const ScopeIcon = conf.icon;
                    return (
                      <label
                        key={sc}
                        className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-[#0047E1] cursor-pointer text-center text-xs transition-colors has-[:checked]:border-[#0047E1] has-[:checked]:bg-[#0047E1]/5"
                      >
                        <input
                          type="radio"
                          value={sc}
                          {...register('scopeType')}
                          className="sr-only"
                        />
                        <ScopeIcon className="w-4 h-4 mb-1 text-[#0047E1]" />
                        <span className="font-medium">{conf.labelFa}</span>
                      </label>
                    );
                  })}
                </div>
                {errors.scopeType && (
                  <p className="text-[11px] text-rose-500 mt-1">{errors.scopeType.message}</p>
                )}
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                توضیحات (اختیاری)
              </label>
              <textarea
                {...register('description')}
                rows={3}
                placeholder="شرح وظایف و مسئولیت‌های این نقش..."
                className="w-full text-xs p-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0047E1]"
              />
              {errors.description && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.description.message}</p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:justify-start">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#0047E1] hover:bg-[#0038b5] text-white text-xs h-9 px-4"
              >
                {isSubmitting ? 'در حال ثبت...' : editingRole ? 'به‌روزرسانی نقش' : 'ایجاد نقش'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="text-xs h-9"
              >
                انصراف
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Modal: Delete Role Confirmation ──────────────────────────────────── */}
      <AlertDialog open={!!roleToDelete} onOpenChange={(open) => !open && setRoleToDelete(null)}>
        <AlertDialogContent className="max-w-md font-[Vazirmatn]" dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              حذف نقش سازمانی
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              آیا از حذف دائم نقش «{roleToDelete?.nameFa}» اطمینان دارید؟ با حذف این نقش، تمام مجوزهای انتساب داده شده به کاربران مربوطه فوراً سلب خواهند شد.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogAction
              onClick={handleDeleteRole}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-9 px-4"
            >
              بله، حذف نقش
            </AlertDialogAction>
            <AlertDialogCancel className="text-xs h-9">
              انصراف
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Modal: Assign User to Role ───────────────────────────────────────── */}
      <Dialog open={isAssignUserOpen} onOpenChange={setIsAssignUserOpen}>
        <DialogContent className="max-w-lg font-[Vazirmatn]" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#0047E1]" />
              انتساب کاربر به نقش «{selectedRole?.nameFa}»
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              کاربر مورد نظر را انتخاب نمایید تا نقش بلافاصله به او اختصاص یابد.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
              <Input
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="جستجو بر اساس نام، شماره تلفن یا ایمیل کاربر..."
                className="pr-9 h-9 text-xs"
              />
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
              {isLoadingAvailableUsers ? (
                <div className="space-y-2 p-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : filteredAvailableUsers.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  کاربر قابل انتسابی یافت نشد.
                </div>
              ) : (
                filteredAvailableUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {u.firstName} {u.lastName}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {u.email} · {u.phone}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleAssignUser(u.id)}
                      className="h-7 text-xs bg-[#0047E1] hover:bg-[#0038b5] text-white px-3"
                    >
                      انتساب
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAssignUserOpen(false)}
              className="text-xs h-9"
            >
              بستن
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal: Unassign User Confirmation ────────────────────────────────── */}
      <AlertDialog open={!!userToUnassign} onOpenChange={(open) => !open && setUserToUnassign(null)}>
        <AlertDialogContent className="max-w-md font-[Vazirmatn]" dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <UserMinus className="w-5 h-5" />
              سلب نقش از کاربر
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              آیا از سلب نقش «{selectedRole?.nameFa}» از کاربر «{userToUnassign?.firstName} {userToUnassign?.lastName}» اطمینان دارید؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogAction
              onClick={handleUnassignUser}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-9 px-4"
            >
              بله، سلب نقش
            </AlertDialogAction>
            <AlertDialogCancel className="text-xs h-9">
              انصراف
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default RolesPage;
