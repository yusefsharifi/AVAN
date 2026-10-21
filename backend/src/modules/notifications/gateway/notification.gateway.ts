import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RedisService } from '../../../redis/redis.service';
import { REDIS_KEYS } from '../../../common/utils/redis-keys';

interface JwtPayload {
  sub: string;
  role: string;
  zoneId?: string;
  companyId?: string;
  type: 'access' | 'refresh';
  jti: string;
}

interface AuthenticatedSocket extends Socket {
  userId?: string;
  zoneId?: string;
  companyId?: string;
  role?: string;
  jti?: string;
}

// ─── RATE LIMIT CONFIGURATION ────────────────────────────────────────────────
const RATE_LIMITS = {
  // Connection rate limits (per IP)
  CONNECTIONS_PER_IP: { max: 20, windowSeconds: 60 },

  // Message rate limits (per user)
  MESSAGES_PER_USER: { max: 100, windowSeconds: 60 },

  // Event-specific rate limits (per user, stricter)
  EVENTS: {
    'notification:read':    { max: 30, windowSeconds: 60 },
    'notification:readAll': { max: 5,  windowSeconds: 60 },
    'notification:dismiss': { max: 30, windowSeconds: 60 },
    'subscribe':            { max: 10, windowSeconds: 60 },
    'unsubscribe':          { max: 10, windowSeconds: 60 },
  },

  // Violation thresholds
  MAX_VIOLATIONS_BEFORE_DISCONNECT: 5,
  VIOLATION_WINDOW_SECONDS: 300, // 5 minutes
};

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;
  private readonly logger = new Logger(NotificationGateway.name);

  // Track online users: userId → Set<socketId>
  private onlineUsers = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.registerEventListeners();
  }

  // ─── CONNECTION LIFECYCLE ───────────────────────────────────────────────

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    const ip = this.getClientIp(client);

    // 1. Rate limit connections per IP
    const connKey = `ws:rate:conn:${ip}`;
    const connCount = await this.redis.incrWithExpiry(connKey, RATE_LIMITS.CONNECTIONS_PER_IP.windowSeconds);
    if (connCount > RATE_LIMITS.CONNECTIONS_PER_IP.max) {
      this.logger.warn(`Connection rate limit exceeded for IP ${ip} (${connCount})`);
      client.emit('error', { message: 'Connection rate limit exceeded' });
      client.disconnect();
      return;
    }

    try {
      // Extract token from handshake auth or query
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token as string;

      if (!token) {
        client.emit('auth:error', { message: 'Token required' });
        client.disconnect();
        return;
      }

      // Verify JWT
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      });

      if (payload.type !== 'access') {
        client.emit('auth:error', { message: 'Invalid token type' });
        client.disconnect();
        return;
      }

      // Check if token is blacklisted
      const isBlacklisted = await this.redis.exists(
        REDIS_KEYS.authBlacklist(payload.jti),
      );
      if (isBlacklisted) {
        client.emit('auth:error', { message: 'Token revoked' });
        client.disconnect();
        return;
      }

      // Attach user info to socket
      client.userId = payload.sub;
      client.zoneId = payload.zoneId;
      client.companyId = payload.companyId;
      client.role = payload.role;
      client.jti = payload.jti;

      // Join user-specific room
      client.join(`user:${payload.sub}`);

      // Join zone room if provided
      if (payload.zoneId) {
        client.join(`zone:${payload.zoneId}`);
      }

      // Join company room if provided
      if (payload.companyId) {
        client.join(`company:${payload.companyId}`);
      }

      // Join role-based room
      if (payload.role) {
        client.join(`role:${payload.role}`);
      }

      // Track online status
      if (!this.onlineUsers.has(payload.sub)) {
        this.onlineUsers.set(payload.sub, new Set());
      }
      this.onlineUsers.get(payload.sub)!.add(client.id);

      // Store online status in Redis for cross-instance awareness
      await this.redis.set(`notif:online:${payload.sub}`, '1', 300);

      client.emit('auth:success', {
        userId: payload.sub,
        socketId: client.id,
        zoneId: payload.zoneId,
        role: payload.role,
      });

      this.logger.log(`User ${payload.sub} (${payload.role}) authenticated on /notifications`);
    } catch (err: any) {
      this.logger.warn(`Connection rejected: ${err.message}`);
      client.emit('auth:error', { message: 'Invalid or expired token' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
    if (client.userId) {
      const sockets = this.onlineUsers.get(client.userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.onlineUsers.delete(client.userId);
          this.redis.del(`notif:online:${client.userId}`).catch(() => {});
        }
      }
    }
  }

  // ─── CLIENT MESSAGES ────────────────────────────────────────────────────

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channels?: string[] },
  ): Promise<void> {
    if (!client.userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Rate limit
    if (!await this.checkEventRateLimit(client, 'subscribe')) return;

    const channels = data.channels || ['inbox', 'unread'];
    for (const channel of channels) {
      client.join(`user:${client.userId}:${channel}`);
    }

    client.emit('subscribed', { channels });
  }

  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channels?: string[] },
  ): Promise<void> {
    if (!client.userId) return;

    if (!await this.checkEventRateLimit(client, 'unsubscribe')) return;

    const channels = data.channels || ['inbox', 'unread'];
    for (const channel of channels) {
      client.leave(`user:${client.userId}:${channel}`);
    }

    client.emit('unsubscribed', { channels });
  }

  @SubscribeMessage('notification:read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { deliveryId: string },
  ): Promise<void> {
    if (!client.userId) return;

    if (!await this.checkEventRateLimit(client, 'notification:read')) return;

    this.eventEmitter.emit('notification.socket.markRead', {
      deliveryId: data.deliveryId,
      userId: client.userId,
    });
  }

  @SubscribeMessage('notification:readAll')
  async handleMarkAllRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { module?: string },
  ): Promise<void> {
    if (!client.userId) return;

    if (!await this.checkEventRateLimit(client, 'notification:readAll')) return;

    this.eventEmitter.emit('notification.socket.markAllRead', {
      userId: client.userId,
      zoneId: client.zoneId,
      module: data.module,
    });
  }

  @SubscribeMessage('notification:dismiss')
  async handleDismiss(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { deliveryId: string },
  ): Promise<void> {
    if (!client.userId) return;

    if (!await this.checkEventRateLimit(client, 'notification:dismiss')) return;

    this.eventEmitter.emit('notification.socket.dismiss', {
      deliveryId: data.deliveryId,
      userId: client.userId,
    });
  }

  // ─── RATE LIMITING ──────────────────────────────────────────────────────

  private async checkEventRateLimit(
    client: AuthenticatedSocket,
    eventName: string,
  ): Promise<boolean> {
    if (!client.userId) return false;

    // 1. Check general message rate
    const msgKey = `ws:rate:msg:${client.userId}`;
    const msgCount = await this.redis.incrWithExpiry(msgKey, RATE_LIMITS.MESSAGES_PER_USER.windowSeconds);
    if (msgCount > RATE_LIMITS.MESSAGES_PER_USER.max) {
      await this.handleRateLimitViolation(client, 'message_rate', `Message rate limit: ${msgCount}/${RATE_LIMITS.MESSAGES_PER_USER.max}`);
      return false;
    }

    // 2. Check event-specific rate
    const eventLimit = RATE_LIMITS.EVENTS[eventName as keyof typeof RATE_LIMITS.EVENTS];
    if (eventLimit) {
      const eventKey = `ws:rate:evt:${client.userId}:${eventName}`;
      const eventCount = await this.redis.incrWithExpiry(eventKey, eventLimit.windowSeconds);
      if (eventCount > eventLimit.max) {
        await this.handleRateLimitViolation(client, 'event_rate', `${eventName} rate limit: ${eventCount}/${eventLimit.max}`);
        return false;
      }
    }

    return true;
  }

  private async handleRateLimitViolation(
    client: AuthenticatedSocket,
    type: string,
    detail: string,
  ): Promise<void> {
    if (!client.userId) return;

    // Track violations
    const violationKey = `ws:rate:violations:${client.userId}`;
    const violations = await this.redis.incrWithExpiry(violationKey, RATE_LIMITS.VIOLATION_WINDOW_SECONDS);

    this.logger.warn(
      `Rate limit violation [${type}] for user ${client.userId}: ${detail} (total: ${violations})`,
    );

    // Emit rate limit warning to client
    client.emit('rate_limit', {
      type,
      message: `Rate limit exceeded: ${type}`,
      retryAfter: RATE_LIMITS.MESSAGES_PER_USER.windowSeconds,
    });

    // Disconnect if too many violations
    if (violations >= RATE_LIMITS.MAX_VIOLATIONS_BEFORE_DISCONNECT) {
      this.logger.warn(
        `Disconnecting user ${client.userId} for ${violations} rate limit violations`,
      );
      client.emit('auth:error', { message: 'Too many rate limit violations' });
      client.disconnect();

      // Track disconnect for monitoring
      await this.redis.set(
        `ws:rate:disconnect:${client.userId}`,
        JSON.stringify({ violations, timestamp: Date.now() }),
        RATE_LIMITS.VIOLATION_WINDOW_SECONDS,
      );
    }
  }

  // ─── EVENT LISTENERS ────────────────────────────────────────────────────

  private registerEventListeners(): void {
    this.eventEmitter.on('notification.socket.new', (data: { userId: string; notification: any }) => {
      this.emitToUser(data.userId, 'notification:new', data.notification);
      this.incrementUnreadCount(data.userId);
    });

    this.eventEmitter.on('notification.socket.unread', (data: { userId: string; total: number }) => {
      this.emitToUser(data.userId, 'notification:unread', { total: data.total });
    });

    this.eventEmitter.on('notification.socket.markRead', (data: { deliveryId: string; userId: string }) => {
      this.emitToUser(data.userId, 'notification:read', { deliveryId: data.deliveryId });
      this.decrementUnreadCount(data.userId);
    });
  }

  // ─── EMIT METHODS ───────────────────────────────────────────────────────

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }

  emitToZone(zoneId: string, event: string, payload: unknown): void {
    this.server?.to(`zone:${zoneId}`).emit(event, payload);
  }

  emitToCompany(companyId: string, event: string, payload: unknown): void {
    this.server?.to(`company:${companyId}`).emit(event, payload);
  }

  emitToRole(role: string, event: string, payload: unknown): void {
    this.server?.to(`role:${role}`).emit(event, payload);
  }

  emitToAll(event: string, payload: unknown): void {
    this.server?.emit(event, payload);
  }

  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId) && this.onlineUsers.get(userId)!.size > 0;
  }

  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers.keys());
  }

  getOnlineCount(): number {
    return this.onlineUsers.size;
  }

  getUserSocketCount(userId: string): number {
    return this.onlineUsers.get(userId)?.size || 0;
  }

  // ─── PRIVATE HELPERS ────────────────────────────────────────────────────

  private getClientIp(client: Socket): string {
    return (
      (client.handshake.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      client.handshake.address ||
      'unknown'
    );
  }

  private async incrementUnreadCount(userId: string): Promise<void> {
    const cacheKey = REDIS_KEYS.notifUnread(userId);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      const data = JSON.parse(cached);
      data.total = (data.total || 0) + 1;
      await this.redis.set(cacheKey, JSON.stringify(data), 30);
      this.emitToUser(userId, 'notification:unread', { total: data.total });
    }
  }

  private async decrementUnreadCount(userId: string): Promise<void> {
    const cacheKey = REDIS_KEYS.notifUnread(userId);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      const data = JSON.parse(cached);
      data.total = Math.max(0, (data.total || 0) - 1);
      await this.redis.set(cacheKey, JSON.stringify(data), 30);
      this.emitToUser(userId, 'notification:unread', { total: data.total });
    }
  }
}
