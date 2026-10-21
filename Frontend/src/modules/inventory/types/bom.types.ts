export interface BOMComponent {
  id: string;
  itemId: string;
  itemName?: string;
  quantity: number;
  uom: string;
  scrapFactor: number;
  operationSequence: number;
  isCritical: boolean;
}

export interface BOMLabor {
  id: string;
  operationName: string;
  standardHours: number;
  hourlyRate: number;
}

export interface BillOfMaterial {
  id: string;
  productItemId: string;
  productItemName?: string;
  version: string;
  isActive: boolean;
  companyId: string;
  components: BOMComponent[];
  laborOperations: BOMLabor[];
  overheadRate: number;
  standardCost: number;
  createdAt: string;
}

export interface MaterialRequirement {
  itemId: string;
  itemName: string;
  requiredQuantity: number;
  availableQuantity: number;
  shortage: number;
  uom: string;
  isCritical: boolean;
  suggestedReorder: number;
}
