import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';

/**
 * Корректно закрывает приложение и все соединения (Redis, TypeORM)
 */
export async function closeApp(app: INestApplication): Promise<void> {
  if (!app) {
    return;
  }

  try {
    // Получаем DataSource для закрытия TypeORM соединения
    const dataSource = app.get(DataSource, { strict: false });
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  } catch {
    // Игнорируем ошибки, если DataSource не найден
  }

  try {
    // Получаем Redis клиент для закрытия соединения
    const redisClient = app.get<Redis>('REDIS_CLIENT', { strict: false });
    if (redisClient && redisClient.status !== 'end') {
      await redisClient.quit();
    }
  } catch {
    // Игнорируем ошибки, если Redis клиент не найден
  }

  // Закрываем само приложение
  await app.close();

  // Даем время на полное закрытие всех соединений
  await new Promise(resolve => setTimeout(resolve, 100));
}

