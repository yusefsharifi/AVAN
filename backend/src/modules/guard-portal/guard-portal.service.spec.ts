import { Test, TestingModule } from '@nestjs/testing';
import { GuardPortalService } from './guard-portal.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { BullService } from '../../bull/bull.service';
import { AuditService } from '../../common/services/audit.service';
import { IdopGateway } from '../../gateway/idop.gateway';
import { MqttService } from '../../mqtt/mqtt.service';
import { AccessResult, TrafficDirection, EntryMethod } from '@prisma/client';

describe('GuardPortalService', () => {
  let service: GuardPortalService;
  let prisma: any;
  let redis: any;
  let mqtt: any;

  beforeEach(async () => {
    prisma = {
      gate: { findFirst: jest.fn(), findUnique: jest.fn() },
      vehicle: { findFirst: jest.fn() },
      vehicleAccessPermit: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      trafficLog: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      anprEvent: { create: jest.fn(), update: jest.fn() },
      blacklist: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
      guardShift: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      gateIncident: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
      zone: { findUnique: jest.fn() },
      user: { findMany: jest.fn() },
      notification: { create: jest.fn() },
    };

    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      getJson: jest.fn(),
      setJson: jest.fn(),
      incrWithExpiry: jest.fn(),
    };

    mqtt = {
      publish: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true),
      publishAndWaitForAck: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuardPortalService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: BullService, useValue: { addJob: jest.fn(), registerWorker: jest.fn() } },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: IdopGateway, useValue: { emitToZone: jest.fn(), emitToGate: jest.fn(), emitToGateAndZone: jest.fn() } },
        { provide: MqttService, useValue: mqtt },
      ],
    }).compile();

    service = module.get<GuardPortalService>(GuardPortalService);

    // NEW-014: isWorkingHours() reads the real clock, making processEntry tests fail
    // when the suite runs outside 07:00–18:00 Tehran time (e.g., at night). Mock it
    // deterministically — the working-hours logic itself is covered by zone tests.
    jest.spyOn(service as unknown as { isWorkingHours: (zoneId: string) => Promise<boolean> }, 'isWorkingHours').mockResolvedValue(true);
  });

  describe('processEntry', () => {
    it('should allow vehicle with valid permit', async () => {
      prisma.gate.findFirst.mockResolvedValue({ id: 'gate-1', zoneId: 'zone-1', isActive: true, hasBarrier: true });
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1', plate: '22B123', companyId: 'c1', company: { nameFa: 'شرکت' }, type: 'TRUCK' });
      prisma.vehicleAccessPermit.findFirst.mockResolvedValue({
        id: 'perm-1',
        allowedGates: [],
        allowedHours: null,
        isActive: true,
      });
      prisma.zone.findUnique.mockResolvedValue({ status: 'ACTIVE', settings: { workingHours: { start: '07:00', end: '18:00' }, weekends: [5, 6] } });
      redis.getJson.mockResolvedValue(null);
      prisma.blacklist.findFirst.mockResolvedValue(null);
      redis.setJson.mockResolvedValue(undefined);
      prisma.trafficLog.create.mockImplementation(async (args) => ({ id: 'log-1', processedAt: new Date(), direction: 'ENTRY', accessResult: args.data.accessResult }));
      prisma.trafficLog.count.mockResolvedValue(0);

      const result = await service.processEntry(
        {
          gateId: 'gate-1',
          plate: '22B123',
          direction: TrafficDirection.ENTRY,
          entryMethod: EntryMethod.MANUAL,
        },
        'guard-1',
        'zone-1',
      );

      expect(result.accessResult).toBe('ALLOWED');
    });

    it('should deny blacklisted vehicle', async () => {
      prisma.gate.findFirst.mockResolvedValue({ id: 'gate-1', zoneId: 'zone-1', isActive: true, hasBarrier: true });
      prisma.vehicle.findFirst.mockResolvedValue(null);
      prisma.vehicleAccessPermit.findFirst.mockResolvedValue(null);
      prisma.zone.findUnique.mockResolvedValue({ status: 'ACTIVE', settings: {} });
      redis.getJson.mockResolvedValue(null);
      prisma.blacklist.findFirst.mockResolvedValue({ id: 'bl-1', reason: 'Stolen vehicle', severity: 'DENY', isActive: true, expiresAt: null });
      prisma.trafficLog.create.mockImplementation(async (args) => ({ id: 'log-1', processedAt: new Date(), accessResult: args.data.accessResult }));

      const result = await service.processEntry(
        {
          gateId: 'gate-1',
          plate: '22B123',
          direction: TrafficDirection.ENTRY,
          entryMethod: EntryMethod.MANUAL,
        },
        'guard-1',
        'zone-1',
      );

      expect(result.accessResult).toBe('DENIED_BLACKLIST');
    });

    it('should set PENDING_GUARD_APPROVAL for unknown vehicle', async () => {
      prisma.gate.findFirst.mockResolvedValue({ id: 'gate-1', zoneId: 'zone-1', isActive: true, hasBarrier: true });
      prisma.vehicle.findFirst.mockResolvedValue(null);
      prisma.vehicleAccessPermit.findFirst.mockResolvedValue(null);
      prisma.zone.findUnique.mockResolvedValue({ status: 'ACTIVE', settings: {} });
      redis.getJson.mockResolvedValue(null);
      prisma.blacklist.findFirst.mockResolvedValue(null);
      prisma.trafficLog.create.mockImplementation(async (args) => ({ id: 'log-1', processedAt: new Date(), accessResult: args.data.accessResult }));

      const result = await service.processEntry(
        {
          gateId: 'gate-1',
          plate: 'UNKNOWN',
          direction: TrafficDirection.ENTRY,
          entryMethod: EntryMethod.MANUAL,
        },
        'guard-1',
        'zone-1',
      );

      expect(result.accessResult).toBe('PENDING_GUARD_APPROVAL');
    });

    it('should NOT open barrier for DENIED result', async () => {
      prisma.gate.findFirst.mockResolvedValue({ id: 'gate-1', zoneId: 'zone-1', isActive: true, hasBarrier: true });
      prisma.vehicle.findFirst.mockResolvedValue(null);
      prisma.vehicleAccessPermit.findFirst.mockResolvedValue(null);
      prisma.zone.findUnique.mockResolvedValue({ status: 'ACTIVE', settings: {} });
      redis.getJson.mockResolvedValue(null);
      prisma.blacklist.findFirst.mockResolvedValue({ id: 'bl-1', reason: 'test', severity: 'DENY', isActive: true, expiresAt: null });
      prisma.trafficLog.create.mockImplementation(async (args) => ({ id: 'log-1', processedAt: new Date(), accessResult: args.data.accessResult }));

      await service.processEntry(
        {
          gateId: 'gate-1',
          plate: '22B123',
          direction: TrafficDirection.ENTRY,
          entryMethod: EntryMethod.MANUAL,
        },
        'guard-1',
        'zone-1',
      );

      expect(mqtt.publish).not.toHaveBeenCalled();
    });
  });

  describe('checkBlacklist', () => {
    it('should detect blacklisted plate', async () => {
      prisma.blacklist.findFirst.mockResolvedValue({
        id: 'bl-1',
        type: 'PLATE',
        value: '22B123',
        severity: 'DENY',
        reason: 'test',
        isActive: true,
      });
      redis.setJson.mockResolvedValue(undefined);

      const result = await service.checkBlacklist('zone-1', { plates: ['22B123'] });

      expect(result.isBlacklisted).toBe(true);
      expect(result.severity).toBe('DENY');
    });

    it('should return false for non-blacklisted plate', async () => {
      prisma.blacklist.findFirst.mockResolvedValue(null);

      const result = await service.checkBlacklist('zone-1', { plates: ['CLEAN'] });

      expect(result.isBlacklisted).toBe(false);
    });

    it('should return highest severity when multiple matches', async () => {
      prisma.blacklist.findFirst
        .mockResolvedValueOnce({ severity: 'WARNING', isActive: true })
        .mockResolvedValueOnce({ severity: 'ALERT_SECURITY', isActive: true });
      redis.setJson.mockResolvedValue(undefined);

      const result = await service.checkBlacklist('zone-1', { plates: ['A', 'B'] });

      expect(result.severity).toBe('ALERT_SECURITY');
    });

    it('should ignore expired blacklist entries', async () => {
      prisma.blacklist.findFirst.mockResolvedValue(null);

      const result = await service.checkBlacklist('zone-1', { plates: ['22B123'] });

      expect(result.isBlacklisted).toBe(false);
      expect(prisma.blacklist.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ expiresAt: { gt: expect.any(Date) } }),
            ]),
          }),
        }),
      );
    });
  });

  describe('Plate Normalization', () => {
    it('should convert Persian digits to ASCII', () => {
      const { normalizePlate } = require('../../common/utils/plate-normalizer');
      expect(normalizePlate('۲۲ب۱۲۳')).toBe('22B123');
    });

    it('should convert Arabic-Indic digits to ASCII', () => {
      const { normalizePlate } = require('../../common/utils/plate-normalizer');
      expect(normalizePlate('٢٢ب١٢٣')).toBe('22B123');
    });

    it('should remove spaces and dashes', () => {
      const { normalizePlate } = require('../../common/utils/plate-normalizer');
      expect(normalizePlate('22 - B - 123')).toBe('22B123');
    });
  });
});
