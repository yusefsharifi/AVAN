import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { successResponse } from '../common/dto/response.dto';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Kept as a RAW 200 body on purpose — docker-compose healthchecks probe this
   * exact contract (`curl --fail /api/v1/health`). Do NOT wrap it in the
   * `{ success, data }` envelope; use GET /health/detailed for that.
   */
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'idop-backend',
    };
  }

  /**
   * BUG-PERSIST-004 (spec §C.4): envelope-aware health probe for the SPA. The
   * frontend boot sequence calls this to decide whether to show the persistent
   * "ارتباط با سرور برقرار نیست" banner, and it actually PINGS the database and
   * Redis instead of returning a hardcoded 'ok' — so a downed dependency is
   * reported as degraded rather than silently passing.
   */
  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check (DB + Redis ping, standard envelope)' })
  async detailed() {
    const [database, redis] = await Promise.all([this.pingDatabase(), this.pingRedis()]);
    const healthy = database.status === 'up' && redis.status === 'up';

    return successResponse({
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'idop-backend',
      checks: { database, redis },
    });
  }

  private async pingDatabase(): Promise<{ status: 'up' | 'down'; latencyMs: number | null }> {
    const started = Date.now();
    try {
      // Round-trips the real connection pool rather than trusting a cached flag.
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up', latencyMs: Date.now() - started };
    } catch {
      return { status: 'down', latencyMs: null };
    }
  }

  private async pingRedis(): Promise<{ status: 'up' | 'down'; latencyMs: number | null }> {
    const started = Date.now();
    try {
      await this.redis.set('_health:detailed', '1', 5);
      return { status: 'up', latencyMs: Date.now() - started };
    } catch {
      return { status: 'down', latencyMs: null };
    }
  }
}
