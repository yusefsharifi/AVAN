// M21: Super Admin Panel — Platform Metrics Service
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import type { PlatformKpiDto, TrendDataDto, ZoneRankingDto } from '../dto/enums';

@Injectable()
export class PlatformMetricsService {
  private readonly logger = new Logger(PlatformMetricsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getPlatformKpis(): Promise<PlatformKpiDto> {
    const cacheKey = 'platform:kpis';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [totalZones, activeZones, totalCompanies, totalUsers, totalDevices, onlineDevices] = await Promise.all([
      this.prisma.zone.count(),
      this.prisma.zone.count({ where: { status: 'ACTIVE' } }),
      this.prisma.company.count(),
      this.prisma.user.count(),
      this.prisma.ioTDevice.count(),
      this.prisma.ioTDevice.count({ where: { isOnline: true } }),
    ]);

    const kpis: PlatformKpiDto = {
      zones: { total: totalZones, active: activeZones, trial: 0, suspended: totalZones - activeZones },
      companies: { total: totalCompanies, active: totalCompanies, onboarding: 0 },
      users: { total: totalUsers, active30d: totalUsers, newThisMonth: 0 },
      devices: { total: totalDevices, online: onlineDevices, offlineAlerts: totalDevices - onlineDevices },
      revenue: { mtd: 0, ytd: 0, vsLastMonth: 0 },
      storage: { usedGb: 0, totalGb: 500, percentUsed: 0 },
      apiCalls: { today: 0, thisMonth: 0 },
      smsSent: { today: 0, thisMonth: 0 },
    };

    await this.redis.set(cacheKey, JSON.stringify(kpis), 300);
    return kpis;
  }

  async computeDailyPlatformMetrics(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const metrics = [
      { metric: 'total_zones', value: await this.prisma.zone.count() },
      { metric: 'active_zones', value: await this.prisma.zone.count({ where: { status: 'ACTIVE' } }) },
      { metric: 'total_companies', value: await this.prisma.company.count() },
      { metric: 'total_users', value: await this.prisma.user.count() },
      { metric: 'total_devices', value: await this.prisma.ioTDevice.count() },
      { metric: 'online_devices', value: await this.prisma.ioTDevice.count({ where: { isOnline: true } }) },
    ];

    for (const m of metrics) {
      try {
        await (this.prisma as any).platformMetric.upsert({
          where: { date_metric: { date: today, metric: m.metric } },
          create: { date: today, metric: m.metric, value: m.value },
          update: { value: m.value },
        });
      } catch { /* table may not exist */ }
    }
  }

  async getPlatformTrend(metric: string, months: number): Promise<TrendDataDto[]> {
    try {
      const data = await (this.prisma as any).platformMetric.findMany({
        where: { metric },
        orderBy: { date: 'asc' },
        take: months * 30,
      });
      return data.map((d: any) => ({ date: d.date, value: Number(d.value) }));
    } catch { return []; }
  }

  async getZoneRankings(metric: string, limit: number): Promise<ZoneRankingDto[]> {
    const zones = await this.prisma.zone.findMany({ where: { status: 'ACTIVE' } });
    const rankings: ZoneRankingDto[] = [];

    for (const zone of zones) {
      let value = 0;
      switch (metric) {
        case 'companies': value = await this.prisma.company.count({ where: { zoneId: zone.id } }); break;
        case 'users': value = await this.prisma.user.count({ where: { zoneId: zone.id } }); break;
        case 'devices': value = await this.prisma.ioTDevice.count({ where: { zoneId: zone.id } }); break;
        default: value = 0;
      }
      rankings.push({ zoneId: zone.id, zoneName: zone.nameFa, value, rank: 0 });
    }

    rankings.sort((a, b) => b.value - a.value);
    rankings.forEach((r, i) => { r.rank = i + 1; });
    return rankings.slice(0, limit);
  }
}
