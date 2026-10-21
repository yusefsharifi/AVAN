export type DOStatus = 'pending' | 'picking' | 'picked' | 'packing' | 'packed' | 'ready_to_ship' | 'shipped' | 'delivered';

export interface DOLineItem {
  id: string;
  itemId: string;
  itemName?: string;
  orderedQuantity: number;
  pickedQuantity: number;
  packedQuantity: number;
  uom: string;
  lotId?: string;
}

export interface PickListItem {
  id: string;
  itemId: string;
  itemName?: string;
  lotId: string;
  lotNumber?: string;
  locationId: string;
  locationCode?: string;
  quantity: number;
  pickedQuantity: number;
  pickedAt?: string;
  pickedBy?: string;
  verified: boolean;
}

export interface Package {
  id: string;
  packageNumber: string;
  weight: number;
  dimensions: { length: number; width: number; height: number };
  itemIds: string[];
  barcode: string;
}

export interface DispatchOrder {
  id: string;
  doNumber: string;
  salesOrderId?: string;
  shipmentId?: string;
  shipmentNumber?: string;
  customerId: string;
  customerName: string;
  companyId: string;
  warehouseId: string;
  warehouseName: string;
  lineItems: DOLineItem[];
  status: DOStatus;
  pickList: PickListItem[];
  pickedBy?: string;
  pickedAt?: string;
  packages: Package[];
  packedBy?: string;
  packedAt?: string;
  carrierName?: string;
  vehiclePlate?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  cogsImpact: number;
  journalVoucherId?: string;
  createdAt: string;
}
