import { useState } from "react";

import {
  Bell, ChevronLeft, Home, Package, Truck, Calendar, Users, FileText,
  HardHat, Wrench, BarChart2, Wallet, Plus, X, User, ArrowRight, ArrowLeft,
  CheckCheck, Building2, UsersRound, Warehouse, ShieldCheck, Factory, ShoppingBag, Handshake, Mail, Download, Briefcase,
} from "lucide-react";

import { Badge } from "@/shared/components/feedback";
import {
  Shipment, ShipmentDoc, Visitor, Contractor, StatusKind,
  SHIPMENTS, VISITORS, CONTRACTORS, CARGO_TYPES, DOC_TYPES, APPROVERS,
  DOCK_SLOTS, WEEK_DAYS, TIME_SLOTS, DOCK_OPTIONS, SCHED_COMPANIES,
  TODAY_QUEUE, weeklyTraffic,
} from "@/entities/document";

import CompanySidebar from "./components/CompanySidebar";
import CompanyDashboard from "./components/CompanyDashboard";
import ShipmentsView from "./components/ShipmentsView";
import ShipmentWizard from "./components/ShipmentWizard";
import SchedulingView from "./components/SchedulingView";
import VisitorsView from "./components/VisitorsView";
import ContractorsView from "./components/ContractorsView";
import PermitsView from "./components/PermitsView";
import ServicesView from "./components/ServicesView";
import { FinanceScreen } from "@/modules/finance";
import { InventoryScreen } from "@/modules/inventory";
import CompanyReports from "./components/CompanyReports";
import { HRScreen } from "@/modules/hr";
import { ProductionScreen } from "@/modules/production";
import { ProcurementScreen } from "@/modules/procurement";
import HseModule from "./components/HseModule";
import B2BDashboard from "@/modules/b2b-exchange/features/dashboard/B2BDashboard";
import CorrespondencePortal from "@/modules/portal/correspondence/CorrespondencePortal";
import CommercialScreen from "@/modules/commercial/CommercialScreen";
import CompanyUsersManagement from "./components/CompanyUsersManagement";
import { RolesPage } from "@/core/pages/RolesPage";
import { PermitModal, ServiceModal, VisitorModal, ContractorModal } from "./components/modals";
import { useCorrespondenceStore } from "@/modules/correspondence/store";
import {
  generateLetterFromPermitRequest,
  generateLetterFromServiceRequest,
  generateLetterFromContractorRegistration,
  generateLetterFromVisitorRequest,
} from "@/modules/correspondence/utils/autoLetterGenerator";
import { notifyLetterCreated } from "@/core/notifications/useNotificationHub";

// Company identity (in a real app, this would come from auth context)
const COMPANY = { nameFa: "شرکت پلاستیک ایران", companyName: "شرکت پلاستیک ایران" };

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

function CompanyPortal() {
  const createLetter = useCorrespondenceStore((s) => s.createLetter);
  const letters = useCorrespondenceStore((s) => s.letters);

  // Count unread correspondence for this company
  const correspondenceCount = letters.filter(
    (l) =>
      l.unread &&
      (l.sender === COMPANY.nameFa ||
        l.recipients.some((r) => r.org === COMPANY.nameFa))
  ).length;

  const [page, setPage] = useState("dashboard");
  const [shipmentTab, setShipmentTab] = useState<"list" | "approvals">("list");
  const [shipmentsList, setShipmentsList] = useState<Shipment[]>(SHIPMENTS);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    shipmentNo: "BN-1043", plate: "", arrival: "", dock: "", direction: "in" as "in" | "out",
    cargoType: CARGO_TYPES[0], unNumber: "", safetyClass: "", emergencyContact: "",
    weight: "", packages: "", unit: "پالت",
    handling: { refrigerated: false, fragile: false, oversized: false },
    uploadedDocs: [] as ShipmentDoc[], docTypeToUpload: DOC_TYPES[0],
    approver: APPROVERS[0],
  });

  // Scheduling (5A) state
  const [schedDock, setSchedDock] = useState(DOCK_OPTIONS[0]);
  const [schedCargoFilter, setSchedCargoFilter] = useState("all");
  const [schedCompanyFilter, setSchedCompanyFilter] = useState("all");
  const [popoverSlot, setPopoverSlot] = useState<{ day: string; time: string } | null>(null);
  const [queue, setQueue] = useState(TODAY_QUEUE);
  const [quickBooking, setQuickBooking] = useState({ plate: "", cargoType: CARGO_TYPES[0], company: SCHED_COMPANIES[0] });

  const [permitsList, setPermitsList] = useState([
    { name: "پروانه بهره‌برداری", num: "IPC-2024-A", status: "active" as StatusKind, exp: "۱۴۰۳/۱۲/۲۹" },
    { name: "مجوز محیط زیست", num: "ENV-2024-122", status: "active" as StatusKind, exp: "۱۴۰۳/۰۶/۳۱" },
    { name: "گواهینامه ایمنی آتش", num: "FIRE-2024-89", status: "warning" as StatusKind, exp: "۱۴۰۳/۰۳/۱۵" },
    { name: "مجوز حمل‌ونقل", num: "TRANS-2024-44", status: "active" as StatusKind, exp: "۱۴۰۳/۰۹/۳۰" },
  ]);
  const [permitModalOpen, setPermitModalOpen] = useState(false);
  const [permitForm, setPermitForm] = useState({ type: "", description: "" });

  const [requestsList, setRequestsList] = useState([
    { id: "SR-1041", title: "تعمیر خط آب‌رسانی واحد ۱۲", status: "pending" as StatusKind, date: "۱۴۰۳/۰۳/۲۵", pri: "بالا", priColor: "text-red-600 bg-red-50" },
    { id: "SR-1038", title: "نصب دوربین جدید انبار", status: "processing" as StatusKind, date: "۱۴۰۳/۰۳/۱۸", pri: "متوسط", priColor: "text-amber-700 bg-amber-50" },
    { id: "SR-1033", title: "تعویض کنتور برق", status: "approved" as StatusKind, date: "۱۴۰۳/۰۳/۱۰", pri: "پایین", priColor: "text-slate-600 bg-slate-100" },
  ]);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState({ title: "", description: "", priority: "متوسط" });

  const [visitorsList, setVisitorsList] = useState<Visitor[]>(VISITORS);
  const [visitorModalOpen, setVisitorModalOpen] = useState(false);
  const [visitorForm, setVisitorForm] = useState({ name: "", phone: "", host: "", purpose: "", date: "", time: "" });

  const [contractorsList, setContractorsList] = useState<Contractor[]>(CONTRACTORS);
  const [contractorModalOpen, setContractorModalOpen] = useState(false);
  const [contractorForm, setContractorForm] = useState({ name: "", company: "", workType: "", startDate: "", endDate: "", workers: "" });

  const nav = [
    { id: "dashboard", Icon: Home, label: "خانه" },
    { id: "waybill", Icon: Truck, label: "بارنامه‌ها" },
    { id: "scheduling", Icon: Calendar, label: "نوبت‌دهی" },
    { id: "visitors", Icon: Users, label: "مهمانان" },
    { id: "permits", Icon: FileText, label: "مجوزها" },
    { id: "contractors", Icon: HardHat, label: "پیمانکاران" },
    { id: "services", Icon: Wrench, label: "درخواست خدمات" },
    { id: "hr", Icon: UsersRound, label: "منابع انسانی" },
    { id: "production", Icon: Factory, label: "تولید و برنامه‌ریزی" },
    { id: "procurement", Icon: ShoppingBag, label: "خرید و تأمین" },
    { id: "warehouse", Icon: Warehouse, label: "انبار و موجودی" },
    { id: "hse", Icon: ShieldCheck, label: "ایمنی و بهداشت" },
    { id: "marketplace", Icon: Handshake, label: "بازارگاه صنعتی" },
    { id: "reports", Icon: BarChart2, label: "گزارش‌ها" },
    { id: "finance", Icon: Wallet, label: "حسابداری" },
    { id: "correspondence", Icon: Mail, label: "نامه‌نگاری و اتوماسیون" },
    { id: "commercial", Icon: Briefcase, label: "بازرگانی" },
    { id: "users", Icon: Users, label: "مدیریت کاربران" },
    { id: "roles", Icon: ShieldCheck, label: "نقش‌ها و دسترسی‌ها" },
  ];

  const pendingCount = shipmentsList.filter((s) => s.status === "pending").length;

  const resetWizard = () => { setWizardOpen(false); setWizardStep(1); };

  const setShipmentStatus = (id: string, status: StatusKind) =>
    setShipmentsList((list) => list.map((s) => (s.id === id ? { ...s, status } : s)));

  const handleSubmitShipment = () => {
    const newShipment: Shipment = {
      id: wizardData.shipmentNo, plate: wizardData.plate || "—", direction: wizardData.direction,
      cargoType: wizardData.cargoType, submittedBy: "علیرضا صادقی", date: "۱۴۰۳/۰۴/۱۶", status: "pending",
      dock: wizardData.dock || "—", weight: Number(wizardData.weight || 0), packages: Number(wizardData.packages || 0),
      unit: wizardData.unit, docs: wizardData.uploadedDocs,
      history: [{ time: "اکنون", text: "بارنامه ایجاد و برای تأیید ارسال شد" }],
    };
    setShipmentsList((list) => [newShipment, ...list]);
    resetWizard();
    setWizardData((w) => ({ ...w, shipmentNo: `BN-${1044 + shipmentsList.length}`, plate: "", uploadedDocs: [] }));
    setPage("shipments");
    setShipmentTab("list");
  };

  const shipmentDetailPanel = selectedShipment && (
    <>
      <div className="absolute inset-0 bg-black/30 z-30" onClick={() => setSelectedShipment(null)} />
      <div className="absolute top-0 bottom-0 left-0 w-[350px] bg-card border-r border-border shadow-2xl z-40 flex flex-col" dir="rtl">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <button onClick={() => setSelectedShipment(null)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="text-right">
            <p className="text-sm font-bold text-foreground font-mono" dir="ltr">{selectedShipment.id}</p>
            <p className="text-[10px] text-muted-foreground">{selectedShipment.date}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Badge status={selectedShipment.status} />
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span>{selectedShipment.direction === "in" ? "ورودی" : "خروجی"}</span>
              {selectedShipment.direction === "in" ? <ArrowRight className="w-3.5 h-3.5 text-accent" /> : <ArrowLeft className="w-3.5 h-3.5 text-amber-500" />}
            </span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between"><span className="text-foreground font-mono" dir="ltr">{selectedShipment.plate}</span><span className="text-muted-foreground">پلاک خودرو</span></div>
            <div className="flex items-center justify-between"><span className="text-foreground">{selectedShipment.cargoType}</span><span className="text-muted-foreground">نوع محموله</span></div>
            <div className="flex items-center justify-between"><span className="text-foreground font-mono" dir="ltr">{selectedShipment.weight.toLocaleString()} kg</span><span className="text-muted-foreground">وزن اعلامی</span></div>
            <div className="flex items-center justify-between"><span className="text-foreground font-mono" dir="ltr">{selectedShipment.packages} {selectedShipment.unit}</span><span className="text-muted-foreground">تعداد بسته</span></div>
            <div className="flex items-center justify-between"><span className="text-foreground">{selectedShipment.dock}</span><span className="text-muted-foreground">دوک بارگیری</span></div>
            <div className="flex items-center justify-between"><span className="text-foreground">{selectedShipment.submittedBy}</span><span className="text-muted-foreground">ثبت‌کننده</span></div>
          </div>

          <div>
            <p className="text-xs font-semibold text-foreground mb-2 text-right">اسناد پیوست</p>
            {selectedShipment.docs.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-right">سندی پیوست نشده است.</p>
            ) : (
              <div className="space-y-1.5">
                {selectedShipment.docs.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-secondary/30">
                    <span className="text-[10px] text-muted-foreground font-mono" dir="ltr">{d.name}</span>
                    <FileText className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                    <span className="text-[11px] text-foreground flex-1 text-right">{d.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-foreground mb-2 text-right">تاریخچه تغییرات</p>
            <div className="space-y-2.5">
              {selectedShipment.history.map((h, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                  <div className="text-right flex-1">
                    <p className="text-xs text-foreground">{h.text}</p>
                    <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{h.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {selectedShipment.status === "pending" && (
          <div className="p-4 border-t border-border flex items-center gap-2">
            <button onClick={() => { setShipmentStatus(selectedShipment.id, "approved"); setSelectedShipment(null); }}
              className="flex-1 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors">
              بررسی و تأیید
            </button>
            <button onClick={() => { setShipmentStatus(selectedShipment.id, "rejected"); setSelectedShipment(null); }}
              className="flex-1 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors">
              رد
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="h-full flex" dir="rtl">
      <CompanySidebar page={page} setPage={setPage} nav={nav} pendingCount={pendingCount} correspondenceCount={correspondenceCount} />

      <div className="flex-1 flex flex-col overflow-hidden bg-background relative">
        <header className="bg-card border-b border-border px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
              <User className="w-4 h-4 text-accent" />
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-foreground">علیرضا صادقی</p>
              <p className="text-[10px] text-muted-foreground">مدیر عامل</p>
            </div>
            <button className="relative p-1.5 rounded-lg hover:bg-secondary transition-colors mr-2">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-red-500 rounded-full text-[8px] flex items-center justify-center text-white">{pendingCount}</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">پرتال شرکت</span>
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">{nav.find((n) => n.id === page)?.label ?? "داشبورد"}</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-5 space-y-5">

          {page === "dashboard" && (
            <CompanyDashboard
              shipmentsList={shipmentsList}
              requestsList={requestsList}
              pendingCount={pendingCount}
              weeklyTraffic={weeklyTraffic}
              setSelectedShipment={setSelectedShipment}
              setPage={setPage}
            />
          )}

          {page === "shipments" && (
            <>
              <div className="flex items-center justify-between">
                <button onClick={() => setWizardOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors shadow-sm">
                  <Plus className="w-4 h-4" /><span>بارنامه جدید</span>
                </button>
              </div>
              <ShipmentsView
                shipmentsList={shipmentsList}
                setShipmentsList={setShipmentsList}
                shipmentTab={shipmentTab}
                setShipmentTab={setShipmentTab}
                pendingCount={pendingCount}
                setSelectedShipment={setSelectedShipment}
                setShipmentStatus={setShipmentStatus}
              />
            </>
          )}

          {page === "permits" && (
            <PermitsView
              permitsList={permitsList}
              permitModalOpen={permitModalOpen}
              setPermitModalOpen={setPermitModalOpen}
              setPermitForm={setPermitForm}
            />
          )}

          {page === "services" && (
            <ServicesView
              requestsList={requestsList}
              serviceModalOpen={serviceModalOpen}
              setServiceModalOpen={setServiceModalOpen}
            />
          )}

          {page === "visitors" && (
            <VisitorsView
              visitorsList={visitorsList}
              visitorModalOpen={visitorModalOpen}
              setVisitorModalOpen={setVisitorModalOpen}
            />
          )}

          {page === "contractors" && (
            <ContractorsView
              contractorsList={contractorsList}
              contractorModalOpen={contractorModalOpen}
              setContractorModalOpen={setContractorModalOpen}
            />
          )}

          {page === "scheduling" && (
            <SchedulingView
              schedDock={schedDock}
              setSchedDock={setSchedDock}
              schedCargoFilter={schedCargoFilter}
              setSchedCargoFilter={setSchedCargoFilter}
              schedCompanyFilter={schedCompanyFilter}
              setSchedCompanyFilter={setSchedCompanyFilter}
              popoverSlot={popoverSlot}
              setPopoverSlot={setPopoverSlot}
              queue={queue}
              setQueue={setQueue}
              quickBooking={quickBooking}
              setQuickBooking={setQuickBooking}
            />
          )}

          {page === "reports" && (
            <CompanyReports
              shipmentsList={shipmentsList}
              contractorsList={contractorsList}
              requestsList={requestsList}
            />
          )}

          {page === "waybill" && <WaybillModule />}

          {page === "hr" && <HRScreen />}
          {page === "production" && <ProductionScreen />}
          {page === "procurement" && <ProcurementScreen />}

          {page === "warehouse" && <InventoryScreen />}

          {page === "marketplace" && <B2BDashboard />}

          {page === "hse" && <HseModule />}

          {page === "finance" && <FinanceScreen />}
          {page === "correspondence" && <CorrespondencePortal />}
          {page === "commercial" && <CommercialScreen />}
          {page === "users" && <CompanyUsersManagement />}
          {page === "roles" && <RolesPage />}
        </div>

        {shipmentDetailPanel}

        {permitModalOpen && (
          <PermitModal
            permitForm={permitForm}
            setPermitForm={setPermitForm}
            setPermitsList={setPermitsList}
            setPermitModalOpen={setPermitModalOpen}
            onSubmit={(form) => {
              const letter = generateLetterFromPermitRequest(form, COMPANY);
              createLetter(letter);
              notifyLetterCreated(letter.subject, COMPANY.nameFa);
            }}
          />
        )}

        {serviceModalOpen && (
          <ServiceModal
            serviceForm={serviceForm}
            setServiceForm={setServiceForm}
            setRequestsList={setRequestsList}
            setServiceModalOpen={setServiceModalOpen}
            onSubmit={(form) => {
              const letter = generateLetterFromServiceRequest(form, COMPANY);
              createLetter(letter);
              notifyLetterCreated(letter.subject, COMPANY.nameFa);
            }}
          />
        )}

        {visitorModalOpen && (
          <VisitorModal
            visitorForm={visitorForm}
            setVisitorForm={setVisitorForm}
            setVisitorsList={setVisitorsList}
            setVisitorModalOpen={setVisitorModalOpen}
            onSubmit={(form) => {
              const letter = generateLetterFromVisitorRequest(form, COMPANY);
              createLetter(letter);
              notifyLetterCreated(letter.subject, COMPANY.nameFa);
            }}
          />
        )}

        {contractorModalOpen && (
          <ContractorModal
            contractorForm={contractorForm}
            setContractorForm={setContractorForm}
            setContractorsList={setContractorsList}
            setContractorModalOpen={setContractorModalOpen}
            onSubmit={(form) => {
              const letter = generateLetterFromContractorRegistration(form, COMPANY);
              createLetter(letter);
              notifyLetterCreated(letter.subject, COMPANY.nameFa);
            }}
          />
        )}

        {wizardOpen && (
          <ShipmentWizard
            wizardStep={wizardStep}
            setWizardStep={setWizardStep}
            wizardData={wizardData}
            setWizardData={setWizardData}
            resetWizard={resetWizard}
            handleSubmitShipment={handleSubmitShipment}
            shipmentsList={shipmentsList}
            setPage={setPage}
            setShipmentTab={setShipmentTab}
          />
        )}
      </div>
    </div>
  );
}

export default CompanyPortal;

// ── WaybillModule (inline for now) ──────────────────────────────────────────

function WaybillModule() {
  const [tab, setTab] = useState<"active" | "history">("active");
  const [search, setSearch] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [waybillsList, setWaybillsList] = useState([
    { id: "WB-2024-0451", plate: "الف-۱۲۳-ب", cargo: "پلاستیک خام", driver: "محمد احمدی", dest: "تهران", weight: "۱۲,۵۰۰ kg", status: "در حال بارگیری", date: "۱۴۰۳/۰۴/۱۶", time: "۰۸:۳۰" },
    { id: "WB-2024-0450", plate: "ج-۴۵۶-د", cargo: "محصولات بسته‌بندی", driver: "علی رضایی", dest: "اصفهان", weight: "۸,۲۰۰ kg", status: "در انتظار تأیید", date: "۱۴۰۳/۰۴/۱۶", time: "۰۹:۰۰" },
    { id: "WB-2024-0449", plate: "ه-۷۸۹-و", cargo: "مواد شیمیایی", driver: "رضا کریمی", dest: "شیراز", weight: "۵,۰۰۰ kg", status: "تأیید شده", date: "۱۴۰۳/۰۴/۱۵", time: "۱۴:۱۵" },
    { id: "WB-2024-0448", plate: "ز-۱۰۱-ح", cargo: "قطعات پلاستیکی", driver: "حسن موسوی", dest: "کرج", weight: "۳,۸۰۰ kg", status: "در حال خروج", date: "۱۴۰۳/۰۴/۱۵", time: "۱۵:۴۵" },
  ]);

  const [wizardData, setWizardData] = useState({
    shipmentNo: "WB-2024-0452", plate: "", arrival: "", dock: "", direction: "out" as "in" | "out",
    cargoType: CARGO_TYPES[0], unNumber: "", safetyClass: "", emergencyContact: "",
    weight: "", packages: "", unit: "پالت",
    handling: { refrigerated: false, fragile: false, oversized: false },
    uploadedDocs: [] as ShipmentDoc[], docTypeToUpload: DOC_TYPES[0],
    approver: APPROVERS[0],
  });

  const historyWaybills = [
    { id: "WB-2024-0447", plate: "ط-۲۰۲-ی", cargo: "پلاستیک بازیافتی", driver: "سعید جعفری", dest: "قم", weight: "۹,۱۰۰ kg", status: "تحویل داده شد", date: "۱۴۰۳/۰۴/۱۴", time: "۱۰:۰۰" },
    { id: "WB-2024-0446", plate: "ک-۳۰۳-ل", cargo: "پوشاک صنعتی", driver: "مهدی زارع", dest: "مشهد", weight: "۲,۵۰۰ kg", status: "تحویل داده شد", date: "۱۴۰۳/۰۴/۱۳", time: "۰۷:۳۰" },
    { id: "WB-2024-0445", plate: "م-۴۰۴-ن", cargo: "مواد اولیه", driver: "کمال صادقی", dest: "تبریز", weight: "۱۵,۰۰۰ kg", status: "تحویل داده شد", date: "۱۴۰۳/۰۴/۱۲", time: "۱۲:۰۰" },
  ];

  const displayed = (tab === "active" ? waybillsList : historyWaybills).filter(
    (w) => !search || w.id.includes(search) || w.plate.includes(search) || w.cargo.includes(search)
  );

  const statusColor = (s: string) =>
    s === "تأیید شده" || s === "تحویل داده شد" ? "bg-emerald-50 text-emerald-700"
    : s === "در انتظار تأیید" ? "bg-amber-50 text-amber-700"
    : s === "در حال بارگیری" || s === "در حال خروج" ? "bg-blue-50 text-blue-700"
    : "bg-slate-100 text-slate-600";

  const resetWizard = () => { setWizardOpen(false); setWizardStep(1); };

  const handleSubmitWaybill = () => {
    const now = new Date();
    const newEntry = {
      id: wizardData.shipmentNo,
      plate: wizardData.plate || "—",
      cargo: wizardData.cargoType,
      driver: "—",
      dest: "—",
      weight: `${wizardData.weight || 0} kg`,
      status: "در انتظار تأیید",
      date: now.toLocaleDateString("fa-IR"),
      time: now.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
    };
    setWaybillsList((list) => [newEntry, ...list]);
    setWizardData((w) => ({ ...w, shipmentNo: `WB-2024-${String(Number(w.shipmentNo.split("-")[2]) + 1).padStart(4, "0")}`, plate: "", uploadedDocs: [] }));
    resetWizard();
  };

  return (
    <div className="space-y-5 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setWizardOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors">
            <Plus className="w-3.5 h-3.5" /><span>ثبت بارنامه جدید</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
            <Download className="w-3.5 h-3.5" /><span>خروجی Excel</span>
          </button>
        </div>
        <h1 className="text-sm font-semibold text-foreground">بارنامه‌ها</h1>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "فعال امروز", value: waybillsList.length, color: "text-foreground" },
          { label: "در انتظار تأیید", value: waybillsList.filter(w => w.status === "در انتظار تأیید").length, color: "text-amber-600" },
          { label: "تأیید شده", value: waybillsList.filter(w => w.status === "تأیید شده").length, color: "text-emerald-600" },
          { label: "تحویل این هفته", value: historyWaybills.length, color: "text-primary" },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`} dir="ltr">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
          {([{ id: "active", label: "فعال" }, { id: "history", label: "تاریخچه" }] as const).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === t.id ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <input dir="rtl" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو..."
          className="bg-card border border-border rounded-lg py-1.5 px-3 text-xs text-foreground focus:outline-none focus:border-accent w-52" />
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {["وضعیت", "وزن", "مقصد", "راننده", "نوع بار", "پلاک", "شناسه", "زمان"].map((h) => (
                <th key={h} className="text-right py-3 px-3 text-xs font-semibold text-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.map((w) => (
              <tr key={w.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                <td className="py-3 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor(w.status)}`}>{w.status}</span></td>
                <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{w.weight}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground">{w.dest}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground">{w.driver}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground">{w.cargo}</td>
                <td className="py-3 px-3 text-xs font-mono text-foreground" dir="ltr">{w.plate}</td>
                <td className="py-3 px-3 text-xs font-mono text-primary" dir="ltr">{w.id}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground">{w.date} · {w.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {displayed.length === 0 && (
          <div className="p-10 text-center text-muted-foreground text-sm">نتیجه‌ای یافت نشد</div>
        )}
      </div>

      {wizardOpen && (
        <ShipmentWizard
          wizardStep={wizardStep}
          setWizardStep={setWizardStep}
          wizardData={wizardData}
          setWizardData={setWizardData}
          resetWizard={resetWizard}
          handleSubmitShipment={handleSubmitWaybill}
          shipmentsList={[]}
          setPage={() => {}}
          setShipmentTab={() => {}}
        />
      )}
    </div>
  );
}
