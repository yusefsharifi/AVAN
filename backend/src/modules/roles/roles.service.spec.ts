import { Test, TestingModule } from '@nestjs/testing';
import { RolesService, RoleActor } from './roles.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { PermissionsService } from '../permissions/permissions.service';
import { UserRole, RoleScope } from '@prisma/client';
import { AppException } from '../../common/exceptions/app.exception';

describe('RolesService', () => {
  let service: RolesService;
  let prisma: any;
  let audit: any;
  let permissionsService: any;

  beforeEach(async () => {
    prisma = {
      role: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      roleAssignment: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      rolePermission: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((fnOrArray) => {
        if (typeof fnOrArray === 'function') {
          return fnOrArray(prisma);
        }
        return Promise.all(fnOrArray);
      }),
    };

    audit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    permissionsService = {
      invalidateUserPermissions: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: PermissionsService, useValue: permissionsService },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  describe('listRoles (scoping)', () => {
    it('SUPER_ADMIN should see all roles with empty where clause', async () => {
      prisma.role.findMany.mockResolvedValue([]);
      const actor: RoleActor = { userId: 'admin-1', role: UserRole.SUPER_ADMIN };

      await service.listRoles(actor);

      expect(prisma.role.findMany).toHaveBeenCalledWith({
        where: {},
        include: { _count: { select: { assignments: true, permissions: true } } },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('ZONE_MANAGER should see GLOBAL roles and their zone roles', async () => {
      prisma.role.findMany.mockResolvedValue([]);
      const actor: RoleActor = {
        userId: 'zm-1',
        role: UserRole.ZONE_MANAGER,
        zoneId: 'zone-123',
      };

      await service.listRoles(actor);

      expect(prisma.role.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { scopeType: RoleScope.GLOBAL },
            { scopeType: RoleScope.ZONE, zoneId: 'zone-123' },
          ],
        },
        include: { _count: { select: { assignments: true, permissions: true } } },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('COMPANY_ADMIN should see GLOBAL roles and their company roles', async () => {
      prisma.role.findMany.mockResolvedValue([]);
      const actor: RoleActor = {
        userId: 'ca-1',
        role: UserRole.COMPANY_ADMIN,
        companyId: 'company-456',
      };

      await service.listRoles(actor);

      expect(prisma.role.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { scopeType: RoleScope.GLOBAL },
            { scopeType: RoleScope.COMPANY, companyId: 'company-456' },
          ],
        },
        include: { _count: { select: { assignments: true, permissions: true } } },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('createRole', () => {
    it('should disallow ZONE_MANAGER from creating COMPANY scoped role', async () => {
      const actor: RoleActor = {
        userId: 'zm-1',
        role: UserRole.ZONE_MANAGER,
        zoneId: 'zone-123',
      };

      await expect(
        service.createRole(
          { name: 'accountant', nameFa: 'حسابدار', scopeType: RoleScope.COMPANY },
          actor,
        ),
      ).rejects.toThrow(AppException);
    });

    it('should throw ROLE_NAME_TAKEN if role name already exists in same scope', async () => {
      const actor: RoleActor = { userId: 'admin-1', role: UserRole.SUPER_ADMIN };
      prisma.role.findFirst.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.createRole({ name: 'finance_viewer', nameFa: 'مشاهده‌گر مالی' }, actor),
      ).rejects.toThrow(AppException);
    });

    it('should create role successfully and log audit', async () => {
      const actor: RoleActor = { userId: 'admin-1', role: UserRole.SUPER_ADMIN };
      prisma.role.findFirst.mockResolvedValue(null);
      const createdRole = {
        id: 'new-role-id',
        name: 'custom_role',
        nameFa: 'نقش سفارشی',
        scopeType: RoleScope.GLOBAL,
      };
      prisma.role.create.mockResolvedValue(createdRole);

      const result = await service.createRole(
        { name: 'custom_role', nameFa: 'نقش سفارشی' },
        actor,
      );

      expect(result).toEqual(createdRole);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          targetId: 'new-role-id',
          action: 'ROLE_CREATED',
        }),
      );
    });
  });

  describe('updateRole & deleteRole (isSystem protection)', () => {
    it('should reject renaming a system role', async () => {
      const actor: RoleActor = { userId: 'admin-1', role: UserRole.SUPER_ADMIN };
      prisma.role.findUnique.mockResolvedValue({
        id: 'sys-role-1',
        name: 'super_admin',
        isSystem: true,
        permissions: [],
      });

      await expect(
        service.updateRole('sys-role-1', { name: 'renamed_admin' }, actor),
      ).rejects.toThrow(AppException);
    });

    it('should reject deleting a system role', async () => {
      const actor: RoleActor = { userId: 'admin-1', role: UserRole.SUPER_ADMIN };
      prisma.role.findUnique.mockResolvedValue({
        id: 'sys-role-1',
        name: 'super_admin',
        isSystem: true,
        permissions: [],
      });

      await expect(service.deleteRole('sys-role-1', actor)).rejects.toThrow(AppException);
    });

    it('should delete non-system role and cascade relations in transaction', async () => {
      const actor: RoleActor = { userId: 'admin-1', role: UserRole.SUPER_ADMIN };
      prisma.role.findUnique.mockResolvedValue({
        id: 'custom-role-1',
        name: 'custom_role',
        isSystem: false,
        permissions: [],
      });

      await service.deleteRole('custom-role-1', actor);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          targetId: 'custom-role-1',
          action: 'ROLE_DELETED',
        }),
      );
    });
  });

  describe('setRolePermissions & cache invalidation', () => {
    it('should replace permissions and invalidate cache for all assigned users', async () => {
      const actor: RoleActor = { userId: 'admin-1', role: UserRole.SUPER_ADMIN };
      prisma.role.findUnique.mockResolvedValue({
        id: 'role-1',
        name: 'finance_operator',
        isSystem: false,
        permissions: [],
      });
      prisma.roleAssignment.findMany.mockResolvedValue([
        { userId: 'user-a' },
        { userId: 'user-b' },
      ]);

      const newPerms = ['finance.invoices.view', 'finance.invoices.create'];
      await service.setRolePermissions('role-1', newPerms, actor);

      expect(permissionsService.invalidateUserPermissions).toHaveBeenCalledWith('user-a');
      expect(permissionsService.invalidateUserPermissions).toHaveBeenCalledWith('user-b');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ROLE_PERMISSIONS_SET',
        }),
      );
    });
  });

  describe('assignRole (scoping checks)', () => {
    it('should throw USER_TARGET_OUT_OF_SCOPE when ZONE_MANAGER assigns to user outside their zone', async () => {
      const actor: RoleActor = {
        userId: 'zm-1',
        role: UserRole.ZONE_MANAGER,
        zoneId: 'zone-A',
      };
      prisma.role.findUnique.mockResolvedValue({
        id: 'role-1',
        name: 'guard',
        nameFa: 'نگهبان',
        permissions: [],
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-diff-zone',
        zoneId: 'zone-B',
        companyId: null,
        role: UserRole.ZONE_OPERATOR,
        deletedAt: null,
      });

      await expect(service.assignRole('role-1', 'user-diff-zone', actor)).rejects.toThrow(
        AppException,
      );
    });

    it('should throw USER_TARGET_OUT_OF_SCOPE when COMPANY_ADMIN assigns to user outside their company', async () => {
      const actor: RoleActor = {
        userId: 'ca-1',
        role: UserRole.COMPANY_ADMIN,
        companyId: 'company-A',
      };
      prisma.role.findUnique.mockResolvedValue({
        id: 'role-1',
        name: 'clerk',
        nameFa: 'کارمند',
        permissions: [],
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-diff-company',
        zoneId: null,
        companyId: 'company-B',
        role: UserRole.COMPANY_STAFF,
        deletedAt: null,
      });

      await expect(service.assignRole('role-1', 'user-diff-company', actor)).rejects.toThrow(
        AppException,
      );
    });

    it('should throw USER_PERMISSION_DENIED when non-super-admin attempts to assign role to a SUPER_ADMIN user', async () => {
      const actor: RoleActor = {
        userId: 'zm-1',
        role: UserRole.ZONE_MANAGER,
        zoneId: 'zone-A',
      };
      prisma.role.findUnique.mockResolvedValue({
        id: 'role-1',
        name: 'manager',
        nameFa: 'مدیر',
        permissions: [],
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'super-admin-user',
        zoneId: 'zone-A',
        role: UserRole.SUPER_ADMIN,
        deletedAt: null,
      });

      await expect(service.assignRole('role-1', 'super-admin-user', actor)).rejects.toThrow(
        AppException,
      );
    });

    it('should successfully assign role, invalidate cache, and log audit', async () => {
      const actor: RoleActor = { userId: 'admin-1', role: UserRole.SUPER_ADMIN };
      prisma.role.findUnique.mockResolvedValue({
        id: 'role-1',
        name: 'finance_clerk',
        nameFa: 'کارشناس مالی',
        permissions: [],
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'target-user-1',
        role: UserRole.COMPANY_STAFF,
        deletedAt: null,
      });
      prisma.roleAssignment.findUnique.mockResolvedValue(null);
      prisma.roleAssignment.create.mockResolvedValue({
        userId: 'target-user-1',
        roleId: 'role-1',
        assignedBy: 'admin-1',
      });

      const res = await service.assignRole('role-1', 'target-user-1', actor);

      expect(res).toBeDefined();
      expect(permissionsService.invalidateUserPermissions).toHaveBeenCalledWith('target-user-1');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          targetId: 'target-user-1',
          action: 'ROLE_ASSIGNED',
        }),
      );
    });
  });

  describe('unassignRole', () => {
    it('should remove role assignment, invalidate cache, and log audit', async () => {
      const actor: RoleActor = { userId: 'admin-1', role: UserRole.SUPER_ADMIN };
      prisma.role.findUnique.mockResolvedValue({
        id: 'role-1',
        name: 'finance_clerk',
        nameFa: 'کارشناس مالی',
        permissions: [],
      });
      prisma.roleAssignment.deleteMany.mockResolvedValue({ count: 1 });

      await service.unassignRole('role-1', 'target-user-1', actor);

      expect(prisma.roleAssignment.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'target-user-1', roleId: 'role-1' },
      });
      expect(permissionsService.invalidateUserPermissions).toHaveBeenCalledWith('target-user-1');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          targetId: 'target-user-1',
          action: 'ROLE_UNASSIGNED',
        }),
      );
    });
  });
});
