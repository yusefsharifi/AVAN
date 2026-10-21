export type WorkOrderStatus = 'planned' | 'released' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
export type LineStatus = 'idle' | 'running' | 'maintenance' | 'breakdown';

export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  salesOrderId: string;
  salesOrderNumber: string;
  itemId: string;
  itemNameFa: string;
  itemSku: string;
  plannedQuantity: number;
  actualQuantity: number;
  scrapQuantity: number;
  uom: string;
  lineId: string;
  lineName: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  status: WorkOrderStatus;
  priority: 'normal' | 'urgent' | 'critical';
  assignedShift: 'morning' | 'afternoon' | 'night';
  supervisorId?: string;
  supervisorName?: string;
  bomId: string;
  estimatedDurationHours: number;
  actualDurationHours?: number;
  createdAt: string;
}

export interface ProductionLine {
  id: string;
  code: string;
  nameFa: string;
  capacity: number;
  currentStatus: LineStatus;
  currentWorkOrderId?: string;
  shift: 'morning' | 'afternoon' | 'night' | 'offline';
  oee: number;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  supervisorName?: string;
}

export interface ProductionPlan {
  id: string;
  planNumber: string;
  month: string;
  status: 'draft' | 'approved' | 'in_progress' | 'completed';
  workOrders: string[];
  totalPlannedUnits: number;
  totalActualUnits: number;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}
