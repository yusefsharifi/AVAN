import { Injectable, Logger } from '@nestjs/common';
import { IdopGateway } from '../../../gateway/idop.gateway';

@Injectable()
export class CmmsGatewayService {
  private readonly logger = new Logger(CmmsGatewayService.name);

  constructor(private readonly gateway: IdopGateway) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // Work Order Events
  // ═══════════════════════════════════════════════════════════════════════════

  emitWorkOrderCreated(data: {
    zoneId: string;
    workOrderId: string;
    workOrderNumber: string;
    title: string;
    assetName: string;
    priority: string;
    isEmergency: boolean;
    scheduledStart?: Date;
    slaDeadline?: Date;
    technicianId?: string;
  }): void {
    const payload = {
      workOrderId: data.workOrderId,
      workOrderNumber: data.workOrderNumber,
      title: data.title,
      assetName: data.assetName,
      priority: data.priority,
      isEmergency: data.isEmergency,
      scheduledStart: data.scheduledStart?.toISOString(),
      slaDeadline: data.slaDeadline?.toISOString(),
      timestamp: new Date().toISOString(),
    };

    this.gateway.emitToZone(data.zoneId, 'workorder:created', payload);

    if (data.technicianId) {
      this.gateway.emitToRoom(`technician:${data.technicianId}`, 'workorder:created', payload);
    }
  }

  emitWorkOrderAssigned(data: {
    technicianId: string;
    workOrderId: string;
    workOrderNumber: string;
    assetName: string;
    scheduledStart?: Date;
    slaDeadline?: Date;
  }): void {
    this.gateway.emitToRoom(`technician:${data.technicianId}`, 'workorder:assigned', {
      workOrderId: data.workOrderId,
      workOrderNumber: data.workOrderNumber,
      assetName: data.assetName,
      scheduledStart: data.scheduledStart?.toISOString(),
      slaDeadline: data.slaDeadline?.toISOString(),
      timestamp: new Date().toISOString(),
    });
  }

  emitWorkOrderStatusChanged(data: {
    zoneId: string;
    workOrderId: string;
    workOrderNumber: string;
    newStatus: string;
    assetName: string;
  }): void {
    this.gateway.emitToZone(data.zoneId, 'workorder:status:changed', {
      workOrderId: data.workOrderId,
      workOrderNumber: data.workOrderNumber,
      newStatus: data.newStatus,
      assetName: data.assetName,
      timestamp: new Date().toISOString(),
    });
  }

  emitWorkOrderCompleted(data: {
    zoneId: string;
    workOrderId: string;
    workOrderNumber: string;
    assetName: string;
    actualHours: number;
    totalCost: number;
  }): void {
    this.gateway.emitToZone(data.zoneId, 'workorder:completed', {
      workOrderId: data.workOrderId,
      workOrderNumber: data.workOrderNumber,
      assetName: data.assetName,
      actualHours: data.actualHours,
      totalCost: data.totalCost,
      timestamp: new Date().toISOString(),
    });
  }

  emitSlaBreach(data: {
    zoneId: string;
    workOrderId: string;
    workOrderNumber: string;
    assetName: string;
    priority: string;
    breachAt: string;
  }): void {
    this.gateway.emitToZone(data.zoneId, 'workorder:sla:breach', {
      workOrderId: data.workOrderId,
      workOrderNumber: data.workOrderNumber,
      assetName: data.assetName,
      priority: data.priority,
      breachAt: data.breachAt,
      timestamp: new Date().toISOString(),
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Maintenance Events
  // ═══════════════════════════════════════════════════════════════════════════

  emitMaintenanceDue(data: {
    zoneId: string;
    planId: string;
    assetName: string;
    maintenanceType: string;
    dueAt: Date;
    leadTimeDays: number;
  }): void {
    this.gateway.emitToZone(data.zoneId, 'maintenance:due', {
      planId: data.planId,
      assetName: data.assetName,
      maintenanceType: data.maintenanceType,
      dueAt: data.dueAt.toISOString(),
      leadTimeDays: data.leadTimeDays,
      timestamp: new Date().toISOString(),
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Spare Parts Events
  // ═══════════════════════════════════════════════════════════════════════════

  emitLowStock(data: {
    zoneId: string;
    sparePartId: string;
    partName: string;
    currentStock: number;
    minimumStock: number;
    reorderPoint: number;
  }): void {
    this.gateway.emitToZone(data.zoneId, 'spare-part:low-stock', {
      sparePartId: data.sparePartId,
      partName: data.partName,
      currentStock: data.currentStock,
      minimumStock: data.minimumStock,
      reorderPoint: data.reorderPoint,
      timestamp: new Date().toISOString(),
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Failure Events
  // ═══════════════════════════════════════════════════════════════════════════

  emitFailureReported(data: {
    zoneId: string;
    failureLogId: string;
    assetName: string;
    assetCategory: string;
    impactLevel: string;
    failedAt: Date;
  }): void {
    this.gateway.emitToZone(data.zoneId, 'failure:reported', {
      failureLogId: data.failureLogId,
      assetName: data.assetName,
      assetCategory: data.assetCategory,
      impactLevel: data.impactLevel,
      failedAt: data.failedAt.toISOString(),
      timestamp: new Date().toISOString(),
    });
  }

  emitAssetConditionCritical(data: {
    zoneId: string;
    assetId: string;
    assetName: string;
    condition: string;
    criticality: string;
  }): void {
    this.gateway.emitToZone(data.zoneId, 'asset:condition:critical', {
      assetId: data.assetId,
      assetName: data.assetName,
      condition: data.condition,
      criticality: data.criticality,
      timestamp: new Date().toISOString(),
    });
  }
}
