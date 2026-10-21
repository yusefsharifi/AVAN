import { useState, useEffect } from "react";
import { LayoutDashboard, Building2, CreditCard, Wifi, Map, BarChart2, Settings, Bell, RefreshCw, User, Users, X, AlertTriangle, Cpu, Activity, Power, Edit2, Shield, ShieldCheck, CheckCircle, CalendarCheck, FlaskConical, Warehouse, FileText, Zap, Mail } from "lucide-react";
import { LiveDot } from "@/shared/components/feedback";
import { Badge } from "@/shared/components/feedback";
import UnifiedSidebar from "@/core/components/UnifiedSidebar";
import { MAP_LAYER_DEFS_EXT, genDeviceEvents } from "@/entities/document";
import {
  MapLayer, MapDevice, MapLayerExt, MapDeviceExt, StatusKind,
  Company, FinanceTransaction, LiveEvent,
  VEHICLES, COMPANIES, MAP_DEVICES, MAP_DEVICES_EXT, LIVE_EVENTS,
  TRUCK_PATHS, trafficHourly, vehicleTypeDist, dockUtilization,
  BUDGET_LINES, ZONE_BUDGET_TOTAL, ZONE_BUDGET_APPROVED,
  FINANCE_CATEGORIES, FINANCE_TRANSACTIONS, financeTrend, FINANCE_REPORTS,
  CONTRACTORS,
} from "@/entities/document";
import { GisMap } from "./components/GisMap";
import { LiveFeed } from "./components/LiveFeed";
import { OverviewTab } from "./components/OverviewTab";
import { MapTab } from "./components/MapTab";
import { DevicesTab } from "./components/DevicesTab";
import { ReportsTab } from "./components/ReportsTab";
import { FinanceScreen } from "@/modules/finance";
import { InventoryScreen } from "@/modules/inventory";
import { CompaniesTab } from "./components/CompaniesTab";
import { SettingsTab } from "./components/SettingsTab";
import { HSETab } from "./components/HSETab";
import { DeviceModal } from "./components/modals/DeviceModal";
import { OperationsCenter } from "./components/OperationsCenter";
import { UtilityCenter } from "./components/UtilityCenter";
import MarketplaceAnalytics from "./components/MarketplaceAnalytics";
import IncidentCenter from "./components/IncidentCenter";
import LeaseCenter from "./components/LeaseCenter";
import GovernanceCenter from "./components/GovernanceCenter";
import RiskRegister from "./components/RiskRegister";
import PermitToWorkCenter from "./components/PermitToWorkCenter";
import CorrectiveActions from "./components/CorrectiveActions";
import InspectionCalendar from "./components/InspectionCalendar";
import EmergencyDrills from "./components/EmergencyDrills";
import HazmatRegistry from "./components/HazmatRegistry";
import CompanyOnboardingWizard from "./components/CompanyOnboardingWizard";
import CompanyReviewQueue from "./components/CompanyReviewQueue";
import CorrespondencePortal from "@/modules/portal/correspondence/CorrespondencePortal";
import ZoneUsersManagement from "./components/ZoneUsersManagement";
import { RolesPage } from "@/core/pages/RolesPage";

export default function ZoneManagerPortal() {
  const [page, setPage] = useState("overview");
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Dashboard state
  const [mapLayers, setMapLayers] = useState<Record<MapLayer, boolean>>({
    cameras: true, barriers: true, scales: true, vehicles: true, utilities: true,
  });
  const [selectedDevice, setSelectedDevice] = useState<MapDevice | null>(null);
  const [truckStep, setTruckStep] = useState(0);
  const [feedFilter, setFeedFilter] = useState<"all" | "security" | "logistics" | "services">("all");

  // Company management state
  const [companyView, setCompanyView] = useState<"table" | "card">("table");
  const [companySearch, setCompanySearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyTab, setCompanyTab] = useState<"overview" | "vehicles" | "workforce" | "permits" | "history" | "financial" | "scoring" | "health" | "marketplace" | "hse" | "leases" | "energy" | "communications">("overview");
  const [openRowMenu, setOpenRowMenu] = useState<string | null>(null);
  const [approvalsList, setApprovalsList] = useState([
    { id: "AP1", company: "شرکت پلاستیک ایران", label: "درخواست تردد کامیون مواد اولیه", time: "امروز ۰۹:۱۲" },
    { id: "AP2", company: "شرکت پلاستیک ایران", label: "تمدید مجوز فعالیت بلوک", time: "دیروز ۱۶:۴۰" },
    { id: "AP3", company: "صنایع فولاد البرز", label: "درخواست افزایش سقف تردد روزانه", time: "۲ روز پیش" },
    { id: "AP4", company: "پتروشیمی پارس", label: "درخواست نصب تابلوی تبلیغاتی", time: "۳ روز پیش" },
  ]);
  const [companyPermitsList, setCompanyPermitsList] = useState([
    { name: "مجوز فعالیت صنعتی", status: "approved" as StatusKind },
    { name: "مجوز تردد کامیون سنگین", status: "approved" as StatusKind },
    { name: "مجوز انبارش مواد شیمیایی", status: "pending" as StatusKind },
    { name: "مجوز اتصال برق فشار متوسط", status: "approved" as StatusKind },
  ]);

  // Device management map (5C) state
  const [deviceMapLayers, setDeviceMapLayers] = useState<Record<MapLayerExt, boolean>>({
    cameras: true, barriers: true, scales: true, gps: true, rfid: true, utilities: true,
    // `vehicles` is a MapLayerExt member this initializer omitted, so it read as
    // `undefined`. `false` is value-identical for every consumer (a guard
    // `layers.vehicles && …` still renders nothing, and a toggle's `!undefined`
    // still flips to `true`) while satisfying the Record.
    vehicles: false,
  });
  const [deviceSearch, setDeviceSearch] = useState("");
  const [deviceStatusFilter, setDeviceStatusFilter] = useState("all");
  const [devicesListState, setDevicesListState] = useState<MapDeviceExt[]>(MAP_DEVICES_EXT);
  const [selectedDeviceExt, setSelectedDeviceExt] = useState<MapDeviceExt | null>(null);
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [deviceModalMode, setDeviceModalMode] = useState<"add" | "edit">("add");
  const [deviceForm, setDeviceForm] = useState({ label: "", layer: "cameras" as MapLayerExt, model: "", status: "online" as StatusKind });

  // AI Analytics (5D) state
  const [analyticsTab, setAnalyticsTab] = useState<"traffic" | "security" | "logistics" | "predictive" | "scheduler" | "kpi-builder">("traffic");

  // Finance module state
  const [financeTab, setFinanceTab] = useState<"overview" | "transactions" | "budget" | "receivables" | "reconciliation" | "projections">("overview");
  const [financeTypeFilter, setFinanceTypeFilter] = useState("all");
  const [financePartyFilter, setFinancePartyFilter] = useState("all");
  const [financeStatusFilter, setFinanceStatusFilter] = useState("all");
  const [financeTransactionsList, setFinanceTransactionsList] = useState<FinanceTransaction[]>(FINANCE_TRANSACTIONS);
  const [financeModalOpen, setFinanceModalOpen] = useState(false);
  const [financeForm, setFinanceForm] = useState({ type: "income" as "income" | "expense", category: FINANCE_CATEGORIES.income[0], party: "", amount: "", date: "", status: "pending" as FinanceTransaction["status"] });

  // Settings state
  const [settingsTab, setSettingsTab] = useState<"general" | "notifications" | "users" | "integrations">("general");
  const [zoneStaffList, setZoneStaffList] = useState([
    { name: "احمد کریمی", role: "مدیر شهرک", email: "a.karimi@kaveh-idop.ir" },
    { name: "مریم رضایی", role: "کارشناس عملیات", email: "m.rezaei@kaveh-idop.ir" },
    { name: "حسین کاظمی", role: "مسئول HSE", email: "h.kazemi@kaveh-idop.ir" },
  ]);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: "", role: "", email: "" });
  const [notifPrefs, setNotifPrefs] = useState({ securityAlerts: true, financeAlerts: true, deviceAlerts: true, weeklyReport: false, smsUrgent: true });

  useEffect(() => {
    const id = setInterval(() => setTruckStep((s) => s + 1), 2200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    import('./store/useCompanyStore').then(({ useCompanyStore }) => {
      const s = useCompanyStore.getState();
      if (s.companies.length === 0) s.loadFromApi();
    });
    import('./store/useGovernanceStore').then(({ useGovernanceStore }) => {
      const s = useGovernanceStore.getState();
      if (s.users.length === 0) s.loadFromApi();
    });
    import('./store/useZoneManagementStore').then(({ useZoneManagementStore }) => {
      const s = useZoneManagementStore.getState();
      if (s.operationalAlerts.length === 0) s.loadFromApi();
    });
  }, []);

  const filteredDevicesExt = devicesListState.filter((d) => {
    if (deviceSearch && !d.label.includes(deviceSearch)) return false;
    if (deviceStatusFilter !== "all" && d.status !== deviceStatusFilter) return false;
    return true;
  });
  const offlineDevicesCount = devicesListState.filter((d) => d.status === "offline").length;

  let visibleTransactions = financeTransactionsList;
  if (financeTypeFilter !== "all") visibleTransactions = visibleTransactions.filter((t) => t.type === financeTypeFilter);
  if (financePartyFilter !== "all") visibleTransactions = visibleTransactions.filter((t) => t.partyType === financePartyFilter);
  if (financeStatusFilter !== "all") visibleTransactions = visibleTransactions.filter((t) => t.status === financeStatusFilter);
  const monthIncome = financeTransactionsList.filter((t) => t.type === "income" && t.status === "paid").reduce((s, t) => s + t.amount, 0);
  const monthExpense = financeTransactionsList.filter((t) => t.type === "expense" && t.status === "paid").reduce((s, t) => s + t.amount, 0);
  const budgetSpent = BUDGET_LINES.reduce((s, b) => s + b.spent, 0);
  const budgetRemaining = ZONE_BUDGET_TOTAL - budgetSpent;

  const nav = [
    { id: "overview", Icon: LayoutDashboard, label: "نمای کلی" },
    { id: "operations", Icon: Activity, label: "مرکز عملیات" },
    { id: "utilities", Icon: Zap, label: "انرژی و Utility" },
    { id: "marketplace", Icon: Building2, label: "آمار بازارگاه صنعتی" },
    { id: "incidents", Icon: AlertTriangle, label: "حوادث و اقدامات" },
    { id: "leases", Icon: FileText, label: "قرارداد و اجاره" },
    { id: "governance", Icon: Settings, label: "حاکمیت و SLA" },
    { id: "risks", Icon: Shield, label: "ثبت ریسک HSE" },
    { id: "permits", Icon: ShieldCheck, label: "مجوز کار (PTW)" },
    { id: "capa", Icon: CheckCircle, label: "اقدامات اصلاحی" },
    { id: "inspections", Icon: CalendarCheck, label: "تقویم بازرسی" },
    { id: "drills", Icon: AlertTriangle, label: "مانور اضطراری" },
    { id: "hazmat", Icon: FlaskConical, label: "مواد خطرناک و MSDS" },
    { id: "companies", Icon: Building2, label: "شرکت‌ها" },
    { id: "finance", Icon: CreditCard, label: "حسابداری" },
    { id: "inventory", Icon: Warehouse, label: "انبار و موجودی" },
    { id: "devices", Icon: Wifi, label: "دستگاه‌های IoT" },
    { id: "map", Icon: Map, label: "نقشه شهرک" },
    { id: "reports", Icon: BarChart2, label: "گزارش‌ها" },
    { id: "hse", Icon: Shield, label: "ایمنی و انطباق" },
    { id: "correspondence", Icon: Mail, label: "نامه‌نگاری و اتوماسیون" },
    { id: "settings", Icon: Settings, label: "تنظیمات" },
  ];

  const sidebarItems = [
    { id: 'overview-group', label: 'داشبورد و عملیات', icon: LayoutDashboard, active: page === 'overview' || page === 'operations', children: [
      { id: 'overview', label: 'نمای کلی', icon: LayoutDashboard, active: page === 'overview', onClick: () => setPage('overview') },
      { id: 'operations', label: 'مرکز عملیات', icon: Activity, active: page === 'operations', onClick: () => setPage('operations') },
    ] },
    { id: 'companies-group', label: 'شرکت‌ها و قراردادها', icon: Building2, active: ['companies','company_reviews','leases'].includes(page), children: [
      { id: 'companies', label: 'شرکت‌ها', icon: Building2, active: page === 'companies', onClick: () => setPage('companies') },
      { id: 'company_reviews', label: 'کارتابل پذیرش', icon: CheckCircle, active: page === 'company_reviews', onClick: () => setPage('company_reviews') },
      { id: 'leases', label: 'قرارداد و اجاره', icon: FileText, active: page === 'leases', onClick: () => setPage('leases') },
    ] },
    { id: 'hse-group', label: 'HSE و انطباق', icon: Shield, active: ['hse','incidents','risks','permits','capa','inspections','drills','hazmat'].includes(page), children: [
      { id: 'hse', label: 'داشبورد HSE', icon: Shield, active: page === 'hse', onClick: () => setPage('hse') },
      { id: 'incidents', label: 'حوادث', icon: AlertTriangle, active: page === 'incidents', onClick: () => setPage('incidents') },
      { id: 'risks', label: 'ثبت ریسک', icon: Shield, active: page === 'risks', onClick: () => setPage('risks') },
      { id: 'permits', label: 'مجوز کار PTW', icon: ShieldCheck, active: page === 'permits', onClick: () => setPage('permits') },
      { id: 'capa', label: 'اقدامات اصلاحی', icon: CheckCircle, active: page === 'capa', onClick: () => setPage('capa') },
      { id: 'inspections', label: 'تقویم بازرسی', icon: CalendarCheck, active: page === 'inspections', onClick: () => setPage('inspections') },
      { id: 'drills', label: 'مانور اضطراری', icon: AlertTriangle, active: page === 'drills', onClick: () => setPage('drills') },
      { id: 'hazmat', label: 'مواد خطرناک و MSDS', icon: FlaskConical, active: page === 'hazmat', onClick: () => setPage('hazmat') },
    ] },
    { id: 'utility-group', label: 'Utility و زیرساخت', icon: Zap, active: ['utilities','devices','map'].includes(page), children: [
      { id: 'utilities', label: 'انرژی و Utility', icon: Zap, active: page === 'utilities', onClick: () => setPage('utilities') },
      { id: 'devices', label: 'دستگاه‌های IoT', icon: Wifi, active: page === 'devices', onClick: () => setPage('devices') },
      { id: 'map', label: 'نقشه شهرک', icon: Map, active: page === 'map', onClick: () => setPage('map') },
    ] },
    { id: 'management-group', label: 'مدیریت و تحلیل', icon: BarChart2, active: ['finance','inventory','marketplace','reports','governance','correspondence','users','settings'].includes(page), children: [
      { id: 'users', label: 'مدیریت کاربران', icon: Users, active: page === 'users', onClick: () => setPage('users') },
      { id: 'finance', label: 'حسابداری', icon: CreditCard, active: page === 'finance', onClick: () => setPage('finance') },
      { id: 'inventory', label: 'انبار و موجودی', icon: Warehouse, active: page === 'inventory', onClick: () => setPage('inventory') },
      { id: 'marketplace', label: 'آمار بازارگاه صنعتی', icon: Building2, active: page === 'marketplace', onClick: () => setPage('marketplace') },
      { id: 'reports', label: 'گزارش‌ها', icon: BarChart2, active: page === 'reports', onClick: () => setPage('reports') },
      { id: 'governance', label: 'حاکمیت و SLA', icon: Settings, active: page === 'governance', onClick: () => setPage('governance') },
      { id: 'correspondence', label: 'نامه‌نگاری و اتوماسیون', icon: Mail, active: page === 'correspondence', onClick: () => setPage('correspondence') },
      { id: 'settings', label: 'تنظیمات', icon: Settings, active: page === 'settings', onClick: () => setPage('settings') },
      { id: 'roles', label: 'نقش‌ها و دسترسی‌ها', icon: ShieldCheck, active: page === 'roles', onClick: () => setPage('roles') },
    ] },
  ];

  const filteredEvents = feedFilter === "all" ? LIVE_EVENTS : LIVE_EVENTS.filter((e) => e.category === feedFilter);

  const [companiesListState, setCompaniesListState] = useState<Company[]>(COMPANIES);
  const [newCompanyModalOpen, setNewCompanyModalOpen] = useState(false);
  const [newCompanyForm, setNewCompanyForm] = useState({ nameFa: "", sectorFa: "", zoneSection: "بلوک A", unit: "", employees: "" });

  const industries = Array.from(new Set(companiesListState.map((c) => c.sectorFa)));
  const zoneSections = Array.from(new Set(companiesListState.map((c) => c.zoneSection)));

  const filteredCompanies = companiesListState.filter((c) => {
    if (companySearch && !c.nameFa.includes(companySearch)) return false;
    if (industryFilter !== "all" && c.sectorFa !== industryFilter) return false;
    if (activityFilter !== "all" && c.activityLevel !== activityFilter) return false;
    if (zoneFilter !== "all" && c.zoneSection !== zoneFilter) return false;
    return true;
  });

  const companyVehicles = selectedCompany ? VEHICLES.filter((v) => v.companyFa.includes(selectedCompany.nameFa.split(" ").slice(-1)[0]) || v.companyFa === selectedCompany.nameFa) : [];

  // ── GIS Map (shared between overview + full map page) ──────────────────────
  const gisMap = (
    <GisMap
      mapLayers={mapLayers}
      setMapLayers={setMapLayers}
      selectedDevice={selectedDevice}
      setSelectedDevice={setSelectedDevice}
      truckStep={truckStep}
    />
  );

  // ── Live event feed (shared) ─────────────────────────────────────────────
  const liveFeed = (
    <LiveFeed
      feedFilter={feedFilter}
      setFeedFilter={setFeedFilter}
      filteredEvents={filteredEvents}
    />
  );

  return (
    <div className="h-full flex" dir="rtl">
      <UnifiedSidebar
        title="شهرک صنعتی کاوه"
        subtitle="مدیریت شهرک · ساوه"
        icon={LayoutDashboard}
        items={sidebarItems}
        footer={<p className="text-[10px] text-slate-400">احمد کریمی · مدیر شهرک</p>}
      />

      <div className="flex-1 flex flex-col overflow-hidden bg-background relative">
        <header className="bg-card border-b border-border px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
              <LiveDot />
              <span className="text-xs text-emerald-700 font-semibold">عملیاتی</span>
            </div>
            <button className="relative p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="text-right">
            <h1 className="text-base font-bold text-primary">
              {page === "overview" ? "داشبورد شهرک صنعتی کاوه" : nav.find((n) => n.id === page)?.label ?? "داشبورد شهرک صنعتی کاوه"}
            </h1>
            <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">
              Updated: {new Date().toLocaleTimeString()} · 1,240 Devices
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-5 space-y-5">

          {page === "operations" && <OperationsCenter />}
          {page === "utilities" && <UtilityCenter />}
          {page === "marketplace" && <MarketplaceAnalytics />}
          {page === "incidents" && <IncidentCenter />}
          {page === "leases" && <LeaseCenter />}
          {page === "governance" && <GovernanceCenter />}
          {page === "risks" && <RiskRegister />}
          {page === "permits" && <PermitToWorkCenter />}
          {page === "capa" && <CorrectiveActions />}
          {page === "inspections" && <InspectionCalendar />}
          {page === "drills" && <EmergencyDrills />}
          {page === "hazmat" && <HazmatRegistry />}

          {page === "overview" && (
            <OverviewTab gisMap={gisMap} liveFeed={liveFeed} />
          )}

          {page === "map" && (
            <MapTab gisMap={gisMap} />
          )}

          {page === "devices" && (
            <DevicesTab
              deviceSearch={deviceSearch} setDeviceSearch={setDeviceSearch}
              deviceStatusFilter={deviceStatusFilter} setDeviceStatusFilter={setDeviceStatusFilter}
              devicesListState={devicesListState} setDevicesListState={setDevicesListState}
              selectedDeviceExt={selectedDeviceExt} setSelectedDeviceExt={setSelectedDeviceExt}
              deviceModalOpen={deviceModalOpen} setDeviceModalOpen={setDeviceModalOpen}
              deviceModalMode={deviceModalMode} setDeviceModalMode={setDeviceModalMode}
              deviceForm={deviceForm} setDeviceForm={setDeviceForm}
              deviceMapLayers={deviceMapLayers} setDeviceMapLayers={setDeviceMapLayers}
              filteredDevicesExt={filteredDevicesExt} offlineDevicesCount={offlineDevicesCount}
            />
          )}

          {page === "reports" && (
            <ReportsTab analyticsTab={analyticsTab} setAnalyticsTab={setAnalyticsTab} />
          )}

          {page === "hse" && (
            <HSETab />
          )}

          {page === "settings" && (
            <SettingsTab
              settingsTab={settingsTab} setSettingsTab={setSettingsTab}
              zoneStaffList={zoneStaffList} setZoneStaffList={setZoneStaffList}
              staffModalOpen={staffModalOpen} setStaffModalOpen={setStaffModalOpen}
              staffForm={staffForm} setStaffForm={setStaffForm}
              notifPrefs={notifPrefs} setNotifPrefs={setNotifPrefs}
            />
          )}

          {page === "finance" && (
            <div className="h-full -m-5">
              <FinanceScreen />
            </div>
          )}
          {page === "inventory" && (
            <div className="h-full -m-5">
              <InventoryScreen />
            </div>
          )}

          {page === "company_reviews" && <CompanyReviewQueue />}
          {page === "correspondence" && (
            <div className="h-full -m-5">
              <CorrespondencePortal />
            </div>
          )}

          {page === "users" && (
            <ZoneUsersManagement scope="zone" />
          )}

          {page === "roles" && (
            <div className="h-full -m-5">
              <RolesPage />
            </div>
          )}

          {page === "companies" && (
            <CompaniesTab
              onOpenOnboarding={() => setOnboardingOpen(true)}
              companyView={companyView}
              setCompanyView={setCompanyView}
              companySearch={companySearch}
              setCompanySearch={setCompanySearch}
              industryFilter={industryFilter}
              setIndustryFilter={setIndustryFilter}
              activityFilter={activityFilter}
              setActivityFilter={setActivityFilter}
              zoneFilter={zoneFilter}
              setZoneFilter={setZoneFilter}
              filteredCompanies={filteredCompanies}
              selectedCompany={selectedCompany}
              setSelectedCompany={setSelectedCompany}
              companyTab={companyTab}
              setCompanyTab={setCompanyTab}
              openRowMenu={openRowMenu}
              setOpenRowMenu={setOpenRowMenu}
              industries={industries}
              zoneSections={zoneSections}
              companiesListState={companiesListState}
              setCompaniesListState={setCompaniesListState}
              newCompanyModalOpen={newCompanyModalOpen}
              setNewCompanyModalOpen={setNewCompanyModalOpen}
              newCompanyForm={newCompanyForm}
              setNewCompanyForm={setNewCompanyForm}
              approvalsList={approvalsList}
              setApprovalsList={setApprovalsList}
              companyPermitsList={companyPermitsList}
              setCompanyPermitsList={setCompanyPermitsList}
              financeTransactionsList={financeTransactionsList}
              financeModalOpen={financeModalOpen}
              setFinanceModalOpen={setFinanceModalOpen}
              financeForm={financeForm}
              setFinanceForm={setFinanceForm}
            />
          )}
        </div>

        {/* Device detail panel */}
        {selectedDeviceExt && (
          <>
            <div className="absolute inset-0 bg-black/30 z-30" onClick={() => setSelectedDeviceExt(null)} />
            <div className="absolute top-0 bottom-0 left-0 w-[380px] bg-card border-r border-border shadow-2xl z-40 flex flex-col" dir="rtl">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <button onClick={() => setSelectedDeviceExt(null)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">{selectedDeviceExt.label}</p>
                  <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{selectedDeviceExt.model}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge status={selectedDeviceExt.status} />
                  <span className="text-[11px] text-muted-foreground">آخرین پینگ: {selectedDeviceExt.lastPing}</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between"><span className="text-foreground">{selectedDeviceExt.installDate}</span><span className="text-muted-foreground">تاریخ نصب</span></div>
                  <div className="flex items-center justify-between"><span className="text-foreground">{selectedDeviceExt.lastMaintenance}</span><span className="text-muted-foreground">آخرین نگهداری</span></div>
                </div>
                <button
                  onClick={() => { setDeviceModalMode("edit"); setDeviceForm({ label: selectedDeviceExt.label, layer: selectedDeviceExt.layer, model: selectedDeviceExt.model, status: selectedDeviceExt.status }); setDeviceModalOpen(true); }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-accent/10 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors">
                  <span>ویرایش مشخصات دستگاه</span><Edit2 className="w-3.5 h-3.5" />
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors"><span>راه‌اندازی مجدد</span><RefreshCw className="w-3.5 h-3.5" /></button>
                  <button className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors"><span>به‌روزرسانی فریمور</span><Cpu className="w-3.5 h-3.5" /></button>
                  <button className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors"><span>عیب‌یابی</span><Activity className="w-3.5 h-3.5" /></button>
                  <button
                    onClick={() => { setDevicesListState((list) => list.map((d) => d.id === selectedDeviceExt.id ? { ...d, status: "offline" as StatusKind } : d)); setSelectedDeviceExt(null); }}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"><span>خارج از سرویس</span><Power className="w-3.5 h-3.5" /></button>
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2 text-right">رویدادهای اخیر</p>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {genDeviceEvents(selectedDeviceExt.id).map((ev, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                        <div className="text-right flex-1">
                          <p className="text-xs text-foreground">{ev.text}</p>
                          <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{ev.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Add/Edit device modal */}
        <DeviceModal
          open={deviceModalOpen}
          onClose={() => setDeviceModalOpen(false)}
          mode={deviceModalMode}
          form={deviceForm}
          setForm={setDeviceForm}
          onConfirm={() => {
            if (deviceModalMode === "add") {
              const newDevice: MapDeviceExt = {
                id: `dev-${devicesListState.length + 1}`, layer: deviceForm.layer, x: 260 + (devicesListState.length % 5) * 20, y: 180,
                label: deviceForm.label, status: deviceForm.status, model: deviceForm.model || "—",
                installDate: "۱۴۰۳/۰۴/۱۶", lastMaintenance: "—", lastPing: "اکنون",
              };
              setDevicesListState((list) => [...list, newDevice]);
            } else if (selectedDeviceExt) {
              setDevicesListState((list) => list.map((d) => d.id === selectedDeviceExt.id ? { ...d, label: deviceForm.label, layer: deviceForm.layer, model: deviceForm.model, status: deviceForm.status } : d));
            }
            setDeviceModalOpen(false);
            setSelectedDeviceExt(null);
          }}
        />

        {/* Add new finance transaction modal */}
        {financeModalOpen && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setFinanceModalOpen(false)} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl shadow-2xl p-5 w-96 z-50" dir="rtl">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setFinanceModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
                <p className="text-sm font-bold text-foreground">ثبت تراکنش مالی جدید</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">نوع تراکنش</label>
                  <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
                    {(["income", "expense"] as const).map((tp) => (
                      <button key={tp} onClick={() => setFinanceForm((f) => ({ ...f, type: tp, category: FINANCE_CATEGORIES[tp][0] }))}
                        className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${financeForm.type === tp ? (tp === "income" ? "bg-emerald-600 text-white" : "bg-amber-600 text-white") : "text-muted-foreground"}`}>
                        {tp === "income" ? "درآمد" : "هزینه"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">دسته‌بندی</label>
                  <select value={financeForm.category} onChange={(e) => setFinanceForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent">
                    {FINANCE_CATEGORIES[financeForm.type].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">طرف حساب</label>
                  <input dir="rtl" value={financeForm.party} onChange={(e) => setFinanceForm((f) => ({ ...f, party: e.target.value }))} placeholder="نام شرکت، پیمانکار یا واحد..."
                    className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">مبلغ (تومان)</label>
                    <input type="number" dir="ltr" value={financeForm.amount} onChange={(e) => setFinanceForm((f) => ({ ...f, amount: e.target.value }))}
                      className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent" /></div>
                  <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">تاریخ</label>
                    <input dir="rtl" value={financeForm.date} onChange={(e) => setFinanceForm((f) => ({ ...f, date: e.target.value }))} placeholder="۱۴۰۳/۰۴/۱۶"
                      className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent" /></div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">وضعیت</label>
                  <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
                    {(["paid", "pending", "overdue"] as const).map((s) => (
                      <button key={s} onClick={() => setFinanceForm((f) => ({ ...f, status: s }))}
                        className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${financeForm.status === s ? "bg-primary text-white" : "text-muted-foreground"}`}>
                        {s === "paid" ? "پرداخت‌شده" : s === "pending" ? "در انتظار" : "معوق"}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  disabled={!financeForm.party.trim() || !financeForm.amount}
                  onClick={() => {
                    const partyTypeGuess: FinanceTransaction["partyType"] = companiesListState.some((c) => c.nameFa === financeForm.party) ? "company" : CONTRACTORS.some((c) => c.name === financeForm.party) ? "contractor" : "other";
                    setFinanceTransactionsList((list) => [{ id: `FN-${511 + list.length}`, type: financeForm.type, category: financeForm.category, party: financeForm.party, partyType: partyTypeGuess, amount: Number(financeForm.amount), date: financeForm.date || "۱۴۰۳/۰۴/۱۶", status: financeForm.status }, ...list]);
                    setFinanceForm({ type: "income", category: FINANCE_CATEGORIES.income[0], party: "", amount: "", date: "", status: "pending" });
                    setFinanceModalOpen(false);
                  }}
                  className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-1">
                  ثبت تراکنش
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      {onboardingOpen && <CompanyOnboardingWizard isOpen={onboardingOpen} onClose={() => setOnboardingOpen(false)} />}
    </div>
  );
}
