import React from "react";
import {
  AlertTriangle, Truck, Zap, CheckCircle2, Eye, Lock, Package, Droplets, AlertCircle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Portal = "guard" | "company" | "zone-manager" | "super-admin" | "weighbridge" | "mobile" | "correspondence" | "workflow" | "verify";
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

// Simplified stylized outline of Iran for the national map (viewBox 0 0 460 420)
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

export interface LiveEvent {
  id: string; category: "security" | "logistics" | "services";
  Icon: React.ElementType; descFa: string; time: string; entity: string;
  severity: "low" | "medium" | "high";
}

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

export type MapLayer = "cameras" | "barriers" | "scales" | "vehicles" | "utilities";
export interface MapDevice { id: string; layer: MapLayer; x: number; y: number; label: string; status: StatusKind; }

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

// ── Super Admin Mock Data ─────────────────────────────────────────────────────

export interface ServiceHealth {
  id: string; nameFa: string; nameEn: string; status: "operational" | "degraded" | "outage";
  latency: string; lastIncidentFa: string;
}

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

// ── Company Portal Mock Data ──────────────────────────────────────────────────

export interface ShipmentDoc { id: string; type: string; name: string; }
export interface HistoryEntry { time: string; text: string; }
export interface Shipment {
  id: string; plate: string; direction: "in" | "out"; cargoType: string;
  submittedBy: string; date: string; status: StatusKind; dock: string;
  weight: number; packages: number; unit: string; docs: ShipmentDoc[]; history: HistoryEntry[];
}

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

// ── Visitors & Contractors Mock Data ──────────────────────────────────────────

export interface Visitor { id: string; name: string; phone: string; host: string; purpose: string; date: string; time: string; status: "scheduled" | "checked-in" | "checked-out" | "cancelled"; }
export const VISITORS: Visitor[] = [
  { id: "V-201", name: "محسن قربانی", phone: "۰۹۱۲۱۲۳۴۵۶۷", host: "علیرضا صادقی", purpose: "بازدید فنی از خط تولید", date: "۱۴۰۳/۰۴/۱۶", time: "۱۰:۳۰", status: "scheduled" },
  { id: "V-198", name: "سارا کاظمی", phone: "۰۹۳۵۷۶۵۴۳۲۱", host: "رضا کریمی", purpose: "جلسه قرارداد تأمین مواد اولیه", date: "۱۴۰۳/۰۴/۱۵", time: "۰۹:۰۰", status: "checked-in" },
  { id: "V-190", name: "حامد رستمی", phone: "۰۹۱۹۸۸۷۷۶۶۵", host: "علیرضا صادقی", purpose: "بازرسی ایمنی سالانه", date: "۱۴۰۳/۰۴/۱۲", time: "۱۳:۰۰", status: "checked-out" },
  { id: "V-185", name: "نگار احمدی", phone: "۰۹۱۰۳۳۲۲۱۱۰", host: "محمد حسینی", purpose: "مصاحبه استخدامی", date: "۱۴۰۳/۰۴/۱۰", time: "۱۱:۰۰", status: "cancelled" },
];

export interface Contractor { id: string; name: string; company: string; workType: string; permitNumber: string; startDate: string; endDate: string; workers: number; status: "active" | "pending" | "expired"; }
export const CONTRACTORS: Contractor[] = [
  { id: "CT-41", name: "شرکت تأسیسات آریا", company: "آریا تأسیسات", workType: "تعمیرات تأسیسات مکانیکی", permitNumber: "CTR-2024-41", startDate: "۱۴۰۳/۰۳/۰۱", endDate: "۱۴۰۳/۰۶/۰۱", workers: 6, status: "active" },
  { id: "CT-38", name: "برق‌کاران صنعتی البرز", company: "البرز الکتریک", workType: "نصب سیستم روشنایی انبار", permitNumber: "CTR-2024-38", startDate: "۱۴۰۳/۰۴/۰۵", endDate: "۱۴۰۳/۰۴/۲۵", workers: 3, status: "active" },
  { id: "CT-45", name: "ایمن‌سازان پارس", company: "ایمن پارس", workType: "بازرسی و تعمیر سیستم اطفاء حریق", permitNumber: "—", startDate: "۱۴۰۳/۰۴/۲۰", endDate: "۱۴۰۳/۰۴/۲۲", workers: 2, status: "pending" },
  { id: "CT-29", name: "ساختمانی نوین سازه", company: "نوین سازه", workType: "توسعه سوله انبار جدید", permitNumber: "CTR-2023-29", startDate: "۱۴۰۲/۱۰/۰۱", endDate: "۱۴۰۳/۰۲/۰۱", workers: 12, status: "expired" },
];

// ── Scheduling (5A) Mock Data ─────────────────────────────────────────────────

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

export interface SlotBooking { occupancy: "empty" | "partial" | "full"; mine: boolean; company?: string; plateSuffix?: string; cargoType?: string; }

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

// ── Device Management Map (5C) Mock Data ──────────────────────────────────────

export type MapLayerExt = MapLayer | "gps" | "rfid";
export interface MapDeviceExt {
  id: string; layer: MapLayerExt; x: number; y: number; label: string; status: StatusKind;
  model: string; installDate: string; lastMaintenance: string; lastPing: string;
}

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

// ── AI Analytics Dashboard (5D) Mock Data ─────────────────────────────────────

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

// ── Zone Finance Module Mock Data ──────────────────────────────────────────────

export interface FinanceTransaction {
  id: string; type: "income" | "expense"; category: string; party: string; partyType: "company" | "contractor" | "other";
  amount: number; date: string; status: "paid" | "pending" | "overdue";
}

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

export interface BudgetLine { category: string; allocated: number; spent: number; }
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

// ── Correspondence (CMS) Mock Data ────────────────────────────────────────────

export const LETTER_TYPES = ["رسمی", "اداری", "درخواست", "اطلاعیه", "حقوقی"];

export const PRIORITY_CFG: Record<string, { fa: string; dot: string; text: string; bg: string }> = {
  urgent: { fa: "فوری", dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50" },
  important: { fa: "مهم", dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
  normal: { fa: "عادی", dot: "bg-slate-400", text: "text-slate-600", bg: "bg-slate-100" },
  info: { fa: "اطلاعاتی", dot: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50" },
};

export const SIGNATURE_CFG: Record<string, { fa: string; text: string; bg: string; emoji: string }> = {
  signed: { fa: "امضاشده", text: "text-emerald-700", bg: "bg-emerald-50", emoji: "✅" },
  pending: { fa: "در انتظار امضا", text: "text-amber-700", bg: "bg-amber-50", emoji: "⏳" },
  rejected: { fa: "رد شده", text: "text-red-700", bg: "bg-red-50", emoji: "❌" },
  unsigned: { fa: "بدون امضا", text: "text-slate-600", bg: "bg-slate-100", emoji: "🔓" },
};

export interface ApprovalStep { name: string; person: string; date?: string; state: "done" | "current" | "pending"; comment?: string; }
export interface ThreadMsg { id: string; author: string; org: string; date: string; type: string; body: string; signature: keyof typeof SIGNATURE_CFG; }
export interface Letter {
  id: string; number: string; subject: string; preview: string;
  senderName: string; senderOrg: string; recipients: string[]; cc: string[];
  date: string; relDate: string; priority: keyof typeof PRIORITY_CFG; type: string;
  status: "inbox" | "inprogress" | "done" | "draft" | "referred" | "archived";
  starred: boolean; unread: boolean; stepCurrent: number; stepTotal: number;
  signatureStatus: keyof typeof SIGNATURE_CFG;
  approvalSteps: ApprovalStep[]; thread: ThreadMsg[];
}

export const LETTERS: Letter[] = [
  {
    id: "L-1", number: "۱۴۰۳/۱۲۴۵", subject: "درخواست تمدید مجوز فعالیت واحد A-12", preview: "با احترام، به استحضار می‌رساند مجوز فعالیت این واحد در تاریخ ۱۴۰۳/۰۶/۳۱ منقضی می‌گردد...",
    senderName: "علیرضا صادقی", senderOrg: "شرکت پلاستیک ایران", recipients: ["مدیریت شهرک کاوه"], cc: ["واحد HSE"],
    date: "۱۴۰۳/۰۴/۱۵", relDate: "امروز", priority: "urgent", type: "درخواست", status: "inbox",
    starred: true, unread: true, stepCurrent: 2, stepTotal: 4, signatureStatus: "pending",
    approvalSteps: [
      { name: "ثبت اولیه", person: "علیرضا صادقی", date: "۱۴۰۳/۰۴/۱۵", state: "done" },
      { name: "بررسی کارشناس", person: "مریم رضایی", date: "۱۴۰۳/۰۴/۱۵", state: "current", comment: "در حال بررسی مدارک پیوست" },
      { name: "تأیید مدیر شهرک", person: "احمد کریمی", state: "pending" },
      { name: "صدور مجوز", person: "دبیرخانه", state: "pending" },
    ],
    thread: [
      { id: "t1", author: "علیرضا صادقی", org: "پلاستیک ایران", date: "۱۴۰۳/۰۴/۱۵ ۰۹:۱۰", type: "نامه اصلی", body: "درخواست تمدید مجوز فعالیت واحد A-12 به پیوست ارسال می‌گردد.", signature: "signed" },
      { id: "t2", author: "مریم رضایی", org: "مدیریت شهرک", date: "۱۴۰۳/۰۴/۱۵ ۱۴:۲۰", type: "ارجاع", body: "جهت بررسی کارشناسی به واحد فنی ارجاع داده شد.", signature: "unsigned" },
    ],
  },
  {
    id: "L-2", number: "۱۴۰۳/۱۲۳۹", subject: "اطلاعیه قطعی برنامه‌ریزی‌شده برق بلوک B", preview: "به اطلاع کلیه واحدهای محترم بلوک B می‌رساند به دلیل تعمیرات...",
    senderName: "واحد تأسیسات", senderOrg: "مدیریت شهرک کاوه", recipients: ["کلیه واحدهای بلوک B"], cc: [],
    date: "۱۴۰۳/۰۴/۱۴", relDate: "دیروز", priority: "important", type: "اطلاعیه", status: "inprogress",
    starred: false, unread: true, stepCurrent: 1, stepTotal: 2, signatureStatus: "signed",
    approvalSteps: [
      { name: "صدور اطلاعیه", person: "واحد تأسیسات", date: "۱۴۰۳/۰۴/۱۴", state: "done" },
      { name: "ابلاغ به واحدها", person: "دبیرخانه", state: "current" },
    ],
    thread: [{ id: "t1", author: "واحد تأسیسات", org: "مدیریت شهرک", date: "۱۴۰۳/۰۴/۱۴ ۱۰:۰۰", type: "نامه اصلی", body: "قطعی برق بلوک B در تاریخ ۱۴۰۳/۰۴/۱۸ از ساعت ۹ الی ۱۳.", signature: "signed" }],
  },
  {
    id: "L-3", number: "۱۴۰۳/۱۲۳۰", subject: "تأیید نهایی صورتحساب خدمات خرداد ماه", preview: "پیرو مکاتبات قبلی، صورتحساب خدمات ماهانه مورد تأیید نهایی قرار گرفت...",
    senderName: "واحد مالی", senderOrg: "مدیریت شهرک کاوه", recipients: ["صنایع فولاد البرز"], cc: ["واحد حسابداری"],
    date: "۱۴۰۳/۰۴/۱۰", relDate: "۵ روز پیش", priority: "normal", type: "اداری", status: "done",
    starred: false, unread: false, stepCurrent: 4, stepTotal: 4, signatureStatus: "signed",
    approvalSteps: [
      { name: "ثبت اولیه", person: "واحد مالی", date: "۱۴۰۳/۰۴/۰۸", state: "done" },
      { name: "بررسی حسابداری", person: "حسین کاظمی", date: "۱۴۰۳/۰۴/۰۹", state: "done" },
      { name: "تأیید مدیر مالی", person: "زهرا امینی", date: "۱۴۰۳/۰۴/۱۰", state: "done" },
      { name: "بایگانی", person: "دبیرخانه", date: "۱۴۰۳/۰۴/۱۰", state: "done" },
    ],
    thread: [{ id: "t1", author: "واحد مالی", org: "مدیریت شهرک", date: "۱۴۰۳/۰۴/۰۸ ۱۱:۰۰", type: "نامه اصلی", body: "صورتحساب خدمات خرداد ماه جهت تأیید ارسال می‌گردد.", signature: "signed" }],
  },
  {
    id: "L-4", number: "۱۴۰۳/۱۲۴۸", subject: "پیش‌نویس نامه به سازمان صنایع کوچک", preview: "در حال تکمیل — گزارش عملکرد سه‌ماهه شهرک صنعتی...",
    senderName: "احمد کریمی", senderOrg: "مدیریت شهرک کاوه", recipients: ["سازمان صنایع کوچک"], cc: [],
    date: "۱۴۰۳/۰۴/۱۶", relDate: "امروز", priority: "normal", type: "رسمی", status: "draft",
    starred: false, unread: false, stepCurrent: 0, stepTotal: 3, signatureStatus: "unsigned",
    approvalSteps: [{ name: "پیش‌نویس", person: "احمد کریمی", date: "۱۴۰۳/۰۴/۱۶", state: "current" }],
    thread: [],
  },
  {
    id: "L-5", number: "۱۴۰۳/۱۲۳۶", subject: "ارجاع بررسی گزارش حادثه انبار مواد شیمیایی", preview: "با توجه به گزارش ثبت‌شده در سامانه حراست، موضوع جهت بررسی...",
    senderName: "واحد HSE", senderOrg: "مدیریت شهرک کاوه", recipients: ["واحد ایمنی پتروشیمی پارس"], cc: ["حراست"],
    date: "۱۴۰۳/۰۴/۱۲", relDate: "۳ روز پیش", priority: "urgent", type: "حقوقی", status: "referred",
    starred: true, unread: false, stepCurrent: 2, stepTotal: 3, signatureStatus: "rejected",
    approvalSteps: [
      { name: "ثبت گزارش", person: "واحد HSE", date: "۱۴۰۳/۰۴/۱۲", state: "done" },
      { name: "ارجاع به شرکت", person: "واحد HSE", date: "۱۴۰۳/۰۴/۱۲", state: "done" },
      { name: "پاسخ شرکت", person: "پتروشیمی پارس", state: "current", comment: "مستندات ناقص — نیاز به تکمیل" },
    ],
    thread: [
      { id: "t1", author: "واحد HSE", org: "مدیریت شهرک", date: "۱۴۰۳/۰۴/۱۲ ۰۸:۳۰", type: "نامه اصلی", body: "گزارش حادثه انبار مواد شیمیایی جهت بررسی و اقدام ارسال می‌شود.", signature: "signed" },
      { id: "t2", author: "پتروشیمی پارس", org: "واحد ایمنی", date: "۱۴۰۳/۰۴/۱۳ ۱۶:۴۵", type: "پاسخ", body: "مستندات درخواستی در دست تهیه است و ظرف ۴۸ ساعت ارسال می‌شود.", signature: "rejected" },
    ],
  },
  {
    id: "L-6", number: "۱۴۰۳/۱۱۹۸", subject: "بایگانی صورت‌جلسه شورای مدیران شهرک", preview: "صورت‌جلسه شورای مدیران مورخ خرداد ماه جهت بایگانی ارسال می‌گردد...",
    senderName: "دبیرخانه", senderOrg: "مدیریت شهرک کاوه", recipients: ["بایگانی مرکزی"], cc: [],
    date: "۱۴۰۳/۰۳/۲۸", relDate: "۲ هفته پیش", priority: "info", type: "اداری", status: "archived",
    starred: false, unread: false, stepCurrent: 2, stepTotal: 2, signatureStatus: "signed",
    approvalSteps: [
      { name: "تنظیم صورت‌جلسه", person: "دبیرخانه", date: "۱۴۰۳/۰۳/۲۷", state: "done" },
      { name: "بایگانی نهایی", person: "دبیرخانه", date: "۱۴۰۳/۰۳/۲۸", state: "done" },
    ],
    thread: [],
  },
  {
    id: "L-7", number: "۱۴۰۳/۱۲۴۲", subject: "درخواست نصب تابلوی تبلیغاتی جدید", preview: "احتراماً درخواست می‌گردد نسبت به صدور مجوز نصب تابلو در محوطه...",
    senderName: "فرید نجفی", senderOrg: "پتروشیمی پارس", recipients: ["مدیریت شهرک کاوه"], cc: [],
    date: "۱۴۰۳/۰۴/۱۳", relDate: "۲ روز پیش", priority: "normal", type: "درخواست", status: "inbox",
    starred: false, unread: true, stepCurrent: 1, stepTotal: 3, signatureStatus: "unsigned",
    approvalSteps: [
      { name: "ثبت درخواست", person: "فرید نجفی", date: "۱۴۰۳/۰۴/۱۳", state: "done" },
      { name: "بررسی شهرسازی", person: "واحد فنی", state: "current" },
      { name: "تأیید نهایی", person: "احمد کریمی", state: "pending" },
    ],
    thread: [{ id: "t1", author: "فرید نجفی", org: "پتروشیمی پارس", date: "۱۴۰۳/۰۴/۱۳ ۱۰:۱۵", type: "نامه اصلی", body: "درخواست نصب تابلوی تبلیغاتی در ورودی واحد به پیوست ارسال می‌گردد.", signature: "unsigned" }],
  },
];

// ── Org Chart (WF-1) Mock Data ────────────────────────────────────────────────

export interface OrgNode { id: string; kind: "role" | "unit"; x: number; y: number; title: string; person?: string; status?: "active" | "vacant" | "deputy"; headcount?: number; }
export interface OrgEdge { from: string; to: string; kind: "solid" | "dashed"; label?: string; }

export const ORG_NODES: OrgNode[] = [
  { id: "n1", kind: "role", x: 380, y: 30, title: "مدیر شهرک", person: "احمد کریمی", status: "active" },
  { id: "n2", kind: "unit", x: 100, y: 190, title: "واحد لجستیک و انبار", headcount: 8 },
  { id: "n3", kind: "role", x: 380, y: 170, title: "مدیر لجستیک", person: "رضایی محمد", status: "active" },
  { id: "n4", kind: "role", x: 620, y: 170, title: "مدیر HSE", person: "—", status: "vacant" },
  { id: "n5", kind: "role", x: 380, y: 310, title: "سرپرست انبار", person: "علی نجفی", status: "deputy" },
];
export const ORG_EDGES: OrgEdge[] = [
  { from: "n1", to: "n3", kind: "solid", label: "گزارش مستقیم" },
  { from: "n1", to: "n4", kind: "solid", label: "گزارش مستقیم" },
  { from: "n3", to: "n5", kind: "solid" },
  { from: "n3", to: "n2", kind: "dashed", label: "همکاری" },
];
export const ORG_NODE_LIB = [
  { kind: "role", label: "پست سازمانی", emoji: "👤" },
  { kind: "unit", label: "واحد / دپارتمان", emoji: "🏢" },
  { kind: "group", label: "گروه", emoji: "👥" },
  { kind: "external", label: "ارتباط خارجی", emoji: "🔗" },
];
export const ORG_TEMPLATES = ["ساختار خطی", "ماتریسی", "تخت", "سلسله‌مراتبی"];

// ── Workflow Designer (WF-2 / WF-3) Mock Data ─────────────────────────────────

export type WFNodeKind = "start" | "end-success" | "end-rejected" | "human" | "approval" | "review" | "automated" | "xor" | "and" | "timer" | "notification" | "api" | "docgen";
export interface WFNode { id: string; kind: WFNodeKind; x: number; y: number; title: string; person?: string; sla?: string; signatureRequired?: boolean; }
export interface WFEdge { from: string; to: string; label?: string; kind?: "default" | "yes" | "no"; }

export const WF_NODES: WFNode[] = [
  { id: "s1", kind: "start", x: 30, y: 190, title: "دریافت بارنامه" },
  { id: "h1", kind: "human", x: 150, y: 150, title: "بررسی اولیه لجستیک", person: "مسئول لجستیک", sla: "۴ ساعت" },
  { id: "g1", kind: "xor", x: 400, y: 170, title: "بار خطرناک؟" },
  { id: "a1", kind: "approval", x: 550, y: 40, title: "تأیید مدیر HSE", person: "مدیر HSE", sla: "۲۴ ساعت", signatureRequired: true },
  { id: "auto1", kind: "automated", x: 550, y: 300, title: "ارسال نوتیفیکیشن به حراست" },
  { id: "and1", kind: "and", x: 760, y: 170, title: "همه تأییدها" },
  { id: "e1", kind: "end-success", x: 900, y: 110, title: "پایان موفق" },
  { id: "e2", kind: "end-rejected", x: 900, y: 260, title: "پایان رد" },
];
export const WF_EDGES: WFEdge[] = [
  { from: "s1", to: "h1" },
  { from: "h1", to: "g1" },
  { from: "g1", to: "a1", label: "بله", kind: "yes" },
  { from: "g1", to: "auto1", label: "خیر", kind: "no" },
  { from: "a1", to: "and1", label: "تأیید شد", kind: "yes" },
  { from: "auto1", to: "and1" },
  { from: "and1", to: "e1" },
  { from: "a1", to: "e2", label: "رد شد", kind: "no" },
];

export const WF_NODE_LIB = [
  { cat: "🟢 شروع و پایان", items: [{ kind: "start", label: "شروع", emoji: "⬤" }, { kind: "end-success", label: "پایان موفق", emoji: "⬤" }, { kind: "end-rejected", label: "پایان رد", emoji: "⬤" }] },
  { cat: "🔵 وظایف", items: [{ kind: "human", label: "وظیفه انسانی", emoji: "👤" }, { kind: "approval", label: "تأیید / رد", emoji: "✅" }, { kind: "review", label: "بررسی (بدون تغییر)", emoji: "👁" }, { kind: "automated", label: "عملیات خودکار", emoji: "⚙️" }] },
  { cat: "🔷 دروازه‌ها", items: [{ kind: "xor", label: "تصمیم (یکی از چند)", emoji: "◇" }, { kind: "and", label: "همه با هم", emoji: "◈" }, { kind: "timer", label: "تایمر / تأخیر", emoji: "⏱" }] },
  { cat: "⚡ رویدادها", items: [{ kind: "notification", label: "ارسال اعلان", emoji: "🔔" }, { kind: "api", label: "فراخوانی سرویس", emoji: "🔗" }, { kind: "docgen", label: "صدور سند", emoji: "📄" }] },
];

export const SIM_TIMELINE = [
  { stage: "مسئول لجستیک", time: "۲ ساعت", sla: "۴ ساعت", ok: true },
  { stage: "مدیر HSE", time: "escalated پس از ۴۸ ساعت", sla: "۲۴ ساعت", ok: false },
  { stage: "تأیید نهایی", time: "۱ ساعت", sla: "—", ok: true },
];

// ── Workflow Library (WF-4) Mock Data ─────────────────────────────────────────

export interface WFCard { id: string; title: string; category: "logistics" | "permits" | "letters"; desc: string; activeInstances: number; avgTime: string; successRate: number; version: number; lastEdit: string; isSystemDefault: boolean; }
export const WF_CATEGORY_CFG: Record<string, { fa: string; color: string }> = {
  logistics: { fa: "لجستیک", color: "#0F2A44" },
  permits: { fa: "مجوزها", color: "#0E7C86" },
  letters: { fa: "مکاتبات", color: "#F2A541" },
};
export const WORKFLOW_LIBRARY: WFCard[] = [
  { id: "wf1", title: "تأیید بارنامه خطرناک", category: "logistics", desc: "برای بارهای با کد UN، نیازمند تأیید HSE و مدیر ارشد است.", activeInstances: 124, avgTime: "۱۸ ساعت", successRate: 94, version: 5, lastEdit: "۳ روز پیش", isSystemDefault: false },
  { id: "wf2", title: "تأیید بارنامه ساده", category: "logistics", desc: "مسیر استاندارد برای بارهای عادی بدون نیاز به تأیید HSE.", activeInstances: 312, avgTime: "۶ ساعت", successRate: 98, version: 3, lastEdit: "۱ هفته پیش", isSystemDefault: true },
  { id: "wf3", title: "مسیر مجوز ساختی", category: "permits", desc: "فرآیند صدور مجوز ساخت‌وساز و تغییرات کالبدی واحدها.", activeInstances: 19, avgTime: "۴ روز", successRate: 87, version: 2, lastEdit: "۲ هفته پیش", isSystemDefault: false },
  { id: "wf4", title: "مکاتبه رسمی خروجی", category: "letters", desc: "مسیر تأیید و امضای نامه‌های رسمی خروجی به سازمان‌ها.", activeInstances: 41, avgTime: "۱۲ ساعت", successRate: 91, version: 7, lastEdit: "دیروز", isSystemDefault: true },
  { id: "wf5", title: "خدمات اضطراری", category: "logistics", desc: "مسیر تسریع‌شده برای درخواست‌های خدمات فوری زیرساختی.", activeInstances: 6, avgTime: "۲ ساعت", successRate: 99, version: 1, lastEdit: "۱ ماه پیش", isSystemDefault: false },
  { id: "wf6", title: "تمدید مجوز فعالیت", category: "permits", desc: "مسیر تمدید سالانه مجوز فعالیت شرکت‌ها در شهرک.", activeInstances: 53, avgTime: "۲ روز", successRate: 90, version: 4, lastEdit: "۵ روز پیش", isSystemDefault: false },
];
export const WF_ASSIGNMENTS = [
  { entity: "بارنامه ورودی عادی", workflow: "تأیید بارنامه ساده" },
  { entity: "بارنامه ورودی خطرناک", workflow: "تأیید بارنامه خطرناک" },
  { entity: "مجوز ساخت", workflow: "مسیر مجوز ساختی" },
  { entity: "نامه رسمی به شهرک", workflow: "مکاتبه رسمی خروجی" },
  { entity: "درخواست خدمات فوری", workflow: "خدمات اضطراری" },
];

// ── Active Instance Monitor (WF-5) Mock Data ──────────────────────────────────

export interface WFInstance { id: string; workflowType: string; company: string; currentStage: string; assignee: string; started: string; slaPct: number; status: "onTime" | "atRisk" | "overdue"; }
export const WF_INSTANCES: WFInstance[] = [
  { id: "WFI-3401", workflowType: "تأیید بارنامه خطرناک", company: "پتروشیمی پارس", currentStage: "تأیید مدیر HSE", assignee: "مدیر HSE", started: "امروز ۰۸:۱۰", slaPct: 72, status: "onTime" },
  { id: "WFI-3388", workflowType: "مسیر مجوز ساختی", company: "فولاد البرز", currentStage: "بررسی شهرسازی", assignee: "واحد فنی", started: "دیروز", slaPct: 35, status: "atRisk" },
  { id: "WFI-3355", workflowType: "تأیید بارنامه خطرناک", company: "شرکت پلاستیک ایران", currentStage: "تأیید مدیر ارشد", assignee: "احمد کریمی", started: "۳ روز پیش", slaPct: 8, status: "overdue" },
  { id: "WFI-3402", workflowType: "مکاتبه رسمی خروجی", company: "مدیریت شهرک", currentStage: "امضای نهایی", assignee: "دبیرخانه", started: "امروز ۱۰:۲۰", slaPct: 88, status: "onTime" },
  { id: "WFI-3390", workflowType: "تمدید مجوز فعالیت", company: "غذایی تهران", currentStage: "بررسی مالی", assignee: "واحد مالی", started: "۲ روز پیش", slaPct: 44, status: "atRisk" },
];
export const WF_BOTTLENECKS = [
  { stage: "تأیید مدیر HSE", avgDelay: 14 }, { stage: "بررسی شهرسازی", avgDelay: 9 },
  { stage: "تأیید مدیر ارشد", avgDelay: 22 }, { stage: "امضای نهایی", avgDelay: 3 }, { stage: "بررسی مالی", avgDelay: 6 },
];

// ── Digital Signature Module (SIG-1..5) Mock Data ─────────────────────────────

export interface Certificate {
  id: string; holder: string; title: string; company: string;
  tokenType: "soft" | "hard" | "smartcard"; issueDate: string; expiryDate: string;
  status: "active" | "expiring" | "expired" | "revoked"; serial: string;
}

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

// =============================================================================
// APPEND THESE BLOCKS TO THE END OF Data.ts
// Covers: Bascule/Weighbridge, Users & Roles, Workflow additions
// No new icon imports are required for this file.
// =============================================================================

// ── Bascule / Weighbridge Module Mock Data ────────────────────────────────────

export interface WeighbridgeStation {
  id: string; nameFa: string; locationFa: string; status: StatusKind;
  lastCalibration: string; nextCalibration: string; model: string; capacity: number; precision: number; zoneName: string;
}

export const WEIGHBRIDGE_STATIONS: WeighbridgeStation[] = [
  { id: "WB1", nameFa: "باسکول شماره ۱", locationFa: "دروازه اصلی", status: "online", lastCalibration: "۱۴۰۲/۱۲/۱۰", nextCalibration: "۱۴۰۳/۰۶/۱۰", model: "Avery Weigh-Tronix", capacity: 60000, precision: 10, zoneName: "منطقه مرکزی" },
  { id: "WB2", nameFa: "باسکول شماره ۲", locationFa: "دروازه اضطراری", status: "offline", lastCalibration: "۱۴۰۲/۰۹/۰۵", nextCalibration: "۱۴۰۳/۰۳/۰۵", model: "Mettler Toledo", capacity: 50000, precision: 20, zoneName: "منطقه غربی" },
  { id: "WB3", nameFa: "باسکول شماره ۳ (سیار)", locationFa: "بلوک D", status: "warning", lastCalibration: "۱۴۰۲/۰۷/۲۲", nextCalibration: "۱۴۰۳/۰۱/۲۲", model: "Avery Weigh-Tronix", capacity: 30000, precision: 10, zoneName: "بلوک D" },
];

export interface WeighbridgeSession {
  id: string; plate: string; direction: "in" | "out"; linkedShipmentId?: string;
  driverName: string; companyName: string; cargoType: string;
  tareWeight: number; grossWeight: number; netWeight: number; declaredWeight: number;
  dock: string; stationId: string; operatorName: string; timestamp: string;
  status: "weighing" | "completed" | "discrepancy" | "cancelled";
  discrepancyPct: number;
}

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

// Discrepancy tolerance used to flag a session (net weight vs declared weight)
export const WEIGHBRIDGE_DISCREPANCY_THRESHOLD_PCT = 5;

// ── Users & Roles Module Mock Data ────────────────────────────────────────────

export type UserRole =
  | "super-admin" | "zone-manager" | "company-admin" | "company-staff"
  | "guard" | "hse-officer" | "finance-officer" | "weighbridge-operator" | "driver";

export interface Role {
  id: UserRole; labelFa: string; labelEn: string; descFa: string; portalAccess: Portal[];
}

export const ROLES: Role[] = [
  { id: "super-admin", labelFa: "سوپر ادمین", labelEn: "Super Admin", descFa: "دسترسی کامل به تمام شهرک‌ها و تنظیمات ملی", portalAccess: ["super-admin", "workflow", "correspondence"] },
  { id: "zone-manager", labelFa: "مدیر شهرک", labelEn: "Zone Manager", descFa: "مدیریت کامل یک شهرک صنعتی", portalAccess: ["zone-manager", "workflow", "correspondence"] },
  { id: "company-admin", labelFa: "مدیر شرکت", labelEn: "Company Admin", descFa: "مدیریت پرتال شرکت و کاربران آن", portalAccess: ["company"] },
  { id: "company-staff", labelFa: "کارمند شرکت", labelEn: "Company Staff", descFa: "دسترسی محدود به بارنامه‌ها و درخواست‌ها", portalAccess: ["company"] },
  { id: "guard", labelFa: "افسر حراست", labelEn: "Guard", descFa: "کنترل تردد و ورود/خروج در دروازه", portalAccess: ["guard"] },
  { id: "hse-officer", labelFa: "کارشناس HSE", labelEn: "HSE Officer", descFa: "بررسی و تأیید ایمنی بارهای خطرناک", portalAccess: ["correspondence", "workflow"] },
  { id: "finance-officer", labelFa: "کارشناس مالی", labelEn: "Finance Officer", descFa: "دسترسی به بخش امور مالی شهرک", portalAccess: ["zone-manager"] },
  { id: "weighbridge-operator", labelFa: "اپراتور باسکول", labelEn: "Weighbridge Operator", descFa: "ثبت وزن ورودی و خروجی کامیون‌ها", portalAccess: ["weighbridge"] },
  { id: "driver", labelFa: "راننده", labelEn: "Driver", descFa: "دسترسی اپلیکیشن موبایل راننده", portalAccess: ["mobile"] },
];

export interface AppUser {
  id: string; name: string; email: string; phone: string; role: UserRole;
  company?: string; zone?: string; status: StatusKind; lastLogin: string; createdAt: string;
  avatarInitial: string; twoFactorEnabled: boolean;
}

export const USERS: AppUser[] = [
  { id: "U001", name: "احمد کریمی", email: "a.karimi@kaveh-idop.ir", phone: "۰۹۱۲۱۱۱۲۲۳۳", role: "zone-manager", zone: "شهرک صنعتی کاوه", status: "active", lastLogin: "امروز ۰۸:۴۰", createdAt: "۱۴۰۱/۰۲/۱۰", avatarInitial: "ا", twoFactorEnabled: true },
  { id: "U002", name: "محمد تهرانی", email: "m.tehrani@idop.ir", phone: "۰۹۱۲۲۲۲۳۳۴۴", role: "super-admin", status: "active", lastLogin: "امروز ۰۹:۱۰", createdAt: "۱۴۰۰/۰۵/۰۱", avatarInitial: "م", twoFactorEnabled: true },
  { id: "U003", name: "علیرضا صادقی", email: "a.sadeghi@iranplastic.co", phone: "۰۹۱۳۳۳۳۴۴۵۵", role: "company-admin", company: "شرکت پلاستیک ایران", status: "active", lastLogin: "دیروز ۱۶:۲۰", createdAt: "۱۴۰۱/۰۶/۱۵", avatarInitial: "ع", twoFactorEnabled: false },
  { id: "U004", name: "مریم رضایی", email: "m.rezaei@kaveh-idop.ir", phone: "۰۹۱۴۴۴۴۵۵۶۶", role: "zone-manager", zone: "شهرک صنعتی کاوه", status: "active", lastLogin: "امروز ۰۷:۵۵", createdAt: "۱۴۰۱/۰۸/۲۰", avatarInitial: "م", twoFactorEnabled: true },
  { id: "U005", name: "حسین کاظمی", email: "h.kazemi@kaveh-idop.ir", phone: "۰۹۱۵۵۵۵۶۶۷۷", role: "hse-officer", zone: "شهرک صنعتی کاوه", status: "active", lastLogin: "۲ روز پیش", createdAt: "۱۴۰۲/۰۱/۱۰", avatarInitial: "ح", twoFactorEnabled: true },
  { id: "U006", name: "زهرا امینی", email: "z.amini@kaveh-idop.ir", phone: "۰۹۱۶۶۶۶۷۷۸۸", role: "finance-officer", zone: "شهرک صنعتی کاوه", status: "active", lastLogin: "امروز ۱۰:۰۵", createdAt: "۱۴۰۲/۰۲/۰۵", avatarInitial: "ز", twoFactorEnabled: false },
  { id: "U007", name: "رضا احمدی", email: "r.ahmadi@kaveh-idop.ir", phone: "۰۹۱۷۷۷۷۸۸۹۹", role: "weighbridge-operator", zone: "شهرک صنعتی کاوه", status: "active", lastLogin: "امروز ۰۶:۳۰", createdAt: "۱۴۰۲/۰۴/۱۲", avatarInitial: "ر", twoFactorEnabled: false },
  { id: "U008", name: "سعید موسوی", email: "s.mousavi@kaveh-idop.ir", phone: "۰۹۱۸۸۸۸۹۹۰۰", role: "guard", zone: "شهرک صنعتی کاوه", status: "active", lastLogin: "امروز ۰۶:۰۰", createdAt: "۱۴۰۲/۰۵/۰۱", avatarInitial: "س", twoFactorEnabled: false },
  { id: "U009", name: "رضایی محمد", email: "r.mohammad@kaveh-idop.ir", phone: "۰۹۱۹۹۹۹۰۰۱۱", role: "zone-manager", zone: "شهرک صنعتی کاوه", status: "active", lastLogin: "دیروز ۱۸:۱۰", createdAt: "۱۴۰۱/۱۱/۰۱", avatarInitial: "ر", twoFactorEnabled: true },
  { id: "U010", name: "علی نجفی", email: "a.najafi@kaveh-idop.ir", phone: "۰۹۱۲۰۰۰۱۱۲۲", role: "company-staff", company: "صنایع فولاد البرز", status: "active", lastLogin: "۳ روز پیش", createdAt: "۱۴۰۲/۰۳/۱۸", avatarInitial: "ع", twoFactorEnabled: false },
  { id: "U011", name: "فرید نجفی", email: "f.najafi@parspetro.co", phone: "۰۹۱۳۱۲۳۴۵۶۷", role: "company-admin", company: "پتروشیمی پارس", status: "suspended", lastLogin: "۲ هفته پیش", createdAt: "۱۴۰۱/۰۹/۰۹", avatarInitial: "ف", twoFactorEnabled: false },
  { id: "U012", name: "علی محمدی", email: "a.mohammadi@driver.idop.ir", phone: "۰۹۱۲۳۴۵۶۷۸۹", role: "driver", company: "شرکت پلاستیک ایران", status: "active", lastLogin: "امروز ۰۸:۰۰", createdAt: "۱۴۰۲/۰۷/۰۱", avatarInitial: "ع", twoFactorEnabled: false },
  { id: "U013", name: "سارا نوری", email: "s.nouri@kaveh-idop.ir", phone: "۰۹۱۲۹۸۷۶۵۴۳", role: "weighbridge-operator", zone: "شهرک صنعتی کاوه", status: "inactive", lastLogin: "۱ ماه پیش", createdAt: "۱۴۰۲/۰۶/۲۰", avatarInitial: "س", twoFactorEnabled: false },
  { id: "U014", name: "بهنام کریمیان", email: "b.karimian@idop.ir", phone: "۰۹۱۲۴۵۶۷۸۹۰", role: "super-admin", status: "active", lastLogin: "۵ روز پیش", createdAt: "۱۴۰۰/۰۸/۱۵", avatarInitial: "ب", twoFactorEnabled: true },
  { id: "U015", name: "نگار احمدی", email: "n.ahmadi@steel-alborz.co", phone: "۰۹۱۰۳۳۲۲۱۱۰", role: "company-staff", company: "صنایع فولاد البرز", status: "active", lastLogin: "امروز ۱۱:۲۰", createdAt: "۱۴۰۲/۱۰/۰۱", avatarInitial: "ن", twoFactorEnabled: false },
];

export const PERMISSION_MODULES = [
  "مکاتبات اداری", "بارنامه‌ها", "مجوزها", "امور مالی", "دستگاه‌های IoT",
  "طراح Workflow", "گزارش‌ها", "مدیریت کاربران", "تنظیمات کلی",
];

export interface RolePermissionMatrix { role: UserRole; permissions: Record<string, boolean>; }

export const ROLE_PERMISSIONS: RolePermissionMatrix[] = [
  { role: "super-admin", permissions: { "مکاتبات اداری": true, "بارنامه‌ها": true, "مجوزها": true, "امور مالی": true, "دستگاه‌های IoT": true, "طراح Workflow": true, "گزارش‌ها": true, "مدیریت کاربران": true, "تنظیمات کلی": true } },
  { role: "zone-manager", permissions: { "مکاتبات اداری": true, "بارنامه‌ها": true, "مجوزها": true, "امور مالی": true, "دستگاه‌های IoT": true, "طراح Workflow": true, "گزارش‌ها": true, "مدیریت کاربران": true, "تنظیمات کلی": false } },
  { role: "company-admin", permissions: { "مکاتبات اداری": true, "بارنامه‌ها": true, "مجوزها": true, "امور مالی": false, "دستگاه‌های IoT": false, "طراح Workflow": false, "گزارش‌ها": true, "مدیریت کاربران": false, "تنظیمات کلی": false } },
  { role: "company-staff", permissions: { "مکاتبات اداری": false, "بارنامه‌ها": true, "مجوزها": false, "امور مالی": false, "دستگاه‌های IoT": false, "طراح Workflow": false, "گزارش‌ها": false, "مدیریت کاربران": false, "تنظیمات کلی": false } },
  { role: "guard", permissions: { "مکاتبات اداری": false, "بارنامه‌ها": false, "مجوزها": false, "امور مالی": false, "دستگاه‌های IoT": false, "طراح Workflow": false, "گزارش‌ها": false, "مدیریت کاربران": false, "تنظیمات کلی": false } },
  { role: "hse-officer", permissions: { "مکاتبات اداری": true, "بارنامه‌ها": true, "مجوزها": true, "امور مالی": false, "دستگاه‌های IoT": false, "طراح Workflow": true, "گزارش‌ها": true, "مدیریت کاربران": false, "تنظیمات کلی": false } },
  { role: "finance-officer", permissions: { "مکاتبات اداری": false, "بارنامه‌ها": false, "مجوزها": false, "امور مالی": true, "دستگاه‌های IoT": false, "طراح Workflow": false, "گزارش‌ها": true, "مدیریت کاربران": false, "تنظیمات کلی": false } },
  { role: "weighbridge-operator", permissions: { "مکاتبات اداری": false, "بارنامه‌ها": true, "مجوزها": false, "امور مالی": false, "دستگاه‌های IoT": false, "طراح Workflow": false, "گزارش‌ها": false, "مدیریت کاربران": false, "تنظیمات کلی": false } },
  { role: "driver", permissions: { "مکاتبات اداری": false, "بارنامه‌ها": true, "مجوزها": false, "امور مالی": false, "دستگاه‌های IoT": false, "طراح Workflow": false, "گزارش‌ها": false, "مدیریت کاربران": false, "تنظیمات کلی": false } },
];

// ── Workflow Module Additions ─────────────────────────────────────────────────

export interface WFVersionEntry { version: number; editedBy: string; date: string; changeNote: string; }

export const WF_VERSION_HISTORY: Record<string, WFVersionEntry[]> = {
  wf1: [
    { version: 5, editedBy: "احمد کریمی", date: "۳ روز پیش", changeNote: "افزودن گره تأیید HSE" },
    { version: 4, editedBy: "احمد کریمی", date: "۱ هفته پیش", changeNote: "اصلاح SLA مرحله لجستیک" },
    { version: 3, editedBy: "مریم رضایی", date: "۳ هفته پیش", changeNote: "افزودن دروازه تصمیم بار خطرناک" },
    { version: 2, editedBy: "احمد کریمی", date: "۲ ماه پیش", changeNote: "تغییر عامل مرحله بررسی اولیه" },
    { version: 1, editedBy: "احمد کریمی", date: "۴ ماه پیش", changeNote: "ایجاد اولیه Workflow" },
  ],
  wf4: [
    { version: 7, editedBy: "احمد کریمی", date: "دیروز", changeNote: "افزودن مرحله امضای دیجیتال نهایی" },
    { version: 6, editedBy: "مریم رضایی", date: "۲ هفته پیش", changeNote: "تغییر عامل بررسی به دبیرخانه" },
    { version: 5, editedBy: "احمد کریمی", date: "۱ ماه پیش", changeNote: "ایجاد اولیه Workflow" },
  ],
};

export interface NotificationTemplate { id: string; nameFa: string; channel: "sms" | "email" | "push"; bodyFa: string; }

export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  { id: "NT1", nameFa: "اطلاع تأیید مرحله", channel: "push", bodyFa: "بارنامه {{shipmentId}} در مرحله {{stage}} تأیید شد." },
  { id: "NT2", nameFa: "یادآوری انقضای SLA", channel: "sms", bodyFa: "هشدار: مهلت اقدام روی {{entity}} رو به اتمام است." },
  { id: "NT3", nameFa: "ارجاع به سطح بالاتر", channel: "email", bodyFa: "درخواست {{entity}} به دلیل عدم اقدام به شما ارجاع شد." },
  { id: "NT4", nameFa: "رد نهایی درخواست", channel: "sms", bodyFa: "درخواست {{entity}} رد شد. دلیل: {{reason}}" },
  { id: "NT5", nameFa: "شروع فرآیند شبیه‌سازی", channel: "push", bodyFa: "شبیه‌سازی Workflow «{{workflowName}}» آغاز شد." },
];

export interface DeputyAssignment { role: string; primary: string; deputy: string; activeWhen: string; }

export const WF_DEPUTY_ASSIGNMENTS: DeputyAssignment[] = [
  { role: "مدیر HSE", primary: "حسین کاظمی", deputy: "زهرا امینی", activeWhen: "در غیاب (مرخصی)" },
  { role: "مدیر لجستیک", primary: "رضایی محمد", deputy: "علی نجفی", activeWhen: "در غیاب (مأموریت)" },
  { role: "مدیر شهرک", primary: "احمد کریمی", deputy: "مریم رضایی", activeWhen: "زمان‌بندی‌شده" },
];

export interface WFValidationIssue { severity: "error" | "warning"; message: string; nodeId?: string; }

export const WF_VALIDATION_ISSUES: WFValidationIssue[] = [
  { severity: "warning", message: "گره «ارسال نوتیفیکیشن به حراست» هیچ خروجی برچسب‌گذاری‌شده‌ای ندارد.", nodeId: "auto1" },
];

// ── Super Admin Reports Mock Data ─────────────────────────────────────────────

export interface ServiceUsage {
  id: string; nameFa: string; nameEn: string;
  totalRequests: number; avgLatency: string; errorRate: number;
  uptime: number; lastUpdated: string;
}

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

// ── Super Admin Audit Logs Mock Data ──────────────────────────────────────────

export interface AuditLog {
  id: string; timestamp: string; user: string; userRole: string;
  action: string; category: "auth" | "data" | "system" | "security" | "config";
  details: string; ipAddress: string; zone?: string;
}

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
