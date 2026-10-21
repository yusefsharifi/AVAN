// ═══════════════════════════════════════════════════════════════════════════════
// DeviceAuthGuard — SEC-002: IoT Device Authentication
// ═══════════════════════════════════════════════════════════════════════════════
//
// Authenticates IoT device ingestion requests using the X-Device-API-Key
// header. The API key is looked up against the IoTDevice.apiKey field in the
// database. On success, the device record is attached to the request object
// as `request.device`.
//
// Devices must have a non-null, non-empty apiKey set in the database for
// this guard to pass. Devices without an apiKey will be rejected.
//
// SECURITY (SEC-002): All IoT ingestion endpoints MUST use this guard.
// ═══════════════════════════════════════════════════════════════════════════════

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

const API_KEY_HEADER = 'x-device-api-key';
const CACHE_PREFIX = 'iot:device:apikey:';
const CACHE_TTL = 300; // 5 minutes

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  private readonly logger = new Logger(DeviceAuthGuard.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const apiKey = request.headers[API_KEY_HEADER] as string | undefined;

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      throw new UnauthorizedException('Missing or invalid device API key');
    }

    // Check Redis cache first
    const cacheKey = `${CACHE_PREFIX}${apiKey}`;
    const cachedDeviceId = await this.redis.get(cacheKey);

    let device: { id: string; zoneId: string; deviceId: string; isActive: boolean; type: string } | null = null;

    if (cachedDeviceId) {
      // Cache hit — fetch minimal device info
      device = await this.prisma.ioTDevice.findUnique({
        where: { id: cachedDeviceId },
        select: { id: true, zoneId: true, deviceId: true, isActive: true, type: true },
      });
    } else {
      // Cache miss — lookup by apiKey
      device = await this.prisma.ioTDevice.findFirst({
        where: { apiKey },
        select: { id: true, zoneId: true, deviceId: true, isActive: true, type: true },
      });

      if (device) {
        // Cache for 5 minutes
        await this.redis.set(cacheKey, device.id, CACHE_TTL);
      }
    }

    if (!device) {
      this.logger.warn(`IoT ingestion rejected: invalid API key from ${request.ip}`);
      throw new UnauthorizedException('Invalid device API key');
    }

    if (!device.isActive) {
      this.logger.warn(`IoT ingestion rejected: inactive device ${device.deviceId}`);
      throw new UnauthorizedException('Device is inactive');
    }

    // Attach device info to request for downstream use
    (request as any).device = device;

    return true;
  }
}
