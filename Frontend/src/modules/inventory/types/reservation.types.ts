export interface InventoryReservation {
  id: string;
  requisitionId: string;
  itemId: string;
  lotId?: string;
  locationId?: string;
  quantity: number;
  reservedBy: string;
  reservedAt: string;
  status: 'active' | 'released' | 'consumed';
  lockVersion: number;
}
