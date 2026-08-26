import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  const config = app.get(ConfigService);
  const nodeEnv =
    typeof process.env.NODE_ENV === 'string' ? process.env.NODE_ENV : 'development';

  const rawOrigins = config.get<string>('FRONTEND_ORIGIN');
  const origins = (rawOrigins ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (nodeEnv === 'production' && origins.length === 0) {
    throw new Error('FRONTEND_ORIGIN must be set in production (comma-separated)');
  }

  app.use(cookieParser());

  app.enableCors({
    origin: nodeEnv === 'production' ? origins : true,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Organisation-Id',
      'X-Org-Id',
      'X-Tenant-ID',
      'X-Correlation-Id',
      'X-Request-Id',
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
  await app.listen(port);
}

bootstrap();
