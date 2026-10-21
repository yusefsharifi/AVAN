import { Test, TestingModule } from '@nestjs/testing';
import { LeaseContractService } from './lease-contract.service';
import { InvoiceService } from './invoice.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { FinanceGatewayService } from './finance-gateway.service';

describe('LeaseContractService', () => {
  let service: LeaseContractService;
  let prisma: { [key: string]: any };
  let redis: { [key: string]: jest.Mock };

  beforeEach(async () => {
    prisma = {
      zone: { findUnique: jest.fn().mockResolvedValue({ id: 'zone1', code: 'KVH' }) },
      leaseContract: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      leasePayment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
      },
      company: {
        updateMany: jest.fn(),
      },
    };

    redis = {
      incr: jest.fn().mockResolvedValue(1),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaseContractService,
        {
          provide: InvoiceService,
          useValue: { createMonthlyLeaseInvoice: jest.fn() },
        },
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: FinanceGatewayService, useValue: {
          emitLeaseTerminated: jest.fn(),
          emitLeaseBilling: jest.fn(),
          emitLeaseExpiring: jest.fn(),
        } },
      ],
    }).compile();

    service = module.get<LeaseContractService>(LeaseContractService);
  });

  describe('create', () => {
    it('should generate full payment schedule', async () => {
      prisma.leaseContract.findFirst.mockResolvedValue(null); // No overlap
      prisma.leaseContract.create.mockResolvedValue({
        id: 'lc1',
        contractNumber: 'LC-KVH-2024-00001',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        billingDay: 1,
        monthlyRent: BigInt(1000000),
        status: 'ACTIVE',
        plotId: null,
        company: { nameFa: 'شرکت الف' },
        paymentSchedule: [],
      });

      prisma.leasePayment.create.mockResolvedValue({ id: 'lp1' });

      // Mock findById for the final return
      prisma.leaseContract.findUnique.mockResolvedValue({
        id: 'lc1',
        contractNumber: 'LC-KVH-2024-00001',
        status: 'ACTIVE',
        company: { nameFa: 'شرکت الف' },
        paymentSchedule: [],
      });

      await service.create(
        {
          zoneId: 'zone1',
          companyId: 'comp1',
          startDate: '2024-01-01',
          endDate: '2024-06-30',
          monthlyRent: 1000000,
        },
        'user1',
      );

      // Should create 6 payments (Jan-Jun)
      expect(prisma.leasePayment.create).toHaveBeenCalledTimes(6);
    });

    it('should reject overlapping leases for same plot', async () => {
      prisma.leaseContract.findFirst.mockResolvedValue({
        id: 'existing',
        plotId: 'plot1',
      });

      await expect(
        service.create(
          {
            zoneId: 'zone1',
            companyId: 'comp1',
            plotId: 'plot1',
            startDate: '2024-03-01',
            endDate: '2024-09-30',
            monthlyRent: 1000000,
          },
          'user1',
        ),
      ).rejects.toThrow(AppException);
    });

    it('should set correct nextBillingDate', async () => {
      prisma.leaseContract.findFirst.mockResolvedValue(null);
      prisma.leaseContract.create.mockResolvedValue({
        id: 'lc1',
        contractNumber: 'LC-KVH-2024-00001',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-06-30'),
        billingDay: 15,
        monthlyRent: BigInt(1000000),
        status: 'ACTIVE',
        plotId: null,
        company: { nameFa: 'شرکت الف' },
        paymentSchedule: [],
      });

      prisma.leasePayment.create.mockResolvedValue({ id: 'lp1' });

      prisma.leaseContract.findUnique.mockResolvedValue({
        id: 'lc1',
        contractNumber: 'LC-KVH-2024-00001',
        status: 'ACTIVE',
        company: { nameFa: 'شرکت الف' },
        paymentSchedule: [],
      });

      await service.create(
        {
          zoneId: 'zone1',
          companyId: 'comp1',
          startDate: '2024-01-15',
          endDate: '2024-06-30',
          monthlyRent: 1000000,
          billingDay: 15,
        },
        'user1',
      );

      const createCall = prisma.leaseContract.create.mock.calls[0][0];
      const nextBilling = createCall.data.nextBillingDate;
      expect(nextBilling.getDate()).toBe(15);
    });
  });

  describe('terminate', () => {
    it('should cancel future payments', async () => {
      prisma.leaseContract.findUnique.mockResolvedValue({
        id: 'lc1',
        status: 'ACTIVE',
        contractNumber: 'LC-001',
        plotId: 'plot1',
        zoneId: 'zone1',
        company: { nameFa: 'شرکت' },
        paymentSchedule: [],
      });

      prisma.leasePayment.updateMany.mockResolvedValue({ count: 3 });
      prisma.leaseContract.update.mockResolvedValue({ id: 'lc1', status: 'TERMINATED' });
      prisma.company.updateMany.mockResolvedValue({ count: 1 });

      prisma.leaseContract.findUnique
        .mockResolvedValueOnce({
          id: 'lc1',
          status: 'ACTIVE',
          contractNumber: 'LC-001',
          plotId: 'plot1',
          zoneId: 'zone1',
          company: { nameFa: 'شرکت' },
          paymentSchedule: [],
        })
        .mockResolvedValueOnce({
          id: 'lc1',
          status: 'TERMINATED',
          contractNumber: 'LC-001',
          company: { nameFa: 'شرکت' },
          paymentSchedule: [],
        });

      await service.terminate('lc1', 'Custom reason', 'user1');

      expect(prisma.leasePayment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ contractId: 'lc1' }),
          data: { status: 'WAIVED' },
        }),
      );
    });

    it('should release plot', async () => {
      prisma.leaseContract.findUnique
        .mockResolvedValueOnce({
          id: 'lc1',
          status: 'ACTIVE',
          contractNumber: 'LC-001',
          plotId: 'plot1',
          zoneId: 'zone1',
          company: { nameFa: 'شرکت' },
          paymentSchedule: [],
        })
        .mockResolvedValueOnce({
          id: 'lc1',
          status: 'TERMINATED',
          contractNumber: 'LC-001',
          company: { nameFa: 'شرکت' },
          paymentSchedule: [],
        });

      prisma.leasePayment.updateMany.mockResolvedValue({ count: 0 });
      prisma.leaseContract.update.mockResolvedValue({});
      prisma.company.updateMany.mockResolvedValue({ count: 1 });

      await service.terminate('lc1', 'reason', 'user1');

      expect(prisma.company.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { plotId: 'plot1' },
          data: { plotId: null },
        }),
      );
    });
  });
});
