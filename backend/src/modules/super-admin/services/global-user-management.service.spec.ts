import { Test, TestingModule } from '@nestjs/testing';
import { GlobalUserManagementService } from './global-user-management.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditComplianceService } from './audit-compliance.service';
import { AppException } from '../../../common/exceptions/app.exception';

describe('GlobalUserManagementService', () => {
  let service: GlobalUserManagementService;
  let prisma: any;
  let redis: any;
  let auditCompliance: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
      },
      $queryRawUnsafe: jest.fn().mockResolvedValue([]),
    };

    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      del: jest.fn(),
    };

    auditCompliance = {
      logGlobalEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalUserManagementService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditComplianceService, useValue: auditCompliance },
      ],
    }).compile();

    service = module.get<GlobalUserManagementService>(GlobalUserManagementService);
  });

  describe('findAllUsers', () => {
    it('should return paginated users', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'u-1', firstName: 'Ali', lastName: 'Rezaei', role: 'ZONE_MANAGER' },
        { id: 'u-2', firstName: 'Sara', lastName: 'Ahmadi', role: 'COMPANY_STAFF' },
      ]);
      prisma.user.count.mockResolvedValue(2);

      const result = await service.findAllUsers({ limit: 20 } as any);

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should filter by zone', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.findAllUsers({ zoneId: 'zone-1', limit: 20 } as any);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ zoneId: 'zone-1' }),
        }),
      );
    });

    it('should filter by role', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.findAllUsers({ role: 'ZONE_MANAGER', limit: 20 } as any);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'ZONE_MANAGER' }),
        }),
      );
    });

    it('should search by name or email', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.findAllUsers({ search: 'Ali', limit: 20 } as any);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ firstName: expect.objectContaining({ contains: 'Ali' }) }),
            ]),
          }),
        }),
      );
    });
  });

  describe('getUserActivity', () => {
    it('should return user activity data', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        firstName: 'Ali',
        lastName: 'Rezaei',
        email: 'ali@test.com',
        role: 'ZONE_MANAGER',
        lastLoginAt: new Date(),
      });
      prisma.$queryRawUnsafe.mockResolvedValue([
        { action: 'LOGIN', timestamp: new Date() },
        { action: 'VIEW_REPORT', timestamp: new Date() },
      ]);

      const result = await service.getUserActivity('u-1', 30);

      expect(result.user.id).toBe('u-1');
      expect(result.loginCount).toBe(1);
      expect(result.actionsCount).toBe(2);
    });

    it('should throw if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserActivity('user-999', 30)).rejects.toThrow(AppException);
    });
  });

  describe('forceLogout', () => {
    it('should revoke all sessions for user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u-1', zoneId: 'zone-1' });

      await service.forceLogout('u-1', 'security breach', 'admin-1');

      expect(redis.set).toHaveBeenCalledWith(
        'auth:blacklist:u-1',
        'force_logout',
        86400,
      );
    });

    it('should write audit log', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u-1', zoneId: 'zone-1' });

      await service.forceLogout('u-1', 'security breach', 'admin-1');

      expect(auditCompliance.logGlobalEvent).toHaveBeenCalledWith(
        'FORCE_LOGOUT',
        'SUPER_ADMIN',
        'admin-1',
        'zone-1',
        'User',
        'u-1',
        expect.objectContaining({ reason: 'security breach' }),
      );
    });
  });

  describe('impersonateUser', () => {
    it('should create impersonation token', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u-1', zoneId: 'zone-1', role: 'COMPANY_STAFF' });

      const result = await service.impersonateUser(
        { targetUserId: 'u-1', reason: 'Support ticket #123', durationMinutes: 30 } as any,
        'admin-1',
        '192.168.1.1',
      );

      expect(result.impersonationToken).toBeDefined();
      expect(result.targetUser.id).toBe('u-1');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should write audit log for impersonation start', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u-1', zoneId: 'zone-1', role: 'COMPANY_STAFF' });

      await service.impersonateUser(
        { targetUserId: 'u-1', reason: 'Support ticket', durationMinutes: 15 } as any,
        'admin-1',
        '192.168.1.1',
      );

      expect(auditCompliance.logGlobalEvent).toHaveBeenCalledWith(
        'IMPERSONATION_START',
        'SUPER_ADMIN',
        'admin-1',
        'zone-1',
        'User',
        'u-1',
        expect.objectContaining({ reason: 'Support ticket' }),
        '192.168.1.1',
      );
    });

    it('should default to 30 minutes if not specified', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u-1', zoneId: 'zone-1', role: 'COMPANY_STAFF' });

      const result = await service.impersonateUser(
        { targetUserId: 'u-1', reason: 'Support' } as any,
        'admin-1',
        '192.168.1.1',
      );

      const diffMs = result.expiresAt.getTime() - Date.now();
      // Should be around 30 minutes (±2 sec tolerance)
      expect(diffMs).toBeGreaterThan(29 * 60 * 1000);
      expect(diffMs).toBeLessThan(31 * 60 * 1000);
    });
  });

  describe('updateUserRole', () => {
    it('should update user role', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u-1', role: 'COMPANY_STAFF' });
      prisma.user.update.mockResolvedValue({ id: 'u-1', role: 'COMPANY_ADMIN' });

      const result = await service.updateUserRole('u-1', 'COMPANY_ADMIN', 'promotion', 'admin-1');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u-1' },
          data: expect.objectContaining({ role: 'COMPANY_ADMIN' }),
        }),
      );
      expect(result.role).toBe('COMPANY_ADMIN');
    });

    it('should write audit log for role change', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u-1', role: 'COMPANY_STAFF', zoneId: 'zone-1' });
      prisma.user.update.mockResolvedValue({ id: 'u-1', role: 'COMPANY_ADMIN' });

      await service.updateUserRole('u-1', 'COMPANY_ADMIN', 'promotion', 'admin-1');

      expect(auditCompliance.logGlobalEvent).toHaveBeenCalledWith(
        'ROLE_CHANGED',
        'SUPER_ADMIN',
        'admin-1',
        'zone-1',
        'User',
        'u-1',
        expect.objectContaining({ oldRole: 'COMPANY_STAFF', newRole: 'COMPANY_ADMIN' }),
      );
    });
  });

  describe('endImpersonation', () => {
    it('should end impersonation session and log audit', async () => {
      await service.endImpersonation('session-1');

      expect(auditCompliance.logGlobalEvent).toHaveBeenCalledWith(
        'IMPERSONATION_END',
        'SUPER_ADMIN',
        undefined,
        undefined,
        'Session',
        'session-1',
        {},
      );
    });
  });
});
