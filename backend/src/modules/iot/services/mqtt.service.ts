// M20: IoT & Device Integration — MQTT Service
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as mqtt from 'mqtt';
import { parseMqttTopic, buildMqttTopic } from '../utils/iot.utils';
import type { MqttConnectionStatus } from '../dto/enums';

type MqttHandler = (payload: object, topic: string) => Promise<void>;

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient | null = null;
  private readonly subscriptions = new Map<string, MqttHandler[]>();
  private readonly brokerUrl: string;
  private readonly clientId: string;
  private readonly qos: 0 | 1 | 2;

  constructor() {
    this.brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    this.clientId = `idop-server-${Math.random().toString(36).substring(2, 10)}`;
    this.qos = 1;
  }

  async onModuleInit(): Promise<void> {
    try {
      const options: mqtt.IClientOptions = {
        clientId: this.clientId,
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
        // qos set per subscription
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 10000,
        will: {
          topic: 'idop/server/status',
          payload: JSON.stringify({ status: 'offline', timestamp: new Date().toISOString() }),
          qos: 1,
          retain: true,
        },
      };

      this.client = mqtt.connect(this.brokerUrl, options);

      this.client.on('connect', () => {
        this.logger.log(`Connected to MQTT broker: ${this.brokerUrl}`);
        // Subscribe to all device topics
        this.client?.subscribe('idop/+/+/+/data', { qos: 1 });
        this.client?.subscribe('idop/+/+/+/status', { qos: 1 });
        this.client?.subscribe('idop/+/+/+/heartbeat', { qos: 1 });
        this.client?.subscribe('idop/+/+/+/alert', { qos: 1 });
        this.client?.subscribe('idop/+/+/+/ack', { qos: 1 });
        // Publish online status
        this.publish('idop/server/status', { status: 'online', timestamp: new Date().toISOString() }, { retain: true });
      });

      this.client.on('message', async (topic: string, message: Buffer) => {
        try {
          const parsed = JSON.parse(message.toString());
          await this.handleMessage(topic, parsed);
        } catch (err) {
          this.logger.error(`Failed to process MQTT message on ${topic}: ${err}`);
        }
      });

      this.client.on('error', (err) => {
        this.logger.error(`MQTT error: ${err.message}`);
      });

      this.client.on('offline', () => {
        this.logger.warn('MQTT client disconnected');
      });
    } catch (err) {
      this.logger.error(`Failed to connect to MQTT broker: ${err}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.publish('idop/server/status', { status: 'offline', timestamp: new Date().toISOString() }, { retain: true });
      this.client.end(true);
      this.logger.log('MQTT client disconnected');
    }
  }

  async publish(topic: string, payload: object, options?: { qos?: 0 | 1 | 2; retain?: boolean }): Promise<void> {
    if (!this.client?.connected) {
      this.logger.warn(`MQTT not connected, cannot publish to ${topic}`);
      return;
    }
    const msgOptions: { qos?: 0 | 1 | 2; retain?: boolean } = {
      qos: options?.qos ?? this.qos,
      retain: options?.retain ?? false,
    };
    this.client.publish(topic, JSON.stringify(payload), msgOptions);
  }

  async subscribe(topic: string, handler: MqttHandler): Promise<void> {
    const handlers = this.subscriptions.get(topic) || [];
    handlers.push(handler);
    this.subscriptions.set(topic, handlers);
    this.client?.subscribe(topic, { qos: this.qos });
  }

  async unsubscribe(topic: string): Promise<void> {
    this.subscriptions.delete(topic);
    this.client?.unsubscribe(topic);
  }

  private async handleMessage(topic: string, payload: object): Promise<void> {
    const parsed = parseMqttTopic(topic);
    if (!parsed) {
      this.logger.warn(`Could not parse MQTT topic: ${topic}`);
      return;
    }

    // Route based on message type
    const { messageType } = parsed;

    // Find registered handlers for this topic pattern
    for (const [pattern, handlers] of this.subscriptions) {
      if (this.topicMatches(pattern, topic)) {
        for (const handler of handlers) {
          try {
            await handler(payload, topic);
          } catch (err) {
            this.logger.error(`Handler error for ${topic}: ${err}`);
          }
        }
      }
    }
  }

  private topicMatches(pattern: string, topic: string): boolean {
    const patternParts = pattern.split('/');
    const topicParts = topic.split('/');
    if (patternParts.length !== topicParts.length) return false;
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '+' || patternParts[i] === '#') continue;
      if (patternParts[i] !== topicParts[i]) return false;
    }
    return true;
  }

  async sendCommand(topic: string, payload: object): Promise<void> {
    await this.publish(topic, payload, { qos: 1 });
  }

  async getConnectionStatus(): Promise<MqttConnectionStatus> {
    return {
      connected: this.client?.connected || false,
      brokerUrl: this.brokerUrl,
      clientId: this.clientId,
      subscriptionCount: this.subscriptions.size,
    };
  }

  buildTopic(zoneId: string, deviceType: string, deviceId: string, suffix: string): string {
    return buildMqttTopic(zoneId, deviceType, deviceId, suffix);
  }
}
