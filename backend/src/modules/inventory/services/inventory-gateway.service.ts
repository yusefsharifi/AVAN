import { Injectable, Logger } from '@nestjs/common';
import { IdopGateway } from '../../../gateway/idop.gateway';

@Injectable()
export class InventoryGatewayService {
  private readonly logger = new Logger(InventoryGatewayService.name);

  constructor(private readonly gateway: IdopGateway) {}

  emitLowStockAlert(data: { zoneId: string; companyId?: string; itemId: string; itemName: string; currentStock: number; reorderPoint: number; reorderQty: number }): void {
    this.gateway.emitToRoom(`zone:${data.zoneId}`, 'stock:low-alert', data);
    if (data.companyId) this.gateway.emitToRoom(`company:${data.companyId}`, 'stock:low-alert', data);
  }

  emitStockMovement(data: { zoneId: string; itemId: string; itemName: string; type: string; quantity: number; warehouseId: string; processedBy: string }): void {
    this.gateway.emitToRoom(`zone:${data.zoneId}`, 'stock:movement', data);
  }

  emitExpiryAlert(data: { zoneId: string; companyId?: string; itemId: string; itemName: string; batchNumber?: string; expiryDate: Date; quantity: number }): void {
    this.gateway.emitToRoom(`zone:${data.zoneId}`, 'stock:expiry:alert', data);
  }

  emitRequisitionCreated(data: { approverId: string; requisitionId: string; requisitionNumber: string; requestedByName: string; priority: string; requiredDate: string }): void {
    this.gateway.emitToRoom(`user:${data.approverId}`, 'requisition:created', data);
  }

  emitRequisitionApproved(data: { requestedBy: string; requisitionId: string; requisitionNumber: string; approverName: string }): void {
    this.gateway.emitToRoom(`user:${data.requestedBy}`, 'requisition:approved', data);
  }

  emitRequisitionItemsReady(data: { requestedBy: string; requisitionId: string; requisitionNumber: string; isFullyIssued: boolean }): void {
    this.gateway.emitToRoom(`user:${data.requestedBy}`, 'requisition:items-ready', data);
  }

  emitGrnCreated(data: { zoneId: string; receiptId: string; receiptNumber: string; vendorName: string; totalValue: bigint }): void {
    this.gateway.emitToRoom(`zone:${data.zoneId}`, 'grn:created', { ...data, totalValue: data.totalValue.toString() });
  }

  emitPoSentToVendor(data: { zoneId: string; companyId?: string; orderId: string; orderNumber: string; vendorName: string; grandTotal: bigint }): void {
    this.gateway.emitToRoom(`zone:${data.zoneId}`, 'po:sent-to-vendor', { ...data, grandTotal: data.grandTotal.toString() });
  }

  emitCountVarianceAlert(data: { zoneId: string; countId: string; countNumber: string; warehouseId: string; totalVarianceValue: bigint }): void {
    this.gateway.emitToRoom(`zone:${data.zoneId}`, 'count:variance-alert', { ...data, totalVarianceValue: data.totalVarianceValue.toString() });
  }
}
