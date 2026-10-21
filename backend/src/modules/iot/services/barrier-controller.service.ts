// M20: IoT & Device Integration — Barrier Controller Service
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { IotGatewayService } from './iot-gateway.service';
import { MqttService } from './mqtt.service';
import type { BarrierStateDto } from '../dto/enums';

// BUG-005: Lua script for atomic barrier state transition.
// Returns [prevState, ok] where ok=1 means transition succeeded.
// If barrier is already in the target state, returns [currentState, 0].
const BARRIER_TRANSITION_SCRIPT = `
  local currentState = redis.call('GET', KEYS[1])
  local targetState = ARGV[1]
  local ttl = tonumber(ARGV[2])
  if currentState == targetState then
    return {currentState, 0}
  end
  redis.call('SETEX', KEYS[1], ttl, targetState)
  return {currentState or '', 1}
`;

@Injectable()
export class BarrierControllerService {
  private readonly logger = new Logger(BarrierControllerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: IotGatewayService,
    private readonly mqtt: MqttService,
  ) {}

  /**
   * BUG-005: Atomically transition barrier state using a Lua script.
   * This eliminates the check-then-act race condition by performing
   * READ + CHECK + WRITE in a single atomic Redis operation.
   */
  private async atomicBarrierTransition(
    deviceId: string,
    targetState: string,
    ttlSeconds: number,
  ): Promise<{ previousState: string; transitioned: boolean }> {
    const key = `iot:barrier:${deviceId}`;
    const client = this.redis.getClient();
    const result = (await client.eval(
      BARRIER_TRANSITION_SCRIPT,
      1, // number of keys
      key,
      targetState,
      String(ttlSeconds),
    )) as [string, number];

    return {
      previousState: result[0] || '',
      transitioned: result[1] === 1,
    };
  }

  async openBarrier(deviceId: string, reason: string, requestedBy: string, durationSeconds?: number): Promise<any> {
    const device = await this.prisma.ioTDevice.findFirst({ where: { deviceId } });
    if (!device) throw new AppException('DEVICE_NOT_FOUND');
    if (!device.isOnline) throw new AppException('DEVICE_OFFLINE');
    if (device.type !== 'BARRIER') throw new AppException('DEVICE_NOT_FOUND');

    const duration = durationSeconds || 10;

    // BUG-005: Atomic check-and-transition — no race condition.
    // If barrier is already 'open', this returns transitioned=false.
    const { previousState, transitioned } = await this.atomicBarrierTransition(
      device.id, 'open', duration + 5,
    );

    if (!transitioned) {
      if (previousState === 'open') throw new AppException('BARRIER_ALREADY_OPEN');
      // Barrier was in another transitional state (e.g., 'stopped') — still proceed
    }

    const correlationId = `barrier-open-${Date.now()}`;

    const command = await this.prisma.deviceCommand.create({
      data: {
        deviceId: device.id,
        zoneId: device.zoneId,
        type: 'BARRIER_OPEN',
        payload: { duration, reason, requestedBy },
        status: 'SENT',
        sentAt: new Date(),
        correlationId,
        priority: 3,
        issuedBy: requestedBy,
      },
    });

    // Publish MQTT command
    if (device.mqttTopic) {
      await this.mqtt.publish(`${device.mqttTopic}/cmd`, { action: 'open', duration, commandId: command.id, correlationId }, { qos: 1 });
    }

    this.gateway.emitBarrierOpened(device.zoneId, device.gateId || 'default', {
      deviceId: device.deviceId, reason, openedAt: new Date(),
    });

    await this.audit.log({ zoneId: device.zoneId, action: 'BARRIER_OPENED', targetType: 'DeviceCommand', targetId: command.id, userId: requestedBy, metadata: { reason, duration } });
    return command;
  }

  async closeBarrier(deviceId: string, requestedBy: string): Promise<any> {
    const device = await this.prisma.ioTDevice.findFirst({ where: { deviceId } });
    if (!device) throw new AppException('DEVICE_NOT_FOUND');
    if (!device.isOnline) throw new AppException('DEVICE_OFFLINE');

    // BUG-005: Atomic transition to 'closed'
    await this.atomicBarrierTransition(device.id, 'closed', 60);

    const correlationId = `barrier-close-${Date.now()}`;
    const command = await this.prisma.deviceCommand.create({
      data: {
        deviceId: device.id,
        zoneId: device.zoneId,
        type: 'BARRIER_CLOSE',
        payload: { requestedBy },
        status: 'SENT',
        sentAt: new Date(),
        correlationId,
        priority: 2,
        issuedBy: requestedBy,
      },
    });

    if (device.mqttTopic) {
      await this.mqtt.publish(`${device.mqttTopic}/cmd`, { action: 'close', commandId: command.id, correlationId }, { qos: 1 });
    }

    this.gateway.emitBarrierClosed(device.gateId || 'default', { deviceId: device.deviceId, closedAt: new Date() });

    await this.audit.log({ zoneId: device.zoneId, action: 'BARRIER_CLOSED', targetType: 'DeviceCommand', targetId: command.id, userId: requestedBy });
    return command;
  }

  async emergencyStop(deviceId: string, requestedBy: string): Promise<any> {
    const device = await this.prisma.ioTDevice.findFirst({ where: { deviceId } });
    if (!device) throw new AppException('DEVICE_NOT_FOUND');

    // BUG-005: Atomic transition to 'stopped'
    await this.atomicBarrierTransition(device.id, 'stopped', 60);

    const command = await this.prisma.deviceCommand.create({
      data: {
        deviceId: device.id,
        zoneId: device.zoneId,
        type: 'BARRIER_STOP',
        payload: { emergency: true, requestedBy },
        status: 'SENT',
        sentAt: new Date(),
        correlationId: `barrier-stop-${Date.now()}`,
        priority: 1, // Highest priority
        issuedBy: requestedBy,
      },
    });

    if (device.mqttTopic) {
      await this.mqtt.publish(`${device.mqttTopic}/cmd`, { action: 'stop', emergency: true, commandId: command.id }, { qos: 1 });
    }

    await this.audit.log({ zoneId: device.zoneId, action: 'BARRIER_EMERGENCY_STOP', targetType: 'DeviceCommand', targetId: command.id, userId: requestedBy });
    return command;
  }

  async getBarrierState(deviceId: string): Promise<BarrierStateDto> {
    const device = await this.prisma.ioTDevice.findFirst({ where: { deviceId } });
    if (!device) throw new AppException('DEVICE_NOT_FOUND');

    const state = await this.redis.get(`iot:barrier:${device.id}`);
    const lastCmd = await this.prisma.deviceCommand.findFirst({
      where: { deviceId: device.id, type: { in: ['BARRIER_OPEN', 'BARRIER_CLOSE', 'BARRIER_STOP'] } },
      orderBy: { issuedAt: 'desc' },
    });

    return {
      isOpen: state === 'open',
      lastCommand: lastCmd?.type || null,
      lastCommandAt: lastCmd?.issuedAt || null,
      lastCommandBy: lastCmd?.issuedBy || null,
      isOnline: device.isOnline,
      loopDetected: state === 'loop',
    };
  }

  async handleBarrierStatus(deviceId: string, status: any): Promise<void> {
    const device = await this.prisma.ioTDevice.findFirst({ where: { deviceId } });
    if (!device) return;

    if (status.state === 'error') {
      await this.prisma.deviceAlert.create({
        data: {
          deviceId: device.id,
          zoneId: device.zoneId,
          alertType: 'BARRIER_STUCK',
          severity: 'ERROR',
          message: `Barrier error: ${status.error || 'unknown'}`,
          details: status,
        },
      });
      this.gateway.emitBarrierError(device.zoneId, device.gateId || 'default', { deviceId: device.deviceId, error: status.error || 'unknown', severity: 'ERROR' });
    }

    // BUG-005: Atomic transition for device-reported state
    await this.atomicBarrierTransition(device.id, status.state || 'unknown', 60);
  }

  async testBarrier(deviceId: string): Promise<void> {
    const device = await this.prisma.ioTDevice.findFirst({ where: { deviceId } });
    if (!device) throw new AppException('DEVICE_NOT_FOUND');
    if (device.mqttTopic) {
      await this.mqtt.publish(`${device.mqttTopic}/cmd`, { action: 'test', type: 'DIAGNOSTIC_RUN' }, { qos: 1 });
    }
  }
}
