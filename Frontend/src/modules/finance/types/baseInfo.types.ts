export interface ProductMaster {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  taxRate: number;
  salesPrice: number;
  purchasePrice: number;
  glSalesAccountId: string;
  glPurchaseAccountId: string;
  hasInventory: boolean;
  notes: string;
  status: 'active' | 'inactive';
}

export interface ProjectDimension {
  id: string;
  code: string;
  name: string;
  managerId: string;
  startDate: string;
  endDate?: string;
  budget: number;
  status: 'active' | 'completed' | 'cancelled';
  notes: string;
}

export interface CostCenterGroup {
  id: string;
  code: string;
  name: string;
  parentId?: string;
  notes: string;
}

export interface DutyTariff {
  id: string;
  code: string;
  name: string;
  rate: number;
  applicableTo: 'purchase' | 'sales' | 'both';
  glAccountId: string;
  notes: string;
}

export interface AccountGroupKey {
  code: string;
  groupName: string;
  notes: string;
  isPayable: boolean;
  isQuantityAsset: boolean;
  assetFrom?: string;
  hasCostCenter: boolean;
  hasProject: boolean;
  hasNextLevel: boolean;
  accountNote: string;
  nature: 'بدهکار' | 'بستانکار';
}

export interface FiscalPeriod {
  id: string;
  fiscalYearId: string;
  periodNumber: number;
  name: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed';
}

export interface FiscalYear {
  id: string;
  groupId: string;
  year: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed' | 'archived';
  periods: FiscalPeriod[];
}

export interface FiscalYearGroup {
  id: string;
  code: string;
  name: string;
}
