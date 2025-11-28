import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Валидация данных
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // CORS настройки
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
  });

  // Swagger документация
  const config = new DocumentBuilder()
    .setTitle('REST API')
    .setDescription('NestJS REST API Template')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 API запущен на порту ${port}`);
  console.log(`📚 Swagger документация: http://localhost:${port}/docs`);
}

bootstrap();
