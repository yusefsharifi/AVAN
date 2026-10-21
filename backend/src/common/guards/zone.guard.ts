import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { ERROR_CODES } from '../constants/error-codes';
import { JwtPayload } from './jwt.guard';

@Injectable()
export class ZoneGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      throw new ForbiddenException(ERROR_CODES.USER_PERMISSION_DENIED);
    }

    // Super admins can access any zone
    if (user.role === UserRole.SUPER_ADMIN) {
      // Try to extract zoneId from query/body/params
      const zoneId =
        request.query?.zoneId ||
        request.body?.zoneId ||
        request.params?.id ||
        null;
      if (zoneId) {
        request.zoneId = zoneId;
      }
      return true;
    }

    // Zone-level users must have a zoneId
    if (!user.zoneId) {
      throw new ForbiddenException(ERROR_CODES.USER_PERMISSION_DENIED);
    }

    // Verify the zone exists
    const zone = await this.prisma.zone.findUnique({
      where: { id: user.zoneId },
    });

    if (!zone || zone.deletedAt) {
      throw new ForbiddenException(ERROR_CODES.ZONE_NOT_FOUND);
    }

    // Attach zoneId to request for downstream use
    request.zoneId = user.zoneId;
    return true;
  }
}
