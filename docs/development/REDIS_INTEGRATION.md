# Redis интеграция

## Обзор

В шаблон добавлена полная интеграция с Redis для:
- **Распределенного rate limiting** через Throttler
- **Кэширования данных** через Cache Manager
- **Готовности к масштабированию** на несколько инстансов

## Установка

После клонирования репозитория выполните:

```bash
npm install
```

Это установит необходимые зависимости:
- `ioredis` - Redis клиент
- `@nestjs/cache-manager` - NestJS модуль для кэширования
- `cache-manager-redis-yet` - Redis store для cache-manager
- `@types/ioredis` - TypeScript типы

## Конфигурация

### Переменные окружения

Добавьте в `.env` файл:

```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Cache
CACHE_TTL=3600

# Rate Limiting (с Redis storage)
RATE_LIMIT_TTL=60
RATE_LIMIT_LIMIT=100
RATE_LIMIT_BLOCK_DURATION=300
```

### Docker Compose

Redis уже настроен в `docker-compose.yml`:

```yaml
redis:
  image: redis:7-alpine
  container_name: smart-budget-redis
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
```

Запустите Redis:

```bash
docker-compose up -d redis
```

## Использование

### Кэширование данных

Используйте `CacheService` для кэширования данных:

```typescript
import { Injectable } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class UsersService {
  constructor(private readonly cacheService: CacheService) {}

  async getUser(id: string) {
    // Получить или установить значение (cache-aside pattern)
    return this.cacheService.getOrSet(
      `user:${id}`,
      async () => {
        // Функция выполнится только если данных нет в кэше
        return this.userRepository.findOne({ where: { id } });
      },
      3600, // TTL в секундах (1 час)
    );
  }

  async updateUser(id: string, data: any) {
    // Обновляем данные
    await this.userRepository.update(id, data);
    
    // Инвалидируем кэш
    await this.cacheService.delete(`user:${id}`);
  }
}
```

### Rate Limiting

Rate limiting автоматически работает через `ThrottlerGuard` с Redis storage:

```typescript
import { Controller, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('api')
@UseGuards(ThrottlerGuard) // Применяется ко всем роутам
export class ApiController {
  // ...
}
```

При масштабировании на несколько инстансов rate limiting будет работать корректно, так как счетчики хранятся в Redis.

### Прямой доступ к Redis

Если нужен прямой доступ к Redis клиенту:

```typescript
import { Injectable, Inject } from '@nestjs/common';
import type Redis from 'ioredis';

@Injectable()
export class CustomService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async customOperation() {
    // Прямая работа с Redis
    await this.redis.set('key', 'value');
    const value = await this.redis.get('key');
  }
}
```

## Архитектура

### Модули

- **RedisModule** - глобальный модуль, предоставляет Redis клиент
- **CacheModule** - глобальный модуль, настраивает Cache Manager с Redis store
- **RedisThrottlerStorage** - кастомный storage для Throttler на базе Redis

### Преимущества

1. **Распределенный rate limiting** - работает корректно при горизонтальном масштабировании
2. **Кэширование** - снижает нагрузку на БД
3. **Готовность к production** - все настроено и готово к использованию
4. **Гибкость** - можно легко расширить функциональность

## Best Practices

### Кэширование

1. **Используйте осмысленные ключи**:
   ```typescript
   `user:${id}`
   `user:${id}:profile`
   `products:list:${page}:${limit}`
   ```

2. **Устанавливайте разумные TTL**:
   - Статические данные: 24 часа
   - Пользовательские данные: 30 минут - 1 час
   - Часто изменяемые данные: 5-15 минут

3. **Инвалидируйте кэш при обновлении**:
   ```typescript
   await this.cacheService.delete(`user:${id}`);
   ```

### Rate Limiting

1. **Настройте лимиты в зависимости от эндпоинта**:
   ```typescript
   @Throttle({ default: { limit: 10, ttl: 60000 } })
   @Post('login')
   async login() { }
   ```

2. **Используйте разные лимиты для разных операций**:
   - Авторизация: строгие лимиты (10 запросов/минуту)
   - Публичные API: более мягкие лимиты (100 запросов/минуту)

## Troubleshooting

### Redis не подключается

1. Проверьте, что Redis запущен:
   ```bash
   docker-compose ps
   ```

2. Проверьте переменные окружения:
   ```bash
   echo $REDIS_HOST
   echo $REDIS_PORT
   ```

3. Проверьте логи приложения при старте

### Rate limiting не работает

1. Убедитесь, что `RedisModule` импортирован до `ThrottlerModule` в `app.module.ts`
2. Проверьте, что Redis клиент успешно подключился
3. Проверьте логи Throttler

## Дальнейшее развитие

### Bull/BullMQ для очередей

Если понадобятся фоновые задачи, можно добавить:

```bash
npm install @nestjs/bull bull
```

И настроить очереди на базе Redis.

### Redis Cluster

Для production с высокой нагрузкой можно настроить Redis Cluster для репликации и отказоустойчивости.

