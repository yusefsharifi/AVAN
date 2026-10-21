export type AssetCategory = 'land' | 'building' | 'machinery' | 'vehicle' | 'furniture' | 'it_equipment';
export type DepreciationMethod = 'straight_line' | 'declining_balance' | 'units_of_production';
export type AssetStatus = 'active' | 'under_maintenance' | 'idle' | 'disposed' | 'sold' | 'deleted';

export interface FixedAsset {
  id: string;
  assetCode: string;
  name: string;
  category: AssetCategory;
  companyId: string;
  location: string;
  acquisitionDate: string;
  acquisitionCost: number;
  additionalCosts: number;
  totalCapitalizedCost: number;
  depreciationMethod: DepreciationMethod;
  usefulLifeYears: number;
  salvageValue: number;
  depreciationStartDate: string;
  accumulatedDepreciation: number;
  netBookValue: number;
  status: AssetStatus;
  disposalDate?: string;
  disposalType?: 'sale' | 'scrap' | 'donation';
  disposalBuyer?: string;
  disposalNotes?: string;
  disposalProceeds?: number;
  gainLossOnDisposal?: number;
  maintenanceRecords: MaintenanceRecord[];
  insurancePolicyId?: string;
  depreciationVoucherIds: string[];
  qrCode?: string;
  /** GL links used by depreciation and disposal postings. */
  assetAccountId?: string;
  depExpenseAccountId?: string;
  accumDepAccountId?: string;
  attachmentName?: string;
  createdAt: string;
  // Cross-module link (set/cleared by HR's Asset Custody actions):
  custodianEmployeeId?: string;
  custodianName?: string;
  assignedAt?: string;
}

export interface MaintenanceRecord {
  id: string;
  date: string;
  type: 'preventive' | 'corrective' | 'emergency';
  description: string;
  cost: number;
  vendor?: string;
  nextMaintenanceDate?: string;
}

export interface DepreciationRun {
  id: string;
  periodId: string;
  periodName: string;
  runDate: string;
  status: 'pending' | 'completed' | 'posted';
  totalDepreciation: number;
  entriesCount: number;
  postedVoucherId?: string;
}

export interface DepreciationEntry {
  id: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  monthlyDepreciation: number;
  accumulatedDepreciation: number;
  netBookValue: number;
}
