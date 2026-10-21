import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsService } from './permissions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { UserRole } from '@prisma/client';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let prisma: any;
  let redis: Record<string, jest.Mock>;

  beforeEach(async () => {
    prisma = {
      rolePermission: { findMany: jest.fn() },
      userPermission: { findMany: jest.fn() },
      role: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };

    redis = {
      setJson: jest.fn(),
      getJson: jest.fn().mockResolvedValue(null),
      del: jest.fn(),
      delPattern: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
  });

  // Test 1: Union of role permissions + user override permissions
  it('should return union of role permissions and user override permissions', async () => {
    prisma.rolePermission.findMany.mockResolvedValue([
      { permission: 'users.list.view' },
      { permission: 'finance.invoices.view' },
    ]);
    prisma.userPermission.findMany.mockResolvedValue([
      { permission: 'finance.invoices.create' },
      { permission: 'users.list.view' }, // duplicate — should be deduplicated
    ]);

    const result = await service.getUserPermissions('user-1');

    expect(result).toEqual(
      expect.arrayContaining([
        'users.list.view',
        'finance.invoices.view',
        'finance.invoices.create',
      ]),
    );
    // 3 unique, not 4
    expect(result).toHaveLength(3);
    // Should have cached the result
    expect(redis.setJson).toHaveBeenCalledWith(
      'user:permissions:effective:user-1',
      expect.any(Array),
      expect.any(Number),
    );
  });

  // Test 2: SUPER_ADMIN bypass in has()
  it('should return true for SUPER_ADMIN regardless of permission', async () => {
    // SUPER_ADMIN users have the '*' wildcard in their role permissions
    prisma.rolePermission.findMany.mockResolvedValue([
      { permission: '*' },
    ]);
    prisma.userPermission.findMany.mockResolvedValue([]);

    const result = await service.has('super-admin-1', 'any.random.permission');
    expect(result).toBe(true);
  });

  // Test 3: Cache hit — should not query DB when Redis has cached data
  it('should return cached permissions on cache hit without querying DB', async () => {
    const cached = ['users.list.view', 'users.profile.update'];
    redis.getJson.mockResolvedValue(cached);

    const result = await service.getUserPermissions('user-1');

    expect(result).toEqual(cached);
    // DB should NOT have been queried
    expect(prisma.rolePermission.findMany).not.toHaveBeenCalled();
    expect(prisma.userPermission.findMany).not.toHaveBeenCalled();
  });

  // Test 4: Cache invalidation should delete the Redis key
  it('should invalidate cache when invalidateUserPermissions is called', async () => {
    await service.invalidateUserPermissions('user-1');

    expect(redis.del).toHaveBeenCalledWith(
      'user:permissions:effective:user-1',
    );
  });

  // Test 5: has() returns false when user lacks the permission
  it('should return false when user does not have the required permission', async () => {
    prisma.rolePermission.findMany.mockResolvedValue([
      { permission: 'users.list.view' },
    ]);
    prisma.userPermission.findMany.mockResolvedValue([]);

    const result = await service.has('user-1', 'finance.invoices.delete');
    expect(result).toBe(false);
  });

  // Test 6: getCatalog returns the permissions tree
  it('should return the permissions catalog tree', () => {
    const catalog = service.getCatalog();
    expect(catalog).toBeInstanceOf(Array);
    expect(catalog.length).toBeGreaterThan(0);
    // First module should have the expected structure
    expect(catalog[0]).toHaveProperty('module');
    expect(catalog[0]).toHaveProperty('nameFa');
    expect(catalog[0]).toHaveProperty('subsystems');
  });

  // Test 7: has() returns true when permission exists via user override
  it('should return true when permission comes from user override', async () => {
    prisma.rolePermission.findMany.mockResolvedValue([]);
    prisma.userPermission.findMany.mockResolvedValue([
      { permission: 'finance.invoices.create' },
    ]);

    const result = await service.has('user-1', 'finance.invoices.create');
    expect(result).toBe(true);
  });
});