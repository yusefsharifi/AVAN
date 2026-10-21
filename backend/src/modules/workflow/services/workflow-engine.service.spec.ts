// ═══════════════════════════════════════════════════════════════════════════════
// WorkflowEngineService — Unit Tests — M8: Workflow Engine
// ═══════════════════════════════════════════════════════════════════════════════

import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowSlaService } from './workflow-sla.service';
import { WorkflowDefinitionService } from './workflow-definition.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('WorkflowEngineService', () => {
  let service: WorkflowEngineService;
  let prisma: any;
  let redis: any;
  let slaService: any;
  let defService: any;

  beforeEach(async () => {
    prisma = {
      workflowInstance: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
      },
      workflowDefinition: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      workflowTask: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      workflowEvent: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      taskInboxEntry: {
        create: jest.fn(),
        deleteMany: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
      },
      workflowEscalation: {
        create: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      workflowMetricSnapshot: {
        upsert: jest.fn(),
      },
    };

    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    slaService = {
      calculateSlaDueAt: jest.fn().mockResolvedValue(new Date('2025-12-31')),
      getTaskSlaProgress: jest.fn(),
      getSlaConfig: jest.fn(),
    };

    defService = {
      findByCode: jest.fn(),
      validate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowEngineService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      { provide: WorkflowSlaService, useValue: slaService },
      { provide: WorkflowDefinitionService, useValue: defService },
      { provide: EventEmitter2, useValue: { emit: jest.fn(), on: jest.fn(), once: jest.fn() } },
    ],
    }).compile();

    service = module.get<WorkflowEngineService>(WorkflowEngineService);
  });

  describe('completeTask', () => {
    it('should reject completion for non-existent task', async () => {
      prisma.workflowTask.findUnique.mockResolvedValue(null);

      await expect(
        service.completeTask(
          { taskId: 'nonexistent', decision: 'APPROVED' },
          'user-1',
          'zone-1',
        ),
      ).rejects.toThrow(AppException);
    });

    it('should reject completion for non-active task', async () => {
      prisma.workflowTask.findUnique.mockResolvedValue({
        id: 'task-1',
        status: 'COMPLETED',
        instance: { variables: {} },
      });

      await expect(
        service.completeTask(
          { taskId: 'task-1', decision: 'APPROVED' },
          'user-1',
          'zone-1',
        ),
      ).rejects.toThrow(AppException);
    });

    it('should complete task with APPROVED decision', async () => {
      const mockInstance = {
        id: 'inst-1',
        definitionId: 'def-1',
        currentStepIds: ['task-1'],
        completedStepIds: [],
        variables: {},
      };
      const mockTask = {
        id: 'task-1',
        status: 'ACTIVE',
        stepId: 'step-1',
        stepNameFa: 'test step',
        instanceId: 'inst-1',
        zoneId: 'zone-1',
        instance: mockInstance,
      };
      const mockDef = {
        definition: {
          startEvent: { id: 'start', outgoing: ['f1'] },
          steps: [],
          gateways: [],
          flows: [{ id: 'f1', source: 'start', target: 'step-1' }],
          endEvents: [{ id: 'end', outcome: 'APPROVED', incoming: [] }],
        },
      };

      prisma.workflowTask.findUnique.mockResolvedValue(mockTask);
      prisma.workflowTask.update.mockResolvedValue({});
      prisma.workflowInstance.update.mockResolvedValue({});
      prisma.workflowInstance.findUnique.mockResolvedValue(mockInstance);
      prisma.workflowEvent.create.mockResolvedValue({});
      prisma.taskInboxEntry.deleteMany.mockResolvedValue({});
      prisma.taskInboxEntry.findMany.mockResolvedValue([]);
      prisma.workflowTask.findMany.mockResolvedValue([]);
      prisma.workflowDefinition.findUnique.mockResolvedValue(mockDef);

      const result = await service.completeTask(
        { taskId: 'task-1', decision: 'APPROVED' },
        'user-1',
        'zone-1',
      );

      expect(prisma.workflowTask.update).toHaveBeenCalled();
    });
  });

  describe('pauseInstance', () => {
    it('should reject pause for non-existent instance', async () => {
      prisma.workflowInstance.findUnique.mockResolvedValue(null);

      await expect(
        service.pauseInstance('nonexistent', 'reason', 'user-1'),
      ).rejects.toThrow(AppException);
    });

    it('should reject pause for non-running instance', async () => {
      prisma.workflowInstance.findUnique.mockResolvedValue({
        id: 'inst-1',
        status: 'COMPLETED',
      });

      await expect(
        service.pauseInstance('inst-1', 'reason', 'user-1'),
      ).rejects.toThrow(AppException);
    });

    it('should pause a running instance', async () => {
      prisma.workflowInstance.findUnique.mockResolvedValue({
        id: 'inst-1',
        status: 'RUNNING',
      });
      prisma.workflowInstance.update.mockResolvedValue({});
      prisma.workflowTask.updateMany.mockResolvedValue({});
      prisma.workflowEvent.create.mockResolvedValue({});

      const result = await service.pauseInstance('inst-1', 'maintenance', 'user-1');
      expect(prisma.workflowInstance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PAUSED' }),
        }),
      );
    });
  });

  describe('terminateInstance', () => {
    it('should terminate and cancel all active tasks', async () => {
      prisma.workflowInstance.findUnique.mockResolvedValue({
        id: 'inst-1',
        status: 'RUNNING',
      });
      prisma.workflowTask.updateMany.mockResolvedValue({});
      prisma.workflowInstance.update.mockResolvedValue({});
      prisma.taskInboxEntry.deleteMany.mockResolvedValue({});
      prisma.workflowEvent.create.mockResolvedValue({});

      await service.terminateInstance('inst-1', 'no longer needed', 'admin');

      expect(prisma.workflowTask.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CANCELLED' }),
        }),
      );
      expect(prisma.workflowInstance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'TERMINATED' }),
        }),
      );
    });
  });
});
