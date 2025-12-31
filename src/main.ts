import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// Updated: date_overrides FK constraint fixed - Dec 3, 2025
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS - Must be configured before helmet
  const allowedOrigins: string[] = [
    'http://localhost:4000',
    'http://192.168.10.153:4000', // Local network access
    'https://athena-front-beta.vercel.app',
    'https://athena-ai.pro',
    'https://www.athena-ai.pro',
    process.env.CORS_ORIGIN,
  ].filter((origin): origin is string => Boolean(origin));

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Security - Configure helmet to not interfere with CORS
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Athena AI API')
    .setDescription(
      'Athena AI backend (v1) – agents, RAG, payments, sessions, and more.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management')
    .addTag('Creators', 'Creator profiles')
    .addTag('Agents', 'AI Agent management')
    .addTag('Documents', 'Document upload and management')
    .addTag('RAG', 'Retrieval Augmented Generation')
    .addTag('Conversations', 'Chat and conversations')
    .addTag('Payments', 'Payment and subscriptions')
    .addTag('Sessions', 'Live session booking')
    .addTag('Admin', 'Admin operations')
    .addTag('Health', 'Health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0'); // Listen on all network interfaces

  console.log(`🚀 Athena API is running on:`);
  console.log(`   - Local:   http://localhost:${port}/api`);
  console.log(`   - Network: http://192.168.10.153:${port}/api`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/docs`);
}

void bootstrap();
