export interface BOMLine {
  id: string;
  itemId: string;
  itemNameFa: string;
  itemSku: string;
  quantity: number;
  uom: string;
  scrapFactor: number;
  effectiveQuantity: number;
  isOptional: boolean;
  substituteItemId?: string;
  notes: string;
}

export interface BillOfMaterials {
  id: string;
  bomNumber: string;
  finishedItemId: string;
  finishedItemNameFa: string;
  finishedItemSku: string;
  version: string;
  status: 'draft' | 'active' | 'obsolete';
  outputQuantity: number;
  outputUom: string;
  lines: BOMLine[];
  totalMaterialCost: number;
  processingCost: number;
  totalCost: number;
  approvedBy?: string;
  approvedAt?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  createdAt: string;
}
