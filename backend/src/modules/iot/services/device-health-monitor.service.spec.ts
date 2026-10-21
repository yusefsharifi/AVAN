import { Test, TestingModule } from '@nestjs/testing';
import { DeviceHealthMonitorService } from './device-health-monitor.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { IotGatewayService } from './iot-gateway.service';

describe('DeviceHealthMonitorService', () => {
  let service: DeviceHealthMonitorService;
  let prisma: any;
  let redis: any;
  let gateway: any;

  const mockDevice = {
    id: 'dev-1',
    deviceId: 'KVH-ANPR-0001',
    zoneId: 'zone-1',
    name: 'Main ANPR Camera',
    type: 'ANPR_CAMERA',
    isOnline: false,
    heartbeatInterval: 30,
    lastHeartbeatAt: null,
    lastSeenAt: null,
    signalStrength: -50,
    batteryLevel: 80,
    uptimeSeconds: 3600,
    errorCount: 0,
    config: {},
  };

  beforeEach(async () => {
    prisma = {
      ioTDevice: {
        findFirst: jest.fn().mockResolvedValue(mockDevice),
        findMany: jest.fn().mockResolvedValue([mockDevice]),
        update: jest.fn(),
      },
      deviceHealthLog: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      deviceAlert: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
      },
    };

    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      del: jest.fn(),
    };

    gateway = {
      emitDeviceOnline: jest.fn(),
      emitDeviceOffline: jest.fn(),
      emitDeviceAlert: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceHealthMonitorService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: IotGatewayService, useValue: gateway },
      ],
    }).compile();

    service = module.get<DeviceHealthMonitorService>(DeviceHealthMonitorService);
  });

  describe('processHeartbeat', () => {
    it('should update lastHeartbeatAt and isOnline=true', async () => {
      await service.processHeartbeat('KVH-ANPR-0001', { signalStrength: -45, batteryLevel: 90, timestamp: new Date().toISOString() });

      expect(prisma.ioTDevice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isOnline: true, status: 'ONLINE' }),
        }),
      );
    });

    it('should save DeviceHealthLog', async () => {
      await service.processHeartbeat('KVH-ANPR-0001', { signalStrength: -45, batteryLevel: 90, cpuPercent: 35, timestamp: new Date().toISOString() });

      expect(prisma.deviceHealthLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isOnline: true, signalStrength: -45, batteryLevel: 90 }),
        }),
      );
    });

    it('should update Redis heartbeat TTL', async () => {
      await service.processHeartbeat('KVH-ANPR-0001', { timestamp: new Date().toISOString() });

      expect(redis.set).toHaveBeenCalledWith(
        'iot:heartbeat:dev-1',
        expect.any(String),
        60, // 30 * 2
      );
    });

    it('should create WARNING for low battery < 20%', async () => {
      await service.processHeartbeat('KVH-ANPR-0001', { batteryLevel: 15, timestamp: new Date().toISOString() });

      expect(prisma.deviceAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ alertType: 'LOW_BATTERY', severity: 'WARNING' }),
        }),
      );
    });

    it('should create WARNING for weak signal < -90 dBm', async () => {
      await service.processHeartbeat('KVH-ANPR-0001', { signalStrength: -95, timestamp: new Date().toISOString() });

      expect(prisma.deviceAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ alertType: 'NETWORK_FAILURE', severity: 'WARNING' }),
        }),
      );
    });

    it('should create ERROR for high error count > 10', async () => {
      await service.processHeartbeat('KVH-ANPR-0001', { errorCount: 15, timestamp: new Date().toISOString() });

      expect(prisma.deviceAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ alertType: 'DEVICE_ERROR', severity: 'ERROR' }),
        }),
      );
    });

    it('should not create alert for normal battery level', async () => {
      await service.processHeartbeat('KVH-ANPR-0001', { batteryLevel: 80, signalStrength: -50, errorCount: 0, timestamp: new Date().toISOString() });

      expect(prisma.deviceAlert.create).not.toHaveBeenCalled();
    });
  });

  describe('checkDevicesOnline', () => {
    it('should mark device offline if heartbeat expired', async () => {
      // Device was online but heartbeat key is expired (redis.get returns null)
      prisma.ioTDevice.findMany.mockResolvedValue([
        { ...mockDevice, isOnline: true, lastHeartbeatAt: new Date(Date.now() - 120000) },
      ]);
      redis.get.mockResolvedValue(null);

      await service.checkDevicesOnline('zone-1');

      expect(prisma.ioTDevice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isOnline: false, status: 'OFFLINE' }),
        }),
      );
    });

    it('should create DEVICE_OFFLINE alert when device goes offline', async () => {
      prisma.ioTDevice.findMany.mockResolvedValue([
        { ...mockDevice, isOnline: true, lastHeartbeatAt: new Date(Date.now() - 120000) },
      ]);
      redis.get.mockResolvedValue(null);

      await service.checkDevicesOnline('zone-1');

      expect(prisma.deviceAlert.create).toHaveBeenCalled();
    });

    it('should emit device:offline socket event', async () => {
      prisma.ioTDevice.findMany.mockResolvedValue([
        { ...mockDevice, isOnline: true, lastHeartbeatAt: new Date(Date.now() - 120000) },
      ]);
      redis.get.mockResolvedValue(null);

      await service.checkDevicesOnline('zone-1');

      expect(gateway.emitDeviceOffline).toHaveBeenCalled();
    });

    it('should not mark device offline if heartbeat is fresh', async () => {
      prisma.ioTDevice.findMany.mockResolvedValue([
        { ...mockDevice, isOnline: true, lastHeartbeatAt: new Date() },
      ]);
      redis.get.mockResolvedValue(new Date().toISOString());

      await service.checkDevicesOnline('zone-1');

      expect(prisma.ioTDevice.update).not.toHaveBeenCalled();
    });
  });

  describe('resolveAlert', () => {
    it('should mark alert as resolved', async () => {
      await service.resolveAlert('alert-1', 'admin-1', 'Fixed the issue');

      expect(prisma.deviceAlert.update).toHaveBeenCalledWith({
        where: { id: 'alert-1' },
        data: expect.objectContaining({ isResolved: true, resolvedBy: 'admin-1', resolution: 'Fixed the issue' }),
      });
    });
  });

  describe('getAlerts', () => {
    it('should filter by severity', async () => {
      await service.getAlerts('zone-1', { severity: 'CRITICAL' as any });

      expect(prisma.deviceAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ severity: 'CRITICAL' }),
        }),
      );
    });

    it('should filter by isResolved', async () => {
      await service.getAlerts('zone-1', { isResolved: false });

      expect(prisma.deviceAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isResolved: false }),
        }),
      );
    });
  });

  describe('getDeviceMetrics', () => {
    it('should return health metrics from last N hours', async () => {
      prisma.deviceHealthLog.findMany.mockResolvedValue([
        { recordedAt: new Date(), isOnline: true, signalStrength: -45, batteryLevel: 90, cpuPercent: 35, responseMs: 12 },
        { recordedAt: new Date(), isOnline: true, signalStrength: -50, batteryLevel: 85, cpuPercent: 40, responseMs: 15 },
      ]);

      const metrics = await service.getDeviceMetrics('KVH-ANPR-0001', 24);

      expect(metrics.metrics).toHaveLength(2);
      expect(metrics.metrics[0].isOnline).toBe(true);
    });
  });
});
