import { Test, TestingModule } from '@nestjs/testing';
import { CompanyService } from './companies.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { BullService } from '../../bull/bull.service';
import { AuditService } from '../../common/services/audit.service';
import { IdopGateway } from '../../gateway/idop.gateway';
import { AppException } from '../../common/exceptions/app.exception';

describe('CompanyService', () => {
  let service: CompanyService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      zone: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
      company: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      onboardingStep: {
        createMany: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      notification: { create: jest.fn() },
      companyDocument: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      companyHealthScore: { create: jest.fn(), findMany: jest.fn() },
      plot: { findUnique: jest.fn(), update: jest.fn() },
      permit: { count: jest.fn() },
      trafficLog: { count: jest.fn() },
      userSession: { updateMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: { getJson: jest.fn(), setJson: jest.fn(), del: jest.fn(), delPattern: jest.fn() } },
        { provide: BullService, useValue: { addJob: jest.fn(), registerWorker: jest.fn() } },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: IdopGateway, useValue: { emitToZone: jest.fn() } },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
  });

  describe('register', () => {
    it('should create company with APPLICANT status', async () => {
      prisma.zone.findFirst.mockResolvedValue({ id: 'zone-1', status: 'ACTIVE' });
      prisma.company.findUnique.mockResolvedValue(null);
      prisma.company.create.mockResolvedValue({ id: 'company-1', ceoName: 'Ali', ceoPhone: '0912', ceoEmail: null, nameFa: 'شرکت تست' });
      prisma.onboardingStep.createMany.mockResolvedValue({});
      prisma.user.findMany.mockResolvedValue([]);

      const result = await service.register(
        {
          zoneId: 'zone-1',
          registrationNumber: '1234',
          nationalId: '5678',
          nameFa: 'شرکت تست',
          type: 'MANUFACTURING',
          industryCategory: '1010',
          ceoName: 'Ali',
          ceoNationalId: '1111',
          ceoPhone: '0912',
        },
        'user-1',
      );

      expect(prisma.company.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ lifecycleStatus: 'APPLICANT' }),
        }),
      );
    });

    it('should create all 6 onboarding steps', async () => {
      prisma.zone.findFirst.mockResolvedValue({ id: 'zone-1', status: 'ACTIVE' });
      prisma.company.findUnique.mockResolvedValue(null);
      prisma.company.create.mockResolvedValue({ id: 'company-1', ceoName: 'Ali', ceoPhone: '0912', ceoEmail: null, nameFa: 'شرکت' });
      prisma.onboardingStep.createMany.mockResolvedValue({});
      prisma.user.findMany.mockResolvedValue([]);

      await service.register(
        {
          zoneId: 'zone-1',
          registrationNumber: '1234',
          nationalId: '5678',
          nameFa: 'شرکت',
          type: 'MANUFACTURING',
          industryCategory: '1010',
          ceoName: 'Ali',
          ceoNationalId: '1111',
          ceoPhone: '0912',
        },
        'user-1',
      );

      expect(prisma.onboardingStep.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ stepName: 'INITIAL_REVIEW' }),
            expect.objectContaining({ stepName: 'FINANCIAL_REVIEW' }),
            expect.objectContaining({ stepName: 'HSE_REVIEW' }),
            expect.objectContaining({ stepName: 'PLOT_ALLOCATION' }),
            expect.objectContaining({ stepName: 'MANAGER_APPROVAL' }),
            expect.objectContaining({ stepName: 'CONTRACT_SIGNING' }),
          ]),
        }),
      );
    });

    it('should set first step to IN_PROGRESS', async () => {
      prisma.zone.findFirst.mockResolvedValue({ id: 'zone-1', status: 'ACTIVE' });
      prisma.company.findUnique.mockResolvedValue(null);
      prisma.company.create.mockResolvedValue({ id: 'company-1', ceoName: 'Ali', ceoPhone: '0912', ceoEmail: null, nameFa: 'شرکت' });
      prisma.onboardingStep.createMany.mockResolvedValue({});
      prisma.user.findMany.mockResolvedValue([]);

      await service.register(
        {
          zoneId: 'zone-1',
          registrationNumber: '1234',
          nationalId: '5678',
          nameFa: 'شرکت',
          type: 'MANUFACTURING',
          industryCategory: '1010',
          ceoName: 'Ali',
          ceoNationalId: '1111',
          ceoPhone: '0912',
        },
        'user-1',
      );

      const stepsCall = prisma.onboardingStep.createMany.mock.calls[0][0];
      const initialStep = stepsCall.data.find((s: any) => s.stepName === 'INITIAL_REVIEW');
      expect(initialStep.status).toBe('IN_PROGRESS');
    });

    it('should reject if zone does not exist', async () => {
      prisma.zone.findFirst.mockResolvedValue(null);

      await expect(
        service.register(
          {
            zoneId: 'nonexistent',
            registrationNumber: '1234',
            nationalId: '5678',
            nameFa: 'شرکت',
            type: 'MANUFACTURING',
            industryCategory: '1010',
            ceoName: 'Ali',
            ceoNationalId: '1111',
            ceoPhone: '0912',
          },
          'user-1',
        ),
      ).rejects.toThrow(AppException);
    });

    it('should reject if zone is not ACTIVE', async () => {
      prisma.zone.findFirst.mockResolvedValue({ id: 'zone-1', status: 'CLOSED' });

      await expect(
        service.register(
          {
            zoneId: 'zone-1',
            registrationNumber: '1234',
            nationalId: '5678',
            nameFa: 'شرکت',
            type: 'MANUFACTURING',
            industryCategory: '1010',
            ceoName: 'Ali',
            ceoNationalId: '1111',
            ceoPhone: '0912',
          },
          'user-1',
        ),
      ).rejects.toThrow(AppException);
    });
  });
});
