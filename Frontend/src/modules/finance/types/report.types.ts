export interface TrialBalanceLine {
  accountCode: string;
  accountName: string;
  accountType: string;
  openingBalance: number;
  debitMovement: number;
  creditMovement: number;
  closingBalance: number;
  balanceType: 'debit' | 'credit';
}

export interface BalanceSheetItem {
  accountCode: string;
  accountName: string;
  currentPeriod: number;
  priorPeriod: number;
  change: number;
  changePercent: number;
  level: number;
}

export interface IncomeStatementItem {
  accountCode: string;
  accountName: string;
  currentPeriod: number;
  priorPeriod: number;
  change: number;
  isSubtotal?: boolean;
  level: number;
}

export interface CashFlowItem {
  category: string;
  currentPeriod: number;
  priorPeriod: number;
  level: number;
  type: 'inflow' | 'outflow';
}

export interface BudgetVsActualItem {
  accountCode: string;
  accountName: string;
  budgetAmount: number;
  actualAmount: number;
  variance: number;
  variancePercent: number;
  status: 'under' | 'on_track' | 'over';
  costCenter?: string;
}

export interface FinancialRatio {
  name: string;
  nameFa: string;
  value: number;
  benchmark: number;
  status: 'good' | 'warning' | 'poor';
  trend: 'improving' | 'stable' | 'declining';
}
