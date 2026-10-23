import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuditService } from '../../common/services/audit.service';
import { AppException } from '../../common/exceptions/app.exception';
import { UserRole, UserStatus } from '@prisma/client';

const mockActor = {
  userId: 'admin-1',
  role: UserRole.SUPER_ADMIN,
  companyId: undefined,
  zoneId: undefined,
};

describe('UserService', () => {
  let service: UserService;
  let prisma: any;
  let redis: Record<string, jest.Mock>;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      userSession: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      userPermission: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    redis = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      delPattern: jest.fn(),
      setJson: jest.fn(),
      getJson: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('findAll', () => {
    it('should paginate users correctly', async () => {
      const users = Array.from({ length: 20 }, (_, i) => ({
        id: `user-${i}`,
        email: `user${i}@test.com`,
      }));
      prisma.user.findMany.mockResolvedValue(users);
      prisma.user.count.mockResolvedValue(50);

      const result = await service.findAll({ page: 1, limit: 20 }, mockActor);

      expect(result.data).toHaveLength(20);
      expect(result.meta.total).toBe(50);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by role and status', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.findAll({ role: UserRole.GUARD, status: UserStatus.ACTIVE }, mockActor);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: UserRole.GUARD,
            status: UserStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should support cursor pagination', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'cursor-1', createdAt: new Date('2024-01-01') });
      prisma.user.findMany.mockResolvedValue([
        { id: 'user-2', createdAt: new Date('2024-01-02') },
        { id: 'user-3', createdAt: new Date('2024-01-03') },
      ]);

      const result = await service.findAll({ cursor: 'cursor-1', limit: 10 }, mockActor);

      expect(result.data).toHaveLength(2);
      expect(result.meta.cursor).toBe('user-3');
    });
  });

  describe('softDelete', () => {
    it('should soft delete (not hard delete)', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'user-1', deletedAt: null });
      prisma.user.update.mockResolvedValue({});

      await service.softDelete('user-1', mockActor);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });

    it('should prevent deleting own account', async () => {
      await expect(
        service.softDelete('user-1', { ...mockActor, userId: 'user-1' }),
      ).rejects.toThrow(AppException);
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar to MinIO and store key', async () => {
      prisma.user.update.mockResolvedValue({});
      const file = {
        originalname: 'avatar.jpg',
        buffer: Buffer.from('test'),
        size: 1024,
      } as Express.Multer.File;

      const result = await service.uploadAvatar('user-1', file);

      expect(result.avatarUrl).toContain('avatars/user-1/');
      expect(prisma.user.update).toHaveBeenCalled();
    });
  });

  describe('clear cache on update', () => {
    it('should clear Redis cache on update', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'user-1', deletedAt: null });
      prisma.user.update.mockResolvedValue({});

      await service.update('user-1', { firstName: 'New Name' }, mockActor);

      expect(redis.delPattern).toHaveBeenCalledWith('user:profile:user-1*');
      expect(redis.delPattern).toHaveBeenCalledWith('user:permissions:user-1*');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SECURITY (SEC-021) — session revocation on scope change
  // ══════════════════════════════════════════════════════════════════════════

  describe('session revocation on scope change', () => {
    const scopedActor = {
      userId: 'admin-1',
      role: UserRole.SUPER_ADMIN,
      companyId: undefined,
      zoneId: undefined,
    };

    it('should revoke all sessions when the role changes', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        role: UserRole.GUARD,
        zoneId: 'zone-1',
        companyId: null,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      });
      prisma.user.update.mockResolvedValue({});
      prisma.userSession.updateMany.mockResolvedValue({ count: 2 });

      await service.update('user-1', { role: UserRole.ZONE_OPERATOR }, scopedActor);

      expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRevoked: false },
        data: { isRevoked: true },
      });
      expect((service as any).audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_SESSIONS_REVOKED',
          metadata: { reason: 'scope-change' },
        }),
      );
    });

    it('should revoke all sessions when zoneId / company / status change', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        role: UserRole.GUARD,
        zoneId: 'zone-1',
        companyId: null,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      });
      prisma.user.update.mockResolvedValue({});

      await service.update('user-1', { zoneId: 'zone-2' }, scopedActor);
      expect(prisma.userSession.updateMany).toHaveBeenCalled();
      prisma.userSession.updateMany.mockClear();

      await service.update('user-1', { status: UserStatus.SUSPENDED }, scopedActor);
      expect(prisma.userSession.updateMany).toHaveBeenCalled();
    });

    it('should NOT revoke sessions for profile-only changes (name change)', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        role: UserRole.GUARD,
        zoneId: 'zone-1',
        companyId: null,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      });
      prisma.user.update.mockResolvedValue({});

      await service.update('user-1', { firstName: 'New', lastName: 'Name' }, scopedActor);

      expect(prisma.userSession.updateMany).not.toHaveBeenCalled();
      expect((service as any).audit.log).not.toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_SESSIONS_REVOKED' }),
      );
    });

    it('should revoke sessions on suspend and on softDelete', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        role: UserRole.GUARD,
        zoneId: 'zone-1',
        companyId: null,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      });
      prisma.user.update.mockResolvedValue({});
      prisma.userSession.updateMany.mockResolvedValue({ count: 3 });

      await service.suspend('user-1', 'policy', scopedActor);
      expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRevoked: false },
        data: { isRevoked: true },
      });
      expect((service as any).audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_SESSIONS_REVOKED' }),
      );

      prisma.userSession.updateMany.mockClear();
      await service.softDelete('user-1', { ...scopedActor, userId: 'admin-1' });
      // id !== actor.userId ⇒ allowed
      expect(prisma.userSession.updateMany).toHaveBeenCalled();
    });
  });
});