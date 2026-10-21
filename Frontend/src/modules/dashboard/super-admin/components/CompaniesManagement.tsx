// ============================================================================
// src/modules/dashboard/super-admin/components/CompaniesManagement.tsx
// Task 4 — Companies Management: Master-Detail, filters, inline edit,
// status lifecycle, zone transfer with history, expired-documents alerts
// ============================================================================

import { useMemo, useState } from "react";
import {
  Building2,
  Search,
  Filter,
  Plus,
  Pencil,
  Check,
  X,
  Ban,
  PlayCircle,
  FileWarning,
  ArrowLeftRight,
  MapPin,
  Phone,
  Mail,
  Users,
  Calendar,
  Download,
  Eye,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  History,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useNationalStore } from "../store/useNationalStore";
import { useActionAudit } from "../hooks/useActionAudit";
import { CompanyOnboardingWizard } from "./companies/CompanyOnboardingWizard";
import { ZoneSelector } from "./shared/company/ZoneSelector";

import type { CompanyEntity } from "@/entities/company";

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const faNumber = (n: number | string | undefined | null): string => {
  if (n === undefined || n === null || n === "") return "—";
  const num = typeof n === "string" ? Number(n) : n;
  if (Number.isNaN(num)) return String(n);
  return num.toLocaleString("fa-IR");
};

const faDate = (iso?: string | null): string => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fa-IR");
  } catch {
    return "—";
  }
};

const COMPANY_STATUS_META: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }
> = {
  active: {
    label: "فعال",
    variant: "default",
    className: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  suspended: {
    label: "تعلیق‌شده",
    variant: "secondary",
    className: "bg-amber-100 text-amber-800 border-amber-300",
  },
  terminated: {
    label: "فسخ‌شده",
    variant: "destructive",
    className: "bg-red-100 text-red-800 border-red-300",
  },
  pending: {
    label: "در انتظار تأیید",
    variant: "outline",
    className: "bg-sky-100 text-sky-800 border-sky-300",
  },
};

const LEGAL_TYPE_LABELS: Record<string, string> = {
  private_joint_stock: "سهامی خاص",
  public_joint_stock: "سهامی عام",
  limited_liability: "با مسئولیت محدود",
  cooperative: "تعاونی",
  partnership: "تضامنی",
  other: "سایر",
};

const COMPANY_TYPE_LABELS: Record<string, string> = {
  industrial: "صنعتی",
  service: "خدماتی",
  commercial: "بازرگانی",
  knowledge_based: "دانش‌بنیان",
  other: "سایر",
};

/** اسناد هر شرکت — اگر expiryDate داشت و گذشته باشد منقضی محسوب می‌شود */
interface CompanyDoc {
  id: string;
  title: string;
  expiryDate?: string;
}

function getCompanyDocuments(company: any): CompanyDoc[] {
  const docs: CompanyDoc[] = [];
  if (Array.isArray(company?.documents)) {
    for (const d of company.documents) {
      docs.push({
        id: d.id ?? String(docs.length),
        title: d.title ?? d.name ?? "سند",
        expiryDate: d.expiryDate ?? d.expiresAt ?? undefined,
      });
    }
  }
  // اسناد استاندارد پرتال — اگر تاریخ انقضا در داده وجود نداشت، از فیلدهای رایج استفاده کن
  if (company?.licenseExpiry) {
    docs.push({ id: "license", title: "پروانه بهره‌برداری", expiryDate: company.licenseExpiry });
  }
  if (company?.environmentalPermitExpiry) {
    docs.push({ id: "env", title: "مجوز محیط‌زیست", expiryDate: company.environmentalPermitExpiry });
  }
  return docs;
}

function isExpired(iso?: string): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

function isExpiringSoon(iso?: string, days = 30): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  const now = Date.now();
  return t >= now && t - now < days * 24 * 60 * 60 * 1000;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CompaniesManagement() {
  // --- Store ---------------------------------------------------------------
  const companies = useNationalStore((s: any) => s.companies) as CompanyEntity[];
  const parks = useNationalStore((s: any) => s.parks) as any[];
  const updateCompany = useNationalStore((s: any) => s.updateCompany);
  const deleteCompany = useNationalStore((s: any) => s.deleteCompany);
  const auditLogs = useNationalStore((s: any) => s.auditLogs) as any[];

  const audit = useActionAudit();

  // --- Local UI state --------------------------------------------------------
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [docAlertOnly, setDocAlertOnly] = useState(false);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [detailCompanyId, setDetailCompanyId] = useState<string | null>(null);

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    company: CompanyEntity | null;
    targetStatus: "active" | "suspended" | "terminated" | null;
  }>({ open: false, company: null, targetStatus: null });
  const [statusReason, setStatusReason] = useState("");

  const [transferDialog, setTransferDialog] = useState<{
    open: boolean;
    company: CompanyEntity | null;
  }>({ open: false, company: null });
  const [transferZoneId, setTransferZoneId] = useState<string>("");
  const [transferReason, setTransferReason] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<CompanyEntity | null>(null);

  // --- Derived data ----------------------------------------------------------
  const zoneName = (zoneId?: string) =>
    parks.find((p) => p.id === zoneId)?.name ?? "—";

  const companiesWithDocs = useMemo(
    () =>
      (companies ?? []).map((c) => {
        const docs = getCompanyDocuments(c);
        return {
          company: c,
          expiredDocs: docs.filter((d) => isExpired(d.expiryDate)),
          expiringDocs: docs.filter(
            (d) => !isExpired(d.expiryDate) && isExpiringSoon(d.expiryDate)
          ),
        };
      }),
    [companies]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companiesWithDocs.filter(({ company: c, expiredDocs }) => {
      if (docAlertOnly && expiredDocs.length === 0) return false;
      if (zoneFilter !== "all" && (c as any).zoneId !== zoneFilter) return false;
      if (statusFilter !== "all" && (c as any).status !== statusFilter) return false;
      if (typeFilter !== "all" && (c as any).companyType !== typeFilter) return false;
      if (q) {
        const hay = [
          (c as any).nameFa,
          (c as any).nameEn,
          (c as any).nationalId,
          (c as any).regNumber,
          zoneName((c as any).zoneId),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companiesWithDocs, search, zoneFilter, statusFilter, typeFilter, docAlertOnly, parks]);

  const stats = useMemo(() => {
    const all = companiesWithDocs;
    return {
      total: all.length,
      active: all.filter((x) => (x.company as any).status === "active").length,
      suspended: all.filter((x) => (x.company as any).status === "suspended").length,
      terminated: all.filter((x) => (x.company as any).status === "terminated").length,
      expiredDocs: all.filter((x) => x.expiredDocs.length > 0).length,
    };
  }, [companiesWithDocs]);

  const detailCompany = useMemo(
    () => (companies ?? []).find((c: any) => c.id === detailCompanyId) as any,
    [companies, detailCompanyId]
  );

  const detailHistory = useMemo(() => {
    if (!detailCompanyId) return [];
    return (auditLogs ?? [])
      .filter((l: any) => l.entityType === "company" && l.entityId === detailCompanyId)
      .slice()
      .sort(
        (a: any, b: any) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }, [auditLogs, detailCompanyId]);

  // --- Actions ---------------------------------------------------------------

  const startInlineEdit = (field: string, current: string) => {
    setEditingField(field);
    setEditingValue(current ?? "");
  };

  const commitInlineEdit = () => {
    if (!editingField || !detailCompany) return;
    const before = { ...detailCompany };
    const after = { ...detailCompany, [editingField]: editingValue };
    updateCompany(detailCompany.id, { [editingField]: editingValue }, "super-admin", "مدیر سیستم ملی");
    audit.log("UPDATE", "company", detailCompany.id, {
      before,
      after,
      zoneId: after.zoneId,
      companyId: detailCompany.id,
    });
    toast.success("به‌روزرسانی انجام شد", {
      description: `فیلد «${editingField}» با موفقیت ویرایش شد.`,
    });
    setEditingField(null);
    setEditingValue("");
  };

  const requestStatusChange = (
    company: CompanyEntity,
    targetStatus: "active" | "suspended" | "terminated"
  ) => {
    setStatusReason("");
    setStatusDialog({ open: true, company, targetStatus });
  };

  const confirmStatusChange = () => {
    const { company, targetStatus } = statusDialog;
    if (!company || !targetStatus) return;
    if (targetStatus !== "active" && !statusReason.trim()) {
      toast.error("ثبت دلیل الزامی است", {
        description: "برای تعلیق یا فسخ شرکت باید دلیل را وارد کنید.",
      });
      return;
    }
    const before = { ...company };
    const patch: any = {
      status: targetStatus,
      statusChangedAt: new Date().toISOString(),
      statusReason: statusReason.trim() || undefined,
    };
    updateCompany(company.id, patch, "super-admin", "مدیر سیستم ملی");
    audit.log("UPDATE", "company", company.id, {
      before,
      after: { ...before, ...patch },
      zoneId: (company as any).zoneId,
      companyId: company.id,
    });
    const label = COMPANY_STATUS_META[targetStatus]?.label ?? targetStatus;
    toast.success(`وضعیت شرکت تغییر کرد`, {
      description: `وضعیت جدید: ${label}`,
    });
    setStatusDialog({ open: false, company: null, targetStatus: null });
    setStatusReason("");
  };

  const openTransfer = (company: CompanyEntity) => {
    setTransferZoneId("");
    setTransferReason("");
    setTransferDialog({ open: true, company });
  };

  const confirmTransfer = () => {
    const { company } = transferDialog;
    if (!company) return;
    if (!transferZoneId) {
      toast.error("منطقه مقصد انتخاب نشده است");
      return;
    }
    if (transferZoneId === (company as any).zoneId) {
      toast.error("منطقه مقصد با منطقه فعلی یکسان است");
      return;
    }
    if (!transferReason.trim()) {
      toast.error("ثبت دلیل انتقال الزامی است");
      return;
    }
    const before = { ...company };
    const transferRecord = {
      id: `tr-${Date.now()}`,
      fromZoneId: (company as any).zoneId,
      fromZoneName: zoneName((company as any).zoneId),
      toZoneId: transferZoneId,
      toZoneName: zoneName(transferZoneId),
      reason: transferReason.trim(),
      transferredAt: new Date().toISOString(),
      transferredBy: "مدیر سیستم ملی",
    };
    const patch: any = {
      zoneId: transferZoneId,
      transferHistory: [
        ...(((company as any).transferHistory as any[]) ?? []),
        transferRecord,
      ],
    };
    updateCompany(company.id, patch, "super-admin", "مدیر سیستم ملی");
    audit.log("UPDATE", "company", company.id, {
      before,
      after: { ...before, ...patch },
      zoneId: transferZoneId,
      companyId: company.id,
    });
    toast.success("انتقال انجام شد", {
      description: `شرکت به «${transferRecord.toZoneName}» منتقل شد.`,
    });
    setTransferDialog({ open: false, company: null });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteCompany(deleteTarget.id, "super-admin", "مدیر سیستم ملی");
    audit.log("DELETE", "company", deleteTarget.id, {
      before: { ...deleteTarget },
      after: null,
      zoneId: (deleteTarget as any).zoneId,
      companyId: deleteTarget.id,
    });
    toast.success("شرکت حذف شد", { description: (deleteTarget as any).nameFa });
    if (detailCompanyId === deleteTarget.id) setDetailCompanyId(null);
    setDeleteTarget(null);
  };

  const exportCsv = () => {
    const rows = [
      ["نام شرکت", "شناسه ملی", "منطقه", "نوع", "وضعیت", "تاریخ ثبت"],
      ...filtered.map(({ company: c }: any) => [
        c.nameFa ?? "",
        c.nationalId ?? "",
        zoneName(c.zoneId),
        COMPANY_TYPE_LABELS[c.companyType] ?? c.companyType ?? "",
        COMPANY_STATUS_META[c.status]?.label ?? c.status ?? "",
        faDate(c.createdAt),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `companies-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("خروجی CSV دانلود شد");
  };

  // --- Render helpers ---------------------------------------------------------

  const StatusBadge = ({ status }: { status?: string }) => {
    const meta = COMPANY_STATUS_META[status ?? ""] ?? {
      label: status ?? "—",
      className: "bg-muted text-muted-foreground",
      variant: "outline" as const,
    };
    return (
      <Badge variant={meta.variant} className={meta.className}>
        {meta.label}
      </Badge>
    );
  };

  const EditableRow = ({
    label,
    field,
    value,
    icon: Icon,
  }: {
    label: string;
    field: string;
    value?: string;
    icon?: any;
  }) => (
    <div className="flex items-center justify-between gap-2 py-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {Icon && <Icon className="h-4 w-4" />}
        <span>{label}</span>
      </div>
      {editingField === field ? (
        <div className="flex items-center gap-1">
          <Input
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            className="h-8 w-48"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") commitInlineEdit();
              if (e.key === "Escape") setEditingField(null);
            }}
          />
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={commitInlineEdit}>
            <Check className="h-4 w-4 text-emerald-600" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingField(null)}>
            <X className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium">{value || "—"}</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => startInlineEdit(field, value ?? "")}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );

  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            مدیریت شرکت‌ها
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            نمای کلی، ویرایش، تغییر وضعیت و انتقال شرکت‌ها بین مناطق
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4 ml-2" />
            خروجی CSV
          </Button>
          <Button onClick={() => setWizardOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            ثبت شرکت جدید
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "کل شرکت‌ها", value: stats.total, icon: Building2, cls: "" },
          { label: "فعال", value: stats.active, icon: CheckCircle2, cls: "text-emerald-600" },
          { label: "تعلیق‌شده", value: stats.suspended, icon: Ban, cls: "text-amber-600" },
          { label: "فسخ‌شده", value: stats.terminated, icon: X, cls: "text-red-600" },
          { label: "دارای سند منقضی", value: stats.expiredDocs, icon: FileWarning, cls: "text-orange-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold ${s.cls}`}>{faNumber(s.value)}</p>
              </div>
              <s.icon className={`h-8 w-8 opacity-40 ${s.cls}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Expired documents alert banner */}
      {stats.expiredDocs > 0 && (
        <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />
              <p className="text-sm">
                <strong>{faNumber(stats.expiredDocs)}</strong> شرکت دارای اسناد
                منقضی‌شده هستند. برای مشاهده، فیلتر «فقط دارای هشدار سند» را
                فعال کنید.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDocAlertOnly(true)}
              className="shrink-0"
            >
              <FileWarning className="h-4 w-4 ml-2" />
              مشاهده
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو: نام، شناسه ملی، شماره ثبت، منطقه..."
                className="pr-9"
              />
            </div>

            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger>
                <SelectValue placeholder="منطقه" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه مناطق</SelectItem>
                {(parks ?? []).map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="وضعیت" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                <SelectItem value="active">فعال</SelectItem>
                <SelectItem value="suspended">تعلیق‌شده</SelectItem>
                <SelectItem value="terminated">فسخ‌شده</SelectItem>
                <SelectItem value="pending">در انتظار تأیید</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="نوع فعالیت" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه انواع</SelectItem>
                {Object.entries(COMPANY_TYPE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Button
              variant={docAlertOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setDocAlertOnly((v) => !v)}
            >
              <FileWarning className="h-4 w-4 ml-2" />
              فقط دارای هشدار سند
            </Button>
            {(zoneFilter !== "all" ||
              statusFilter !== "all" ||
              typeFilter !== "all" ||
              docAlertOnly ||
              search) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setZoneFilter("all");
                  setStatusFilter("all");
                  setTypeFilter("all");
                  setDocAlertOnly(false);
                }}
              >
                <Filter className="h-4 w-4 ml-2" />
                حذف فیلترها
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Master table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            فهرست شرکت‌ها ({faNumber(filtered.length)} از {faNumber(stats.total)})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">نام شرکت</TableHead>
                  <TableHead className="text-right">شناسه ملی</TableHead>
                  <TableHead className="text-right">منطقه</TableHead>
                  <TableHead className="text-right">نوع</TableHead>
                  <TableHead className="text-right">وضعیت</TableHead>
                  <TableHead className="text-right">اسناد</TableHead>
                  <TableHead className="text-right">تاریخ ثبت</TableHead>
                  <TableHead className="text-center">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      شرکتی مطابق فیلترها یافت نشد.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(({ company: c, expiredDocs, expiringDocs }: any) => (
                  <TableRow key={c.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <p className="font-medium">{c.nameFa ?? "—"}</p>
                        {c.nameEn && (
                          <p className="text-xs text-muted-foreground" dir="ltr">
                            {c.nameEn}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell dir="ltr" className="text-right">
                      {c.nationalId ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {zoneName(c.zoneId)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {COMPANY_TYPE_LABELS[c.companyType] ?? c.companyType ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell>
                      {expiredDocs.length > 0 ? (
                        <Badge variant="destructive" className="gap-1">
                          <FileWarning className="h-3 w-3" />
                          {faNumber(expiredDocs.length)} منقضی
                        </Badge>
                      ) : expiringDocs.length > 0 ? (
                        <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-300">
                          <AlertTriangle className="h-3 w-3" />
                          {faNumber(expiringDocs.length)} رو به انقضا
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          سالم
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{faDate(c.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="جزئیات"
                          onClick={() => setDetailCompanyId(c.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="انتقال منطقه"
                          onClick={() => openTransfer(c)}
                        >
                          <ArrowLeftRight className="h-4 w-4" />
                        </Button>
                        {c.status === "active" ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="تعلیق"
                            onClick={() => requestStatusChange(c, "suspended")}
                          >
                            <Ban className="h-4 w-4 text-amber-600" />
                          </Button>
                        ) : c.status === "suspended" ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="فعال‌سازی"
                            onClick={() => requestStatusChange(c, "active")}
                          >
                            <PlayCircle className="h-4 w-4 text-emerald-600" />
                          </Button>
                        ) : null}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="حذف"
                          onClick={() => setDeleteTarget(c)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* ── Detail Sheet (Master-Detail) ─────────────────────────────────── */}
      <Sheet open={!!detailCompany} onOpenChange={(o) => !o && setDetailCompanyId(null)}>
        <SheetContent side="left" className="w-full sm:max-w-2xl overflow-y-auto" dir="rtl">
          {detailCompany && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {detailCompany.nameFa}
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={detailCompany.status} />
                  <span dir="ltr">{detailCompany.nationalId}</span>
                  <span>•</span>
                  <span>{zoneName(detailCompany.zoneId)}</span>
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 flex flex-wrap gap-2">
                {detailCompany.status !== "active" && (
                  <Button size="sm" onClick={() => requestStatusChange(detailCompany, "active")}>
                    <PlayCircle className="h-4 w-4 ml-1" /> فعال‌سازی
                  </Button>
                )}
                {detailCompany.status === "active" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => requestStatusChange(detailCompany, "suspended")}
                  >
                    <Ban className="h-4 w-4 ml-1" /> تعلیق
                  </Button>
                )}
                {detailCompany.status !== "terminated" && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => requestStatusChange(detailCompany, "terminated")}
                  >
                    <X className="h-4 w-4 ml-1" /> فسخ قرارداد
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => openTransfer(detailCompany)}>
                  <ArrowLeftRight className="h-4 w-4 ml-1" /> انتقال منطقه
                </Button>
              </div>

              <Tabs defaultValue="info" className="mt-4">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="info">اطلاعات</TabsTrigger>
                  <TabsTrigger value="docs">اسناد</TabsTrigger>
                  <TabsTrigger value="transfers">سوابق انتقال</TabsTrigger>
                  <TabsTrigger value="history">تاریخچه</TabsTrigger>
                </TabsList>

                {/* Info tab with inline edit */}
                <TabsContent value="info" className="space-y-1 mt-3">
                  <EditableRow label="نام فارسی" field="nameFa" value={detailCompany.nameFa} icon={Building2} />
                  <EditableRow label="نام انگلیسی" field="nameEn" value={detailCompany.nameEn} icon={Building2} />
                  <Separator />
                  <EditableRow label="تلفن" field="phone" value={detailCompany.phone} icon={Phone} />
                  <EditableRow label="ایمیل" field="email" value={detailCompany.email} icon={Mail} />
                  <Separator />
                  <EditableRow label="آدرس" field="address" value={detailCompany.address} icon={MapPin} />
                  <EditableRow
                    label="مدیرعامل"
                    field="ceoName"
                    value={detailCompany.ceoName}
                    icon={Users}
                  />
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" /> تاریخ ثبت
                    </span>
                    <span className="text-sm font-medium">{faDate(detailCompany.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" /> تعداد پرسنل
                    </span>
                    <span className="text-sm font-medium">
                      {faNumber(detailCompany.employeeCount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">نوع حقوقی</span>
                    <span className="text-sm font-medium">
                      {LEGAL_TYPE_LABELS[detailCompany.legalType] ?? detailCompany.legalType ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">شماره ثبت</span>
                    <span className="text-sm font-medium" dir="ltr">
                      {detailCompany.regNumber ?? "—"}
                    </span>
                  </div>
                  {detailCompany.statusReason && (
                    <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3">
                      <p className="text-xs text-muted-foreground mb-1">آخرین دلیل تغییر وضعیت</p>
                      <p className="text-sm">{detailCompany.statusReason}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {faDate(detailCompany.statusChangedAt)}
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Documents tab */}
                <TabsContent value="docs" className="mt-3">
                  {(() => {
                    const docs = getCompanyDocuments(detailCompany);
                    if (docs.length === 0)
                      return (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          سندی برای این شرکت ثبت نشده است.
                        </p>
                      );
                    return (
                      <div className="space-y-2">
                        {docs.map((d) => {
                          const expired = isExpired(d.expiryDate);
                          const soon = !expired && isExpiringSoon(d.expiryDate);
                          return (
                            <div
                              key={d.id}
                              className={`flex items-center justify-between rounded-md border p-3 ${
                                expired
                                  ? "border-red-300 bg-red-50 dark:bg-red-950/20"
                                  : soon
                                    ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20"
                                    : ""
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {expired ? (
                                  <FileWarning className="h-4 w-4 text-red-600" />
                                ) : soon ? (
                                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                )}
                                <span className="text-sm font-medium">{d.title}</span>
                              </div>
                              <div className="text-left">
                                <p className="text-sm">{faDate(d.expiryDate)}</p>
                                {expired && (
                                  <p className="text-xs text-red-600">منقضی شده</p>
                                )}
                                {soon && <p className="text-xs text-amber-600">رو به انقضا</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </TabsContent>

                {/* Transfers tab */}
                <TabsContent value="transfers" className="mt-3">
                  {((detailCompany.transferHistory as any[]) ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      این شرکت تاکنون منتقل نشده است.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {[...((detailCompany.transferHistory as any[]) ?? [])]
                        .reverse()
                        .map((t: any) => (
                          <div key={t.id} className="rounded-md border p-3">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                              <span>{t.fromZoneName}</span>
                              <span className="text-muted-foreground">←</span>
                              <span>{t.toZoneName}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {faDate(t.transferredAt)} — توسط {t.transferredBy}
                            </p>
                            <p className="text-sm mt-2">{t.reason}</p>
                          </div>
                        ))}
                    </div>
                  )}
                </TabsContent>

                {/* Audit history tab */}
                <TabsContent value="history" className="mt-3">
                  {detailHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      رویدادی ثبت نشده است.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {detailHistory.map((l: any) => (
                        <div key={l.id} className="rounded-md border p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <History className="h-4 w-4 text-muted-foreground" />
                              <Badge variant="outline">{l.action}</Badge>
                              <span className="text-sm">{l.actorName}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {faDate(l.timestamp)}{" "}
                              {new Date(l.timestamp).toLocaleTimeString("fa-IR")}
                            </span>
                          </div>
                          {l.diff && Object.keys(l.diff).length > 0 && (
                            <div className="mt-2 space-y-1">
                              {Object.entries(l.diff).map(([k, v]: any) => (
                                <p key={k} className="text-xs text-muted-foreground">
                                  <span className="font-medium">{k}:</span>{" "}
                                  {JSON.stringify(v?.before)} ← {JSON.stringify(v?.after)}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Status change dialog ─────────────────────────────────────────── */}
      <Dialog
        open={statusDialog.open}
        onOpenChange={(o) => !o && setStatusDialog({ open: false, company: null, targetStatus: null })}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تغییر وضعیت شرکت</DialogTitle>
            <DialogDescription>
              {(statusDialog.company as any)?.nameFa} — وضعیت جدید:{" "}
              <strong>
                {COMPANY_STATUS_META[statusDialog.targetStatus ?? ""]?.label}
              </strong>
            </DialogDescription>
          </DialogHeader>
          {statusDialog.targetStatus !== "active" && (
            <div className="space-y-2">
              <Label htmlFor="status-reason">دلیل (الزامی)</Label>
              <Textarea
                id="status-reason"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="دلیل تغییر وضعیت را شرح دهید..."
              />
            </div>
          )}
          <DialogFooter className="justify-end gap-2 flex-row-reverse">
            <Button
              variant="outline"
              onClick={() =>
                setStatusDialog({ open: false, company: null, targetStatus: null })
              }
            >
              انصراف
            </Button>
            <Button onClick={confirmStatusChange}>تأیید</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Transfer dialog ──────────────────────────────────────────────── */}
      <Dialog
        open={transferDialog.open}
        onOpenChange={(o) => !o && setTransferDialog({ open: false, company: null })}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>انتقال شرکت به منطقه دیگر</DialogTitle>
            <DialogDescription>
              {(() => {
                const c = transferDialog.company;
                if (!c) return "";
                return `${c.nameFa} — منطقه فعلی: ${zoneName(c.zoneId)}`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="transfer-zone">منطقه مقصد</Label>
              <Select value={transferZoneId} onValueChange={setTransferZoneId}>
                <SelectTrigger id="transfer-zone">
                  <SelectValue placeholder="انتخاب منطقه" />
                </SelectTrigger>
                <SelectContent>
                  {(parks ?? [])
                    .filter((p: any) => p.id !== (transferDialog.company as any)?.zoneId)
                    .map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer-reason">دلیل انتقال (الزامی)</Label>
              <Textarea
                id="transfer-reason"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="دلیل انتقال شرکت به منطقه جدید را بنویسید..."
              />
            </div>
          </div>
          <DialogFooter className="justify-end gap-2 flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => setTransferDialog({ open: false, company: null })}
            >
              انصراف
            </Button>
            <Button onClick={confirmTransfer}>تأیید انتقال</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ──────────────────────────────────────────── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف شرکت</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف شرکت «{(deleteTarget as any)?.nameFa}» اطمینان دارید؟
              این عملیات غیرقابل بازگشت است.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="justify-end gap-2 flex-row-reverse">
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
              انصراف
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Create wizard ────────────────────────────────────────────────── */}
      {wizardOpen && (
        <CompanyOnboardingWizard
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
        />
      )}
    </div>
  );
}
