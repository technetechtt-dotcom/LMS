import './config/direct-url';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser = require('cookie-parser');
import helmet from 'helmet';
import type { Express, NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { enforceMultipartRequestSize } from './common/quarantine-upload';
import { randomUUID } from 'crypto';
import { telemetry } from './common/telemetry';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  const config = app.get(ConfigService);
  const nodeEnv =
    typeof process.env.NODE_ENV === 'string' ? process.env.NODE_ENV : 'development';

  const expressApp = app.getHttpAdapter().getInstance() as Express;
  expressApp.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  const rawOrigins = [
    config.get<string>('FRONTEND_ORIGIN'),
    config.get<string>('OPS_ORIGIN'),
  ]
    .filter(Boolean)
    .join(',');
  const origins = (rawOrigins ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (nodeEnv === 'production' && origins.length === 0) {
    throw new Error('FRONTEND_ORIGIN must be set in production (comma-separated)');
  }

  app.use(cookieParser());
  app.use((req: Request, res: Response, next: NextFunction) => {
    const supplied = req.headers['x-request-id'] ?? req.headers['x-correlation-id'];
    const candidate = Array.isArray(supplied) ? supplied[0] : supplied;
    const requestId = typeof candidate === 'string' && /^[a-zA-Z0-9._:-]{8,128}$/.test(candidate)
      ? candidate
      : randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-Id', requestId);
    const started = process.hrtime.bigint();
    res.once('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000;
      telemetry.observe(req.method, res.statusCode, durationMs);
      process.stdout.write(`${JSON.stringify({
        level: 'info',
        event: 'http_request',
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
        revision: config.get<string>('APP_VERSION')
          || config.get<string>('RENDER_GIT_COMMIT')
          || 'development',
      })}\n`);
    });
    next();
  });
  app.use((req: Request, _res: Response, next: NextFunction) => {
    try {
      enforceMultipartRequestSize(
        req.headers['content-type'],
        req.headers['content-length'],
      );
      next();
    } catch (error) {
      next(error);
    }
  });

  app.enableCors({
    origin: nodeEnv === 'production' ? origins : true,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Organisation-Id',
      'X-Auth-Portal',
      'X-Org-Id',
      'X-Tenant-ID',
      'X-Correlation-Id',
      'X-Request-Id',
      'traceparent',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (nodeEnv !== 'production') {
    const swagger = new DocumentBuilder()
      .setTitle('LMS API')
      .setDescription('SETA/SAQA/DHET-aligned LMS backend')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));
  }

  const port = config.get<number>('PORT', 8787);
  await app.listen(port, '0.0.0.0');
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
