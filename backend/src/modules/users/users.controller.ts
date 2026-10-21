import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { UserService as UsersService, ActorContext } from './users.service';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FilterUsersDto } from './dto/filter-users.dto';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, UserStatus } from '@prisma/client';
import { successResponse } from '../../common/dto/response.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  private buildActor(
    sub: string,
    role: UserRole,
    zoneId?: string,
    companyId?: string,
  ): ActorContext {
    return { userId: sub, role, zoneId, companyId };
  }

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ZONE_MANAGER,
    UserRole.COMPANY_ADMIN,
    UserRole.COMPANY_MANAGER,
  )
  @RequirePermissions('users.list.create')
  @ApiOperation({ summary: 'Create a user (scoped)' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser('sub') createdBy: string,
    @CurrentUser('role') actorRole: UserRole,
    @CurrentUser('zoneId') actorZoneId?: string,
    @CurrentUser('companyId') actorCompanyId?: string,
  ) {
    const actor = this.buildActor(createdBy, actorRole, actorZoneId, actorCompanyId);
    if (dto.role) this.authService.validateRoleAssignment(actorRole, dto.role);
    const user = await this.usersService.create(dto, actor);
    return successResponse(user);
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ZONE_MANAGER,
    UserRole.ZONE_OPERATOR,
    UserRole.COMPANY_ADMIN,
    UserRole.COMPANY_MANAGER,
  )
  @RequirePermissions('users.list.view')
  @ApiOperation({ summary: 'List users with filters (scoped by actor role)' })
  async findAll(
    @Query() filter: FilterUsersDto,
    @CurrentUser('sub') actorId: string,
    @CurrentUser('role') actorRole: UserRole,
    @CurrentUser('zoneId') actorZoneId?: string,
    @CurrentUser('companyId') actorCompanyId?: string,
  ) {
    const actor = this.buildActor(actorId, actorRole, actorZoneId, actorCompanyId);
    const result = await this.usersService.findAll(filter, actor);
    return successResponse(result.data, result.meta);
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ZONE_MANAGER,
    UserRole.ZONE_OPERATOR,
    UserRole.COMPANY_ADMIN,
    UserRole.COMPANY_MANAGER,
  )
  @RequirePermissions('users.profile.view')
  @ApiOperation({ summary: 'Get user by ID (scoped)' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('sub') actorId: string,
    @CurrentUser('role') actorRole: UserRole,
    @CurrentUser('zoneId') actorZoneId?: string,
    @CurrentUser('companyId') actorCompanyId?: string,
  ) {
    const actor = this.buildActor(actorId, actorRole, actorZoneId, actorCompanyId);
    const user = await this.usersService.findById(id, actor);
    return successResponse(user);
  }

  @Patch(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ZONE_MANAGER,
    UserRole.COMPANY_ADMIN,
    UserRole.COMPANY_MANAGER,
  )
  @RequirePermissions('users.profile.update')
  @ApiOperation({ summary: 'Update user (scoped)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('sub') updatedBy: string,
    @CurrentUser('role') actorRole: UserRole,
    @CurrentUser('zoneId') actorZoneId?: string,
    @CurrentUser('companyId') actorCompanyId?: string,
  ) {
    const actor = this.buildActor(updatedBy, actorRole, actorZoneId, actorCompanyId);
    const user = await this.usersService.update(id, dto, actor);
    return successResponse(user);
  }

  @Delete(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ZONE_MANAGER,
    UserRole.COMPANY_ADMIN,
    UserRole.COMPANY_MANAGER,
  )
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('users.list.delete')
  @ApiOperation({ summary: 'Soft delete user (scoped)' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('sub') deletedBy: string,
    @CurrentUser('role') actorRole: UserRole,
    @CurrentUser('zoneId') actorZoneId?: string,
    @CurrentUser('companyId') actorCompanyId?: string,
  ) {
    const actor = this.buildActor(deletedBy, actorRole, actorZoneId, actorCompanyId);
    await this.usersService.softDelete(id, actor);
    return successResponse({ message: 'کاربر حذف شد' });
  }

  @Patch(':id/status')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ZONE_MANAGER,
    UserRole.COMPANY_ADMIN,
    UserRole.COMPANY_MANAGER,
  )
  @RequirePermissions('users.status.update')
  @ApiOperation({ summary: 'Update user status (suspend/reactivate)' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: UserStatus,
    @CurrentUser('sub') actorId: string,
    @CurrentUser('role') actorRole: UserRole,
    @CurrentUser('zoneId') actorZoneId?: string,
    @CurrentUser('companyId') actorCompanyId?: string,
  ) {
    const actor = this.buildActor(actorId, actorRole, actorZoneId, actorCompanyId);
    await this.usersService.setStatus(id, status, actor);
    return successResponse({ message: 'وضعیت کاربر به‌روز شد' });
  }

  @Post(':id/suspend')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ZONE_MANAGER,
    UserRole.COMPANY_ADMIN,
    UserRole.COMPANY_MANAGER,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend user (scoped)' })
  async suspend(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('sub') suspendedBy: string,
    @CurrentUser('role') actorRole: UserRole,
    @CurrentUser('zoneId') actorZoneId?: string,
    @CurrentUser('companyId') actorCompanyId?: string,
  ) {
    const actor = this.buildActor(suspendedBy, actorRole, actorZoneId, actorCompanyId);
    await this.usersService.suspend(id, reason, actor);
    return successResponse({ message: 'کاربر معلق شد' });
  }

  @Post(':id/reactivate')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ZONE_MANAGER,
    UserRole.COMPANY_ADMIN,
    UserRole.COMPANY_MANAGER,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate user (scoped)' })
  async reactivate(
    @Param('id') id: string,
    @CurrentUser('sub') reactivatedBy: string,
    @CurrentUser('role') actorRole: UserRole,
    @CurrentUser('zoneId') actorZoneId?: string,
    @CurrentUser('companyId') actorCompanyId?: string,
  ) {
    const actor = this.buildActor(reactivatedBy, actorRole, actorZoneId, actorCompanyId);
    await this.usersService.reactivate(id, actor);
    return successResponse({ message: 'کاربر فعال شد' });
  }

  @Post(':id/reset-password')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ZONE_MANAGER,
    UserRole.COMPANY_ADMIN,
    UserRole.COMPANY_MANAGER,
  )
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('users.password.update')
  @ApiOperation({ summary: 'Reset user password (scoped)' })
  async resetPassword(
    @Param('id') id: string,
    @CurrentUser('sub') actorId: string,
    @CurrentUser('role') actorRole: UserRole,
    @CurrentUser('zoneId') actorZoneId?: string,
    @CurrentUser('companyId') actorCompanyId?: string,
  ) {
    const actor = this.buildActor(actorId, actorRole, actorZoneId, actorCompanyId);
    const result = await this.usersService.resetPassword(id, actor);
    return successResponse(result);
  }

  @Post(':id/avatar')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ZONE_MANAGER,
    UserRole.COMPANY_ADMIN,
    UserRole.COMPANY_MANAGER,
  )
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload user avatar' })
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const result = await this.usersService.uploadAvatar(id, file);
    return successResponse(result);
  }

  @Get(':id/sessions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ZONE_MANAGER, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Get user active sessions' })
  async getActiveSessions(@Param('id') id: string) {
    const sessions = await this.usersService.getActiveSessions(id);
    return successResponse(sessions);
  }

  @Delete(':id/sessions/:sid')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ZONE_MANAGER, UserRole.COMPANY_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke user session' })
  async revokeSession(
    @Param('sid') sessionId: string,
    @CurrentUser('sub') requesterId: string,
  ) {
    await this.usersService.revokeSession(sessionId, requesterId);
    return successResponse({ message: 'نشست لغو شد' });
  }

  @Post(':id/permissions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ZONE_MANAGER)
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('users.profile.update')
  @ApiOperation({ summary: 'Grant permission' })
  async grantPermission(
    @Param('id') id: string,
    @Body('permission') permission: string,
    @CurrentUser('sub') grantedBy: string,
    @Body('expiresAt') expiresAt?: string,
  ) {
    await this.usersService.grantPermission(
      id,
      permission,
      grantedBy,
      expiresAt ? new Date(expiresAt) : undefined,
    );
    return successResponse({ message: 'دسترسی اعطا شد' });
  }

  @Delete(':id/permissions/:perm')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ZONE_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke permission' })
  async revokePermission(
    @Param('id') id: string,
    @Param('perm') permission: string,
  ) {
    await this.usersService.revokePermission(id, permission);
    return successResponse({ message: 'دسترسی لغو شد' });
  }

  @Post('impersonate/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Impersonate a user (Super Admin only)' })
  async impersonate(
    @Param('id') targetUserId: string,
    @CurrentUser('sub') adminId: string,
  ) {
    const result = await this.authService.impersonate(adminId, targetUserId);
    return successResponse(result);
  }
}
