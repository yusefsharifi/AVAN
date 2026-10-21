// M20: IoT & Device Integration — Environmental Sensor Service
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { EnvironmentalReadingDto } from '../dto/create-dtos';
import type { EnvironmentalCurrentDto, EnvironmentalHistoryDto, AirQualityIndexDto } from '../dto/enums';
import { IotGatewayService } from './iot-gateway.service';
import { ENV_DEFAULTS } from '../utils/iot.utils';

@Injectable()
export class EnvironmentalSensorService {
  private readonly logger = new Logger(EnvironmentalSensorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: IotGatewayService,
  ) {}

  async processReading(dto: EnvironmentalReadingDto): Promise<void> {
    // Save reading
    const reading = await this.prisma.deviceReading.create({
      data: {
        deviceId: dto.deviceId,
        zoneId: dto.zoneId,
        type: 'ENVIRONMENTAL',
        payload: { temperature: dto.temperature, humidity: dto.humidity, co2: dto.co2, co: dto.co, nox: dto.nox, pm25: dto.pm25, pm10: dto.pm10, noiseLevel: dto.noiseLevel, isRaining: dto.isRaining },
      },
    });

    // Cache current values
    await this.redis.set(`iot:env:${dto.deviceId}`, JSON.stringify({ ...dto, recordedAt: new Date().toISOString() }), 300);

    // Update device
    await this.prisma.ioTDevice.updateMany({ where: { deviceId: dto.deviceId }, data: { lastSeenAt: new Date(), totalEvents: { increment: 1 } } });

    // Threshold checks
    if (dto.co2 && dto.co2 > ENV_DEFAULTS.CO2_WARNING) {
      await this.createAlert(dto, 'CO2', dto.co2, ENV_DEFAULTS.CO2_WARNING, 'WARNING');
    }
    if (dto.co && dto.co > ENV_DEFAULTS.CO_CRITICAL) {
      await this.createAlert(dto, 'CO', dto.co, ENV_DEFAULTS.CO_CRITICAL, 'CRITICAL');
    }
    if (dto.temperature && dto.temperature > ENV_DEFAULTS.TEMP_HIGH) {
      await this.createAlert(dto, 'Temperature', dto.temperature, ENV_DEFAULTS.TEMP_HIGH, 'WARNING');
    }
    if (dto.noiseLevel && dto.noiseLevel > ENV_DEFAULTS.NOISE_WARNING) {
      await this.createAlert(dto, 'Noise', dto.noiseLevel, ENV_DEFAULTS.NOISE_WARNING, 'WARNING');
    }

    // Mark as processed
    await this.prisma.deviceReading.update({ where: { id: reading.id }, data: { isProcessed: true } });
  }

  private async createAlert(dto: EnvironmentalReadingDto, parameter: string, value: number, threshold: number, severity: 'WARNING' | 'CRITICAL'): Promise<void> {
    const device = await this.prisma.ioTDevice.findFirst({ where: { deviceId: dto.deviceId } });
    if (!device) return;

    await this.prisma.deviceAlert.create({
      data: {
        deviceId: device.id,
        zoneId: dto.zoneId,
        alertType: severity === 'CRITICAL' ? 'DEVICE_ERROR' : 'TEMPERATURE_HIGH',
        severity,
        message: `${parameter} exceeded threshold: ${value} (limit: ${threshold})`,
        details: { parameter, value, threshold },
      },
    });

    this.gateway.emitEnvironmentalAlert(dto.zoneId, { deviceId: dto.deviceId, parameter, value, threshold, severity });
  }

  async getCurrentReadings(zoneId: string): Promise<EnvironmentalCurrentDto[]> {
    const devices = await this.prisma.ioTDevice.findMany({ where: { zoneId, type: 'ENVIRONMENTAL', isActive: true } });
    const readings: EnvironmentalCurrentDto[] = [];

    for (const device of devices) {
      const cached = await this.redis.get(`iot:env:${device.deviceId}`);
      const data = cached ? JSON.parse(cached) : {};
      readings.push({
        deviceId: device.deviceId,
        deviceName: device.name,
        temperature: data.temperature || null,
        humidity: data.humidity || null,
        co2: data.co2 || null,
        co: data.co || null,
        noiseLevel: data.noiseLevel || null,
        lastReadingAt: data.recordedAt ? new Date(data.recordedAt) : null,
      });
    }
    return readings;
  }

  async getReadingHistory(deviceId: string, fromDate: string, toDate: string, _interval: string): Promise<EnvironmentalHistoryDto[]> {
    const readings = await this.prisma.deviceReading.findMany({
      where: { deviceId, type: 'ENVIRONMENTAL', createdAt: { gte: new Date(fromDate), lte: new Date(toDate) } },
      orderBy: { createdAt: 'asc' },
      take: 500,
    });
    return readings.map((r) => ({
      timestamp: r.createdAt.toISOString(),
      temperature: (r.payload as any)?.temperature || null,
      humidity: (r.payload as any)?.humidity || null,
      co2: (r.payload as any)?.co2 || null,
      co: (r.payload as any)?.co || null,
    }));
  }

  async getAirQualityIndex(zoneId: string): Promise<AirQualityIndexDto> {
    const readings = await this.getCurrentReadings(zoneId);
    const co2Values = readings.filter((r) => r.co2 != null).map((r) => r.co2!);
    const pm25Values = readings.map((r) => (r as any).pm25 || 0).filter(Boolean);

    const avgCo2 = co2Values.length > 0 ? co2Values.reduce((s, v) => s + v, 0) / co2Values.length : 0;
    const avgPm25 = pm25Values.length > 0 ? pm25Values.reduce((s, v) => s + v, 0) / pm25Values.length : 0;

    // Simple AQI calculation
    let index = Math.round(avgCo2 / 10 + avgPm25);
    index = Math.min(500, Math.max(0, index));

    let level: 'GOOD' | 'MODERATE' | 'UNHEALTHY' | 'HAZARDOUS' = 'GOOD';
    if (index > 300) level = 'HAZARDOUS';
    else if (index > 200) level = 'UNHEALTHY';
    else if (index > 100) level = 'MODERATE';

    return { index, level, primaryPollutant: avgCo2 > 1000 ? 'CO2' : 'PM2.5', components: { co2: avgCo2, pm25: avgPm25 } };
  }
}
