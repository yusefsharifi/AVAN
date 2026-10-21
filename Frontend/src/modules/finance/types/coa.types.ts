export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type AccountCategory =
  | 'current_asset' | 'fixed_asset' | 'current_liability' | 'long_term_liability' | 'equity' | 'operating_revenue' | 'cogs' | 'operating_expense' | 'non_operating'
  | 'cash' | 'bank' | 'receivable' | 'inventory' | 'prepayment' | 'short_term_investment' | 'long_term_receivable' | 'intangible_asset' | 'accumulated_depreciation'
  | 'payable' | 'vat_payable' | 'check_payable' | 'short_term_loan' | 'salary_payable' | 'tax_payable' | 'long_term_loan' | 'deferred_tax' | 'capital' | 'retained_earnings'
  | 'sales_revenue' | 'service_revenue' | 'sales_return' | 'sales_discount' | 'purchase' | 'purchase_expense' | 'purchase_return'
  | 'salary_expense' | 'rent_expense' | 'utility_expense' | 'depreciation_expense' | 'marketing_expense' | 'insurance_expense' | 'repair_expense' | 'interest_income' | 'interest_expense' | 'fx_loss' | 'income_tax_expense';
export type AccountStatus = 'active' | 'inactive' | 'blocked';

export interface AccountDimension {
  costCenter?: string;
  project?: string;
  department?: string;
  region?: string;
}

export interface Account {
  id: string;
  code: string;
  nameFa: string;
  nameEn: string;
  type: AccountType;
  category: AccountCategory;
  parentId: string | null;
  level: number;
  isBankAccount: boolean;
  isCashAccount: boolean;
  isControlAccount: boolean;
  currency: 'IRR' | 'USD' | 'EUR';
  companyId: string;
  fiscalYearId: string;
  openingBalance: number;
  currentBalance: number;
  status: AccountStatus;
  tags: string[];
  dimensions: AccountDimension;
  children?: Account[];
}
