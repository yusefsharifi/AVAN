import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuditService } from '../../common/services/audit.service';
import { IdopGateway } from '../../gateway/idop.gateway';
import { REDIS_KEYS, REDIS_TTL } from '../../common/utils/redis-keys';
import { AppException } from '../../common/exceptions/app.exception';
import { CreateZoneDto, ZoneSettingsDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { CreateGateDto, CreateHolidayDto } from './dto/create-gate.dto';
import { ZoneStatus, Prisma } from '@prisma/client';

@Injectable()
export class ZoneService {
  private readonly logger = new Logger(ZoneService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: IdopGateway,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // ZONE CRUD
  // ══════════════════════════════════════════════════════════════════════════

  async create(dto: CreateZoneDto, createdBy: string) {
    // 1. Check code uniqueness
    const existing = await this.prisma.zone.findUnique({ where: { code: dto.code } });
    if (existing) throw new AppException('ZONE_CODE_TAKEN');

    // 2. Validate lat/lng range
    if (dto.mapCenterLat !== undefined && (dto.mapCenterLat < -90 || dto.mapCenterLat > 90)) {
      throw new AppException('ZONE_INVALID_SETTING');
    }
    if (dto.mapCenterLng !== undefined && (dto.mapCenterLng < -180 || dto.mapCenterLng > 180)) {
      throw new AppException('ZONE_INVALID_SETTING');
    }

    // 3. Default settings
    const defaultSettings = {
      workingHours: { start: '07:00', end: '18:00' },
      weekends: [5, 6], // Thu, Fri
      holidays: [],
      gateCount: 0,
      defaultSlaHours: 72,
      requireHazmatApproval: true,
      maxVisitorDaysAdvance: 30,
      autoApproveVisitor: false,
      weightUnit: 'ton',
      currency: 'IRR',
      timezone: 'Asia/Tehran',
      maxDwellMinutes: 240,
      ...dto.settings,
    };

    const zone = await this.prisma.zone.create({
      data: {
        code: dto.code,
        nameFa: dto.nameFa,
        nameEn: dto.nameEn || null,
        province: dto.province,
        city: dto.city,
        address: dto.address || null,
        phone: dto.phone || null,
        email: dto.email || null,
        mapCenterLat: dto.mapCenterLat || null,
        mapCenterLng: dto.mapCenterLng || null,
        totalAreaHectares: dto.totalAreaHectares || null,
        settings: defaultSettings as any,
      },
    });

    // 4. Audit
    await this.audit.log({
      zoneId: zone.id,
      userId: createdBy,
      targetId: zone.id,
      targetType: 'Zone',
      action: 'ZONE_CREATED',
      metadata: { code: zone.code, name: zone.nameFa },
    });

    // 5. Socket event
    this.gateway.emitToSuperAdmin('zone:created', {
      zoneId: zone.id,
      code: zone.code,
      name: zone.nameFa,
      timestamp: new Date().toISOString(),
    });

    return zone;
  }

  async findAll(filter?: { status?: ZoneStatus; search?: string }) {
    const where: Prisma.ZoneWhereInput = { deletedAt: null };
    if (filter?.status) where.status = filter.status;
    if (filter?.search) {
      where.OR = [
        { nameFa: { contains: filter.search, mode: 'insensitive' } },
        { code: { contains: filter.search, mode: 'insensitive' } },
        { city: { contains: filter.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.zone.findMany({ where, orderBy: { nameFa: 'asc' } });
  }

  async findById(id: string) {
    const zone = await this.prisma.zone.findFirst({ where: { id, deletedAt: null } });
    if (!zone) throw new AppException('ZONE_NOT_FOUND');
    return zone;
  }

  async update(id: string, dto: UpdateZoneDto, updatedBy: string) {
    const zone = await this.findById(id);

    const updated = await this.prisma.zone.update({
      where: { id },
      data: {
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.nameFa !== undefined && { nameFa: dto.nameFa }),
        ...(dto.nameEn !== undefined && { nameEn: dto.nameEn }),
        ...(dto.province !== undefined && { province: dto.province }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.mapCenterLat !== undefined && { mapCenterLat: dto.mapCenterLat }),
        ...(dto.mapCenterLng !== undefined && { mapCenterLng: dto.mapCenterLng }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });

    // Clear Redis cache
    await this.redis.del(REDIS_KEYS.zoneSettings(id));
    await this.redis.del(REDIS_KEYS.zoneStats(id));

    await this.audit.log({
      zoneId: id,
      userId: updatedBy,
      targetId: id,
      targetType: 'Zone',
      action: 'ZONE_UPDATED',
      metadata: dto as any,
    });

    return updated;
  }

  async softDelete(id: string, deletedBy: string) {
    await this.findById(id);
    await this.prisma.zone.update({
      where: { id },
      data: { deletedAt: new Date(), status: ZoneStatus.CLOSED },
    });
    await this.audit.log({
      zoneId: id,
      userId: deletedBy,
      targetId: id,
      targetType: 'Zone',
      action: 'ZONE_DELETED',
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SETTINGS
  // ══════════════════════════════════════════════════════════════════════════

  async getSettings(zoneId: string): Promise<ZoneSettingsDto> {
    const cached = await this.redis.getJson<ZoneSettingsDto>(
      REDIS_KEYS.zoneSettings(zoneId),
    );
    if (cached) return cached;

    const zone = await this.findById(zoneId);
    const settings = (zone.settings as any) || {};

    await this.redis.setJson(REDIS_KEYS.zoneSettings(zoneId), settings, REDIS_TTL.ZONE_SETTINGS);
    return settings;
  }

  async updateSettings(zoneId: string, dto: ZoneSettingsDto, updatedBy: string) {
    await this.findById(zoneId);
    const currentSettings = (await this.getSettings(zoneId)) || {};
    const merged = { ...currentSettings, ...dto };

    await this.prisma.zone.update({
      where: { id: zoneId },
      data: { settings: merged as any },
    });

    await this.redis.del(REDIS_KEYS.zoneSettings(zoneId));
    await this.audit.log({
      zoneId,
      userId: updatedBy,
      targetId: zoneId,
      targetType: 'Zone',
      action: 'ZONE_SETTINGS_UPDATED',
      metadata: dto as any,
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HOLIDAYS
  // ══════════════════════════════════════════════════════════════════════════

  async addHoliday(zoneId: string, dto: CreateHolidayDto, addedBy: string) {
    const holiday = await this.prisma.zoneHoliday.create({
      data: { zoneId, ...dto },
    });
    await this.audit.log({
      zoneId,
      userId: addedBy,
      targetId: holiday.id,
      targetType: 'ZoneHoliday',
      action: 'ZONE_HOLIDAY_ADDED',
      metadata: { date: dto.date, name: dto.nameFa },
    });
    return holiday;
  }

  async removeHoliday(zoneId: string, holidayId: string) {
    await this.prisma.zoneHoliday.delete({ where: { id: holidayId } });
    await this.audit.log({
      zoneId,
      targetId: holidayId,
      targetType: 'ZoneHoliday',
      action: 'ZONE_HOLIDAY_REMOVED',
    });
  }

  async getHolidays(zoneId: string, year?: number) {
    const where: Prisma.ZoneHolidayWhereInput = { zoneId };
    const holidays = await this.prisma.zoneHoliday.findMany({ where, orderBy: { date: 'asc' } });
    if (year) {
      return holidays.filter((h) => h.date.startsWith(String(year)));
    }
    return holidays;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GATES
  // ══════════════════════════════════════════════════════════════════════════

  async createGate(zoneId: string, dto: CreateGateDto, createdBy: string) {
    const existing = await this.prisma.gate.findFirst({
      where: { zoneId, code: dto.code },
    });
    if (existing) throw new AppException('ZONE_GATE_CODE_TAKEN');

    const gate = await this.prisma.gate.create({
      data: {
        zoneId,
        code: dto.code,
        nameFa: dto.nameFa,
        type: dto.type,
        location: dto.location || null,
        lat: dto.lat || null,
        lng: dto.lng || null,
        hasAnpr: dto.hasAnpr || false,
        hasBarrier: dto.hasBarrier || false,
        hasScale: dto.hasScale || false,
        deviceIds: dto.deviceIds || [],
      },
    });

    await this.audit.log({
      zoneId,
      userId: createdBy,
      targetId: gate.id,
      targetType: 'Gate',
      action: 'GATE_CREATED',
      metadata: { code: dto.code, name: dto.nameFa },
    });

    return gate;
  }

  async updateGate(zoneId: string, gateId: string, dto: Partial<CreateGateDto>) {
    const gate = await this.prisma.gate.findFirst({ where: { id: gateId, zoneId } });
    if (!gate) throw new AppException('GATE_NOT_FOUND');

    return this.prisma.gate.update({
      where: { id: gateId },
      data: {
        ...(dto.nameFa !== undefined && { nameFa: dto.nameFa }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.hasAnpr !== undefined && { hasAnpr: dto.hasAnpr }),
        ...(dto.hasBarrier !== undefined && { hasBarrier: dto.hasBarrier }),
        ...(dto.hasScale !== undefined && { hasScale: dto.hasScale }),
        ...(dto.deviceIds !== undefined && { deviceIds: dto.deviceIds }),
      },
    });
  }

  async deleteGate(zoneId: string, gateId: string) {
    const gate = await this.prisma.gate.findFirst({ where: { id: gateId, zoneId } });
    if (!gate) throw new AppException('GATE_NOT_FOUND');
    await this.prisma.gate.delete({ where: { id: gateId } });
    await this.audit.log({
      zoneId,
      targetId: gateId,
      targetType: 'Gate',
      action: 'GATE_DELETED',
    });
  }

  async getGates(zoneId: string) {
    return this.prisma.gate.findMany({ where: { zoneId } });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ══════════════════════════════════════════════════════════════════════════

  async getZoneStatistics(zoneId: string) {
    const cached = await this.redis.getJson(REDIS_KEYS.zoneStats(zoneId));
    if (cached) return cached;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalCompanies,
      activeCompanies,
      pendingOnboarding,
      totalPlots,
      availablePlots,
      occupiedPlots,
      todayEntries,
      todayExits,
      openPermits,
    ] = await Promise.all([
      this.prisma.company.count({ where: { zoneId, deletedAt: null } }),
      this.prisma.company.count({ where: { zoneId, deletedAt: null, isActive: true } }),
      this.prisma.company.count({ where: { zoneId, deletedAt: null, lifecycleStatus: 'APPLICANT' } }),
      this.prisma.plot.count({ where: { zoneId } }),
      this.prisma.plot.count({ where: { zoneId, status: 'AVAILABLE' } }),
      this.prisma.plot.count({ where: { zoneId, status: 'OCCUPIED' } }),
      this.prisma.trafficLog.count({ where: { zoneId, direction: 'ENTRY', processedAt: { gte: today } } }),
      this.prisma.trafficLog.count({ where: { zoneId, direction: 'EXIT', processedAt: { gte: today } } }),
      this.prisma.issuedPermit.count({ where: { zoneId, status: 'ACTIVE' } }),
    ]);

    const occupancyRate = totalPlots > 0 ? Math.round((occupiedPlots / totalPlots) * 100) : 0;

    const stats = {
      totalCompanies,
      activeCompanies,
      pendingOnboarding,
      totalPlots,
      availablePlots,
      occupancyRate,
      todayEntries,
      todayExits,
      activeVisitors: 0,
      openPermits,
      openRequests: pendingOnboarding,
      alertCount: 0,
    };

    await this.redis.setJson(REDIS_KEYS.zoneStats(zoneId), stats, REDIS_TTL.ZONE_STATS);
    return stats;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WORKING HOURS
  // ══════════════════════════════════════════════════════════════════════════

  async isWorkingHour(zoneId: string, dateTime?: Date): Promise<boolean> {
    const settings: any = await this.getSettings(zoneId);
    const now = dateTime || new Date();
    const tehranTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tehran' }));
    const hour = tehranTime.getHours();
    const minute = tehranTime.getMinutes();
    const dayOfWeek = tehranTime.getDay(); // 0=Sun, 5=Thu, 6=Fri

    // Check weekends
    if (settings.weekends?.includes(dayOfWeek)) return false;

    // Check holidays
    const jalaliDate = this.dateToJalali(tehranTime);
    if (settings.holidays?.includes(jalaliDate)) return false;

    // Check working hours
    const [startHour, startMin] = (settings.workingHours?.start || '07:00').split(':').map(Number);
    const [endHour, endMin] = (settings.workingHours?.end || '18:00').split(':').map(Number);

    const currentTime = hour * 60 + minute;
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    return currentTime >= startTime && currentTime <= endTime;
  }

  private dateToJalali(date: Date): string {
    // Simplified Jalali conversion (for full accuracy, use a library)
    const gregorian = new Date(date);
    const gy = gregorian.getFullYear();
    const gm = gregorian.getMonth() + 1;
    const gd = gregorian.getDate();

    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let gy2 = gm > 2 ? gy + 1 : gy;
    let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100)
      + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
    let jy = -1595 + (33 * Math.floor(days / 12053));
    days %= 12053;
    jy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) {
      jy += Math.floor((days - 1) / 365);
      days = (days - 1) % 365;
    }
    let jm: number, jd: number;
    if (days < 186) {
      jm = 1 + Math.floor(days / 31);
      jd = 1 + (days % 31);
    } else {
      jm = 7 + Math.floor((days - 186) / 30);
      jd = 1 + ((days - 186) % 30);
    }
    return `${jy}-${String(jm).padStart(2, '0')}-${String(jd).padStart(2, '0')}`;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LOGO
  // ══════════════════════════════════════════════════════════════════════════

  async uploadLogo(zoneId: string, file: Express.Multer.File): Promise<{ logoUrl: string }> {
    const ext = file.originalname.split('.').pop() || 'png';
    const key = `zone-assets/${zoneId}/logo.${ext}`;

    await this.prisma.zone.update({
      where: { id: zoneId },
      data: { logoKey: key },
    });

    return { logoUrl: key };
  }
}
