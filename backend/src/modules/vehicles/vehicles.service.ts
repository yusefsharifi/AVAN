import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuditService } from '../../common/services/audit.service';
import { REDIS_KEYS, REDIS_TTL } from '../../common/utils/redis-keys';
import { AppException } from '../../common/exceptions/app.exception';
import { normalizePlate } from '../../common/utils/plate-normalizer';
import { CreateVehicleDto, IssuePermitDto } from './dto/create-vehicle.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: CreateVehicleDto, registeredBy: string) {
    const normalizedPlate = normalizePlate(dto.plate);

    const existing = await this.prisma.vehicle.findFirst({
      where: { zoneId: dto.zoneId, plateNormalized: normalizedPlate, deletedAt: null },
    });
    if (existing) throw new AppException('PLATE_DUPLICATE');

    const vehicle = await this.prisma.vehicle.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId || null,
        plate: dto.plate,
        plateNormalized: normalizedPlate,
        type: dto.type,
        brand: dto.brand || null,
        color: dto.color || null,
        ownerName: dto.ownerName || null,
        ownerPhone: dto.ownerPhone || null,
        driverName: dto.driverName || null,
        driverPhone: dto.driverPhone || null,
        driverNationalId: dto.driverNationalId || null,
        permitType: dto.permitType || 'NONE',
        permitExpiresAt: dto.permitExpiresAt ? new Date(dto.permitExpiresAt) : null,
        tags: dto.tags || [],
        notes: dto.notes || null,
      },
    });

    await this.audit.log({
      zoneId: dto.zoneId,
      userId: registeredBy,
      targetId: vehicle.id,
      targetType: 'Vehicle',
      action: 'VEHICLE_REGISTERED',
      metadata: { plate: dto.plate, type: dto.type },
    });

    return vehicle;
  }

  async findAll(zoneId: string, filter?: { plate?: string; companyId?: string; status?: string }) {
    const where: Prisma.VehicleWhereInput = { zoneId, deletedAt: null };
    if (filter?.plate) {
      const normalized = normalizePlate(filter.plate);
      where.plateNormalized = { contains: normalized };
    }
    if (filter?.companyId) where.companyId = filter.companyId;
    if (filter?.status) where.status = filter.status as any;

    return this.prisma.vehicle.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findById(id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, deletedAt: null },
      include: { accessPermits: { where: { isActive: true } } },
    });
    if (!vehicle) throw new AppException('PLOT_NOT_FOUND');
    return vehicle;
  }

  async lookupVehicle(plate: string, zoneId: string) {
    const normalizedPlate = normalizePlate(plate);

    const cached = await this.redis.getJson(REDIS_KEYS.vehicleLookup(zoneId, normalizedPlate));
    if (cached) return cached;

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { zoneId, plateNormalized: normalizedPlate, deletedAt: null },
      include: { company: true },
    });

    const activePermit = vehicle
      ? await this.prisma.vehicleAccessPermit.findFirst({
          where: {
            vehicleId: vehicle.id,
            isActive: true,
            OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
          },
        })
      : null;

    const lastEntry = await this.prisma.trafficLog.findFirst({
      where: { zoneId, plate: normalizedPlate, direction: 'ENTRY' },
      orderBy: { processedAt: 'desc' },
    });

    const lastExit = await this.prisma.trafficLog.findFirst({
      where: { zoneId, plate: normalizedPlate, direction: 'EXIT' },
      orderBy: { processedAt: 'desc' },
    });

    const currentlyInside = lastEntry
      ? !lastExit || lastExit.processedAt < lastEntry.processedAt
      : false;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const visitCount30Days = await this.prisma.trafficLog.count({
      where: { zoneId, plate: normalizedPlate, direction: 'ENTRY', processedAt: { gte: thirtyDaysAgo } },
    });

    const result = {
      vehicle,
      company: vehicle?.company || null,
      activePermit,
      isBlacklisted: vehicle?.isBlacklisted || false,
      lastEntry,
      lastExit,
      currentlyInside,
      visitCount30Days,
    };

    await this.redis.setJson(REDIS_KEYS.vehicleLookup(zoneId, normalizedPlate), result, REDIS_TTL.VEHICLE_LOOKUP);
    return result;
  }

  async update(id: string, dto: Partial<CreateVehicleDto>) {
    return this.prisma.vehicle.update({
      where: { id },
      data: {
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.brand !== undefined && { brand: dto.brand }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.ownerName !== undefined && { ownerName: dto.ownerName }),
        ...(dto.driverName !== undefined && { driverName: dto.driverName }),
        ...(dto.driverPhone !== undefined && { driverPhone: dto.driverPhone }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async softDelete(id: string) {
    await this.prisma.vehicle.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'EXPIRED' },
    });
  }

  async issuePermit(vehicleId: string, dto: IssuePermitDto, issuedBy: string) {
    const vehicle = await this.findById(vehicleId);

    const permit = await this.prisma.vehicleAccessPermit.create({
      data: {
        zoneId: vehicle.zoneId,
        vehicleId,
        companyId: vehicle.companyId,
        type: dto.type,
        allowedGates: dto.allowedGates || [],
        allowedHours: (dto.allowedHours as any) || null,
        validFrom: new Date(),
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        issuedBy,
        notes: dto.notes || null,
      },
    });

    await this.audit.log({
      zoneId: vehicle.zoneId,
      userId: issuedBy,
      targetId: permit.id,
      targetType: 'VehicleAccessPermit',
      action: 'PERMIT_ISSUED',
      metadata: { vehicleId, type: dto.type },
    });

    return permit;
  }

  async revokePermit(permitId: string, reason: string, revokedBy: string) {
    await this.prisma.vehicleAccessPermit.update({
      where: { id: permitId },
      data: { isActive: false, revokedBy, revokedAt: new Date(), revokeReason: reason },
    });

    await this.audit.log({
      userId: revokedBy,
      targetId: permitId,
      targetType: 'VehicleAccessPermit',
      action: 'PERMIT_REVOKED',
      metadata: { reason },
    });
  }

  async getPermits(vehicleId: string) {
    return this.prisma.vehicleAccessPermit.findMany({
      where: { vehicleId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTrafficHistory(vehicleId: string) {
    return this.prisma.trafficLog.findMany({
      where: { vehicleId },
      orderBy: { processedAt: 'desc' },
      take: 100,
    });
  }
}
