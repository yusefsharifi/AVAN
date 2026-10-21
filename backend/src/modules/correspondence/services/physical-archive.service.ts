// ═══════════════════════════════════════════════════════════════════════════════
// M7: Physical Archive Service — Shelf & Letter Management
// ═══════════════════════════════════════════════════════════════════════════════

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { REDIS_KEYS, REDIS_TTL } from '../../../common/utils/redis-keys';

@Injectable()
export class PhysicalArchiveService {
  private readonly logger = new Logger(PhysicalArchiveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async createShelf(zoneId: string, dto: { shelfCode: string; nameFa: string; capacity?: number; location?: string }, createdBy: string): Promise<any> {
    const existing = await this.prisma.physicalArchiveShelf.findUnique({
      where: { zoneId_shelfCode: { zoneId, shelfCode: dto.shelfCode } },
    });
    if (existing) throw new BadRequestException('کد قفسه تکراری است');

    return this.prisma.physicalArchiveShelf.create({
      data: {
        zoneId,
        shelfCode: dto.shelfCode,
        nameFa: dto.nameFa,
        capacity: dto.capacity || 50,
        location: dto.location || null,
      },
    });
  }

  async getShelves(zoneId: string): Promise<any[]> {
    return this.prisma.physicalArchiveShelf.findMany({
      where: { zoneId, isActive: true },
      orderBy: { shelfCode: 'asc' },
    });
  }

  async getShelfMap(zoneId: string): Promise<any[]> {
    const cacheKey = REDIS_KEYS.archiveShelfMap(zoneId);
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const shelves = await this.prisma.physicalArchiveShelf.findMany({
      where: { zoneId, isActive: true },
      orderBy: { shelfCode: 'asc' },
      select: {
        id: true,
        shelfCode: true,
        nameFa: true,
        capacity: true,
        occupancy: true,
        location: true,
      },
    });

    const result = shelves.map((s) => ({
      ...s,
      occupancyPercent: s.capacity > 0 ? Math.round((s.occupancy / s.capacity) * 100) : 0,
    }));

    await this.redis.set(cacheKey, JSON.stringify(result), REDIS_TTL.ARCHIVE_SHELF_MAP);
    return result;
  }

  async receiveLetter(dto: { barcode: string; shelfId: string; notes?: string }, receivedBy: string, zoneId: string): Promise<any> {
    // 1. Find shelf
    const shelf = await this.prisma.physicalArchiveShelf.findUnique({ where: { id: dto.shelfId } });
    if (!shelf) throw new NotFoundException('قفسه یافت نشد');
    if (shelf.occupancy >= shelf.capacity) throw new BadRequestException('قفسه پر است');

    // 2. Find letter by barcode pattern
    const letter = await this.prisma.letter.findFirst({
      where: {
        OR: [
          { registryNumber: { contains: dto.barcode.replace('LTR-', '') } },
          { id: { endsWith: dto.barcode.replace('LTR-', '') } },
        ],
      },
    });
    if (!letter) throw new NotFoundException('نامه با این بارکد یافت نشد');

    // 3. Check for duplicate
    const existingRecord = await this.prisma.physicalLetterRecord.findUnique({ where: { barcode: dto.barcode } });
    if (existingRecord) throw new BadRequestException('بارکد تکراری است');

    // 4. Create record
    const record = await this.prisma.physicalLetterRecord.create({
      data: {
        zoneId,
        letterId: letter.id,
        shelfId: dto.shelfId,
        barcode: dto.barcode,
        receivedBy,
        notes: dto.notes || null,
      },
    });

    // 5. Update shelf occupancy
    await this.prisma.physicalArchiveShelf.update({
      where: { id: dto.shelfId },
      data: { occupancy: { increment: 1 } },
    });

    // 6. Update letter archiveLocation
    await this.prisma.letter.update({
      where: { id: letter.id },
      data: {
        archiveLocation: {
          box: shelf.shelfCode,
          shelf: shelf.nameFa,
          physicalBarcode: dto.barcode,
          receivedAt: new Date().toISOString(),
          receivedBy,
        },
      },
    });

    // Invalidate cache
    await this.redis.del(REDIS_KEYS.archiveShelfMap(zoneId));

    return record;
  }

  async moveLetter(dto: { barcode: string; toShelfId: string; reason: string }, movedBy: string, zoneId: string): Promise<any> {
    // 1. Find record
    const record = await this.prisma.physicalLetterRecord.findUnique({ where: { barcode: dto.barcode } });
    if (!record) throw new NotFoundException('رکورد فیزیکی یافت نشد');

    // 2. Verify destination shelf
    const newShelf = await this.prisma.physicalArchiveShelf.findUnique({ where: { id: dto.toShelfId } });
    if (!newShelf) throw new NotFoundException('قفسه مقصد یافت نشد');
    if (newShelf.occupancy >= newShelf.capacity) throw new BadRequestException('قفسه مقصد پر است');

    // 3. Update record
    const updated = await this.prisma.physicalLetterRecord.update({
      where: { id: record.id },
      data: {
        shelfId: dto.toShelfId,
        movedAt: new Date(),
        movedBy,
        movedReason: dto.reason,
      },
    });

    // 4. Update shelf occupancies
    await this.prisma.physicalArchiveShelf.update({
      where: { id: record.shelfId },
      data: { occupancy: { decrement: 1 } },
    });
    await this.prisma.physicalArchiveShelf.update({
      where: { id: dto.toShelfId },
      data: { occupancy: { increment: 1 } },
    });

    // 5. Update letter archiveLocation
    await this.prisma.letter.update({
      where: { id: record.letterId },
      data: {
        archiveLocation: {
          box: newShelf.shelfCode,
          shelf: newShelf.nameFa,
          physicalBarcode: dto.barcode,
          receivedAt: record.receivedAt.toISOString(),
          receivedBy: record.receivedBy,
          movedAt: new Date().toISOString(),
          movedBy,
        },
      },
    });

    await this.redis.del(REDIS_KEYS.archiveShelfMap(zoneId));
    return updated;
  }

  async dispatchPhysical(barcode: string, reason: string, dispatchedBy: string, zoneId: string): Promise<any> {
    const record = await this.prisma.physicalLetterRecord.findUnique({ where: { barcode } });
    if (!record) throw new NotFoundException('رکورد فیزیکی یافت نشد');

    const updated = await this.prisma.physicalLetterRecord.update({
      where: { id: record.id },
      data: {
        dispatchedAt: new Date(),
        dispatchedBy,
        notes: reason,
      },
    });

    // Update shelf occupancy
    await this.prisma.physicalArchiveShelf.update({
      where: { id: record.shelfId },
      data: { occupancy: { decrement: 1 } },
    });

    await this.redis.del(REDIS_KEYS.archiveShelfMap(zoneId));
    return updated;
  }

  async getLetterArchiveInfo(letterId: string): Promise<any | null> {
    return this.prisma.physicalLetterRecord.findFirst({
      where: { letterId },
      include: { shelf: true },
    });
  }

  async getLettersWithoutPhysicalCopy(zoneId: string): Promise<any[]> {
    return this.prisma.letter.findMany({
      where: {
        zoneId,
        status: { in: ['DISPATCHED', 'ARCHIVED'] },
        physicalRecords: { none: {} },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getArchiveReport(zoneId: string): Promise<any> {
    const shelves = await this.prisma.physicalArchiveShelf.findMany({
      where: { zoneId, isActive: true },
    });

    const totalShelves = shelves.length;
    const totalCapacity = shelves.reduce((sum, s) => sum + s.capacity, 0);
    const totalLettersArchived = shelves.reduce((sum, s) => sum + s.occupancy, 0);
    const occupancyRate = totalCapacity > 0 ? Math.round((totalLettersArchived / totalCapacity) * 100) : 0;

    const criticalShelves = shelves.filter((s) => s.capacity > 0 && s.occupancy / s.capacity > 0.9);

    const recentMovements = await this.prisma.physicalLetterRecord.findMany({
      where: { zoneId, movedAt: { not: null } },
      orderBy: { movedAt: 'desc' },
      take: 10,
      include: { letter: true, shelf: true },
    });

    const lettersWithoutPhysical = (await this.getLettersWithoutPhysicalCopy(zoneId)).length;

    return {
      totalShelves,
      totalCapacity,
      totalLettersArchived,
      occupancyRate,
      lettersWithoutPhysicalCopy: lettersWithoutPhysical,
      criticalShelves: criticalShelves.map((s) => ({
        id: s.id,
        shelfCode: s.shelfCode,
        nameFa: s.nameFa,
        occupancy: s.occupancy,
        capacity: s.capacity,
        occupancyPercent: Math.round((s.occupancy / s.capacity) * 100),
      })),
      recentMovements,
    };
  }
}
