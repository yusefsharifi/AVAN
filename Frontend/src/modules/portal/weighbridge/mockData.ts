import { WeightSession } from "@/entities/document";

export const WEIGHT_SESSIONS: WeightSession[] = [
  {
    id: "WBS-9001", plate: "۱۲ب۳۴۵ ایران", direction: "in", linkedShipmentId: "BN-1042",
    driverName: "علی محمدی", companyName: "شرکت پلاستیک ایران", cargoType: "مواد اولیه",
    tareWeight: 12300, grossWeight: 24800, netWeight: 12500, declaredWeight: 12500,
    dock: "دوک ۲", stationId: "WB1", operatorName: "رضا احمدی", timestamp: "۱۴۰۳/۰۴/۱۵ ۰۹:۲۰",
    status: "completed", discrepancyPct: 0,
    commodities: [
      { name: "پلی‌اتیلن", declaredWeight: 8000, actualWeight: 8100, unit: "کیلوگرم", hsCode: "3901" },
      { name: "پلی‌پروپیلن", declaredWeight: 4500, actualWeight: 4400, unit: "کیلوگرم", hsCode: "3902" },
    ],
    photos: { truck: "uploaded", cargo: "uploaded" },
  },
  {
    id: "WBS-9002", plate: "۷۸پ۹۱۲ ایران", direction: "out", linkedShipmentId: "BN-1039",
    driverName: "رضا کریمی", companyName: "فولاد البرز", cargoType: "محصول نهایی",
    tareWeight: 11800, grossWeight: 20000, netWeight: 8200, declaredWeight: 8200,
    dock: "دوک ۱", stationId: "WB1", operatorName: "رضا احمدی", timestamp: "۱۴۰۳/۰۴/۱۴ ۱۳:۴۵",
    status: "completed", discrepancyPct: 0,
    photos: { truck: "uploaded", cargo: "uploaded", seal: "uploaded" },
  },
  {
    id: "WBS-9003", plate: "۵۶ث۷۸۹ ایران", direction: "in", linkedShipmentId: "BN-1030",
    driverName: "فرید نجفی", companyName: "پتروشیمی پارس", cargoType: "مواد شیمیایی خطرناک",
    tareWeight: 13100, grossWeight: 18450, netWeight: 5350, declaredWeight: 4500,
    dock: "—", stationId: "WB1", operatorName: "رضا احمدی", timestamp: "۱۴۰۳/۰۴/۱۰ ۱۰:۱۵",
    status: "discrepancy", discrepancyPct: 18.9,
    commodities: [
      { name: "بنزن", declaredWeight: 3000, actualWeight: 3500, unit: "کیلوگرم", hsCode: "2707" },
      { name: "تولوئن", declaredWeight: 1500, actualWeight: 1850, unit: "کیلوگرم", hsCode: "2710" },
    ],
  },
  {
    id: "WBS-9004", plate: "۳۴ت۵۶۷ ایران", direction: "in", linkedShipmentId: "BN-1035",
    driverName: "محمد حسینی", companyName: "بازدیدکننده", cargoType: "تجهیزات",
    tareWeight: 9800, grossWeight: 12900, netWeight: 3100, declaredWeight: 3100,
    dock: "دوک ۳", stationId: "WB2", operatorName: "سارا نوری", timestamp: "۱۴۰۳/۰۴/۱۲ ۰۸:۵۰",
    status: "completed", discrepancyPct: 0,
  },
  {
    id: "WBS-9005", plate: "۹۰ج۱۲۳ ایران", direction: "in",
    driverName: "حسن رضایی", companyName: "نامشخص", cargoType: "نامشخص",
    tareWeight: 0, grossWeight: 0, netWeight: 0, declaredWeight: 0,
    dock: "—", stationId: "WB1", operatorName: "رضا احمدی", timestamp: "۱۴۰۳/۰۴/۱۶ ۰۹:۳۱",
    status: "cancelled", discrepancyPct: 0,
  },
  {
    id: "WBS-9006", plate: "۲۳ح۴۵۶ ایران", direction: "out",
    driverName: "امیر صادقی", companyName: "فولاد البرز", cargoType: "محصول نهایی",
    tareWeight: 11950, grossWeight: 19870, netWeight: 7920, declaredWeight: 7900,
    dock: "دوک ۴", stationId: "WB1", operatorName: "رضا احمدی", timestamp: "۱۴۰۳/۰۴/۰۹ ۰۷:۴۰",
    status: "completed", discrepancyPct: 0.3,
  },
  {
    id: "WBS-9007", plate: "۶۷خ۸۹۰ ایران", direction: "out",
    driverName: "سعید موسوی", companyName: "سرامیک شیراز", cargoType: "مصالح ساختمانی",
    tareWeight: 12500, grossWeight: 21300, netWeight: 8800, declaredWeight: 8800,
    dock: "دوک ۵", stationId: "WB3", operatorName: "رضا احمدی", timestamp: "۱۴۰۳/۰۴/۰۸ ۰۸:۱۰",
    status: "completed", discrepancyPct: 0,
    correctedBy: "رضا احمدی", originalSessionId: "WBS-9007-old",
  },
];

export const TRUCK_DB: Record<string, { driverName: string; companyName: string; cargoType: string }> = {
  "۱۲ب۳۴۵ ایران": { driverName: "علی محمدی", companyName: "شرکت پلاستیک ایران", cargoType: "مواد اولیه" },
  "۷۸پ۹۱۲ ایران": { driverName: "رضا کریمی", companyName: "فولاد البرز", cargoType: "محصول نهایی" },
  "۵۶ث۷۸۹ ایران": { driverName: "فرید نجفی", companyName: "پتروشیمی پارس", cargoType: "مواد شیمیایی خطرناک" },
  "۳۴ت۵۶۷ ایران": { driverName: "محمد حسینی", companyName: "بازدیدکننده", cargoType: "تجهیزات" },
  "۲۳ح۴۵۶ ایران": { driverName: "امیر صادقی", companyName: "فولاد البرز", cargoType: "محصول نهایی" },
  "۶۷خ۸۹۰ ایران": { driverName: "سعید موسوی", companyName: "سرامیک شیراز", cargoType: "مصالح ساختمانی" },
};

export const DAILY_THROUGHPUT = [
  { day: "شنبه", count: 28 }, { day: "یکشنبه", count: 35 },
  { day: "دوشنبه", count: 22 }, { day: "سه‌شنبه", count: 41 },
  { day: "چهارشنبه", count: 30 }, { day: "پنجشنبه", count: 19 }, { day: "جمعه", count: 12 },
];

export const COMMODITY_BREAKDOWN = [
  { name: "مواد اولیه", value: 42, color: "#0E7C86" },
  { name: "محصول نهایی", value: 28, color: "#3FA7B3" },
  { name: "مواد شیمیایی", value: 15, color: "#F2A541" },
  { name: "تجهیزات", value: 10, color: "#6366F1" },
  { name: "مصالح ساختمانی", value: 5, color: "#94A3B8" },
];

export const DISCREPANCY_TREND = [
  { week: "هفته ۱", avg: 1.2 }, { week: "هفته ۲", avg: 3.8 },
  { week: "هفته ۳", avg: 2.1 }, { week: "هفته ۴", avg: 5.4 },
  { week: "هفته ۵", avg: 1.9 }, { week: "هفته ۶", avg: 2.7 },
];

export const OPERATOR_PERF = [
  { name: "رضا احمدی", sessions: 18, avgTime: 4.2, discrepancies: 1, accuracy: 94.4 },
  { name: "سارا نوری", sessions: 12, avgTime: 3.8, discrepancies: 0, accuracy: 100 },
  { name: "امیر محمدی", sessions: 8, avgTime: 5.1, discrepancies: 2, accuracy: 75 },
];
