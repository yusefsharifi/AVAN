import { RequirePermission } from '../../../common/decorators/permissions.decorator';
// M21: Super Admin Panel — Controllers
// SECURITY FIX (SEC-001): All super-admin controllers now require
// JwtGuard + RolesGuard + @Roles(SUPER_ADMIN) at the class level.
import { Controller, Get, Post, Put, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ZoneManagementService } from '../services/zone-management.service';
import { SubscriptionService } from '../services/subscription.service';
import { FeatureFlagService } from '../services/feature-flag.service';
import { SystemHealthService } from '../services/system-health.service';
import { SystemConfigService } from '../services/system-config.service';
import { GlobalUserManagementService } from '../services/global-user-management.service';
import { AnnouncementService } from '../services/announcement.service';
import { AuditComplianceService } from '../services/audit-compliance.service';
import { PlatformMetricsService } from '../services/platform-metrics.service';
import { OnboardZoneDto, AssignPlanDto, CreateSubscriptionPlanDto, SetFeatureFlagDto, UpdateSystemConfigDto, CreateAnnouncementDto, CreateMaintenanceWindowDto, GlobalUserFilterDto, ImpersonateUserDto, SecurityPoliciesDto } from '../dto/create-dtos';
import { successResponse } from '../../../common/dto/response.dto';

// Task 4 (envelope conformity): /super/zones, /super/health, /super/metrics/kpis,
// /super/audit/logs/super-actions and /super/audit/suspicious returned bare
// payloads and were among the routes that made client.ts's raw-body fallback
// necessary. They now emit { success, data }.

// ─── ZONES ──────────────────────────────────────────────────────────────────
@UseGuards(JwtGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('/super/zones')
export class SuperZoneController {
  constructor(private readonly zoneService: ZoneManagementService) {}

  @Post('onboard')
  @RequirePermission('super-admin.zones.list.create')
  async onboard(@Body() dto: OnboardZoneDto, @Req() req: any) { return this.zoneService.onboardZone(dto, req.user?.id || 'system'); }

  @Get()
  @RequirePermission('super-admin.zones.list.view')
  async list() { return successResponse(await this.zoneService.getAllZonesOverview()); }

  @Get('overview')
  @RequirePermission('super-admin.zones.list.view')
  async overview() { return successResponse(await this.zoneService.getAllZonesOverview()); }

  @Get(':id/overview')
  @RequirePermission('super-admin.zones.list.view')
  async getOverview(@Param('id') id: string) { return this.zoneService.getZoneOverview(id); }

  @Get(':id/usage')
  @RequirePermission('super-admin.zones.list.view')
  async getUsage(@Param('id') id: string) { return this.zoneService.getZoneUsageReport(id); }

  @Post(':id/suspend')
  @RequirePermission('super-admin.zones.list.create')
  async suspend(@Param('id') id: string, @Body('reason') reason: string, @Req() req: any) { return this.zoneService.suspendZone(id, reason, req.user?.id); }

  @Post(':id/reactivate')
  @RequirePermission('super-admin.zones.list.create')
  async reactivate(@Param('id') id: string, @Req() req: any) { return this.zoneService.reactivateZone(id, req.user?.id); }

  @Put(':id/features')
  @RequirePermission('super-admin.zones.list.update')
  async updateFeatures(@Param('id') id: string, @Body('features') features: object, @Req() req: any) { return this.zoneService.updateZoneFeatures(id, features, req.user?.id); }
}

// ─── SUBSCRIPTIONS ──────────────────────────────────────────────────────────
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('/super/subscriptions')
export class SuperSubscriptionController {
  constructor(private readonly subService: SubscriptionService) {}

  @Get('plans')
  @RequirePermission('super-admin.zones.list.view')
  async listPlans() { return this.subService.findAll(); }

  @Post('plans')
  @RequirePermission('super-admin.zones.list.create')
  async createPlan(@Body() dto: CreateSubscriptionPlanDto, @Req() req: any) { return this.subService.createPlan(dto, req.user?.id); }

  @Patch('plans/:id')
  @RequirePermission('super-admin.zones.list.update')
  async updatePlan(@Param('id') id: string, @Body() dto: Partial<CreateSubscriptionPlanDto>) { return this.subService.updatePlan(id, dto); }

  @Post('assign')
  @RequirePermission('super-admin.zones.list.create')
  async assignPlan(@Body() dto: AssignPlanDto, @Req() req: any) { return this.subService.assignPlan(dto, req.user?.id); }

  @Get('comparison')
  @RequirePermission('super-admin.zones.list.view')
  async comparison() { return this.subService.getPlanComparison(); }

  @Get(':zoneId')
  @RequirePermission('super-admin.zones.list.view')
  async getSubscription(@Param('zoneId') zoneId: string) { return this.subService.getZoneSubscription(zoneId); }

  @Get(':zoneId/invoices')
  @RequirePermission('super-admin.zones.list.view')
  async getInvoices(@Param('zoneId') zoneId: string) { return this.subService.getInvoices(zoneId); }

  @Post('invoices/generate')
  @RequirePermission('super-admin.zones.list.create')
  async generateInvoices() { return this.subService.generateMonthlyInvoices(); }
}

// ─── FEATURE FLAGS ──────────────────────────────────────────────────────────
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('/super/feature-flags')
export class SuperFeatureFlagController {
  constructor(private readonly flagService: FeatureFlagService) {}

  @Get()
  @RequirePermission('super-admin.zones.list.view')
  async list(@Query('zoneId') zoneId?: string) { return this.flagService.getAllFlags(zoneId); }

  @Post('set')
  @RequirePermission('super-admin.zones.list.create')
  async setFlag(@Body() dto: SetFeatureFlagDto, @Req() req: any) { return this.flagService.setFlag(dto, req.user?.id); }

  @Post('seed')
  @RequirePermission('super-admin.zones.list.create')
  async seed() { return this.flagService.seedDefaultFlags(); }

  @Get('zone/:zoneId')
  @RequirePermission('super-admin.zones.list.view')
  async getZoneFlags(@Param('zoneId') zoneId: string) { return this.flagService.getAllFlags(zoneId); }
}

// ─── USERS ──────────────────────────────────────────────────────────────────
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('/super/users')
export class SuperUserController {
  constructor(private readonly userService: GlobalUserManagementService) {}

  @Get()
  @RequirePermission('super-admin.zones.list.view')
  async list(@Query() filter: GlobalUserFilterDto) { return this.userService.findAllUsers(filter); }

  @Get(':id/activity')
  @RequirePermission('super-admin.zones.list.view')
  async activity(@Param('id') id: string, @Query('days') days: number) { return this.userService.getUserActivity(id, days || 30); }

  @Post(':id/force-logout')
  @RequirePermission('super-admin.zones.list.create')
  async forceLogout(@Param('id') id: string, @Body('reason') reason: string, @Req() req: any) { return this.userService.forceLogout(id, reason, req.user?.id); }

  @Post(':id/impersonate')
  @RequirePermission('super-admin.zones.list.create')
  async impersonate(@Param('id') id: string, @Body() dto: ImpersonateUserDto, @Req() req: any) { return this.userService.impersonateUser({ ...dto, targetUserId: id }, req.user?.id, req.ip); }

  @Post('impersonate/:sessionId/end')
  @RequirePermission('super-admin.zones.list.create')
  async endImpersonation(@Param('sessionId') sessionId: string) { return this.userService.endImpersonation(sessionId); }

  @Patch(':id/role')
  @RequirePermission('super-admin.zones.list.update')
  async updateRole(@Param('id') id: string, @Body('role') role: string, @Body('reason') reason: string, @Req() req: any) { return this.userService.updateUserRole(id, role, reason, req.user?.id); }
}

// ─── HEALTH ─────────────────────────────────────────────────────────────────
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('/super/health')
export class SuperHealthController {
  constructor(private readonly healthService: SystemHealthService) {}

  @Get()
  @RequirePermission('super-admin.zones.list.view')
  async getHealth() { return successResponse(await this.healthService.getSystemHealth()); }

  @Get('history')
  @RequirePermission('super-admin.zones.list.view')
  async getHistory(@Query('hours') hours: number) { return this.healthService.getHealthHistory(hours || 24); }

  @Post('snapshot')
  @RequirePermission('super-admin.zones.list.create')
  async saveSnapshot() { return this.healthService.saveSnapshot(); }
}

// ─── CONFIG ─────────────────────────────────────────────────────────────────
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('/super/config')
export class SuperConfigController {
  constructor(private readonly configService: SystemConfigService) {}

  @Get()
  @RequirePermission('super-admin.zones.list.view')
  async list(@Query('category') category?: string) { return this.configService.getAll(category); }

  @Put()
  @RequirePermission('super-admin.zones.list.update')
  async update(@Body() dto: UpdateSystemConfigDto, @Req() req: any) { return this.configService.set(dto, req.user?.id); }

  @Get('security')
  @RequirePermission('super-admin.zones.list.view')
  async getSecurity() { return this.configService.getSecurityPolicies(); }
}

// ─── ANNOUNCEMENTS ──────────────────────────────────────────────────────────
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('/super/announcements')
export class SuperAnnouncementController {
  constructor(private readonly announceService: AnnouncementService) {}

  @Post()
  @RequirePermission('super-admin.zones.list.create')
  async create(@Body() dto: CreateAnnouncementDto, @Req() req: any) { return this.announceService.create(dto, req.user?.id); }

  @Get()
  @RequirePermission('super-admin.zones.list.view')
  async list() { return this.announceService.findAll(); }

  @Post(':id/deliver')
  @RequirePermission('super-admin.zones.list.create')
  async deliver(@Param('id') id: string) { return this.announceService.deliver(id); }

  @Get('maintenance')
  @RequirePermission('super-admin.zones.list.view')
  async getMaintenance() { return this.announceService.getMaintenanceWindows(); }

  @Post('maintenance')
  @RequirePermission('super-admin.zones.list.create')
  async createMaintenance(@Body() dto: CreateMaintenanceWindowDto, @Req() req: any) { return this.announceService.createMaintenanceWindow(dto, req.user?.id); }

  @Post('maintenance/:id/activate')
  @RequirePermission('super-admin.zones.list.create')
  async activateMaintenance(@Param('id') id: string) { return this.announceService.activateMaintenance(id); }

  @Post('maintenance/:id/deactivate')
  @RequirePermission('super-admin.zones.list.create')
  async deactivateMaintenance(@Param('id') id: string) { return this.announceService.deactivateMaintenance(id); }
}

// ─── AUDIT ──────────────────────────────────────────────────────────────────
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('/super/audit')
export class SuperAuditController {
  constructor(private readonly auditService: AuditComplianceService) {}

  @Get('logs')
  @RequirePermission('super-admin.zones.list.view')
  async getLogs(@Query() filter: any) { return this.auditService.getGlobalAuditLog(filter); }

  @Get('logs/super-actions')
  @RequirePermission('super-admin.zones.list.view')
  async getSuperActions(@Query('days') days: number) { return successResponse(await this.auditService.getSuperAdminActions(days || 30)); }

  @Get('suspicious')
  @RequirePermission('super-admin.zones.list.view')
  async getSuspicious(@Query('zoneId') zoneId?: string) { return successResponse(await this.auditService.detectSuspiciousActivity(zoneId)); }

  @Post('purge')
  @RequirePermission('super-admin.zones.list.create')
  async purge(@Body('zoneId') zoneId: string, @Body('module') module: string, @Body('olderThanDays') days: number, @Req() req: any) { return this.auditService.purgeOldData(zoneId, module, days, req.user?.id); }

  @Post('integrity-check')
  @RequirePermission('super-admin.zones.list.create')
  async integrityCheck(@Body('zoneId') zoneId?: string) { return this.auditService.runDataIntegrityCheck(zoneId); }
}

// ─── METRICS ────────────────────────────────────────────────────────────────
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('/super/metrics')
export class SuperMetricsController {
  constructor(private readonly metricsService: PlatformMetricsService) {}

  @Get('kpis')
  @RequirePermission('super-admin.zones.list.view')
  async getKpis() { return successResponse(await this.metricsService.getPlatformKpis()); }

  @Get('trend/:metric')
  @RequirePermission('super-admin.zones.list.view')
  async getTrend(@Param('metric') metric: string, @Query('months') months: number) { return this.metricsService.getPlatformTrend(metric, months || 12); }

  @Get('zone-rankings')
  @RequirePermission('super-admin.zones.list.view')
  async getRankings(@Query('metric') metric: string, @Query('limit') limit: number) { return this.metricsService.getZoneRankings(metric || 'companies', limit || 10); }

  @Post('compute')
  @RequirePermission('super-admin.zones.list.create')
  async compute() { return this.metricsService.computeDailyPlatformMetrics(); }
}
