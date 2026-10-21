import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreateMaintenancePlanDto } from '../dto/create-dtos';
import { TriggerType } from '../dto/enums';
import type { UpcomingMaintenanceDto, CalendarEventDto, MaintenanceStatsDto } from '../dto/enums';
import { CmmsGatewayService } from './cmms-gateway.service';
import { computeNextDueDate } from '../utils/cmms.utils';
import { Prisma } from '@prisma/client';

@Injectable()
export class MaintenancePlanService {
  private readonly logger = new Logger(MaintenancePlanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: CmmsGatewayService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════════════════════

  async create(dto: CreateMaintenancePlanDto, createdBy: string): Promise<any> {
    // 1. Verify asset exists
    const asset = await (this.prisma as any).asset.findUnique({ where: { id: dto.assetId } });
    if (!asset) throw new AppException('ASSET_NOT_FOUND');

    // 2. Generate plan number
    const seqKey = `cmms:plan:seq:${asset.assetNumber}`;
    const seq = await this.redis.incr(seqKey);
    const planNumber = `MP-${asset.assetNumber}-${seq.toString().padStart(3, '0')}`;

    // 3. Calculate initial nextDueAt
    let nextDueAt: Date | null = null;
    let nextDueMeter: Prisma.Decimal | null = null;

    if (dto.triggerType === TriggerType.TIME_BASED && dto.intervalDays) {
      nextDueAt = new Date();
      if (dto.intervalUnit === 'month') {
        nextDueAt.setMonth(nextDueAt.getMonth() + dto.intervalDays);
      } else if (dto.intervalUnit === 'week') {
        nextDueAt.setDate(nextDueAt.getDate() + dto.intervalDays * 7);
      } else {
        nextDueAt.setDate(nextDueAt.getDate() + dto.intervalDays);
      }
    }

    if (dto.triggerType === TriggerType.METER_BASED && dto.intervalMeter) {
      const currentMeter = asset.currentMeterValue ? Number(asset.currentMeterValue) : 0;
      nextDueMeter = new Prisma.Decimal(currentMeter + dto.intervalMeter);
    }

    // 4. Create plan
    const plan = await (this.prisma as any).maintenancePlan.create({
      data: {
        zoneId: dto.zoneId,
        assetId: dto.assetId,
        planNumber,
        nameFa: dto.nameFa,
        description: dto.description,
        type: dto.type,
        category: dto.category,
        triggerType: dto.triggerType,
        intervalDays: dto.intervalDays,
        intervalUnit: dto.intervalUnit,
        intervalMeter: dto.intervalMeter ? new Prisma.Decimal(dto.intervalMeter) : null,
        conditionThreshold: dto.conditionThreshold,
        conditionField: dto.conditionField,
        estimatedHours: dto.estimatedHours ? new Prisma.Decimal(dto.estimatedHours) : null,
        estimatedCost: dto.estimatedCost ? BigInt(dto.estimatedCost) : null,
        skillRequired: dto.skillRequired,
        instructions: dto.instructions,
        checklistItems: dto.checklistItems || [],
        requiredParts: dto.requiredParts || [],
        leadTimeDays: dto.leadTimeDays ?? 3,
        nextDueAt,
        nextDueMeter,
        createdBy,
      },
    });

    // 5. Audit
    await this.audit.log({
      zoneId: dto.zoneId,
      userId: createdBy,
      targetId: plan.id,
      targetType: 'MaintenancePlan',
      action: 'PLAN_CREATED',
      metadata: { planNumber, assetNumber: asset.assetNumber, type: dto.type, triggerType: dto.triggerType },
    });

    return plan;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE / ACTIVATE / DEACTIVATE
  // ═══════════════════════════════════════════════════════════════════════════

  async update(id: string, dto: Partial<CreateMaintenancePlanDto>): Promise<any> {
    const existing = await (this.prisma as any).maintenancePlan.findUnique({ where: { id } });
    if (!existing) throw new AppException('PLAN_NOT_FOUND');

    const updateData: any = {};
    if (dto.nameFa !== undefined) updateData.nameFa = dto.nameFa;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.triggerType !== undefined) updateData.triggerType = dto.triggerType;
    if (dto.intervalDays !== undefined) updateData.intervalDays = dto.intervalDays;
    if (dto.intervalUnit !== undefined) updateData.intervalUnit = dto.intervalUnit;
    if (dto.intervalMeter !== undefined) updateData.intervalMeter = new Prisma.Decimal(dto.intervalMeter);
    if (dto.estimatedHours !== undefined) updateData.estimatedHours = new Prisma.Decimal(dto.estimatedHours);
    if (dto.estimatedCost !== undefined) updateData.estimatedCost = BigInt(dto.estimatedCost);
    if (dto.skillRequired !== undefined) updateData.skillRequired = dto.skillRequired;
    if (dto.instructions !== undefined) updateData.instructions = dto.instructions;
    if (dto.checklistItems !== undefined) updateData.checklistItems = dto.checklistItems;
    if (dto.requiredParts !== undefined) updateData.requiredParts = dto.requiredParts;
    if (dto.leadTimeDays !== undefined) updateData.leadTimeDays = dto.leadTimeDays;

    return (this.prisma as any).maintenancePlan.update({ where: { id }, data: updateData });
  }

  async activate(id: string): Promise<any> {
    const plan = await (this.prisma as any).maintenancePlan.findUnique({ where: { id } });
    if (!plan) throw new AppException('PLAN_NOT_FOUND');
    if (plan.isActive) throw new AppException('PLAN_ALREADY_ACTIVE');

    return (this.prisma as any).maintenancePlan.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async deactivate(id: string): Promise<any> {
    const plan = await (this.prisma as any).maintenancePlan.findUnique({ where: { id } });
    if (!plan) throw new AppException('PLAN_NOT_FOUND');

    return (this.prisma as any).maintenancePlan.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  async findAll(zoneId: string, limit = 20, cursor?: string): Promise<any> {
    const where: any = { zoneId };

    const data = await (this.prisma as any).maintenancePlan.findMany({
      where,
      include: { asset: true },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;

    return {
      data: items,
      meta: { limit, hasMore, cursor: hasMore ? items[items.length - 1].id : null },
    };
  }

  async findById(id: string): Promise<any> {
    const plan = await (this.prisma as any).maintenancePlan.findUnique({
      where: { id },
      include: { asset: true },
    });
    if (!plan) throw new AppException('PLAN_NOT_FOUND');
    return plan;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPCOMING MAINTENANCE
  // ═══════════════════════════════════════════════════════════════════════════

  async getUpcomingMaintenance(zoneId: string, withinDays: number): Promise<UpcomingMaintenanceDto[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + withinDays);

    const plans = await (this.prisma as any).maintenancePlan.findMany({
      where: {
        zoneId,
        isActive: true,
        nextDueAt: { lte: targetDate, gte: new Date() },
      },
      include: { asset: true },
      orderBy: { nextDueAt: 'asc' },
    });

    return plans.map((p: any) => ({
      planId: p.id,
      planNumber: p.planNumber,
      assetId: p.asset.id,
      assetNumber: p.asset.assetNumber,
      assetName: p.asset.nameFa,
      type: p.type,
      category: p.category,
      nextDueAt: p.nextDueAt,
      leadTimeDays: p.leadTimeDays,
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAINTENANCE CALENDAR
  // ═══════════════════════════════════════════════════════════════════════════

  async getMaintenanceCalendar(zoneId: string, month: number, year: number): Promise<CalendarEventDto[]> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const plans = await (this.prisma as any).maintenancePlan.findMany({
      where: {
        zoneId,
        isActive: true,
        nextDueAt: { gte: start, lte: end },
      },
      include: { asset: true },
    });

    return plans.map((p: any) => ({
      date: p.nextDueAt.toISOString().split('T')[0],
      planId: p.id,
      planNumber: p.planNumber,
      assetId: p.asset.id,
      assetName: p.asset.nameFa,
      type: p.type,
      category: p.category,
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATE WORK ORDER
  // ═══════════════════════════════════════════════════════════════════════════

  async generateWorkOrder(planId: string, generatedBy: string): Promise<any> {
    const plan = await (this.prisma as any).maintenancePlan.findUnique({
      where: { id: planId },
      include: { asset: true },
    });
    if (!plan) throw new AppException('PLAN_NOT_FOUND');

    // Generate work order number
    const year = new Date().getFullYear().toString();
    const seqKey = `cmms:wo:seq:${plan.zoneId}:${year}`;
    const seq = await this.redis.incr(seqKey);
    const zone = await this.prisma.zone.findUnique({ where: { id: plan.zoneId } });
    const zoneCode = (zone as any)?.code || 'Z';
    const workOrderNumber = `WO-${zoneCode}-${year}-${seq.toString().padStart(6, '0')}`;

    // Auto-assign technician
    let assignedTechnicianId: string | null = null;
    let assignedTechnicianName: string | null = null;

    if (plan.skillRequired) {
      const technicians = await (this.prisma as any).technician.findMany({
        where: { zoneId: plan.zoneId, isActive: true, isAvailable: true },
      });

      const match = technicians.find((t: any) =>
        t.specializations.includes(plan.skillRequired),
      );

      if (match) {
        assignedTechnicianId = match.id;
        assignedTechnicianName = match.name;
      }
    }

    // Create work order
    const workOrder = await (this.prisma as any).workOrder.create({
      data: {
        zoneId: plan.zoneId,
        assetId: plan.assetId,
        companyId: plan.asset.companyId,
        workOrderNumber,
        type: 'PREVENTIVE',
        category: plan.category,
        priority: 'NORMAL',
        status: assignedTechnicianId ? 'ASSIGNED' : 'APPROVED',
        maintenancePlanId: planId,
        title: `${plan.nameFa} — ${plan.asset.nameFa}`,
        description: plan.instructions || plan.description || `نگهداری پیشگیرانه: ${plan.nameFa}`,
        assignedTechnicianId,
        assignedTechnicianName,
        scheduledStart: plan.nextDueAt,
        estimatedHours: plan.estimatedHours,
        slaHours: 24,
        checklistItems: plan.checklistItems || [],
        createdBy: generatedBy,
      },
    });

    // Update plan
    const nextDue = computeNextDueDate(
      plan.triggerType,
      new Date(),
      plan.intervalDays,
      plan.intervalUnit,
      null,
      plan.intervalMeter ? Number(plan.intervalMeter) : null,
    );

    await (this.prisma as any).maintenancePlan.update({
      where: { id: planId },
      data: {
        lastExecutedAt: new Date(),
        nextDueAt: nextDue.nextDueAt,
        nextDueMeter: nextDue.nextDueMeter ? new Prisma.Decimal(nextDue.nextDueMeter) : plan.nextDueMeter,
      },
    });

    // Notify assigned technician
    if (assignedTechnicianId) {
      this.gateway.emitWorkOrderAssigned({
        technicianId: assignedTechnicianId,
        workOrderId: workOrder.id,
        workOrderNumber,
        assetName: plan.asset.nameFa,
        scheduledStart: plan.nextDueAt || undefined,
      });
    }

    await this.audit.log({
      zoneId: plan.zoneId,
      userId: generatedBy,
      targetId: workOrder.id,
      targetType: 'WorkOrder',
      action: 'WORK_ORDER_CREATED',
      metadata: { workOrderNumber, planNumber: plan.planNumber, assetNumber: plan.asset.assetNumber },
    });

    return workOrder;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK DUE PLANS (called by job)
  // ═══════════════════════════════════════════════════════════════════════════

  async checkDuePlans(zoneId: string): Promise<void> {
    const now = new Date();

    const plans = await (this.prisma as any).maintenancePlan.findMany({
      where: {
        zoneId,
        isActive: true,
        nextDueAt: { lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
      },
      include: { asset: true },
    });

    for (const plan of plans) {
      // Check if a work order already exists for this plan and due date
      const existingWo = await (this.prisma as any).workOrder.findFirst({
        where: {
          maintenancePlanId: plan.id,
          status: { notIn: ['CANCELLED', 'CLOSED'] },
          createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        },
      });

      if (!existingWo) {
        await this.generateWorkOrder(plan.id, 'system');

        // Emit maintenance due event
        this.gateway.emitMaintenanceDue({
          zoneId,
          planId: plan.id,
          assetName: plan.asset.nameFa,
          maintenanceType: plan.type,
          dueAt: plan.nextDueAt || now,
          leadTimeDays: plan.leadTimeDays,
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATS
  // ═══════════════════════════════════════════════════════════════════════════

  async getMaintenanceStats(zoneId: string): Promise<MaintenanceStatsDto> {
    const now = new Date();
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const monthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const totalPlans = await (this.prisma as any).maintenancePlan.count({ where: { zoneId } });
    const activePlans = await (this.prisma as any).maintenancePlan.count({ where: { zoneId, isActive: true } });

    const dueThisWeek = await (this.prisma as any).maintenancePlan.count({
      where: { zoneId, isActive: true, nextDueAt: { gte: now, lte: weekLater } },
    });

    const dueThisMonth = await (this.prisma as any).maintenancePlan.count({
      where: { zoneId, isActive: true, nextDueAt: { gte: now, lte: monthLater } },
    });

    const overdueCount = await (this.prisma as any).maintenancePlan.count({
      where: { zoneId, isActive: true, nextDueAt: { lt: now } },
    });

    // Completion rate: completed preventive WOs / total preventive WOs in last 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const totalPreventive = await (this.prisma as any).workOrder.count({
      where: { zoneId, type: 'PREVENTIVE', createdAt: { gte: thirtyDaysAgo } },
    });
    const completedPreventive = await (this.prisma as any).workOrder.count({
      where: { zoneId, type: 'PREVENTIVE', status: { in: ['COMPLETED', 'VERIFIED', 'CLOSED'] }, createdAt: { gte: thirtyDaysAgo } },
    });

    return {
      totalPlans,
      activePlans,
      dueThisWeek,
      dueThisMonth,
      overdueCount,
      avgCompletionRate: totalPreventive > 0 ? Math.round((completedPreventive / totalPreventive) * 100) : 0,
    };
  }
}
