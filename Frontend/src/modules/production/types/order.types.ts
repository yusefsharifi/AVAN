export type OrderStatus = 'draft' | 'confirmed' | 'in_production' | 'completed' | 'cancelled';
export type OrderPriority = 'normal' | 'urgent' | 'critical';

export interface OrderLine {
  id: string;
  itemId: string;
  itemNameFa: string;
  itemSku: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  totalPrice: number;
  deliveredQuantity: number;
  status: 'pending' | 'in_production' | 'completed';
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  requiredDate: string;
  status: OrderStatus;
  priority: OrderPriority;
  lines: OrderLine[];
  totalValue: number;
  notes: string;
  createdAt: string;
  confirmedAt?: string;
  completedAt?: string;
}
