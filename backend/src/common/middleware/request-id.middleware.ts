import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { requestContext, RequestContext } from '../logger/structured-logger';

// ═══════════════════════════════════════════════════════════════════════════
// Request ID Middleware
// ═══════════════════════════════════════════════════════════════════════════
//
// Adds a correlation ID to every request for distributed tracing.
// - Uses X-Request-ID header if provided by client
// - Otherwise generates a new UUID
// - Sets X-Correlation-ID response header
// - Stores context in AsyncLocalStorage for downstream use
//

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RequestIdMiddleware');

  use(req: Request, res: Response, next: NextFunction): void {
    // Correlation ID: use client-provided or generate new
    const correlationId =
      (req.headers['x-correlation-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      crypto.randomUUID();

    // Response time tracking
    const startTime = Date.now();

    // Build request context
    const context: RequestContext = {
      correlationId,
      ip: req.ip || req.socket?.remoteAddress || '0.0.0.0',
      userAgent: req.headers['user-agent'] || '',
      method: req.method,
      path: req.path,
      startTime,
    };

    // Set correlation ID on response header
    res.setHeader('X-Correlation-ID', correlationId);

    // Log request
    this.logger.debug(`${req.method} ${req.path} started [${correlationId.slice(0, 8)}]`);

    // Run downstream handlers within the request context
    requestContext.run(context, () => {
      // Log response when finished
      res.on('finish', () => {
        const responseTimeMs = Date.now() - startTime;
        const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'log';

        const logData = {
          correlationId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          responseTimeMs,
          ip: context.ip,
          userAgent: context.userAgent,
        };

        if (logLevel === 'error') {
          this.logger.error(`${req.method} ${req.path} ${res.statusCode} ${responseTimeMs}ms [${correlationId.slice(0, 8)}]`);
        } else if (logLevel === 'warn') {
          this.logger.warn(`${req.method} ${req.path} ${res.statusCode} ${responseTimeMs}ms [${correlationId.slice(0, 8)}]`);
        } else {
          this.logger.log(`${req.method} ${req.path} ${res.statusCode} ${responseTimeMs}ms [${correlationId.slice(0, 8)}]`);
        }
      });

      next();
    });
  }
}
