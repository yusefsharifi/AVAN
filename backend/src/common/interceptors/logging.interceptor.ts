import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { requestContext } from '../logger/structured-logger';

// ═══════════════════════════════════════════════════════════════════════════
// Logging Interceptor
// ═══════════════════════════════════════════════════════════════════════════
//
// Logs every HTTP request/response with:
// - Correlation ID
// - Response time
// - Status code
// - User context (if authenticated)
//
// Performance warnings for slow requests (>1s)
//

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('LoggingInterceptor');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    const method = request.method;
    const path = request.path;
    const ctx = requestContext.getStore();
    const correlationId = ctx?.correlationId?.slice(0, 8) || '--------';

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTimeMs = Date.now() - startTime;
          const statusCode = response.statusCode;

          // Log with context
          const logMessage = `${method} ${path} ${statusCode} ${responseTimeMs}ms [${correlationId}]`;

          if (responseTimeMs > 1000) {
            // Slow request warning
            this.logger.warn(`${logMessage} SLOW`);
          } else if (responseTimeMs > 500) {
            // Moderate request
            this.logger.log(`${logMessage}`);
          } else {
            // Fast request — debug level
            this.logger.debug(`${logMessage}`);
          }

          // Store response time for metrics
          if (ctx) {
            ctx.responseTimeMs = responseTimeMs;
          }
        },
        error: (error: Error) => {
          const responseTimeMs = Date.now() - startTime;
          const statusCode = response.statusCode || 500;

          this.logger.error(
            `${method} ${path} ${statusCode} ${responseTimeMs}ms [${correlationId}] ERROR: ${error.message}`,
          );
        },
      }),
    );
  }
}
