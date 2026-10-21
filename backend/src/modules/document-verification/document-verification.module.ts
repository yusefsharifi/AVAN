// ═══════════════════════════════════════════════════════════════════════════════
// M22: Document Verification Portal Module
// ═══════════════════════════════════════════════════════════════════════════════

import { Module, Global, Logger } from '@nestjs/common';
import { VerificationService } from './services/verification.service';
import { VerificationRateLimiter } from './services/verification-rate-limiter.service';
import { VerificationController } from './controllers/verification.controller';
import { VerificationAdminController } from './controllers/verification-admin.controller';
import { VerificationRecorderInterceptor } from './interceptors/verification-recorder.interceptor';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';

const REDIS_TOKEN = 'REDIS_CLIENT';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [VerificationController, VerificationAdminController],
  providers: [
    VerificationService,
    VerificationRateLimiter,
    VerificationRecorderInterceptor,
    {
      provide: REDIS_TOKEN,
      useFactory: () => {
        try {
          // Lazy-require to avoid circular deps
          const Redis = require('ioredis');
          const host = process.env.REDIS_HOST || 'localhost';
          const port = parseInt(process.env.REDIS_PORT || '6379', 10);
          const password = process.env.REDIS_PASSWORD || undefined;
          const client = new Redis({
            host,
            port,
            password,
            maxRetriesPerRequest: 3,
            retryStrategy: (times: number) => Math.min(times * 50, 2000),
            lazyConnect: true,
          });
          client.connect().catch(() => {});
          return client;
        } catch {
          return null;
        }
      },
    },
    {
      provide: VerificationRateLimiter,
      inject: [REDIS_TOKEN],
      useFactory: (redis: unknown) => new VerificationRateLimiter(redis as never),
    },
    {
      provide: VerificationService,
      inject: [PrismaService, VerificationRateLimiter, REDIS_TOKEN],
      useFactory: (prisma: PrismaService, rateLimiter: unknown, redis: unknown) =>
        new VerificationService(prisma, rateLimiter as never, redis as never),
    },
  ],
  exports: [VerificationService, VerificationRateLimiter],
})
export class DocumentVerificationModule {
  private readonly logger = new Logger(DocumentVerificationModule.name);

  onModuleInit() {
    this.logger.log('M22: Document Verification Portal module initialized');
    this.logger.log('Public verification endpoints available at: /verify/*');
    this.logger.log('Admin endpoints available at: /api/v1/super/verification/*');
  }
}
