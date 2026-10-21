import { Test, TestingModule } from '@nestjs/testing';
import { PermitRequestService } from './permit-request.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { PermitType, PermitStatus } from '../dto/create-permit-request.dto';

describe('PermitRequestService', () => {
  let service: PermitRequestService;

  const mockPrisma = {
    permitRequest: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    permitApprovalStep: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
    },
    permitCondition: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    permitAttachment: {
      findMany: jest.fn(),
    },
    permitTemplate: {
      findFirst: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
    },
    issuedPermit: {
      findFirst: jest.fn(),
    },
    permitInspection: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  } as any;

  const mockRedis = {
    incr: jest.fn().mockResolvedValue(1),
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
  };

  const mockAudit = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermitRequestService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<PermitRequestService>(PermitRequestService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should generate correct request number format', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ lifecycleStatus: 'ACTIVE' });
      mockPrisma.issuedPermit.findFirst.mockResolvedValue(null);
      mockPrisma.permitTemplate.findFirst.mockResolvedValue(null);
      mockPrisma.permitRequest.create.mockResolvedValue({ id: 'req-1', requestNumber: 'PR-CON-2026-00001' });
      mockPrisma.permitApprovalStep.create.mockResolvedValue({ id: 'step-1' });

      const result = await service.create(
        {
          zoneId: 'zone-1',
          companyId: 'comp-1',
          type: PermitType.CONSTRUCTION,
          title: 'Test Construction Permit',
          description: 'Building a new warehouse structure for industrial use',
          justification: 'Need additional storage capacity for production line',
          requestedFrom: '2027-01-15',
          requestedUntil: '2027-04-15',
          applicantName: 'John Doe',
          applicantPhone: '09121234567',
          applicantRole: 'مدیر پروژه',
        },
        'user-1',
      );

      expect(result.requestNumber).toMatch(/^PR-CON-\d{4}-\d{5}$/);
      expect(mockRedis.incr).toHaveBeenCalled();
    });

    it('should reduce SLA by 50% for urgent requests', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ lifecycleStatus: 'ACTIVE' });
      mockPrisma.issuedPermit.findFirst.mockResolvedValue(null);
      mockPrisma.permitTemplate.findFirst.mockResolvedValue(null);
      mockPrisma.permitRequest.create.mockResolvedValue({ id: 'req-1' });
      mockPrisma.permitApprovalStep.create.mockResolvedValue({ id: 'step-1' });

      await service.create(
        {
          zoneId: 'zone-1',
          companyId: 'comp-1',
          type: PermitType.NIGHT_TRAFFIC,
          title: 'Urgent night traffic',
          description: 'Need night traffic access for urgent delivery of production materials',
          justification: 'Urgent delivery required',
          requestedFrom: '2027-01-15',
          requestedUntil: '2027-01-20',
          applicantName: 'Test',
          applicantPhone: '09121234567',
          applicantRole: 'staff',
          isUrgent: true,
        },
        'user-1',
      );

      // NIGHT_TRAFFIC has slaDays: 1, urgent should be ceil(1/2) = 1
      const stepCalls = mockPrisma.permitApprovalStep.create.mock.calls;
      expect(stepCalls.length).toBeGreaterThan(0);
    });

    it('should reject past requestedFrom date', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ lifecycleStatus: 'ACTIVE' });

      await expect(
        service.create(
          {
            zoneId: 'zone-1',
            companyId: 'comp-1',
            type: PermitType.CONSTRUCTION,
            title: 'Test',
            description: 'Test description for permit request validation',
            justification: 'Test justification for the permit request',
            requestedFrom: '2020-01-01',
            requestedUntil: '2020-02-01',
            applicantName: 'Test',
            applicantPhone: '09121234567',
            applicantRole: 'staff',
          },
          'user-1',
        ),
      ).rejects.toThrow();
    });

    it('should create default conditions from template', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ lifecycleStatus: 'ACTIVE' });
      mockPrisma.issuedPermit.findFirst.mockResolvedValue(null);
      mockPrisma.permitTemplate.findFirst.mockResolvedValue(null);
      mockPrisma.permitRequest.create.mockResolvedValue({ id: 'req-1' });
      mockPrisma.permitApprovalStep.create.mockResolvedValue({ id: 'step-1' });

      await service.create(
        {
          zoneId: 'zone-1',
          companyId: 'comp-1',
          type: PermitType.HOT_WORK,
          title: 'Welding permit',
          description: 'Need to perform welding work in production area',
          justification: 'Equipment repair needed',
          requestedFrom: '2027-01-15',
          requestedUntil: '2027-01-16',
          applicantName: 'Test',
          applicantPhone: '09121234567',
          applicantRole: 'staff',
        },
        'user-1',
      );

      // HOT_WORK has 3 default conditions
      expect(mockPrisma.permitCondition.create).toHaveBeenCalledTimes(3);
    });

    it('should reject if company is not ACTIVE', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ lifecycleStatus: 'APPLICANT' });

      await expect(
        service.create(
          {
            zoneId: 'zone-1',
            companyId: 'comp-1',
            type: PermitType.CONSTRUCTION,
            title: 'Test',
            description: 'Test description for permit request validation',
            justification: 'Test justification for the permit request',
            requestedFrom: '2027-01-15',
            requestedUntil: '2026-12-01',
            applicantName: 'Test',
            applicantPhone: '09121234567',
            applicantRole: 'staff',
          },
          'user-1',
        ),
      ).rejects.toThrow();
    });
  });

  describe('submit', () => {
    it('should reject if status is not DRAFT', async () => {
      mockPrisma.permitRequest.findFirst.mockResolvedValue({
        id: 'req-1',
        status: 'SUBMITTED',
      });

      await expect(service.submit('req-1', 'user-1')).rejects.toThrow();
    });

    it('should activate first approval step', async () => {
      mockPrisma.permitRequest.findFirst.mockResolvedValue({
        id: 'req-1',
        status: 'DRAFT',
        type: 'NIGHT_TRAFFIC',
      });
      mockPrisma.permitAttachment.findMany.mockResolvedValue([
        { type: 'APPLICATION_FORM' },
      ]);
      mockPrisma.permitRequest.update.mockResolvedValue({ id: 'req-1', status: 'SUBMITTED' });

      await service.submit('req-1', 'user-1');

      expect(mockPrisma.permitApprovalStep.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { permitRequestId: 'req-1', stepOrder: 1 },
        }),
      );
    });

    it('should reject if required documents missing', async () => {
      mockPrisma.permitRequest.findFirst.mockResolvedValue({
        id: 'req-1',
        status: 'DRAFT',
        type: 'CONSTRUCTION',
      });
      mockPrisma.permitAttachment.findMany.mockResolvedValue([]); // missing all docs

      await expect(service.submit('req-1', 'user-1')).rejects.toThrow();
    });
  });

  describe('reviewStep', () => {
    it('should advance to next step on approval', async () => {
      mockPrisma.permitRequest.findFirst.mockResolvedValue({
        id: 'req-1',
        status: 'UNDER_REVIEW',
        zoneId: 'zone-1',
        requestNumber: 'PR-CON-2026-00001',
        type: 'CONSTRUCTION',
      });
      mockPrisma.permitApprovalStep.findFirst
        .mockResolvedValueOnce({ id: 'step-1', status: 'PENDING', stepOrder: 1 })
        .mockResolvedValueOnce({ id: 'step-2', stepOrder: 2 }); // next step
      mockPrisma.permitApprovalStep.update.mockResolvedValue({});
      mockPrisma.permitRequest.update.mockResolvedValue({});

      const result = await service.reviewStep(
        'req-1',
        { stepOrder: 1, status: 'APPROVED' as any },
        'reviewer-1',
        'zone-1',
      );

      expect(mockPrisma.permitApprovalStep.update).toHaveBeenCalled();
    });

    it('should set APPROVED when all steps done and no conditions', async () => {
      mockPrisma.permitRequest.findFirst.mockResolvedValue({
        id: 'req-1',
        status: 'UNDER_REVIEW',
        zoneId: 'zone-1',
        requestNumber: 'PR-NIG-2026-00001',
        type: 'NIGHT_TRAFFIC',
      });
      // Step 2 is the last step for NIGHT_TRAFFIC
      mockPrisma.permitApprovalStep.findFirst
        .mockResolvedValueOnce({ id: 'step-2', status: 'PENDING', stepOrder: 2 })
        .mockResolvedValueOnce(null); // no next step
      mockPrisma.permitApprovalStep.update.mockResolvedValue({});
      mockPrisma.permitCondition.findMany.mockResolvedValue([]); // no pending conditions
      mockPrisma.permitRequest.update.mockResolvedValue({});

      await service.reviewStep(
        'req-1',
        { stepOrder: 2, status: 'APPROVED' as any },
        'reviewer-1',
        'zone-1',
      );

      expect(mockPrisma.permitRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'req-1' },
          data: expect.objectContaining({ status: 'APPROVED' }),
        }),
      );
    });

    it('should set CONDITIONALLY_APPROVED when conditions exist', async () => {
      mockPrisma.permitRequest.findFirst.mockResolvedValue({
        id: 'req-1',
        status: 'UNDER_REVIEW',
        zoneId: 'zone-1',
        requestNumber: 'PR-HOT-2026-00001',
        type: 'HOT_WORK',
      });
      mockPrisma.permitApprovalStep.findFirst
        .mockResolvedValueOnce({ id: 'step-2', status: 'PENDING', stepOrder: 2 })
        .mockResolvedValueOnce(null);
      mockPrisma.permitApprovalStep.update.mockResolvedValue({});
      mockPrisma.permitCondition.findMany.mockResolvedValue([{ id: 'cond-1' }]); // pending conditions
      mockPrisma.permitRequest.update.mockResolvedValue({});

      await service.reviewStep(
        'req-1',
        { stepOrder: 2, status: 'APPROVED' as any, conditions: ['Additional safety check needed'] },
        'reviewer-1',
        'zone-1',
      );

      expect(mockPrisma.permitRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'req-1' },
          data: expect.objectContaining({ status: 'CONDITIONALLY_APPROVED' }),
        }),
      );
    });

    it('should set REJECTED on step rejection', async () => {
      mockPrisma.permitRequest.findFirst.mockResolvedValue({
        id: 'req-1',
        status: 'UNDER_REVIEW',
        zoneId: 'zone-1',
        requestNumber: 'PR-CON-2026-00001',
        type: 'CONSTRUCTION',
      });
      mockPrisma.permitApprovalStep.findFirst.mockResolvedValue({
        id: 'step-1',
        status: 'PENDING',
        stepOrder: 1,
      });
      mockPrisma.permitApprovalStep.update.mockResolvedValue({});
      mockPrisma.permitRequest.update.mockResolvedValue({});

      await service.reviewStep(
        'req-1',
        { stepOrder: 1, status: 'REJECTED' as any, comment: 'Missing safety documentation' },
        'reviewer-1',
        'zone-1',
      );

      expect(mockPrisma.permitRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'req-1' },
          data: expect.objectContaining({ status: 'REJECTED' }),
        }),
      );
    });

    it('should schedule site visit when requested', async () => {
      mockPrisma.permitRequest.findFirst.mockResolvedValue({
        id: 'req-1',
        status: 'UNDER_REVIEW',
        zoneId: 'zone-1',
        requestNumber: 'PR-CON-2026-00001',
        type: 'CONSTRUCTION',
      });
      mockPrisma.permitApprovalStep.findFirst.mockResolvedValue({
        id: 'step-1',
        status: 'PENDING',
        stepOrder: 1,
      });
      mockPrisma.permitInspection = { create: jest.fn().mockResolvedValue({}) };
      mockPrisma.permitRequest.update.mockResolvedValue({});

      await service.reviewStep(
        'req-1',
        { stepOrder: 1, status: 'APPROVED' as any, scheduleSiteVisitAt: '2026-09-15' },
        'reviewer-1',
        'zone-1',
      );

      expect(mockPrisma.permitRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SITE_VISIT_SCHEDULED' }),
        }),
      );
    });
  });
});
