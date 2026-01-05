import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';
import { RedisModule } from './redis.module';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    RedisModule,
    NestCacheModule.registerAsync({
      imports: [ConfigModule, RedisModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        const redisPassword = configService.get<string>('REDIS_PASSWORD');

        // Формируем Redis URL
        const redisUrl = redisPassword
          ? `redis://:${redisPassword}@${redisHost}:${redisPort}`
          : `redis://${redisHost}:${redisPort}`;

        // Создаем Keyv Redis store
        const redisStore = new KeyvRedis(redisUrl, {
          useRedisSets: false,
        });

        return {
          store: redisStore,
          ttl: configService.get<number>('CACHE_TTL', 3600) * 1000, // в миллисекундах
          isGlobal: true,
        };
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheService, NestCacheModule, RedisModule],
})
export class CacheModule {}

