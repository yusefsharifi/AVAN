// M20: IoT & Device Integration — Data Ingestion Controller
// SECURITY FIX (SEC-002): All ingestion endpoints now require device
// authentication via X-Device-API-Key header, enforced by DeviceAuthGuard.
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AnprReadingDto, ScaleReadingDto, RfidTapDto, GpsPositionDto, EnvironmentalReadingDto, DeviceHeartbeatDto, DeviceAlertDto, CommandAckDto } from '../dto/create-dtos';
import { AnprProcessorService } from '../services/anpr-processor.service';
import { ScaleProcessorService } from '../services/scale-processor.service';
import { RfidProcessorService } from '../services/rfid-processor.service';
import { GpsTrackingService } from '../services/gps-tracking.service';
import { EnvironmentalSensorService } from '../services/environmental-sensor.service';
import { DeviceHealthMonitorService } from '../services/device-health-monitor.service';
import { DeviceManagementService } from '../services/device-management.service';
import { IotGatewayService } from '../services/iot-gateway.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { DeviceAuthGuard } from '../../../common/guards/device-auth.guard';

// SECURITY FIX (SEC-002): All IoT ingestion endpoints require device API key
@UseGuards(DeviceAuthGuard)
@Controller('/iot/ingest')
export class IngestController {
  constructor(
    private readonly anprService: AnprProcessorService,
    private readonly scaleService: ScaleProcessorService,
    private readonly rfidService: RfidProcessorService,
    private readonly gpsService: GpsTrackingService,
    private readonly envService: EnvironmentalSensorService,
    private readonly healthService: DeviceHealthMonitorService,
    private readonly deviceService: DeviceManagementService,
    private readonly gateway: IotGatewayService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('anpr')
  async ingestAnpr(@Body() dto: AnprReadingDto) {
    return this.anprService.processReading(dto);
  }

  @Post('scale')
  async ingestScale(@Body() dto: ScaleReadingDto) {
    return this.scaleService.processReading(dto);
  }

  @Post('rfid')
  async ingestRfid(@Body() dto: RfidTapDto) {
    return this.rfidService.processTap(dto);
  }

  @Post('gps')
  async ingestGps(@Body() dto: GpsPositionDto) {
    await this.gpsService.processPosition(dto);
    return { success: true };
  }

  @Post('environmental')
  async ingestEnvironmental(@Body() dto: EnvironmentalReadingDto) {
    await this.envService.processReading(dto);
    return { success: true };
  }

  @Post('heartbeat')
  async ingestHeartbeat(@Body() dto: DeviceHeartbeatDto) {
    await this.healthService.processHeartbeat(dto.deviceId, dto);
    return { success: true };
  }

  @Post('alert')
  async ingestAlert(@Body() dto: DeviceAlertDto) {
    const device = await this.deviceService.findByDeviceId(dto.deviceId);
    if (device) {
      const zoneId = device.zoneId;
      await this.prisma.deviceAlert.create({
        data: {
          deviceId: device.id,
          zoneId,
          alertType: dto.alertType,
          severity: dto.severity,
          message: dto.message,
          details: dto.details || {},
        },
      });
      this.gateway.emitDeviceAlert(zoneId, { deviceId: dto.deviceId, alertType: dto.alertType, severity: dto.severity, message: dto.message });
    }
    return { success: true };
  }

  @Post('ack')
  async ingestAck(@Body() dto: CommandAckDto) {
    await this.deviceService.processCommandAck(dto.correlationId, dto.response || {}, dto.success, dto.errorMessage);
    return { success: true };
  }
}
