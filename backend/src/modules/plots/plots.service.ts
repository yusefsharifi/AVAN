import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuditService } from '../../common/services/audit.service';
import { REDIS_KEYS, REDIS_TTL } from '../../common/utils/redis-keys';
import { AppException } from '../../common/exceptions/app.exception';
import { CreatePlotDto, UpdatePlotDto, FilterPlotsDto } from './dto/create-plot.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PlotService {
  private readonly logger = new Logger(PlotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreatePlotDto, createdBy: string) {
    // Check uniqueness within zone
    const existing = await this.prisma.plot.findFirst({
      where: { zoneId: dto.zoneId, code: dto.code },
    });
    if (existing) throw new AppException('ZONE_GATE_CODE_TAKEN');

    const plot = await this.prisma.plot.create({
      data: {
        zoneId: dto.zoneId,
        code: dto.code,
        block: dto.block,
        unitNumber: dto.unitNumber,
        areaSqM: dto.areaSqM as any,
        type: dto.type,
        lat: dto.lat || null,
        lng: dto.lng || null,
        geoPolygon: (dto.geoPolygon as any) || null,
        monthlyRent: dto.monthlyRent || null,
        utilityMeter: (dto.utilityMeter as any) || null,
        notes: dto.notes || null,
      },
    });

    await this.redis.del(REDIS_KEYS.plotMap(dto.zoneId));
    await this.redis.del(REDIS_KEYS.plotAvailable(dto.zoneId));

    await this.audit.log({
      zoneId: dto.zoneId,
      userId: createdBy,
      targetId: plot.id,
      targetType: 'Plot',
      action: 'PLOT_CREATED',
      metadata: { code: dto.code, block: dto.block },
    });

    return plot;
  }

  async findAll(zoneId: string, filter?: FilterPlotsDto) {
    const where: Prisma.PlotWhereInput = { zoneId };
    if (filter?.status) where.status = filter.status as any;
    if (filter?.type) where.type = filter.type as any;
    if (filter?.block) where.block = filter.block;
    if (filter?.minArea || filter?.maxArea) {
      where.areaSqM = {};
      if (filter.minArea) (where.areaSqM as any).gte = filter.minArea;
      if (filter.maxArea) (where.areaSqM as any).lte = filter.maxArea;
    }

    return this.prisma.plot.findMany({
      where,
      include: { company: { select: { id: true, nameFa: true } } },
      orderBy: { code: 'asc' },
    });
  }

  async findById(id: string) {
    const plot = await this.prisma.plot.findUnique({
      where: { id },
      include: { company: true },
    });
    if (!plot) throw new AppException('PLOT_NOT_FOUND');
    return plot;
  }

  async update(id: string, dto: UpdatePlotDto) {
    const plot = await this.findById(id);

    const updated = await this.prisma.plot.update({
      where: { id },
      data: {
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.lat !== undefined && { lat: dto.lat }),
        ...(dto.lng !== undefined && { lng: dto.lng }),
        ...(dto.geoPolygon !== undefined && { geoPolygon: dto.geoPolygon }),
        ...(dto.monthlyRent !== undefined && { monthlyRent: dto.monthlyRent }),
        ...(dto.utilityMeter !== undefined && { utilityMeter: dto.utilityMeter }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    await this.redis.del(REDIS_KEYS.plotMap(plot.zoneId));
    await this.audit.log({
      zoneId: plot.zoneId,
      targetId: id,
      targetType: 'Plot',
      action: 'PLOT_UPDATED',
      metadata: dto as any,
    });

    return updated;
  }

  async delete(id: string) {
    const plot = await this.findById(id);
    if (plot.status !== 'AVAILABLE') throw new AppException('PLOT_HAS_COMPANY');

    await this.prisma.plot.delete({ where: { id } });
    await this.redis.del(REDIS_KEYS.plotMap(plot.zoneId));
    await this.redis.del(REDIS_KEYS.plotAvailable(plot.zoneId));
    await this.audit.log({
      zoneId: plot.zoneId,
      targetId: id,
      targetType: 'Plot',
      action: 'PLOT_DELETED',
    });
  }

  async getAvailablePlots(zoneId: string, minArea?: number) {
    const where: Prisma.PlotWhereInput = {
      zoneId,
      status: 'AVAILABLE',
    };
    if (minArea) {
      where.areaSqM = { gte: minArea } as any;
    }
    return this.prisma.plot.findMany({ where, orderBy: { code: 'asc' } });
  }

  async getPlotMap(zoneId: string) {
    const cached = await this.redis.getJson(REDIS_KEYS.plotMap(zoneId));
    if (cached) return cached;

    const plots = await this.prisma.plot.findMany({
      where: { zoneId },
      select: {
        id: true,
        code: true,
        status: true,
        areaSqM: true,
        lat: true,
        lng: true,
        geoPolygon: true,
        type: true,
        company: { select: { nameFa: true } },
      },
      orderBy: { code: 'asc' },
    });

    await this.redis.setJson(REDIS_KEYS.plotMap(zoneId), plots, REDIS_TTL.PLOT_MAP);
    return plots;
  }

  async getOccupancyStats(zoneId: string) {
    const plots = await this.prisma.plot.findMany({
      where: { zoneId },
      select: { status: true, areaSqM: true },
    });

    const total = plots.length;
    const available = plots.filter((p) => p.status === 'AVAILABLE').length;
    const reserved = plots.filter((p) => p.status === 'RESERVED').length;
    const occupied = plots.filter((p) => p.status === 'OCCUPIED').length;
    const maintenance = plots.filter((p) => p.status === 'MAINTENANCE').length;
    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    const totalAreaSqM = plots.reduce((sum, p) => sum + Number(p.areaSqM), 0);
    const occupiedAreaSqM = plots
      .filter((p) => p.status === 'OCCUPIED')
      .reduce((sum, p) => sum + Number(p.areaSqM), 0);

    return {
      total,
      available,
      reserved,
      occupied,
      maintenance,
      occupancyRate,
      totalAreaSqM,
      occupiedAreaSqM,
    };
  }

  async bulkCreate(zoneId: string, plots: CreatePlotDto[]) {
    let created = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const plotDto of plots) {
      try {
        await this.create({ ...plotDto, zoneId }, 'bulk-import');
        created++;
      } catch (err: any) {
        failed++;
        errors.push(`Plot ${plotDto.code}: ${err.message}`);
      }
    }

    return { created, failed, errors };
  }
}
