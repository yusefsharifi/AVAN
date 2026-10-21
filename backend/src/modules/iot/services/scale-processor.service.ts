// M20: IoT & Device Integration — Scale Processor Service
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ScaleReadingDto } from '../dto/create-dtos';
import type { ScaleProcessResult, ScaleCurrentDto, AxleWeightDto } from '../dto/enums';
import { IotGatewayService } from './iot-gateway.service';
import { MqttService } from './mqtt.service';
import { isOverload } from '../utils/iot.utils';

@Injectable()
export class ScaleProcessorService {
  private readonly logger = new Logger(ScaleProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: IotGatewayService,
    private readonly mqtt: MqttService,
  ) {}

  async processReading(dto: ScaleReadingDto): Promise<ScaleProcessResult> {
    // Convert to kg if needed
    let weightKg = dto.weight;
    if (dto.unit === 'ton') weightKg = dto.weight * 1000;

    // Save reading
    const reading = await this.prisma.deviceReading.create({
      data: {
        deviceId: dto.deviceId,
        zoneId: dto.zoneId,
        type: dto.isStable ? 'WEIGHT_STABLE' : 'WEIGHT_READING',
        payload: { weight: weightKg, unit: 'kg', isStable: dto.isStable, confidence: dto.confidence, axle1: dto.axle1, axle2: dto.axle2, axle3: dto.axle3 },
      },
    });

    // Get device config
    const device = await this.prisma.ioTDevice.findFirst({ where: { deviceId: dto.deviceId } });
    const config = (device?.config as any) || {};

    // Overload detection
    const overload = isOverload(weightKg, { maxCapacity: config.maxCapacity });
    if (overload) {
      await this.prisma.deviceAlert.create({
        data: {
          deviceId: device?.id || dto.deviceId,
          zoneId: dto.zoneId,
          alertType: 'OVERLOAD',
          severity: 'WARNING',
          message: `Scale overload: ${weightKg}kg (max: ${config.maxCapacity}kg)`,
          details: { weight: weightKg, maxCapacity: config.maxCapacity },
        },
      });
      this.gateway.emitScaleOverload(dto.zoneId, { deviceId: dto.deviceId, weight: weightKg, maxCapacity: config.maxCapacity || 0 });
    }

    // Update device
    if (device) {
      await this.prisma.ioTDevice.update({ where: { id: device.id }, data: { lastSeenAt: new Date(), totalEvents: { increment: 1 } } });
    }

    // Cache current reading
    const cacheData = { weight: weightKg, unit: 'kg', isStable: dto.isStable, confidence: dto.confidence, lastReadingAt: new Date().toISOString(), isOverload: overload, vehicleOnScale: dto.isStable && weightKg > 200 };
    await this.redis.set(`iot:scale:${dto.deviceId}`, JSON.stringify(cacheData), 30);

    // Emit socket events
    this.gateway.emitScaleReading(dto.deviceId, { deviceId: dto.deviceId, weight: weightKg, unit: 'kg', isStable: dto.isStable, isOverload: overload, vehicleOnScale: cacheData.vehicleOnScale });

    if (dto.isStable && weightKg > 200) {
      this.gateway.emitScaleStable(dto.deviceId, { deviceId: dto.deviceId, weight: weightKg, unit: 'kg', confidence: dto.confidence });
    }

    // Mark as processed
    await this.prisma.deviceReading.update({ where: { id: reading.id }, data: { isProcessed: true, processingResult: { weight: weightKg, overload, vehicleOnScale: cacheData.vehicleOnScale } } });

    return { readingId: reading.id, weight: weightKg, unit: 'kg', isStable: dto.isStable, isOverload: overload, vehicleOnScale: cacheData.vehicleOnScale };
  }

  async tare(deviceId: string, operatorId: string): Promise<any> {
    const device = await this.prisma.ioTDevice.findFirst({ where: { deviceId } });
    if (!device) throw new AppException('DEVICE_NOT_FOUND');
    return this.sendScaleCommand(device, 'SCALE_TARE', {}, operatorId);
  }

  async zero(deviceId: string, operatorId: string): Promise<any> {
    const device = await this.prisma.ioTDevice.findFirst({ where: { deviceId } });
    if (!device) throw new AppException('DEVICE_NOT_FOUND');
    return this.sendScaleCommand(device, 'SCALE_ZERO', {}, operatorId);
  }

  async printReceipt(deviceId: string, weighRecordId: string, operatorId: string): Promise<any> {
    const device = await this.prisma.ioTDevice.findFirst({ where: { deviceId } });
    if (!device) throw new AppException('DEVICE_NOT_FOUND');
    return this.sendScaleCommand(device, 'SCALE_PRINT', { weighRecordId }, operatorId);
  }

  async getCurrentReading(scaleId: string): Promise<ScaleCurrentDto> {
    const cached = await this.redis.get(`iot:scale:${scaleId}`);
    if (cached) return JSON.parse(cached);
    return { weight: 0, unit: 'kg', isStable: false, confidence: 0, isOnline: false, lastReadingAt: null, isOverload: false, vehicleOnScale: false };
  }

  async getReadingHistory(deviceId: string, fromDate: string, toDate: string): Promise<any[]> {
    return this.prisma.deviceReading.findMany({
      where: { deviceId, type: { in: ['WEIGHT_READING', 'WEIGHT_STABLE'] }, createdAt: { gte: new Date(fromDate), lte: new Date(toDate) } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async detectAxleWeights(deviceId: string): Promise<AxleWeightDto> {
    const cached = await this.redis.get(`iot:scale:${deviceId}`);
    if (!cached) return { axle1: null, axle2: null, axle3: null, total: 0, isOverload: false };
    const data = JSON.parse(cached);
    return { axle1: data.axle1 || null, axle2: data.axle2 || null, axle3: data.axle3 || null, total: data.weight, isOverload: data.isOverload };
  }

  private async sendScaleCommand(device: any, type: any, payload: object, issuedBy: string): Promise<any> {
    const command = await this.prisma.deviceCommand.create({
      data: { deviceId: device.id, zoneId: device.zoneId, type, payload, status: 'SENT', sentAt: new Date(), issuedBy },
    });
    if (device.mqttTopic) {
      await this.mqtt.publish(`${device.mqttTopic}/cmd`, { type, payload, commandId: command.id }, { qos: 1 });
    }
    return command;
  }
}
