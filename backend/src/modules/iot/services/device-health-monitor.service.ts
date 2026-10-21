// M20: IoT & Device Integration — Device Health Monitor Service
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { DeviceHeartbeatDto, FilterAlertsDto } from '../dto/create-dtos';
import type { PaginatedResult, DeviceHealthReportDto, DeviceMetricsDto } from '../dto/enums';
import { IotGatewayService } from './iot-gateway.service';

@Injectable()
export class DeviceHealthMonitorService {
  private readonly logger = new Logger(DeviceHealthMonitorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: IotGatewayService,
  ) {}

  async processHeartbeat(deviceId: string, payload: any): Promise<void> {
    const device = await this.prisma.ioTDevice.findFirst({ where: { deviceId } });
    if (!device) return;

    // Update device health
    await this.prisma.ioTDevice.update({
      where: { id: device.id },
      data: {
        lastHeartbeatAt: new Date(),
        isOnline: true,
        status: 'ONLINE',
        lastSeenAt: new Date(),
        signalStrength: payload.signalStrength ?? device.signalStrength,
        batteryLevel: payload.batteryLevel ?? device.batteryLevel,
        uptimeSeconds: payload.uptimeSeconds ?? device.uptimeSeconds,
        errorCount: payload.errorCount ?? device.errorCount,
        totalEvents: { increment: 1 },
      },
    });

    // Save health log
    await this.prisma.deviceHealthLog.create({
      data: {
        deviceId: device.id,
        zoneId: device.zoneId,
        isOnline: true,
        signalStrength: payload.signalStrength,
        batteryLevel: payload.batteryLevel,
        uptimeSeconds: payload.uptimeSeconds,
        cpuPercent: payload.cpuPercent,
        memoryPercent: payload.memoryPercent,
        diskPercent: payload.diskPercent,
        temperature: payload.temperature,
        errorCount: payload.errorCount || 0,
        responseMs: payload.responseMs,
      },
    });

    // Update Redis heartbeat TTL
    const ttl = (device.heartbeatInterval || 30) * 2;
    await this.redis.set(`iot:heartbeat:${device.id}`, new Date().toISOString(), ttl);

    // Alert checks
    if (payload.batteryLevel && payload.batteryLevel < 20) {
      await this.createAlert(device, 'LOW_BATTERY', 'WARNING', `Low battery: ${payload.batteryLevel}%`);
    }
    if (payload.signalStrength && payload.signalStrength < -90) {
      await this.createAlert(device, 'NETWORK_FAILURE', 'WARNING', `Weak signal: ${payload.signalStrength} dBm`);
    }
    if (payload.errorCount && payload.errorCount > 10) {
      await this.createAlert(device, 'DEVICE_ERROR', 'ERROR', `High error count: ${payload.errorCount}`);
    }
  }

  async checkDevicesOnline(zoneId?: string): Promise<void> {
    const where: any = { isActive: true };
    if (zoneId) where.zoneId = zoneId;

    const devices = await this.prisma.ioTDevice.findMany({ where });

    for (const device of devices) {
      const heartbeatKey = `iot:heartbeat:${device.id}`;
      const lastHeartbeat = await this.redis.get(heartbeatKey);

      if (!lastHeartbeat && device.isOnline) {
        // Device missed heartbeat — mark offline
        const ttl = (device.heartbeatInterval || 30) * 2;
        const timeSinceLastHeartbeat = device.lastHeartbeatAt
          ? Date.now() - device.lastHeartbeatAt.getTime()
          : Infinity;

        if (timeSinceLastHeartbeat > ttl * 1000) {
          await this.prisma.ioTDevice.update({
            where: { id: device.id },
            data: { isOnline: false, status: 'OFFLINE' },
          });

          await this.createAlert(device, 'DEVICE_OFFLINE', 'ERROR', `Device went offline: ${device.name}`);
          this.gateway.emitDeviceOffline(device.zoneId, { deviceId: device.deviceId, deviceName: device.name, type: device.type, lastSeen: device.lastSeenAt });
        }
      }
    }
  }

  async resolveAlert(alertId: string, resolvedBy: string, resolution: string): Promise<any> {
    return this.prisma.deviceAlert.update({
      where: { id: alertId },
      data: { isResolved: true, resolvedAt: new Date(), resolvedBy, resolution },
    });
  }

  async getAlerts(zoneId: string, filter?: FilterAlertsDto): Promise<PaginatedResult<any>> {
    const where: any = { zoneId };
    if (filter?.deviceId) where.deviceId = filter.deviceId;
    if (filter?.alertType) where.alertType = filter.alertType;
    if (filter?.severity) where.severity = filter.severity;
    if (filter?.isResolved !== undefined) where.isResolved = filter.isResolved;

    const limit = filter?.limit || 50;
    const [data, total] = await Promise.all([
      this.prisma.deviceAlert.findMany({ where, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.deviceAlert.count({ where }),
    ]);
    return { data, meta: { total, hasMore: data.length === limit } };
  }

  async getHealthReport(zoneId: string, fromDate: string, toDate: string): Promise<DeviceHealthReportDto> {
    const devices = await this.prisma.ioTDevice.findMany({ where: { zoneId, isActive: true } });
    const alerts = await this.prisma.deviceAlert.findMany({ where: { zoneId, createdAt: { gte: new Date(fromDate), lte: new Date(toDate) } } });

    const avgUptime = devices.length > 0
      ? devices.reduce((s, d) => s + (d.uptimeSeconds || 0), 0) / devices.length
      : 0;

    const byAlertType = new Map<string, number>();
    const bySeverity = new Map<string, number>();
    const deviceAlertCount = new Map<string, { deviceId: string; deviceName: string; count: number }>();

    for (const a of alerts) {
      byAlertType.set(a.alertType, (byAlertType.get(a.alertType) || 0) + 1);
      bySeverity.set(a.severity, (bySeverity.get(a.severity) || 0) + 1);
      const existing = deviceAlertCount.get(a.deviceId);
      if (existing) existing.count++;
      else {
        const device = devices.find((d) => d.id === a.deviceId);
        deviceAlertCount.set(a.deviceId, { deviceId: a.deviceId, deviceName: device?.name || 'Unknown', count: 1 });
      }
    }

    const mostProblematic = Array.from(deviceAlertCount.values()).sort((a, b) => b.count - a.count).slice(0, 5).map((v) => ({ deviceId: v.deviceId, deviceName: v.deviceName, alertCount: v.count }));

    return {
      totalDevices: devices.length,
      avgUptime,
      avgAvailability: devices.length > 0 ? (devices.filter((d) => d.isOnline).length / devices.length) * 100 : 0,
      totalAlerts: alerts.length,
      byAlertType: Array.from(byAlertType.entries()).map(([type, count]) => ({ type, count })),
      bySeverity: Array.from(bySeverity.entries()).map(([severity, count]) => ({ severity, count })),
      mostProblematicDevices: mostProblematic,
      uptimeTrend: [],
    };
  }

  async getDeviceMetrics(deviceId: string, hours: number): Promise<DeviceMetricsDto> {
    const device = await this.prisma.ioTDevice.findFirst({ where: { deviceId } });
    if (!device) return { deviceId, metrics: [] };

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const logs = await this.prisma.deviceHealthLog.findMany({
      where: { deviceId: device.id, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'asc' },
    });

    return {
      deviceId,
      metrics: logs.map((l) => ({
        time: l.recordedAt.toISOString(),
        isOnline: l.isOnline,
        signalStrength: l.signalStrength,
        batteryLevel: l.batteryLevel,
        cpuPercent: l.cpuPercent,
        responseMs: l.responseMs,
      })),
    };
  }

  private async createAlert(device: any, alertType: any, severity: any, message: string): Promise<void> {
    await this.prisma.deviceAlert.create({
      data: { deviceId: device.id, zoneId: device.zoneId, alertType, severity, message },
    });
    this.gateway.emitDeviceAlert(device.zoneId, { deviceId: device.deviceId, alertType, severity, message });
  }
}
