import { Test, TestingModule } from '@nestjs/testing';
import { BarrierControllerService } from './barrier-controller.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { IotGatewayService } from './iot-gateway.service';
import { MqttService } from './mqtt.service';
import { AppException } from '../../../common/exceptions/app.exception';

describe('BarrierControllerService', () => {
  let service: BarrierControllerService;
  let prisma: any;
  let redis: any;
  let gateway: any;
  let mqtt: any;

  const mockBarrier = {
    id: 'barrier-1',
    deviceId: 'KVH-BARR-0001',
    zoneId: 'zone-1',
    gateId: 'gate-1',
    type: 'BARRIER',
    isOnline: true,
    mqttTopic: 'idop/zone-1/BARRIER/KVH-BARR-0001',
    name: 'Gate Barrier',
  };

  beforeEach(async () => {
    prisma = {
      ioTDevice: {
        findFirst: jest.fn().mockResolvedValue(mockBarrier),
      },
      deviceCommand: {
        create: jest.fn().mockResolvedValue({ id: 'cmd-1', type: 'BARRIER_OPEN', status: 'SENT' }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      deviceAlert: {
        create: jest.fn(),
      },
    };

    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      del: jest.fn(),
      getClient: jest.fn().mockReturnValue({
        eval: jest.fn().mockResolvedValue(['', 1]), // [prevState, transitioned]
      }),
    };

    gateway = {
      emitBarrierOpened: jest.fn(),
      emitBarrierClosed: jest.fn(),
      emitBarrierError: jest.fn(),
      emitDeviceAlert: jest.fn(),
    };

    mqtt = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BarrierControllerService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: IotGatewayService, useValue: gateway },
        { provide: MqttService, useValue: mqtt },
      ],
    }).compile();

    service = module.get<BarrierControllerService>(BarrierControllerService);
  });

  describe('openBarrier', () => {
    it('should reject command if device is OFFLINE', async () => {
      prisma.ioTDevice.findFirst.mockResolvedValue({ ...mockBarrier, isOnline: false });

      await expect(
        service.openBarrier('KVH-BARR-0001', 'manual', 'user-1'),
      ).rejects.toThrow(AppException);
    });

    it('should reject if barrier is already open (BUG-005: atomic check)', async () => {
      // BUG-005: Atomic Lua script returns transitioned=false when already open
      redis.getClient.mockReturnValue({
        eval: jest.fn().mockResolvedValue(['open', 0]), // already open
      });

      await expect(
        service.openBarrier('KVH-BARR-0001', 'manual', 'user-1'),
      ).rejects.toThrow(AppException);
    });

    it('should publish MQTT command with correct payload', async () => {
      await service.openBarrier('KVH-BARR-0001', 'manual', 'user-1', 15);

      expect(mqtt.publish).toHaveBeenCalledWith(
        'idop/zone-1/BARRIER/KVH-BARR-0001/cmd',
        expect.objectContaining({ action: 'open', duration: 15 }),
        { qos: 1 },
      );
    });

    it('should use atomic Lua script for state transition (BUG-005)', async () => {
      const mockEval = jest.fn().mockResolvedValue(['', 1]);
      redis.getClient.mockReturnValue({ eval: mockEval });

      await service.openBarrier('KVH-BARR-0001', 'manual', 'user-1', 10);

      // Verify Lua script was called (atomic transition)
      expect(mockEval).toHaveBeenCalledWith(
        expect.stringContaining('redis.call'),
        1, // number of keys
        'iot:barrier:barrier-1',
        'open',
        '15', // duration + 5
      );
    });

    it('should emit barrier:opened socket event', async () => {
      await service.openBarrier('KVH-BARR-0001', 'manual', 'user-1');

      expect(gateway.emitBarrierOpened).toHaveBeenCalledWith(
        'zone-1',
        'gate-1',
        expect.objectContaining({ deviceId: 'KVH-BARR-0001', reason: 'manual' }),
      );
    });

    it('should create DeviceCommand record', async () => {
      await service.openBarrier('KVH-BARR-0001', 'vehicle entry', 'guard-1');

      expect(prisma.deviceCommand.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'BARRIER_OPEN',
            payload: expect.objectContaining({ reason: 'vehicle entry' }),
            priority: 3,
          }),
        }),
      );
    });
  });

  describe('closeBarrier', () => {
    it('should use atomic transition (BUG-005)', async () => {
      const mockEval = jest.fn().mockResolvedValue(['open', 1]);
      redis.getClient.mockReturnValue({ eval: mockEval });

      await service.closeBarrier('KVH-BARR-0001', 'user-1');

      expect(mockEval).toHaveBeenCalledWith(
        expect.stringContaining('redis.call'),
        1,
        'iot:barrier:barrier-1',
        'closed',
        '60',
      );
    });

    it('should publish MQTT close command', async () => {
      await service.closeBarrier('KVH-BARR-0001', 'user-1');

      expect(mqtt.publish).toHaveBeenCalledWith(
        'idop/zone-1/BARRIER/KVH-BARR-0001/cmd',
        expect.objectContaining({ action: 'close' }),
        { qos: 1 },
      );
    });

    it('should emit barrier:closed event', async () => {
      await service.closeBarrier('KVH-BARR-0001', 'user-1');

      expect(gateway.emitBarrierClosed).toHaveBeenCalled();
    });
  });

  describe('emergencyStop', () => {
    it('should send with priority=1 (highest)', async () => {
      await service.emergencyStop('KVH-BARR-0001', 'operator-1');

      expect(prisma.deviceCommand.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ priority: 1, type: 'BARRIER_STOP' }),
        }),
      );
    });

    it('should use atomic transition for emergency stop (BUG-005)', async () => {
      const mockEval = jest.fn().mockResolvedValue(['open', 1]);
      redis.getClient.mockReturnValue({ eval: mockEval });

      await service.emergencyStop('KVH-BARR-0001', 'operator-1');

      expect(mockEval).toHaveBeenCalledWith(
        expect.stringContaining('redis.call'),
        1,
        'iot:barrier:barrier-1',
        'stopped',
        '60',
      );
    });

    it('should publish BARRIER_STOP via MQTT', async () => {
      await service.emergencyStop('KVH-BARR-0001', 'operator-1');

      expect(mqtt.publish).toHaveBeenCalledWith(
        'idop/zone-1/BARRIER/KVH-BARR-0001/cmd',
        expect.objectContaining({ action: 'stop', emergency: true }),
        { qos: 1 },
      );
    });
  });

  describe('getBarrierState', () => {
    it('should return open state from Redis', async () => {
      redis.get.mockResolvedValue('open');

      const state = await service.getBarrierState('KVH-BARR-0001');

      expect(state.isOpen).toBe(true);
      expect(state.isOnline).toBe(true);
    });

    it('should return closed state when Redis key is missing', async () => {
      redis.get.mockResolvedValue(null);

      const state = await service.getBarrierState('KVH-BARR-0001');

      expect(state.isOpen).toBe(false);
    });
  });

  describe('handleBarrierStatus', () => {
    it('should create DeviceAlert on error status', async () => {
      await service.handleBarrierStatus('KVH-BARR-0001', { state: 'error', error: 'motor failure' });

      expect(prisma.deviceAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ alertType: 'BARRIER_STUCK', severity: 'ERROR' }),
        }),
      );
    });

    it('should use atomic transition for device-reported state (BUG-005)', async () => {
      const mockEval = jest.fn().mockResolvedValue(['open', 1]);
      redis.getClient.mockReturnValue({ eval: mockEval });

      await service.handleBarrierStatus('KVH-BARR-0001', { state: 'closed' });

      expect(mockEval).toHaveBeenCalledWith(
        expect.stringContaining('redis.call'),
        1,
        'iot:barrier:barrier-1',
        'closed',
        '60',
      );
    });

    it('should emit barrier:error event on error', async () => {
      await service.handleBarrierStatus('KVH-BARR-0001', { state: 'error', error: 'stuck' });

      expect(gateway.emitBarrierError).toHaveBeenCalled();
    });
  });

  describe('BUG-005: Race condition prevention', () => {
    it('should reject concurrent open commands via atomic Lua script', async () => {
      // Simulate: first call succeeds, second call gets transitioned=false
      let callCount = 0;
      const mockEval = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(['', 1]); // first succeeds
        return Promise.resolve(['open', 0]); // second rejected
      });
      redis.getClient.mockReturnValue({ eval: mockEval });

      // First call should succeed
      const result1 = await service.openBarrier('KVH-BARR-0001', 'manual', 'user-1', 10);
      expect(result1).toBeDefined();

      // Second call should be rejected (barrier already open)
      await expect(
        service.openBarrier('KVH-BARR-0001', 'manual', 'user-2', 10),
      ).rejects.toThrow(AppException);
    });

    it('should not use separate GET + SET pattern (BUG-005 verification)', async () => {
      // Verify that redis.get is NOT called for state checking in openBarrier
      // (it should only use the Lua script)
      redis.get.mockClear();

      await service.openBarrier('KVH-BARR-0001', 'manual', 'user-1', 10);

      // redis.get should NOT be called for state checking
      // (only the Lua script eval is used)
      expect(redis.get).not.toHaveBeenCalled();
    });
  });
});
