import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { VehicleType } from '@prisma/client';
import { CreateDockDto } from '../dto/create-dock.dto';
import { UpdateDockDto } from '../dto/update-dock.dto';

@Injectable()
export class DockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(zoneId: string, dto: CreateDockDto): Promise<any> {
    return this.prisma.dock.create({
      data: {
        zoneId,
        code: dto.code,
        nameFa: dto.nameFa,
        type: dto.type,
        maxVehicleType: dto.maxVehicleType,
        companyId: dto.companyId,
        operatingHours: dto.operatingHours ?? undefined,
        lat: dto.lat,
        lng: dto.lng,
        notes: dto.notes,
      },
    });
  }

  async findAll(zoneId: string, companyId?: string): Promise<any[]> {
    const where: any = { zoneId };
    if (companyId) where.companyId = companyId;
    return this.prisma.dock.findMany({ where, orderBy: { code: 'asc' } });
  }

  async findAvailable(zoneId: string, vehicleType: VehicleType): Promise<any[]> {
    // Check cache
    const cacheKey = `dock:available:${zoneId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const docks = await this.prisma.dock.findMany({
      where: {
        zoneId,
        isAvailable: true,
        OR: [
          { maxVehicleType: vehicleType },
          { maxVehicleType: 'OTHER' },
        ],
      },
      orderBy: { code: 'asc' },
    });

    // Cache for 1 minute
    await this.redis.set(cacheKey, JSON.stringify(docks), 60);

    return docks;
  }

  async update(id: string, dto: UpdateDockDto): Promise<any> {
    const dock = await this.prisma.dock.findUnique({ where: { id } });
    if (!dock) throw new AppException('DOCK_NOT_FOUND');

    return this.prisma.dock.update({ where: { id }, data: dto });
  }

  async setAvailability(id: string, isAvailable: boolean): Promise<any> {
    const dock = await this.prisma.dock.findUnique({ where: { id } });
    if (!dock) throw new AppException('DOCK_NOT_FOUND');

    const updated = await this.prisma.dock.update({
      where: { id },
      data: { isAvailable },
    });

    // Clear cache
    await this.redis.del(`dock:available:${dock.zoneId}`);

    return updated;
  }

  async delete(id: string): Promise<void> {
    const dock = await this.prisma.dock.findUnique({ where: { id } });
    if (!dock) throw new AppException('DOCK_NOT_FOUND');

    // Check if dock has active appointments
    const activeAppointments = await this.prisma.truckAppointment.count({
      where: { scheduledDockId: id, status: { notIn: ['CANCELLED', 'COMPLETED', 'NO_SHOW'] } },
    });
    if (activeAppointments > 0) {
      throw new AppException('DOCK_NOT_AVAILABLE');
    }

    await this.prisma.dock.delete({ where: { id } });
    await this.redis.del(`dock:available:${dock.zoneId}`);
  }
}
