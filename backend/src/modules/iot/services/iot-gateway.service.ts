// M20: IoT & Device Integration — Gateway Service
import { Injectable, Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@Injectable()
@WebSocketGateway({ namespace: '/iot', cors: { origin: '*' } })
export class IotGatewayService {
  private readonly logger = new Logger(IotGatewayService.name);
  @WebSocketServer() server: Server;

  emitAnprPlateDetected(gateId: string, data: { deviceId: string; plate: string; confidence: number; imageKey?: string; vehicleInfo?: any; suggestedAction: string; direction?: string }) {
    this.server?.to(`gate:${gateId}`).emit('anpr:plate-detected', data);
  }

  emitAnprNeedsReview(gateId: string, data: { readingId: string; plate: string; confidence: number; imageKey?: string; reason: string }) {
    this.server?.to(`gate:${gateId}`).emit('anpr:needs-review', data);
  }

  emitAnprLowConfidence(gateId: string, data: { readingId: string; confidence: number; imageKey?: string }) {
    this.server?.to(`gate:${gateId}`).emit('anpr:low-confidence', data);
  }

  emitBarrierOpened(zoneId: string, gateId: string, data: { deviceId: string; gateName?: string; reason: string; openedAt: Date }) {
    this.server?.to(`gate:${gateId}`).to(`zone:${zoneId}`).emit('barrier:opened', data);
  }

  emitBarrierClosed(gateId: string, data: { deviceId: string; closedAt: Date }) {
    this.server?.to(`gate:${gateId}`).emit('barrier:closed', data);
  }

  emitBarrierError(zoneId: string, gateId: string, data: { deviceId: string; error: string; severity: string }) {
    this.server?.to(`gate:${gateId}`).to(`zone:${zoneId}`).emit('barrier:error', data);
  }

  emitScaleReading(deviceId: string, data: { deviceId: string; weight: number; unit: string; isStable: boolean; isOverload: boolean; vehicleOnScale: boolean }) {
    this.server?.to(`scale:${deviceId}`).emit('scale:reading', data);
  }

  emitScaleStable(deviceId: string, data: { deviceId: string; weight: number; unit: string; confidence: number }) {
    this.server?.to(`scale:${deviceId}`).emit('scale:stable', data);
  }

  emitScaleOverload(zoneId: string, data: { deviceId: string; weight: number; maxCapacity: number }) {
    this.server?.to(`zone:${zoneId}`).emit('scale:overload', data);
  }

  emitGpsPosition(zoneId: string, data: { deviceId: string; vehiclePlate?: string; lat: number; lng: number; speed: number; heading?: number; isMoving: boolean }) {
    this.server?.to(`zone:${zoneId}`).emit('gps:position', data);
  }

  emitGeofenceEntry(zoneId: string, data: { deviceId: string; vehiclePlate?: string; geofenceName: string; enteredAt: Date; lat: number; lng: number }) {
    this.server?.to(`zone:${zoneId}`).emit('gps:geofence-entry', data);
  }

  emitGeofenceExit(zoneId: string, data: { deviceId: string; vehiclePlate?: string; geofenceName: string; exitedAt: Date; dwellMinutes: number }) {
    this.server?.to(`zone:${zoneId}`).emit('gps:geofence-exit', data);
  }

  emitSpeedViolation(zoneId: string, data: { deviceId: string; plate?: string; speed: number; limit: number; location: string }) {
    this.server?.to(`zone:${zoneId}`).emit('gps:speed-violation', data);
  }

  emitRfidEmployeeIn(companyId: string, data: { employeeId: string; employeeName: string; clockIn: Date; gateId?: string }) {
    this.server?.to(`company:${companyId}`).emit('rfid:employee-in', data);
  }

  emitRfidUnknownCard(gateId: string, data: { cardNumber: string; deviceId: string; timestamp: string }) {
    this.server?.to(`gate:${gateId}`).emit('rfid:unknown-card', data);
  }

  emitEnvironmentalAlert(zoneId: string, data: { deviceId: string; parameter: string; value: number; threshold: number; severity: string }) {
    this.server?.to(`zone:${zoneId}`).emit('environmental:alert', data);
  }

  emitDeviceOnline(zoneId: string, data: { deviceId: string; deviceName: string; type: string; timestamp: Date }) {
    this.server?.to(`zone:${zoneId}`).emit('device:online', data);
  }

  emitDeviceOffline(zoneId: string, data: { deviceId: string; deviceName: string; type: string; lastSeen: Date | null }) {
    this.server?.to(`zone:${zoneId}`).emit('device:offline', data);
  }

  emitDeviceAlert(zoneId: string, data: { deviceId: string; alertType: string; severity: string; message: string }) {
    this.server?.to(`zone:${zoneId}`).emit('device:alert', data);
  }

  emitCommandCompleted(userId: string, data: { commandId: string; deviceId: string; type: string; success: boolean; response?: any; duration: number }) {
    this.server?.to(`user:${userId}`).emit('device:command:completed', data);
  }
}
