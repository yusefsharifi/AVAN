import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
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
 * SECURITY FIX (SEC-009): CompanyGuard now uses explicit companyId from
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
 */
@Injectable()
export class CompanyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      throw new ForbiddenException(ERROR_CODES.USER_PERMISSION_DENIED);
    }

    // Admin roles can access any company
    if (
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.ZONE_MANAGER ||
      user.role === UserRole.ZONE_OPERATOR
    ) {
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
