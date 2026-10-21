// M20: IoT & Device Integration — GPS Tracking Service
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { GpsPositionDto, CreateGeofenceDto } from '../dto/create-dtos';
import type { VehiclePositionDto, SpeedViolationDto, IdleReportDto } from '../dto/enums';
import { IotGatewayService } from './iot-gateway.service';
import { haversineDistance, isPointInGeofence } from '../utils/iot.utils';

@Injectable()
export class GpsTrackingService {
  private readonly logger = new Logger(GpsTrackingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly gateway: IotGatewayService,
  ) {}

  async processPosition(dto: GpsPositionDto): Promise<void> {
    // Save tracking point
    await this.prisma.vehicleTrackingPoint.create({
      data: {
        zoneId: dto.zoneId,
        vehicleId: dto.vehicleId,
        deviceId: dto.deviceId,
        plate: dto.vehiclePlate,
        lat: dto.lat,
        lng: dto.lng,
        speed: dto.speed,
        heading: dto.heading,
        altitude: dto.altitude,
        accuracy: dto.accuracy,
        satellites: dto.satellites,
        isMoving: dto.speed > 1,
        recordedAt: new Date(dto.timestamp),
      },
    });

    // Update device
    await this.prisma.ioTDevice.updateMany({ where: { deviceId: dto.deviceId }, data: { lastSeenAt: new Date() } });

    // Cache current position
    await this.redis.set(`iot:gps:${dto.deviceId}`, JSON.stringify({ lat: dto.lat, lng: dto.lng, speed: dto.speed, heading: dto.heading, plate: dto.vehiclePlate, recordedAt: dto.timestamp }), 120);

    // Check geofences
    const geofences = await this.getGeofences(dto.zoneId);
    for (const gf of geofences) {
      const inside = isPointInGeofence(dto.lat, dto.lng, gf);
      const cacheKey = `iot:geofence:${dto.deviceId}:${gf.id}`;
      const wasInside = await this.redis.get(cacheKey);

      if (inside && !wasInside) {
        // Entry event
        await this.redis.set(cacheKey, 'inside', 300);
        if (gf.notifyOnEntry) {
          this.gateway.emitGeofenceEntry(dto.zoneId, { deviceId: dto.deviceId, vehiclePlate: dto.vehiclePlate, geofenceName: gf.name, enteredAt: new Date(), lat: dto.lat, lng: dto.lng });
        }
      } else if (!inside && wasInside) {
        // Exit event
        await this.redis.del(cacheKey);
        if (gf.notifyOnExit) {
          this.gateway.emitGeofenceExit(dto.zoneId, { deviceId: dto.deviceId, vehiclePlate: dto.vehiclePlate, geofenceName: gf.name, exitedAt: new Date(), dwellMinutes: 0 });
        }
      }
    }

    // Speed check (default limit 40 km/h for industrial zone)
    if (dto.speed > 40) {
      this.gateway.emitSpeedViolation(dto.zoneId, { deviceId: dto.deviceId, plate: dto.vehiclePlate, speed: dto.speed, limit: 40, location: `${dto.lat},${dto.lng}` });
    }

    // Emit position
    this.gateway.emitGpsPosition(dto.zoneId, { deviceId: dto.deviceId, vehiclePlate: dto.vehiclePlate, lat: dto.lat, lng: dto.lng, speed: dto.speed, heading: dto.heading, isMoving: dto.speed > 1 });
  }

  async getCurrentPositions(zoneId: string): Promise<VehiclePositionDto[]> {
    const devices = await this.prisma.ioTDevice.findMany({ where: { zoneId, type: 'GPS_TRACKER', isActive: true } });
    const positions: VehiclePositionDto[] = [];

    for (const device of devices) {
      const cached = await this.redis.get(`iot:gps:${device.deviceId}`);
      if (cached) {
        const pos = JSON.parse(cached);
        const recordedAt = new Date(pos.recordedAt);
        // Only include positions < 5 min old
        if (Date.now() - recordedAt.getTime() < 5 * 60 * 1000) {
          positions.push({ deviceId: device.deviceId, vehiclePlate: pos.plate, lat: pos.lat, lng: pos.lng, speed: pos.speed, heading: pos.heading, isMoving: pos.speed > 1, recordedAt });
        }
      }
    }
    return positions;
  }

  async getVehicleTrail(deviceId: string, fromDate: Date, toDate: Date): Promise<any[]> {
    return this.prisma.vehicleTrackingPoint.findMany({
      where: { deviceId, recordedAt: { gte: fromDate, lte: toDate } },
      orderBy: { recordedAt: 'asc' },
    });
  }

  async getGeofences(zoneId: string): Promise<any[]> {
    const cacheKey = `iot:geofences:${zoneId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const geofences = await this.prisma.geofenceZone.findMany({ where: { zoneId, isActive: true } });
    await this.redis.set(cacheKey, JSON.stringify(geofences), 300);
    return geofences;
  }

  async createGeofence(dto: CreateGeofenceDto): Promise<any> {
    return this.prisma.geofenceZone.create({
      data: {
        zoneId: dto.zoneId, name: dto.name, type: dto.type, polygon: dto.polygon,
        radius: dto.radius, centerLat: dto.centerLat, centerLng: dto.centerLng,
        notifyOnEntry: dto.notifyOnEntry, notifyOnExit: dto.notifyOnExit,
        allowedVehicles: dto.allowedVehicles || [],
      },
    });
  }

  async deleteGeofence(id: string): Promise<void> {
    await this.prisma.geofenceZone.delete({ where: { id } });
  }

  async getSpeedViolations(zoneId: string, fromDate: string, toDate: string): Promise<SpeedViolationDto[]> {
    const points = await this.prisma.vehicleTrackingPoint.findMany({
      where: { zoneId, speed: { gt: 40 }, recordedAt: { gte: new Date(fromDate), lte: new Date(toDate) } },
      orderBy: { recordedAt: 'desc' },
      take: 100,
    });
    return points.map((p) => ({ deviceId: p.deviceId, plate: p.plate, speed: Number(p.speed), limit: 40, recordedAt: p.recordedAt, lat: Number(p.lat), lng: Number(p.lng) }));
  }

  async getIdleReport(zoneId: string, fromDate: string, toDate: string): Promise<IdleReportDto[]> {
    // Find devices with no movement for > 30 min
    const devices = await this.prisma.ioTDevice.findMany({ where: { zoneId, type: 'GPS_TRACKER', isActive: true } });
    const idleVehicles: IdleReportDto[] = [];

    for (const device of devices) {
      const lastPoint = await this.prisma.vehicleTrackingPoint.findFirst({
        where: { deviceId: device.id, recordedAt: { gte: new Date(fromDate), lte: new Date(toDate) } },
        orderBy: { recordedAt: 'desc' },
      });
      if (lastPoint && !lastPoint.isMoving) {
        const idleMinutes = (Date.now() - lastPoint.recordedAt.getTime()) / 60000;
        if (idleMinutes > 30) {
          idleVehicles.push({ deviceId: device.deviceId, plate: lastPoint.plate, idleMinutes: Math.round(idleMinutes), lat: Number(lastPoint.lat), lng: Number(lastPoint.lng), lastMovement: lastPoint.recordedAt });
        }
      }
    }
    return idleVehicles;
  }
}
