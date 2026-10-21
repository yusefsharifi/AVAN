import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { REDIS_KEYS } from '../../../common/utils/redis-keys';
import {
  CreateWorkOrderDto,
  FilterWorkOrdersDto,
  CompleteWorkOrderDto,
  AssignTechnicianDto,
  UsedPartDto,
} from '../dto/create-dtos';
import { WorkOrderStatus } from '../dto/enums';
import type { WorkOrderStatsDto } from '../dto/enums';
import { CmmsGatewayService } from './cmms-gateway.service';
import {
  computeSlaDeadline,
  isValidWorkOrderTransition,
  selectBestTechnician,
  validateStockDeduction,
  computeWorkOrderCosts,
  computeDowntimeMinutes,
  computeNextDueDate,
} from '../utils/cmms.utils';
import { Prisma } from '@prisma/client';

@Injectable()
export class WorkOrderService {
  private readonly logger = new Logger(WorkOrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: CmmsGatewayService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════════════════════

  async create(dto: CreateWorkOrderDto, createdBy: string): Promise<any> {
    // 1. Verify asset
    const asset = await (this.prisma as any).asset.findUnique({ where: { id: dto.assetId } });
    if (!asset) throw new AppException('ASSET_NOT_FOUND');
    if (asset.status === 'DECOMMISSIONED') throw new AppException('ASSET_DECOMMISSIONED');

    // 2. Generate work order number
    const year = new Date().getFullYear().toString();
    const seqKey = `cmms:wo:seq:${dto.zoneId}:${year}`;
    const seq = await this.redis.incr(seqKey);
    const zone = await this.prisma.zone.findUnique({ where: { id: dto.zoneId } });
    const zoneCode = (zone as any)?.code || 'Z';
    const workOrderNumber = `WO-${zoneCode}-${year}-${seq.toString().padStart(6, '0')}`;

    // 3. SLA deadline
    const slaDeadline = computeSlaDeadline(dto.priority, dto.slaHours);

    // 4. Set asset to UNDER_MAINTENANCE if corrective
    if (dto.type === 'CORRECTIVE' || dto.isEmergency) {
      await (this.prisma as any).asset.update({
        where: { id: dto.assetId },
        data: { status: 'UNDER_MAINTENANCE' },
      });
    }

    // 5. Create work order
    const status = dto.assignedTechnicianId ? WorkOrderStatus.ASSIGNED : WorkOrderStatus.APPROVED;

    const workOrder = await (this.prisma as any).workOrder.create({
      data: {
        zoneId: dto.zoneId,
        assetId: dto.assetId,
        companyId: dto.companyId,
        workOrderNumber,
        type: dto.type,
        category: dto.category,
        priority: dto.priority,
        status,
        maintenancePlanId: dto.maintenancePlanId,
        failureLogId: dto.failureLogId,
        requestedBy: createdBy,
        isEmergency: dto.isEmergency || false,
        title: dto.title,
        description: dto.description,
        symptoms: dto.symptoms,
        assignedTechnicianId: dto.assignedTechnicianId,
        assignedContractorId: dto.assignedContractorId,
        scheduledStart: dto.scheduledStart ? new Date(dto.scheduledStart) : null,
        scheduledEnd: dto.scheduledEnd ? new Date(dto.scheduledEnd) : null,
        estimatedHours: dto.estimatedHours ? new Prisma.Decimal(dto.estimatedHours) : null,
        slaHours: dto.slaHours || 24,
        slaDeadline,
        checklistItems: dto.checklistItems || [],
        createdBy,
      },
    });

    // 6. Lookup technician name for notify
    let assetName = asset.nameFa;
    let technicianName: string | null = null;
    if (dto.assignedTechnicianId) {
      const tech = await (this.prisma as any).technician.findUnique({
        where: { id: dto.assignedTechnicianId },
      });
      if (tech) {
        technicianName = tech.name;
        await (this.prisma as any).technician.update({
          where: { id: dto.assignedTechnicianId },
          data: { activeWorkOrders: { increment: 1 } },
        });
      }
    }

    // 7. Emit events
    this.gateway.emitWorkOrderCreated({
      zoneId: dto.zoneId,
      workOrderId: workOrder.id,
      workOrderNumber,
      title: dto.title,
      assetName,
      priority: dto.priority,
      isEmergency: dto.isEmergency || false,
      scheduledStart: dto.scheduledStart ? new Date(dto.scheduledStart) : undefined,
      slaDeadline,
      technicianId: dto.assignedTechnicianId,
    });

    // 8. Audit
    await this.audit.log({
      zoneId: dto.zoneId,
      userId: createdBy,
      targetId: workOrder.id,
      targetType: 'WorkOrder',
      action: 'WORK_ORDER_CREATED',
      metadata: {
        workOrderNumber,
        type: dto.type,
        priority: dto.priority,
        assetNumber: asset.assetNumber,
        isEmergency: dto.isEmergency,
      },
    });

    return { ...workOrder, assignedTechnicianName: technicianName };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS TRANSITIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async approve(id: string, approvedBy: string): Promise<any> {
    const wo = await this.findById(id);
    this.assertTransition(wo.status, 'APPROVED');

    const updated = await (this.prisma as any).workOrder.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy, approvedAt: new Date() },
    });

    await this.audit.log({
      zoneId: wo.zoneId, userId: approvedBy, targetId: id, targetType: 'WorkOrder',
      action: 'WORK_ORDER_APPROVED', metadata: { workOrderNumber: wo.workOrderNumber },
    });

    return updated;
  }

  async assign(id: string, technicianId: string, assignedBy: string): Promise<any> {
    const wo = await this.findById(id);
    this.assertTransition(wo.status, 'ASSIGNED');

    const tech = await (this.prisma as any).technician.findUnique({ where: { id: technicianId } });
    if (!tech) throw new AppException('TECHNICIAN_NOT_FOUND');
    if (!tech.isActive) throw new AppException('TECHNICIAN_UNAVAILABLE');

    const updated = await (this.prisma as any).workOrder.update({
      where: { id },
      data: {
        status: 'ASSIGNED',
        assignedTechnicianId: technicianId,
        assignedTechnicianName: tech.name,
      },
    });

    // Increment active count
    await (this.prisma as any).technician.update({
      where: { id: technicianId },
      data: { activeWorkOrders: { increment: 1 } },
    });

    this.gateway.emitWorkOrderAssigned({
      technicianId,
      workOrderId: id,
      workOrderNumber: wo.workOrderNumber,
      assetName: wo.asset?.nameFa || '',
      scheduledStart: wo.scheduledStart,
      slaDeadline: wo.slaDeadline,
    });

    await this.audit.log({
      zoneId: wo.zoneId, userId: assignedBy, targetId: id, targetType: 'WorkOrder',
      action: 'WORK_ORDER_ASSIGNED', metadata: { workOrderNumber: wo.workOrderNumber, technicianId },
    });

    return updated;
  }

  async startWork(id: string, startedBy: string): Promise<any> {
    const wo = await this.findById(id);
    this.assertTransition(wo.status, 'IN_PROGRESS');

    const updated = await (this.prisma as any).workOrder.update({
      where: { id },
      data: { status: 'IN_PROGRESS', actualStart: new Date() },
    });

    await this.audit.log({
      zoneId: wo.zoneId, userId: startedBy, targetId: id, targetType: 'WorkOrder',
      action: 'WORK_ORDER_STARTED', metadata: { workOrderNumber: wo.workOrderNumber },
    });

    return updated;
  }

  async putOnHold(id: string, reason: string, putOnHoldBy: string): Promise<any> {
    const wo = await this.findById(id);
    this.assertTransition(wo.status, 'ON_HOLD');

    const updated = await (this.prisma as any).workOrder.update({
      where: { id },
      data: { status: 'ON_HOLD', notes: `${wo.notes || ''}\nOn hold: ${reason}` },
    });

    this.gateway.emitWorkOrderStatusChanged({
      zoneId: wo.zoneId, workOrderId: id, workOrderNumber: wo.workOrderNumber,
      newStatus: 'ON_HOLD', assetName: wo.asset?.nameFa || '',
    });

    return updated;
  }

  async resumeWork(id: string, resumedBy: string): Promise<any> {
    const wo = await this.findById(id);
    this.assertTransition(wo.status, 'IN_PROGRESS');

    return (this.prisma as any).workOrder.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLETE
  // ═══════════════════════════════════════════════════════════════════════════

  async complete(id: string, dto: CompleteWorkOrderDto, completedBy: string): Promise<any> {
    const wo = await this.findById(id);
    this.assertTransition(wo.status, 'COMPLETED');

    // Process parts used
    let partsCost = 0;
    if (dto.partsUsed && dto.partsUsed.length > 0) {
      for (const part of dto.partsUsed) {
        const sparePart = await (this.prisma as any).sparePart.findUnique({
          where: { id: part.sparePartId },
        });
        if (!sparePart) throw new AppException('SPARE_PART_NOT_FOUND');

        const validation = validateStockDeduction(
          Number(sparePart.currentStock),
          part.quantityUsed,
          Number(sparePart.minimumStock),
          Number(sparePart.reorderPoint),
        );

        if (!validation.valid) {
          throw new AppException('SPARE_PART_INSUFFICIENT_STOCK');
        }

        // Deduct stock
        const newStock = new Prisma.Decimal(validation.newStock);
        await (this.prisma as any).sparePart.update({
          where: { id: part.sparePartId },
          data: {
            currentStock: newStock,
            isLowStock: validation.wouldBeLowStock,
          },
        });

        // Create WorkOrderPart
        const totalPartCost = part.quantityUsed * part.unitCost;
        await (this.prisma as any).workOrderPart.create({
          data: {
            workOrderId: id,
            sparePartId: part.sparePartId,
            partName: sparePart.nameFa,
            partNumber: sparePart.partNumber,
            quantityUsed: new Prisma.Decimal(part.quantityUsed),
            unitCost: BigInt(part.unitCost),
            totalCost: BigInt(Math.round(totalPartCost)),
            issuedBy: completedBy,
          },
        });

        // Create movement
        await (this.prisma as any).sparePartMovement.create({
          data: {
            zoneId: wo.zoneId,
            sparePartId: part.sparePartId,
            workOrderId: id,
            type: 'ISSUE',
            quantity: new Prisma.Decimal(part.quantityUsed),
            beforeQty: sparePart.currentStock,
            afterQty: newStock,
            unitCost: BigInt(part.unitCost),
            totalCost: BigInt(Math.round(totalPartCost)),
            reason: `Work order ${wo.workOrderNumber}`,
            performedBy: completedBy,
          },
        });

        partsCost += totalPartCost;

        // Reorder alert
        if (validation.wouldTriggerReorder) {
          this.gateway.emitLowStock({
            zoneId: wo.zoneId,
            sparePartId: part.sparePartId,
            partName: sparePart.nameFa,
            currentStock: validation.newStock,
            minimumStock: Number(sparePart.minimumStock),
            reorderPoint: Number(sparePart.reorderPoint),
          });
        }
      }
    }

    // Calculate costs
    const costs = computeWorkOrderCosts(
      dto.actualHours,
      0, // default hourly rate (configurable)
      partsCost,
      dto.contractorCost || 0,
    );

    const laborCost = dto.laborCost || costs.laborCost;

    // Update work order
    const updated = await (this.prisma as any).workOrder.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        resolution: dto.resolution,
        rootCause: dto.rootCause,
        failureCause: dto.failureCause,
        actualEnd: new Date(),
        actualHours: new Prisma.Decimal(dto.actualHours),
        laborCost: BigInt(laborCost),
        partsCost: BigInt(Math.round(partsCost)),
        contractorCost: BigInt(dto.contractorCost || 0),
        totalCost: BigInt(laborCost + Math.round(partsCost) + (dto.contractorCost || 0)),
        meterAfterWork: dto.meterAfterWork ? new Prisma.Decimal(dto.meterAfterWork) : null,
        checklistItems: dto.checklistItems || wo.checklistItems,
        imageKeys: dto.imageKeys || wo.imageKeys,
        notes: dto.notes ? `${wo.notes || ''}\n${dto.notes}` : wo.notes,
      },
    });

    // Restore asset status
    await (this.prisma as any).asset.update({
      where: { id: wo.assetId },
      data: { status: 'ACTIVE' },
    });

    // Update technician stats
    if (wo.assignedTechnicianId) {
      await (this.prisma as any).technician.update({
        where: { id: wo.assignedTechnicianId },
        data: {
          activeWorkOrders: { decrement: 1 },
          completedWorkOrders: { increment: 1 },
        },
      });
    }

    // Update failure log if linked
    if (wo.failureLogId) {
      const downtime = wo.scheduledStart
        ? computeDowntimeMinutes(wo.scheduledStart, new Date())
        : null;

      await (this.prisma as any).failureLog.update({
        where: { id: wo.failureLogId },
        data: { restoredAt: new Date(), downtime },
      });
    }

    // Update maintenance plan if linked
    if (wo.maintenancePlanId) {
      const plan = await (this.prisma as any).maintenancePlan.findUnique({
        where: { id: wo.maintenancePlanId },
      });
      if (plan) {
        const nextDue = computeNextDueDate(
          plan.triggerType,
          new Date(),
          plan.intervalDays || null,
          plan.intervalUnit || null,
          dto.meterAfterWork ?? null,
          plan.intervalMeter ? Number(plan.intervalMeter) : null,
        );

        await (this.prisma as any).maintenancePlan.update({
          where: { id: wo.maintenancePlanId },
          data: {
            lastExecutedAt: new Date(),
            nextDueAt: nextDue.nextDueAt,
            nextDueMeter: nextDue.nextDueMeter ? new Prisma.Decimal(nextDue.nextDueMeter) : plan.nextDueMeter,
            lastMaintenanceMeter: dto.meterAfterWork ? new Prisma.Decimal(dto.meterAfterWork) : plan.lastMaintenanceMeter,
          },
        });
      }
    }

    // Emit completion event
    this.gateway.emitWorkOrderCompleted({
      zoneId: wo.zoneId,
      workOrderId: id,
      workOrderNumber: wo.workOrderNumber,
      assetName: wo.asset?.nameFa || '',
      actualHours: dto.actualHours,
      totalCost: updated.totalCost ? Number(updated.totalCost) : 0,
    });

    await this.audit.log({
      zoneId: wo.zoneId, userId: completedBy, targetId: id, targetType: 'WorkOrder',
      action: 'WORK_ORDER_COMPLETED',
      metadata: {
        workOrderNumber: wo.workOrderNumber,
        actualHours: dto.actualHours,
        totalCost: Number(updated.totalCost),
        partsUsed: dto.partsUsed?.length || 0,
      },
    });

    return updated;
  }

  async verify(id: string, verifiedBy: string, notes?: string): Promise<any> {
    const wo = await this.findById(id);
    this.assertTransition(wo.status, 'VERIFIED');

    const updated = await (this.prisma as any).workOrder.update({
      where: { id },
      data: {
        status: 'VERIFIED',
        notes: notes ? `${wo.notes || ''}\nVerified: ${notes}` : wo.notes,
      },
    });

    await this.audit.log({
      zoneId: wo.zoneId, userId: verifiedBy, targetId: id, targetType: 'WorkOrder',
      action: 'WORK_ORDER_VERIFIED', metadata: { workOrderNumber: wo.workOrderNumber },
    });

    return updated;
  }

  async close(id: string, closedBy: string): Promise<any> {
    const wo = await this.findById(id);
    this.assertTransition(wo.status, 'CLOSED');

    const updated = await (this.prisma as any).workOrder.update({
      where: { id },
      data: { status: 'CLOSED' },
    });

    await this.audit.log({
      zoneId: wo.zoneId, userId: closedBy, targetId: id, targetType: 'WorkOrder',
      action: 'WORK_ORDER_CLOSED', metadata: { workOrderNumber: wo.workOrderNumber },
    });

    return updated;
  }

  async cancel(id: string, reason: string, cancelledBy: string): Promise<any> {
    const wo = await this.findById(id);
    this.assertTransition(wo.status, 'CANCELLED');

    const updated = await (this.prisma as any).workOrder.update({
      where: { id },
      data: { status: 'CANCELLED', notes: `${wo.notes || ''}\nCancelled: ${reason}` },
    });

    // Restore asset status if it was set to UNDER_MAINTENANCE
    if (wo.asset?.status === 'UNDER_MAINTENANCE') {
      await (this.prisma as any).asset.update({
        where: { id: wo.assetId },
        data: { status: 'ACTIVE' },
      });
    }

    // Restore technician active count
    if (wo.assignedTechnicianId) {
      await (this.prisma as any).technician.update({
        where: { id: wo.assignedTechnicianId },
        data: { activeWorkOrders: { decrement: 1 } },
      });
    }

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADD PART
  // ═══════════════════════════════════════════════════════════════════════════

  async addPart(id: string, dto: UsedPartDto, addedBy: string): Promise<any> {
    const wo = await this.findById(id);

    const sparePart = await (this.prisma as any).sparePart.findUnique({
      where: { id: dto.sparePartId },
    });
    if (!sparePart) throw new AppException('SPARE_PART_NOT_FOUND');

    const validation = validateStockDeduction(
      Number(sparePart.currentStock),
      dto.quantityUsed,
      Number(sparePart.minimumStock),
      Number(sparePart.reorderPoint),
    );

    if (!validation.valid) {
      throw new AppException('SPARE_PART_INSUFFICIENT_STOCK');
    }

    await (this.prisma as any).sparePart.update({
      where: { id: dto.sparePartId },
      data: { currentStock: new Prisma.Decimal(validation.newStock), isLowStock: validation.wouldBeLowStock },
    });

    const totalCost = dto.quantityUsed * dto.unitCost;
    const part = await (this.prisma as any).workOrderPart.create({
      data: {
        workOrderId: id,
        sparePartId: dto.sparePartId,
        partName: sparePart.nameFa,
        partNumber: sparePart.partNumber,
        quantityUsed: new Prisma.Decimal(dto.quantityUsed),
        unitCost: BigInt(dto.unitCost),
        totalCost: BigInt(Math.round(totalCost)),
        issuedBy: addedBy,
      },
    });

    await (this.prisma as any).sparePartMovement.create({
      data: {
        zoneId: wo.zoneId,
        sparePartId: dto.sparePartId,
        workOrderId: id,
        type: 'ISSUE',
        quantity: new Prisma.Decimal(dto.quantityUsed),
        beforeQty: sparePart.currentStock,
        afterQty: new Prisma.Decimal(validation.newStock),
        unitCost: BigInt(dto.unitCost),
        totalCost: BigInt(Math.round(totalCost)),
        reason: `Work order ${wo.workOrderNumber}`,
        performedBy: addedBy,
      },
    });

    // Update work order partsCost
    await (this.prisma as any).workOrder.update({
      where: { id },
      data: { partsCost: { increment: BigInt(Math.round(totalCost)) }, totalCost: { increment: BigInt(Math.round(totalCost)) } },
    });

    await this.audit.log({
      zoneId: wo.zoneId, userId: addedBy, targetId: id, targetType: 'WorkOrder',
      action: 'PART_ADDED_TO_WORK_ORDER',
      metadata: { workOrderNumber: wo.workOrderNumber, partName: sparePart.nameFa, quantity: dto.quantityUsed },
    });

    return part;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  async findAll(filter: FilterWorkOrdersDto): Promise<any> {
    const where: any = {};
    if (filter.zoneId) where.zoneId = filter.zoneId;
    if (filter.assetId) where.assetId = filter.assetId;
    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;
    if (filter.priority) where.priority = filter.priority;
    if (filter.assignedTechnicianId) where.assignedTechnicianId = filter.assignedTechnicianId;
    if (filter.slaBreached !== undefined) where.slaBreached = filter.slaBreached;
    if (filter.isEmergency !== undefined) where.isEmergency = filter.isEmergency;
    if (filter.fromDate || filter.toDate) {
      where.createdAt = {};
      if (filter.fromDate) where.createdAt.gte = new Date(filter.fromDate);
      if (filter.toDate) where.createdAt.lte = new Date(filter.toDate);
    }

    const limit = filter.limit || 20;
    const data = await (this.prisma as any).workOrder.findMany({
      where,
      include: { asset: true },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    });

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;

    return { data: items, meta: { limit, hasMore, cursor: hasMore ? items[items.length - 1].id : null } };
  }

  async findById(id: string): Promise<any> {
    const wo = await (this.prisma as any).workOrder.findUnique({
      where: { id },
      include: { asset: true, maintenancePlan: true, partsUsedRecords: { include: { sparePart: true } } },
    });
    if (!wo) throw new AppException('WORK_ORDER_NOT_FOUND');
    return wo;
  }

  async getMyWorkOrders(technicianId: string, zoneId: string, status?: WorkOrderStatus): Promise<any[]> {
    const where: any = { assignedTechnicianId: technicianId, zoneId };
    if (status) where.status = status;

    return (this.prisma as any).workOrder.findMany({
      where,
      include: { asset: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLA CHECK (called by job)
  // ═══════════════════════════════════════════════════════════════════════════

  async checkSlaBreaches(zoneId: string): Promise<void> {
    const breached = await (this.prisma as any).workOrder.findMany({
      where: {
        zoneId,
        slaBreached: false,
        slaDeadline: { lt: new Date() },
        status: { notIn: ['COMPLETED', 'VERIFIED', 'CLOSED', 'CANCELLED'] },
      },
      include: { asset: true },
    });

    for (const wo of breached) {
      await (this.prisma as any).workOrder.update({
        where: { id: wo.id },
        data: { slaBreached: true },
      });

      this.gateway.emitSlaBreach({
        zoneId,
        workOrderId: wo.id,
        workOrderNumber: wo.workOrderNumber,
        assetName: wo.asset?.nameFa || '',
        priority: wo.priority,
        breachAt: new Date().toISOString(),
      });

      await this.audit.log({
        zoneId, userId: 'system', targetId: wo.id, targetType: 'WorkOrder',
        action: 'WORK_ORDER_SLA_BREACH',
        metadata: { workOrderNumber: wo.workOrderNumber, priority: wo.priority },
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTO-ASSIGN
  // ═══════════════════════════════════════════════════════════════════════════

  async autoAssignTechnician(workOrderId: string): Promise<any | null> {
    const wo = await this.findById(workOrderId);

    const technicians = await (this.prisma as any).technician.findMany({
      where: { zoneId: wo.zoneId, isActive: true, isAvailable: true },
    });

    const skillMap: Record<string, string> = {
      MECHANICAL: 'مکانیک',
      ELECTRICAL: 'برق',
      ELECTRONIC: 'الکترونیک',
      IT: 'IT',
      CALIBRATION: 'کالیبراسیون',
      GENERAL: 'عمومی',
      CIVIL: 'عمرانی',
    };

    const requiredSkill = skillMap[wo.category] || null;

    const best = selectBestTechnician(
      technicians.map((t: any) => ({
        id: t.id,
        name: t.name,
        specializations: t.specializations,
        isAvailable: t.isAvailable,
        isActive: t.isActive,
        activeWorkOrders: t.activeWorkOrders,
      })),
      requiredSkill,
    );

    return best || null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATS
  // ═══════════════════════════════════════════════════════════════════════════

  async getWorkOrderStats(zoneId: string): Promise<WorkOrderStatsDto> {
    const all = await (this.prisma as any).workOrder.findMany({ where: { zoneId } });

    const byType = new Map<string, number>();
    const byStatus = new Map<string, number>();
    const byPriority = new Map<string, number>();
    const byTech = new Map<string, { count: number; totalHours: number }>();

    let slaBreached = 0;
    let totalHours = 0;
    let totalDowntime = 0;
    let totalCost = 0;
    let laborCost = 0;
    let partsCost = 0;
    let contractorCost = 0;
    let completedCount = 0;
    let downtimeCount = 0;

    for (const wo of all) {
      byType.set(wo.type, (byType.get(wo.type) || 0) + 1);
      byStatus.set(wo.status, (byStatus.get(wo.status) || 0) + 1);
      byPriority.set(wo.priority, (byPriority.get(wo.priority) || 0) + 1);

      if (wo.slaBreached) slaBreached++;
      if (wo.actualHours) totalHours += Number(wo.actualHours);
      if (wo.downtime) { totalDowntime += wo.downtime; downtimeCount++; }
      totalCost += Number(wo.totalCost || 0);
      laborCost += Number(wo.laborCost || 0);
      partsCost += Number(wo.partsCost || 0);
      contractorCost += Number(wo.contractorCost || 0);
      if (['COMPLETED', 'VERIFIED', 'CLOSED'].includes(wo.status)) completedCount++;

      if (wo.assignedTechnicianId && wo.actualHours) {
        const existing = byTech.get(wo.assignedTechnicianId) || { count: 0, totalHours: 0 };
        existing.count++;
        existing.totalHours += Number(wo.actualHours);
        byTech.set(wo.assignedTechnicianId, existing);
      }
    }

    // Resolve technician names
    const techEntries: { name: string; count: number; avgHours: number }[] = [];
    for (const [techId, data] of byTech) {
      const tech = await (this.prisma as any).technician.findUnique({ where: { id: techId } });
      techEntries.push({
        name: tech?.name || techId,
        count: data.count,
        avgHours: Math.round((data.totalHours / data.count) * 100) / 100,
      });
    }

    const emergencyCount = all.filter((wo: any) => wo.isEmergency).length;

    return {
      total: all.length,
      byType: Array.from(byType.entries()).map(([type, count]) => ({ type, count })),
      byStatus: Array.from(byStatus.entries()).map(([status, count]) => ({ status, count })),
      byPriority: Array.from(byPriority.entries()).map(([priority, count]) => ({ priority, count })),
      emergency: emergencyCount,
      slaBreached,
      slaComplianceRate: all.length > 0 ? Math.round(((all.length - slaBreached) / all.length) * 100) : 100,
      avgCompletionHours: completedCount > 0 ? Math.round((totalHours / completedCount) * 100) / 100 : 0,
      avgDowntimeMinutes: downtimeCount > 0 ? Math.round(totalDowntime / downtimeCount) : 0,
      totalCost,
      laborCost,
      partsCost,
      contractorCost,
      byTechnician: techEntries,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FILE UPLOAD
  // ═══════════════════════════════════════════════════════════════════════════

  async uploadImage(id: string, file: Express.Multer.File): Promise<string> {
    const wo = await this.findById(id);
    const ext = file.originalname.split('.').pop() || 'jpg';
    const key = `cmms-workorders/${id}/${Date.now()}.${ext}`;

    await (this.prisma as any).workOrder.update({
      where: { id },
      data: { imageKeys: { push: key } },
    });

    return key;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private assertTransition(currentStatus: string, nextStatus: string): void {
    if (!isValidWorkOrderTransition(currentStatus, nextStatus)) {
      throw new AppException('WORK_ORDER_INVALID_TRANSITION', {
        details: { currentStatus, nextStatus },
      });
    }
  }
}
