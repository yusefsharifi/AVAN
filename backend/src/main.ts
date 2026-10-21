import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { csrfProtection } from './common/middleware/csrf.middleware';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Disable default NestJS logger — use structured logging
    logger: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['error', 'warn', 'log', 'debug'],
  });

  // PHASE 15: Observability — Request ID middleware (must be first)
  const requestIdMiddleware = new RequestIdMiddleware();
  app.use(requestIdMiddleware.use.bind(requestIdMiddleware));

  // PHASE 15: Observability — Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Security
  app.use(helmet());
  // TRUST-PROXY (BUG-PERSIST-001): nginx terminates TLS and forwards to
  // backend:3000, so Express must honour X-Forwarded-* for req.ip / req.secure
  // (used for the Secure flag on the refresh cookie).
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // BIGINT SERIALIZATION (BUG-PERSIST-002): ~150 monetary columns are mapped to
  // Prisma BigInt (e.g. Employee.baseSalary, Invoice.grandTotal, Bid.unitPrice).
  // JSON.stringify throws "Do not know how to serialize a BigInt", so every
  // create/read touching those models returned 500 *after* the row was written —
  // the UI rolled the optimistic update back and the data "vanished" on refresh.
  // Express honours the `json replacer` app setting; the frontend declares these
  // fields as `number`, so coerce to Number to preserve the existing contract.
  app
    .getHttpAdapter()
    .getInstance()
    .set('json replacer', (_key: string, value: unknown) =>
      typeof value === 'bigint' ? Number(value) : value,
    );
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
    credentials: true,
  });

  // CSRF (BUG-PERSIST-001): double-submit validation for cookie-authenticated
  // requests (i.e. those carrying the /api/v1/auth refresh cookie). Bearer-only
  // traffic is unaffected. Registered after CORS, before the routes.
  app.use(csrfProtection);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // SECURITY FIX (SEC-013): Only expose Swagger in development
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('آوان API')
      .setDescription('سامانه یکپارچه مدیریت شهرک‌های صنعتی آوان (AVAN)')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // SECURITY FIX (CONFIG-001): Validate that JWT secrets are configured
  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!jwtAccessSecret || jwtAccessSecret.includes('your-') || jwtAccessSecret.length < 32) {
    console.error('SECURITY WARNING: JWT_ACCESS_SECRET is not properly configured. Using a placeholder secret is insecure.');
    if (process.env.NODE_ENV === 'production') {
      console.error('FATAL: Refusing to start with insecure JWT_ACCESS_SECRET in production.');
      process.exit(1);
    }
  }
  if (!jwtRefreshSecret || jwtRefreshSecret.includes('your-') || jwtRefreshSecret.length < 32) {
    console.error('SECURITY WARNING: JWT_REFRESH_SECRET is not properly configured. Using a placeholder secret is insecure.');
    if (process.env.NODE_ENV === 'production') {
      console.error('FATAL: Refusing to start with insecure JWT_REFRESH_SECRET in production.');
      process.exit(1);
    }
  }

  // COMP-005: Validate SMS provider configuration
  const kavenegarKey = process.env.KAVENEGAR_API_KEY;
  const melipayamakUser = process.env.MELIPAYAMAK_USERNAME;
  if (!kavenegarKey && !melipayamakUser) {
    console.warn('COMP-005 WARNING: No SMS providers configured (KAVENEGAR_API_KEY and MELIPAYAMAK_USERNAME are both empty). OTP delivery via SMS will fail.');
    if (process.env.NODE_ENV === 'production') {
      console.error('FATAL: Refusing to start in production without at least one SMS provider configured. Set KAVENEGAR_API_KEY or MELIPAYAMAK_USERNAME.');
      process.exit(1);
    }
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);

  // PHASE 15: Structured startup logging
  const startupLog = {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    context: 'Bootstrap',
    message: `AVAN Backend running on port ${port}`,
    environment: process.env.NODE_ENV || 'development',
    port,
    swagger: process.env.NODE_ENV !== 'production' ? `http://localhost:${port}/api/docs` : undefined,
  };
  console.log(JSON.stringify(startupLog));
}
bootstrap();
