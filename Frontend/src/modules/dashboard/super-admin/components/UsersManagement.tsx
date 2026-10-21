import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search, Plus, Lock, Eye, Edit2, Trash2, CheckCircle2,
  ChevronLeft, ChevronRight, User as UserIcon, MapPin,
  Building2, Mail, Phone
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle
} from "@/components/ui/sheet";
import { useNationalStore } from "../store/useNationalStore";
import { useActionAudit } from "../hooks/useActionAudit";
import { createDiff } from "@/entities/audit";
import type { UserEntity, UserRole, UserScopeType, UserStatus } from "@/entities/user";
import { validateIranianNationalId, validateMobile } from "@/entities/user";
import { toast } from "sonner";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "SUPER_ADMIN", label: "سوپر ادمین" },
  { value: "NATIONAL_AUDITOR", label: "حسابرس ملی" },
  { value: "ZONE_MANAGER", label: "مدیر شهرک" },
  { value: "COMPANY_ADMIN", label: "مدیر شرکت" },
  { value: "OPERATOR", label: "اپراتور" },
];

const SCOPES: { value: UserScopeType; label: string }[] = [
  { value: "national", label: "ملی (بدون محدودیت)" },
  { value: "zone", label: "شهرک صنعتی" },
  { value: "company", label: "شرکت" },
];

const genId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

/* ==================== COMPONENT ==================== */
export function UsersManagement() {
  /* ---- Store ---- */
  const store = useNationalStore();
  const { log } = useActionAudit();

  // alias parks -> zones برای سازگاری با نام‌گذاری UI
  const zones = store.parks;
  const companies = store.companies;
  const users = store.users;

  /* ---- Filters ---- */
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [scopeFilter, setScopeFilter] = useState<UserScopeType | "all">("all");

  /* ---- Selection ---- */
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  /* ---- Wizard ---- */
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState<Partial<UserEntity>>({
    scopeType: "national",
    role: "OPERATOR",
    status: "active",
    failedLoginAttempts: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ---- Detail ---- */
  const [detailUser, setDetailUser] = useState<UserEntity | null>(null);

  /* ---- Draft auto-save / restore ---- */
  useEffect(() => {
    if (!wizardOpen) return;
    const t = setTimeout(() => {
      localStorage.setItem("userWizardDraft", JSON.stringify(wizardData));
    }, 800);
    return () => clearTimeout(t);
  }, [wizardData, wizardOpen]);

  useEffect(() => {
    const raw = localStorage.getItem("userWizardDraft");
    if (raw && wizardOpen && !wizardData.id) {
      try {
        setWizardData((prev) => ({ ...prev, ...JSON.parse(raw) }));
      } catch { /* ignore */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wizardOpen]);

  /* ---- Derived data ---- */
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const txt = `${u.firstName} ${u.lastName} ${u.email} ${u.mobile} ${u.nationalId}`;
      const okSearch =
        search.trim() === "" ||
        txt.includes(search) ||
        u.nationalId.includes(search);
      const okRole = roleFilter === "all" || u.role === roleFilter;
      const okStatus = statusFilter === "all" || u.status === statusFilter;
      const okScope = scopeFilter === "all" || u.scopeType === scopeFilter;
      return okSearch && okRole && okStatus && okScope;
    });
  }, [users, search, roleFilter, statusFilter, scopeFilter]);

  const toggleSelectAll = useCallback(() => {
    if (
      filteredUsers.length > 0 &&
      selectedRows.size === filteredUsers.length
    ) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredUsers.map((u) => u.id)));
    }
  }, [filteredUsers, selectedRows.size]);

  const toggleRow = (id: string) => {
    const n = new Set(selectedRows);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelectedRows(n);
  };

  /* ---- Wizard validation ---- */
  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!wizardData.nationalId || !validateIranianNationalId(wizardData.nationalId))
      e.nationalId = "کدملی نامعتبر است";
    if (!wizardData.firstName || wizardData.firstName.length < 2)
      e.firstName = "نام الزامی است";
    if (!wizardData.lastName || wizardData.lastName.length < 2)
      e.lastName = "نام خانوادگی الزامی است";
    if (!wizardData.mobile || !validateMobile(wizardData.mobile))
      e.mobile = "موبایل نامعتبر (مثلاً ۰۹۱۲۳۴۵۶۷۸۹)";
    if (
      !wizardData.email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(wizardData.email)
    )
      e.email = "ایمیل نامعتبر است";

    const dup = (key: keyof UserEntity, val?: string) =>
      users.some((u) => u[key] === val && u.id !== wizardData.id);
    if (dup("email", wizardData.email)) e.email = "ایمیل قبلاً ثبت شده";
    if (dup("mobile", wizardData.mobile)) e.mobile = "موبایل قبلاً ثبت شده";
    if (dup("nationalId", wizardData.nationalId))
      e.nationalId = "کدملی قبلاً ثبت شده";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!wizardData.role) e.role = "نقش الزامی است";
    if (wizardData.scopeType === "zone" && !wizardData.zoneId)
      e.zoneId = "انتخاب شهرک الزامی است";
    if (wizardData.scopeType === "company" && !wizardData.companyId)
      e.companyId = "انتخاب شرکت الزامی است";
    if (wizardData.scopeType !== "national" && wizardData.role === "SUPER_ADMIN")
      e.role = "SUPER_ADMIN فقط در سطح ملی مجاز است";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (wizardStep === 1 && validateStep1()) setWizardStep(2);
    else if (wizardStep === 2 && validateStep2()) setWizardStep(3);
  };
  const handleBack = () => setWizardStep((s) => Math.max(1, s - 1));

  const resetWizard = () => {
    setWizardOpen(false);
    setWizardStep(1);
    setWizardData({
      scopeType: "national",
      role: "OPERATOR",
      status: "active",
      failedLoginAttempts: 0,
    });
    setErrors({});
    localStorage.removeItem("userWizardDraft");
  };

  const handleSubmit = () => {
    const now = new Date().toISOString();
    const payload: UserEntity = {
      id: wizardData.id || genId(),
      nationalId: wizardData.nationalId!,
      firstName: wizardData.firstName!,
      lastName: wizardData.lastName!,
      displayName: `${wizardData.firstName} ${wizardData.lastName}`,
      mobile: wizardData.mobile!,
      email: wizardData.email!,
      scopeType: wizardData.scopeType!,
      zoneId: wizardData.zoneId,
      companyId: wizardData.companyId,
      role: wizardData.role!,
      status: (wizardData.status as UserStatus) || "active",
      createdAt:
        wizardData.id
          ? users.find((u) => u.id === wizardData.id)?.createdAt || now
          : now,
      updatedAt: now,
      failedLoginAttempts: wizardData.failedLoginAttempts || 0,
    };

    if (wizardData.id) {
      store.updateUser(wizardData.id, payload, "current-user", "مدیر سیستم ملی");
      // AuditLogEntry.diff is a before/after ARRAY (the store records the real
      // before/after itself); handing it the raw UserEntity made `diff` an
      // object. Build the array the field actually declares.
      log("UPDATE", "user", payload.id, { diff: createDiff({}, payload as unknown as Record<string, unknown>) });
      toast.success("کاربر بروزرسانی شد");
    } else {
      store.addUser(payload, "current-user", "مدیر سیستم ملی");
      log("CREATE", "user", payload.id, payload);
      toast.success("کاربر جدید ثبت شد");
    }
    resetWizard();
  };

  const handleBulkDeactivate = () => {
    selectedRows.forEach((id) => {
      store.updateUser(
        id,
        { status: "inactive", updatedAt: new Date().toISOString() } as Partial<UserEntity>,
        "current-user",
        "مدیر سیستم ملی"
      );
      // `status` is not an AuditLogEntry field; record it as the field-level
      // change it is. Prior status is unknown here (bulk action), hence undefined.
      log("UPDATE", "user", id, { diff: [{ field: "status", oldValue: undefined, newValue: "inactive" }] });
    });
    toast.success(`${selectedRows.size} کاربر غیرفعال شد`);
    setSelectedRows(new Set());
  };

  const handleResetPassword = (user: UserEntity) => {
    toast.success(`رمز عبور کاربر ${user.firstName} ${user.lastName} ریست شد (شبیه‌سازی)`);
    // `actionDetail` is not an AuditLogEntry field; `snapshot` is the typed
    // free-form slot for this context, and nothing reads a top-level
    // `actionDetail` anywhere in the app.
    log("UPDATE", "user", user.id, { snapshot: { actionDetail: "password_reset" } });
  };

  const statusBadge = (status: UserStatus) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">فعال</Badge>;
      case "inactive":
        return <Badge variant="secondary">غیرفعال</Badge>;
      case "locked":
        return <Badge variant="destructive">قفل شده</Badge>;
      default:
        return <Badge variant="outline">نامشخص</Badge>;
    }
  };

  /* ==================== RENDER ==================== */
  return (
    <div className="h-full flex flex-col overflow-hidden" dir="rtl">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => {
              setWizardData({
                scopeType: "national",
                role: "OPERATOR",
                status: "active",
                failedLoginAttempts: 0,
              });
              setWizardOpen(true);
            }}
          >
            <Plus className="w-4 h-4 ml-1" />
            کاربر جدید
          </Button>
          {selectedRows.size > 0 && (
            <Button size="sm" variant="outline" onClick={handleBulkDeactivate}>
              <Lock className="w-4 h-4 ml-1" />
              غیرفعال‌سازی گروهی ({selectedRows.size})
            </Button>
          )}
        </div>
        <h2 className="text-base font-bold text-primary">مدیریت کاربران ملی</h2>
      </div>

      {/* Filters */}
      <div className="px-5 py-3 border-b border-border bg-secondary/20 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="جستجو: نام، کدملی، موبایل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
          <SelectTrigger>
            <SelectValue placeholder="نقش" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه نقش‌ها</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={scopeFilter} onValueChange={(v) => setScopeFilter(v as any)}>
          <SelectTrigger>
            <SelectValue placeholder="حوزه" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه حوزه‌ها</SelectItem>
            {SCOPES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger>
            <SelectValue placeholder="وضعیت" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه وضعیت‌ها</SelectItem>
            <SelectItem value="active">فعال</SelectItem>
            <SelectItem value="inactive">غیرفعال</SelectItem>
            <SelectItem value="locked">قفل‌شده</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-5">
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40">
                <TableHead className="w-10 text-center">
                  <Checkbox
                    checked={
                      filteredUsers.length > 0 &&
                      selectedRows.size === filteredUsers.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>نام و نام خانوادگی</TableHead>
                <TableHead>کدملی</TableHead>
                <TableHead>موبایل</TableHead>
                <TableHead>نقش</TableHead>
                <TableHead>حوزه</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => (
                <TableRow key={u.id} className="hover:bg-secondary/20 transition-colors">
                  <TableCell className="text-center">
                    <Checkbox
                      checked={selectedRows.has(u.id)}
                      onCheckedChange={() => toggleRow(u.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {u.firstName[0]}
                        {u.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs" dir="ltr">
                    {u.nationalId}
                  </TableCell>
                  <TableCell className="font-mono text-xs" dir="ltr">
                    {u.mobile}
                  </TableCell>
                  <TableCell>
                    {ROLES.find((r) => r.value === u.role)?.label || u.role}
                  </TableCell>
                  <TableCell>
                    {u.scopeType === "zone" && (
                      <div className="flex items-center gap-1 text-xs text-foreground">
                        <MapPin className="w-3 h-3" />
                        {zones.find((z) => z.id === u.zoneId)?.name || u.zoneId}
                      </div>
                    )}
                    {u.scopeType === "company" && (
                      <div className="flex items-center gap-1 text-xs text-foreground">
                        <Building2 className="w-3 h-3" />
                        {companies.find((c) => c.id === u.companyId)?.nameFa ||
                          u.companyId}
                      </div>
                    )}
                    {u.scopeType === "national" && (
                      <span className="text-xs text-muted-foreground">ملی</span>
                    )}
                  </TableCell>
                  <TableCell>{statusBadge(u.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-8 h-8"
                        onClick={() => setDetailUser(u)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-8 h-8"
                        onClick={() => {
                          setWizardData(u);
                          setWizardOpen(true);
                          setWizardStep(1);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-8 h-8"
                        onClick={() => handleResetPassword(u)}
                      >
                        <Lock className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-8 h-8 text-destructive"
                        onClick={() => {
                          if (confirm("آیا از حذف کاربر اطمینان دارید؟")) {
                            store.removeUser(u.id, "current-user", "مدیر سیستم ملی");
                            log("DELETE", "user", u.id, u);
                            toast.success("کاربر حذف شد");
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-10 text-muted-foreground text-sm"
                  >
                    کاربری یافت نشد
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ====== Wizard Dialog ====== */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle>
              {wizardData.id ? "ویرایش کاربر" : "ایجاد کاربر جدید"}
            </DialogTitle>
          </DialogHeader>

          {/* Stepper */}
          <div className="flex items-center justify-center gap-2 py-4">
            {[
              { n: 1, l: "هویت" },
              { n: 2, l: "انتساب" },
              { n: 3, l: "بازبینی" },
            ].map((s, i, arr) => (
              <div key={s.n} className="flex items-center gap-2">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs font-bold transition-all ${
                    wizardStep >= s.n
                      ? "border-accent text-accent"
                      : "border-muted text-muted-foreground"
                  }`}
                >
                  {s.n}
                </div>
                <span
                  className={`text-xs ${
                    wizardStep >= s.n
                      ? "text-accent font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {s.l}
                </span>
                {i < arr.length - 1 && (
                  <div
                    className={`w-8 h-0.5 ${
                      wizardStep > s.n ? "bg-accent" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1 */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>
                    کدملی <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    dir="ltr"
                    maxLength={10}
                    value={wizardData.nationalId || ""}
                    onChange={(e) =>
                      setWizardData({ ...wizardData, nationalId: e.target.value })
                    }
                  />
                  {errors.nationalId && (
                    <p className="text-xs text-red-500 mt-1">{errors.nationalId}</p>
                  )}
                </div>
                <div>
                  <Label>
                    ایمیل <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    dir="ltr"
                    value={wizardData.email || ""}
                    onChange={(e) =>
                      setWizardData({ ...wizardData, email: e.target.value })
                    }
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500 mt-1">{errors.email}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>
                    نام <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={wizardData.firstName || ""}
                    onChange={(e) =>
                      setWizardData({ ...wizardData, firstName: e.target.value })
                    }
                  />
                  {errors.firstName && (
                    <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>
                  )}
                </div>
                <div>
                  <Label>
                    نام خانوادگی <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={wizardData.lastName || ""}
                    onChange={(e) =>
                      setWizardData({ ...wizardData, lastName: e.target.value })
                    }
                  />
                  {errors.lastName && (
                    <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>
                  )}
                </div>
              </div>
              <div>
                <Label>
                  موبایل <span className="text-red-500">*</span>
                </Label>
                <Input
                  dir="ltr"
                  placeholder="09123456789"
                  value={wizardData.mobile || ""}
                  onChange={(e) =>
                    setWizardData({ ...wizardData, mobile: e.target.value })
                  }
                />
                {errors.mobile && (
                  <p className="text-xs text-red-500 mt-1">{errors.mobile}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2 */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label>
                  نقش <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={wizardData.role}
                  onValueChange={(v) =>
                    setWizardData({ ...wizardData, role: v as UserRole })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-xs text-red-500 mt-1">{errors.role}</p>
                )}
              </div>

              <div>
                <Label>
                  حوزه دسترسی <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={wizardData.scopeType}
                  onValueChange={(v) =>
                    setWizardData({
                      ...wizardData,
                      scopeType: v as UserScopeType,
                      zoneId: undefined,
                      companyId: undefined,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCOPES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {wizardData.scopeType === "zone" && (
                <div>
                  <Label>
                    شهرک صنعتی <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={wizardData.zoneId}
                    onValueChange={(v) =>
                      setWizardData({ ...wizardData, zoneId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="انتخاب شهرک" />
                    </SelectTrigger>
                    <SelectContent>
                      {zones
                        .filter(
                          (z) =>
                            z.status === "active" || z.status === "operational"
                        )
                        .map((z) => (
                          <SelectItem key={z.id} value={z.id}>
                            {z.name} ({z.province})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {errors.zoneId && (
                    <p className="text-xs text-red-500 mt-1">{errors.zoneId}</p>
                  )}
                </div>
              )}

              {wizardData.scopeType === "company" && (
                <div>
                  <Label>
                    شرکت <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={wizardData.companyId}
                    onValueChange={(v) =>
                      setWizardData({ ...wizardData, companyId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="انتخاب شرکت" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies
                        .filter((c) => c.status === "active")
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nameFa}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {errors.companyId && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.companyId}
                    </p>
                  )}
                </div>
              )}

              {wizardData.scopeType === "national" &&
                wizardData.role === "SUPER_ADMIN" && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                    در حال ایجاد کاربر با دسترسی کامل ملی هستید.
                  </p>
                )}
            </div>
          )}

          {/* Step 3 – Review */}
          {wizardStep === 3 && (
            <div className="space-y-3 bg-secondary/30 p-4 rounded-lg border border-border">
              <p className="text-sm font-bold text-foreground mb-2">
                خلاصه اطلاعات
              </p>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">نام:</span>{" "}
                  {wizardData.firstName} {wizardData.lastName}
                </div>
                <div>
                  <span className="text-muted-foreground">کدملی:</span>{" "}
                  {wizardData.nationalId}
                </div>
                <div>
                  <span className="text-muted-foreground">موبایل:</span>{" "}
                  {wizardData.mobile}
                </div>
                <div>
                  <span className="text-muted-foreground">ایمیل:</span>{" "}
                  {wizardData.email}
                </div>
                <div>
                  <span className="text-muted-foreground">نقش:</span>{" "}
                  {ROLES.find((r) => r.value === wizardData.role)?.label}
                </div>
                <div>
                  <span className="text-muted-foreground">حوزه:</span>{" "}
                  {SCOPES.find((s) => s.value === wizardData.scopeType)?.label}
                </div>
                {wizardData.zoneId && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">شهرک:</span>{" "}
                    {zones.find((z) => z.id === wizardData.zoneId)?.name ||
                      wizardData.zoneId}
                  </div>
                )}
                {wizardData.companyId && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">شرکت:</span>{" "}
                    {companies.find((c) => c.id === wizardData.companyId)
                      ?.nameFa || wizardData.companyId}
                  </div>
                )}
              </div>
              <div className="pt-2 flex items-center gap-2">
                <Checkbox
                  checked={(wizardData.status as string) === "active"}
                  onCheckedChange={(v) =>
                    setWizardData({
                      ...wizardData,
                      status: v ? "active" : "inactive",
                    })
                  }
                />
                <span className="text-xs">کاربر بلافاصله فعال شود</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {wizardStep > 1 && (
              <Button variant="outline" onClick={handleBack}>
                <ChevronRight className="w-4 h-4 mr-1" /> قبلی
              </Button>
            )}
            {wizardStep < 3 ? (
              <Button onClick={handleNext}>
                بعدی <ChevronLeft className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit}>
                <CheckCircle2 className="w-4 h-4 ml-1" />
                {wizardData.id ? "ذخیره تغییرات" : "ثبت کاربر"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== Detail Drawer ====== */}
      <Sheet open={!!detailUser} onOpenChange={() => setDetailUser(null)}>
        <SheetContent className="w-[400px]" dir="rtl">
          <SheetHeader>
            <SheetTitle>پروفایل کاربر</SheetTitle>
          </SheetHeader>
          {detailUser && (
            <div className="space-y-5 py-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {detailUser.firstName[0]}
                  {detailUser.lastName[0]}
                </div>
                <div>
                  <p className="font-bold text-foreground">
                    {detailUser.firstName} {detailUser.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ROLES.find((r) => r.value === detailUser.role)?.label}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <UserIcon className="w-4 h-4" /> کدملی
                  </span>
                  <span className="font-mono" dir="ltr">
                    {detailUser.nationalId}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4" /> موبایل
                  </span>
                  <span className="font-mono" dir="ltr">
                    {detailUser.mobile}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Mail className="w-4 h-4" /> ایمیل
                  </span>
                  <span dir="ltr">{detailUser.email}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">وضعیت</span>
                  {statusBadge(detailUser.status)}
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">حوزه دسترسی</span>
                  <span>
                    {SCOPES.find((s) => s.value === detailUser.scopeType)?.label}
                  </span>
                </div>
                {detailUser.zoneId && (
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> شهرک
                    </span>
                    <span>
                      {zones.find((z) => z.id === detailUser.zoneId)?.name ||
                        detailUser.zoneId}
                    </span>
                  </div>
                )}
                {detailUser.companyId && (
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> شرکت
                    </span>
                    <span>
                      {companies.find((c) => c.id === detailUser.companyId)
                        ?.nameFa || detailUser.companyId}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">تاریخ ثبت</span>
                  <span>
                    {new Date(detailUser.createdAt).toLocaleDateString("fa-IR")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">آخرین بروزرسانی</span>
                  <span>
                    {new Date(detailUser.updatedAt).toLocaleDateString("fa-IR")}
                  </span>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default UsersManagement;
