// M21: Super Admin Panel — Gateway Service
import { Injectable, Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@Injectable()
@WebSocketGateway({ namespace: '/super-admin', cors: { origin: '*' } })
export class SuperAdminGatewayService {
  private readonly logger = new Logger(SuperAdminGatewayService.name);
  @WebSocketServer() server: Server;

  emitHealthUpdate(data: any) {
    this.server?.to('super-admin').emit('platform:health:update', data);
  }

  emitZoneStatusChanged(data: { zoneId: string; zoneName: string; newStatus: string; changedBy: string }) {
    this.server?.to('super-admin').emit('zone:status:changed', data);
  }

  emitPlatformAlert(data: { type: string; severity: string; message: string; affectedZones: string[] }) {
    this.server?.to('super-admin').emit('platform:alert', data);
  }

  emitQueueFailureSpike(data: { queueName: string; failureCount: number; threshold: number }) {
    this.server?.to('super-admin').emit('queue:failure:spike', data);
  }

  emitDeviceMassOffline(data: { zoneId: string; offlineCount: number; totalDevices: number }) {
    this.server?.to('super-admin').emit('device:mass:offline', data);
  }

  emitSubscriptionExpiring(data: { zoneId: string; zoneName: string; planName: string; expiresAt: Date; daysLeft: number }) {
    this.server?.to('super-admin').emit('subscription:expiring', data);
  }

  emitUsageLimitExceeded(data: { zoneId: string; resource: string; current: number; limit: number; percentUsed: number }) {
    this.server?.to('super-admin').emit('usage:limit:exceeded', data);
  }
}
