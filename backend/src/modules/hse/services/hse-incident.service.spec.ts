import { Test, TestingModule } from '@nestjs/testing';
import { HseIncidentService } from './hse-incident.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { HseGatewayService } from './hse-gateway.service';

describe('HseIncidentService', () => {
  let service: HseIncidentService;
  let prisma: any;
  let redis: Record<string, jest.Mock>;
  let gateway: any;

  beforeEach(async () => {
    prisma = {
      zone: { findUnique: jest.fn() },
      hseIncident: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      correctiveAction: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      getJson: jest.fn(),
      setJson: jest.fn(),
      incr: jest.fn().mockResolvedValue(1),
    };

    gateway = {
      emitIncidentReported: jest.fn(),
      emitIncidentCritical: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HseIncidentService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: HseGatewayService, useValue: gateway },
      ],
    }).compile();

    service = module.get<HseIncidentService>(HseIncidentService);
  });

  describe('report', () => {
    it('should report an incident with generated number', async () => {
      prisma.zone.findUnique.mockResolvedValue({ code: 'TEH' });
      prisma.hseIncident.create.mockResolvedValue({
        id: 'inc-1', incidentNumber: 'INC-TEH-2026-00001',
      });

      const result = await service.report(
        {
          zoneId: 'z-1', companyId: 'c-1', type: 'FALL', category: 'SLIP_TRIP',
          severity: 'MODERATE', location: 'Building A', occurredAt: '2026-01-01T10:00:00Z',
          description: 'Worker slipped on wet floor',
        } as any,
        'reporter-1',
      );

      expect(result.incidentNumber).toContain('INC-TEH-');
      expect(gateway.emitIncidentReported).toHaveBeenCalled();
    });

    it('should emit critical event for CATASTROPHIC severity', async () => {
      prisma.zone.findUnique.mockResolvedValue({ code: 'TEH' });
      prisma.hseIncident.create.mockResolvedValue({ id: 'inc-1', incidentNumber: 'INC-001' });

      await service.report(
        {
          zoneId: 'z-1', type: 'FIRE', category: 'STRUCTURAL',
          severity: 'CATASTROPHIC', location: 'Plant', occurredAt: '2026-01-01T10:00:00Z',
          description: 'Major fire',
        } as any,
        'reporter-1',
      );

      expect(gateway.emitIncidentCritical).toHaveBeenCalled();
    });
  });

  describe('assignInvestigator', () => {
    it('should assign investigator and update status', async () => {
      prisma.hseIncident.findUnique.mockResolvedValue({
        id: 'inc-1', incidentNumber: 'INC-001', correctiveActions: [],
      });
      prisma.hseIncident.update.mockResolvedValue({});

      const result = await service.assignInvestigator('inc-1', 'inv-1', 'manager');
      expect(prisma.hseIncident.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'UNDER_INVESTIGATION' }),
        }),
      );
    });
  });

  describe('submitInvestigation', () => {
    it('should submit investigation and create CAPA records', async () => {
      prisma.hseIncident.findUnique.mockResolvedValue({
        id: 'inc-1', incidentNumber: 'INC-001', zoneId: 'z-1', correctiveActions: [],
      });
      prisma.zone.findUnique.mockResolvedValue({ code: 'TEH' });
      prisma.correctiveAction.create.mockResolvedValue({ id: 'capa-1' });
      prisma.hseIncident.update.mockResolvedValue({});

      const result = await service.submitInvestigation(
        {
          incidentId: 'inc-1',
          rootCause: 'Wet floor',
          rootCauseCategory: 'PROCEDURAL',
          investigationReport: 'Full report',
          correctiveActions: [
            {
              zoneId: 'z-1', companyId: 'c-1', type: 'CORRECTIVE',
              title: 'Add signage', description: 'Warning signs',
              priority: 'HIGH', assignedTo: 'worker-1', assignedToName: 'Worker',
              dueDate: '2026-02-01',
            },
          ],
        } as any,
        'investigator-1',
      );

      expect(prisma.correctiveAction.create).toHaveBeenCalled();
      expect(prisma.hseIncident.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CAPA_IN_PROGRESS' }),
        }),
      );
    });
  });

  describe('close', () => {
    it('should close incident when no open CAPAs', async () => {
      prisma.hseIncident.findUnique.mockResolvedValue({
        id: 'inc-1', incidentNumber: 'INC-001', correctiveActions: [],
      });
      prisma.correctiveAction.findMany.mockResolvedValue([]);
      prisma.hseIncident.update.mockResolvedValue({ id: 'inc-1', status: 'CLOSED' });

      const result = await service.close('inc-1', 'manager', 'All actions completed');
      expect(result.status).toBe('CLOSED');
    });

    it('should throw INCIDENT_OPEN_CAPAS_EXIST when open CAPAs exist', async () => {
      prisma.hseIncident.findUnique.mockResolvedValue({
        id: 'inc-1', incidentNumber: 'INC-001', correctiveActions: [],
      });
      prisma.correctiveAction.findMany.mockResolvedValue([
        { id: 'capa-1', status: 'OPEN' },
      ]);

      await expect(service.close('inc-1', 'manager', 'notes')).rejects.toThrow(AppException);
    });
  });

  describe('findAll', () => {
    it('should return filtered incidents', async () => {
      prisma.hseIncident.findMany.mockResolvedValue([
        { id: 'inc-1', type: 'FALL', severity: 'MODERATE' },
      ]);

      const result = await service.findAll({ zoneId: 'z-1', type: 'FALL' } as any);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should return incident with corrective actions', async () => {
      prisma.hseIncident.findUnique.mockResolvedValue({
        id: 'inc-1', correctiveActions: [],
      });

      const result = await service.findById('inc-1');
      expect(result.id).toBe('inc-1');
    });

    it('should throw INCIDENT_NOT_FOUND', async () => {
      prisma.hseIncident.findUnique.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(AppException);
    });
  });

  describe('reportToAuthority', () => {
    it('should mark as reported to authority', async () => {
      prisma.hseIncident.findUnique.mockResolvedValue({
        id: 'inc-1', incidentNumber: 'INC-001', correctiveActions: [],
      });
      prisma.hseIncident.update.mockResolvedValue({});

      const result = await service.reportToAuthority('inc-1', 'manager', 'REF-001');
      expect(prisma.hseIncident.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ reportedToAuthority: true, authorityRefNumber: 'REF-001' }),
        }),
      );
    });
  });

  describe('getIncidentStats', () => {
    it('should compute incident statistics', async () => {
      prisma.hseIncident.findMany.mockResolvedValue([
        { type: 'FALL', severity: 'MODERATE', category: 'SLIP_TRIP', companyId: 'c-1',
          isLostTime: true, lostTimeDays: 3, hazmatInvolved: false,
          propertyDamageValue: null, occurredAt: new Date('2026-01-15') },
        { type: 'NEAR_MISS', severity: 'LOW', category: 'EQUIPMENT', companyId: 'c-1',
          isLostTime: false, lostTimeDays: 0, hazmatInvolved: true,
          propertyDamageValue: null, occurredAt: new Date('2026-01-20') },
      ]);

      const stats = await service.getIncidentStats('z-1', '2026-01-01', '2026-01-31');
      expect(stats.total).toBe(2);
      expect(stats.lostTimeIncidents).toBe(1);
      expect(stats.totalLostDays).toBe(3);
      expect(stats.nearMisses).toBe(1);
      expect(stats.hazmatIncidents).toBe(1);
    });
  });
});
