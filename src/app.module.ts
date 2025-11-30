import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { RedisThrottlerStorage } from './cache/throttler-storage/redis-throttler.storage';
import { RedisModule } from './cache/redis.module';
import { PregnancyModule } from './pregnancy/pregnancy.module';
import { AchievementsModule } from './achievements/achievements.module';

@Module({
  imports: [
    // Конфигурация
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Redis модуль (должен быть загружен до ThrottlerModule)
    RedisModule,
    
    // Cache модуль (Redis-based)
    CacheModule,
    
    // Database (TypeORM)
    DatabaseModule,
    
    // Авторизация
    AuthModule,
    
    // Pregnancy модуль
    PregnancyModule,
    
    // Achievements модуль
    AchievementsModule,
    
    // Rate limiting с Redis storage для распределенного rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule, RedisModule],
      inject: [ConfigService, 'REDIS_CLIENT'],
      useFactory: (configService: ConfigService, redisClient: any) => {
        const storage = new RedisThrottlerStorage(redisClient);
        return {
          storage,
          throttlers: [
            {
              ttl: parseInt(
                configService.get<string>('RATE_LIMIT_TTL', '60'),
                10,
              ) * 1000, // в миллисекундах
              limit: parseInt(
                configService.get<string>('RATE_LIMIT_LIMIT', '100'),
                10,
              ),
              blockDuration: parseInt(
                configService.get<string>('RATE_LIMIT_BLOCK_DURATION', '300'),
                10,
              ) * 1000, // в миллисекундах
            },
          ],
        };
      },
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
