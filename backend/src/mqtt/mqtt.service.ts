import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';

export type MqttMessageHandler = (topic: string, payload: Buffer) => void;

@Injectable()
export class MqttService implements OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient | null = null;
  private readonly subscriptions = new Map<string, MqttMessageHandler[]>();
  private connected = false;

  constructor(private readonly config: ConfigService) {
    this.connect();
  }

  private connect(): void {
    const brokerUrl = this.config.get('MQTT_BROKER_URL', 'mqtt://localhost:1883');
    const clientId = this.config.get('MQTT_CLIENT_ID', 'idop-backend');

    try {
      this.client = mqtt.connect(brokerUrl, {
        clientId: `${clientId}-${Date.now()}`,
        clean: true,
        connectTimeout: 5000,
        reconnectPeriod: 3000,
      });

      this.client.on('connect', () => {
        this.connected = true;
        this.logger.log('MQTT connected to broker');
        // Re-subscribe after reconnect
        for (const topic of this.subscriptions.keys()) {
          this.client?.subscribe(topic);
        }
      });

      this.client.on('message', (topic: string, payload: Buffer) => {
        const handlers = this.subscriptions.get(topic) || [];
        // Also check wildcard subscriptions
        for (const [subscribedTopic, topicHandlers] of this.subscriptions) {
          if (this.matchTopic(subscribedTopic, topic)) {
            for (const handler of topicHandlers) {
              try {
                handler(topic, payload);
              } catch (err) {
                this.logger.error(`MQTT handler error for ${topic}: ${err}`);
              }
            }
          }
        }
      });

      this.client.on('error', (err) => {
        this.connected = false;
        this.logger.error('MQTT connection error', err);
      });

      this.client.on('offline', () => {
        this.connected = false;
        this.logger.warn('MQTT client offline');
      });
    } catch (err) {
      this.logger.error('Failed to connect MQTT', err);
    }
  }

  private matchTopic(pattern: string, topic: string): boolean {
    if (pattern === topic) return true;
    if (pattern.includes('#')) {
      const prefix = pattern.replace('#', '');
      return topic.startsWith(prefix);
    }
    if (pattern.includes('+')) {
      const patternParts = pattern.split('/');
      const topicParts = topic.split('/');
      if (patternParts.length !== topicParts.length) return false;
      return patternParts.every(
        (p, i) => p === '+' || p === topicParts[i],
      );
    }
    return false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  publish(
    topic: string,
    payload: Record<string, unknown> | string,
    qos: 0 | 1 | 2 = 1,
  ): void {
    if (!this.client || !this.connected) {
      this.logger.warn(`MQTT not connected, cannot publish to ${topic}`);
      return;
    }
    const data =
      typeof payload === 'string' ? payload : JSON.stringify(payload);
    this.client.publish(topic, data, { qos }, (err) => {
      if (err) {
        this.logger.error(`Failed to publish to ${topic}: ${err}`);
      }
    });
  }

  subscribe(
    topic: string,
    handler: MqttMessageHandler,
  ): void {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, []);
      this.client?.subscribe(topic);
    }
    this.subscriptions.get(topic)!.push(handler);
  }

  unsubscribe(topic: string): void {
    this.subscriptions.delete(topic);
    this.client?.unsubscribe(topic);
  }

  async publishAndWaitForAck(
    topic: string,
    payload: Record<string, unknown>,
    ackTopic: string,
    timeoutMs = 3000,
  ): Promise<{ success: boolean; response?: unknown }> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve({ success: false });
      }, timeoutMs);

      const handler = (_t: string, payload: Buffer) => {
        clearTimeout(timer);
        this.unsubscribe(ackTopic);
        try {
          resolve({ success: true, response: JSON.parse(payload.toString()) });
        } catch {
          resolve({ success: true, response: payload.toString() });
        }
      };

      this.subscribe(ackTopic, handler);
      this.publish(topic, payload);
    });
  }

  async onModuleDestroy() {
    this.client?.end(true);
  }
}
