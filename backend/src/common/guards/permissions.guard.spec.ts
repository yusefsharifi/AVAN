import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PermissionsService } from '../../modules/permissions/permissions.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;
  let permissionsService: jest.Mocked<PermissionsService>;

  beforeEach(() => {
    reflector = new Reflector();
    permissionsService = {
      has: jest.fn(),
      getCatalog: jest.fn(),
      getAllPermissions: jest.fn(),
      getUserPermissions: jest.fn(),
      invalidateUserPermissions: jest.fn(),
      invalidateAll: jest.fn(),
    } as any;

    guard = new PermissionsGuard(reflector, permissionsService);
  });

  function mockContext(user?: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => Function,
      getClass: () => class {},
    } as any;
  }

  it('should allow access when no permissions are required', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const result = await guard.canActivate(mockContext({ sub: 'u1', role: 'COMPANY_ADMIN' }));
    expect(result).toBe(true);
  });

  it('should allow SUPER_ADMIN through without checking permissions', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['finance.invoices.create']);

    const result = await guard.canActivate(mockContext({ sub: 'admin', role: 'SUPER_ADMIN' }));
    expect(result).toBe(true);
    expect(permissionsService.has).not.toHaveBeenCalled();
  });

  it('should throw 403 ForbiddenException when user lacks required permission', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['finance.invoices.delete']);
    permissionsService.has.mockResolvedValue(false);

    await expect(
      guard.canActivate(mockContext({ sub: 'u1', role: 'COMPANY_STAFF' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should allow access when user has the required permission', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['users.list.view']);
    permissionsService.has.mockResolvedValue(true);

    const result = await guard.canActivate(mockContext({ sub: 'u1', role: 'COMPANY_ADMIN' }));
    expect(result).toBe(true);
    expect(permissionsService.has).toHaveBeenCalledWith('u1', 'users.list.view');
  });

  it('should throw 403 when no user is attached to request', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['users.list.view']);

    await expect(guard.canActivate(mockContext(undefined))).rejects.toThrow(ForbiddenException);
  });

  it('should check ALL required permissions (AND logic)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['users.list.view', 'users.list.create']);
    permissionsService.has
      .mockResolvedValueOnce(true)   // has users.list.view
      .mockResolvedValueOnce(false); // does NOT have users.list.create

    await expect(
      guard.canActivate(mockContext({ sub: 'u1', role: 'COMPANY_ADMIN' })),
    ).rejects.toThrow(ForbiddenException);

    expect(permissionsService.has).toHaveBeenCalledTimes(2);
  });
});