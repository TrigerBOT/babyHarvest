import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

/**
 * Сервис для работы с кэшем
 * Предоставляет удобные методы для кэширования данных
 */
@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Получить значение из кэша
   */
  async get<T>(key: string): Promise<T | undefined> {
    const value = await this.cacheManager.get<T>(key);
    return value ?? undefined;
  }

  /**
   * Установить значение в кэш
   * @param key - ключ
   * @param value - значение
   * @param ttl - время жизни в секундах (опционально)
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (ttl) {
      await this.cacheManager.set(key, value, ttl * 1000); // конвертируем в миллисекунды
    } else {
      await this.cacheManager.set(key, value);
    }
  }

  /**
   * Удалить значение из кэша
   */
  async delete(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  /**
   * Получить или установить значение (cache-aside pattern)
   * Если значение отсутствует, выполняется функция и результат кэшируется
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Инвалидировать ключи по паттерну (требует прямого доступа к Redis)
   * Для production лучше использовать отдельный метод с Redis клиентом
   */
  async invalidatePattern(_pattern: string): Promise<void> {
    // Это упрощенная версия, для полной реализации нужен прямой доступ к Redis
    // В production используйте Redis SCAN для поиска ключей по паттерну
    throw new Error(
      'invalidatePattern requires direct Redis access. Use Redis client directly.',
    );
  }
}

