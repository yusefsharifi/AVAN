import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationHubService } from '../services/notification-hub.service';
import { SmsService } from '../services/sms.service';
import { NotificationSeedService } from '../services/notification-seed.service';
import { SendNotificationDto } from '../dto/send-notification.dto';

@Controller('/notifications/admin')
@UseGuards(JwtGuard, RolesGuard, PermissionsGuard)
@Roles('SUPER_ADMIN')
export class NotificationAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hub: NotificationHubService,
    private readonly sms: SmsService,
    private readonly seedService: NotificationSeedService,
  ) {}

  @Post('send')
  @RequirePermission('notifications.notification-admin.list.create')
  async sendNotification(@Body() dto: SendNotificationDto, @Req() req: any) {
    await this.hub.send(dto);
    return { success: true };
  }

  @Get('rules')
  @RequirePermission('notifications.notification-admin.list.view')
  async getRules(@Query('module') module?: string, @Query('eventType') eventType?: string) {
    const where: any = {};
    if (module) where.module = module;
    if (eventType) where.eventType = eventType;
    return this.prisma.notificationRule.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  @Post('rules')
  @RequirePermission('notifications.notification-admin.list.create')
  async createRule(@Body() dto: any, @Req() req: any) {
    return this.prisma.notificationRule.create({
      data: { ...dto, createdBy: req.user?.id || 'system' },
    });
  }

  @Patch('rules/:id')
  @RequirePermission('notifications.notification-admin.list.update')
  async updateRule(@Param('id') id: string, @Body() dto: any) {
    return this.prisma.notificationRule.update({ where: { id }, data: dto });
  }

  @Delete('rules/:id')
  @RequirePermission('notifications.notification-admin.list.delete')
  async deleteRule(@Param('id') id: string) {
    await this.prisma.notificationRule.delete({ where: { id } });
    return { success: true };
  }

  @Get('templates')
  @RequirePermission('notifications.notification-admin.list.view')
  async getTemplates(@Query('module') module?: string) {
    const where: any = {};
    if (module) where.module = module;
    return this.prisma.notificationTemplate.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  @Get('stats')
  @RequirePermission('notifications.notification-admin.list.view')
  async getStats(@Query('fromDate') fromDate?: string, @Query('toDate') toDate?: string) {
    const where: any = {};
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const totalSent = await this.prisma.notificationDelivery.count({ where: { ...where, status: { not: 'PENDING' } } });
    const totalFailed = await this.prisma.notificationDelivery.count({ where: { ...where, status: 'FAILED' } });
    const totalRead = await this.prisma.notificationDelivery.count({ where: { ...where, isRead: true } });

    return { totalSent, totalFailed, totalRead, deliveryRate: totalSent > 0 ? ((totalSent - totalFailed) / totalSent * 100).toFixed(1) : '0' };
  }

  @Get('sms-stats')
  @RequirePermission('notifications.notification-admin.list.view')
  async getSmsStats(@Query('fromDate') fromDate?: string, @Query('toDate') toDate?: string) {
    const where: any = {};
    if (fromDate || toDate) {
      where.sentAt = {};
      if (fromDate) where.sentAt.gte = new Date(fromDate);
      if (toDate) where.sentAt.lte = new Date(toDate);
    }
    return this.prisma.smsProviderLog.findMany({ where, orderBy: { sentAt: 'desc' }, take: 100 });
  }

  @Get('sms-balance')
  @RequirePermission('notifications.notification-admin.list.view')
  async getSmsBalance() {
    return this.sms.getSmsBalance();
  }

  // ─── DASHBOARD ─────────────────────────────────────────────────────────────

  @Get('dashboard')
  @RequirePermission('notifications.notification-admin.list.view')
  async getDashboard(
    @Query('zoneId') zoneId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.hub.getDashboard(zoneId || '', fromDate, toDate);
  }

  @Get('dashboard/realtime')
  @RequirePermission('notifications.notification-admin.list.view')
  async getRealtimeStats(@Query('zoneId') zoneId?: string) {
    return this.hub.getRealtimeStats(zoneId || '');
  }

  @Get('dashboard/engagement')
  @RequirePermission('notifications.notification-admin.list.view')
  async getUserEngagement(
    @Query('userId') userId?: string,
    @Query('zoneId') zoneId?: string,
  ) {
    return this.hub.getUserEngagement(userId || '', zoneId || '');
  }

  @Get('dashboard/sms-providers')
  @RequirePermission('notifications.notification-admin.list.view')
  async getSmsProviderComparison(
    @Query('zoneId') zoneId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const from = fromDate ? new Date(fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = toDate ? new Date(toDate) : new Date();
    return this.hub.getSmsProviderComparison(zoneId || '', from, to);
  }

  // ─── WEBHOOK MANAGEMENT ──────────────────────────────────────────────────

  @Get('webhooks')
  @RequirePermission('notifications.notification-admin.list.view')
  async getWebhookEndpoints(@Query('zoneId') zoneId?: string) {
    return this.hub.getWebhookEndpoints(zoneId || '');
  }

  @Post('webhooks')
  @RequirePermission('notifications.notification-admin.list.create')
  async createWebhookEndpoint(@Body() dto: { url: string; events: string[]; secret?: string }, @Req() req: any) {
    const zoneId = req.user?.zoneId || '';
    return this.hub.createWebhookEndpoint(zoneId, dto, req.user?.id || 'system');
  }

  @Post('webhooks/:id/test')
  @RequirePermission('notifications.notification-admin.list.create')
  async testWebhookEndpoint(@Param('id') id: string) {
    return this.hub.testWebhookEndpoint(id);
  }

  @Delete('webhooks/:id')
  @RequirePermission('notifications.notification-admin.list.delete')
  async deleteWebhookEndpoint(@Param('id') id: string) {
    await this.hub.deleteWebhookEndpoint(id);
    return { success: true };
  }

  @Get('webhooks/:id/deliveries')
  @RequirePermission('notifications.notification-admin.list.view')
  async getWebhookDeliveries(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.hub.getWebhookDeliveries(id, limit ? parseInt(limit) : 50);
  }

  @Post('seed')
  @RequirePermission('notifications.notification-admin.list.create')
  async seedAll() {
    const [rulesResult, templatesResult] = await Promise.all([
      this.seedService.seedRules(),
      this.seedService.seedTemplates(),
    ]);
    return {
      rules: rulesResult,
      templates: templatesResult,
    };
  }

  @Post('seed-rules')
  @RequirePermission('notifications.notification-admin.list.create')
  async seedRules() {
    return this.seedService.seedRules();
  }

  @Post('seed-templates')
  @RequirePermission('notifications.notification-admin.list.create')
  async seedTemplates() {
    return this.seedService.seedTemplates();
  }
}
