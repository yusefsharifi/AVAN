// ═══════════════════════════════════════════════════════════════════════════════
// HSE Utility Functions — M14
// TRIR, LTIFR, Risk Matrix, HSE Score, Risk Level
// ═══════════════════════════════════════════════════════════════════════════════

import { HseRiskLevel } from '../dto/enums';

// ═══════════════════════════════════════════════════════════════════════════════
// TRIR — Total Recordable Incident Rate
//
// TRIR = (Recordable Incidents × 200,000) / Total Hours Worked
//
// Recordable incidents = MEDICAL_TREATMENT + LOST_TIME_INJURY + FATALITY
// 200,000 = 100 employees × 40 hrs/week × 50 weeks
// ═══════════════════════════════════════════════════════════════════════════════

export function computeTRIR(recordableIncidents: number, totalHoursWorked: number): number {
  if (totalHoursWorked <= 0) return 0;
  return Math.round((recordableIncidents * 200_000) / totalHoursWorked * 100) / 100;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LTIFR — Lost Time Injury Frequency Rate
//
// LTIFR = (LTI Count × 1,000,000) / Total Hours Worked
//
// LTI = LOST_TIME_INJURY incidents only
// ═══════════════════════════════════════════════════════════════════════════════

export function computeLTIFR(ltiCount: number, totalHoursWorked: number): number {
  if (totalHoursWorked <= 0) return 0;
  return Math.round((ltiCount * 1_000_000) / totalHoursWorked * 100) / 100;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Near-miss frequency per 200,000 hours
// ═══════════════════════════════════════════════════════════════════════════════

export function computeNearMissRate(nearMissCount: number, totalHoursWorked: number): number {
  if (totalHoursWorked <= 0) return 0;
  return Math.round((nearMissCount * 200_000) / totalHoursWorked * 100) / 100;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOTAL HOURS WORKED
//
// Estimate: assume 8 hours/day per employee for the period
// ═══════════════════════════════════════════════════════════════════════════════

export function estimateTotalHoursWorked(
  employeeCount: number,
  fromDate: Date,
  toDate: Date,
  hoursPerDay = 8,
): number {
  const diffMs = toDate.getTime() - fromDate.getTime();
  const workingDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) * (5 / 7)); // ~5 working days/week
  return employeeCount * workingDays * hoursPerDay;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DAYS SINCE LAST INCIDENT
// ═══════════════════════════════════════════════════════════════════════════════

export function daysSinceIncident(lastIncidentDate: Date | null): number {
  if (!lastIncidentDate) return -1; // no incidents ever
  const now = new Date();
  const diffMs = now.getTime() - lastIncidentDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// ═══════════════════════════════════════════════════════════════════════════════
// RISK SCORE & LEVEL
//
// riskScore = likelihood × severity (1-25)
//
// 1-4:  VERY_LOW
// 5-8:  LOW
// 9-12: MEDIUM
// 15-16: HIGH
// 20-25: VERY_HIGH
// ═══════════════════════════════════════════════════════════════════════════════

export function computeRiskScore(likelihood: number, severity: number): number {
  return likelihood * severity;
}

export function determineRiskLevel(score: number): HseRiskLevel {
  if (score <= 4) return HseRiskLevel.VERY_LOW;
  if (score <= 8) return HseRiskLevel.LOW;
  if (score <= 12) return HseRiskLevel.MEDIUM;
  if (score <= 16) return HseRiskLevel.HIGH;
  return HseRiskLevel.VERY_HIGH;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RISK MATRIX — 5×5 visualization data
//
// Returns a 5×5 matrix where matrix[likelihood-1][severity-1] = count
// ═══════════════════════════════════════════════════════════════════════════════

export interface RiskHazardData {
  initialLikelihood: number;
  initialSeverity: number;
}

export function buildRiskMatrix(hazards: RiskHazardData[]): {
  matrix: number[][];
  distribution: Record<string, number>;
} {
  const matrix: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
  const distribution: Record<string, number> = {
    VERY_LOW: 0,
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    VERY_HIGH: 0,
  };

  for (const h of hazards) {
    if (h.initialLikelihood >= 1 && h.initialLikelihood <= 5 &&
        h.initialSeverity >= 1 && h.initialSeverity <= 5) {
      matrix[h.initialLikelihood - 1][h.initialSeverity - 1]++;
    }
    const score = computeRiskScore(h.initialLikelihood, h.initialSeverity);
    const level = determineRiskLevel(score);
    distribution[level]++;
  }

  return { matrix, distribution };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HSE SCORE ALGORITHM (0-100)
//
// incidents (40 pts): fewer = higher score
//   0 incidents: 40, 1: 35, 2: 25, 3+: 10
// open CAPAs (20 pts): fewer = higher
//   0 overdue: 20, 1: 15, 2+: 5
// inspection compliance (20 pts): based on avg score
//   >=90: 20, >=75: 15, >=60: 10, <60: 5
// training compliance (20 pts):
//   100% trained: 20, 80%: 15, 60%: 10, <60%: 5
// ═══════════════════════════════════════════════════════════════════════════════

export function computeHseScore(params: {
  incidentCount: number;
  overdueCapas: number;
  avgInspectionScore: number; // 0-100
  trainingComplianceRate: number; // 0-100
}): number {
  let score = 0;

  // Incidents (40 pts)
  if (params.incidentCount === 0) score += 40;
  else if (params.incidentCount === 1) score += 35;
  else if (params.incidentCount === 2) score += 25;
  else score += 10;

  // Overdue CAPAs (20 pts)
  if (params.overdueCapas === 0) score += 20;
  else if (params.overdueCapas === 1) score += 15;
  else score += 5;

  // Inspection compliance (20 pts)
  if (params.avgInspectionScore >= 90) score += 20;
  else if (params.avgInspectionScore >= 75) score += 15;
  else if (params.avgInspectionScore >= 60) score += 10;
  else score += 5;

  // Training compliance (20 pts)
  if (params.trainingComplianceRate >= 100) score += 20;
  else if (params.trainingComplianceRate >= 80) score += 15;
  else if (params.trainingComplianceRate >= 60) score += 10;
  else score += 5;

  return score;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLIANCE SCORE CALCULATOR
//
// complianceScore = (passedItems / (totalItems - naItems)) × 100
// ═══════════════════════════════════════════════════════════════════════════════

export function computeComplianceScore(
  passedItems: number,
  totalItems: number,
  naItems: number,
): number {
  const applicable = totalItems - naItems;
  if (applicable <= 0) return 100;
  return Math.round((passedItems / applicable) * 100 * 100) / 100;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECORDABLE INCIDENT CHECK
//
// Recordable = MEDICAL_TREATMENT + LOST_TIME_INJURY + FATALITY
// ═══════════════════════════════════════════════════════════════════════════════

export function isRecordableIncident(type: string): boolean {
  return ['MEDICAL_TREATMENT', 'LOST_TIME_INJURY', 'FATALITY'].includes(type);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INCIDENT STATUS TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_INCIDENT_TRANSITIONS: Record<string, string[]> = {
  REPORTED: ['UNDER_INVESTIGATION', 'CLOSED'],
  UNDER_INVESTIGATION: ['INVESTIGATION_COMPLETE', 'DISPUTED'],
  INVESTIGATION_COMPLETE: ['CAPA_IN_PROGRESS', 'CLOSED'],
  CAPA_IN_PROGRESS: ['CLOSED'],
  CLOSED: [],
  DISPUTED: ['UNDER_INVESTIGATION'],
};

export function isValidIncidentTransition(current: string, next: string): boolean {
  const allowed = VALID_INCIDENT_TRANSITIONS[current];
  return allowed ? allowed.includes(next) : false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAPA STATUS TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_CAPA_TRANSITIONS: Record<string, string[]> = {
  OPEN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED_PENDING_VERIFICATION', 'CANCELLED'],
  COMPLETED_PENDING_VERIFICATION: ['VERIFIED_EFFECTIVE', 'VERIFIED_INEFFECTIVE'],
  VERIFIED_EFFECTIVE: [],
  VERIFIED_INEFFECTIVE: [],
  OVERDUE: ['IN_PROGRESS', 'CANCELLED'],
  CANCELLED: [],
};

export function isValidCapaTransition(current: string, next: string): boolean {
  const allowed = VALID_CAPA_TRANSITIONS[current];
  return allowed ? allowed.includes(next) : false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT HSE CHECKLISTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ChecklistItem {
  id: string;
  category: string;
  item: string;
  guidance?: string;
  required: boolean;
  severity?: string;
}

export function getDefaultChecklistItems(type: string): ChecklistItem[] {
  const checklists: Record<string, ChecklistItem[]> = {
    GENERAL_HSE: [
      { id: 'ghse-01', category: 'عمومی', item: 'حضور کلاه ایمنی', guidance: 'تمام پرسنل باید کلاه ایمنی داشته باشند', required: true, severity: 'MAJOR' },
      { id: 'ghse-02', category: 'عمومی', item: 'کفش ایمنی', guidance: 'کفش ایمنی مناسب پوشیده شده باشد', required: true, severity: 'MINOR' },
      { id: 'ghse-03', category: 'عمومی', item: 'عینک ایمنی', guidance: 'در صورت نیاز عینک ایمنی استفاده شود', required: false, severity: 'MINOR' },
      { id: 'ghse-04', category: 'محیط', item: 'نظافت محل کار', guidance: 'محل کار تمیز و عاری از مواد زائد باشد', required: true, severity: 'MINOR' },
      { id: 'ghse-05', category: 'محیط', item: 'عبور و مرور ایمن', guidance: 'مسیرهای عبور مسدود نباشند', required: true, severity: 'MAJOR' },
      { id: 'ghse-06', category: 'محیط', item: 'روشنایی کافی', guidance: 'روشنایی تمام نقاط کار کافی باشد', required: true, severity: 'MINOR' },
      { id: 'ghse-07', category: 'تجهیزات', item: 'وضعیت تجهیزات', guidance: 'تجهیزات در وضعیت ایمن باشند', required: true, severity: 'MAJOR' },
      { id: 'ghse-08', category: 'ags', item: 'کپسول آتش‌نشانی', guidance: 'کپسول‌ها شارژ و قابل دسترس باشند', required: true, severity: 'CRITICAL' },
      { id: 'ghse-09', category: 'ags', item: 'راه‌های خروج اضطراری', guidance: 'مسیرهای خروج باز و مشخص باشند', required: true, severity: 'CRITICAL' },
      { id: 'ghse-10', category: 'ags', item: 'کمک‌های اولیه', guidance: 'جعبه کمک‌های اولیه تکمیل و بروز باشد', required: true, severity: 'MAJOR' },
    ],
    FIRE_SAFETY: [
      { id: 'fs-01', category: 'آتش‌نشانی', item: 'کپسول‌های آتش‌نشانی', guidance: 'کپسول‌ها شارژ، سالم و قابل دسترس', required: true, severity: 'CRITICAL' },
      { id: 'fs-02', category: 'آتش‌نشانی', item: 'شرکت آب‌پاش اتوماتیک', guidance: 'سیستم اطفاء اتوماتیک فعال و آزمایش شده', required: true, severity: 'CRITICAL' },
      { id: 'fs-03', category: 'آتش‌نشانی', item: '_alarm آتش‌سوزی', guidance: 'آژیرهای آتش‌سوزی فعال و آزمایش شده', required: true, severity: 'CRITICAL' },
      { id: 'fs-04', category: 'آتش‌نشانی', item: 'مسیرهای فرار', guidance: 'مسیرهای فرار باز و مشخص', required: true, severity: 'CRITICAL' },
      { id: 'fs-05', category: 'آتش‌نشانی', item: 'مواد قابل اشتعال', guidance: 'مواد قابل اشتعال در محل مناسب نگهداری شوند', required: true, severity: 'MAJOR' },
      { id: 'fs-06', category: 'آتش‌نشانی', item: 'سیستم اعلام حریق', guidance: 'سیستم اعلام حریق فعال باشد', required: true, severity: 'CRITICAL' },
      { id: 'fs-07', category: 'آتش‌نشانی', item: 'نقشه فرار', guidance: 'نقشه فرار نصب و بروز باشد', required: true, severity: 'MINOR' },
      { id: 'fs-08', category: 'آتش‌نشانی', item: 'کلاس‌بندی مواد', guidance: 'مواد خطرناک کلاس‌بندی و برچسب‌گذاری شده باشند', required: true, severity: 'MAJOR' },
    ],
    HAZMAT: [
      { id: 'hm-01', category: 'مواد خطرناک', item: 'برچسب‌گذاری SDS', guidance: 'برگه اطلاعات ایمنی مواد (SDS) موجود باشد', required: true, severity: 'CRITICAL' },
      { id: 'hm-02', category: 'مواد خطرناک', item: 'نگهداری صحیح', guidance: 'مواد خطرناک در محل مناسب و با شرایط صحیح نگهداری شوند', required: true, severity: 'CRITICAL' },
      { id: 'hm-03', category: 'مواد خطرناک', item: 'لوازم حفاظت فردی', guidance: 'LPG مناسب برای نوع ماده در دسترس باشد', required: true, severity: 'MAJOR' },
      { id: 'hm-04', category: 'مواد خطرناک', item: 'تاریخ انقضا', guidance: 'مواد شیمیایی تاریخ انقضا نگذشته باشند', required: true, severity: 'MAJOR' },
      { id: 'hm-05', category: 'مواد خطرناک', item: 'سیستم تهویه', guidance: 'تهویه مناسب در محل نگهداری مواد شیمیایی', required: true, severity: 'CRITICAL' },
      { id: 'hm-06', category: 'مواد خطرناک', item: 'ضدعفونی', guidance: 'مواد ضدعفونی کننده در دسترس باشند', required: false, severity: 'MINOR' },
    ],
  };

  return checklists[type] || checklists['GENERAL_HSE'];
}
