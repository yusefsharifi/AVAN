// ═══════════════════════════════════════════════════════════════════════════════
// CMMS Utility Functions — M13
// MTBF, MTTR, Depreciation, SLA, Technician Assignment
// ═══════════════════════════════════════════════════════════════════════════════

import { WorkOrderPriority } from '../dto/enums';

// ═══════════════════════════════════════════════════════════════════════════════
// MTBF — Mean Time Between Failures (hours)
//
// MTBF = Total Operational Time (hours) / Number of Failures
//
// Operational time = time between consecutive failures or from
//   first use to first failure.
// ═══════════════════════════════════════════════════════════════════════════════

export function computeMTBF(
  failureDates: Date[],
  assetCreatedOrFirstUse: Date,
  toDate: Date = new Date(),
): number {
  if (failureDates.length === 0) {
    // No failures: MTBF = total operational hours
    const totalHours = (toDate.getTime() - assetCreatedOrFirstUse.getTime()) / (1000 * 60 * 60);
    return totalHours;
  }

  const sorted = [...failureDates].sort((a, b) => a.getTime() - b.getTime());

  let totalOperationalHours = 0;

  // Time from asset creation to first failure
  totalOperationalHours += (sorted[0].getTime() - assetCreatedOrFirstUse.getTime()) / (1000 * 60 * 60);

  // Time between consecutive failures
  for (let i = 1; i < sorted.length; i++) {
    totalOperationalHours += (sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60);
  }

  // Time from last failure to toDate
  totalOperationalHours += (toDate.getTime() - sorted[sorted.length - 1].getTime()) / (1000 * 60 * 60);

  return totalOperationalHours / failureDates.length;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MTTR — Mean Time To Repair (hours)
//
// MTTR = Sum(Repair Time for each failure) / Number of Repairs
//
// repairTime = restoredAt - failedAt (in hours)
// Only count resolved failures (restoredAt != null)
// ═══════════════════════════════════════════════════════════════════════════════

export interface RepairRecord {
  failedAt: Date;
  restoredAt: Date | null;
}

export function computeMTTR(records: RepairRecord[]): number {
  const resolved = records.filter((r) => r.restoredAt !== null);

  if (resolved.length === 0) return 0;

  const totalRepairHours = resolved.reduce((sum, r) => {
    const repairMs = r.restoredAt!.getTime() - r.failedAt.getTime();
    return sum + repairMs / (1000 * 60 * 60);
  }, 0);

  return totalRepairHours / resolved.length;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASSET DEPRECIATION
//
// computeDepreciatedValue(purchasePrice, annualRate, ageMonths)
//
// Uses straight-line depreciation:
//   depreciationPerMonth = purchasePrice * (annualRate / 12) / 100
//   depreciatedValue = purchasePrice - (depreciationPerMonth * ageMonths)
//   depreciatedValue = max(depreciatedValue, salvageValue)
// ═══════════════════════════════════════════════════════════════════════════════

export function computeDepreciatedValue(
  purchasePrice: bigint,
  annualRatePercent: number,
  ageMonths: number,
  salvageValue: bigint = 0n,
): bigint {
  if (purchasePrice <= 0n || annualRatePercent <= 0 || ageMonths <= 0) {
    return purchasePrice;
  }

  const depreciationPerMonth = (purchasePrice * BigInt(Math.round(annualRatePercent * 100))) / (12n * 10000n);
  const totalDepreciation = depreciationPerMonth * BigInt(ageMonths);
  const depreciated = purchasePrice - totalDepreciation;

  return depreciated < salvageValue ? salvageValue : depreciated;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MONTHS BETWEEN DATES
// ═══════════════════════════════════════════════════════════════════════════════

export function monthsBetween(start: Date, end: Date): number {
  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  return yearDiff * 12 + monthDiff;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLA DEADLINE CALCULATOR
//
// Returns the SLA deadline DateTime based on work order priority:
//   EMERGENCY: now + 2h
//   URGENT:    now + 4h
//   HIGH:      now + 8h
//   NORMAL:    now + 24h
//   LOW:       now + 72h
// ═══════════════════════════════════════════════════════════════════════════════

const SLA_HOURS: Record<string, number> = {
  EMERGENCY: 2,
  URGENT: 4,
  HIGH: 8,
  NORMAL: 24,
  LOW: 72,
};

export function computeSlaDeadline(priority: WorkOrderPriority, customSlaHours?: number): Date {
  if (customSlaHours && customSlaHours > 0) {
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + customSlaHours);
    return deadline;
  }

  const hours = SLA_HOURS[priority] ?? 24;
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + hours);
  return deadline;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORK ORDER STATUS TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_WO_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['APPROVED', 'CANCELLED'],
  APPROVED: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
  ON_HOLD: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: ['VERIFIED', 'CLOSED'],
  VERIFIED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
};

export function isValidWorkOrderTransition(current: string, next: string): boolean {
  const allowed = VALID_WO_TRANSITIONS[current];
  return allowed ? allowed.includes(next) : false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TECHNICIAN AUTO-ASSIGNMENT ALGORITHM
//
// 1. Has required skill (category → specialization mapping)
// 2. Is available (isAvailable=true, isActive=true)
// 3. Lowest activeWorkOrders count (workload balancing)
// ═══════════════════════════════════════════════════════════════════════════════

export interface TechnicianCandidate {
  id: string;
  name: string;
  specializations: string[];
  isAvailable: boolean;
  isActive: boolean;
  activeWorkOrders: number;
}

export function selectBestTechnician(
  candidates: TechnicianCandidate[],
  requiredSkill: string | null,
): TechnicianCandidate | null {
  const filtered = candidates.filter((t) => {
    if (!t.isActive || !t.isAvailable) return false;
    if (!requiredSkill) return true;
    return t.specializations.includes(requiredSkill);
  });

  if (filtered.length === 0) return null;

  // Sort by lowest activeWorkOrders (workload balancing)
  filtered.sort((a, b) => a.activeWorkOrders - b.activeWorkOrders);

  return filtered[0];
}

// ═══════════════════════════════════════════════════════════════════════════════
// STOCK DEDUCTION WITH VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface StockValidationResult {
  valid: boolean;
  currentStock: number;
  requiredQuantity: number;
  newStock: number;
  wouldBeLowStock: boolean;
  wouldTriggerReorder: boolean;
  minimumStock: number;
  reorderPoint: number;
}

export function validateStockDeduction(
  currentStock: number,
  requiredQuantity: number,
  minimumStock: number,
  reorderPoint: number,
): StockValidationResult {
  const newStock = currentStock - requiredQuantity;

  return {
    valid: newStock >= 0,
    currentStock,
    requiredQuantity,
    newStock,
    wouldBeLowStock: newStock <= minimumStock,
    wouldTriggerReorder: newStock <= reorderPoint,
    minimumStock,
    reorderPoint,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOWNTIME CALCULATION
//
// Returns downtime in minutes from failedAt to restoredAt
// ═══════════════════════════════════════════════════════════════════════════════

export function computeDowntimeMinutes(failedAt: Date, restoredAt: Date): number {
  return Math.round((restoredAt.getTime() - failedAt.getTime()) / (1000 * 60));
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORK ORDER COST CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════════

export interface WorkOrderCostBreakdown {
  laborCost: number;
  partsCost: number;
  contractorCost: number;
  totalCost: number;
}

export function computeWorkOrderCosts(
  actualHours: number,
  hourlyRate: number,
  partsCost: number,
  contractorCost: number,
): WorkOrderCostBreakdown {
  const laborCost = Math.round(actualHours * hourlyRate);
  const totalCost = laborCost + partsCost + contractorCost;

  return { laborCost, partsCost, contractorCost, totalCost };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAINTENANCE NEXT DUE DATE CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function computeNextDueDate(
  triggerType: string,
  completedAt: Date,
  intervalDays: number | null,
  intervalUnit: string | null,
  meterAtCompletion: number | null,
  intervalMeter: number | null,
): { nextDueAt?: Date; nextDueMeter?: number } {
  if (triggerType === 'TIME_BASED' && intervalDays) {
    const nextDue = new Date(completedAt);

    if (intervalUnit === 'month') {
      nextDue.setMonth(nextDue.getMonth() + intervalDays);
    } else if (intervalUnit === 'week') {
      nextDue.setDate(nextDue.getDate() + intervalDays * 7);
    } else {
      // day (default)
      nextDue.setDate(nextDue.getDate() + intervalDays);
    }

    return { nextDueAt: nextDue };
  }

  if (triggerType === 'METER_BASED' && intervalMeter && meterAtCompletion != null) {
    return { nextDueMeter: meterAtCompletion + intervalMeter };
  }

  return {};
}
