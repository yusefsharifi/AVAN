import React from "react";
import {
  AlertTriangle, Truck, Zap, CheckCircle2, Eye, Lock, Package, Droplets, AlertCircle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WeightSession {
  id: string; plate: string; direction: 'in' | 'out'; linkedShipmentId?: string;
  driverName: string; companyName: string; cargoType: string;
  tareWeight: number; grossWeight: number; netWeight: number; declaredWeight: number;
  dock: string; stationId: string; operatorName: string; timestamp: string;
  status: 'weighing' | 'completed' | 'discrepancy' | 'cancelled';
  discrepancyPct: number;
  commodities?: Array<{ name: string; declaredWeight: number; actualWeight: number; unit: string; hsCode: string }>;
  photos?: { truck?: string; cargo?: string; seal?: string };
  correctedBy?: string; originalSessionId?: string;
}

export interface InventoryItem {
  id: string; sku: string; name: string; category: string; unit: string;
  quantity: number; binLocation: string; minStock: number; reorderPoint: number;
  lastMovementDate: string; avgDailyConsumption: number;
}

export interface GoodsMovement {
  id: string; date: string; reference: string;
  type: 'receipt' | 'issue' | 'adjustment' | 'transfer';
  itemId: string; itemName: string; quantity: number;
  fromLocation: string; toLocation: string; user: string; notes?: string;
}

export interface PurchaseRequest {
  id: string; requestedBy: string; department: string; date: string;
  items: Array<{ name: string; qty: number; unit: string; estimatedCost: number }>;
  totalCost: number; status: 'pending' | 'warehouse-review' | 'finance-approved' | 'po-created' | 'received' | 'rejected';
  priority: 'low' | 'medium' | 'high'; approver?: string; poNumber?: string;
}

export interface HSEIncident {
  id: string; date: string; time: string;
  type: 'security' | 'hse' | 'fire' | 'medical' | 'theft' | 'environmental';
  severity: 'low' | 'medium' | 'high' | 'critical'; location: string; description: string;
  injuredCount: number; immediateActions: string; reportedBy: string; assignedTo: string;
  status: 'logged' | 'assigned' | 'in-progress' | 'resolved' | 'closed';
  rootCause?: string; correctiveAction?: string; photos?: string[]; notificationsSent?: string[];
  timeline: Array<{ action: string; by: string; date: string; notes?: string }>;
}

export interface LeaseContract {
  id: string; companyId: string; companyName: string; unit: string; area: number;
  startDate: string; endDate: string; monthlyRent: number; escalationClause: string;
  renewalStatus: 'active' | 'pending-renewal' | 'expired' | 'terminated';
  contractType: 'standard' | 'preferred' | 'temporary';
}

export interface BinLocation {
  id: string; row: string; column: number;
  occupancy: 'empty' | 'partial' | 'full' | 'reserved';
  itemId?: string; itemName?: string; quantity?: number;
}

export interface WorkPermit {
  id: string; contractorName: string; company: string; workType: string; area: string;
  riskLevel: 'low' | 'medium' | 'high' | 'very-high';
  status: 'active' | 'pending' | 'expired' | 'suspended';
  startDate: string; endDate: string; workers: number;
  ppeRequired: string[];
}

export interface ShiftRosterEntry {
  id: string; name: string; post: string; shiftStart: string; shiftEnd: string;
  hoursWorked: number; breakStatus: 'on-duty' | 'break' | 'completed' | 'off-duty';
  breakStart?: string; breakEnd?: string;
}

export type Portal = "guard" | "company" | "zone-manager" | "super-admin" | "weighbridge" | "mobile" | "correspondence" | "workflow" | "verify" | "finance" | "inventory";
export type StatusKind =
  | "active" | "inactive" | "suspended"
  | "online" | "offline" | "warning"
  | "entered" | "exited" | "pending" | "denied"
  | "operational" | "partial" | "critical"
  | "approved" | "rejected" | "processing";

export interface Vehicle {
  plate: string; driver: string; companyFa: string;
  type: "truck" | "car" | "motorcycle"; status: StatusKind;
  time: string; purposeFa: string;
}
export interface Company {
  id: string; nameFa: string; sectorFa: string;
  status: StatusKind; employees: number; unit: string;
  zoneSection: string; activeVehicles: number; monthTraffic: number;
  openRequests: number; activityLevel: "high" | "medium" | "low"; regNo: string; permits: number;
}
export interface Zone {
  id: string; nameFa: string; cityFa: string; provinceFa: string;
  companies: number; status: StatusKind; occupancy: number;
  devices: number; online: number; plan: string; monthlyTraffic: number;
  mapX: number; mapY: number;
}
export interface IoTDevice {
  id: string; nameFa: string; type: "camera"|"sensor"|"gate"|"meter"|"alarm";
  locationFa: string; status: StatusKind; lastSeen: string; battery?: number;
}

export interface LiveEvent {
  id: string; category: "security" | "logistics" | "services";
  Icon: React.ElementType; descFa: string; time: string; entity: string;
  severity: "low" | "medium" | "high";
}

export type MapLayer = "cameras" | "barriers" | "scales" | "vehicles" | "utilities";
export interface MapDevice { id: string; layer: MapLayer; x: number; y: number; label: string; status: StatusKind; }

export type MapLayerExt = MapLayer | "gps" | "rfid";
export interface MapDeviceExt {
  id: string; layer: MapLayerExt; x: number; y: number; label: string; status: StatusKind;
  model: string; installDate: string; lastMaintenance: string; lastPing: string;
}

export interface ShipmentDoc { id: string; type: string; name: string; }
export interface HistoryEntry { time: string; text: string; }
export interface Shipment {
  id: string; plate: string; direction: "in" | "out"; cargoType: string;
  submittedBy: string; date: string; status: StatusKind; dock: string;
  weight: number; packages: number; unit: string; docs: ShipmentDoc[]; history: HistoryEntry[];
}

export interface Visitor { id: string; name: string; phone: string; host: string; purpose: string; date: string; time: string; status: "scheduled" | "checked-in" | "checked-out" | "cancelled"; }
export interface Contractor { id: string; name: string; company: string; workType: string; permitNumber: string; startDate: string; endDate: string; workers: number; status: "active" | "pending" | "expired"; }

export interface WeighbridgeStation {
  id: string; nameFa: string; locationFa: string; status: StatusKind;
  lastCalibration: string; nextCalibration: string; model: string; capacity: number; precision: number; zoneName: string;
}

export interface WeighbridgeSession {
  id: string; plate: string; direction: "in" | "out"; linkedShipmentId?: string;
  driverName: string; companyName: string; cargoType: string;
  tareWeight: number; grossWeight: number; netWeight: number; declaredWeight: number;
  dock: string; stationId: string; operatorName: string; timestamp: string;
  status: "weighing" | "completed" | "discrepancy" | "cancelled";
  discrepancyPct: number;
}

export interface ServiceHealth {
  id: string; nameFa: string; nameEn: string; status: "operational" | "degraded" | "outage";
  latency: string; lastIncidentFa: string;
}

export interface Certificate {
  id: string; holder: string; title: string; company: string;
  tokenType: "soft" | "hard" | "smartcard"; issueDate: string; expiryDate: string;
  status: "active" | "expiring" | "expired" | "revoked"; serial: string;
}

export interface ServiceUsage {
  id: string; nameFa: string; nameEn: string;
  totalRequests: number; avgLatency: string; errorRate: number;
  uptime: number; lastUpdated: string;
}

export interface AuditLog {
  id: string; timestamp: string; user: string; userRole: string;
  action: string; category: "auth" | "data" | "system" | "security" | "config";
  details: string; ipAddress: string; zone?: string;
}

export interface FinanceTransaction {
  id: string; type: "income" | "expense"; category: string; party: string; partyType: "company" | "contractor" | "other";
  amount: number; date: string; status: "paid" | "pending" | "overdue";
}

export interface BudgetLine { category: string; allocated: number; spent: number; }

export interface SlotBooking { occupancy: "empty" | "partial" | "full"; mine: boolean; company?: string; plateSuffix?: string; cargoType?: string; }

// ── Mock Data ─────────────────────────────────────────────────────────────────

export const VEHICLES: Vehicle[] = [
  { plate: "۱۲ب ۳۴۵ ایران", driver: "علی محمدی", companyFa: "شرکت پلاستیک ایران", type: "truck", status: "entered", time: "۰۸:۳۴", purposeFa: "تحویل کالا" },
  { plate: "۷۸پ ۹۱۲ ایران", driver: "رضا کریمی", companyFa: "فولاد البرز", type: "truck", status: "entered", time: "۰۸:۵۱", purposeFa: "مواد اولیه" },
  { plate: "۳۴ت ۵۶۷ ایران", driver: "محمد حسینی", companyFa: "بازدیدکننده", type: "car", status: "entered", time: "۰۹:۱۲", purposeFa: "جلسه کاری" },
  { plate: "۵۶ث ۷۸۹ ایران", driver: "فرید نجفی", companyFa: "پتروشیمی پارس", type: "truck", status: "pending", time: "۰۹:۲۴", purposeFa: "مواد شیمیایی" },
  { plate: "۹۰ج ۱۲۳ ایران", driver: "حسن رضایی", companyFa: "نامشخص", type: "car", status: "denied", time: "۰۹:۳۱", purposeFa: "نامشخص" },
  { plate: "۲۳ح ۴۵۶ ایران", driver: "امیر صادقی", companyFa: "فولاد البرز", type: "truck", status: "exited", time: "۰۷:۱۵", purposeFa: "دریافت محصول" },
  { plate: "۶۷خ ۸۹۰ ایران", driver: "سعید موسوی", companyFa: "سرامیک شیراز", type: "truck", status: "exited", time: "۰۷:۵۰", purposeFa: "تحویل بار" },
];

export const COMPANIES: Company[] = [
  { id: "C001", nameFa: "شرکت پلاستیک ایران", sectorFa: "پلاستیک", status: "active", employees: 245, unit: "بلوک A، واحد ۱۲", zoneSection: "بلوک A", activeVehicles: 8, monthTraffic: 142, openRequests: 3, activityLevel: "high", regNo: "۱۰۲۴۵۶", permits: 6 },
  { id: "C002", nameFa: "صنایع فولاد البرز", sectorFa: "فلزکاری", status: "active", employees: 512, unit: "بلوک B، واحد ۳", zoneSection: "بلوک B", activeVehicles: 14, monthTraffic: 268, openRequests: 5, activityLevel: "high", regNo: "۱۰۲۴۶۱", permits: 9 },
  { id: "C003", nameFa: "پتروشیمی پارس", sectorFa: "شیمیایی", status: "active", employees: 189, unit: "بلوک C، واحد ۷", zoneSection: "بلوک C", activeVehicles: 6, monthTraffic: 97, openRequests: 2, activityLevel: "medium", regNo: "۱۰۲۴۷۰", permits: 4 },
  { id: "C004", nameFa: "فرآوری غذایی تهران", sectorFa: "مواد غذایی", status: "active", employees: 97, unit: "بلوک D، واحد ۲", zoneSection: "بلوک D", activeVehicles: 4, monthTraffic: 61, openRequests: 1, activityLevel: "medium", regNo: "۱۰۲۴۸۲", permits: 3 },
  { id: "C005", nameFa: "ریسندگی اصفهان", sectorFa: "نساجی", status: "inactive", employees: 0, unit: "بلوک E، واحد ۱", zoneSection: "بلوک E", activeVehicles: 0, monthTraffic: 0, openRequests: 0, activityLevel: "low", regNo: "۱۰۲۴۹۱", permits: 0 },
  { id: "C006", nameFa: "الکترونیک مشهد", sectorFa: "الکترونیک", status: "suspended", employees: 78, unit: "بلوک F، واحد ۵", zoneSection: "بلوک F", activeVehicles: 1, monthTraffic: 12, openRequests: 2, activityLevel: "low", regNo: "۱۰۲۵۰۳", permits: 2 },
  { id: "C007", nameFa: "سرامیک شیراز", sectorFa: "ساختمان", status: "active", employees: 134, unit: "بلوک G، واحد ۹", zoneSection: "بلوک G", activeVehicles: 5, monthTraffic: 88, openRequests: 4, activityLevel: "medium", regNo: "۱۰۲۵۱۷", permits: 5 },
  { id: "C008", nameFa: "قطعات خودرو تبریز", sectorFa: "خودرو", status: "active", employees: 367, unit: "بلوک H، واحد ۱۱", zoneSection: "بلوک H", activeVehicles: 11, monthTraffic: 203, openRequests: 6, activityLevel: "high", regNo: "۱۰۲۵۲۹", permits: 8 },
];

export const ZONES: Zone[] = [
  { id: "Z001", nameFa: "شهرک صنعتی کاوه", cityFa: "ساوه", provinceFa: "مرکزی", companies: 847, status: "operational", occupancy: 89, devices: 1240, online: 1198, plan: "سازمانی", monthlyTraffic: 28420, mapX: 214, mapY: 232 },
  { id: "Z002", nameFa: "شهرک صنعتی اشتهارد", cityFa: "اشتهارد", provinceFa: "البرز", companies: 423, status: "operational", occupancy: 76, devices: 890, online: 867, plan: "حرفه‌ای", monthlyTraffic: 15760, mapX: 222, mapY: 205 },
  { id: "Z003", nameFa: "شهرک صنعتی شمس‌آباد", cityFa: "رباط‌کریم", provinceFa: "تهران", companies: 612, status: "partial", occupancy: 84, devices: 1050, online: 987, plan: "سازمانی", monthlyTraffic: 21980, mapX: 232, mapY: 213 },
  { id: "Z004", nameFa: "شهرک صنعتی مبارکه", cityFa: "اصفهان", provinceFa: "اصفهان", companies: 289, status: "operational", occupancy: 71, devices: 560, online: 551, plan: "استاندارد", monthlyTraffic: 9840, mapX: 254, mapY: 275 },
  { id: "Z005", nameFa: "شهرک صنعتی بینالود", cityFa: "مشهد", provinceFa: "خراسان رضوی", companies: 156, status: "critical", occupancy: 43, devices: 320, online: 198, plan: "پایه", monthlyTraffic: 4120, mapX: 372, mapY: 190 },
  { id: "Z006", nameFa: "شهرک صنعتی صدرا", cityFa: "شیراز", provinceFa: "فارس", companies: 198, status: "operational", occupancy: 67, devices: 410, online: 401, plan: "استاندارد", monthlyTraffic: 7230, mapX: 264, mapY: 340 },
  { id: "Z007", nameFa: "شهرک صنعتی زنجان", cityFa: "زنجان", provinceFa: "آذربایجان شرقی", companies: 74, status: "inactive", occupancy: 0, devices: 140, online: 0, plan: "پایه", monthlyTraffic: 0, mapX: 178, mapY: 165 },
];

export const PROVINCES = ["مرکزی", "البرز", "تهران", "اصفهان", "خراسان رضوی", "فارس", "خوزستان", "آذربایجان شرقی"];
export const SUBSCRIPTION_PLANS = ["پایه", "استاندارد", "حرفه‌ای", "سازمانی"];

export const IRAN_OUTLINE = "M70,120 L110,95 L150,80 L190,92 L215,72 L255,68 L295,80 L335,72 L365,105 L400,148 L412,195 L430,248 L405,298 L368,330 L318,352 L262,366 L212,350 L165,332 L128,302 L95,262 L62,205 L50,160 Z";

export const IOT_DEVICES: IoTDevice[] = [
  { id: "D001", nameFa: "دوربین دروازه ۰۱", type: "camera", locationFa: "دروازه اصلی", status: "online", lastSeen: "همین الان" },
  { id: "D002", nameFa: "دوربین دروازه ۰۲", type: "camera", locationFa: "دروازه اضطراری", status: "online", lastSeen: "همین الان" },
  { id: "D003", nameFa: "کنتور آب A", type: "meter", locationFa: "بلوک A", status: "online", lastSeen: "۲ دقیقه پیش" },
  { id: "D004", nameFa: "کنتور برق B3", type: "meter", locationFa: "بلوک B", status: "warning", lastSeen: "۱۵ دقیقه پیش" },
  { id: "D005", nameFa: "اعلام حریق ناحیه C", type: "alarm", locationFa: "بلوک C", status: "online", lastSeen: "همین الان" },
  { id: "D006", nameFa: "کنترلر هوشمند دروازه", type: "gate", locationFa: "دروازه اصلی", status: "online", lastSeen: "همین الان" },
  { id: "D007", nameFa: "سنسور دما E2", type: "sensor", locationFa: "بلوک E", status: "offline", lastSeen: "۳ ساعت پیش", battery: 12 },
  { id: "D008", nameFa: "سنسور لرزش F1", type: "sensor", locationFa: "بلوک F", status: "online", lastSeen: "۱ دقیقه پیش", battery: 78 },
];

export const LIVE_EVENTS: LiveEvent[] = [
  { id: "E101", category: "security", Icon: AlertTriangle, descFa: "ورود غیرمجاز شناسایی شد", time: "۰۹:۴۲", entity: "پلاک ۹۰ج۱۲۳", severity: "high" },
  { id: "E102", category: "logistics", Icon: Truck, descFa: "کامیون در دوک بارگیری ۳ مستقر شد", time: "۰۹:۳۸", entity: "پلاک ۷۸پ۹۱۲", severity: "low" },
  { id: "E103", category: "services", Icon: Zap, descFa: "نوسان ولتاژ در بلوک B ثبت شد", time: "۰۹:۳۱", entity: "کنتور B3", severity: "medium" },
  { id: "E104", category: "logistics", Icon: CheckCircle2, descFa: "بارگیری دوک ۳ تکمیل شد", time: "۰۹:۲۶", entity: "دوک ۳", severity: "low" },
  { id: "E105", category: "security", Icon: Eye, descFa: "قطع ارتباط دوربین دروازه اضطراری", time: "۰۹:۱۸", entity: "دوربین ۰۲", severity: "medium" },
  { id: "E106", category: "logistics", Icon: Truck, descFa: "ورود کامیون مواد اولیه", time: "۰۹:۱۲", entity: "پلاک ۳۴ت۵۶۷", severity: "low" },
  { id: "E107", category: "services", Icon: Droplets, descFa: "افت فشار آب در بلوک A", time: "۰۸:۵۵", entity: "ایستگاه پمپاژ", severity: "medium" },
  { id: "E108", category: "security", Icon: Lock, descFa: "دروازه اصلی به‌صورت دستی بسته شد", time: "۰۸:۴۰", entity: "افسر حراست", severity: "low" },
  { id: "E109", category: "logistics", Icon: Package, descFa: "درخواست تخلیه بار ثبت شد", time: "۰۸:۳۳", entity: "پتروشیمی پارس", severity: "low" },
  { id: "E110", category: "security", Icon: AlertCircle, descFa: "هشدار دمای بالا در انبار C", time: "۰۸:۲۰", entity: "سنسور C-2", severity: "high" },
];

export const vehicleTypeDist = [
  { name: "کامیون سنگین", value: 52, color: "#0E7C86" },
  { name: "کامیون سبک", value: 22, color: "#3FA7B3" },
  { name: "خودرو سواری", value: 18, color: "#F2A541" },
  { name: "موتورسیکلت", value: 8, color: "#0F2A44" },
];

export const dockUtilization = [
  { name: "دوک بارگیری ۱", pct: 92 },
  { name: "دوک بارگیری ۲", pct: 78 },
  { name: "دوک بارگیری ۳", pct: 65 },
  { name: "دوک بارگیری ۴", pct: 40 },
  { name: "دوک تخلیه ۵", pct: 88 },
];

export const MAP_DEVICES: MapDevice[] = [
  { id: "cam1", layer: "cameras", x: 55, y: 42, label: "دوربین دروازه اصلی", status: "online" },
  { id: "cam2", layer: "cameras", x: 525, y: 42, label: "دوربین دروازه اضطراری", status: "warning" },
  { id: "cam3", layer: "cameras", x: 300, y: 305, label: "دوربین پارکینگ", status: "online" },
  { id: "bar1", layer: "barriers", x: 80, y: 62, label: "راه‌بند دروازه اصلی", status: "online" },
  { id: "bar2", layer: "barriers", x: 500, y: 62, label: "راه‌بند دروازه اضطراری", status: "offline" },
  { id: "scale1", layer: "scales", x: 210, y: 165, label: "باسکول شماره ۱", status: "online" },
  { id: "util1", layer: "utilities", x: 420, y: 205, label: "پست برق فشار متوسط", status: "online" },
  { id: "util2", layer: "utilities", x: 120, y: 265, label: "ایستگاه پمپاژ آب", status: "warning" },
];

export const TRUCK_PATHS: [number, number][][] = [
  [[90, 80], [190, 120], [300, 175], [300, 300]],
  [[500, 90], [420, 150], [340, 215], [280, 300]],
  [[150, 305], [220, 265], [300, 230], [380, 205]],
];

export const trafficHourly = [
  { t: "۶", in: 12, out: 3 }, { t: "۷", in: 28, out: 8 },
  { t: "۸", in: 45, out: 15 }, { t: "۹", in: 32, out: 22 },
  { t: "۱۰", in: 18, out: 35 }, { t: "۱۱", in: 14, out: 28 },
  { t: "۱۲", in: 8, out: 19 },
];

export const zoneScores = [
  { name: "کاوه", score: 94 }, { name: "اشتهارد", score: 87 },
  { name: "شمس‌آباد", score: 79 }, { name: "مبارکه", score: 91 },
  { name: "بینالود", score: 45 }, { name: "صدرا", score: 83 },
];

export const companyDist = [
  { name: "فعال", value: 68, color: "#0E7C86" },
  { name: "غیرفعال", value: 19, color: "#94A3B8" },
  { name: "تعلیق", value: 13, color: "#DC2626" },
];

export const utilityTrend = [
  { m: "آبان", power: 2400, water: 1800 }, { m: "آذر", power: 2800, water: 1600 },
  { m: "دی", power: 3100, water: 1400 }, { m: "بهمن", power: 2900, water: 1700 },
  { m: "اسفند", power: 2600, water: 2100 }, { m: "فروردین", power: 2100, water: 2900 },
];

export const spUp = [38, 42, 45, 41, 55, 58, 62, 68, 71, 75];
export const spDn = [75, 71, 68, 62, 58, 55, 47, 44, 42, 38];

export const WORKFLOW_STEPS = [
  { label: "ثبت درخواست", done: true },
  { label: "بررسی اولیه", done: true },
  { label: "تأیید مدیر", done: true },
  { label: "صدور مجوز", done: false, active: true },
  { label: "تحویل نهایی", done: false },
];

export const SERVICES_HEALTH: ServiceHealth[] = [
  { id: "s1", nameFa: "دروازه API", nameEn: "API Gateway", status: "operational", latency: "24ms", lastIncidentFa: "۱۲ روز پیش" },
  { id: "s2", nameFa: "پردازشگر ANPR", nameEn: "ANPR Processor", status: "degraded", latency: "310ms", lastIncidentFa: "۴۵ دقیقه پیش" },
  { id: "s3", nameFa: "سرویس مکان‌یابی", nameEn: "Location Service", status: "operational", latency: "38ms", lastIncidentFa: "۳ روز پیش" },
  { id: "s4", nameFa: "سرویس اعلان‌ها", nameEn: "Notification Service", status: "operational", latency: "52ms", lastIncidentFa: "۹ روز پیش" },
  { id: "s5", nameFa: "پایگاه داده اصلی", nameEn: "DB Primary", status: "operational", latency: "8ms", lastIncidentFa: "۲۱ روز پیش" },
  { id: "s6", nameFa: "کافکا", nameEn: "Kafka", status: "outage", latency: "—", lastIncidentFa: "همین الان" },
  { id: "s7", nameFa: "فضای ذخیره‌سازی", nameEn: "Object Storage", status: "operational", latency: "91ms", lastIncidentFa: "۱۷ روز پیش" },
];

export const apiRequestsTrend = [
  { t: "۰۰:۰۰", req: 1240 }, { t: "۰۴:۰۰", req: 890 }, { t: "۰۸:۰۰", req: 3420 },
  { t: "۱۲:۰۰", req: 4870 }, { t: "۱۶:۰۰", req: 4120 }, { t: "۲۰:۰۰", req: 2650 }, { t: "۲۳:۵۹", req: 1580 },
];

export const latencyTrend = [
  { t: "۰۰:۰۰", ms: 22 }, { t: "۰۴:۰۰", ms: 18 }, { t: "۰۸:۰۰", ms: 34 },
  { t: "۱۲:۰۰", ms: 41 }, { t: "۱۶:۰۰", ms: 37 }, { t: "۲۰:۰۰", ms: 28 }, { t: "۲۳:۵۹", ms: 24 },
];

export const errorRateTrend = [
  { t: "۰۰:۰۰", pct: 0.2 }, { t: "۰۴:۰۰", pct: 0.1 }, { t: "۰۸:۰۰", pct: 0.4 },
  { t: "۱۲:۰۰", pct: 0.9 }, { t: "۱۶:۰۰", pct: 1.8 }, { t: "۲۰:۰۰", pct: 0.6 }, { t: "۲۳:۵۹", pct: 0.3 },
];

export const kafkaLagByZone = [
  { name: "کاوه", lag: 12 }, { name: "اشتهارد", lag: 8 }, { name: "شمس‌آباد", lag: 34 },
  { name: "مبارکه", lag: 6 }, { name: "بینالود", lag: 210 }, { name: "صدرا", lag: 15 },
];

export const CARGO_TYPES = ["مواد اولیه", "محصول نهایی", "مواد شیمیایی خطرناک", "تجهیزات"];
export const DOC_TYPES = ["بارنامه", "فاکتور", "گواهی مواد خطرناک", "اظهارنامه گمرکی"];
export const APPROVERS = ["علیرضا صادقی — مدیرعامل", "مریم رضایی — مدیر انبار", "حسین کاظمی — مدیر HSE"];

export const DOCK_SLOTS = [
  { id: "D1", label: "دوک ۱", busy: false }, { id: "D2", label: "دوک ۲", busy: true },
  { id: "D3", label: "دوک ۳", busy: false }, { id: "D4", label: "دوک ۴", busy: false },
  { id: "D5", label: "دوک ۵", busy: true }, { id: "D6", label: "دوک ۶", busy: false },
];

export const SHIPMENTS: Shipment[] = [
  { id: "BN-1042", plate: "۱۲ب۳۴۵ ایران", direction: "in", cargoType: "مواد اولیه", submittedBy: "علی محمدی", date: "۱۴۰۳/۰۴/۱۵", status: "pending", dock: "دوک ۲", weight: 12500, packages: 40, unit: "پالت",
    docs: [{ id: "d1", type: "بارنامه", name: "BOL-1042.pdf" }, { id: "d2", type: "فاکتور", name: "INV-1042.pdf" }],
    history: [{ time: "۱۴۰۳/۰۴/۱۵ ۰۹:۱۰", text: "بارنامه ثبت شد" }, { time: "۱۴۰۳/۰۴/۱۵ ۰۹:۱۲", text: "ارسال برای تأیید مدیر" }] },
  { id: "BN-1039", plate: "۷۸پ۹۱۲ ایران", direction: "out", cargoType: "محصول نهایی", submittedBy: "رضا کریمی", date: "۱۴۰۳/۰۴/۱۴", status: "approved", dock: "دوک ۱", weight: 8200, packages: 22, unit: "کارتن",
    docs: [{ id: "d3", type: "بارنامه", name: "BOL-1039.pdf" }],
    history: [{ time: "۱۴۰۳/۰۴/۱۴ ۱۱:۰۰", text: "بارنامه ثبت شد" }, { time: "۱۴۰۳/۰۴/۱۴ ۱۳:۴۰", text: "تأیید شد توسط علیرضا صادقی" }] },
  { id: "BN-1035", plate: "۳۴ت۵۶۷ ایران", direction: "in", cargoType: "تجهیزات", submittedBy: "محمد حسینی", date: "۱۴۰۳/۰۴/۱۲", status: "processing", dock: "دوک ۳", weight: 3100, packages: 6, unit: "دستگاه",
    docs: [], history: [{ time: "۱۴۰۳/۰۴/۱۲ ۰۸:۳۰", text: "بارنامه ثبت شد" }] },
  { id: "BN-1030", plate: "۵۶ث۷۸۹ ایران", direction: "in", cargoType: "مواد شیمیایی خطرناک", submittedBy: "فرید نجفی", date: "۱۴۰۳/۰۴/۱۰", status: "rejected", dock: "—", weight: 4500, packages: 15, unit: "بشکه",
    docs: [], history: [{ time: "۱۴۰۳/۰۴/۱۰ ۱۰:۰۰", text: "بارنامه ثبت شد" }, { time: "۱۴۰۳/۰۴/۱۰ ۱۵:۲۰", text: "رد شد — مستندات ناقص" }] },
];

export const weeklyTraffic = [
  { d: "شنبه", in: 10, out: 7 }, { d: "یکشنبه", in: 14, out: 9 }, { d: "دوشنبه", in: 9, out: 11 },
  { d: "سه‌شنبه", in: 16, out: 8 }, { d: "چهارشنبه", in: 12, out: 10 }, { d: "پنجشنبه", in: 8, out: 6 }, { d: "جمعه", in: 5, out: 4 },
];

export const VISITORS: Visitor[] = [
  { id: "V-201", name: "محسن قربانی", phone: "۰۹۱۲۱۲۳۴۵۶۷", host: "علیرضا صادقی", purpose: "بازدید فنی از خط تولید", date: "۱۴۰۳/۰۴/۱۶", time: "۱۰:۳۰", status: "scheduled" },
  { id: "V-198", name: "سارا کاظمی", phone: "۰۹۳۵۷۶۵۴۳۲۱", host: "رضا کریمی", purpose: "جلسه قرارداد تأمین مواد اولیه", date: "۱۴۰۳/۰۴/۱۵", time: "۰۹:۰۰", status: "checked-in" },
  { id: "V-190", name: "حامد رستمی", phone: "۰۹۱۹۸۸۷۷۶۶۵", host: "علیرضا صادقی", purpose: "بازرسی ایمنی سالانه", date: "۱۴۰۳/۰۴/۱۲", time: "۱۳:۰۰", status: "checked-out" },
  { id: "V-185", name: "نگار احمدی", phone: "۰۹۱۰۳۳۲۲۱۱۰", host: "محمد حسینی", purpose: "مصاحبه استخدامی", date: "۱۴۰۳/۰۴/۱۰", time: "۱۱:۰۰", status: "cancelled" },
];

export const CONTRACTORS: Contractor[] = [
  { id: "CT-41", name: "شرکت تأسیسات آریا", company: "آریا تأسیسات", workType: "تعمیرات تأسیسات مکانیکی", permitNumber: "CTR-2024-41", startDate: "۱۴۰۳/۰۳/۰۱", endDate: "۱۴۰۳/۰۶/۰۱", workers: 6, status: "active" },
  { id: "CT-38", name: "برق‌کاران صنعتی البرز", company: "البرز الکتریک", workType: "نصب سیستم روشنایی انبار", permitNumber: "CTR-2024-38", startDate: "۱۴۰۳/۰۴/۰۵", endDate: "۱۴۰۳/۰۴/۲۵", workers: 3, status: "active" },
  { id: "CT-45", name: "ایمن‌سازان پارس", company: "ایمن پارس", workType: "بازرسی و تعمیر سیستم اطفاء حریق", permitNumber: "—", startDate: "۱۴۰۳/۰۴/۲۰", endDate: "۱۴۰۳/۰۴/۲۲", workers: 2, status: "pending" },
  { id: "CT-29", name: "ساختمانی نوین سازه", company: "نوین سازه", workType: "توسعه سوله انبار جدید", permitNumber: "CTR-2023-29", startDate: "۱۴۰۲/۱۰/۰۱", endDate: "۱۴۰۳/۰۲/۰۱", workers: 12, status: "expired" },
];

export const WEEK_DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه"];
export const TIME_SLOTS = Array.from({ length: 30 }, (_, i) => {
  const totalMin = 7 * 60 + i * 30;
  const h = Math.floor(totalMin / 60).toString().padStart(2, "0");
  const m = (totalMin % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
});
export const DOCK_OPTIONS = ["دوک ۱", "دوک ۲", "دوک ۳", "دوک ۴", "دوک ۵", "دوک ۶"];
export const SCHED_COMPANIES = ["پلاستیک ایران", "فولاد البرز", "پتروشیمی پارس", "غذایی تهران"];

export function hashSlot(dock: string, day: string, time: string) {
  const s = `${dock}|${day}|${time}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000;
  return h;
}

export function getSlotBooking(dock: string, day: string, time: string): SlotBooking {
  const h = hashSlot(dock, day, time);
  if (h % 10 < 5) return { occupancy: "empty", mine: false };
  const mine = h % 17 === 0;
  const occupancy = h % 10 >= 8 ? "full" : "partial";
  return {
    occupancy, mine,
    company: SCHED_COMPANIES[h % SCHED_COMPANIES.length],
    plateSuffix: (100 + (h % 900)).toString(),
    cargoType: CARGO_TYPES[h % CARGO_TYPES.length],
  };
}

export const TODAY_QUEUE = [
  { id: "Q1", plate: "۱۲ب۳۴۵", company: "پلاستیک ایران", cargoType: "مواد اولیه", eta: "۰۹:۰۰" },
  { id: "Q2", plate: "۷۸پ۹۱۲", company: "فولاد البرز", cargoType: "محصول نهایی", eta: "۰۹:۳۰" },
  { id: "Q3", plate: "۳۴ت۵۶۷", company: "پتروشیمی پارس", cargoType: "تجهیزات", eta: "۱۰:۰۰" },
  { id: "Q4", plate: "۵۶ث۷۸۹", company: "غذایی تهران", cargoType: "مواد اولیه", eta: "۱۰:۳۰" },
  { id: "Q5", plate: "۹۰ج۱۲۳", company: "پلاستیک ایران", cargoType: "محصول نهایی", eta: "۱۱:۰۰" },
];

export const MAP_DEVICES_EXT: MapDeviceExt[] = [
  { id: "cam1", layer: "cameras", x: 55, y: 42, label: "دوربین دروازه اصلی", status: "online", model: "Hikvision DS-2CD2T", installDate: "۱۴۰۱/۰۲/۱۰", lastMaintenance: "۱۴۰۲/۱۱/۰۵", lastPing: "۲ ثانیه پیش" },
  { id: "cam2", layer: "cameras", x: 525, y: 42, label: "دوربین دروازه اضطراری", status: "warning", model: "Hikvision DS-2CD2T", installDate: "۱۴۰۱/۰۲/۱۰", lastMaintenance: "۱۴۰۲/۰۸/۱۲", lastPing: "۴۵ ثانیه پیش" },
  { id: "cam3", layer: "cameras", x: 300, y: 305, label: "دوربین پارکینگ", status: "online", model: "Dahua IPC-HFW", installDate: "۱۴۰۱/۰۵/۲۰", lastMaintenance: "۱۴۰۲/۱۲/۰۱", lastPing: "۵ ثانیه پیش" },
  { id: "bar1", layer: "barriers", x: 80, y: 62, label: "راه‌بند دروازه اصلی", status: "online", model: "CAME Gard 4", installDate: "۱۴۰۰/۱۱/۰۱", lastMaintenance: "۱۴۰۲/۱۰/۱۵", lastPing: "۱ ثانیه پیش" },
  { id: "bar2", layer: "barriers", x: 500, y: 62, label: "راه‌بند دروازه اضطراری", status: "offline", model: "CAME Gard 4", installDate: "۱۴۰۰/۱۱/۰۱", lastMaintenance: "۱۴۰۲/۰۵/۲۰", lastPing: "۱۲ دقیقه پیش" },
  { id: "scale1", layer: "scales", x: 210, y: 165, label: "باسکول شماره ۱", status: "online", model: "Avery Weigh-Tronix", installDate: "۱۴۰۰/۰۶/۱۵", lastMaintenance: "۱۴۰۲/۱۲/۱۰", lastPing: "۳ ثانیه پیش" },
  { id: "util1", layer: "utilities", x: 420, y: 205, label: "پست برق فشار متوسط", status: "online", model: "Schneider RM6", installDate: "۱۳۹۹/۰۴/۰۱", lastMaintenance: "۱۴۰۲/۰۹/۰۱", lastPing: "۸ ثانیه پیش" },
  { id: "util2", layer: "utilities", x: 120, y: 265, label: "ایستگاه پمپاژ آب", status: "warning", model: "Grundfos CR", installDate: "۱۳۹۹/۰۴/۰۱", lastMaintenance: "۱۴۰۲/۰۷/۱۱", lastPing: "۵۰ ثانیه پیش" },
  { id: "gps1", layer: "gps", x: 260, y: 120, label: "ردیاب GPS ناوگان ۱", status: "online", model: "Teltonika FMB920", installDate: "۱۴۰۱/۰۱/۱۵", lastMaintenance: "۱۴۰۲/۱۱/۲۰", lastPing: "۱ ثانیه پیش" },
  { id: "gps2", layer: "gps", x: 350, y: 260, label: "ردیاب GPS ناوگان ۲", status: "online", model: "Teltonika FMB920", installDate: "۱۴۰۱/۰۱/۱۵", lastMaintenance: "۱۴۰۲/۱۱/۲۰", lastPing: "۴ ثانیه پیش" },
  { id: "rfid1", layer: "rfid", x: 95, y: 100, label: "کارتخوان RFID دروازه اصلی", status: "online", model: "Zebra FX9600", installDate: "۱۴۰۱/۰۳/۰۱", lastMaintenance: "۱۴۰۲/۱۰/۰۵", lastPing: "۲ ثانیه پیش" },
  { id: "rfid2", layer: "rfid", x: 470, y: 100, label: "کارتخوان RFID دروازه اضطراری", status: "offline", model: "Zebra FX9600", installDate: "۱۴۰۱/۰۳/۰۱", lastMaintenance: "۱۴۰۲/۰۶/۱۸", lastPing: "۲۵ دقیقه پیش" },
];

export const MAP_LAYER_DEFS_EXT: { id: MapLayerExt; label: string; emoji: string }[] = [
  { id: "cameras", label: "دوربین‌ها", emoji: "📷" },
  { id: "barriers", label: "راه‌بندها", emoji: "🚧" },
  { id: "scales", label: "باسکول‌ها", emoji: "⚖️" },
  { id: "gps", label: "ردیاب GPS", emoji: "📡" },
  { id: "rfid", label: "کارتخوان RFID", emoji: "🔖" },
  { id: "utilities", label: "تأسیسات", emoji: "🔌" },
];

export function genDeviceEvents(deviceId: string) {
  const templates = [
    "پینگ موفق دریافت شد", "به‌روزرسانی وضعیت سلامت", "ورودی جدید ثبت شد",
    "هشدار نوسان سیگنال", "همگام‌سازی داده با سرور مرکزی", "بازنشانی خودکار انجام شد",
  ];
  return Array.from({ length: 12 }, (_, i) => ({
    time: `۱۴۰۳/۰۴/${(15 - Math.floor(i / 3)).toString().padStart(2, "0")} ${(23 - i).toString().padStart(2, "0")}:۰۰`,
    text: templates[(hashSlot(deviceId, "e", i.toString())) % templates.length],
  }));
}

export const HEATMAP_HOURS = ["۷", "۹", "۱۱", "۱۳", "۱۵", "۱۷", "۱۹", "۲۱"];
export const heatmapData = WEEK_DAYS.map((day, di) =>
  HEATMAP_HOURS.map((h, hi) => ({ day, hour: h, value: Math.round(30 + 60 * Math.abs(Math.sin(di * 1.3 + hi * 0.7)) + (hi === 3 || hi === 4 ? 25 : 0)) }))
);

export const traffic30Day = Array.from({ length: 30 }, (_, i) => ({
  day: `روز ${i + 1}`, actual: Math.round(900 + 300 * Math.sin(i / 3) + (i % 7 === 0 ? 200 : 0)), forecast: null as number | null,
}));
export const trafficForecast7Day = Array.from({ length: 7 }, (_, i) => ({
  day: `پیش‌بینی ${i + 1}`, actual: null as number | null, forecast: Math.round(1050 + 150 * Math.sin(i / 2)),
}));
export const trafficCombined = [...traffic30Day, { ...traffic30Day[traffic30Day.length - 1], forecast: traffic30Day[traffic30Day.length - 1].actual }, ...trafficForecast7Day];
export const trafficAnomalies = [8, 17, 24].map((idx) => ({ idx, value: traffic30Day[idx].actual }));

export const tomorrowForecast = Array.from({ length: 16 }, (_, i) => {
  const hour = 7 + i;
  const base = Math.round(40 + 55 * Math.abs(Math.sin(i / 3)));
  return { t: `${hour}:۰۰`, low: Math.round(base * 0.85), high: Math.round(base * 1.15), range: Math.round(base * 0.3), value: base };
});

export const maintenancePredictions = [
  { name: "باسکول شماره ۱", prob: 12 }, { name: "راه‌بند دروازه اضطراری", prob: 78 },
  { name: "دوربین دروازه اضطراری", prob: 54 }, { name: "ایستگاه پمپاژ آب", prob: 41 },
  { name: "کارتخوان RFID دروازه اضطراری", prob: 66 },
];

export const FINANCE_CATEGORIES = {
  income: ["عوارض خدمات ماهانه", "جریمه تأخیر", "اجاره فضای تبلیغاتی", "حق اشتراک زیرساخت", "سایر درآمدها"],
  expense: ["پرداخت به پیمانکار", "حقوق و دستمزد پرسنل", "تعمیر و نگهداری تجهیزات", "قبض برق و آب مشترک", "سایر هزینه‌ها"],
};

export const FINANCE_TRANSACTIONS: FinanceTransaction[] = [
  { id: "FN-501", type: "income", category: "عوارض خدمات ماهانه", party: "شرکت پلاستیک ایران", partyType: "company", amount: 42000000, date: "۱۴۰۳/۰۴/۰۱", status: "paid" },
  { id: "FN-502", type: "income", category: "عوارض خدمات ماهانه", party: "صنایع فولاد البرز", partyType: "company", amount: 68000000, date: "۱۴۰۳/۰۴/۰۱", status: "paid" },
  { id: "FN-503", type: "income", category: "جریمه تأخیر", party: "پتروشیمی پارس", partyType: "company", amount: 2100000, date: "۱۴۰۳/۰۴/۰۵", status: "pending" },
  { id: "FN-504", type: "expense", category: "پرداخت به پیمانکار", party: "شرکت تأسیسات آریا", partyType: "contractor", amount: 35000000, date: "۱۴۰۳/۰۴/۰۳", status: "paid" },
  { id: "FN-505", type: "expense", category: "حقوق و دستمزد پرسنل", party: "واحد منابع انسانی", partyType: "other", amount: 120000000, date: "۱۴۰۳/۰۴/۰۱", status: "paid" },
  { id: "FN-506", type: "expense", category: "تعمیر و نگهداری تجهیزات", party: "برق‌کاران صنعتی البرز", partyType: "contractor", amount: 18500000, date: "۱۴۰۳/۰۴/۱۰", status: "pending" },
  { id: "FN-507", type: "income", category: "اجاره فضای تبلیغاتی", party: "پتروشیمی پارس", partyType: "company", amount: 8000000, date: "۱۴۰۳/۰۳/۲۸", status: "overdue" },
  { id: "FN-508", type: "expense", category: "قبض برق و آب مشترک", party: "اداره برق منطقه‌ای", partyType: "other", amount: 54000000, date: "۱۴۰۳/۰۴/۰۱", status: "paid" },
  { id: "FN-509", type: "income", category: "حق اشتراک زیرساخت", party: "فرآوری غذایی تهران", partyType: "company", amount: 14000000, date: "۱۴۰۳/۰۴/۰۲", status: "paid" },
  { id: "FN-510", type: "expense", category: "پرداخت به پیمانکار", party: "ایمن‌سازان پارس", partyType: "contractor", amount: 9800000, date: "۱۴۰۳/۰۴/۰۸", status: "overdue" },
];

export const BUDGET_LINES: BudgetLine[] = [
  { category: "نگهداری زیرساخت", allocated: 600000000, spent: 410000000 },
  { category: "حقوق و دستمزد پرسنل", allocated: 1500000000, spent: 1440000000 },
  { category: "توسعه و عمران", allocated: 900000000, spent: 210000000 },
  { category: "امنیت و حراست", allocated: 350000000, spent: 298000000 },
  { category: "انرژی (برق، آب، گاز)", allocated: 700000000, spent: 648000000 },
];
export const ZONE_BUDGET_TOTAL = 4200000000;
export const ZONE_BUDGET_APPROVED = true;

export const financeTrend = [
  { m: "فروردین", income: 780000000, expense: 690000000 }, { m: "اردیبهشت", income: 810000000, expense: 705000000 },
  { m: "خرداد", income: 865000000, expense: 740000000 }, { m: "تیر", income: 890000000, expense: 760000000 },
];

export const FINANCE_REPORTS = [
  { title: "گزارش سود و زیان ماهانه", desc: "خلاصه درآمد و هزینه شهرک به تفکیک ماه", type: "تخصصی" },
  { title: "گزارش مطالبات معوق", desc: "فهرست شرکت‌های دارای بدهی سررسیدشده", type: "تخصصی" },
  { title: "گزارش تفصیلی بودجه", desc: "وضعیت تخصیص و مصرف بودجه به تفکیک ردیف", type: "تخصصی" },
  { title: "گزارش عمومی مالی شهرک", desc: "خلاصه کلی وضعیت مالی برای ارائه به شورای شهرک", type: "عمومی" },
];

export const WEIGHBRIDGE_STATIONS: WeighbridgeStation[] = [
  { id: "WB1", nameFa: "باسکول شماره ۱", locationFa: "دروازه اصلی", status: "online", lastCalibration: "۱۴۰۲/۱۲/۱۰", nextCalibration: "۱۴۰۳/۰۶/۱۰", model: "Avery Weigh-Tronix", capacity: 60000, precision: 10, zoneName: "منطقه مرکزی" },
  { id: "WB2", nameFa: "باسکول شماره ۲", locationFa: "دروازه اضطراری", status: "offline", lastCalibration: "۱۴۰۲/۰۹/۰۵", nextCalibration: "۱۴۰۳/۰۳/۰۵", model: "Mettler Toledo", capacity: 50000, precision: 20, zoneName: "منطقه غربی" },
  { id: "WB3", nameFa: "باسکول شماره ۳ (سیار)", locationFa: "بلوک D", status: "warning", lastCalibration: "۱۴۰۲/۰۷/۲۲", nextCalibration: "۱۴۰۳/۰۱/۲۲", model: "Avery Weigh-Tronix", capacity: 30000, precision: 10, zoneName: "بلوک D" },
];

export const WEIGHBRIDGE_SESSIONS: WeighbridgeSession[] = [
  { id: "WBS-9001", plate: "۱۲ب۳۴۵ ایران", direction: "in", linkedShipmentId: "BN-1042", driverName: "علی محمدی", companyName: "شرکت پلاستیک ایران", cargoType: "مواد اولیه", tareWeight: 12300, grossWeight: 24800, netWeight: 12500, declaredWeight: 12500, dock: "دوک ۲", stationId: "WB1", operatorName: "رضا احمدی", timestamp: "۱۴۰۳/۰۴/۱۵ ۰۹:۲۰", status: "completed", discrepancyPct: 0 },
  { id: "WBS-9002", plate: "۷۸پ۹۱۲ ایران", direction: "out", linkedShipmentId: "BN-1039", driverName: "رضا کریمی", companyName: "فولاد البرز", cargoType: "محصول نهایی", tareWeight: 11800, grossWeight: 20000, netWeight: 8200, declaredWeight: 8200, dock: "دوک ۱", stationId: "WB1", operatorName: "رضا احمدی", timestamp: "۱۴۰۳/۰۴/۱۴ ۱۳:۴۵", status: "completed", discrepancyPct: 0 },
  { id: "WBS-9003", plate: "۵۶ث۷۸۹ ایران", direction: "in", linkedShipmentId: "BN-1030", driverName: "فرید نجفی", companyName: "پتروشیمی پارس", cargoType: "مواد شیمیایی خطرناک", tareWeight: 13100, grossWeight: 18450, netWeight: 5350, declaredWeight: 4500, dock: "—", stationId: "WB1", operatorName: "رضا احمدی", timestamp: "۱۴۰۳/۰۴/۱۰ ۱۰:۱۵", status: "discrepancy", discrepancyPct: 18.9 },
  { id: "WBS-9004", plate: "۳۴ت۵۶۷ ایران", direction: "in", linkedShipmentId: "BN-1035", driverName: "محمد حسینی", companyName: "بازدیدکننده", cargoType: "تجهیزات", tareWeight: 9800, grossWeight: 12900, netWeight: 3100, declaredWeight: 3100, dock: "دوک ۳", stationId: "WB2", operatorName: "سارا نوری", timestamp: "۱۴۰۳/۰۴/۱۲ ۰۸:۵۰", status: "completed", discrepancyPct: 0 },
  { id: "WBS-9005", plate: "۹۰ج۱۲۳ ایران", direction: "in", driverName: "حسن رضایی", companyName: "نامشخص", cargoType: "نامشخص", tareWeight: 0, grossWeight: 0, netWeight: 0, declaredWeight: 0, dock: "—", stationId: "WB1", operatorName: "رضا احمدی", timestamp: "۱۴۰۳/۰۴/۱۶ ۰۹:۳۱", status: "cancelled", discrepancyPct: 0 },
  { id: "WBS-9006", plate: "۲۳ح۴۵۶ ایران", direction: "out", driverName: "امیر صادقی", companyName: "فولاد البرز", cargoType: "محصول نهایی", tareWeight: 11950, grossWeight: 19870, netWeight: 7920, declaredWeight: 7900, dock: "دوک ۴", stationId: "WB1", operatorName: "رضا احمدی", timestamp: "۱۴۰۳/۰۴/۰۹ ۰۷:۴۰", status: "completed", discrepancyPct: 0.3 },
  { id: "WBS-9007", plate: "۶۷خ۸۹۰ ایران", direction: "out", driverName: "سعید موسوی", companyName: "سرامیک شیراز", cargoType: "مصالح ساختمانی", tareWeight: 12500, grossWeight: 21300, netWeight: 8800, declaredWeight: 8800, dock: "دوک ۵", stationId: "WB3", operatorName: "رضا احمدی", timestamp: "۱۴۰۳/۰۴/۰۸ ۰۸:۱۰", status: "completed", discrepancyPct: 0 },
];

export const WEIGHBRIDGE_TODAY_STATS = {
  totalWeighings: 24,
  totalWeight: 236160,
  avgWeight: 9840,
  discrepancyCount: 3,
  cancelledCount: 1,
  avgSessionMinutes: 4,
};

export const WEIGHBRIDGE_DISCREPANCY_THRESHOLD_PCT = 5;

export const CERTIFICATES: Certificate[] = [
  { id: "C1", holder: "احمد کریمی", title: "مدیر شهرک", company: "مدیریت شهرک کاوه", tokenType: "hard", issueDate: "۱۴۰۲/۰۶/۰۱", expiryDate: "۱۴۰۴/۰۶/۳۱", status: "active", serial: "****3F4A" },
  { id: "C2", holder: "علیرضا صادقی", title: "مدیرعامل", company: "شرکت پلاستیک ایران", tokenType: "soft", issueDate: "۱۴۰۲/۰۸/۱۰", expiryDate: "۱۴۰۳/۰۸/۱۰", status: "expiring", serial: "****91B2" },
  { id: "C3", holder: "مریم رضایی", title: "مدیر انبار", company: "مدیریت شهرک کاوه", tokenType: "soft", issueDate: "۱۴۰۱/۰۳/۱۵", expiryDate: "۱۴۰۳/۰۳/۱۵", status: "expired", serial: "****7C10" },
  { id: "C4", holder: "حسین کاظمی", title: "مدیر HSE", company: "مدیریت شهرک کاوه", tokenType: "smartcard", issueDate: "۱۴۰۲/۰۱/۲۰", expiryDate: "۱۴۰۴/۰۱/۲۰", status: "active", serial: "****A82D" },
  { id: "C5", holder: "زهرا امینی", title: "مدیر مالی", company: "مدیریت شهرک کاوه", tokenType: "hard", issueDate: "۱۴۰۲/۰۲/۰۵", expiryDate: "۱۴۰۴/۰۲/۰۵", status: "active", serial: "****5E91" },
  { id: "C6", holder: "فرید نجفی", title: "مدیر تولید", company: "پتروشیمی پارس", tokenType: "soft", issueDate: "۱۴۰۲/۰۹/۱۲", expiryDate: "۱۴۰۳/۰۸/۲۵", status: "expiring", serial: "****C614" },
  { id: "C7", holder: "رضایی محمد", title: "مدیر لجستیک", company: "مدیریت شهرک کاوه", tokenType: "soft", issueDate: "۱۴۰۲/۰۴/۱۸", expiryDate: "۱۴۰۴/۰۴/۱۸", status: "active", serial: "****2B77" },
  { id: "C8", holder: "سعید طاهری", title: "مدیر پیشین انبار", company: "مدیریت شهرک کاوه", tokenType: "hard", issueDate: "۱۴۰۱/۰۵/۰۱", expiryDate: "۱۴۰۳/۰۵/۰۱", status: "revoked", serial: "****F001" },
];

export const TOKEN_TYPE_CFG: Record<string, { fa: string; emoji: string }> = {
  soft: { fa: "Soft (موبایل)", emoji: "📱" }, hard: { fa: "Hard (USB)", emoji: "🔑" }, smartcard: { fa: "Smart Card", emoji: "💳" },
};
export const CERT_STATUS_CFG: Record<string, { fa: string; emoji: string; text: string; bg: string }> = {
  active: { fa: "فعال", emoji: "✅", text: "text-emerald-700", bg: "bg-emerald-50" },
  expiring: { fa: "در شرف انقضا", emoji: "⚠️", text: "text-amber-700", bg: "bg-amber-50" },
  expired: { fa: "منقضی", emoji: "❌", text: "text-red-700", bg: "bg-red-50" },
  revoked: { fa: "ابطال‌شده", emoji: "🚫", text: "text-slate-600", bg: "bg-slate-100" },
};

export const VALIDATION_RESULT = {
  docType: "بارنامه", docNumber: "۱۴۰۳-۴۵۶", issuer: "شرکت نمونه صنعت", issueDate: "۱۴۰۳/۰۸/۱۴",
  tsaTimestamp: "۱۴۰۳/۰۸/۱۴ ۱۴:۳۲:۱۷",
  signers: [
    { name: "رضایی محمد", title: "مسئول لجستیک", datetime: "۱۴۰۳/۰۸/۱۴ ۱۴:۳۲:۱۷", serial: "****3F4A", valid: true },
    { name: "احمد کریمی", title: "مدیر شهرک", datetime: "۱۴۰۳/۰۸/۱۴ ۱۵:۰۵:۴۲", serial: "****5E91", valid: true },
  ],
};

export const SERVICE_USAGE: ServiceUsage[] = [
  { id: "su1", nameFa: "دروازه API", nameEn: "API Gateway", totalRequests: 1284520, avgLatency: "24ms", errorRate: 0.12, uptime: 99.98, lastUpdated: "۱۴۰۳/۰۴/۱۶" },
  { id: "su2", nameFa: "پردازشگر ANPR", nameEn: "ANPR Processor", totalRequests: 845230, avgLatency: "310ms", errorRate: 2.45, uptime: 98.12, lastUpdated: "۱۴۰۳/۰۴/۱۶" },
  { id: "su3", nameFa: "سرویس مکان‌یابی", nameEn: "Location Service", totalRequests: 523180, avgLatency: "38ms", errorRate: 0.08, uptime: 99.99, lastUpdated: "۱۴۰۳/۰۴/۱۶" },
  { id: "su4", nameFa: "سرویس اعلان‌ها", nameEn: "Notification Service", totalRequests: 1023450, avgLatency: "52ms", errorRate: 0.31, uptime: 99.95, lastUpdated: "۱۴۰۳/۰۴/۱۶" },
  { id: "su5", nameFa: "پایگاه داده اصلی", nameEn: "DB Primary", totalRequests: 2341890, avgLatency: "8ms", errorRate: 0.02, uptime: 99.99, lastUpdated: "۱۴۰۳/۰۴/۱۶" },
  { id: "su6", nameFa: "کافکا", nameEn: "Kafka", totalRequests: 345670, avgLatency: "—", errorRate: 100.0, uptime: 85.40, lastUpdated: "۱۴۰۳/۰۴/۱۶" },
  { id: "su7", nameFa: "فضای ذخیره‌سازی", nameEn: "Object Storage", totalRequests: 678920, avgLatency: "91ms", errorRate: 0.05, uptime: 99.97, lastUpdated: "۱۴۰۳/۰۴/۱۶" },
  { id: "su8", nameFa: "سرویس گزارش‌گیری", nameEn: "Reporting Service", totalRequests: 156340, avgLatency: "245ms", errorRate: 0.89, uptime: 99.82, lastUpdated: "۱۴۰۳/۰۴/۱۶" },
];

export const AUDIT_LOGS: AuditLog[] = [
  { id: "AL-001", timestamp: "۱۴۰۳/۰۴/۱۶ ۱۴:۳۲", user: "محمد تهرانی", userRole: "super-admin", action: "ورود به سیستم", category: "auth", details: "ورود موفق از مرورگر Chrome", ipAddress: "192.168.1.45" },
  { id: "AL-002", timestamp: "۱۴۰۳/۰۴/۱۶ ۱۴:۱۵", user: "احمد کریمی", userRole: "zone-manager", action: "تغییر تنظیمات شهرک", category: "config", details: "تغییر ساعت فعالیت دروازه شمالی", ipAddress: "192.168.2.110", zone: "شهرک صنعتی کاوه" },
  { id: "AL-003", timestamp: "۱۴۰۳/۰۴/۱۶ ۱۳:۴۸", user: "system", userRole: "system", action: "پشتیبان‌گیری خودکار", category: "system", details: "پشتیبان‌گیری روزانه پایگاه داده با موفقیت انجام شد", ipAddress: "—" },
  { id: "AL-004", timestamp: "۱۴۰۳/۰۴/۱۶ ۱۳:۲۰", user: "فرید نجفی", userRole: "company-admin", action: "ورود ناموفق", category: "auth", details: "تلاش ورود ناموفق — رمز عبور اشتباه (۳ بار متوالی)", ipAddress: "10.0.5.22", zone: "شهرک صنعتی اشتهارد" },
  { id: "AL-005", timestamp: "۱۴۰۳/۰۴/۱۶ ۱۲:۵۵", user: "مریم رضایی", userRole: "zone-manager", action: "ایجاد کاربر جدید", category: "data", details: "ایجاد حساب کاربری «سارا نوری» با نقش اپراتور باسکول", ipAddress: "192.168.2.88", zone: "شهرک صنعتی کاوه" },
  { id: "AL-006", timestamp: "۱۴۰۳/۰۴/۱۶ ۱۲:۳۰", user: "سیستم امنیتی", userRole: "system", action: "هشدار امنیتی", category: "security", details: "تشخیص ترافیک غیرعادی از IP 203.0.113.42 — مسدود شد", ipAddress: "203.0.113.42" },
  { id: "AL-007", timestamp: "۱۴۰۳/۰۴/۱۶ ۱۱:۴۵", user: "علیرضا صادقی", userRole: "company-admin", action: "به‌روزرسانی مجوز", category: "data", details: "تمدید مجوز محیط زیست شرکت پلاستیک ایران", ipAddress: "192.168.3.67", zone: "شهرک صنعتی کاوه" },
  { id: "AL-008", timestamp: "۱۴۰۳/۰۴/۱۶ ۱۱:۱۰", user: "حسین کاظمی", userRole: "hse-officer", action: "تأیید بارنامه خطرناک", category: "data", details: "تأیید بارنامه BN-1030 — مواد شیمیایی خطرناک", ipAddress: "192.168.2.55", zone: "شهرک صنعتی کاوه" },
  { id: "AL-009", timestamp: "۱۴۰۳/۰۴/۱۶ ۱۰:۳۰", user: "system", userRole: "system", action: "بازنشانی سرویس", category: "system", details: "بازنشانی خودکار سرویس کافکا — وضعیت: خراب", ipAddress: "—" },
  { id: "AL-010", timestamp: "۱۴۰۳/۰۴/۱۶ ۰۹:۵۰", user: "زهرا امینی", userRole: "finance-officer", action: "ثبت تراکنش مالی", category: "data", details: "ثبت فاکتور خدمات ماهانه شرکت پلاستیک ایران — ۴۲,۰۰۰,۰۰۰ تومان", ipAddress: "192.168.2.92", zone: "شهرک صنعتی کاوه" },
  { id: "AL-011", timestamp: "۱۴۰۳/۰۴/۱۶ ۰۹:۱۵", user: "رضا احمدی", userRole: "weighbridge-operator", action: "ثبت وزن کامیون", category: "data", details: "ثبت وزن ورودی کامیون پلاک ۱۲ب۳۴۵ — وزن خالص: ۱۲,۵۰۰ kg", ipAddress: "192.168.4.12", zone: "شهرک صنعتی کاوه" },
  { id: "AL-012", timestamp: "۱۴۰۳/۰۴/۱۶ ۰۸:۴۰", user: "سعید موسوی", userRole: "guard", action: "تأیید ورود خودرو", category: "security", details: "تأیید ورود کامیون پلاک ۷۸پ۹۱۲ — شرکت فولاد البرز", ipAddress: "192.168.5.8", zone: "شهرک صنعتی کاوه" },
  { id: "AL-013", timestamp: "۱۴۰۳/۰۴/۱۶ ۰۸:۰۰", user: "بهنام کریمیان", userRole: "super-admin", action: "تغییر سطح دسترسی", category: "config", details: "تغییر سطح دسترسی نقش «اپراتور باسکول» — افزودن دسترسی گزارش‌گیری", ipAddress: "192.168.1.22" },
  { id: "AL-014", timestamp: "۱۴۰۳/۰۴/۱۵ ۲۳:۱۰", user: "system", userRole: "system", action: "بروزرسانی سیستم", category: "system", details: "بروزرسانی خودکار ماژول ANPR به نسخه ۳.۲.۱", ipAddress: "—" },
  { id: "AL-015", timestamp: "۱۴۰۳/۰۴/۱۵ ۲۲:۳۰", user: "سیستم امنیتی", userRole: "system", action: "قطع ارتباط دستگاه", category: "security", details: "قطع ارتباط دوربین دروازه اضطراری — بررسی خودکار آغاز شد", ipAddress: "—" },
];

// ── Map Layer Definitions ──────────────────────────────────────────────────────

export const MAP_LAYER_DEFS: { id: MapLayer; label: string; Icon: React.ElementType }[] = [
  { id: "cameras", label: "دوربین‌ها", Icon: Eye },
  { id: "barriers", label: "راه‌بندها", Icon: Lock },
  { id: "scales", label: "باسکول‌ها", Icon: Package },
  { id: "vehicles", label: "خودروها", Icon: Truck },
  { id: "utilities", label: "تأسیسات", Icon: Zap },
];

export const WEIGHT_SESSIONS: WeightSession[] = [
  { id: 'WS-9001', plate: '۱۲ب۳۴۵ ایران', direction: 'in', linkedShipmentId: 'BN-1042', driverName: 'علی محمدی', companyName: 'شرکت پلاستیک ایران', cargoType: 'مواد اولیه', tareWeight: 12300, grossWeight: 24800, netWeight: 12500, declaredWeight: 12500, dock: 'دوک ۲', stationId: 'WB1', operatorName: 'رضا احمدی', timestamp: '۱۴۰۳/۰۴/۱۵ ۰۹:۲۰', status: 'completed', discrepancyPct: 0 },
  { id: 'WS-9002', plate: '۷۸پ۹۱۲ ایران', direction: 'out', linkedShipmentId: 'BN-1039', driverName: 'رضا کریمی', companyName: 'فولاد البرز', cargoType: 'محصول نهایی', tareWeight: 11800, grossWeight: 20000, netWeight: 8200, declaredWeight: 8200, dock: 'دوک ۱', stationId: 'WB1', operatorName: 'رضا احمدی', timestamp: '۱۴۰۳/۰۴/۱۴ ۱۳:۴۵', status: 'completed', discrepancyPct: 0 },
  { id: 'WS-9003', plate: '۵۶ث۷۸۹ ایران', direction: 'in', linkedShipmentId: 'BN-1030', driverName: 'فرید نجفی', companyName: 'پتروشیمی پارس', cargoType: 'مواد شیمیایی خطرناک', tareWeight: 13100, grossWeight: 18450, netWeight: 5350, declaredWeight: 4500, dock: '—', stationId: 'WB1', operatorName: 'رضا احمدی', timestamp: '۱۴۰۳/۰۴/۱۰ ۱۰:۱۵', status: 'discrepancy', discrepancyPct: 18.9, commodities: [{ name: 'اسید سولفوریک', declaredWeight: 4500, actualWeight: 5350, unit: 'kg', hsCode: '280700' }] },
  { id: 'WS-9004', plate: '۳۴ت۵۶۷ ایران', direction: 'in', linkedShipmentId: 'BN-1035', driverName: 'محمد حسینی', companyName: 'شرکت پلاستیک ایران', cargoType: 'تجهیزات', tareWeight: 9800, grossWeight: 12900, netWeight: 3100, declaredWeight: 3100, dock: 'دوک ۳', stationId: 'WB2', operatorName: 'سارا نوری', timestamp: '۱۴۰۳/۰۴/۱۲ ۰۸:۵۰', status: 'completed', discrepancyPct: 0 },
  { id: 'WS-9005', plate: '۹۰ج۱۲۳ ایران', direction: 'in', driverName: 'حسن رضایی', companyName: 'نامشخص', cargoType: 'نامشخص', tareWeight: 0, grossWeight: 0, netWeight: 0, declaredWeight: 0, dock: '—', stationId: 'WB1', operatorName: 'رضا احمدی', timestamp: '۱۴۰۳/۰۴/۱۶ ۰۹:۳۱', status: 'cancelled', discrepancyPct: 0 },
  { id: 'WS-9006', plate: '۲۳ح۴۵۶ ایران', direction: 'out', driverName: 'امیر صادقی', companyName: 'فولاد البرز', cargoType: 'محصول نهایی', tareWeight: 11950, grossWeight: 19870, netWeight: 7920, declaredWeight: 7900, dock: 'دوک ۴', stationId: 'WB1', operatorName: 'رضا احمدی', timestamp: '۱۴۰۳/۰۴/۰۹ ۰۷:۴۰', status: 'completed', discrepancyPct: 0.3 },
  { id: 'WS-9007', plate: '۶۷خ۸۹۰ ایران', direction: 'out', driverName: 'سعید موسوی', companyName: 'سرامیک شیراز', cargoType: 'مصالح ساختمانی', tareWeight: 12500, grossWeight: 21300, netWeight: 8800, declaredWeight: 8800, dock: 'دوک ۵', stationId: 'WB3', operatorName: 'رضا احمدی', timestamp: '۱۴۰۳/۰۴/۰۸ ۰۸:۱۰', status: 'completed', discrepancyPct: 0 },
  { id: 'WS-9008', plate: '۱۱ل۴۵۶ ایران', direction: 'in', driverName: 'نادر قاسمی', companyName: 'غذایی تهران', cargoType: 'مواد اولیه', tareWeight: 8200, grossWeight: 15700, netWeight: 7500, declaredWeight: 7500, dock: 'دوک ۱', stationId: 'WB1', operatorName: 'رضا احمدی', timestamp: '۱۴۰۳/۰۴/۰۷ ۱۰:۰۰', status: 'completed', discrepancyPct: 0 },
  { id: 'WS-9009', plate: '۴۵م۷۸۹ ایران', direction: 'out', driverName: 'کمال صادقی', companyName: 'پتروشیمی پارس', cargoType: 'محصول نهایی', tareWeight: 14200, grossWeight: 26400, netWeight: 12200, declaredWeight: 12000, dock: 'دوک ۲', stationId: 'WB1', operatorName: 'سارا نوری', timestamp: '۱۴۰۳/۰۴/۰۶ ۱۴:۳۰', status: 'completed', discrepancyPct: 1.7 },
  { id: 'WS-9010', plate: '۸۹ن۰۱۲ ایران', direction: 'in', driverName: 'محسن رحیمی', companyName: 'الکترونیک مشهد', cargoType: 'تجهیزات الکترونیکی', tareWeight: 6500, grossWeight: 9800, netWeight: 3300, declaredWeight: 3300, dock: 'دوک ۳', stationId: 'WB2', operatorName: 'رضا احمدی', timestamp: '۱۴۰۳/۰۴/۰۵ ۱۱:۱۵', status: 'completed', discrepancyPct: 0 },
];

export const HSE_INCIDENTS: HSEIncident[] = [
  { id: 'INC-001', date: '۱۴۰۳/۰۴/۱۵', time: '۱۰:۳۰', type: 'hse', severity: 'high', location: 'بلوک B - واحد ۳', description: 'نشت مواد شیمیایی از مخزن ذخیره', injuredCount: 0, immediateActions: 'قرقره آب، ایزوله محل حادثه', reportedBy: 'حسین کاظمی', assignedTo: 'واحد HSE', status: 'in-progress', rootCause: 'خرابی شیر خروجی', timeline: [{ action: 'ثبت حادثه', by: 'حسین کاظمی', date: '۱۴۰۳/۰۴/۱۵ ۱۰:۳۵' }, { action: 'ارجاع به HSE', by: 'سیستم', date: '۱۴۰۳/۰۴/۱۵ ۱۰:۳۶' }, { action: 'شروع بررسی', by: 'مریم رضایی', date: '۱۴۰۳/۰۴/۱۵ ۱۱:۰۰' }] },
  { id: 'INC-002', date: '۱۴۰۳/۰۴/۱۴', time: '۱۴:۱۵', type: 'fire', severity: 'critical', location: 'انبار مواد شیمیایی', description: 'آتش‌سوزی جزئی در انبار مواد شیمیایی', injuredCount: 1, immediateActions: 'اطلاع‌رسانی آتش‌نشانی، تخلیه انبار', reportedBy: 'سعید موسوی', assignedTo: 'واحد HSE', status: 'resolved', rootCause: 'اتصال برق نادرست', correctiveAction: 'بازسیم کامل سیم‌کشی انبار', timeline: [{ action: 'ثبت حادثه', by: 'سعید موسوی', date: '۱۴۰۳/۰۴/۱۴ ۱۴:۲۰' }, { action: 'اعلام آتش‌نشانی', by: 'سیستم', date: '۱۴۰۳/۰۴/۱۴ ۱۴:۲۱' }, { action: 'ختم آتش', by: 'آتش‌نشانی', date: '۱۴۰۳/۰۴/۱۴ ۱۵:۳۰' }, { action: 'بازرسی نهایی', by: 'حسین کاظمی', date: '۱۴۰۳/۰۴/۱۴ ۱۶:۰۰' }] },
  { id: 'INC-003', date: '۱۴۰۳/۰۴/۱۳', time: '۰۹:۰۰', type: 'medical', severity: 'medium', location: 'بلوک A - ورودی', description: 'سقوط کارگر از ارتفاع', injuredCount: 1, immediateActions: 'انتقال به بیمارستان', reportedBy: 'رضا احمدی', assignedTo: 'واحد HSE', status: 'closed', rootCause: 'عدم استفاده از کمربند ایمنی', timeline: [{ action: 'ثبت حادثه', by: 'رضا احمدی', date: '۱۴۰۳/۰۴/۱۳ ۰۹:۰۵' }, { action: 'انتقال به بیمارستان', by: 'آمبولانس', date: '۱۴۰۳/۰۴/۱۳ ۰۹:۲۰' }, { action: 'بسته شدن پرونده', by: 'احمد کریمی', date: '۱۴۰۳/۰۴/۱۳ ۱۶:۰۰' }] },
  { id: 'INC-004', date: '۱۴۰۳/۰۴/۱۲', time: '۱۶:۴۵', type: 'security', severity: 'medium', location: 'دروازه اضطراری', description: 'ورود غیرمجاز شناسایی شد', injuredCount: 0, immediateActions: 'بازداشت فرد مظنون', reportedBy: 'دوربین ANPR', assignedTo: 'حراست', status: 'closed', rootCause: 'کارت RFID غیرفعال', timeline: [{ action: 'تشخیص', by: 'سیستم ANPR', date: '۱۴۰۳/۰۴/۱۲ ۱۶:۴۵' }, { action: 'بازداشت', by: 'سعید موسوی', date: '۱۴۰۳/۰۴/۱۲ ۱۶:۵۰' }, { action: 'بسته شدن', by: 'حراست', date: '۱۴۰۳/۰۴/۱۲ ۱۷:۳۰' }] },
  { id: 'INC-005', date: '۱۴۰۳/۰۴/۱۱', time: '۰۸:۳۰', type: 'environmental', severity: 'low', location: 'بلوک D - خروجی فاضلاب', description: 'افزایش pH فاضلاب خروجی', injuredCount: 0, immediateActions: 'نمونه‌برداری و ارسال به آزمایشگاه', reportedBy: 'سنسور محیط زیست', assignedTo: 'واحد فنی', status: 'resolved', timeline: [{ action: 'تشخیص', by: 'سیستم', date: '۱۴۰۳/۰۴/۱۱ ۰۸:۳۰' }, { action: 'حل مشکل', by: 'واحد فنی', date: '۱۴۰۳/۰۴/۱۱ ۱۴:۰۰' }] },
  { id: 'INC-006', date: '۱۴۰۳/۰۴/۱۰', time: '۱۱:۲۰', type: 'hse', severity: 'low', location: 'بلوک C - انبار', description: 'ریزش جزئی قفسه انبار', injuredCount: 0, immediateActions: 'پاکسازی محل', reportedBy: 'کارگر انبار', assignedTo: 'واحد فنی', status: 'closed', timeline: [{ action: 'ثبت', by: 'نادر قاسمی', date: '۱۴۰۳/۰۴/۱۰ ۱۱:۲۵' }, { action: 'بسته شدن', by: 'کمال صادقی', date: '۱۴۰۳/۰۴/۱۰ ۱۴:۰۰' }] },
  { id: 'INC-007', date: '۱۴۰۳/۰۴/۰۹', time: '۱۳:۰۰', type: 'theft', severity: 'high', location: 'پارکینگ عمومی', description: 'سرقت لوازم از خودرو پارک‌شده', injuredCount: 0, immediateActions: 'بررسی دوربین‌ها', reportedBy: 'مالک خودرو', assignedTo: 'حراست', status: 'in-progress', timeline: [{ action: 'ثبت شکایت', by: 'مالک', date: '۱۴۰۳/۰۴/۰۹ ۱۳:۰۵' }, { action: 'بررسی دوربین', by: 'حراست', date: '۱۴۰۳/۰۴/۰۹ ۱۳:۳۰' }] },
  { id: 'INC-008', date: '۱۴۰۳/۰۴/۰۸', time: '۰۷:۴۵', type: 'hse', severity: 'medium', location: 'بلوک E - خط تولید', description: 'نشت گاز طبیعی از لوله اتصالی', injuredCount: 0, immediateActions: 'قطع گاز و تهویه', reportedBy: 'سنسور گاز', assignedTo: 'واحد فنی', status: 'closed', timeline: [{ action: 'تشخیص', by: 'سیستم', date: '۱۴۰۳/۰۴/۰۸ ۰۷:۴۵' }, { action: 'تعمیر', by: 'تکنسین', date: '۱۴۰۳/۰۴/۰۸ ۱۰:۰۰' }, { action: 'بسته شدن', by: 'کمال صادقی', date: '۱۴۰۳/۰۴/۰۸ ۱۱:۰۰' }] },
  { id: 'INC-009', date: '۱۴۰۳/۰۴/۰۷', time: '۱۵:۳۰', type: 'medical', severity: 'low', location: 'بلوک A - دفتر', description: '晕厥 یکی از کارکنان', injuredCount: 1, immediateActions: 'اقدامات اولیه پزشکی', reportedBy: 'همکاران', assignedTo: 'واحد HSE', status: 'closed', timeline: [{ action: 'ثبت', by: 'نگار احمدی', date: '۱۴۰۳/۰۴/۰۷ ۱۵:۳۵' }, { action: 'بسته شدن', by: 'احمد کریمی', date: '۱۴۰۳/۰۴/۰۷ ۱۶:۰۰' }] },
  { id: 'INC-010', date: '۱۴۰۳/۰۴/۰۶', time: '۱۰:۰۰', type: 'security', severity: 'low', location: 'بلوک F', description: 'عدم مطابقت کارت ورود با پلاک خودرو', injuredCount: 0, immediateActions: 'احراز هویت مجدد', reportedBy: 'سیستم', assignedTo: 'حراست', status: 'closed', timeline: [{ action: 'تشخیص', by: 'سیستم', date: '۱۴۰۳/۰۴/۰۶ ۱۰:۰۰' }, { action: 'بسته شدن', by: 'حراست', date: '۱۴۰۳/۰۴/۰۶ ۱۰:۳۰' }] },
];

export const WORK_PERMITS: WorkPermit[] = [
  { id: 'WP-001', contractorName: 'شرکت تأسیسات آریا', company: 'آریا تأسیسات', workType: 'تعمیرات تأسیسات مکانیکی', area: 'بلوک B', riskLevel: 'medium', status: 'active', startDate: '۱۴۰۳/۰۳/۰۱', endDate: '۱۴۰۳/۰۶/۰۱', workers: 6, ppeRequired: ['کلاه ایمنی', 'دستکش کار', 'عینک ایمنی'] },
  { id: 'WP-002', contractorName: 'برق‌کاران صنعتی البرز', company: 'البرز الکتریک', workType: 'نصب سیستم روشنایی', area: 'بلوک D', riskLevel: 'high', status: 'active', startDate: '۱۴۰۳/۰۴/۰۵', endDate: '۱۴۰۳/۰۴/۲۵', workers: 3, ppeRequired: ['کلاه ایمنی', 'دستکش عایق', 'عینک ایمنی', 'کمربند ایمنی'] },
  { id: 'WP-003', contractorName: 'ایمن‌سازان پارس', company: 'ایمن پارس', workType: 'بازرسی سیستم اطفاء حریق', area: 'بلوک A', riskLevel: 'low', status: 'active', startDate: '۱۴۰۳/۰۴/۲۰', endDate: '۱۴۰۳/۰۴/۲۲', workers: 2, ppeRequired: ['کلاه ایمنی', 'جلیقه ایمنی'] },
  { id: 'WP-004', contractorName: 'نقاشی صنعتی البرز', company: 'رنگ البرز', workType: 'نقاشی سوله انبار', area: 'بلوک C', riskLevel: 'medium', status: 'active', startDate: '۱۴۰۳/۰۴/۱۰', endDate: '۱۴۰۳/۰۵/۱۰', workers: 4, ppeRequired: ['کلاه ایمنی', 'ماسک', 'دستکش ضد اسید'] },
  { id: 'WP-005', contractorName: 'تجهیزات صنعتی پارس', company: 'پارس تجهیز', workType: 'نصب تجهیزات جدید', area: 'بلوک E', riskLevel: 'high', status: 'pending', startDate: '۱۴۰۳/۰۵/۰۱', endDate: '۱۴۰۳/۰۵/۱۵', workers: 8, ppeRequired: ['کلاه ایمنی', 'دستکش کار', 'عینک ایمنی', 'کمربند ایمنی'] },
  { id: 'WP-006', contractorName: 'ساختمانی نوین سازه', company: 'نوین سازه', workType: 'توسعه سوله انبار جدید', area: 'بلوک F', riskLevel: 'very-high', status: 'expired', startDate: '۱۴۰۲/۱۰/۰۱', endDate: '۱۴۰۳/۰۲/۰۱', workers: 12, ppeRequired: ['تمام تجهیزات ایمنی'] },
  { id: 'WP-007', contractorName: 'تعمیرات دوره‌ای البرز', company: 'البرز سرویس', workType: 'تعمیرات دوره‌ای تجهیزات', area: 'بلوک B', riskLevel: 'medium', status: 'active', startDate: '۱۴۰۳/۰۴/۰۱', endDate: '۱۴۰۳/۰۴/۳۰', workers: 3, ppeRequired: ['کلاه ایمنی', 'دستکش کار'] },
  { id: 'WP-008', contractorName: 'نظافت صنعتی پاک', company: 'پاک صنعت', workType: 'نظافت دوره‌ای سوله‌ها', area: 'بلوک A', riskLevel: 'low', status: 'active', startDate: '۱۴۰۳/۰۱/۰۱', endDate: '۱۴۰۳/۱۲/۲۹', workers: 4, ppeRequired: ['کلاه ایمنی', 'جلیقه ایمنی'] },
  { id: 'WP-009', contractorName: 'سیستم‌های امنیتی پارس', company: 'پارس امنیت', workType: 'نصب دوربین مداربسته', area: 'بلوک D', riskLevel: 'medium', status: 'pending', startDate: '۱۴۰۳/۰۵/۰۱', endDate: '۱۴۰۳/۰۵/۳۰', workers: 2, ppeRequired: ['کلاه ایمنی', 'کمربند ایمنی'] },
  { id: 'WP-010', contractorName: 'لوله‌کشی صنعتی البرز', company: 'البرز لوله', workType: 'تعمیر لوله‌کشی گاز', area: 'بلوک E', riskLevel: 'very-high', status: 'active', startDate: '۱۴۰۳/۰۴/۱۵', endDate: '۱۴۰۳/۰۴/۲۵', workers: 5, ppeRequired: ['تمام تجهیزات ایمنی'] },
];

export const SHIFT_ROSTER: ShiftRosterEntry[] = [
  { id: 'SR-001', name: 'سعید موسوی', post: 'دروازه اصلی', shiftStart: '۰۶:۰۰', shiftEnd: '۱۴:۰۰', hoursWorked: 6.5, breakStatus: 'break', breakStart: '۱۲:۳۰', breakEnd: '۱۳:۰۰' },
  { id: 'SR-002', name: 'امیر کاظمی', post: 'دروازه اضطراری', shiftStart: '۰۶:۰۰', shiftEnd: '۱۴:۰۰', hoursWorked: 7.5, breakStatus: 'on-duty', breakStart: '۱۳:۰۰', breakEnd: '۱۳:۳۰' },
  { id: 'SR-003', name: 'محمود رستمی', post: 'پارکینگ', shiftStart: '۱۴:۰۰', shiftEnd: '۲۲:۰۰', hoursWorked: 0, breakStatus: 'off-duty' },
  { id: 'SR-004', name: 'حسن رضایی', post: 'بازرسی فیزیکی', shiftStart: '۰۶:۰۰', shiftEnd: '۱۴:۰۰', hoursWorked: 8, breakStatus: 'completed' },
];

export const INVENTORY_ITEMS: InventoryItem[] = [
  { id: 'INV-001', sku: 'RM-1001', name: 'پلی‌اتیلن سنگین', category: 'مواد اولیه', unit: 'kg', quantity: 45000, binLocation: 'A-01', minStock: 10000, reorderPoint: 15000, lastMovementDate: '۱۴۰۳/۰۴/۱۵', avgDailyConsumption: 1200 },
  { id: 'INV-002', sku: 'RM-1002', name: 'پلی‌پروپیلن', category: 'مواد اولیه', unit: 'kg', quantity: 22000, binLocation: 'A-02', minStock: 8000, reorderPoint: 12000, lastMovementDate: '۱۴۰۳/۰۴/۱۴', avgDailyConsumption: 800 },
  { id: 'INV-003', sku: 'RM-1003', name: 'رنگ صنعتی مشکی', category: 'مواد شیمیایی', unit: 'kg', quantity: 3500, binLocation: 'B-01', minStock: 1000, reorderPoint: 2000, lastMovementDate: '۱۴۰۳/۰۴/۱۲', avgDailyConsumption: 150 },
  { id: 'INV-004', sku: 'FG-2001', name: 'بطری پلاستیکی ۱ لیتری', category: 'محصول نهایی', unit: 'pcs', quantity: 120000, binLocation: 'C-01', minStock: 30000, reorderPoint: 50000, lastMovementDate: '۱۴۰۳/۰۴/۱۶', avgDailyConsumption: 8000 },
  { id: 'INV-005', sku: 'FG-2002', name: 'ظروف یکبار مصرف', category: 'محصول نهایی', unit: 'pcs', quantity: 85000, binLocation: 'C-02', minStock: 20000, reorderPoint: 40000, lastMovementDate: '۱۴۰۳/۰۴/۱۶', avgDailyConsumption: 6000 },
  { id: 'INV-006', sku: 'CH-3001', name: 'اسید سولفوریک', category: 'مواد شیمیایی', unit: 'litre', quantity: 800, binLocation: 'D-01', minStock: 500, reorderPoint: 1000, lastMovementDate: '۱۴۰۳/۰۴/۱۰', avgDailyConsumption: 50 },
  { id: 'INV-007', sku: 'CH-3002', name: 'هیدروکسید سدیم', category: 'مواد شیمیایی', unit: 'kg', quantity: 1500, binLocation: 'D-02', minStock: 800, reorderPoint: 1500, lastMovementDate: '۱۴۰۳/۰۴/۱۱', avgDailyConsumption: 80 },
  { id: 'INV-008', sku: 'EQ-4001', name: 'قالب تزریق پلاستیک', category: 'تجهیزات', unit: 'pcs', quantity: 12, binLocation: 'E-01', minStock: 5, reorderPoint: 8, lastMovementDate: '۱۴۰۳/۰۴/۰۸', avgDailyConsumption: 0 },
  { id: 'INV-009', sku: 'RM-1004', name: 'گرانول پلاستیکی', category: 'مواد اولیه', unit: 'kg', quantity: 5000, binLocation: 'A-03', minStock: 3000, reorderPoint: 5000, lastMovementDate: '۱۴۰۳/۰۴/۱۳', avgDailyConsumption: 600 },
  { id: 'INV-010', sku: 'FG-2003', name: 'لوله پلی‌اتیلنی', category: 'محصول نهایی', unit: 'm', quantity: 2400, binLocation: 'C-03', minStock: 1000, reorderPoint: 2000, lastMovementDate: '۱۴۰۳/۰۴/۱۵', avgDailyConsumption: 200 },
  { id: 'INV-011', sku: 'SP-5001', name: 'روغن صنعتی', category: 'لوازم یدکی', unit: 'litre', quantity: 200, binLocation: 'F-01', minStock: 100, reorderPoint: 150, lastMovementDate: '۱۴۰۳/۰۴/۰۹', avgDailyConsumption: 10 },
  { id: 'INV-012', sku: 'CH-3003', name: 'تینر صنعتی', category: 'مواد شیمیایی', unit: 'litre', quantity: 350, binLocation: 'D-03', minStock: 200, reorderPoint: 400, lastMovementDate: '۱۴۰۳/۰۴/۱۴', avgDailyConsumption: 25 },
];

export const BIN_LOCATIONS: BinLocation[] = [
  { id: 'BIN-01', row: 'A', column: 1, occupancy: 'full', itemId: 'INV-001', itemName: 'پلی‌اتیلن سنگین', quantity: 45000 },
  { id: 'BIN-02', row: 'A', column: 2, occupancy: 'full', itemId: 'INV-002', itemName: 'پلی‌پروپیلن', quantity: 22000 },
  { id: 'BIN-03', row: 'A', column: 3, occupancy: 'partial', itemId: 'INV-009', itemName: 'گرانول پلاستیکی', quantity: 5000 },
  { id: 'BIN-04', row: 'A', column: 4, occupancy: 'empty' },
  { id: 'BIN-05', row: 'B', column: 1, occupancy: 'partial', itemId: 'INV-003', itemName: 'رنگ صنعتی مشکی', quantity: 3500 },
  { id: 'BIN-06', row: 'B', column: 2, occupancy: 'reserved' },
  { id: 'BIN-07', row: 'B', column: 3, occupancy: 'empty' },
  { id: 'BIN-08', row: 'B', column: 4, occupancy: 'empty' },
  { id: 'BIN-09', row: 'C', column: 1, occupancy: 'full', itemId: 'INV-004', itemName: 'بطری پلاستیکی ۱ لیتری', quantity: 120000 },
  { id: 'BIN-10', row: 'C', column: 2, occupancy: 'full', itemId: 'INV-005', itemName: 'ظروف یکبار مصرف', quantity: 85000 },
  { id: 'BIN-11', row: 'C', column: 3, occupancy: 'partial', itemId: 'INV-010', itemName: 'لوله پلی‌اتیلنی', quantity: 2400 },
  { id: 'BIN-12', row: 'C', column: 4, occupancy: 'empty' },
  { id: 'BIN-13', row: 'D', column: 1, occupancy: 'partial', itemId: 'INV-006', itemName: 'اسید سولفوریک', quantity: 800 },
  { id: 'BIN-14', row: 'D', column: 2, occupancy: 'partial', itemId: 'INV-007', itemName: 'هیدروکسید سدیم', quantity: 1500 },
  { id: 'BIN-15', row: 'D', column: 3, occupancy: 'partial', itemId: 'INV-012', itemName: 'تینر صنعتی', quantity: 350 },
  { id: 'BIN-16', row: 'D', column: 4, occupancy: 'empty' },
  { id: 'BIN-17', row: 'E', column: 1, occupancy: 'partial', itemId: 'INV-008', itemName: 'قالب تزریق پلاستیکی', quantity: 12 },
  { id: 'BIN-18', row: 'E', column: 2, occupancy: 'empty' },
  { id: 'BIN-19', row: 'E', column: 3, occupancy: 'empty' },
  { id: 'BIN-20', row: 'E', column: 4, occupancy: 'empty' },
  { id: 'BIN-21', row: 'F', column: 1, occupancy: 'partial', itemId: 'INV-011', itemName: 'روغن صنعتی', quantity: 200 },
  { id: 'BIN-22', row: 'F', column: 2, occupancy: 'empty' },
  { id: 'BIN-23', row: 'F', column: 3, occupancy: 'empty' },
  { id: 'BIN-24', row: 'F', column: 4, occupancy: 'empty' },
];

export const GOODS_MOVEMENTS: GoodsMovement[] = [
  { id: 'GM-001', date: '۱۴۰۳/۰۴/۱۶ ۰۸:۳۰', reference: 'GR-2024-089', type: 'receipt', itemId: 'INV-001', itemName: 'پلی‌اتیلن سنگین', quantity: 5000, fromLocation: 'دوک ۲', toLocation: 'A-01', user: 'نادر قاسمی', notes: 'تحویل از فولاد البرز' },
  { id: 'GM-002', date: '۱۴۰۳/۰۴/۱۶ ۱۰:۱۵', reference: 'GI-2024-156', type: 'issue', itemId: 'INV-004', itemName: 'بطری پلاستیکی ۱ لیتری', quantity: 5000, fromLocation: 'C-01', toLocation: 'خط تولید', user: 'رضا احمدی' },
  { id: 'GM-003', date: '۱۴۰۳/۰۴/۱۵ ۱۴:۰۰', reference: 'GT-2024-034', type: 'transfer', itemId: 'INV-003', itemName: 'رنگ صنعتی مشکی', quantity: 200, fromLocation: 'D-01', toLocation: 'B-01', user: 'مریم رضایی' },
  { id: 'GM-004', date: '۱۴۰۳/۰۴/۱۵ ۰۹:۰۰', reference: 'GI-2024-155', type: 'issue', itemId: 'INV-002', itemName: 'پلی‌پروپیلن', quantity: 3000, fromLocation: 'A-02', toLocation: 'خط تولید', user: 'رضا احمدی' },
  { id: 'GM-005', date: '۱۴۰۳/۰۴/۱۴ ۱۱:۳۰', reference: 'GA-2024-012', type: 'adjustment', itemId: 'INV-009', itemName: 'گرانول پلاستیکی', quantity: -500, fromLocation: 'A-03', toLocation: '—', user: 'نادر قاسمی', notes: 'اصلاح موجودی پس از شمارش' },
  { id: 'GM-006', date: '۱۴۰۳/۰۴/۱۴ ۰۸:۴۵', reference: 'GR-2024-088', type: 'receipt', itemId: 'INV-006', itemName: 'اسید سولفوریک', quantity: 300, fromLocation: 'دوک ۱', toLocation: 'D-01', user: 'نادر قاسمی' },
  { id: 'GM-007', date: '۱۴۰۳/۰۴/۱۳ ۱۳:۰۰', reference: 'GI-2024-154', type: 'issue', itemId: 'INV-005', itemName: 'ظروف یکبار مصرف', quantity: 10000, fromLocation: 'C-02', toLocation: 'بسته‌بندی', user: 'رضا احمدی' },
  { id: 'GM-008', date: '۱۴۰۳/۰۴/۱۳ ۰۹:۳۰', reference: 'GR-2024-087', type: 'receipt', itemId: 'INV-010', itemName: 'لوله پلی‌اتیلنی', quantity: 600, fromLocation: 'دوک ۳', toLocation: 'C-03', user: 'نادر قاسمی' },
  { id: 'GM-009', date: '۱۴۰۳/۰۴/۱۲ ۱۵:۰۰', reference: 'GI-2024-153', type: 'issue', itemId: 'INV-001', itemName: 'پلی‌اتیلن سنگین', quantity: 2000, fromLocation: 'A-01', toLocation: 'خط تولید', user: 'مریم رضایی' },
  { id: 'GM-010', date: '۱۴۰۳/۰۴/۱۲ ۱۰:۰۰', reference: 'GR-2024-086', type: 'receipt', itemId: 'INV-008', itemName: 'قالب تزریق پلاستیک', quantity: 2, fromLocation: 'دوک ۴', toLocation: 'E-01', user: 'نادر قاسمی' },
];

export const PURCHASE_REQUESTS: PurchaseRequest[] = [
  { id: 'PR-1001', requestedBy: 'مریم رضایی', department: 'عملیات', date: '۱۴۰۳/۰۴/۱۵', items: [{ name: 'پلی‌اتیلن سنگین', qty: 20000, unit: 'kg', estimatedCost: 120000000 }], totalCost: 120000000, status: 'warehouse-review', priority: 'high', approver: 'نادر قاسمی' },
  { id: 'PR-1002', requestedBy: 'رضا احمدی', department: 'لجستیک', date: '۱۴۰۳/۰۴/۱۴', items: [{ name: 'روغن صنعتی', qty: 100, unit: 'litre', estimatedCost: 5000000 }, { name: 'فیلتر روغن', qty: 10, unit: 'pcs', estimatedCost: 2000000 }], totalCost: 7000000, status: 'pending', priority: 'medium' },
  { id: 'PR-1003', requestedBy: 'حسین کاظمی', department: 'ایمنی', date: '۱۴۰۳/۰۴/۱۲', items: [{ name: 'کلاه ایمنی', qty: 50, unit: 'pcs', estimatedCost: 2500000 }, { name: 'دستکش کار', qty: 100, unit: 'pcs', estimatedCost: 1500000 }, { name: 'عینک ایمنی', qty: 30, unit: 'pcs', estimatedCost: 3000000 }], totalCost: 7000000, status: 'finance-approved', priority: 'medium', approver: 'زهرا امینی' },
  { id: 'PR-1004', requestedBy: 'نادر قاسمی', department: 'انبار', date: '۱۴۰۳/۰۴/۱۰', items: [{ name: 'قالب تزریق پلاستیک', qty: 3, unit: 'pcs', estimatedCost: 45000000 }], totalCost: 45000000, status: 'po-created', priority: 'high', approver: 'علیرضا صادقی', poNumber: 'PO-2024-089' },
  { id: 'PR-1005', requestedBy: 'کمال صادقی', department: 'فنی', date: '۱۴۰۳/۰۴/۰۸', items: [{ name: 'تینر صنعتی', qty: 200, unit: 'litre', estimatedCost: 6000000 }], totalCost: 6000000, status: 'received', priority: 'low' },
];

// ── Zone Manager Upgrade Mock Data ─────────────────────────────────────────────

export interface LeaseContractExt extends LeaseContract {
  areaSqM: number; monthlyMaintenanceFee: number; depositAmount: number;
  insuranceExpiry: string; utilityMeterNo: string;
}

export const LEASE_CONTRACTS: LeaseContractExt[] = [
  { id: "LC-001", companyId: "C001", companyName: "شرکت پلاستیک ایران", unit: "بلوک A، واحد ۱۲", area: 2400, areaSqM: 2400, startDate: "۱۴۰۱/۰۱/۰۱", endDate: "۱۴۰۳/۱۲/۳۰", monthlyRent: 42000000, escalationClause: "۱۵٪ سالانه", renewalStatus: "active", contractType: "standard", monthlyMaintenanceFee: 8400000, depositAmount: 84000000, insuranceExpiry: "۱۴۰۴/۰۱/۰۱", utilityMeterNo: "E-1001" },
  { id: "LC-002", companyId: "C002", companyName: "صنایع فولاد البرز", unit: "بلوک B، واحد ۳", area: 5200, areaSqM: 5200, startDate: "۱۴۰۰/۰۷/۰۱", endDate: "۱۴۰۳/۰۶/۳۰", monthlyRent: 68000000, escalationClause: "۱۲٪ سالانه", renewalStatus: "active", contractType: "preferred", monthlyMaintenanceFee: 13600000, depositAmount: 136000000, insuranceExpiry: "۱۴۰۳/۱۰/۱۵", utilityMeterNo: "E-1002" },
  { id: "LC-003", companyId: "C003", companyName: "پتروشیمی پارس", unit: "بلوک C، واحد ۷", area: 1800, areaSqM: 1800, startDate: "۱۴۰۲/۰۱/۰۱", endDate: "۱۴۰۴/۱۲/۳۰", monthlyRent: 35000000, escalationClause: "۱۰٪ سالانه", renewalStatus: "active", contractType: "standard", monthlyMaintenanceFee: 7000000, depositAmount: 70000000, insuranceExpiry: "۱۴۰۴/۰۶/۰۱", utilityMeterNo: "E-1003" },
  { id: "LC-004", companyId: "C004", companyName: "فرآوری غذایی تهران", unit: "بلوک D، واحد ۲", area: 900, areaSqM: 900, startDate: "۱۴۰۲/۰۴/۰۱", endDate: "۱۴۰۳/۰۳/۳۱", monthlyRent: 14000000, escalationClause: "۱۵٪ سالانه", renewalStatus: "pending-renewal", contractType: "temporary", monthlyMaintenanceFee: 2800000, depositAmount: 28000000, insuranceExpiry: "۱۴۰۳/۰۵/۰۱", utilityMeterNo: "E-1004" },
  { id: "LC-005", companyId: "C005", companyName: "ریسندگی اصفهان", unit: "بلوک E، واحد ۱", area: 1500, areaSqM: 1500, startDate: "۱۳۹۹/۰۷/۰۱", endDate: "۱۴۰۲/۰۶/۳۰", monthlyRent: 0, escalationClause: "—", renewalStatus: "expired", contractType: "standard", monthlyMaintenanceFee: 0, depositAmount: 30000000, insuranceExpiry: "۱۴۰۲/۰۹/۰۱", utilityMeterNo: "—" },
  { id: "LC-006", companyId: "C007", companyName: "سرامیک شیراز", unit: "بلوک G، واحد ۹", area: 1200, areaSqM: 1200, startDate: "۱۴۰۱/۰۶/۰۱", endDate: "۱۴۰۴/۰۵/۳۱", monthlyRent: 22000000, escalationClause: "۱۲٪ سالانه", renewalStatus: "active", contractType: "standard", monthlyMaintenanceFee: 4400000, depositAmount: 44000000, insuranceExpiry: "۱۴۰۴/۰۸/۰۱", utilityMeterNo: "E-1006" },
  { id: "LC-007", companyId: "C008", companyName: "قطعات خودرو تبریز", unit: "بلوک H، واحد ۱۱", area: 3600, areaSqM: 3600, startDate: "۱۴۰۰/۰۱/۰۱", endDate: "۱۴۰۵/۱۲/۳۰", monthlyRent: 55000000, escalationClause: "۱۰٪ سالانه", renewalStatus: "active", contractType: "preferred", monthlyMaintenanceFee: 11000000, depositAmount: 110000000, insuranceExpiry: "۱۴۰۵/۰۱/۱۵", utilityMeterNo: "E-1007" },
];

export const TENANT_SCORES = [
  { companyId: "C001", name: "شرکت پلاستیک ایران", payment: 92, compliance: 88, traffic: 95, engagement: 85, total: 90 },
  { companyId: "C002", name: "صنایع فولاد البرز", payment: 96, compliance: 91, traffic: 88, engagement: 90, total: 91 },
  { companyId: "C003", name: "پتروشیمی پارس", payment: 78, compliance: 85, traffic: 82, engagement: 75, total: 80 },
  { companyId: "C004", name: "فرآوری غذایی تهران", payment: 88, compliance: 90, traffic: 75, engagement: 80, total: 83 },
  { companyId: "C007", name: "سرامیک شیراز", payment: 82, compliance: 78, traffic: 79, engagement: 72, total: 78 },
  { companyId: "C008", name: "قطعات خودرو تبریز", payment: 95, compliance: 94, traffic: 92, engagement: 88, total: 92 },
];

export const COMMUNICATION_LOG = [
  { id: "CL-001", date: "۱۴۰۳/۰۴/۱۶", company: "شرکت پلاستیک ایران", type: "ایمیل", subject: "یادآوری پرداخت فاکتور خدمات فروردین", direction: "outbound", status: "sent" },
  { id: "CL-002", date: "۱۴۰۳/۰۴/۱۵", company: "صنایع فولاد البرز", type: "تماس تلفنی", subject: "هماهنگی نشست ماهانه ایمنی", direction: "inbound", status: "completed" },
  { id: "CL-003", date: "۱۴۰۳/۰۴/۱۴", company: "پتروشیمی پارس", type: "پیامک", subject: "درخواست افزایش سقف تردد", direction: "inbound", status: "pending" },
  { id: "CL-004", date: "۱۴۰۳/۰۴/۱۳", company: "فرآوری غذایی تهران", type: "ایمیل", subject: "تمدید قرارداد اجاره", direction: "outbound", status: "sent" },
  { id: "CL-005", date: "۱۴۰۳/۰۴/۱۲", company: "قطعات خودرو تبریز", type: "جلسه حضوری", subject: "بررسی درخواست نصب تابلوی تبلیغاتی", direction: "inbound", status: "completed" },
];

export const ENERGY_PER_COMPANY = [
  { name: "شرکت پلاستیک ایران", kwh: 48200, water: 12500 },
  { name: "صنایع فولاد البرز", kwh: 82400, water: 28000 },
  { name: "پتروشیمی پارس", kwh: 35600, water: 9800 },
  { name: "فرآوری غذایی تهران", kwh: 12800, water: 4200 },
  { name: "سرامیک شیراز", kwh: 22100, water: 7600 },
  { name: "قطعات خودرو تبریز", kwh: 61500, water: 18900 },
];

export const ENERGY_CONSUMPTION_KPI = { totalKwh: 262600, totalWater: 81000, cost: 342000000, trend: -3.2 };

export const SLA_COMPLIANCE = { overall: 94.2, gate: 97.1, weighbridge: 91.8, maintenance: 93.5 };

export const REVENUE_FORECAST = [
  { month: "تیر", actual: 890000000, forecast: null as number | null },
  { month: "مرداد", actual: null as number | null, forecast: 920000000 },
  { month: "شهریور", actual: null as number | null, forecast: 945000000 },
  { month: "مهر", actual: null as number | null, forecast: 960000000 },
];

export const COST_CENTERS = [
  { name: "حقوق و دستمزد", value: 1440000000, color: "#0E7C86" },
  { name: "نگهداری زیرساخت", value: 410000000, color: "#3FA7B3" },
  { name: "امنیت و حراست", value: 298000000, color: "#F2A541" },
  { name: "انرژی", value: 648000000, color: "#0F2A44" },
  { name: "توسعه و عمران", value: 210000000, color: "#94A3B8" },
];

export const AR_AGING = [
  { range: "کمتر از ۳۰ روز", amount: 124000000, count: 12 },
  { range: "۳۱ تا ۶۰ روز", amount: 58000000, count: 5 },
  { range: "۶۱ تا ۹۰ روز", amount: 32000000, count: 3 },
  { range: "بیش از ۹۰ روز", amount: 18000000, count: 2 },
];

export const BANK_RECONCILIATION = [
  { date: "۱۴۰۳/۰۴/۱۶", desc: "پرداخت خدمات شهرک - شرکت پلاستیک", bank: 42000000, book: 42000000, matched: true },
  { date: "۱۴۰۳/۰۴/۱۵", desc: "دریافت جریمه تأخیر - پتروشیمی", bank: 2100000, book: 2100000, matched: true },
  { date: "۱۴۰۳/۰۴/۱۴", desc: "پرداخت پیمانکار تأسیسات", bank: 35000000, book: 35000000, matched: true },
  { date: "۱۴۰۳/۰۴/۱۲", desc: "پرداخت حقوق پرسنل", bank: 120000000, book: 120000000, matched: true },
  { date: "۱۴۰۳/۰۴/۱۰", desc: "قبض برق منطقه‌ای", bank: 54000000, book: 52000000, matched: false },
];

export const FINANCIAL_PROJECTIONS = [
  { quarter: "تیر–شهریور", income: 2655000000, expense: 2250000000, profit: 405000000 },
  { quarter: "مهر–آذر", income: 2880000000, expense: 2380000000, profit: 500000000 },
  { quarter: "دی–اسفند", income: 2700000000, expense: 2320000000, profit: 380000000 },
  { quarter: "فروردین–خرداد", income: 2400000000, expense: 2100000000, profit: 300000000 },
];

export const MAINTENANCE_SCHEDULE = [
  { id: "MS-001", device: "باسکول شماره ۱", type: "روغنکاری و کالیبراسیون", nextDate: "۱۴۰۳/۰۵/۱۵", priority: "medium", status: "scheduled" },
  { id: "MS-002", device: "راه‌بند دروازه اضطراری", type: "تعمیر مکانیکی فوری", nextDate: "۱۴۰۳/۰۴/۲۰", priority: "high", status: "overdue" },
  { id: "MS-003", device: "دوربین دروازه اضطراری", type: "بررسی تصویر و لنز", nextDate: "۱۴۰۳/۰۴/۲۵", priority: "medium", status: "scheduled" },
  { id: "MS-004", device: "ایستگاه پمپاژ آب", type: "بازرسی الکتروموتور", nextDate: "۱۴۰۳/۰۵/۰۱", priority: "low", status: "scheduled" },
  { id: "MS-005", device: "کارتخوان RFID دروازه اضطراری", type: "بازنشانی نرم‌افزاری", nextDate: "۱۴۰۳/۰۴/۱۸", priority: "high", status: "scheduled" },
];

export const DEVICE_HEALTH_SCORES = [
  { id: "D001", name: "دوربین دروازه ۰۱", score: 92, issues: 0 },
  { id: "D002", name: "دوربین دروازه ۰۲", score: 68, issues: 2 },
  { id: "D003", name: "کنتور آب A", score: 88, issues: 0 },
  { id: "D004", name: "کنتور برق B3", score: 71, issues: 1 },
  { id: "D005", name: "اعلام حریق ناحیه C", score: 95, issues: 0 },
  { id: "D006", name: "کنترلر دروازه", score: 97, issues: 0 },
  { id: "D007", name: "سنسور دما E2", score: 35, issues: 3 },
  { id: "D008", name: "سنسور لرزش F1", score: 82, issues: 0 },
];

export const FIRMWARE_UPDATES = [
  { device: "دوربین‌های Hikvision", current: "v4.32.100", latest: "v4.33.200", status: "available", date: "۱۴۰۳/۰۴/۱۰" },
  { device: "باسکول Avery", current: "v2.1.0", latest: "v2.1.0", status: "up-to-date", date: "—" },
  { device: "کارتخوان Zebra", current: "v6.5.1", latest: "v6.6.0", status: "available", date: "۱۴۰۳/۰۴/۰۸" },
  { device: "کنترلر CAME", current: "v3.0.2", latest: "v3.0.2", status: "up-to-date", date: "—" },
  { device: "سنسورهای Grundfos", current: "v1.4.0", latest: "v1.5.1", status: "available", date: "۱۴۰۳/۰۴/۰۵" },
];

export const HSE_COMPLIANCE_CALENDAR = [
  { id: "HC-001", title: "بازرسی آتش‌نشانی", dueDate: "۱۴۰۳/۰۵/۰۱", type: "بازرسی", status: "pending", zone: "کل شهرک" },
  { id: "HC-002", title: "آزمایش آب فاضلاب", dueDate: "۱۴۰۳/۰۴/۲۵", type: "آزمایش", status: "scheduled", zone: "بلوک D" },
  { id: "HC-003", title: "بازرسی ایمنی بالابر", dueDate: "۱۴۰۳/۰۴/۲۸", type: "بازرسی", status: "pending", zone: "بلوک B" },
  { id: "HC-004", title: "تمدید بیمه مسئولیت", dueDate: "۱۴۰۳/۰۶/۰۱", type: "مجوز", status: "scheduled", zone: "کل شهرک" },
  { id: "HC-005", title: "آزمایش گاز خروجی", dueDate: "۱۴۰۳/۰۴/۲۰", type: "آزمایش", status: "overdue", zone: "بلوک E" },
];

export const EMERGENCY_PLANS = [
  { id: "EP-001", name: "آتش‌سوزی", level: "بحرانی", lastDrill: "۱۴۰۳/۰۱/۱۵", nextDrill: "۱۴۰۳/۰۷/۱۵", responsible: "حسین کاظمی", status: "active" },
  { id: "EP-002", name: "نشت مواد شیمیایی", level: "بحرانی", lastDrill: "۱۴۰۳/۰۲/۱۰", nextDrill: "۱۴۰۳/۰۸/۱۰", responsible: "حسین کاظمی", status: "active" },
  { id: "EP-003", name: "زلزله", level: "بحرانی", lastDrill: "۱۴۰۲/۰۹/۲۰", nextDrill: "۱۴۰۳/۰۶/۲۰", responsible: "احمد کریمی", status: "active" },
  { id: "EP-004", name: "سیلاب", level: "زیاد", lastDrill: "۱۴۰۲/۰۸/۰۵", nextDrill: "۱۴۰۳/۰۵/۰۵", responsible: "احمد کریمی", status: "review" },
  { id: "EP-005", name: "قطع برق", level: "متوسط", lastDrill: "۱۴۰۳/۰۳/۰۱", nextDrill: "۱۴۰۳/۰۹/۰۱", responsible: "مریم رضایی", status: "active" },
];

export const CARBON_FOOTPRINT = { monthlyTon: 142.8, targetTon: 120, trend: 5.2, scope1: 89.3, scope2: 53.5 };

export const ANOMALY_DETECTIONS = [
  { id: "AN-001", date: "۱۴۰۳/۰۴/۱۶ ۰۲:۳۰", type: "مصرف غیرعادی برق", location: "بلوک B", severity: "high", value: "۱۲۰٪ بالاتر از حد نرمال" },
  { id: "AN-002", date: "۱۴۰۳/۰۴/۱۵ ۱۴:۰۰", type: "ورود خارج از الگو", location: "دروازه اضطراری", severity: "medium", value: "۵ ورود در ۱۰ دقیقه" },
  { id: "AN-003", date: "۱۴۰۳/۰۴/۱۴ ۰۸:۰۰", type: "افت فشار آب", location: "بلوک A", severity: "low", value: "۱۵٪ افت نسبت به میانگین" },
  { id: "AN-004", date: "۱۴۰۳/۰۴/۱۳ ۲۲:۰۰", type: "فعالیت شبانه غیرعادی", location: "بلوک C", severity: "medium", value: "حرکت تشخیص داده شده" },
];
