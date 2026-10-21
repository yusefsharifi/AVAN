import { Test, TestingModule } from '@nestjs/testing';
import { WaybillService } from './waybill.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { WaybillStatus } from '@prisma/client';

describe('WaybillService', () => {
  let service: WaybillService;
  let prisma: any;
  let redis: any;
  let audit: any;

  const mockZone = {
    id: 'zone-1',
    code: 'KVH',
    nameFa: 'شهرک کاوه',
    settings: { weightDiscrepancyThreshold: 5, weighingFeePerTon: 50000 },
  };

  const mockCompany = {
    id: 'company-1',
    zoneId: 'zone-1',
    nameFa: 'شرکت آزمایشی',
    lifecycleStatus: 'ACTIVE',
  };

  beforeEach(async () => {
    prisma = {
      zone: { findUnique: jest.fn().mockResolvedValue(mockZone) },
      waybill: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn(),
      },
      waybillApproval: { create: jest.fn(), findMany: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
      shipmentTracking: { create: jest.fn(), findMany: jest.fn() },
      truckAppointment: { update: jest.fn() },
      $transaction: jest.fn((fn) => fn(prisma)),
    };

    redis = {
      incr: jest.fn().mockResolvedValue(1),
      incrWithExpiry: jest.fn().mockResolvedValue(1),
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    audit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaybillService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<WaybillService>(WaybillService);
  });

  describe('create', () => {
    it('should generate unique waybill number with correct format', async () => {
      const dto = {
        zoneId: 'zone-1',
        companyId: 'company-1',
        direction: 'INBOUND' as any,
        type: 'STANDARD' as any,
        cargoDescription: 'ظروف شیشه‌ای',
        cargoCategory: 'RAW_MATERIAL' as any,
        isHazmat: false,
        quantity: 10,
        quantityUnit: 'ton',
        carrierName: 'شرکت حمل کاوه',
        vehiclePlate: '۴۴ل۱۲۳',
        vehicleType: 'TRUCK' as any,
        driverName: 'علی رضایی',
        driverPhone: '09123456789',
      };

      const createdWaybill = {
        id: 'wb-1',
        waybillNumber: 'WB-KVH-1403-000001',
        ...dto,
        status: 'PENDING_APPROVAL',
        createdAt: new Date(),
      };

      prisma.waybill.create.mockResolvedValue(createdWaybill);
      prisma.waybillApproval.create.mockResolvedValue({});
      prisma.shipmentTracking.create.mockResolvedValue({});

      const result = await service.create(dto, 'user-1');

      expect(result.waybillNumber).toMatch(/^WB-KVH-\d{4}-\d{6}$/);
      expect(redis.incr).toHaveBeenCalled();
      expect(prisma.waybill.create).toHaveBeenCalled();
    });

    it('should create STANDARD approval chain (3 steps)', async () => {
      const dto = {
        zoneId: 'zone-1',
        companyId: 'company-1',
        direction: 'INBOUND' as any,
        type: 'STANDARD' as any,
        cargoDescription: 'ظروف شیشه‌ای',
        cargoCategory: 'RAW_MATERIAL' as any,
        isHazmat: false,
        quantity: 10,
        quantityUnit: 'ton',
        carrierName: 'شرکت حمل',
        vehiclePlate: '44L123',
        vehicleType: 'TRUCK' as any,
        driverName: 'علی',
        driverPhone: '09123456789',
      };

      prisma.waybill.create.mockResolvedValue({ id: 'wb-1', status: 'PENDING_APPROVAL' });
      prisma.waybillApproval.create.mockResolvedValue({});
      prisma.shipmentTracking.create.mockResolvedValue({});

      await service.create(dto, 'user-1');

      // Should create 3 approval steps for STANDARD
      expect(prisma.waybillApproval.create).toHaveBeenCalledTimes(3);
      expect(prisma.waybillApproval.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ stepOrder: 1, roleFa: 'مسئول لجستیک' }),
        }),
      );
      expect(prisma.waybillApproval.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ stepOrder: 2, roleFa: 'مدیر شرکت' }),
        }),
      );
      expect(prisma.waybillApproval.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ stepOrder: 3, roleFa: 'حراست' }),
        }),
      );
    });

    it('should create HAZMAT approval chain (4 steps) when isHazmat=true', async () => {
      const dto = {
        zoneId: 'zone-1',
        companyId: 'company-1',
        direction: 'INBOUND' as any,
        type: 'HAZMAT' as any,
        cargoDescription: 'بنزین',
        cargoCategory: 'HAZARDOUS' as any,
        isHazmat: true,
        hazmatClass: '3',
        hazmatUnNumber: '1203',
        hazmatEmergencyPhone: '09123456789',
        quantity: 5,
        quantityUnit: 'liter',
        carrierName: 'شرکت حمل',
        vehiclePlate: '44L123',
        vehicleType: 'TRUCK' as any,
        driverName: 'علی',
        driverPhone: '09123456789',
      };

      prisma.waybill.create.mockResolvedValue({ id: 'wb-1', status: 'PENDING_APPROVAL' });
      prisma.waybillApproval.create.mockResolvedValue({});
      prisma.shipmentTracking.create.mockResolvedValue({});

      await service.create(dto, 'user-1');

      expect(prisma.waybillApproval.create).toHaveBeenCalledTimes(4);
    });

    it('should reject if hazmat fields are missing', async () => {
      const dto = {
        zoneId: 'zone-1',
        companyId: 'company-1',
        direction: 'INBOUND' as any,
        type: 'HAZMAT' as any,
        cargoDescription: 'بنزین',
        cargoCategory: 'HAZARDOUS' as any,
        isHazmat: true,
        // Missing hazmatClass, hazmatUnNumber, hazmatEmergencyPhone
        quantity: 5,
        quantityUnit: 'liter',
        carrierName: 'شرکت حمل',
        vehiclePlate: '44L123',
        vehicleType: 'TRUCK' as any,
        driverName: 'علی',
        driverPhone: '09123456789',
      };

      await expect(service.create(dto, 'user-1')).rejects.toThrow(AppException);
    });

    it('should reject if zone does not exist', async () => {
      prisma.zone.findUnique.mockResolvedValue(null);

      const dto = {
        zoneId: 'non-existent',
        companyId: 'company-1',
        direction: 'INBOUND' as any,
        type: 'STANDARD' as any,
        cargoDescription: 'test',
        cargoCategory: 'OTHER' as any,
        isHazmat: false,
        quantity: 1,
        quantityUnit: 'ton',
        carrierName: 'test',
        vehiclePlate: '44L123',
        vehicleType: 'TRUCK' as any,
        driverName: 'test',
        driverPhone: '09123456789',
      };

      await expect(service.create(dto, 'user-1')).rejects.toThrow(AppException);
    });
  });

  describe('approveStep', () => {
    it('should advance to next step on approval', async () => {
      const mockWaybill = {
        id: 'wb-1',
        waybillNumber: 'WB-KVH-1403-000001',
        zoneId: 'zone-1',
        status: 'PENDING_APPROVAL',
        approvals: [
          { id: 'step-1', stepOrder: 1, status: 'PENDING' },
          { id: 'step-2', stepOrder: 2, status: 'PENDING' },
        ],
      };

      prisma.waybill.findUnique.mockResolvedValue(mockWaybill);
      prisma.waybillApproval.update.mockResolvedValue({});
      prisma.waybillApproval.findFirst.mockResolvedValue(null);
      prisma.waybill.update.mockResolvedValue({});
      prisma.shipmentTracking.create.mockResolvedValue({});
      prisma.waybill.findFirst.mockResolvedValue({ ...mockWaybill, status: 'APPROVED', approvals: [], attachments: [], trackingEvents: [] });

      const result = await service.approveStep(
        { waybillId: 'wb-1', stepOrder: 1, status: 'APPROVED' },
        'user-1',
        'zone-1',
      );

      expect(prisma.waybillApproval.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'step-1' },
          data: expect.objectContaining({ status: 'APPROVED' }),
        }),
      );
    });

    it('should set waybill REJECTED on step rejection', async () => {
      const mockWaybill = {
        id: 'wb-1',
        zoneId: 'zone-1',
        status: 'PENDING_APPROVAL',
        approvals: [
          { id: 'step-1', stepOrder: 1, status: 'PENDING' },
        ],
      };

      prisma.waybill.findUnique.mockResolvedValue(mockWaybill);
      prisma.waybillApproval.update.mockResolvedValue({});
      prisma.waybill.update.mockResolvedValue({});
      prisma.shipmentTracking.create.mockResolvedValue({});
      prisma.waybill.findFirst.mockResolvedValue({
        ...mockWaybill, status: 'REJECTED',
        approvals: [{ id: 'step-1', stepOrder: 1, status: 'REJECTED' }],
        attachments: [], trackingEvents: [],
      });

      await service.approveStep(
        { waybillId: 'wb-1', stepOrder: 1, status: 'REJECTED', comment: 'اطلاعات ناقص' },
        'user-1',
        'zone-1',
      );

      expect(prisma.waybill.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'wb-1' },
          data: expect.objectContaining({ status: 'REJECTED' }),
        }),
      );
    });

    it('should reject if step already reviewed', async () => {
      const mockWaybill = {
        id: 'wb-1',
        zoneId: 'zone-1',
        approvals: [
          { id: 'step-1', stepOrder: 1, status: 'APPROVED' },
        ],
      };

      prisma.waybill.findUnique.mockResolvedValue(mockWaybill);

      await expect(
        service.approveStep(
          { waybillId: 'wb-1', stepOrder: 1, status: 'APPROVED' },
          'user-1',
          'zone-1',
        ),
      ).rejects.toThrow(AppException);
    });
  });

  describe('cancel', () => {
    it('should cancel DRAFT waybill', async () => {
      prisma.waybill.findUnique.mockResolvedValue({
        id: 'wb-1',
        zoneId: 'zone-1',
        status: 'DRAFT',
      });
      prisma.waybill.findFirst.mockResolvedValue({
        id: 'wb-1',
        zoneId: 'zone-1',
        status: 'CANCELLED',
        approvals: [],
        attachments: [],
        trackingEvents: [],
      });
      prisma.waybill.update.mockResolvedValue({});
      prisma.shipmentTracking.create.mockResolvedValue({});

      const result = await service.cancel('wb-1', 'دلیل لغو', 'user-1');
      expect(prisma.waybill.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CANCELLED' }),
        }),
      );
    });

    it('should reject cancel on COMPLETED waybill', async () => {
      prisma.waybill.findUnique.mockResolvedValue({
        id: 'wb-1',
        zoneId: 'zone-1',
        status: 'COMPLETED',
      });

      await expect(
        service.cancel('wb-1', 'reason', 'user-1'),
      ).rejects.toThrow(AppException);
    });
  });

  describe('markTruckArrived', () => {
    it('should update status and create tracking event', async () => {
      prisma.waybill.findUnique.mockResolvedValue({
        id: 'wb-1',
        zoneId: 'zone-1',
        appointmentId: 'apt-1',
      });
      prisma.waybill.findFirst.mockResolvedValue({
        id: 'wb-1',
        zoneId: 'zone-1',
        appointmentId: 'apt-1',
        status: 'TRUCK_ARRIVED',
        approvals: [],
        attachments: [],
        trackingEvents: [],
      });
      prisma.waybill.update.mockResolvedValue({});
      prisma.truckAppointment.update.mockResolvedValue({});
      prisma.shipmentTracking.create.mockResolvedValue({});

      await service.markTruckArrived('wb-1', 'gate-1', 'tl-1');

      expect(prisma.waybill.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'TRUCK_ARRIVED' }),
        }),
      );
      expect(prisma.truckAppointment.update).toHaveBeenCalled();
    });
  });
});
