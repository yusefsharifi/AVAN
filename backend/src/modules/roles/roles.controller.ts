import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { successResponse } from '../../common/dto/response.dto';
import { RolesService, RoleActor } from './roles.service';
import { PermissionsService } from '../permissions/permissions.service';
import { CreateRoleDto, UpdateRoleDto, SetRolePermissionsDto, AssignRoleDto } from './dto/roles.dto';

@ApiTags('Roles & Permissions')
@Controller()
@UseGuards(JwtGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly permissionsService: PermissionsService,
  ) {}

  private buildActor(
    sub: string,
    role: UserRole,
    zoneId?: string,
    companyId?: string,
  ): RoleActor {
    return { userId: sub, role, zoneId, companyId };
  }

  @Get('permissions/catalog')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ZONE_MANAGER, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Get permissions catalog tree' })
  async getCatalog() {
    return successResponse(this.permissionsService.getCatalog());
  }

  @Get('roles')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ZONE_MANAGER, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'List roles (scoped)' })
  async listRoles(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: UserRole,
    @CurrentUser('zoneId') zoneId?: string,
    @CurrentUser('companyId') companyId?: string,
  ) {
    const actor = this.buildActor(userId, role, zoneId, companyId);
    const roles = await this.rolesService.listRoles(actor);
    return successResponse(roles);
  }

  @Get('roles/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ZONE_MANAGER, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Get role by ID' })
  async getRole(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: UserRole,
    @CurrentUser('zoneId') zoneId?: string,
    @CurrentUser('companyId') companyId?: string,
  ) {
    const actor = this.buildActor(userId, role, zoneId, companyId);
    const roleData = await this.rolesService.getRoleById(id, actor);
    return successResponse(roleData);
  }

  @Post('roles')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ZONE_MANAGER, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Create a role' })
  async createRole(
    @Body() dto: CreateRoleDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: UserRole,
    @CurrentUser('zoneId') zoneId?: string,
    @CurrentUser('companyId') companyId?: string,
  ) {
    const actor = this.buildActor(userId, role, zoneId, companyId);
    const created = await this.rolesService.createRole(dto, actor);
    return successResponse(created);
  }

  @Patch('roles/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ZONE_MANAGER, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Update a role' })
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserDtoAdapter,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: UserRole,
    @CurrentUser('zoneId') zoneId?: string,
    @CurrentUser('companyId') companyId?: string,
  ) {
    const actor = this.buildActor(userId, role, zoneId, companyId);
    const updated = await this.rolesService.updateRole(id, dto as any, actor);
    return successResponse(updated);
  }

  @Delete('roles/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ZONE_MANAGER, UserRole.COMPANY_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a role (non-system only)' })
  async deleteRole(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: UserRole,
    @CurrentUser('zoneId') zoneId?: string,
    @CurrentUser('companyId') companyId?: string,
  ) {
    const actor = this.buildActor(userId, role, zoneId, companyId);
    await this.rolesService.deleteRole(id, actor);
    return successResponse({ message: 'نقش حذف شد' });
  }

  @Get('roles/:id/permissions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ZONE_MANAGER, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Get role permissions' })
  async getRolePermissions(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: UserRole,
    @CurrentUser('zoneId') zoneId?: string,
    @CurrentUser('companyId') companyId?: string,
  ) {
    const actor = this.buildActor(userId, role, zoneId, companyId);
    const perms = await this.rolesService.getRolePermissions(id, actor);
    return successResponse(perms);
  }

  @Put('roles/:id/permissions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ZONE_MANAGER, UserRole.COMPANY_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set role permissions (full replace)' })
  async setRolePermissions(
    @Param('id') id: string,
    @Body() dto: SetRolePermissionsDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: UserRole,
    @CurrentUser('zoneId') zoneId?: string,
    @CurrentUser('companyId') companyId?: string,
  ) {
    const actor = this.buildActor(userId, role, zoneId, companyId);
    const result = await this.rolesService.setRolePermissions(id, dto.permissions, actor);
    return successResponse(result);
  }

  @Post('roles/:id/assign')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ZONE_MANAGER, UserRole.COMPANY_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign role to user' })
  async assignRole(
    @Param('id') roleId: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: UserRole,
    @CurrentUser('zoneId') zoneId?: string,
    @CurrentUser('companyId') companyId?: string,
  ) {
    const actor = this.buildActor(userId, role, zoneId, companyId);
    const result = await this.rolesService.assignRole(roleId, dto.userId, actor);
    return successResponse(result);
  }

  @Get('users/me/permissions')
  @ApiOperation({ summary: 'Get current user effective permissions' })
  async getMyPermissions(@CurrentUser('sub') userId: string) {
    const permissions = await this.permissionsService.getUserPermissions(userId);
    return successResponse({ permissions });
  }

  @Get('roles/:id/users')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ZONE_MANAGER, UserRole.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Get users assigned to a role' })
  async getRoleUsers(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: UserRole,
    @CurrentUser('zoneId') zoneId?: string,
    @CurrentUser('companyId') companyId?: string,
  ) {
    const actor = this.buildActor(userId, role, zoneId, companyId);
    const users = await this.rolesService.getRoleUsers(id, actor);
    return successResponse(users);
  }

  @Delete('roles/:id/assign/:userId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ZONE_MANAGER, UserRole.COMPANY_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unassign role from user' })
  async unassignRole(
    @Param('id') roleId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: UserRole,
    @CurrentUser('zoneId') zoneId?: string,
    @CurrentUser('companyId') companyId?: string,
  ) {
    const actor = this.buildActor(userId, role, zoneId, companyId);
    await this.rolesService.unassignRole(roleId, targetUserId, actor);
    return successResponse({ message: 'نقش از کاربر سلب شد' });
  }
}

type UpdateUserDtoAdapter = UpdateRoleDto;
