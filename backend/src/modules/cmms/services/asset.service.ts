import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { REDIS_KEYS } from '../../../common/utils/redis-keys';
import { CreateAssetDto, FilterAssetsDto, UpdateConditionDto, UpdateMeterReadingDto } from '../dto/create-dtos';
import { AssetCondition, AssetStatus } from '../dto/enums';
import type { AssetHierarchyDto, AssetHistoryDto, AssetKpiDto, AssetMapDto } from '../dto/enums';
import { CmmsGatewayService } from './cmms-gateway.service';
import { computeDepreciatedValue, monthsBetween } from '../utils/cmms.utils';
import * as crypto from 'crypto';

@Injectable()
export class AssetService {
  private readonly logger = new Logger(AssetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: CmmsGatewayService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════════════════════

  async create(dto: CreateAssetDto, createdBy: string): Promise<any> {
    // 1. Generate asset number
    const seqKey = `cmms:asset:seq:${dto.zoneId}`;
    const seq = await this.redis.incr(seqKey);
    const zone = await this.prisma.zone.findUnique({ where: { id: dto.zoneId } });
    const zoneCode = (zone as any)?.code || 'Z';
    const assetNumber = `AST-${zoneCode}-${seq.toString().padStart(5, '0')}`;

    // 2. Validate parentId exists in same zone
    if (dto.parentId) {
      const parent = await this.prisma.asset.findUnique({ where: { id: dto.parentId } });
      if (!parent || parent.zoneId !== dto.zoneId) {
        throw new AppException('ASSET_WRONG_ZONE');
      }
    }

    // 3. Create asset
    const asset = await (this.prisma as any).asset.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        assetNumber,
        nameFa: dto.nameFa,
        nameEn: dto.nameEn,
        category: dto.category,
        type: dto.type,
        manufacturer: dto.manufacturer,
        model: dto.model,
        serialNumber: dto.serialNumber,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        purchasePrice: dto.purchasePrice ? BigInt(dto.purchasePrice) : null,
        warrantyExpiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : null,
        location: dto.location,
        block: dto.block,
        geoLat: dto.geoLat || null,
        geoLng: dto.geoLng || null,
        parentId: dto.parentId || null,
        criticality: dto.criticality || 'MEDIUM',
        isIoTConnected: dto.isIoTConnected || false,
        iotDeviceId: dto.iotDeviceId,
        meterUnit: dto.meterUnit,
        depreciationRate: dto.depreciationRate || null,
        salvageValue: dto.salvageValue ? BigInt(dto.salvageValue) : null,
        gateId: dto.gateId,
        scaleId: dto.scaleId,
        notes: dto.notes,
        createdBy,
        currentValue: dto.purchasePrice ? BigInt(dto.purchasePrice) : null,
      },
    });

    // 4. Audit
    await this.audit.log({
      zoneId: dto.zoneId,
      userId: createdBy,
      targetId: asset.id,
      targetType: 'Asset',
      action: 'ASSET_CREATED',
      metadata: { assetNumber, category: dto.category, type: dto.type, nameFa: dto.nameFa },
    });

    return asset;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════════════════════

  async update(id: string, dto: Partial<CreateAssetDto>, updatedBy: string): Promise<any> {
    const existing = await this.findById(id);

    const updateData: any = {};
    if (dto.nameFa !== undefined) updateData.nameFa = dto.nameFa;
    if (dto.nameEn !== undefined) updateData.nameEn = dto.nameEn;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.manufacturer !== undefined) updateData.manufacturer = dto.manufacturer;
    if (dto.model !== undefined) updateData.model = dto.model;
    if (dto.serialNumber !== undefined) updateData.serialNumber = dto.serialNumber;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.block !== undefined) updateData.block = dto.block;
    if (dto.criticality !== undefined) updateData.criticality = dto.criticality;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.gateId !== undefined) updateData.gateId = dto.gateId;
    if (dto.scaleId !== undefined) updateData.scaleId = dto.scaleId;

    const updated = await (this.prisma as any).asset.update({
      where: { id },
      data: updateData,
    });

    await this.audit.log({
      zoneId: existing.zoneId,
      userId: updatedBy,
      targetId: id,
      targetType: 'Asset',
      action: 'ASSET_UPDATED',
      metadata: { assetNumber: existing.assetNumber },
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  async findAll(filter: FilterAssetsDto): Promise<any> {
    const where: any = { deletedAt: null };

    if (filter.zoneId) where.zoneId = filter.zoneId;
    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.category) where.category = filter.category;
    if (filter.status) where.status = filter.status;
    if (filter.criticality) where.criticality = filter.criticality;
    if (filter.search) {
      where.OR = [
        { assetNumber: { contains: filter.search, mode: 'insensitive' } },
        { nameFa: { contains: filter.search, mode: 'insensitive' } },
        { serialNumber: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const limit = filter.limit || 20;
    const data = await (this.prisma as any).asset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    });

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;

    return {
      data: items,
      meta: { limit, hasMore, cursor: hasMore ? items[items.length - 1].id : null },
    };
  }

  async findById(id: string): Promise<any> {
    const asset = await (this.prisma as any).asset.findUnique({
      where: { id },
      include: { maintenancePlans: true, spareParts: { include: { sparePart: true } } },
    });
    if (!asset) throw new AppException('ASSET_NOT_FOUND');
    return asset;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HIERARCHY
  // ═══════════════════════════════════════════════════════════════════════════

  async getHierarchy(assetId: string): Promise<AssetHierarchyDto> {
    const asset = await (this.prisma as any).asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new AppException('ASSET_NOT_FOUND');

    const children = await (this.prisma as any).asset.findMany({
      where: { parentId: assetId },
    });

    const childTrees = await Promise.all(
      children.map((child: any) => this.getHierarchy(child.id)),
    );

    return {
      id: asset.id,
      assetNumber: asset.assetNumber,
      nameFa: asset.nameFa,
      category: asset.category,
      children: childTrees,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONDITION UPDATE
  // ═══════════════════════════════════════════════════════════════════════════

  async updateCondition(
    id: string,
    condition: AssetCondition,
    notes: string,
    updatedBy: string,
  ): Promise<any> {
    const asset = await this.findById(id);

    const updated = await (this.prisma as any).asset.update({
      where: { id },
      data: { condition },
    });

    // If POOR or CRITICAL: emit critical event
    if (condition === AssetCondition.POOR || condition === AssetCondition.CRITICAL) {
      this.gateway.emitAssetConditionCritical({
        zoneId: asset.zoneId,
        assetId: id,
        assetName: asset.nameFa,
        condition,
        criticality: asset.criticality,
      });
    }

    await this.audit.log({
      zoneId: asset.zoneId,
      userId: updatedBy,
      targetId: id,
      targetType: 'Asset',
      action: 'ASSET_CONDITION_UPDATED',
      metadata: { assetNumber: asset.assetNumber, condition, notes },
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // METER READING
  // ═══════════════════════════════════════════════════════════════════════════

  async updateMeterReading(
    id: string,
    meterValue: number,
    readAt: Date,
    updatedBy: string,
  ): Promise<any> {
    const asset = await this.findById(id);

    const updated = await (this.prisma as any).asset.update({
      where: { id },
      data: {
        currentMeterValue: meterValue,
        lastMeterReadAt: readAt,
      },
    });

    // Check if any meter-based maintenance plans are due
    const meterPlans = await (this.prisma as any).maintenancePlan.findMany({
      where: {
        assetId: id,
        isActive: true,
        triggerType: 'METER_BASED',
      },
    });

    for (const plan of meterPlans) {
      if (plan.nextDueMeter && meterValue >= Number(plan.nextDueMeter)) {
        this.gateway.emitMaintenanceDue({
          zoneId: asset.zoneId,
          planId: plan.id,
          assetName: asset.nameFa,
          maintenanceType: plan.type,
          dueAt: new Date(),
          leadTimeDays: plan.leadTimeDays,
        });
      }
    }

    await this.audit.log({
      zoneId: asset.zoneId,
      userId: updatedBy,
      targetId: id,
      targetType: 'Asset',
      action: 'ASSET_METER_UPDATED',
      metadata: { assetNumber: asset.assetNumber, meterValue, readAt: readAt.toISOString() },
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DECOMMISSION
  // ═══════════════════════════════════════════════════════════════════════════

  async decommission(
    id: string,
    reason: string,
    disposalValue?: number,
    decommissionedBy?: string,
  ): Promise<any> {
    const asset = await this.findById(id);

    const updated = await (this.prisma as any).asset.update({
      where: { id },
      data: {
        status: AssetStatus.DECOMMISSIONED,
        deletedAt: new Date(),
        notes: `${asset.notes || ''}\n decommissioned: ${reason}${disposalValue ? ` disposalValue: ${disposalValue}` : ''}`,
      },
    });

    await this.audit.log({
      zoneId: asset.zoneId,
      userId: decommissionedBy || 'system',
      targetId: id,
      targetType: 'Asset',
      action: 'ASSET_DECOMMISSIONED',
      metadata: { assetNumber: asset.assetNumber, reason, disposalValue },
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FILE UPLOADS
  // ═══════════════════════════════════════════════════════════════════════════

  async uploadImage(id: string, file: Express.Multer.File): Promise<string> {
    const asset = await this.findById(id);
    const ext = file.originalname.split('.').pop() || 'jpg';
    const key = `cmms-assets/${id}/images/${crypto.randomUUID()}.${ext}`;

    // MinIO upload placeholder — in production: await this.minio.putObject(...)
    await (this.prisma as any).asset.update({
      where: { id },
      data: { imageKeys: { push: key } },
    });

    return key;
  }

  async uploadDocument(id: string, file: Express.Multer.File): Promise<string> {
    const asset = await this.findById(id);
    const ext = file.originalname.split('.').pop() || 'pdf';
    const key = `cmms-assets/${id}/docs/${crypto.randomUUID()}.${ext}`;

    await (this.prisma as any).asset.update({
      where: { id },
      data: { documentKeys: { push: key } },
    });

    return key;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ASSET HISTORY
  // ═══════════════════════════════════════════════════════════════════════════

  async getAssetHistory(id: string): Promise<AssetHistoryDto> {
    const asset = await this.findById(id);

    const workOrders = await (this.prisma as any).workOrder.findMany({
      where: { assetId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const failureLogs = await (this.prisma as any).failureLog.findMany({
      where: { assetId: id },
      orderBy: { failedAt: 'desc' },
      take: 50,
    });

    const maintenancePlans = await (this.prisma as any).maintenancePlan.findMany({
      where: { assetId: id },
    });

    const sparePartsUsed = await (this.prisma as any).workOrderPart.findMany({
      where: { workOrder: { assetId: id } },
      include: { sparePart: true },
    });

    const totalMaintenanceCost = workOrders.reduce(
      (sum: number, wo: any) => sum + Number(wo.totalCost || 0),
      0,
    );

    return {
      asset,
      workOrders,
      failureLogs,
      maintenancePlans,
      sparePartsUsed,
      totalMaintenanceCost,
      mtbf: 0, // computed by FailureAnalysisService
      mttr: 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // KPIs
  // ═══════════════════════════════════════════════════════════════════════════

  async computeKpis(zoneId: string): Promise<AssetKpiDto> {
    const cacheKey = `cmms:dashboard:${zoneId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const allAssets = await (this.prisma as any).asset.findMany({
      where: { zoneId, deletedAt: null },
    });

    const byCategory = new Map<string, number>();
    const byCondition = new Map<string, number>();

    for (const a of allAssets) {
      byCategory.set(a.category, (byCategory.get(a.category) || 0) + 1);
      byCondition.set(a.condition, (byCondition.get(a.condition) || 0) + 1);
    }

    const activeWorkOrders = await (this.prisma as any).workOrder.count({
      where: { zoneId, status: { in: ['APPROVED', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'] } },
    });

    const overdueWorkOrders = await (this.prisma as any).workOrder.count({
      where: {
        zoneId,
        slaDeadline: { lt: new Date() },
        slaBreached: true,
        status: { notIn: ['COMPLETED', 'VERIFIED', 'CLOSED', 'CANCELLED'] },
      },
    });

    const assetsUnderMaintenance = allAssets.filter(
      (a: any) => a.status === 'UNDER_MAINTENANCE',
    ).length;

    const criticalAssets = allAssets.filter(
      (a: any) => a.criticality === 'CRITICAL' && a.status === 'ACTIVE',
    ).length;

    // Compute avg asset age in months
    const now = new Date();
    const totalAgeMonths = allAssets.reduce((sum: number, a: any) => {
      if (a.purchaseDate) {
        return sum + monthsBetween(new Date(a.purchaseDate), now);
      }
      return sum;
    }, 0);
    const avgAssetAge = allAssets.length > 0 ? totalAgeMonths / allAssets.length : 0;

    // Total depreciation
    let totalDepreciation = 0n;
    for (const a of allAssets) {
      if (a.purchasePrice && a.depreciationRate && a.purchaseDate) {
        const age = monthsBetween(new Date(a.purchaseDate), now);
        const depreciated = computeDepreciatedValue(
          a.purchasePrice,
          Number(a.depreciationRate),
          age,
          a.salvageValue || 0n,
        );
        totalDepreciation += a.purchasePrice - depreciated;
      }
    }

    const result: AssetKpiDto = {
      totalAssets: allAssets.length,
      byCategory: Array.from(byCategory.entries()).map(([category, count]) => ({ category, count })),
      byCondition: Array.from(byCondition.entries()).map(([condition, count]) => ({ condition, count })),
      activeWorkOrders,
      overdueWorkOrders,
      assetsUnderMaintenance,
      criticalAssets,
      avgAssetAge: Math.round(avgAssetAge * 10) / 10,
      totalDepreciation: Number(totalDepreciation),
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 300); // 5 min TTL

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAP DATA
  // ═══════════════════════════════════════════════════════════════════════════

  async getAssetsOnMap(zoneId: string): Promise<AssetMapDto[]> {
    const assets = await (this.prisma as any).asset.findMany({
      where: { zoneId, deletedAt: null, geoLat: { not: null }, geoLng: { not: null } },
    });

    return assets.map((a: any) => ({
      id: a.id,
      assetNumber: a.assetNumber,
      nameFa: a.nameFa,
      category: a.category,
      status: a.status,
      condition: a.condition,
      lat: a.geoLat ? Number(a.geoLat) : null,
      lng: a.geoLng ? Number(a.geoLng) : null,
    }));
  }
}
