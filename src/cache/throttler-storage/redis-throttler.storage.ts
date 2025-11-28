import { Injectable, Inject } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import type Redis from 'ioredis';

/**
 * Интерфейс записи хранилища throttler
 */
interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/**
 * Redis storage для Throttler
 * Обеспечивает распределенный rate limiting при масштабировании
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    _throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const ttlSeconds = Math.ceil(ttl / 1000);
    const blockKey = `${key}:blocked`;

    // Проверяем, заблокирован ли ключ
    const isBlocked = await this.redis.exists(blockKey);
    if (isBlocked) {
      const timeToBlockExpire = await this.redis.ttl(blockKey);
      const totalHits = parseInt((await this.redis.get(key)) || '0', 10);
      return {
        totalHits,
        timeToExpire: ttlSeconds,
        isBlocked: true,
        timeToBlockExpire,
      };
    }

    // Увеличиваем счетчик
    const totalHits = await this.redis.incr(key);

    // Устанавливаем TTL при первом запросе
    if (totalHits === 1) {
      await this.redis.expire(key, ttlSeconds);
    }

    const timeToExpire = await this.redis.ttl(key);

    // Блокируем, если превышен лимит
    if (totalHits > limit) {
      await this.redis.setex(
        blockKey,
        Math.ceil(blockDuration / 1000),
        '1',
      );
      return {
        totalHits,
        timeToExpire,
        isBlocked: true,
        timeToBlockExpire: Math.ceil(blockDuration / 1000),
      };
    }

    return {
      totalHits,
      timeToExpire,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }
}

