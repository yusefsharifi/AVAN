import type { Company, Shipment, Contractor, Invoice, TimeSlot } from '../types';

// ── Validators ───────────────────────────────────────────────────────────────

export function validateIranianNationalCode(code: string): boolean {
  if (!/^\d{10}$/.test(code)) return false;
  const digits = code.split('').map(Number);
  const checkDigit = digits[9];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += digits[i] * (10 - i);
  const remainder = sum % 11;
  return checkDigit === (remainder < 2 ? remainder : 11 - remainder);
}

export function validateIranianPlate(plate: string): boolean {
  return /^\d{2}[الف-ی]\d{3}[الف-ی]\d{2}$/.test(plate.replace(/\s/g, ''));
}

export function validateIranianPhone(phone: string): boolean {
  return /^09\d{9}$/.test(phone.replace(/\s/g, ''));
}

export function validateIranianPostalCode(code: string): boolean {
  return /^\d{10}$/.test(code);
}

// ── Formatters ───────────────────────────────────────────────────────────────

export function formatCurrency(amount: number, currency: 'IRR' | 'USD' = 'IRR'): string {
  if (currency === 'USD') return `$${amount.toLocaleString('en-US')}`;
  return `${amount.toLocaleString('fa-IR')} ریال`;
}

export function formatCurrencyToman(amount: number): string {
  const toman = Math.round(amount / 10);
  return `${toman.toLocaleString('fa-IR')} تومان`;
}

export function formatDate(dateStr: string): string {
  return dateStr; // Placeholder - in production use date-fns-jalali
}

export function formatDateTime(dateStr: string): string {
  return dateStr;
}

export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'همین الان';
  if (diffMins < 60) return `${diffMins} دقیقه پیش`;
  if (diffHours < 24) return `${diffHours} ساعت پیش`;
  if (diffDays < 7) return `${diffDays} روز پیش`;
  return formatDate(dateStr);
}

export function formatWeight(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} تن`;
  return `${kg.toLocaleString('fa-IR')} کیلوگرم`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value).toLocaleString('fa-IR')}٪`;
}

// ── Calculators ──────────────────────────────────────────────────────────────

export function calculateDiscrepancy(declared: number, actual: number): {
  percent: number;
  status: 'acceptable' | 'warning' | 'critical';
  requiresApproval: boolean;
  blocksExit: boolean;
} {
  const diff = Math.abs(actual - declared);
  const percent = declared > 0 ? (diff / declared) * 100 : 0;
  
  if (percent <= 2) return { percent, status: 'acceptable', requiresApproval: false, blocksExit: false };
  if (percent <= 5) return { percent, status: 'warning', requiresApproval: true, blocksExit: false };
  return { percent, status: 'critical', requiresApproval: true, blocksExit: true };
}

export function calculateDaysUntilExpiry(expiryDate: string): number {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - now.getTime();
  return Math.ceil(diffMs / 86400000);
}

export function calculateHseScore(incidents: { severity: string }[], checklists: { overallResult: string }[]): number {
  let score = 100;
  incidents.forEach(inc => {
    if (inc.severity === 'critical') score -= 15;
    else if (inc.severity === 'high') score -= 10;
    else if (inc.severity === 'normal') score -= 5;
    else score -= 2;
  });
  const failedChecklists = checklists.filter(c => c.overallResult === 'fail').length;
  score -= failedChecklists * 5;
  return Math.max(0, Math.min(100, score));
}

export function calculateContractorGrade(kpi: { onTimeDeliveryRate: number; qualityScore: number; safetyViolationCount: number }): 'A' | 'B' | 'C' | 'D' | 'F' {
  const score = (kpi.onTimeDeliveryRate * 0.4) + (kpi.qualityScore * 0.4) - (kpi.safetyViolationCount * 5);
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export function suggestOptimalSlot(
  request: { cargoType: string; vehicleType: string; weight: number },
  existingSlots: TimeSlot[],
  constraints: { bufferMinutes: number; maxQueueLength: number }
): TimeSlot[] {
  return existingSlots
    .filter(s => s.status === 'available')
    .slice(0, 3);
}

// ── Permissions ──────────────────────────────────────────────────────────────

export function hasPermission(role: string, resource: string, action: string, dataScope?: string): boolean {
  if (role === 'park_admin') return true;
  const permissions: Record<string, Record<string, string[]>> = {
    park_manager: { '*': ['*'] },
    operations_manager: { shipment: ['create', 'read', 'update', 'approve'], contractor: ['read', 'update'], scheduling: ['*'] },
    finance_manager: { invoice: ['*'], company: ['read'] },
    hse_manager: { contractor: ['read', 'update'], incident: ['*'], checklist: ['*'] },
    gatekeeper: { shipment: ['read'], visitor: ['read', 'update'] },
    company_admin: { shipment: ['create', 'read'], invoice: ['read'], permit: ['read'] },
    company_user: { shipment: ['read'], invoice: ['read'] },
    driver: { shipment: ['read'] },
    auditor: { '*': ['read', 'export'] },
  };
  const rolePerms = permissions[role];
  if (!rolePerms) return false;
  if (rolePerms['*']?.includes('*')) return true;
  return rolePerms[resource]?.includes(action) ?? false;
}

// ── ID Generators ────────────────────────────────────────────────────────────

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateWaybillNumber(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
  return `BN-${year}-${seq}`;
}

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
  return `INV-${year}-${seq}`;
}
