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

const COMPANY_ROLES = [
  UserRole.COMPANY_ADMIN,
  UserRole.COMPANY_MANAGER,
  UserRole.COMPANY_STAFF,
  UserRole.DRIVER,
];

/**
 * SECURITY FIX (SEC-009/SEC-023): CompanyGuard uses explicit companyId from
 * request.params.companyId or request.body.companyId only.
 *
 * Previously, request.params?.id was used as a fallback, which was ambiguous
 * because :id could refer to a user ID, zone ID, or any other entity — not
 * necessarily a company ID. This could allow IDOR attacks where a company-level
 * user accesses another company's resources by manipulating the :id parameter.
 *
 * The guard now:
 * 1. Checks params.companyId first (explicit company route parameter)
 * 2. Falls back to body.companyId (for POST/PUT/PATCH requests)
 * 3. If neither is present, the user can only access their own company
 *    (enforced by setting request.companyId = user.companyId)
 * 4. Never uses params.id as a company ID fallback
 *
 * NEW (SEC-023): supervisor roles (SUPER_ADMIN / ZONE_MANAGER / ZONE_OPERATOR)
 * also get request.companyId set — from params.companyId / body.companyId
 * when a valid company is explicitly selected (existence + soft-delete
 * validated against the DB, otherwise 400), or undefined (= "all companies in
 * my scope"). This ensures services always read the scope from request, never
 * from arbitrary client inputs.
 */
@Injectable()
export class CompanyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      throw new ForbiddenException(ERROR_CODES.USER_PERMISSION_DENIED);
    }

    // Supervisor roles: pin request.companyId only when explicitly selected
    if (
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.ZONE_MANAGER ||
      user.role === UserRole.ZONE_OPERATOR
    ) {
      const explicitCompanyId: string | null =
        request.params?.companyId || request.body?.companyId || null;

      if (explicitCompanyId) {
        const company = await this.prisma.company.findUnique({
          where: { id: explicitCompanyId },
          select: { id: true, deletedAt: true },
        });

        if (!company || company.deletedAt) {
          throw new BadRequestException(ERROR_CODES.COMPANY_NOT_FOUND);
        }

        request.companyId = company.id;
      } else {
        // No explicit selection → all companies within the user's platform/zone
        request.companyId = undefined;
      }

      return true;
    }

    // Company-level users can only access their own company
    if ((COMPANY_ROLES as string[]).includes(user.role)) {
      // SECURITY FIX (SEC-009): Only use explicit companyId — never params.id
      const targetCompanyId =
        request.params?.companyId ||
        request.body?.companyId;

      if (targetCompanyId && targetCompanyId !== user.companyId) {
        throw new ForbiddenException(ERROR_CODES.USER_PERMISSION_DENIED);
      }

      // Always set companyId on request for downstream authorization
      request.companyId = user.companyId;
      return true;
    }

    throw new ForbiddenException(ERROR_CODES.USER_PERMISSION_DENIED);
  }
}
