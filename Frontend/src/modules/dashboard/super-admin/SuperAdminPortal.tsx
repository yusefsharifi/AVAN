// ============================================================================
// SuperAdminPortal.tsx — Full Implementation (Tasks 0–19)
// ============================================================================

import { lazy, Suspense, useMemo, useState, useEffect } from "react";
import {
  Bell, Building2, ChevronDown, ClipboardList, Factory, FileText,
  Globe, HardHat, Home, Layers, LayoutDashboard, LogOut, Menu, Receipt,
  Settings, ShieldCheck, Smartphone, Truck, Users, Workflow, X,
  Activity, BarChart3, Lock, Radio, Siren, Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ZONES, type Zone } from "@/entities/document";
import { loadSuperAdminStores } from "./utils/seedStores";

// Wired modules (Tasks 1–4)
import ZonesManagement from "./components/zones/ZonesManagement";
import CompaniesManagement from "./components/CompaniesManagement";
import UsersManagement from "./components/UsersManagement";
import WaybillsManagement from "./components/WaybillsManagement";

// Phase 1 (Tasks 5–8)
const FinancialManagement = lazy(() => import('./components/FinancialManagement'));
const CertificatesManagement = lazy(() => import('./components/CertificatesManagement'));
const BasculeManagement = lazy(() => import('./components/BasculeManagement'));

// Phase 2 (Tasks 9–10)
const NationalCommandCenter = lazy(() => import('./components/NationalCommandCenter'));
const NationalOverview = lazy(() => import('./components/NationalOverview'));

// Phase 3 (Tasks 11–13)
const WorkflowBuilder = lazy(() => import('./components/WorkflowBuilder'));
const RolesPage = lazy(() => import('@/core/pages/RolesPage'));
const AuditLogs = lazy(() => import('./components/AuditLogs'));

// Phase 4 (Tasks 14–17)
const SystemHealth = lazy(() => import('./components/SystemHealth'));
const AppVersions = lazy(() => import('./components/AppVersions'));
const MobileConfig = lazy(() => import('./components/MobileConfig'));
const PushNotifications = lazy(() => import('./components/PushNotifications'));

// Phase 5 (Tasks 18–19)
const ReportsPage = lazy(() => import('./components/ReportsPage'));
const SettingsTab = lazy(() => import('./components/SettingsTab'));
const CorrespondencePortal = lazy(() => import('@/modules/portal/correspondence/CorrespondencePortal'));

// ---------------------------------------------------------------------------
// Navigation config
// ---------------------------------------------------------------------------
type PageKey =
  | "dashboard"
  | "companies"
  | "parks"
  | "users"
  | "permissions"
  | "financial"
  | "inventory"
  | "bascule"
  | "waybills"
  | "workflow-builder"
  | "certificates"
  | "system"
  | "audit-logs"
  | "settings"
  | "mobile-config"
  | "push-notifications"
  | "versions"
  | "reports"
  | "iot"
  | "analytics"
  | "command-center"
  | "correspondence";

interface NavItem { key: PageKey; label: string; icon: React.ElementType; badge?: number; }

const mainNav: NavItem[] = [
  { key: "dashboard", label: "داشبورد ملی", icon: LayoutDashboard },
  { key: "command-center", label: "مرکز فرماندهی", icon: Siren, badge: 3 },
  { key: "companies", label: "مدیریت شرکت‌ها", icon: Building2 },
  { key: "parks", label: "مدیریت مناطق", icon: Factory },
  { key: "users", label: "مدیریت کاربران", icon: Users },
  { key: "permissions", label: "دسترسی‌ها", icon: ShieldCheck },
];

const opsNav: NavItem[] = [
  { key: "financial", label: "مالی و حسابداری", icon: Receipt },
  { key: "inventory", label: "انبار و موجودی", icon: Layers },
  { key: "bascule", label: "باسکول", icon: Truck },
  { key: "waybills", label: "بارنامه‌ها", icon: ClipboardList },
  { key: "workflow-builder", label: "فرآیند ساز", icon: Workflow },
  { key: "certificates", label: "گواهینامه‌ها", icon: FileText },
  { key: "correspondence", label: "نامه‌نگاری و اتوماسیون", icon: Mail },
];

const systemNav: NavItem[] = [
  { key: "system", label: "سلامت سیستم", icon: Activity },
  { key: "audit-logs", label: "گزارش‌های حسابرسی", icon: FileText },
  { key: "settings", label: "تنظیمات", icon: Settings },
  { key: "mobile-config", label: "تنظیمات موبایل", icon: Smartphone },
  { key: "push-notifications", label: "اعلان‌ها", icon: Bell, badge: 3 },
  { key: "versions", label: "نسخه‌ها", icon: Globe },
  { key: "reports", label: "گزارشات", icon: BarChart3 },
  { key: "iot", label: "سنسورها", icon: HardHat },
];

// ---------------------------------------------------------------------------
// Sidebar component (unchanged structure, added groups)
// ---------------------------------------------------------------------------
function UnifiedSidebar({ active, onNavigate }: { active: PageKey; onNavigate: (p: PageKey) => void; }) {
  const renderGroup = (label: string, items: NavItem[]) => (
    <div className="mb-4">
      <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="space-y-0.5">
        {items.map((item) => {
          const isActive = active === item.key;
          return (
            <button key={item.key} onClick={() => onNavigate(item.key)}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${isActive ? "bg-secondary text-secondary-foreground font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
              <div className="flex items-center gap-2"><item.icon className="h-4 w-4" /><span>{item.label}</span></div>
              {item.badge ? <Badge variant="secondary" className="h-5 min-w-[20px] text-[10px]">{item.badge}</Badge> : null}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <aside className="hidden lg:flex w-64 flex-col border-l bg-card h-screen sticky top-0">
      <div className="p-4 flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">A</div>
        <div><h1 className="font-bold text-sm">آوان</h1><p className="text-[10px] text-muted-foreground">مدیر سیستم ملی</p></div>
      </div>
      <Separator />
      <div className="flex-1 overflow-y-auto p-3">
        {renderGroup("اصلی", mainNav)}
        {renderGroup("عملیات", opsNav)}
        {renderGroup("سیستم", systemNav)}
      </div>
      <div className="p-3 border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-between px-2">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold">S</div>
                <div className="text-start">
                  <p className="text-xs font-medium">Super Admin</p>
                  <p className="text-[10px] text-muted-foreground">مدیر سیستم ملی</p>
                </div>
              </div>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => onNavigate("settings")}><Settings className="ml-2 h-4 w-4" />تنظیمات پروفایل</DropdownMenuItem>
            <DropdownMenuItem><LogOut className="ml-2 h-4 w-4" />خروج</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

function MobileSidebar({ active, onNavigate, open, setOpen }: { active: PageKey; onNavigate: (p: PageKey) => void; open: boolean; setOpen: (v: boolean) => void; }) {
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden"><Menu className="h-5 w-5" /></Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 p-0" dir="rtl">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">A</div>
            <span className="font-bold text-sm">آوان</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
        </div>
        <div className="px-4 pb-4 overflow-y-auto h-[calc(100vh-64px)]">
          {[...mainNav, ...opsNav, ...systemNav].map((item) => (
            <button key={item.key} onClick={() => { onNavigate(item.key); setOpen(false); }}
              className={`flex w-full items-center rounded-md px-3 py-2 text-sm ${active === item.key ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent"}`}>
              <item.icon className="h-4 w-4 ml-2" />{item.label}
              {item.badge ? <Badge variant="secondary" className="mr-auto h-5 text-[10px]">{item.badge}</Badge> : null}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PlaceholderPage({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center"><Settings className="h-8 w-8 text-muted-foreground" /></div>
      <div><h3 className="text-lg font-semibold">{title}</h3>{subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}</div>
    </div>
  );
}

const Loadable = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">در حال بارگذاری...</div>}>{children}</Suspense>
);

// ---------------------------------------------------------------------------
// Main portal
// ---------------------------------------------------------------------------
export default function SuperAdminPortal() {
  const [page, setPage] = useState<PageKey>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  // National Overview state — owned here since NationalOverview is a controlled component
  const [zonesList] = useState<Zone[]>(ZONES);
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "warning" | "issue">("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [dateRange, setDateRange] = useState("30d");
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);

  // Seed underlying stores (parks, companies) once on portal mount so that
  // Bascule/Waybill/Certificate stores have real zones/companies to derive
  // from. We gate rendering of the page content on this flag: mounting
  // pages like WaybillsManagement before `parks`/`companies` are populated
  // means their <Select> option lists start empty and then suddenly gain
  // items after the seed effect runs — that item-count transition while a
  // Radix Select is already mounted is what was triggering the
  // "Maximum update depth exceeded" crash. Waiting for the seed to finish
  // before mounting any page avoids that transition entirely.
  const [storesReady, setStoresReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadSuperAdminStores().finally(() => {
      if (!cancelled) setStoresReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  const pageTitle = useMemo(() => {
    const all = [...mainNav, ...opsNav, ...systemNav];
    return all.find((n) => n.key === page)?.label ?? "پرتال ملی";
  }, [page]);

  return (
    <div className="flex h-screen bg-background" dir="rtl">
      <UnifiedSidebar active={page} onNavigate={setPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b flex items-center justify-between px-4 lg:px-6 bg-card shrink-0">
          <div className="flex items-center gap-3">
            <MobileSidebar active={page} onNavigate={setPage} open={mobileOpen} setOpen={setMobileOpen} />
            <h2 className="text-sm font-semibold">{pageTitle}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative"><Bell className="h-5 w-5" /><span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-600 text-[10px] text-white flex items-center justify-center">۳</span></Button>
            <div className="hidden sm:flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">S</div>
              <span className="text-xs font-medium">مدیر سیستم ملی</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {!storesReady && (
            <div className="p-8 text-center text-sm text-slate-500">در حال بارگذاری...</div>
          )}
          {storesReady && page === "dashboard" && (
            <Loadable>
              <NationalOverview
                selectedProvinces={selectedProvinces}
                setSelectedProvinces={setSelectedProvinces}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                planFilter={planFilter}
                setPlanFilter={setPlanFilter}
                dateRange={dateRange}
                setDateRange={setDateRange}
                hoveredZoneId={hoveredZoneId}
                setHoveredZoneId={setHoveredZoneId}
                selectedZone={selectedZone}
                setSelectedZone={setSelectedZone}
                zonesList={zonesList}
              />
            </Loadable>
          )}
          {storesReady && page === "command-center" && <Loadable><NationalCommandCenter /></Loadable>}
          {storesReady && page === "companies" && <CompaniesManagement />}
          {storesReady && page === "parks" && <ZonesManagement />}
          {storesReady && page === "users" && <UsersManagement />}
          {storesReady && page === "permissions" && <Loadable><RolesPage /></Loadable>}
          {storesReady && page === "financial" && <Loadable><FinancialManagement /></Loadable>}
          {storesReady && page === "inventory" && <PlaceholderPage title="انبار و موجودی" subtitle="مدیریت موجودی ملی به زودی." />}
          {storesReady && page === "bascule" && <Loadable><BasculeManagement /></Loadable>}
          {storesReady && page === "waybills" && <WaybillsManagement />}
          {storesReady && page === "workflow-builder" && <Loadable><WorkflowBuilder /></Loadable>}
          {storesReady && page === "certificates" && <Loadable><CertificatesManagement /></Loadable>}
          {storesReady && page === "system" && <Loadable><SystemHealth /></Loadable>}
          {storesReady && page === "audit-logs" && <Loadable><AuditLogs /></Loadable>}
          {storesReady && page === "settings" && <Loadable><SettingsTab /></Loadable>}
          {storesReady && page === "mobile-config" && <Loadable><MobileConfig /></Loadable>}
          {storesReady && page === "push-notifications" && <Loadable><PushNotifications /></Loadable>}
          {storesReady && page === "versions" && <Loadable><AppVersions /></Loadable>}
          {storesReady && page === "reports" && <Loadable><ReportsPage /></Loadable>}
          {page === "iot" && <PlaceholderPage title="سنسورها" subtitle="داده‌های IoT مناطق." />}
          {page === "analytics" && <PlaceholderPage title="تحلیل‌ها" subtitle="داشبورد تحلیلی." />}
          {page === "correspondence" && <Loadable><CorrespondencePortal /></Loadable>}
        </main>
      </div>
    </div>
  );
}
