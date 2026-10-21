// M20: IoT & Device Integration — Module
import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuditService } from '../../common/services/audit.service';
import { IotGatewayService } from './services/iot-gateway.service';
import { MqttService } from './services/mqtt.service';
import { DeviceManagementService } from './services/device-management.service';
import { AnprProcessorService } from './services/anpr-processor.service';
import { BarrierControllerService } from './services/barrier-controller.service';
import { ScaleProcessorService } from './services/scale-processor.service';
import { GpsTrackingService } from './services/gps-tracking.service';
import { RfidProcessorService } from './services/rfid-processor.service';
import { EnvironmentalSensorService } from './services/environmental-sensor.service';
import { DeviceHealthMonitorService } from './services/device-health-monitor.service';
import { DeviceAuthGuard } from '../../common/guards/device-auth.guard';
import { DeviceController } from './controllers/device.controller';
import { BarrierController } from './controllers/barrier.controller';
import { ScaleController } from './controllers/scale.controller';
import { GpsController } from './controllers/gps.controller';
import { EnvironmentalController } from './controllers/environmental.controller';
import { AlertController } from './controllers/alert.controller';
import { IngestController } from './controllers/ingest.controller';
import { parseMqttTopic } from './utils/iot.utils';

@Module({
  providers: [
    PrismaService,
    RedisService,
    AuditService,
    IotGatewayService,
    MqttService,
    DeviceManagementService,
    AnprProcessorService,
    BarrierControllerService,
    ScaleProcessorService,
    GpsTrackingService,
    RfidProcessorService,
    EnvironmentalSensorService,
    DeviceHealthMonitorService,
    DeviceAuthGuard,
  ],
  controllers: [
    DeviceController,
    BarrierController,
    ScaleController,
    GpsController,
    EnvironmentalController,
    AlertController,
    IngestController,
  ],
  exports: [
    DeviceManagementService,
    AnprProcessorService,
    BarrierControllerService,
    ScaleProcessorService,
    GpsTrackingService,
    RfidProcessorService,
    EnvironmentalSensorService,
    DeviceHealthMonitorService,
    MqttService,
    IotGatewayService,
  ],
})
export class IotModule implements OnModuleInit {
  private readonly logger = new Logger(IotModule.name);

  constructor(
    private readonly mqtt: MqttService,
    private readonly anprProcessor: AnprProcessorService,
    private readonly scaleProcessor: ScaleProcessorService,
    private readonly rfidProcessor: RfidProcessorService,
    private readonly gpsTracking: GpsTrackingService,
    private readonly envSensor: EnvironmentalSensorService,
    private readonly healthMonitor: DeviceHealthMonitorService,
    private readonly deviceManagement: DeviceManagementService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing IoT module...');

    // Subscribe to MQTT data topics
    await this.mqtt.subscribe('idop/+/+/+/data', async (payload: any, topic: string) => {
      const parsed = parseMqttTopic(topic);
      if (!parsed) return;

      try {
        switch (parsed.deviceType) {
          case 'ANPR_CAMERA':
            await this.anprProcessor.processReading({ ...payload, deviceId: parsed.deviceId, zoneId: parsed.zoneId, timestamp: payload.timestamp || new Date().toISOString() });
            break;
          case 'WEIGH_SCALE':
            await this.scaleProcessor.processReading({ ...payload, deviceId: parsed.deviceId, zoneId: parsed.zoneId, timestamp: payload.timestamp || new Date().toISOString() });
            break;
          case 'RFID_READER':
            await this.rfidProcessor.processTap({ ...payload, deviceId: parsed.deviceId, zoneId: parsed.zoneId, timestamp: payload.timestamp || new Date().toISOString() });
            break;
          case 'GPS_TRACKER':
            await this.gpsTracking.processPosition({ ...payload, deviceId: parsed.deviceId, zoneId: parsed.zoneId, timestamp: payload.timestamp || new Date().toISOString() });
            break;
          case 'ENVIRONMENTAL':
            await this.envSensor.processReading({ ...payload, deviceId: parsed.deviceId, zoneId: parsed.zoneId, timestamp: payload.timestamp || new Date().toISOString() });
            break;
          default:
            this.logger.debug(`Unhandled device type: ${parsed.deviceType}`);
        }
      } catch (err) {
        this.logger.error(`Error processing MQTT data for ${parsed.deviceId}: ${err}`);
      }
    });

    // Subscribe to heartbeat topics
    await this.mqtt.subscribe('idop/+/+/+/heartbeat', async (payload: any, topic: string) => {
      const parsed = parseMqttTopic(topic);
      if (!parsed) return;
      try {
        await this.healthMonitor.processHeartbeat(parsed.deviceId, payload);
      } catch (err) {
        this.logger.error(`Error processing heartbeat for ${parsed.deviceId}: ${err}`);
      }
    });

    // Subscribe to status topics
    await this.mqtt.subscribe('idop/+/+/+/status', async (payload: any, topic: string) => {
      const parsed = parseMqttTopic(topic);
      if (!parsed) return;
      try {
        await this.deviceManagement.updateDeviceStatus(parsed.deviceId, payload.isOnline ?? true, payload);
      } catch (err) {
        this.logger.error(`Error processing status for ${parsed.deviceId}: ${err}`);
      }
    });

    // Subscribe to ACK topics
    await this.mqtt.subscribe('idop/+/+/+/ack', async (payload: any, topic: string) => {
      const parsed = parseMqttTopic(topic);
      if (!parsed) return;
      try {
        await this.deviceManagement.processCommandAck(payload.correlationId || '', payload.response || {}, payload.success ?? false, payload.errorMessage);
      } catch (err) {
        this.logger.error(`Error processing ACK for ${parsed.deviceId}: ${err}`);
      }
    });

    this.logger.log('IoT module initialized — MQTT subscriptions active');
  }
}
