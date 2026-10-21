// M20: IoT & Device Integration — ANPR Processor Service
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AnprReadingDto } from '../dto/create-dtos';
import type { AnprProcessResult, AnprStatisticsDto } from '../dto/enums';
import { IotGatewayService } from './iot-gateway.service';
import { normalizePlate } from '../utils/iot.utils';

@Injectable()
export class AnprProcessorService {
  private readonly logger = new Logger(AnprProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: IotGatewayService,
  ) {}

  async processReading(dto: AnprReadingDto): Promise<AnprProcessResult> {
    const normalizedPlate = normalizePlate(dto.plate);

    // Save reading
    const reading = await this.prisma.deviceReading.create({
      data: {
        deviceId: dto.deviceId,
        zoneId: dto.zoneId,
        type: 'PLATE_DETECTED',
        payload: { plate: normalizedPlate, confidence: dto.confidence, direction: dto.direction, vehicleType: dto.vehicleType, imageKey: dto.imageKey, speed: dto.speed },
      },
    });

    // Update device stats
    await this.prisma.ioTDevice.updateMany({ where: { deviceId: dto.deviceId }, data: { totalEvents: { increment: 1 }, lastSeenAt: new Date() } });

    // Quick blacklist check from Redis
    const isBlacklisted = await this.redis.get(`iot:blacklist:${normalizedPlate}:${dto.zoneId}`);
    if (isBlacklisted) {
      this.gateway.emitDeviceAlert(dto.zoneId, { deviceId: dto.deviceId, alertType: 'UNAUTHORIZED_ACCESS', severity: 'CRITICAL', message: `Blacklisted plate detected: ${normalizedPlate}` });
    }

    let action: AnprProcessResult['action'] = 'LOW_CONFIDENCE';
    let vehicleInfo: any = null;

    // Confidence-based routing
    if (dto.confidence >= 0.90) {
      // HIGH confidence — auto-process
      action = 'AUTO_PROCESSED';
      // Look up vehicle
      const vehicle = await this.prisma.vehicle.findFirst({ where: { plate: normalizedPlate } });
      if (vehicle) {
        vehicleInfo = { id: vehicle.id, plate: normalizedPlate, companyId: vehicle.companyId };
      }
      this.gateway.emitAnprPlateDetected(dto.direction || 'entry', {
        deviceId: dto.deviceId, plate: normalizedPlate, confidence: dto.confidence, imageKey: dto.imageKey, vehicleInfo, suggestedAction: isBlacklisted ? 'DENY' : 'ALLOW', direction: dto.direction,
      });
    } else if (dto.confidence >= 0.75) {
      // MEDIUM confidence — send for guard review
      action = 'SENT_FOR_REVIEW';
      await this.redis.set(`iot:anpr:pending:${reading.id}`, JSON.stringify({ plate: normalizedPlate, deviceId: dto.deviceId, zoneId: dto.zoneId }), 60);
      this.gateway.emitAnprNeedsReview(dto.direction || 'entry', { readingId: reading.id, plate: normalizedPlate, confidence: dto.confidence, imageKey: dto.imageKey, reason: 'Medium confidence reading' });
    } else {
      // LOW confidence — flag for manual entry
      action = 'LOW_CONFIDENCE';
      this.gateway.emitAnprLowConfidence(dto.direction || 'entry', { readingId: reading.id, confidence: dto.confidence, imageKey: dto.imageKey });
    }

    // Mark as processed
    await this.prisma.deviceReading.update({ where: { id: reading.id }, data: { isProcessed: true, processingResult: { action, vehicleInfo } } });

    return { readingId: reading.id, plate: normalizedPlate, confidence: dto.confidence, action, vehicleInfo };
  }

  async getStatistics(deviceId: string, fromDate: string, toDate: string): Promise<AnprStatisticsDto> {
    const readings = await this.prisma.deviceReading.findMany({
      where: { deviceId, type: 'PLATE_DETECTED', createdAt: { gte: new Date(fromDate), lte: new Date(toDate) } },
    });

    const readingsByHour = Array(24).fill(0);
    const plateCounts = new Map<string, number>();
    let totalConfidence = 0;

    for (const r of readings) {
      const hour = new Date(r.createdAt).getHours();
      readingsByHour[hour]++;
      const plate = (r.payload as any)?.plate;
      if (plate) plateCounts.set(plate, (plateCounts.get(plate) || 0) + 1);
      totalConfidence += (r.payload as any)?.confidence || 0;
    }

    const topPlates = Array.from(plateCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([plate, count]) => ({ plate, count }));

    return {
      totalReadings: readings.length,
      autoProcessed: readings.filter((r) => (r.processingResult as any)?.action === 'AUTO_PROCESSED').length,
      sentForReview: readings.filter((r) => (r.processingResult as any)?.action === 'SENT_FOR_REVIEW').length,
      lowConfidence: readings.filter((r) => (r.processingResult as any)?.action === 'LOW_CONFIDENCE').length,
      avgConfidence: readings.length > 0 ? totalConfidence / readings.length : 0,
      readingsByHour,
      topPlates,
    };
  }
}
