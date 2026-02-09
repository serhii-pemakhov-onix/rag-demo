import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters';
import { ResponseInterceptor } from './common/interceptors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global prefix
  app.setGlobalPrefix('api');

  // Cookie parser middleware
  app.use(cookieParser());

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global response interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger configuration
  const swaggerConfig = new DocumentBuilder()
    .setTitle('RAG Demo API')
    .setDescription('RAG Demo API with authentication, chat, and admin endpoints')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'access-token',
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('chat', 'Chat endpoints')
    .addTag('admin', 'Admin endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Custom sorting function for operations
  const operationsSorter = (
    a: { get: (key: string) => string },
    b: { get: (key: string) => string },
  ): number => {
    const order: Record<string, number> = { post: 0, get: 1, patch: 2, put: 3, delete: 4 };
    const aOrder = order[a.get('method')] ?? 99;
    const bOrder = order[b.get('method')] ?? 99;
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    const aPath = a.get('path') ?? '';
    const bPath = b.get('path') ?? '';
    const aBlocks = aPath.split('/').length;
    const bBlocks = bPath.split('/').length;
    if (aBlocks !== bBlocks) {
      return aBlocks > bBlocks ? 1 : -1;
    }
    return aPath > bPath ? 1 : -1;
  };

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter,
    },
  });

  // CORS configuration
  app.enableCors({
    origin: configService.get('FRONTEND_URL') || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = configService.get('PORT') || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api`);
  console.log(`Swagger docs available at: http://localhost:${port}/docs`);
}
bootstrap();
