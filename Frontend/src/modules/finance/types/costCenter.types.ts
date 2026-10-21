// ── Cost Center Types ────────────────────────────────────────────────────────

export type CostCenterType = 'production_line' | 'warehouse' | 'admin' | 'sales' | 'maintenance';
export type CostCenterStatus = 'active' | 'inactive' | 'closed';

export interface CostCenterBudget {
  annual: number;
  ytdActual: number;
  ytdCommitted: number;
  remaining: number;
}

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  nameFa: string;
  type: CostCenterType;
  companyId: string;
  managerId: string;
  managerName: string;
  budget: CostCenterBudget;
  status: CostCenterStatus;
  description?: string;
  parentId?: string;
  children?: CostCenter[];
  createdAt: string;
  updatedAt: string;
}

export interface CostCenterTransaction {
  id: string;
  costCenterId: string;
  voucherId: string;
  accountId: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  date: string;
  projectId?: string;
}

// ── Project Types ────────────────────────────────────────────────────────────

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectType = 'construction' | 'manufacturing' | 'maintenance' | 'it' | 'other';

export interface ProjectBudgetLine {
  id: string;
  category: string;
  budgetAmount: number;
  actualAmount: number;
  committedAmount: number;
  variance: number;
}

export interface ProjectMilestone {
  id: string;
  name: string;
  nameFa: string;
  dueDate: string;
  completedDate?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  budgetAllocated: number;
  actualSpent: number;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  nameFa: string;
  companyId: string;
  companyName: string;
  projectType: ProjectType;
  startDate: string;
  endDate?: string;
  status: ProjectStatus;
  totalBudget: number;
  actualCost: number;
  estimatedCostToComplete: number;
  variance: number;
  variancePercent: number;
  wipAccountId: string;
  budgetLines: ProjectBudgetLine[];
  milestones: ProjectMilestone[];
  managerId: string;
  managerName: string;
  completionPercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCostEntry {
  id: string;
  projectId: string;
  costCenterId: string;
  accountId: string;
  description: string;
  amount: number;
  date: string;
  voucherId: string;
  category: string;
  isWip: boolean;
}

// ── Consolidation Types ──────────────────────────────────────────────────────

export type ConsolidationPeriod = 'monthly' | 'quarterly' | 'annual';

export interface IntercompanyTransaction {
  id: string;
  fromCompanyId: string;
  fromCompanyName: string;
  toCompanyId: string;
  toCompanyName: string;
  transactionType: 'sale' | 'purchase' | 'service' | 'loan' | 'dividend';
  amount: number;
  currency: 'IRR' | 'USD' | 'EUR';
  date: string;
  description: string;
  voucherId: string;
  eliminationRequired: boolean;
  eliminated: boolean;
  eliminationVoucherId?: string;
}

export interface ConsolidationEntry {
  id: string;
  accountCode: string;
  accountName: string;
  companyEntries: { companyId: string; companyName: string; amount: number }[];
  eliminationAmount: number;
  consolidatedAmount: number;
}

export interface CurrencyTranslation {
  companyId: string;
  companyName: string;
  currency: 'IRR' | 'USD' | 'EUR';
  originalAmount: number;
  exchangeRate: number;
  translatedAmount: number;
  rateType: 'current' | 'average' | 'historical';
  rateDate: string;
}

export interface ConsolidationReport {
  id: string;
  periodId: string;
  periodName: string;
  periodType: ConsolidationPeriod;
  companies: { companyId: string; companyName: string; status: 'included' | 'excluded' | 'pending' }[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  eliminationsTotal: number;
  currencyAdjustments: number;
  minorityInterest: number;
  status: 'draft' | 'pending_review' | 'approved' | 'posted';
  createdAt: string;
  createdBy: string;
}

export interface MinorityInterest {
  companyId: string;
  companyName: string;
  ownershipPercent: number;
  netAssets: number;
  minorityShare: number;
}
