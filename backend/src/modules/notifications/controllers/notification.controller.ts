import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { NotificationHubService } from '../services/notification-hub.service';
import { SendNotificationDto, FilterNotificationsDto, UpdateNotificationPreferenceDto, RegisterPushTokenDto } from '../dto/send-notification.dto';

@Controller('/notifications')
@UseGuards(JwtGuard, PermissionsGuard)
export class NotificationController {
  constructor(private readonly hub: NotificationHubService) {}

  @Get('inbox')
  @RequirePermission('notifications.notification.list.view')
  async getInbox(@Req() req: any, @Query() filter: FilterNotificationsDto) {
    const userId = req.user?.id || 'test-user';
    const zoneId = req.user?.zoneId || 'test-zone';
    return this.hub.getInbox(userId, zoneId, filter);
  }

  @Get('unread-count')
  @RequirePermission('notifications.notification.list.view')
  async getUnreadCount(@Req() req: any) {
    const userId = req.user?.id || 'test-user';
    const zoneId = req.user?.zoneId || 'test-zone';
    return this.hub.getUnreadCount(userId, zoneId);
  }

  @Post(':id/read')
  @RequirePermission('notifications.notification.list.create')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || 'test-user';
    await this.hub.markAsRead(id, userId);
    return { success: true };
  }

  @Post('read-all')
  @RequirePermission('notifications.notification.list.create')
  async markAllAsRead(@Req() req: any, @Query('module') module?: string) {
    const userId = req.user?.id || 'test-user';
    const zoneId = req.user?.zoneId || 'test-zone';
    return this.hub.markAllAsRead(userId, zoneId, module);
  }

  @Post(':id/dismiss')
  @RequirePermission('notifications.notification.list.create')
  async dismiss(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || 'test-user';
    await this.hub.dismiss(id, userId);
    return { success: true };
  }

  @Post('dismiss-all')
  @RequirePermission('notifications.notification.list.create')
  async dismissAll(@Req() req: any) {
    const userId = req.user?.id || 'test-user';
    const zoneId = req.user?.zoneId || 'test-zone';
    await this.hub.dismissAll(userId, zoneId);
    return { success: true };
  }

  @Delete(':id')
  @RequirePermission('notifications.notification.list.delete')
  async delete(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || 'test-user';
    await this.hub.delete(id, userId);
    return { success: true };
  }

  @Get('preferences')
  @RequirePermission('notifications.notification.list.view')
  async getPreferences(@Req() req: any) {
    const userId = req.user?.id || 'test-user';
    return this.hub.getPreferences(userId);
  }

  @Patch('preferences')
  @RequirePermission('notifications.notification.list.update')
  async updatePreferences(@Req() req: any, @Body() dto: UpdateNotificationPreferenceDto) {
    const userId = req.user?.id || 'test-user';
    return this.hub.updatePreferences(userId, dto);
  }

  @Post('preferences/push-token')
  @RequirePermission('notifications.notification.list.create')
  async registerPushToken(@Req() req: any, @Body() dto: RegisterPushTokenDto) {
    const userId = req.user?.id || 'test-user';
    await this.hub.registerPushToken(userId, dto);
    return { success: true };
  }

  @Delete('preferences/push-token')
  @RequirePermission('notifications.notification.list.delete')
  async unregisterPushToken(@Req() req: any, @Body('token') token: string) {
    const userId = req.user?.id || 'test-user';
    await this.hub.unregisterPushToken(userId, token);
    return { success: true };
  }
}
