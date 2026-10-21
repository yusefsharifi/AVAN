// ═══════════════════════════════════════════════════════════════════════════════
// WorkflowDefinitionService — Unit Tests — M8: Workflow Engine
// ═══════════════════════════════════════════════════════════════════════════════

import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowDefinitionService } from './workflow-definition.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { WorkflowDefinitionJson } from '../types/workflow-definition.types';

describe('WorkflowDefinitionService', () => {
  let service: WorkflowDefinitionService;
  let prisma: any;
  let redis: any;

  const validDefinition: WorkflowDefinitionJson = {
    startEvent: { id: 'start', nameFa: 'شروع', outgoing: ['flow-1'] },
    steps: [
      {
        id: 'step-1',
        nameFa: 'مرحله اول',
        type: 'MANUAL',
        incoming: ['flow-1'],
        outgoing: ['flow-2'],
        assignmentType: 'ROLE',
        assigneeRole: 'ZONE_MANAGER',
        slaHours: 24,
      },
    ],
    gateways: [],
    flows: [
      { id: 'flow-1', source: 'start', target: 'step-1' },
      { id: 'flow-2', source: 'step-1', target: 'end-approved' },
    ],
    endEvents: [
      { id: 'end-approved', nameFa: 'تکمیل', outcome: 'APPROVED', incoming: ['flow-2'] },
    ],
  };

  beforeEach(async () => {
    prisma = {
      workflowDefinition: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      workflowDefinitionVersion: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      workflowInstance: {
        count: jest.fn(),
      },
    };

    redis = {
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowDefinitionService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<WorkflowDefinitionService>(WorkflowDefinitionService);
  });

  describe('create', () => {
    it('should create a new definition', async () => {
      prisma.workflowDefinition.findUnique.mockResolvedValue(null);
      prisma.workflowDefinition.create.mockResolvedValue({ id: '1', code: 'TEST' });

      const result = await service.create(
        {
          code: 'TEST',
          nameFa: 'تست',
          category: 'APPROVAL',
          definition: validDefinition as any,
        },
        'user-1',
      );

      expect(result.code).toBe('TEST');
      expect(prisma.workflowDefinition.create).toHaveBeenCalled();
    });

    it('should reject duplicate code', async () => {
      prisma.workflowDefinition.findUnique.mockResolvedValue({ id: '1', code: 'TEST' });

      await expect(
        service.create(
          {
            code: 'TEST',
            nameFa: 'تست',
            category: 'APPROVAL',
            definition: validDefinition as any,
          },
          'user-1',
        ),
      ).rejects.toThrow(AppException);
    });
  });

  describe('validate', () => {
    it('should validate a correct definition', () => {
      const result = service.validate(validDefinition);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing startEvent', () => {
      const result = service.validate({} as WorkflowDefinitionJson);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect duplicate node IDs', () => {
      const def: WorkflowDefinitionJson = {
        startEvent: { id: 'start', nameFa: 'شروع', outgoing: ['f1'] },
        steps: [
          { id: 'dup', nameFa: 'a', type: 'MANUAL', incoming: ['f1'], outgoing: ['f2'], assignmentType: 'ROLE', slaHours: 1 },
          { id: 'dup', nameFa: 'b', type: 'MANUAL', incoming: ['f2'], outgoing: ['f3'], assignmentType: 'ROLE', slaHours: 1 },
        ],
        gateways: [],
        flows: [
          { id: 'f1', source: 'start', target: 'dup' },
          { id: 'f2', source: 'dup', target: 'dup' },
          { id: 'f3', source: 'dup', target: 'end' },
        ],
        endEvents: [{ id: 'end', nameFa: 'end', outcome: 'APPROVED', incoming: ['f3'] }],
      };
      const result = service.validate(def);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Duplicate'))).toBe(true);
    });

    it('should detect missing incoming flows on steps', () => {
      const def: WorkflowDefinitionJson = {
        startEvent: { id: 'start', nameFa: 'شروع', outgoing: [] },
        steps: [
          { id: 'step-1', nameFa: 'a', type: 'MANUAL', incoming: [], outgoing: [], assignmentType: 'ROLE', slaHours: 1 },
        ],
        gateways: [],
        flows: [],
        endEvents: [],
      };
      const result = service.validate(def);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('incoming'))).toBe(true);
    });

    it('should detect invalid source reference in flows', () => {
      const def: WorkflowDefinitionJson = {
        startEvent: { id: 'start', nameFa: 'شروع', outgoing: ['f1'] },
        steps: [
          { id: 'step-1', nameFa: 'a', type: 'MANUAL', incoming: ['f1'], outgoing: ['f2'], assignmentType: 'ROLE', slaHours: 1 },
        ],
        gateways: [],
        flows: [
          { id: 'f1', source: 'start', target: 'step-1' },
          { id: 'f2', source: 'nonexistent', target: 'end' },
        ],
        endEvents: [{ id: 'end', nameFa: 'end', outcome: 'APPROVED', incoming: ['f2'] }],
      };
      const result = service.validate(def);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('does not exist'))).toBe(true);
    });
  });

  describe('deactivate', () => {
    it('should prevent deactivation with running instances', async () => {
      prisma.workflowDefinition.findUnique.mockResolvedValue({ id: '1', code: 'TEST' });
      prisma.workflowInstance.count.mockResolvedValue(5);

      await expect(service.deactivate('1')).rejects.toThrow(AppException);
    });

    it('should deactivate when no running instances', async () => {
      prisma.workflowDefinition.findUnique.mockResolvedValue({ id: '1', code: 'TEST' });
      prisma.workflowInstance.count.mockResolvedValue(0);
      prisma.workflowDefinition.update.mockResolvedValue({ id: '1', isActive: false });

      const result = await service.deactivate('1');
      expect(result.isActive).toBe(false);
    });
  });
});
