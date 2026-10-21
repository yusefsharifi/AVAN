import { Test, TestingModule } from '@nestjs/testing';
import { ReportEngineService } from './report-engine.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ReportingGatewayService } from './reporting-gateway.service';

describe('ReportEngineService', () => {
  let service: ReportEngineService;
  let prisma: any;
  let redis: Record<string, jest.Mock>;
  let gateway: any;

  beforeEach(async () => {
    prisma = {
      reportDefinition: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      reportExecution: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      $queryRawUnsafe: jest.fn(),
    };

    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      getJson: jest.fn(),
      setJson: jest.fn(),
    };

    gateway = {
      emitExecutionStarted: jest.fn(),
      emitExecutionCompleted: jest.fn(),
      emitExecutionFailed: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportEngineService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: ReportingGatewayService, useValue: gateway },
      ],
    }).compile();

    service = module.get<ReportEngineService>(ReportEngineService);
  });

  describe('runReport', () => {
    it('should run a report successfully', async () => {
      prisma.reportDefinition.findUnique.mockResolvedValue({
        id: 'r-1', code: 'SALES_REPORT', nameFa: 'گزارش فروش',
        config: {
          dataSources: ['invoice'],
          fields: [{ field: 'id', alias: 'invoiceId' }],
          aggregations: [],
          filters: [],
          groupBy: [],
          orderBy: [{ field: 'createdAt', direction: 'desc' }],
        },
        allowedRoles: [],
        zoneId: 'z-1',
      });
      prisma.reportExecution.create.mockResolvedValue({ id: 'exec-1' });
      prisma.$queryRawUnsafe.mockResolvedValue([{ invoiceId: 1 }, { invoiceId: 2 }]);
      prisma.reportExecution.update.mockResolvedValue({});
      prisma.reportDefinition.update.mockResolvedValue({});

      const result = await service.runReport(
        { reportCode: 'SALES_REPORT', parameters: {} } as any,
        'user-1',
      );

      expect(result.executionId).toBe('exec-1');
      expect(result.status).toBe('COMPLETED');
      expect(result.rowCount).toBe(2);
      expect(gateway.emitExecutionStarted).toHaveBeenCalled();
      expect(gateway.emitExecutionCompleted).toHaveBeenCalled();
    });

    it('should throw REPORT_NOT_FOUND if report does not exist', async () => {
      prisma.reportDefinition.findUnique.mockResolvedValue(null);

      await expect(
        service.runReport({ reportCode: 'NONEXISTENT', parameters: {} } as any, 'user-1'),
      ).rejects.toThrow(AppException);
    });

    it('should throw REPORT_ACCESS_DENIED for unauthorized role', async () => {
      prisma.reportDefinition.findUnique.mockResolvedValue({
        id: 'r-1', code: 'SEC', allowedRoles: ['SUPER_ADMIN'], config: {}, zoneId: 'z-1',
      });
      prisma.user.findUnique.mockResolvedValue({ role: 'COMPANY_STAFF' });

      await expect(
        service.runReport({ reportCode: 'SEC', parameters: {} } as any, 'user-1'),
      ).rejects.toThrow(AppException);
    });

    it('should handle query execution failure', async () => {
      prisma.reportDefinition.findUnique.mockResolvedValue({
        id: 'r-1', code: 'FAIL', nameFa: 'Fail', config: {
          dataSources: ['traffic'], fields: [], groupBy: [],
        }, allowedRoles: [], zoneId: 'z-1',
      });
      prisma.reportExecution.create.mockResolvedValue({ id: 'exec-1' });
      prisma.$queryRawUnsafe.mockRejectedValue(new Error('DB error'));
      prisma.reportExecution.update.mockResolvedValue({});

      await expect(
        service.runReport({ reportCode: 'FAIL', parameters: {} } as any, 'user-1'),
      ).rejects.toThrow();

      expect(prisma.reportExecution.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FAILED' }),
        }),
      );
      expect(gateway.emitExecutionFailed).toHaveBeenCalled();
    });
  });

  describe('buildQuery', () => {
    it('should build a basic query', () => {
      const config = {
        dataSources: ['traffic'],
        fields: [{ field: 'id' }, { field: 'plate', alias: 'vehiclePlate' }],
        aggregations: [],
        filters: [],
        groupBy: [],
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
      };

      const result = service.buildQuery(config as any, { zoneId: 'z-1' }, { fromDate: '', toDate: '' });
      expect(result.sql).toContain('SELECT');
      expect(result.sql).toContain('"TrafficLog"');
      expect(result.bindings).toContain('z-1');
    });

    it('should add date filters', () => {
      const config = {
        dataSources: ['traffic'],
        fields: [{ field: 'id' }],
        aggregations: [],
        filters: [],
        groupBy: [],
        orderBy: [],
      };

      const result = service.buildQuery(config as any, {}, { fromDate: '2026-01-01', toDate: '2026-01-31' });
      expect(result.bindings).toContain('2026-01-01');
    });

    it('should handle groupBy and aggregations', () => {
      const config = {
        dataSources: ['traffic'],
        fields: [{ field: 'direction' }],
        aggregations: [{ function: 'count', field: 'id', alias: 'total' }],
        filters: [],
        groupBy: ['direction'],
        orderBy: [{ field: 'total', direction: 'desc' }],
      };

      const result = service.buildQuery(config as any, {}, { fromDate: '', toDate: '' });
      expect(result.sql).toContain('GROUP BY');
      expect(result.sql).toContain('COUNT(*)');
    });

    it('should apply filters with operators', () => {
      const config = {
        dataSources: ['traffic'],
        fields: [{ field: 'id' }],
        aggregations: [],
        filters: [
          { field: 'direction', operator: 'eq', value: 'ENTRY' },
          { field: 'accessResult', operator: 'like', value: 'DENIED' },
        ],
        groupBy: [],
        orderBy: [],
      };

      const result = service.buildQuery(config as any, {}, { fromDate: '', toDate: '' });
      expect(result.sql).toContain('"direction"');
      expect(result.bindings).toContain('ENTRY');
      expect(result.sql).toContain('ILIKE');
    });
  });

  describe('cancelExecution', () => {
    it('should cancel a running execution', async () => {
      prisma.reportExecution.findUnique.mockResolvedValue({
        id: 'exec-1', status: 'RUNNING',
      });
      prisma.reportExecution.update.mockResolvedValue({});

      await service.cancelExecution('exec-1');
      expect(prisma.reportExecution.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CANCELLED' }),
        }),
      );
    });

    it('should throw if not running', async () => {
      prisma.reportExecution.findUnique.mockResolvedValue({
        id: 'exec-1', status: 'COMPLETED',
      });

      await expect(service.cancelExecution('exec-1')).rejects.toThrow(AppException);
    });

    it('should throw if not found', async () => {
      prisma.reportExecution.findUnique.mockResolvedValue(null);
      await expect(service.cancelExecution('nonexistent')).rejects.toThrow(AppException);
    });
  });

  describe('getExecutionHistory', () => {
    it('should return execution history', async () => {
      prisma.reportDefinition.findUnique.mockResolvedValue({ id: 'r-1' });
      prisma.reportExecution.findMany.mockResolvedValue([
        { id: 'exec-1', status: 'COMPLETED' },
      ]);

      const result = await service.getExecutionHistory('SALES_REPORT');
      expect(result).toHaveLength(1);
    });
  });

  describe('downloadReport', () => {
    it('should return cached presigned URL', async () => {
      prisma.reportExecution.findUnique.mockResolvedValue({
        id: 'exec-1', fileKey: 'reports/exec-1.csv',
      });
      redis.get.mockResolvedValue('/cached/url');

      const result = await service.downloadReport('exec-1');
      expect(result.fileKey).toBe('reports/exec-1.csv');
      expect(result.presignedUrl).toBe('/cached/url');
    });

    it('should throw if no fileKey', async () => {
      prisma.reportExecution.findUnique.mockResolvedValue({
        id: 'exec-1', fileKey: null,
      });

      await expect(service.downloadReport('exec-1')).rejects.toThrow(AppException);
    });
  });
});
