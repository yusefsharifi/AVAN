import { Test, TestingModule } from '@nestjs/testing';
import { WorkOrderService } from './work-order.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CmmsGatewayService } from './cmms-gateway.service';
import { WorkOrderStatus } from '../dto/enums';

// We need to use (prisma as any).workOrder etc. because the service uses `this.prisma as any`

describe('WorkOrderService', () => {
  let service: WorkOrderService;
  let prisma: any;
  let redis: Record<string, jest.Mock>;
  let gateway: any;

  beforeEach(async () => {
    prisma = {
      zone: { findUnique: jest.fn() },
      workOrder: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      asset: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      technician: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      sparePart: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      workOrderPart: {
        create: jest.fn(),
      },
      sparePartMovement: {
        create: jest.fn(),
      },
      failureLog: {
        update: jest.fn(),
      },
      maintenancePlan: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      incr: jest.fn().mockResolvedValue(1),
      getJson: jest.fn(),
      setJson: jest.fn(),
    };

    gateway = {
      emitWorkOrderCreated: jest.fn(),
      emitWorkOrderAssigned: jest.fn(),
      emitWorkOrderStatusChanged: jest.fn(),
      emitWorkOrderCompleted: jest.fn(),
      emitSlaBreach: jest.fn(),
      emitLowStock: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkOrderService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: CmmsGatewayService, useValue: gateway },
      ],
    }).compile();

    service = module.get<WorkOrderService>(WorkOrderService);
  });

  describe('create', () => {
    it('should create a work order with generated number', async () => {
      prisma.asset.findUnique.mockResolvedValue({ id: 'a-1', status: 'ACTIVE', nameFa: 'پمپ' });
      prisma.zone.findUnique.mockResolvedValue({ id: 'z-1', code: 'TEH' });
      prisma.technician.findUnique.mockResolvedValue(null);
      prisma.workOrder.create.mockResolvedValue({
        id: 'wo-1', workOrderNumber: 'WO-TEH-2026-000001', status: 'APPROVED',
      });

      const result = await service.create(
        {
          zoneId: 'z-1', assetId: 'a-1', type: 'CORRECTIVE', category: 'MECHANICAL',
          priority: 'HIGH', title: 'Fix pump', description: 'Pump is broken',
          slaHours: 8,
        } as any,
        'user-1',
      );

      expect(result.workOrderNumber).toContain('WO-TEH-');
      expect(prisma.workOrder.create).toHaveBeenCalled();
      expect(gateway.emitWorkOrderCreated).toHaveBeenCalled();
    });

    it('should throw ASSET_NOT_FOUND if asset does not exist', async () => {
      prisma.asset.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ zoneId: 'z-1', assetId: 'nonexistent', type: 'CORRECTIVE', category: 'MECHANICAL', priority: 'HIGH', title: 'test', description: 'test' } as any, 'user-1'),
      ).rejects.toThrow(AppException);
    });

    it('should throw ASSET_DECOMMISSIONED for decommissioned asset', async () => {
      prisma.asset.findUnique.mockResolvedValue({ id: 'a-1', status: 'DECOMMISSIONED' });

      await expect(
        service.create({ zoneId: 'z-1', assetId: 'a-1', type: 'CORRECTIVE', category: 'MECHANICAL', priority: 'HIGH', title: 'test', description: 'test' } as any, 'user-1'),
      ).rejects.toThrow(AppException);
    });
  });

  describe('status transitions', () => {
    const baseWo = {
      id: 'wo-1', status: 'APPROVED', zoneId: 'z-1', workOrderNumber: 'WO-001',
      asset: { nameFa: 'test' }, assetId: 'a-1', assignedTechnicianId: null,
    };

    it('should approve a work order', async () => {
      prisma.workOrder.findUnique.mockResolvedValue({ ...baseWo, status: 'PENDING_APPROVAL' });
      prisma.workOrder.update.mockResolvedValue({ ...baseWo, status: 'APPROVED' });

      const result = await service.approve('wo-1', 'user-1');
      expect(result.status).toBe('APPROVED');
    });

    it('should throw on invalid transition', async () => {
      prisma.workOrder.findUnique.mockResolvedValue({ ...baseWo, status: 'CLOSED' as any });

      await expect(service.approve('wo-1', 'user-1')).rejects.toThrow(AppException);
    });

    it('should assign a technician', async () => {
      prisma.workOrder.findUnique.mockResolvedValue(baseWo);
      prisma.technician.findUnique.mockResolvedValue({ id: 't-1', name: 'Ali', isActive: true });
      prisma.workOrder.update.mockResolvedValue({ ...baseWo, status: 'ASSIGNED' });
      prisma.technician.update.mockResolvedValue({});

      const result = await service.assign('wo-1', 't-1', 'user-1');
      expect(result.status).toBe('ASSIGNED');
      expect(gateway.emitWorkOrderAssigned).toHaveBeenCalled();
    });

    it('should throw TECHNICIAN_NOT_FOUND', async () => {
      prisma.workOrder.findUnique.mockResolvedValue(baseWo);
      prisma.technician.findUnique.mockResolvedValue(null);

      await expect(service.assign('wo-1', 'nonexistent', 'user-1')).rejects.toThrow(AppException);
    });

    it('should start work', async () => {
      prisma.workOrder.findUnique.mockResolvedValue({ ...baseWo, status: 'ASSIGNED' });
      prisma.workOrder.update.mockResolvedValue({ ...baseWo, status: 'IN_PROGRESS' });

      const result = await service.startWork('wo-1', 'user-1');
      expect(result.status).toBe('IN_PROGRESS');
    });
  });

  describe('cancel', () => {
    it('should cancel a work order and restore asset', async () => {
      prisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-1', status: 'IN_PROGRESS', zoneId: 'z-1', workOrderNumber: 'WO-001',
        asset: { status: 'UNDER_MAINTENANCE' }, assetId: 'a-1',
        assignedTechnicianId: 't-1', notes: '',
      });
      prisma.workOrder.update.mockResolvedValue({ status: 'CANCELLED' });
      prisma.technician.update.mockResolvedValue({});

      await service.cancel('wo-1', 'no budget', 'user-1');

      expect(prisma.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'ACTIVE' }) }),
      );
    });
  });

  describe('getWorkOrderStats', () => {
    it('should compute stats from work orders', async () => {
      prisma.workOrder.findMany.mockResolvedValue([
        { type: 'CORRECTIVE', priority: 'HIGH', status: 'COMPLETED', slaBreached: false,
          actualHours: 4, downtime: 120, totalCost: 1000, laborCost: 500, partsCost: 300, contractorCost: 200,
          isEmergency: false, assignedTechnicianId: 't-1' },
        { type: 'PREVENTIVE', priority: 'NORMAL', status: 'CLOSED', slaBreached: true,
          actualHours: 2, downtime: 0, totalCost: 500, laborCost: 200, partsCost: 200, contractorCost: 100,
          isEmergency: true, assignedTechnicianId: 't-1' },
      ]);
      prisma.technician.findUnique.mockResolvedValue({ name: 'Ali' });

      const stats = await service.getWorkOrderStats('z-1');

      expect(stats.total).toBe(2);
      expect(stats.slaBreached).toBe(1);
      expect(stats.emergency).toBe(1);
      expect(stats.totalCost).toBe(1500);
      expect(stats.byTechnician).toHaveLength(1);
      expect(stats.byTechnician[0].name).toBe('Ali');
    });
  });
});
