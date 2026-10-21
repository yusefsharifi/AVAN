import { LoggerService, Logger } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

// ═══════════════════════════════════════════════════════════════════════════
// Request Context (correlation ID, user ID, etc.)
// ═══════════════════════════════════════════════════════════════════════════

export interface RequestContext {
  correlationId: string;
  userId?: string;
  zoneId?: string;
  companyId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  path?: string;
  startTime?: number;
  responseTimeMs?: number;
}

// AsyncLocalStorage for request-scoped context
export const requestContext = new AsyncLocalStorage<RequestContext>();

// ═══════════════════════════════════════════════════════════════════════════
// Structured Log Entry
// ═══════════════════════════════════════════════════════════════════════════

export interface StructuredLogEntry {
  timestamp: string;
  level: string;
  context: string;
  message: string;
  correlationId?: string;
  userId?: string;
  zoneId?: string;
  companyId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  responseTimeMs?: number;
  ip?: string;
  userAgent?: string;
  error?: string;
  stack?: string;
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Structured Logger
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Structured logger that outputs JSON-formatted logs with correlation IDs.
 * Each log entry includes:
 * - timestamp (ISO 8601)
 * - level (INFO, WARN, ERROR, DEBUG)
 * - context (class/method name)
 * - correlationId (from AsyncLocalStorage)
 * - request metadata (user, zone, IP, path, etc.)
 */
export class StructuredLogger {
  private readonly logger: Logger;
  private readonly contextName: string;

  constructor(context: string) {
    this.logger = new Logger(context);
    this.contextName = context;
  }

  /**
   * Get current request context from AsyncLocalStorage
   */
  private getContext(): RequestContext | undefined {
    return requestContext.getStore();
  }

  /**
   * Build a structured log entry
   */
  private buildEntry(
    level: string,
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>,
  ): StructuredLogEntry {
    const ctx = this.getContext();
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.contextName || 'Unknown',
      message,
    };

    if (ctx) {
      entry.correlationId = ctx.correlationId;
      entry.userId = ctx.userId;
      entry.zoneId = ctx.zoneId;
      entry.companyId = ctx.companyId;
      entry.method = ctx.method;
      entry.path = ctx.path;
      entry.ip = ctx.ip;
      entry.userAgent = ctx.userAgent;
    }

    if (error) {
      entry.error = error.message;
      entry.stack = error.stack;
    }

    if (metadata) {
      entry.metadata = metadata;
    }

    return entry;
  }

  /**
   * Output structured log as JSON (production) or formatted string (development)
   */
  private output(entry: StructuredLogEntry): void {
    if (process.env.NODE_ENV === 'production') {
      // Production: structured JSON output for log aggregation
      console.log(JSON.stringify(entry));
    } else {
      // Development: human-readable format
      const prefix = entry.correlationId ? `[${entry.correlationId.slice(0, 8)}]` : '';
      const suffix = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : '';
      const errorSuffix = entry.error ? ` error="${entry.error}"` : '';

      switch (entry.level) {
        case 'ERROR':
          this.logger.error(`${prefix} ${entry.message}${errorSuffix}${suffix}`);
          break;
        case 'WARN':
          this.logger.warn(`${prefix} ${entry.message}${suffix}`);
          break;
        case 'DEBUG':
          this.logger.debug(`${prefix} ${entry.message}${suffix}`);
          break;
        default:
          this.logger.log(`${prefix} ${entry.message}${suffix}` as any);
      }
    }
  }

  /**
   * Log an informational event
   */
  info(message: string, metadata?: Record<string, unknown>): void {
    const entry = this.buildEntry('INFO', message, undefined, metadata);
    this.output(entry);
  }

  /**
   * Log a warning event
   */
  warn(message: string, metadata?: Record<string, unknown>): void {
    const entry = this.buildEntry('WARN', message, undefined, metadata);
    this.output(entry);
  }

  /**
   * Log an error event
   */
  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    const entry = this.buildEntry('ERROR', message, error, metadata);
    this.output(entry);
  }

  /**
   * Log a debug event
   */
  debug(message: string, metadata?: Record<string, unknown>): void {
    const entry = this.buildEntry('DEBUG', message, undefined, metadata);
    this.output(entry);
  }

  /**
   * Log an HTTP request/response event
   */
  http(
    method: string,
    path: string,
    statusCode: number,
    responseTimeMs: number,
    metadata?: Record<string, unknown>,
  ): void {
    const entry = this.buildEntry('HTTP', `${method} ${path} ${statusCode}`, undefined, {
      ...metadata,
      method,
      path,
      statusCode,
      responseTimeMs,
    });

    const ctx = this.getContext();
    if (ctx) {
      entry.correlationId = ctx.correlationId;
      entry.userId = ctx.userId;
      entry.ip = ctx.ip;
    }

    this.output(entry);
  }

  /**
   * Log a security event (auth failures, permission denied, etc.)
   */
  security(message: string, metadata?: Record<string, unknown>): void {
    const entry = this.buildEntry('SECURITY', message, undefined, metadata);
    this.output(entry);
  }

  /**
   * Log an audit event (data changes, business operations)
   */
  audit(message: string, metadata?: Record<string, unknown>): void {
    const entry = this.buildEntry('AUDIT', message, undefined, metadata);
    this.output(entry);
  }
}
