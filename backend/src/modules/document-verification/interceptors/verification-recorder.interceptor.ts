// ═══════════════════════════════════════════════════════════════════════════════
// M22: Verification Recorder Interceptor
// Records every verification attempt asynchronously
// ═══════════════════════════════════════════════════════════════════════════════

import { Injectable, Logger, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../../prisma/prisma.service';
import { detectPlatform } from '../utils/privacy-rules';

@Injectable()
export class VerificationRecorderInterceptor implements NestInterceptor {
  private readonly logger = new Logger(VerificationRecorderInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(async (response) => {
        const responseMs = Date.now() - startTime;
        const sessionId = request.cookies?.verify_session || request.headers?.['x-verify-session'] || 'unknown';
        const ipAddress = request.ip || request.connection?.remoteAddress || '0.0.0.0';
        const userAgent = request.headers?.['user-agent'] || '';
        const referer = request.headers?.['referer'] || '';
        const language = request.query?.lang || request.body?.language || 'fa';

        // Extract verification data from response
        const documentType = response?.documentType || 'LETTER';
        const qrHash = request.params?.hash || request.body?.qrHash || null;
        const documentNumber = request.body?.documentNumber || null;
        const result = response?.result || 'NOT_FOUND';

        // Fire-and-forget recording
        this.recordVerification({
          sessionId,
          ipAddress,
          userAgent,
          referer,
          documentType,
          qrHash,
          documentNumber,
          result,
          responseData: response?.data || {},
          responseMs,
          language,
          platform: detectPlatform(userAgent),
        }).catch((err) => {
          this.logger.debug('Async verification recording failed', err);
        });
      }),
    );
  }

  private async recordVerification(data: {
    sessionId: string;
    ipAddress: string;
    userAgent: string;
    referer: string;
    documentType: string;
    qrHash: string | null;
    documentNumber: string | null;
    result: string;
    responseData: unknown;
    responseMs: number;
    language: string;
    platform: string;
  }): Promise<void> {
    try {
      await this.prisma.verificationRecord.create({
        data: {
          sessionId: data.sessionId,
          documentType: data.documentType as never,
          qrHash: data.qrHash,
          documentNumber: data.documentNumber,
          result: data.result as never,
          resultCode: data.result,
          responseData: data.responseData as never,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          referer: data.referer,
          language: data.language,
          platform: data.platform,
          responseMs: data.responseMs,
        },
      });
    } catch {
      // Silent fail for recording
    }
  }
}
