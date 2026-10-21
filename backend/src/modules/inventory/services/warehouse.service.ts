import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreateWarehouseDto, CreateLocationDto } from '../dto/create-dtos';
import type { WarehouseCapacityDto } from '../dto/enums';

@Injectable()
export class WarehouseService {
  private readonly logger = new Logger(WarehouseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateWarehouseDto, createdBy: string): Promise<any> {
    // Check code uniqueness
    const existing = await this.prisma.warehouse.findFirst({ where: { zoneId: dto.zoneId, code: dto.code } });
    if (existing) throw new AppException('WAREHOUSE_CODE_DUPLICATE');

    const warehouse = await this.prisma.warehouse.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        code: dto.code,
        nameFa: dto.nameFa,
        nameEn: dto.nameEn,
        type: dto.type,
        address: dto.address,
        managerId: dto.managerId,
        isDefault: dto.isDefault || false,
        totalCapacity: dto.totalCapacity,
        capacityUnit: dto.capacityUnit,
        temperatureMin: dto.temperatureMin,
        temperatureMax: dto.temperatureMax,
        notes: dto.notes,
      },
    });

    await this.audit.log({ zoneId: dto.zoneId, action: 'WAREHOUSE_CREATED', targetType: 'Warehouse', targetId: warehouse.id, userId: createdBy, metadata: { code: dto.code, nameFa: dto.nameFa } });
    return warehouse;
  }

  async update(id: string, dto: Partial<CreateWarehouseDto>): Promise<any> {
    const existing = await this.prisma.warehouse.findUnique({ where: { id } });
    if (!existing) throw new AppException('WAREHOUSE_NOT_FOUND');
    return this.prisma.warehouse.update({ where: { id }, data: { ...dto } });
  }

  async findAll(zoneId: string, companyId?: string): Promise<any[]> {
    const where: any = { zoneId, isActive: true };
    if (companyId) where.companyId = companyId;
    return this.prisma.warehouse.findMany({ where, orderBy: { code: 'asc' } });
  }

  async findById(id: string): Promise<any> {
    const wh = await this.prisma.warehouse.findUnique({ where: { id }, include: { locations: true } });
    if (!wh) throw new AppException('WAREHOUSE_NOT_FOUND');
    return wh;
  }

  async createLocation(warehouseId: string, dto: CreateLocationDto): Promise<any> {
    const wh = await this.prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!wh) throw new AppException('WAREHOUSE_NOT_FOUND');
    return this.prisma.warehouseLocation.create({ data: { warehouseId, code: dto.code, aisle: dto.aisle, rack: dto.rack, bin: dto.bin, level: dto.level, type: dto.type || 'STORAGE', capacity: dto.capacity, capacityUnit: dto.capacityUnit } });
  }

  async updateLocation(id: string, dto: Partial<CreateLocationDto>): Promise<any> {
    const existing = await this.prisma.warehouseLocation.findUnique({ where: { id } });
    if (!existing) throw new AppException('LOCATION_NOT_FOUND');
    return this.prisma.warehouseLocation.update({ where: { id }, data: { ...dto } });
  }

  async getLocations(warehouseId: string): Promise<any[]> {
    return this.prisma.warehouseLocation.findMany({ where: { warehouseId, isActive: true }, orderBy: { code: 'asc' } });
  }

  async getAvailableLocations(warehouseId: string, _itemId?: string): Promise<any[]> {
    return this.prisma.warehouseLocation.findMany({ where: { warehouseId, isActive: true, type: 'STORAGE' }, orderBy: { code: 'asc' } });
  }

  async getWarehouseCapacity(id: string): Promise<WarehouseCapacityDto> {
    const wh = await this.prisma.warehouse.findUnique({ where: { id }, include: { locations: true } });
    if (!wh) throw new AppException('WAREHOUSE_NOT_FOUND');

    const totalLocations = wh.locations.length;
    const occupiedLocations = await this.prisma.stockEntry.groupBy({ by: ['locationId'], where: { warehouseId: id, locationId: { not: null } } });
    const occupiedCount = occupiedLocations.length;

    const stockEntries = await this.prisma.stockEntry.findMany({ where: { warehouseId: id } });
    const totalItems = stockEntries.length;
    const totalValue = stockEntries.reduce((sum, e) => sum + e.totalValue, 0n);

    return {
      warehouseId: id,
      warehouseName: wh.nameFa,
      totalLocations,
      occupiedLocations: occupiedCount,
      availableLocations: totalLocations - occupiedCount,
      occupancyRate: totalLocations > 0 ? Math.round(occupiedCount / totalLocations * 100) : 0,
      totalItems,
      totalValue,
    };
  }
}
