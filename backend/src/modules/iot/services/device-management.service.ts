// M20: IoT & Device Integration — Device Management Service
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreateIoTDeviceDto, SendDeviceCommandDto, BulkCommandDto, FilterDevicesDto } from '../dto/create-dtos';
import type { PaginatedResult, DeviceHealthDto, DeviceMapDto, NetworkTopologyDto, IoTDashboardDto, FirmwareStatusDto, DiagnosticResult } from '../dto/enums';
import { IotGatewayService } from './iot-gateway.service';
import { MqttService } from './mqtt.service';
import { DEVICE_TYPE_CODES, generateDeviceCredentials, generateSecureRandomHex } from '../utils/iot.utils';
import { randomUUID } from 'crypto';

@Injectable()
export class DeviceManagementService {
  private readonly logger = new Logger(DeviceManagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: IotGatewayService,
    private readonly mqtt: MqttService,
  ) {}

  async register(dto: CreateIoTDeviceDto, registeredBy: string): Promise<any> {
    const zone = await this.prisma.zone.findUnique({ where: { id: dto.zoneId } });
    if (!zone) throw new AppException('ZONE_NOT_FOUND');

    const typeCode = DEVICE_TYPE_CODES[dto.type] || 'DEV';
    const seqKey = `iot:device:seq:${dto.zoneId}:${dto.type}`;
    const seq = await this.redis.incr(seqKey);
    const deviceId = `${zone.code}-${typeCode}-${String(seq).padStart(4, '0')}`;
    const mqttClientId = `${deviceId}-${randomUUID().slice(0, 8)}`;
    const mqttTopic = `idop/${dto.zoneId}/${dto.type}/${deviceId}`;

    const creds = generateDeviceCredentials(deviceId, zone.code);
    const device = await this.prisma.ioTDevice.create({
      data: {
        zoneId: dto.zoneId,
        deviceId,
        name: dto.name,
        type: dto.type,
        protocol: dto.protocol,
        location: dto.location,
        gateId: dto.gateId,
        lat: dto.lat,
        lng: dto.lng,
        ipAddress: dto.ipAddress,
        port: dto.port,
        macAddress: dto.macAddress,
        mqttClientId,
        mqttTopic,
        username: creds.username,
        manufacturer: dto.manufacturer,
        model: dto.model,
        firmwareVersion: dto.firmwareVersion,
        serialNumber: dto.serialNumber,
        installDate: dto.installDate ? new Date(dto.installDate) : null,
        warrantyExpiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : null,
        config: dto.config || {},
        heartbeatInterval: dto.heartbeatInterval || 30,
        notes: dto.notes,
        createdBy: registeredBy,
      },
    });

    await this.audit.log({ zoneId: dto.zoneId, action: 'DEVICE_REGISTERED', targetType: 'IoTDevice', targetId: device.id, userId: registeredBy, metadata: { deviceId, type: dto.type } });

    return { ...device, credentials: { username: creds.username, password: creds.password } };
  }

  async update(id: string, dto: Partial<CreateIoTDeviceDto>, updatedBy: string): Promise<any> {
    const existing = await this.prisma.ioTDevice.findUnique({ where: { id } });
    if (!existing) throw new AppException('DEVICE_NOT_FOUND');

    const updated = await this.prisma.ioTDevice.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.location && { location: dto.location }),
        ...(dto.ipAddress && { ipAddress: dto.ipAddress }),
        ...(dto.port && { port: dto.port }),
        ...(dto.firmwareVersion && { firmwareVersion: dto.firmwareVersion }),
        ...(dto.config && { config: dto.config }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        // isActive handled separately
      },
    });

    await this.audit.log({ zoneId: existing.zoneId, action: 'DEVICE_UPDATED', targetType: 'IoTDevice', targetId: id, userId: updatedBy });
    return updated;
  }

  async decommission(id: string, reason: string, decommissionedBy: string): Promise<any> {
    const device = await this.prisma.ioTDevice.findUnique({ where: { id } });
    if (!device) throw new AppException('DEVICE_NOT_FOUND');

    const updated = await this.prisma.ioTDevice.update({
      where: { id },
      data: { status: 'DECOMMISSIONED', isActive: false, notes: reason },
    });

    await this.audit.log({ zoneId: device.zoneId, action: 'DEVICE_DECOMMISSIONED', targetType: 'IoTDevice', targetId: id, userId: decommissionedBy, metadata: { reason } });
    return updated;
  }

  async findAll(filter: FilterDevicesDto): Promise<PaginatedResult<any>> {
    const where: any = {};
    if (filter.zoneId) where.zoneId = filter.zoneId;
    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;
    if (filter.isOnline !== undefined) where.isOnline = filter.isOnline;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;
    if (filter.gateId) where.gateId = filter.gateId;
    if (filter.search) where.OR = [{ name: { contains: filter.search, mode: 'insensitive' } }, { deviceId: { contains: filter.search, mode: 'insensitive' } }];

    const limit = filter.limit || 50;
    const [data, total] = await Promise.all([
      this.prisma.ioTDevice.findMany({ where, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.ioTDevice.count({ where }),
    ]);
    return { data, meta: { total, hasMore: data.length === limit, cursor: data.length === limit ? data[data.length - 1].id : undefined } };
  }

  async findById(id: string): Promise<any> {
    const device = await this.prisma.ioTDevice.findUnique({ where: { id } });
    if (!device) throw new AppException('DEVICE_NOT_FOUND');
    return device;
  }

  async findByDeviceId(deviceId: string): Promise<any | null> {
    return this.prisma.ioTDevice.findUnique({ where: { deviceId } });
  }

  async findByGate(gateId: string): Promise<any[]> {
    return this.prisma.ioTDevice.findMany({ where: { gateId, isActive: true } });
  }

  async sendCommand(dto: SendDeviceCommandDto, issuedBy: string): Promise<any> {
    const device = await this.prisma.ioTDevice.findUnique({ where: { id: dto.deviceId } });
    if (!device) throw new AppException('DEVICE_NOT_FOUND');
    if (!device.isOnline) throw new AppException('DEVICE_OFFLINE');

    const correlationId = randomUUID();
    const command = await this.prisma.deviceCommand.create({
      data: {
        deviceId: dto.deviceId,
        zoneId: device.zoneId,
        type: dto.type,
        payload: dto.payload || {},
        issuedBy,
        status: 'SENT',
        sentAt: new Date(),
        timeoutSeconds: dto.timeoutSeconds || 10,
        priority: dto.priority || 5,
        correlationId,
      },
    });

    // Publish via MQTT
    if (device.mqttTopic) {
      const cmdTopic = `${device.mqttTopic}/cmd`;
      await this.mqtt.publish(cmdTopic, { commandId: command.id, type: dto.type, payload: dto.payload, correlationId }, { qos: 1 });
    }

    await this.audit.log({ zoneId: device.zoneId, action: 'DEVICE_COMMAND_SENT', targetType: 'DeviceCommand', targetId: command.id, userId: issuedBy, metadata: { deviceId: device.deviceId, type: dto.type } });
    return command;
  }

  async bulkCommand(dto: BulkCommandDto, issuedBy: string): Promise<any[]> {
    const results = await Promise.all(
      dto.deviceIds.map((deviceId) =>
        this.sendCommand({ deviceId, type: dto.type, payload: dto.payload, timeoutSeconds: dto.timeoutSeconds }, issuedBy).catch((err) => {
          this.logger.error(`Bulk command failed for ${deviceId}: ${err}`);
          return null;
        }),
      ),
    );
    return results.filter(Boolean);
  }

  async processCommandAck(correlationId: string, response: object, success: boolean, errorMessage?: string): Promise<void> {
    const command = await this.prisma.deviceCommand.findFirst({ where: { correlationId } });
    if (!command) return;

    await this.prisma.deviceCommand.update({
      where: { id: command.id },
      data: {
        status: success ? 'COMPLETED' : 'FAILED',
        response,
        errorMessage,
        completedAt: success ? new Date() : undefined,
        failedAt: !success ? new Date() : undefined,
      },
    });

    // Publish to Redis for waitForResponse
    await this.redis.set(`iot:cmd:response:${correlationId}`, JSON.stringify({ success, response, errorMessage }), 30);
  }

  async updateDeviceStatus(deviceId: string, isOnline: boolean, metadata?: object): Promise<any> {
    const device = await this.prisma.ioTDevice.findFirst({ where: { deviceId } });
    if (!device) return;

    const updated = await this.prisma.ioTDevice.update({
      where: { id: device.id },
      data: {
        isOnline,
        status: isOnline ? 'ONLINE' : 'OFFLINE',
        lastSeenAt: new Date(),
        ...(metadata && { metadata }),
      },
    });

    if (isOnline) {
      this.gateway.emitDeviceOnline(device.zoneId, { deviceId: device.deviceId, deviceName: device.name, type: device.type, timestamp: new Date() });
    } else {
      this.gateway.emitDeviceOffline(device.zoneId, { deviceId: device.deviceId, deviceName: device.name, type: device.type, lastSeen: device.lastSeenAt });
    }

    return updated;
  }

  async getDeviceHealth(deviceId: string): Promise<DeviceHealthDto> {
    const device = await this.prisma.ioTDevice.findFirst({ where: { deviceId } });
    if (!device) throw new AppException('DEVICE_NOT_FOUND');

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const logs = await this.prisma.deviceHealthLog.findMany({
      where: { deviceId: device.id, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'asc' },
    });

    return {
      deviceId: device.deviceId,
      isOnline: device.isOnline,
      lastSeenAt: device.lastSeenAt,
      lastHeartbeatAt: device.lastHeartbeatAt,
      signalStrength: device.signalStrength,
      batteryLevel: device.batteryLevel,
      uptimeSeconds: device.uptimeSeconds,
      avgResponseMs: device.avgResponseMs ? Number(device.avgResponseMs) : null,
      errorCount: device.errorCount,
      trend: logs.map((l) => ({ time: l.recordedAt.toISOString(), isOnline: l.isOnline, responseMs: l.responseMs })),
    };
  }

  async getZoneDeviceMap(zoneId: string): Promise<DeviceMapDto[]> {
    const devices = await this.prisma.ioTDevice.findMany({ where: { zoneId, isActive: true, lat: { not: null }, lng: { not: null } } });
    return devices.map((d) => ({
      deviceId: d.deviceId,
      name: d.name,
      type: d.type,
      lat: d.lat ? Number(d.lat) : null,
      lng: d.lng ? Number(d.lng) : null,
      isOnline: d.isOnline,
      status: d.status,
    }));
  }

  async getNetworkTopology(zoneId: string): Promise<NetworkTopologyDto> {
    const devices = await this.prisma.ioTDevice.findMany({ where: { zoneId, isActive: true } });
    const byType: Record<string, { total: number; online: number }> = {};
    let online = 0;
    let offline = 0;
    let error = 0;

    for (const d of devices) {
      if (d.isOnline) online++; else if (d.status === 'ERROR') error++; else offline++;
      if (!byType[d.type]) byType[d.type] = { total: 0, online: 0 };
      byType[d.type].total++;
      if (d.isOnline) byType[d.type].online++;
    }

    return { totalDevices: devices.length, online, offline, error, byType };
  }

  async getDashboard(zoneId: string): Promise<IoTDashboardDto> {
    const cacheKey = `iot:dashboard:${zoneId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const devices = await this.prisma.ioTDevice.findMany({ where: { zoneId, isActive: true } });
    const alerts = await this.prisma.deviceAlert.findMany({ where: { zoneId, isResolved: false }, orderBy: { createdAt: 'desc' }, take: 10 });
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cmdCount = await this.prisma.deviceCommand.count({ where: { zoneId, issuedAt: { gte: since24h } } });

    const byType: Record<string, { total: number; online: number }> = {};
    let online = 0;
    let offline = 0;
    for (const d of devices) {
      if (d.isOnline) online++; else offline++;
      if (!byType[d.type]) byType[d.type] = { total: 0, online: 0 };
      byType[d.type].total++;
      if (d.isOnline) byType[d.type].online++;
    }

    const dashboard: IoTDashboardDto = {
      totalDevices: devices.length,
      online,
      offline,
      errorCount: devices.filter((d) => d.status === 'ERROR').length,
      byType,
      recentAlerts: alerts,
      criticalAlerts: alerts.filter((a) => a.severity === 'CRITICAL').length,
      commandsLast24h: cmdCount,
      avgResponseMs: devices.reduce((s, d) => s + Number(d.avgResponseMs || 0), 0) / Math.max(devices.length, 1),
    };

    await this.redis.set(cacheKey, JSON.stringify(dashboard), 30);
    return dashboard;
  }

  async updateConfig(deviceId: string, config: object, updatedBy: string): Promise<any> {
    const device = await this.prisma.ioTDevice.findFirst({ where: { deviceId } });
    if (!device) throw new AppException('DEVICE_NOT_FOUND');

    const updated = await this.prisma.ioTDevice.update({ where: { id: device.id }, data: { config } });

    // Send config update via MQTT
    if (device.mqttTopic && device.isOnline) {
      await this.mqtt.publish(`${device.mqttTopic}/cmd`, { type: 'DEVICE_CONFIG_UPDATE', payload: config }, { qos: 1 });
    }

    await this.audit.log({ zoneId: device.zoneId, action: 'DEVICE_CONFIG_UPDATED', targetType: 'IoTDevice', targetId: device.id, userId: updatedBy });
    return updated;
  }

  async restartDevice(deviceId: string, issuedBy: string): Promise<any> {
    const device = await this.prisma.ioTDevice.findFirst({ where: { deviceId } });
    if (!device) throw new AppException('DEVICE_NOT_FOUND');
    return this.sendCommand({ deviceId: device.id, type: 'DEVICE_RESTART', timeoutSeconds: 30 }, issuedBy);
  }

  async runDiagnostic(deviceId: string, issuedBy: string): Promise<DiagnosticResult> {
    const device = await this.prisma.ioTDevice.findFirst({ where: { deviceId } });
    if (!device) throw new AppException('DEVICE_NOT_FOUND');
    await this.sendCommand({ deviceId: device.id, type: 'DIAGNOSTIC_RUN', timeoutSeconds: 60 }, issuedBy);
    return { deviceId: device.deviceId, status: 'DIAGNOSTIC_SENT', details: {}, completedAt: new Date() };
  }

  async rotateMqttCredentials(deviceId: string, _issuedBy: string): Promise<{ username: string; password: string }> {
    const device = await this.prisma.ioTDevice.findFirst({ where: { deviceId } });
    if (!device) throw new AppException('DEVICE_NOT_FOUND');
    const zone = await this.prisma.zone.findUnique({ where: { id: device.zoneId } });
    const creds = generateDeviceCredentials(deviceId, zone?.code || 'Z');
    await this.prisma.ioTDevice.update({ where: { id: device.id }, data: { username: creds.username } });
    return { username: creds.username, password: creds.password };
  }

  async getFirmwareStatus(deviceId: string): Promise<FirmwareStatusDto> {
    const device = await this.prisma.ioTDevice.findFirst({ where: { deviceId } });
    if (!device) throw new AppException('DEVICE_NOT_FOUND');
    return {
      currentVersion: device.firmwareVersion,
      latestVersion: device.firmwareVersion, // In production: check firmware server
      isUpToDate: true,
      lastChecked: new Date(),
    };
  }

  async scheduleCalibration(deviceId: string, scheduledDate: Date, scheduledBy: string): Promise<void> {
    const device = await this.prisma.ioTDevice.findFirst({ where: { deviceId } });
    if (!device) throw new AppException('DEVICE_NOT_FOUND');
    await this.prisma.ioTDevice.update({ where: { id: device.id }, data: { calibrationDue: scheduledDate } });
    await this.audit.log({ zoneId: device.zoneId, action: 'CALIBRATION_SCHEDULED', targetType: 'IoTDevice', targetId: device.id, userId: scheduledBy, metadata: { scheduledDate } });
  }
}
