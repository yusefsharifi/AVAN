import { Test, TestingModule } from '@nestjs/testing';
import { RfidProcessorService } from './rfid-processor.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { IotGatewayService } from './iot-gateway.service';

describe('RfidProcessorService', () => {
  let service: RfidProcessorService;
  let prisma: any;
  let redis: any;
  let gateway: any;

  const mockTapDto = {
    deviceId: 'KVH-RFID-0001',
    zoneId: 'zone-1',
    cardNumber: 'AABBCCDD',
    protocol: 'MIFARE',
    signalStrength: -45,
    timestamp: new Date().toISOString(),
  };

  beforeEach(async () => {
    prisma = {
      deviceReading: {
        create: jest.fn().mockResolvedValue({ id: 'reading-1' }),
        update: jest.fn(),
      },
      company: {
        findMany: jest.fn().mockResolvedValue([{ id: 'comp-1' }, { id: 'comp-2' }]),
      },
      employee: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      del: jest.fn(),
    };

    gateway = {
      emitRfidEmployeeIn: jest.fn(),
      emitRfidUnknownCard: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RfidProcessorService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: IotGatewayService, useValue: gateway },
      ],
    }).compile();

    service = module.get<RfidProcessorService>(RfidProcessorService);
  });

  describe('processTap', () => {
    it('should save DeviceReading', async () => {
      await service.processTap(mockTapDto);

      expect(prisma.deviceReading.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'RFID_TAP' }),
        }),
      );
    });

    it('should find employee by card number', async () => {
      prisma.employee.findFirst.mockResolvedValue({
        id: 'emp-1',
        firstNameFa: 'علی',
        lastNameFa: 'رضایی',
        companyId: 'comp-1',
      });

      const result = await service.processTap(mockTapDto);

      expect(result.employeeId).toBe('emp-1');
      expect(result.employeeName).toBe('علی رضایی');
      expect(result.action).toBe('CLOCK_IN');
    });

    it('should emit rfid:employee-in for known employee', async () => {
      prisma.employee.findFirst.mockResolvedValue({
        id: 'emp-1',
        firstNameFa: 'علی',
        lastNameFa: 'رضایی',
        companyId: 'comp-1',
      });

      await service.processTap(mockTapDto);

      expect(gateway.emitRfidEmployeeIn).toHaveBeenCalledWith(
        'comp-1',
        expect.objectContaining({ employeeId: 'emp-1', employeeName: 'علی رضایی' }),
      );
    });

    it('should emit rfid:unknown-card for unregistered cards', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);

      const result = await service.processTap(mockTapDto);

      expect(result.action).toBe('UNKNOWN_CARD');
      expect(gateway.emitRfidUnknownCard).toHaveBeenCalledWith(
        'KVH-RFID-0001',
        expect.objectContaining({ cardNumber: 'AABBCCDD' }),
      );
    });

    it('should cache employee lookup in Redis', async () => {
      prisma.employee.findFirst.mockResolvedValue({
        id: 'emp-1',
        firstNameFa: 'علی',
        lastNameFa: 'رضایی',
        companyId: 'comp-1',
      });

      await service.processTap(mockTapDto);

      expect(redis.set).toHaveBeenCalledWith(
        'iot:rfid:AABBCCDD:zone-1',
        expect.any(String),
        300,
      );
    });

    it('should use cached employee data if available', async () => {
      redis.get.mockResolvedValue(JSON.stringify({ id: 'emp-1', firstNameFa: 'علی', lastNameFa: 'رضایی', companyId: 'comp-1' }));

      const result = await service.processTap(mockTapDto);

      expect(result.employeeId).toBe('emp-1');
      expect(prisma.employee.findFirst).not.toHaveBeenCalled();
    });

    it('should mark reading as processed', async () => {
      await service.processTap(mockTapDto);

      expect(prisma.deviceReading.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isProcessed: true }),
        }),
      );
    });
  });

  describe('getCardInfo', () => {
    it('should return employee info for known card', async () => {
      prisma.employee.findFirst.mockResolvedValue({
        id: 'emp-1',
        firstNameFa: 'علی',
        lastNameFa: 'رضایی',
        companyId: 'comp-1',
      });

      const info = await service.getCardInfo('AABBCCDD', 'zone-1');

      expect(info.type).toBe('EMPLOYEE');
      expect(info.isValid).toBe(true);
      expect(info.employee).toBeDefined();
    });

    it('should return UNKNOWN for unregistered card', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);

      const info = await service.getCardInfo('UNKNOWN', 'zone-1');

      expect(info.type).toBe('UNKNOWN');
      expect(info.isValid).toBe(false);
    });
  });

  describe('registerCard', () => {
    it('should update employee rfidCardNumber', async () => {
      prisma.employee.findUnique.mockResolvedValue({ id: 'emp-1' });

      await service.registerCard('emp-1', 'AABBCCDD', 'admin-1');

      expect(prisma.employee.update).toHaveBeenCalledWith({
        where: { id: 'emp-1' },
        data: { rfidCardNumber: 'AABBCCDD' },
      });
    });
  });
});
