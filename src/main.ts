import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Валидация данных
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Глобальный exception filter для единого формата ошибок { success: false, error: ... }
  app.useGlobalFilters(new HttpExceptionFilter());

  // Глобальный interceptor для трансформации ответов в единый формат { success: true, data: ... }
  app.useGlobalInterceptors(new TransformResponseInterceptor());

  // CORS настройки
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3001';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Функция для проверки origin
  const corsOriginFunction = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Разрешаем запросы без origin (например, Postman, мобильные приложения)
    if (!origin) {
      return callback(null, true);
    }

    // В development режиме разрешаем все localhost origins
    if (isDevelopment && origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }

    // Парсим список разрешенных origins из переменной окружения
    const allowedOrigins = corsOrigin.split(',').map(o => o.trim());
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  };

  app.enableCors({
    origin: corsOriginFunction,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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
