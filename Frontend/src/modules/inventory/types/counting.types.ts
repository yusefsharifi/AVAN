export type CountType = 'abc_based' | 'zone_based' | 'item_based' | 'blind_count' | 'full_physical';
export type CountSessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'recount_required';
export type CountSheetStatus = 'pending' | 'counted' | 'approved' | 'adjusted' | 'investigating';

export interface CountSheet {
  id: string;
  sessionId: string;
  locationId: string;
  locationCode?: string;
  itemId: string;
  itemName?: string;
  lotId?: string;
  lotNumber?: string;
  systemQuantity: number;
  countedQuantity?: number;
  variance?: number;
  variancePercent?: number;
  varianceValue?: number;
  countedBy?: string;
  countedAt?: string;
  approvedBy?: string;
  status: CountSheetStatus;
  reasonCode?: string;
}

export interface CycleCountSession {
  id: string;
  sessionNumber: string;
  warehouseId: string;
  warehouseName?: string;
  zoneId?: string;
  type: CountType;
  aItemsCount: number;
  bItemsCount: number;
  cItemsCount: number;
  status: CountSessionStatus;
  scheduledDate: string;
  completedDate?: string;
  countSheets: CountSheet[];
  totalVariance: number;
  totalVarianceValue: number;
  createdAt: string;
}
