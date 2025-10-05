import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { validateEnv, apiEnvSchema } from '@shorly/config';

async function bootstrap() {
  // Validate environment variables
  const env = validateEnv(apiEnvSchema);

  const app = await NestFactory.create(AppModule);

  // Global prefix for all API routes
  app.setGlobalPrefix(env.API_PREFIX);

  // CORS
  app.enableCors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('shorly API')
    .setDescription('Global, multilingual link and OneLink management platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(env.PORT);

  console.log(`🚀 shorly API running on: http://localhost:${env.PORT}${env.API_PREFIX}`);
  console.log(`📚 API Documentation: http://localhost:${env.PORT}/docs`);
}

bootstrap();
