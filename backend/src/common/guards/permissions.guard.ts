import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ERROR_CODES } from '../constants/error-codes';
import { JwtPayload } from './jwt.guard';
import { PermissionsService } from '../../modules/permissions/permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;
    if (!user) throw new ForbiddenException(ERROR_CODES.USER_PERMISSION_DENIED);

    if (user.role === 'SUPER_ADMIN') return true;

    for (const perm of requiredPermissions) {
      const hasPermission = await this.permissionsService.has(user.sub, perm);
      if (!hasPermission) {
        throw new ForbiddenException(ERROR_CODES.USER_PERMISSION_DENIED);
      }
    }

    return true;
  }
}
